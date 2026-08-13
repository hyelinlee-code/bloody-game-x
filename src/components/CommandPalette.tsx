import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { lineageOf } from '../data/lineage';
import { tieCounts } from '../data/edges';
import type { Dataset, Person, SeasonNumber } from '../data/types';
import type { LayoutMode } from '../graph/types';
import type { AtlasState } from '../state/useAtlas';
import { monogram, monogramEn, sealedRun } from '../graph/build';
import { Portrait } from './Portrait';
import {
  CATEGORY_LABEL_I18N,
  LINEAGE_CHIP_I18N,
  personBio,
  personName,
  personNotableFor,
  personOccupation,
  /* `runText` is deliberately gone: it was imported for the season-record
     haystack in `scorePerson` tier 5, and the whole point of that tier's
     rewrite is that the palette no longer reads a run's placement in either
     language. Re-adding the import is the first symptom of the leak coming
     back. */
  runFacts,
  xBillingText,
  t,
  ui,
  type Lang,
  type UiKey,
} from '../data/i18n';
import { useLang } from '../state/useLang';
import { useWatched, type WatchedSet } from '../state/useWatched';
import './CommandPalette.css';
/* ALIASED, NOT TIDIED — the same rename `graph/build.ts` made, for the same
   collision. `watched(run)` from data/types answers "was this person present
   without competing"; `watched` everywhere below is the reader's set of works.
   Both are in scope in `plateOf`, and `runs.some(watched)` inside a function
   that also holds the reader's set reads as the wrong thing entirely. */
import { watched as watchedRun } from '../data/types';

export interface CommandPaletteProps {
  open: boolean;
  atlas: AtlasState;
  dataset: Dataset;
  onClose: () => void;
  onSelect: (id: string) => void;
  onModeChange: (m: LayoutMode) => void;
  onOpenAbout: () => void;
  /** Opens the cast wall — the same surface the `g` key opens. */
  onOpenGallery: () => void;
}

/* ────────────────────────────────────────────────────────────────────────────
   Matching. Cheap on purpose: this runs on every keystroke over the whole cast.
   Direct substring first (that is what people actually type), a subsequence
   pass last so "kjh" still finds Kim Ji-hun.
   ──────────────────────────────────────────────────────────────────────────── */

/** Indices of a literal substring hit, or null. */
function subIndices(hay: string, needle: string): number[] | null {
  if (!hay || !needle) return null;
  const at = hay.toLowerCase().indexOf(needle);
  if (at < 0) return null;
  const out: number[] = [];
  for (let k = 0; k < needle.length; k++) out.push(at + k);
  return out;
}

/** Indices of a scattered subsequence hit, or null. Needs 2+ characters. */
function seqIndices(hay: string, needle: string): number[] | null {
  const n = needle.replace(/\s+/g, '');
  if (!hay || n.length < 2) return null;
  const h = hay.toLowerCase();
  const out: number[] = [];
  let from = 0;
  for (const ch of n) {
    const at = h.indexOf(ch, from);
    if (at < 0) return null;
    out.push(at);
    from = at + 1;
  }
  return out;
}

function hasTerm(q: string, terms: string[]): boolean {
  if (!q) return true;
  return terms.some((term) => term && term.toLowerCase().includes(q));
}

/** Does any of these strings contain the query? */
function anyHit(q: string, values: (string | undefined)[]): boolean {
  return values.some((v) => Boolean(v) && v!.toLowerCase().includes(q));
}

/**
 * Both string tables, always.
 *
 * The index is deliberately independent of the interface language: someone
 * reading the English UI still types 포커 when that is what they remember, and
 * someone reading the Korean UI still types "poker". Every field that exists in
 * two languages is matched in both; only the *reason* shown back to them is
 * rendered in the language they are reading.
 */
const BOTH: Lang[] = ['ko', 'en'];

interface PersonHit {
  person: Person;
  score: number;
  /** Character indices to <mark> inside nameKo / nameEn. */
  ko: number[] | null;
  en: number[] | null;
  /** Why this person surfaced, when it was not their name. */
  reason: string;
}

function scorePerson(p: Person, q: string, lang: Lang, watched: WatchedSet): PersonHit | null {
  const nameKo = p.nameKo || '';
  const nameEn = p.nameEn || '';
  const lko = nameKo.toLowerCase();
  const len = nameEn.toLowerCase();

  // 1 — the name itself.
  let score = 0;
  if (lko === q || len === q) score = 1000;
  else if (lko.startsWith(q)) score = 940;
  else if (len.startsWith(q)) score = 900;
  else if (lko.includes(q)) score = 860;
  else if (len.includes(q)) score = 820;
  if (score > 0) {
    return { person: p, score, ko: subIndices(nameKo, q), en: subIndices(nameEn, q), reason: '' };
  }

  const plain = (s: number, reason: string): PersonHit => ({ person: p, score: s, ko: null, en: null, reason });
  /* The reason is prose the reader has to read, so it is always rendered in
     the language they are in — even when the hit came from the other table. */
  const say = (k: UiKey, value: string): string => `${t(lang, k)} ${value}`.trim();

  // 2 — what they are also called.
  if (p.realNameKo && p.realNameKo.toLowerCase().includes(q)) {
    return plain(760, say('palette.reasonRealName', p.realNameKo));
  }
  for (const a of p.aka ?? []) {
    if (a && a.toLowerCase().includes(q)) return plain(740, say('palette.reasonAka', a));
  }

  /* 3 — what they do, in either language. No reason line: the occupation is
     already the first thing the row prints, and repeating it back reads as a
     rendering bug rather than as an explanation. */
  if (anyHit(q, [personOccupation(p, 'ko'), personOccupation(p, 'en'), p.occupation])) {
    return plain(620, '');
  }
  const catHay = BOTH.map((l) => CATEGORY_LABEL_I18N[l][p.category] ?? '');
  if (anyHit(q, [...catHay, p.category])) return plain(560, CATEGORY_LABEL_I18N[lang][p.category] ?? '');

  /* 4 — what they are known for. The two lists are authored in step, so a hit
   *     on the English line can be reported with the Korean one and vice versa.
   *
   * SCOPED PER BULLET, and the reader's set is passed explicitly rather than
   * left to the accessor's `currentWatched()` default — that default is a
   * module global with no subscription, and a component that reads it renders
   * the right answer once and then never again. 이상민's four bullets are a
   * Genius title, a count of Genius seasons, a season 1 panel seat and being
   * the leader of Roo'Ra: at a narrow set he keeps the band and loses the
   * championship, and the tier keeps working on what is left. */
  const notableKo = personNotableFor(p, 'ko', watched);
  const notableEn = personNotableFor(p, 'en', watched);
  const notableUi = lang === 'en' ? notableEn : notableKo;
  for (let i = 0; i < Math.max(notableKo.length, notableEn.length); i++) {
    if (anyHit(q, [notableKo[i], notableEn[i]])) {
      return plain(520, notableUi[i] ?? notableKo[i] ?? notableEn[i] ?? '');
    }
  }
  for (const s of p.otherShows ?? []) {
    if (anyHit(q, [s.showKo, s.show])) {
      const title = (lang === 'en' ? s.show : s.showKo || s.show) || '';
      return plain(500, say('palette.reasonAppeared', title));
    }
  }

  /* The line under the bloc, THROUGH THE ACCESSOR. This tier both matched and
   * printed `p.x.billing` straight off the record, and that record is where the
   * casting announcement keeps its results: '첫 번째 우승자. 이제 모두가 그의
   * 플레이를 봤다.' on 이태균, '「더 지니어스」 마지막 시즌의 준우승자.' on
   * 김경훈, '앞의 한 명은 우승했다.' on 신승용 — which is a result about
   * SOMEBODY ELSE, and is exactly why the scope sits on the line rather than on
   * whose card it appears under. Measured at `bgx.watched='[]'`: all three
   * printed in full, in `.cp__sub`, to a reader who had watched nothing.
   *
   * KOREAN ON BOTH SIDES OF THE TEST, on purpose and not by oversight. This
   * tier has only ever indexed and printed `billing`, never `billingEn` — even
   * in the English UI, where it prints the Korean line today. Passing `lang`
   * would make `xBillingText` return the English half whenever one exists,
   * which changes both what the drawer matches and what it prints AT THE
   * DEFAULT watched-set. Rule 0 outranks the tidier reading; widening this tier
   * to both tables is a change on its own merits and not one to smuggle in
   * under a redaction fix. */
  const billing = p.x ? xBillingText(p.x, 'ko', watched).billing : '';
  if (billing && billing.toLowerCase().includes(q)) return plain(480, billing);

  /* 5 — WHICH seasons they played. Never how they did in them.
   *
   * This tier used to index the run itself — `r.placement`, the English
   * `runText(…).placement`, and `r.team` — which made the drawer an oracle no
   * sealed panel can close. Measured over the real corpus before this change:
   * 탈락 / eliminated returned exactly the three season-2 eliminations, 히든
   * 플레이어 returned exactly the two people that twist was about, 1위 returned
   * the two franchise winners, and 13위 returned the one person who came last.
   * The reason line then printed the finish back in full — "시즌 2 · 우승 ·
   * 13명 중 1위" / "Season 2 · Winner — 1st of 13" — so the drawer did not
   * merely admit the answer existed, it read it out. 146 of the 184 outcome
   * queries measured moved when this loop stopped carrying the record.
   *
   * `team` goes with placement even though it looks structural, because
   * works.ts's OUTCOME_FIELDS lists `team` / `teamEn` for exactly this reason
   * and the data agrees: all 14 team strings in the corpus carry their
   * season's scope and not one has a `[]` override. '저택팀 → 야생팀' is a
   * defection written as an arrow; '히든 플레이어 (저택 잠입)' is the season 2
   * twist stated on one of the people it was a twist about.
   *
   * What is left is participation — which seasons a person was in — and that
   * is already public on every other surface: the portrait plate two columns
   * left draws one arc per season. So 시즌2 / season2 / s2 still find the
   * seven people who played it, which is the query this tier exists to serve.
   *
   * The reason line falls back to the key written for a run with no placement
   * text. That branch was unreachable until now (all 16 runs carry a
   * placement) and is the only branch from here on.
   *
   * WHAT USED TO BE LEFT OPEN HERE IS NOW CLOSED ELSEWHERE IN THIS FILE, and
   * the note is kept rather than deleted because it names where to look. Tier 4
   * (`notableFor`), tier 7 (`bio`) and the billing tier above are read through
   * `data/i18n` and are handed the reader's set explicitly, so 우승 no longer
   * answers with a franchise winner whose panels are sealed — the gate does the
   * stripping, which is why they were never stripped here. The winner pip and
   * the plate's rank arcs both come off `runFacts` now; see `isWinner` and
   * `plateOf`. What a sealed plate LOOKS like has since landed — the third arc
   * state in `plateGeometry.ts` — and this file needed nothing for it: search
   * has no plate. */
  for (const r of p.priorSeasons ?? []) {
    const hay = `시즌${r.season} 시즌 ${r.season} season${r.season} s${r.season}`;
    if (hay.toLowerCase().includes(q)) {
      const how = t(lang, 'palette.reasonAppearedFallback');
      return plain(460, `${t(lang, 'dossier.seasonPrefix')} ${r.season} · ${how}`);
    }
  }

  // 6 — the bloc of the X lineup they were announced under.
  const lin = lineageOf(p);
  const bloc = `${lin.ko} ${lin.en} ${lin.teamKo} ${lin.teamEn} ${p.x?.teamLabelKo ?? ''} ${p.x?.teamLabelEn ?? ''}`;
  if (bloc.toLowerCase().includes(q)) return plain(440, LINEAGE_CHIP_I18N[lang][lin.team]);

  // 7 — the profile itself. Last real tier: a bio hit is weak evidence, but a
  //     reader searching "StarCraft" would rather see the four people it is
  //     written about than nothing at all.
  if (anyHit(q, [personBio(p, 'ko', watched), personBio(p, 'en', watched)])) {
    return plain(360, t(lang, 'palette.reasonProfile'));
  }

  // 8 — fuzzy on the name, last resort.
  const fko = seqIndices(nameKo, q);
  const fen = seqIndices(nameEn, q);
  if (fko || fen) return { person: p, score: 300, ko: fko, en: fen, reason: '' };

  return null;
}

/** Renders text with the matched runs wrapped in <mark>. */
function Marked({ text, hits }: { text: string; hits: number[] | null }): JSX.Element {
  if (!text) return <></>;
  if (!hits || hits.length === 0) return <>{text}</>;
  const on = new Set(hits);
  const parts: JSX.Element[] = [];
  let i = 0;
  while (i < text.length) {
    const lit = on.has(i);
    let j = i + 1;
    while (j < text.length && on.has(j) === lit) j++;
    const chunk = text.slice(i, j);
    parts.push(
      lit ? (
        <mark key={i}>{chunk}</mark>
      ) : (
        <span key={i}>{chunk}</span>
      ),
    );
    i = j;
  }
  return <>{parts}</>;
}

/* ── rows ─────────────────────────────────────────────────────────────────── */

interface PersonRow {
  kind: 'person';
  key: string;
  person: Person;
  hit: PersonHit;
  /** Verified connections — meetings. See `deg` below for what is left out. */
  degree: number;
  /** The non-meetings, counted separately and named separately on the row. */
  parallel: number;
  run: () => void;
}

interface ActionRow {
  kind: 'view' | 'command';
  key: string;
  /** The label in the reader's language. */
  label: string;
  /** The Latin gloss beside it — null in the English UI, where it would be the
      same word twice. */
  gloss: string | null;
  hint: string;
  glyph: string;
  current: boolean;
  run: () => void;
}

type Row = PersonRow | ActionRow;

interface Group {
  id: string;
  label: string;
  gloss: string | null;
  note: string;
  rows: Row[];
}

const MAX_PEOPLE = 30;
const QUICK_START = 5;

/* Entrance is 180ms; the exit runs at roughly two-thirds of it so dismissal
   reads as the drawer closing rather than as a dropped frame. */
const EXIT_MS = 120;

/**
 * Did they win one — AS FAR AS THIS READER HAS BEEN TOLD.
 *
 * `rank` comes off `runFacts`, which gates it against the run's own scope, so
 * this is one question with one answer for the whole row: the '우승' pip beside
 * the name and the laurel on the chip plate are the same claim drawn twice, and
 * gating one while leaving the other raw is how the palette ends up
 * contradicting itself on a single line. Measured at `bgx.watched='[]'`, 이진형
 * carried the pip and the laurel with every panel about him sealed.
 *
 * `role` STAYS RAW and that is deliberate — it is the one outcome-shaped field
 * `OUTCOME_FIELDS.SeasonRun` leaves off the manifest, because a painter that
 * cannot tell a contestant from a panellist draws a redacted competitor with
 * the mark that means "present, not competing" (PLAN-spoilers.md §3).
 *
 * Fails closed with everything else: a run whose `rank` is withheld returns
 * `undefined`, `undefined === 1` is false, and no mark is drawn.
 */
function isWinner(p: Person, lang: Lang, watched: WatchedSet): boolean {
  return (p.priorSeasons ?? []).some(
    (s) => s.role === 'contestant' && runFacts(s, lang, watched).rank === 1,
  );
}

/* ── the plate, not a fourth drawing of a person ──────────────────────────
   The row's leading mark used to be a flat tinted disc carrying the monogram:
   no season arcs, no rim ticks, no laurel. plateGeometry.ts's docblock is
   explicit that the canvas node, the gallery card and the dossier crest are
   one object, and this was the one surface where that broke — a reader who had
   learned to read 진형's laurel on the canvas found it gone in search.

   So the palette draws the same Portrait, in its `chip` tier, which is the
   size-aware cut already used by the edge card at 24px. Everything it needs is
   on the Person: the graph's own build derives seasons, winner and host from
   `priorSeasons` the same way, and `degree` comes from the row.

   `connections` is deliberately NOT passed. The chip tier still paints a rim
   tick per tie, and at 30px eleven of them are a texture rather than a count —
   the same confetti failure filed against the canvas plate at zoom. The
   palette's job is recognition, so the row keeps the marks that identify a
   person (ring hue, season arcs, laurel, the newcomer's dashed ring) and drops
   the one that is a quantity; the count is already printed in words two
   columns right, as "11 ties".

   ── AND THE ARCS ARE A RANK, so they are read through `runFacts` ───────────
   `ranks` and `fieldSizes` feed arc length as `rank / fieldSize`, which is
   exactly invertible: an arc is the finish, drawn. Reading them off the record
   here would have left the palette printing in pixels precisely what the tier-5
   rewrite stopped it from printing in words. `runFacts` gates the pair
   together — `rankPair` runs `fieldSize` through its own gate and then through
   `rank`'s, so a denominator can never outlive its numerator — and `bestOf`
   then does the same min-per-season it always did over whatever survives.

   AND IT RETURNS THE THIRD STATE, which for two rounds it did not. A withheld
   rank is `undefined`, which is also the value a panel seat carries, so these
   chips drew a sealed champion with the beaded ring that means "present, not
   competing" — the same false statement the canvas and the wall were making,
   in the drawer a reader opens by typing a name. `sealedRun` is build.ts's own
   predicate; do not re-derive it here. */
function plateOf(
  p: Person,
  lang: Lang,
  watched: WatchedSet,
): {
  seasons: SeasonNumber[];
  ranks: (number | undefined)[];
  fieldSizes: (number | undefined)[];
  sealed: boolean[];
  isWinner: boolean;
  isHost: boolean;
} {
  const runs = p.priorSeasons ?? [];
  const seasons = [...new Set(runs.map((r) => r.season))].sort() as SeasonNumber[];
  /* One gated read per run, indexed alongside `runs`, so `bestOf` keeps
     comparing seasons off the raw record and numbers off the accessor. */
  const facts = runs.map((r) => runFacts(r, lang, watched));
  const bestOf = <K extends 'rank' | 'fieldSize'>(s: SeasonNumber, k: K): number | undefined => {
    let best: number | undefined;
    for (let i = 0; i < runs.length; i++) {
      const v = facts[i][k];
      if (runs[i].season !== s || v === undefined) continue;
      best = best === undefined ? v : Math.min(best, v);
    }
    return best;
  };
  return {
    seasons,
    ranks: seasons.map((s) => bestOf(s, 'rank')),
    fieldSizes: seasons.map((s) => bestOf(s, 'fieldSize')),
    sealed: seasons.map((s) => sealedRun(p, s, watched)),
    isWinner: isWinner(p, lang, watched),
    /* WHICH seasons, and whether they were competing in them, are
       participation and stay raw — see `isWinner`. */
    isHost: runs.some(watchedRun),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */

export function CommandPalette({
  open,
  atlas,
  dataset,
  onClose,
  onSelect,
  onModeChange,
  onOpenAbout,
  onOpenGallery,
}: CommandPaletteProps): JSX.Element | null {
  const { query, setQuery, resetFilters, graph, selectedId, mode, visible } = atlas;
  const { lang } = useLang();
  /* WHAT THIS READER HAS SEEN, THROUGH THE HOOK — never `currentWatched()`.
   *
   * Every accessor below takes a `watched` parameter defaulting to that module
   * global, and letting the default apply inside a component is the silent
   * failure mode `state/useWatched.ts` devotes a docblock to: the global has no
   * subscription, so the drawer would render one correct redaction at mount and
   * then hold it while the rest of the tree moved on. The direction that hurts
   * is a reader NARROWING their set — the correction somebody makes the instant
   * they realise they are about to be spoiled — and a stale drawer answers that
   * with the finishes still in it. `useWatched()` is `useContext`, so
   * `setWatched` re-renders this component; the provider is mounted in App.tsx.
   *
   * It is then passed EXPLICITLY into `scorePerson`, `plateOf` and `isWinner`,
   * and listed in the `groups` dependency array below. An omitted dep there
   * neither warns nor throws — it just keeps the previous reader's rows. */
  const { watched } = useWatched();
  const reduced = Boolean(useReducedMotion());

  const uid = useId();
  const listId = `${uid}-list`;
  const helpId = `${uid}-help`;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const [active, setActive] = useState(0);
  const [cascade, setCascade] = useState(true);

  /* Props are re-created by the host on every render; hold them in a ref so the
     result list can be memoised against the data alone. */
  const handlers = useRef({ onSelect, onModeChange, onOpenAbout, onOpenGallery });
  useLayoutEffect(() => {
    handlers.current = { onSelect, onModeChange, onOpenAbout, onOpenGallery };
  });

  const q = query.trim().toLowerCase();
  const people = dataset.people ?? [];
  const subLang: Lang = lang === 'en' ? 'ko' : 'en';

  /* Korean binds its counter straight onto the numeral (12건) while English
     needs the space. Both read a singular/plural key pair: the Korean counter
     does not inflect, so both halves hold the same word there, and English is
     the whole reason the pair exists — reading the plural half unconditionally
     is what printed "1 results" and "1 ties". */
  const qty = (n: number, one: UiKey, many: UiKey): string => {
    const counter = t(lang, n === 1 ? one : many);
    return lang === 'ko' ? `${n}${counter}` : `${n} ${counter}`;
  };
  /* And Korean names the thing before counting it (연결 12건) where English
     counts before naming it (12 ties). In English the counter already is the
     noun, so the Korean-only head noun is dropped rather than said twice. */
  const tally = (noun: string, n: number, one: UiKey, many: UiKey): string =>
    lang === 'ko' ? `${noun} ${qty(n, one, many)}` : qty(n, one, many);

  const groups = useMemo<Group[]>(() => {
    const list = dataset.people ?? [];
    /* The reason line under a name said '연결 1건' / '1 tie' for 강지후,
       신승용 and 최연청 — three people the dataset says have met nobody in this
       lineup. `tieCounts` is the rule, read from data/edges.ts: the count is
       meetings, and the parallel record is carried beside it rather than folded
       into it. Straight off `edgesOf.length` is how the palette disagreed with
       the dossier about the same person.

       AND IT TAKES THE READER'S SET. Without one this line printed 홍진호 ·
       연결 13건 at every watched-set, including a reader who had watched
       nothing — the cold-start list, before a key is typed, is the first thing
       the palette shows anybody. It is also the ORDERING key three lines down,
       so an ungated count ranked the cold start by history the reader cannot
       see. Passed explicitly, never left to `tieCounts`'s module-mirror
       default: `groups` is a `useMemo` and `watched` is in its dependency list,
       which is what makes the drawer re-rank when the set changes. */
    const tiesOf = (id: string) => tieCounts(graph.edgesOf.get(id) ?? [], watched);
    /* The ordering key — the cold-start list and the search tiebreak — is the
       verified count too, so "the people with the most history to pull on" is
       ranked by history someone can actually pull on. */
    const deg = (id: string): number => tiesOf(id).met;
    const focusInput = (): void => inputRef.current?.focus();

    const toPersonRow = (hit: PersonHit): PersonRow => {
      const ties = tiesOf(hit.person.id);
      return {
        kind: 'person',
        key: `p:${hit.person.id}`,
        person: hit.person,
        hit,
        degree: ties.met,
        parallel: ties.parallel,
        /* ── committing a person releases the search text ────────────────
           `query` is not the palette's own state: it is `atlas.query`, which
           is also the graph filter (useAtlas.ts, `visible`) and the TopBar's
           match count, and it is deep-linked as `?q=`. The drawer says so —
           '뒤편 그래프도 함께 필터링 중 · 닫아도 유지됩니다' / 'Filtering the
           graph behind this too … and it stays filtered after you close' —
           and that promise is about DISMISSING the drawer, which still keeps
           the filter. It was being kept on commit too, and there it is not a
           promise, it is a trap: typing a name and pressing Enter framed the
           person on an atlas filtered to that one name, so the reader landed
           on a single node with none of its ties drawn. Reproduced at 20/20
           people and 52 ties before Enter, 1/20 and 0 after.

           Choosing a destination is the moment the search text has done its
           job, so it is dropped here rather than on close. Only the person
           rows do it: a view or a command leaves a typed filter standing,
           because there the reader's text and their action are about
           different things and the filter is still coherent. `reset` already
           clears the query through `resetFilters`.

           This is the palette's half. The structural half is not in this
           file — see the handoff note: one piece of state is serving both a
           transient search box and a durable filter. */
        run: () => {
          setQuery('');
          handlers.current.onSelect(hit.person.id);
        },
      };
    };

    const centre = selectedId ? graph.byId.get(selectedId) : undefined;
    const centreName = centre ? personName(centre.person, lang).primary : '';

    /* A label in the reader's language plus the Latin gloss beside it, which is
       dropped in the English UI where the two would be the same word twice. */
    const glossOf = (k: UiKey): string | null => (lang === 'ko' ? ui.en[k] : null);
    /* Both tables feed the matcher, so a query finds a view by its name in
       either language whichever language the chrome is in. */
    const bothOf = (k: UiKey): string[] => [ui.ko[k], ui.en[k]];

    /* These four names are the ones the top bar uses. The palette used to call
       the same views 연결망 / 분야별 / 궤도, so a user who learned a mode from
       the nav could not find it here by name. The old vocabulary survives as
       search terms so nobody's muscle memory breaks. */
    const viewDefs: { m: LayoutMode; key: UiKey; hint: string; glyph: string; terms: string[] }[] = [
      {
        m: 'web',
        key: 'mode.web',
        hint: t(lang, 'mode.webHint'),
        glyph: '1',
        terms: [...bothOf('mode.webHint'), '관계망', '연결망', '관계', '웹', 'web', 'network', '기본'],
      },
      {
        m: 'seasons',
        key: 'mode.seasons',
        hint: t(lang, 'mode.seasonsHint'),
        glyph: '2',
        terms: [...bothOf('mode.seasonsHint'), '시즌별', '시즌', '출신', 'seasons', 'season'],
      },
      {
        m: 'archetype',
        key: 'mode.archetype',
        hint: t(lang, 'mode.archetypeHint'),
        glyph: '3',
        terms: [
          ...bothOf('mode.archetypeHint'),
          /* The retired vocabulary stays searchable. 'archetype' was the
             label for four rounds and '아키타입' was the About sheet's
             word for it; somebody who learned either should still find the
             view by typing it. Adding, never replacing. */
          '직업별',
          '직업군',
          '직업군별',
          '분야별',
          '분야',
          '직업',
          '유형',
          '아키타입',
          '배경',
          'archetype',
          'background',
          'category',
        ],
      },
      {
        m: 'orbit',
        key: 'mode.orbit',
        hint: centreName ? `${centreName} ${t(lang, 'mode.orbitHintNamed')}` : t(lang, 'mode.orbitHint'),
        glyph: '4',
        terms: [
          ...bothOf('mode.orbitHint'),
          '인물 중심',
          '궤도',
          '중심',
          'orbit',
          'focus',
          centre?.person.nameKo ?? '',
          centre?.person.nameEn ?? '',
        ],
      },
    ];

    const views: Row[] = viewDefs
      .filter((v) => v.m !== 'orbit' || Boolean(selectedId))
      .filter((v) => hasTerm(q, [...bothOf(v.key), v.hint, ...v.terms]))
      .map((v): ActionRow => ({
        kind: 'view',
        key: `v:${v.m}`,
        label: t(lang, v.key),
        gloss: glossOf(v.key),
        hint: v.hint,
        glyph: v.glyph,
        current: v.m === mode,
        run: () => handlers.current.onModeChange(v.m),
      }));

    /* The cast wall is a view of the same twenty people, so it belongs beside
       the four layouts rather than down in COMMANDS. */
    const galleryTerms = ['갤러리', '출연진', '인물 판', '초상', '전체 보기', 'gallery', 'cast', 'wall', 'portraits'];
    if (
      hasTerm(q, [
        ...bothOf('gallery.dialogLabel'),
        ...bothOf('palette.cmdGalleryHint'),
        ...galleryTerms,
      ])
    ) {
      views.push({
        kind: 'view',
        key: 'v:gallery',
        label: t(lang, 'gallery.dialogLabel'),
        gloss: glossOf('gallery.dialogLabel'),
        hint: t(lang, 'palette.cmdGalleryHint'),
        glyph: 'G',
        current: false,
        run: () => handlers.current.onOpenGallery(),
      });
    }

    const cmdDefs: { id: string; key: UiKey; hintKey: UiKey; glyph: string; terms: string[]; run: () => void }[] = [
      {
        id: 'reset',
        key: 'palette.cmdReset',
        hintKey: 'palette.cmdResetHint',
        glyph: '↺',
        terms: ['초기화', '리셋', '필터', 'reset', 'clear', 'filter'],
        run: () => {
          resetFilters();
          setActive(0);
          focusInput();
        },
      },
      {
        id: 'about',
        key: 'palette.cmdAbout',
        hintKey: 'palette.cmdAboutHint',
        glyph: '?',
        terms: ['도움말', '안내', '범례', '정보', 'about', 'help', 'legend', 'guide'],
        run: () => handlers.current.onOpenAbout(),
      },
    ];

    const commands: Row[] = cmdDefs
      .filter((c) => hasTerm(q, [...bothOf(c.key), ...bothOf(c.hintKey), ...c.terms]))
      .map((c): ActionRow => ({
        kind: 'command',
        key: `c:${c.id}`,
        label: t(lang, c.key),
        gloss: glossOf(c.key),
        hint: t(lang, c.hintKey),
        glyph: c.glyph,
        current: false,
        run: c.run,
      }));

    const out: Group[] = [];

    if (!q) {
      // Curated cold start: the people with the most history to pull on.
      const quick = list
        .map((p) => ({ p, n: deg(p.id) }))
        .sort((a, b) => b.n - a.n || a.p.nameKo.localeCompare(b.p.nameKo, 'ko'))
        .slice(0, QUICK_START)
        .map(({ p }) => toPersonRow({ person: p, score: 0, ko: null, en: null, reason: '' }));
      if (quick.length > 0) {
        out.push({
          id: 'quick',
          label: t(lang, 'palette.groupQuick'),
          gloss: glossOf('palette.groupQuick'),
          note: t(lang, 'palette.groupQuickNote'),
          rows: quick,
        });
      }
    } else {
      const hits: PersonHit[] = [];
      for (const p of list) {
        const hit = scorePerson(p, q, lang, watched);
        if (hit) hits.push(hit);
      }
      hits.sort(
        (a, b) =>
          b.score - a.score ||
          deg(b.person.id) - deg(a.person.id) ||
          a.person.nameKo.localeCompare(b.person.nameKo, 'ko'),
      );
      const shown = hits.slice(0, MAX_PEOPLE);
      if (shown.length > 0) {
        out.push({
          id: 'people',
          label: t(lang, 'palette.groupPeople'),
          gloss: glossOf('palette.groupPeople'),
          note:
            hits.length > shown.length
              ? `${t(lang, 'palette.topOfPrefix')} ${shown.length} ${t(lang, 'common.of')} ${hits.length}`
              : '',
          rows: shown.map(toPersonRow),
        });
      }
    }

    if (views.length > 0) {
      out.push({
        id: 'views',
        label: t(lang, 'palette.groupViews'),
        gloss: glossOf('palette.groupViews'),
        note: '',
        rows: views,
      });
    }
    if (commands.length > 0) {
      out.push({
        id: 'cmds',
        label: t(lang, 'palette.groupCommands'),
        gloss: glossOf('palette.groupCommands'),
        note: '',
        rows: commands,
      });
    }
    return out;
    /* `setQuery` joins the list for `toPersonRow`'s commit. It is a `useState`
       setter held across renders by useAtlas, so it is stable and the memo
       still only recomputes on the things that change the rows.

       `watched` IS ONE OF THEM. `scorePerson` reads four gated fields through
       it — the notableFor bullets, the billing line, the bio, and the rank
       behind the pip — so a set that changes without this dep changes what the
       rows are ALLOWED to say while the memo hands back the rows they used to
       say it with. The set's identity is preserved by `setWatched` precisely so
       this comparison is a pointer test and not a rebuild per render. */
  }, [q, lang, watched, dataset.people, graph, selectedId, mode, resetFilters, setQuery]);

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const indexOf = useMemo(() => new Map(flat.map((r, i) => [r.key, i])), [flat]);

  const activeIdx = flat.length === 0 ? -1 : Math.min(active, flat.length - 1);
  const activeRow = activeIdx >= 0 ? flat[activeIdx] : undefined;
  const optionId = (i: number): string => `${uid}-opt-${i}`;

  /* Keyboard selection restarts at the top whenever the query changes. */
  useEffect(() => {
    setActive(0);
  }, [q]);

  /* ── the net under the focus fix ──────────────────────────────────────────
     The dialog's own onKeyDown only ever sees keys while focus is inside the
     dialog, so a focus miss did not merely make search quiet — it made the
     arrows and Enter dead too, and sent the characters to the window handler.
     Focus is fixed at the root above; this listener guarantees the failure mode
     cannot come back. It runs in the capture phase, ignores anything already
     inside the dialog (React's handler owns those), and pulls focus back to the
     input as it handles the key. */
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const activeRowRef = useRef(activeRow);
  activeRowRef.current = activeRow;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!open) return;
    const onDocKey = (e: KeyboardEvent): void => {
      const target = e.target;
      if (target instanceof Node && dialogRef.current?.contains(target)) return;
      const n = flatRef.current.length;
      const step = (delta: number): void => {
        if (n === 0) return;
        setActive((prev) => (Math.min(prev, n - 1) + delta + n) % n);
      };
      const claim = (): void => {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
      };
      switch (e.key) {
        case 'Escape':
          claim();
          closeRef.current();
          return;
        case 'ArrowDown':
          claim();
          step(1);
          return;
        case 'ArrowUp':
          claim();
          step(-1);
          return;
        case 'Home':
          claim();
          setActive(0);
          return;
        case 'End':
          claim();
          setActive(Math.max(0, n - 1));
          return;
        case 'Enter':
          claim();
          activeRowRef.current?.run();
          return;
        case 'Backspace':
          claim();
          setQuery(queryRef.current.slice(0, -1));
          return;
        default:
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            claim();
            setQuery(queryRef.current + e.key);
          }
          return;
      }
    };
    document.addEventListener('keydown', onDocKey, true);
    return () => document.removeEventListener('keydown', onDocKey, true);
  }, [open, setQuery]);

  /* Focus in on open, focus back out on close.
   *
   * Why this was dead: `alive` was seeded from `open` and only lifted by its own
   * effect, so the commit in which `open` flipped to true still rendered `null`
   * (see the `!alive` bail below). `inputRef.current` was therefore null when
   * this effect ran, the focus() call hit nothing, and the effect never re-ran
   * because `open` had not changed again. The dialog mounted one commit later
   * with focus still on BODY — which is why every keystroke fell through to the
   * window-level shortcut handler. The real fix is the render gate: the dialog
   * now mounts in the same commit that opens it, so the ref is populated by the
   * time effects run and a plain focus() lands. No timers, no retry loops. */
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActive(0);
    setCascade(true);
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
    const t = window.setTimeout(() => setCascade(false), 620);
    return () => {
      window.clearTimeout(t);
      const back = restoreRef.current;
      restoreRef.current = null;
      if (back && document.contains(back)) back.focus();
    };
  }, [open]);

  const exitMs = reduced ? 0 : EXIT_MS;
  const [alive, setAlive] = useState(open);
  useEffect(() => {
    if (open) {
      setAlive(true);
      return;
    }
    if (exitMs <= 0) {
      setAlive(false);
      return;
    }
    const t = window.setTimeout(() => setAlive(false), exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);

  /* ── the warm pass ─────────────────────────────────────────────────────────
   *
   * Measured on the production build: Ctrl+K → `.cp__dialog` exists took 159ms
   * on the FIRST open of a session and 21ms on the third. Same component, same
   * data, same commit — a 138ms difference that is paid exactly once, by the
   * reader, on the one interaction this app is built around.
   *
   * Everything else filed against this drawer is downstream of that number. A
   * 138ms task on the main thread is the reason the two entrance animations do
   * not get a startTime for 50ms (want ≤34, i.e. two frames), the reason the
   * 90ms fade was sampled at 2 distinct opacities out of a possible 4, and the
   * reason the 180ms lift rendered 5 transforms out of ~10. There is nothing
   * wrong with the CSS — CommandPalette.css already dropped both
   * backdrop-filters for exactly this class of fault, and that measurement
   * stands. What is left is that the browser cannot run an animation smoothly
   * across a frame it is spending on layout.
   *
   * So the first open is made into a repeat open. HoverCard solves the same
   * problem the same way and its comment records the two traps, both of which
   * apply here verbatim:
   *
   *   A SHELL WARMS NOTHING. Round 4 warmed the hover card with four strings
   *   and moved its first hover from 589ms to the low 300s — still 1.3–2.2×
   *   steady state, because the payload it had to build was a PLATE. This
   *   drawer's payload is five of them (QUICK_START), each an SVG with a clip
   *   path, a radial seat, a saturate filter and a decoded photograph, plus
   *   Pretendard and Inter at the row's own sizes. The warm pass therefore
   *   renders the real cold-start tree — the same `groups` the reader gets —
   *   rather than a placeholder.
   *
   *   TWO rAFs, NOT ONE. The first fires BEFORE the paint the mount scheduled,
   *   so releasing there warms nothing at all.
   *
   * Scheduled on idle with a deadline rather than on the mount commit, because
   * startup is this app's worst-measured moment and a curtain-up that already
   * drops frames must not also raster five plates. The deadline sits after
   * HoverCard's 1200ms so the two passes queue instead of contending — they
   * warm overlapping machinery (Portrait, plateGeometry, the same two faces)
   * and running them in one idle slice is one long task instead of two short
   * ones. Nothing races either: the cold open runs for seconds past both.
   *
   * If the reader beats it to Ctrl+K they simply pay what they pay today. This
   * makes the common case right; it cannot make any case worse.
   */
  const [warming, setWarming] = useState(false);
  const warmedRef = useRef(false);

  useEffect(() => {
    if (warmedRef.current || open) return;
    let idle = 0;
    let t = 0;
    const go = (): void => {
      window.clearTimeout(t);
      if (warmedRef.current) return;
      warmedRef.current = true;
      setWarming(true);
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) idle = ric(go, { timeout: 2400 });
    else t = window.setTimeout(go, 1800);
    return () => {
      const cancel = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (idle && cancel) cancel(idle);
      window.clearTimeout(t);
    };
  }, [open]);

  /* Two frames of the real drawer, then gone. `warming` is dropped from state
     rather than merely hidden, so nothing of this pass is left in the DOM for a
     probe — or a screen reader — to find. See `palette.noDialogBeforeOpen` in
     tools/assert-visual.mjs, which is the assertion that this stayed true. */
  useEffect(() => {
    if (!warming) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setWarming(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [warming]);

  /* Keep the highlighted row in view without hijacking the scroll position. */
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx, flat.length]);

  /* A list that does not overflow has no bottom edge to fade. Seed the flag
     from the measured geometry so a short result set is never masked. */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.dataset.end = el.scrollTop + el.clientHeight >= el.scrollHeight - 4 ? 'true' : 'false';
  }, [open, flat.length, q]);

  /* Held on screen for the length of the exit. Everything with a behavioural
     consequence — focus capture, focus restore, the row cascade — stays keyed
     on `open`, so only the pixels linger.

     `open` is checked as well as `alive`: `alive` trails `open` by one commit on
     the way in, and a modal that renders one commit after it opens has no
     element for the focus effect to focus. `alive` is only ever the *exit*
     latch. */
  if (!open && !alive && !warming) return null;
  /* Rendering only to compile the painter — not open, and not on the way out
     either. Kept distinct from `leaving` because the exit class runs the exit
     ANIMATION, and a warm pass that plays a dismissal is warming the wrong
     keyframes. */
  const isWarm = !open && !alive;
  const leaving = !open && !isWarm;

  const move = (delta: number): void => {
    if (flat.length === 0) return;
    setActive((prev) => {
      const from = Math.min(prev, flat.length - 1);
      return (from + delta + flat.length) % flat.length;
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        return;
      case 'Home':
        e.preventDefault();
        setActive(0);
        return;
      case 'End':
        e.preventDefault();
        setActive(Math.max(0, flat.length - 1));
        return;
      case 'Enter':
        e.preventDefault();
        activeRow?.run();
        return;
      case 'Tab': {
        const root = dialogRef.current;
        if (!root) return;
        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>('input, button, [href], select, textarea, [tabindex]'),
        ).filter(
          (el) =>
            !el.hasAttribute('disabled') &&
            el.getAttribute('tabindex') !== '-1' &&
            el.getClientRects().length > 0,
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      default:
        return;
    }
  };

  const hoverTo = (i: number): void => {
    if (i !== activeIdx) setActive(i);
  };

  const renderRow = (row: Row): JSX.Element => {
    const i = indexOf.get(row.key) ?? 0;
    const isActive = i === activeIdx;
    const common = {
      id: optionId(i),
      role: 'option' as const,
      'aria-selected': isActive,
      tabIndex: -1,
      'data-active': isActive,
      type: 'button' as const,
      onMouseMove: () => hoverTo(i),
      // Keep focus in the input so aria-activedescendant stays authoritative.
      onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
      onClick: row.run,
      style: { '--i': Math.min(i, 9) } as CSSProperties,
      className: `cp__row cp__row--${row.kind}${cascade ? ' cp__row--in' : ''}`,
    };

    if (row.kind === 'person') {
      const p = row.person;
      const lin = lineageOf(p);
      const won = isWinner(p, lang, watched);
      const occupation = personOccupation(p, lang) || CATEGORY_LABEL_I18N[lang][p.category] || '';
      const name = personName(p, lang);
      /* Two clauses where there used to be one number. A person with no
         verified connection and one parallel record used to read '연결 1건';
         they now read '평행 이력 1' — the thing that is actually true of them —
         and a person who has both gets both, in that order, because the
         verified count is the headline and the parallel record is the footnote.
         The parallel half takes a bare numeral rather than the 건 / 'ties'
         counter: that counter is the noun this split exists to protect. */
      const ties = [
        row.degree > 0 ? tally(t(lang, 'palette.reasonDegree'), row.degree, 'common.tie', 'common.ties') : '',
        row.parallel > 0 ? `${t(lang, 'tie.parallel')} ${row.parallel}` : '',
      ].filter(Boolean);
      const parts = row.hit.reason ? [occupation, row.hit.reason] : [occupation, ...ties];
      // A reason that restates the occupation is not a reason.
      const meta = [...new Set(parts.filter(Boolean))].join(' · ');
      return (
        <button {...common} key={row.key}>
          <span className="cp__chip" aria-hidden="true">
            <Portrait
              id={p.id}
              initials={lang === 'en' ? monogramEn(p.nameKo, p.nameEn) : monogram(p.nameKo, p.nameEn)}
              category={p.category}
              variant="chip"
              imageUrl={p.portraitUrl}
              {...plateOf(p, lang, watched)}
            />
          </span>
          <span className="cp__body">
            <span className="cp__names">
              {/* Which script leads flips with the UI language; the other one
                  is the subtitle, tagged so it keeps its own metrics. */}
              <span className="cp__name" lang={lang}>
                <Marked text={name.primary} hits={lang === 'en' ? row.hit.en : row.hit.ko} />
              </span>
              {name.secondary && (
                <span className="cp__name-sub" lang={subLang}>
                  <Marked text={name.secondary} hits={lang === 'en' ? row.hit.ko : row.hit.en} />
                </span>
              )}
              {won && <span className="cp__pip">{t(lang, 'palette.pipWinner')}</span>}
            </span>
            {meta && <span className="cp__sub">{meta}</span>}
          </span>
          <span className="cp__right">
            <span className="cp__tag" data-team={lin.team} style={{ '--tag': lin.color } as CSSProperties}>
              {LINEAGE_CHIP_I18N[lang][lin.team]}
            </span>
            <span className="cp__enter" aria-hidden="true">
              ⏎
            </span>
          </span>
        </button>
      );
    }

    return (
      <button {...common} key={row.key}>
        <span className="cp__glyphbox mono" aria-hidden="true">
          {row.glyph}
        </span>
        <span className="cp__body">
          <span className="cp__names">
            <span className="cp__name">{row.label}</span>
            {row.gloss && (
              <span className="cp__name-sub cp__name-sub--action" lang="en">
                {row.gloss}
              </span>
            )}
            {row.current && <span className="cp__pip cp__pip--now">{t(lang, 'palette.pipCurrent')}</span>}
          </span>
          {row.hint && <span className="cp__sub">{row.hint}</span>}
        </span>
        <span className="cp__right">
          <span className="cp__enter" aria-hidden="true">
            ⏎
          </span>
        </span>
      </button>
    );
  };

  const clear = (): void => {
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const runReset = (): void => {
    resetFilters();
    setActive(0);
    inputRef.current?.focus();
  };

  return createPortal(
    // `inert` rather than aria-hidden: it drops the leaving drawer out of the
    // accessibility tree AND out of the focus order in one step, without the
    // aria-hidden-over-a-focused-element trap.
    <div className={`cp${leaving ? ' cp--out' : ''}${isWarm ? ' cp--warm' : ''}`} inert={leaving || isWarm}>
      <div className="cp__scrim" aria-hidden="true" onMouseDown={onClose} />

      <div
        className="cp__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'palette.dialogLabel')}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="cp__search">
          <svg className="cp__lens" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="8.6" cy="8.6" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.4 12.4 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="cp__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, 'palette.placeholder')}
            aria-label={t(lang, 'palette.inputAria')}
            aria-describedby={helpId}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={flat.length > 0 ? listId : undefined}
            aria-activedescendant={activeIdx >= 0 ? optionId(activeIdx) : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button type="button" className="cp__clear" onClick={clear} aria-label={t(lang, 'palette.clear')}>
              <span aria-hidden="true">{t(lang, 'palette.clearShort')}</span>
              <span className="cp__x" aria-hidden="true">
                ✕
              </span>
            </button>
          )}
        </div>

        <div className="cp__meta">
          {/* Only once something has been searched for. Against an empty box
              this read "결과 11" — the number of rows currently rendered, five
              quick-start people plus the views — eight pixels from "등록 인물
              20명", so the panel opened by volunteering two different counts of
              the same cast and inviting the reader to wonder where nine people
              went. The section headers carry their own counts either way. */}
          {/* Broken out by section, because the total on its own contradicted
              the thing eight pixels below it. With 시즌 typed the line read
              "결과 15" and the very next line — the first section header —
              read "인물 PEOPLE 14"; the fifteenth row was a view further down
              the scroll, so two adjacent counters differed by one for no
              visible reason. In a product whose whole pitch is "verified",
              that is the small inconsistency that makes a reader stop trusting
              the totals. The total keeps its place and now says what it is the
              total OF, in the section names the scroll uses. */}
          {q ? (
            <span className="cp__meta-l">
              <span className="eyebrow">{t(lang, 'palette.results')}</span>
              <span className="mono tnum cp__count">{flat.length}</span>
              {groups.length > 1
                ? groups.map((g) => (
                    <span className="cp__count-part" key={g.id}>
                      <span aria-hidden="true"> · </span>
                      {g.label} <span className="mono tnum">{g.rows.length}</span>
                    </span>
                  ))
                : null}
            </span>
          ) : null}
          {/* Korean puts the noun in front of the numeral and the counter after
              it (인물 12명); English does neither. The two orders are written
              out rather than glued from fragments — but each fragment is now
              read off a singular/plural pair, because the English order ends on
              the noun and ended it with "1 people". */}
          <span className="cp__meta-r">
            {q ? (
              <>
                {t(lang, 'palette.metaFiltering')} ·{' '}
                {lang === 'ko' ? (
                  <>
                    {t(lang, 'palette.metaPeople')} <span className="mono tnum">{visible.size}</span>
                    {t(lang, visible.size === 1 ? 'common.person' : 'common.people')}
                  </>
                ) : (
                  <>
                    <span className="mono tnum">{visible.size}</span>{' '}
                    {t(lang, visible.size === 1 ? 'palette.metaPerson' : 'palette.metaPeople')}
                  </>
                )}{' '}
                · {t(lang, 'palette.metaKept')}
              </>
            ) : (
              <>
                {lang === 'ko' ? (
                  <>
                    {t(lang, 'palette.metaRegistered')} <span className="mono tnum">{people.length}</span>
                    {t(lang, people.length === 1 ? 'common.person' : 'common.people')}
                  </>
                ) : (
                  <>
                    <span className="mono tnum">{people.length}</span>{' '}
                    {t(
                      lang,
                      people.length === 1 ? 'palette.metaRegisteredOne' : 'palette.metaRegistered',
                    )}
                  </>
                )}{' '}
                · {t(lang, 'palette.metaScope')}
              </>
            )}
          </span>
        </div>

        <hr className="rule cp__rule" />

        <p className="sr-only" role="status">
          {qty(flat.length, 'palette.resultSuffix', 'palette.resultsSuffix')}
        </p>
        <p id={helpId} className="sr-only">
          {t(lang, 'palette.help')}
        </p>

        {flat.length > 0 ? (
          <div
            className="cp__list scroll"
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t(lang, 'palette.resultsAria')}
            data-end="false"
            /* Marks the moment the list bottoms out, so the fade that stops the
               last row being sliced by the footer can get out of the way. */
            onScroll={(e) => {
              const el = e.currentTarget;
              el.dataset.end = el.scrollTop + el.clientHeight >= el.scrollHeight - 4 ? 'true' : 'false';
            }}
          >
            {groups.map((g) => {
              const headId = `${uid}-h-${g.id}`;
              /* The header rides its own first row's slot in the cascade. It
                 used to paint at full opacity immediately while the rows below
                 it staggered in, so at ~370ms the palette showed "Views · 4"
                 over 100px of nothing — a section header stating a count for a
                 region that was still empty. A header can never precede its own
                 contents now. */
              const headIndex = Math.min(indexOf.get(g.rows[0].key) ?? 0, 9);
              return (
                <div className="cp__group" role="group" aria-labelledby={headId} key={g.id}>
                  <div
                    className={`cp__ghead${cascade ? ' cp__ghead--in' : ''}`}
                    id={headId}
                    style={{ '--i': headIndex } as CSSProperties}
                  >
                    <span className="cp__ghead-lead">{g.label}</span>
                    {g.gloss && (
                      <span className="cp__ghead-sub eyebrow" lang="en">
                        {g.gloss}
                      </span>
                    )}
                    {g.note && <span className="cp__ghead-note">{g.note}</span>}
                    <span className="cp__ghead-n mono tnum">{g.rows.length}</span>
                  </div>
                  {g.rows.map(renderRow)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cp__empty">
            <p className="eyebrow cp__empty-eyebrow">
              {lang === 'ko'
                ? `${t(lang, 'palette.emptyEyebrow')} · ${ui.en['palette.emptyEyebrow']}`
                : t(lang, 'palette.emptyEyebrow')}
            </p>
            <p className="cp__empty-q">
              <span className="mono">“{query.trim()}”</span> — {t(lang, 'palette.emptyLine')}
            </p>
            <p className="cp__empty-hint">{t(lang, 'palette.emptyHint')}</p>
            <button type="button" className="cp__btn" onClick={runReset}>
              {t(lang, 'palette.emptyReset')}
              {lang === 'ko' && (
                <span className="cp__btn-sub" lang="en">
                  {ui.en['palette.emptyReset']}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="cp__foot">
          <span className="cp__keys">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>{t(lang, 'palette.footMove')}</span>
          </span>
          <span className="cp__keys">
            <kbd>⏎</kbd>
            <span>{t(lang, 'palette.footSelect')}</span>
          </span>
          <span className="cp__keys">
            <kbd>esc</kbd>
            <span>{t(lang, 'palette.footClose')}</span>
          </span>
          <span className="cp__foot-note">{t(lang, 'palette.footNote')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
