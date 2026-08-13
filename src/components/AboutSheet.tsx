import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { CSSProperties, JSX, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import type { Dataset, Person, SeasonNumber, SeasonRun } from '../data/types';
import {
  alpha,
  BONE,
  BRASS,
  CATEGORY_COLOR,
  EDGE_COLOR,
  INK_LOW,
  INK_MID,
  SEASON_COLOR,
} from '../graph/palette';
import {
  PHOTO_LEVEL,
  PHOTO_SAT,
  PHOTO_SEAT_A0,
  PHOTO_SEAT_A1,
  PHOTO_SEAT_IN,
  PHOTO_SEAT_INK,
} from '../graph/plateGeometry';
import { HAS_PORTRAITS, onPortraitLoad, photoGain, portraitUrl } from '../graph/portraits';
import { isMeeting } from '../data/edges';
import { careerSeenBy, careerTableSeenBy, neverFacedSeenBy } from '../data/headToHead';
/* The status bar's byline row, reused whole. See the colophon panel below and
   the export note in Credit.tsx: one array, so the three destinations, their
   marks and their labels cannot drift between the two surfaces that draw them. */
import { LINKS } from './Credit';
import { fill } from '../data/i18n/ui';
import {
  CATEGORY_LABEL_I18N,
  EDGE_GLOSS_I18N,
  EDGE_LABEL_I18N,
  franchiseText,
  glossaryTerm,
  personName,
  runFacts,
  runText,
  seasonText,
  seasonTitle,
  seasonWinner,
  t,
  ui,
  type Lang,
  type UiKey,
} from '../data/i18n';
import { useLang } from '../state/useLang';
import { useWatched, type WatchedSet } from '../state/useWatched';
import { ALL_CATEGORIES, ALL_EDGE_TYPES } from '../state/useAtlas';
import './AboutSheet.css';

export interface AboutSheetProps {
  open: boolean;
  dataset: Dataset;
  onClose: () => void;
}

/* ── small helpers ──────────────────────────────────────────────────────── */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Non-empty string guard — the dataset ships with a lot of '' placeholders. */
function has(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * A Korean line with its Latin gloss beside it — '결정적 장면 · SIGNATURE MOMENT'.
 * One key, read twice, so the two halves can never drift; in the English UI the
 * gloss is dropped rather than printing the same words twice.
 *
 * String form, for the two places that need a string (an attribute, a `pip`
 * prop). Anything that lands in the DOM takes <Pair> below instead.
 */
function pairText(lang: Lang, k: UiKey): string {
  const line = t(lang, k);
  return lang === 'ko' ? `${line} · ${ui.en[k]}` : line;
}

/**
 * The same pair as elements, with the Latin half tagged `lang="en"`.
 *
 * This matters as of this round and it is not cosmetic. base.css now steps a
 * Hangul eyebrow down from 0.16em Latin caps tracking to --tr-caps-ko, keyed on
 * the element's own language — so a pair built by string concatenation is one
 * element in Korean and drags 'NO SPOILERS' down to Hangul tracking with it,
 * losing the caps rank the pairing is built on. Tagged, each half gets its own
 * script's metrics. Gallery, FilterRail, StatusBar and PathCard already do this;
 * these four eyebrows were the last string-built pairs in the app.
 */
function Pair({ lang, k }: { lang: Lang; k: UiKey }): JSX.Element {
  const line = t(lang, k);
  if (lang !== 'ko') return <>{line}</>;
  return (
    <>
      {line}
      {' · '}
      <span lang="en">{ui.en[k]}</span>
    </>
  );
}

/**
 * The sheet's own eyebrow — '피의 게임X · CAST ATLAS' — which is one string
 * holding both scripts rather than a key read twice, so it cannot use <Pair>.
 * Split at the dot it was authored with: the head is the Korean wordmark and
 * everything after it is Latin caps, and without the tag the whole line takes
 * the Hangul step-down and 'CAST ATLAS' loses its tracking. In English both
 * halves are Latin and the string stands as written.
 */
function SheetEyebrow({ lang }: { lang: Lang }): JSX.Element {
  const line = t(lang, 'about.eyebrow');
  const at = lang === 'ko' ? line.indexOf(' · ') : -1;
  if (at < 0) return <p className="eyebrow">{line}</p>;
  return (
    <p className="eyebrow">
      {line.slice(0, at + 3)}
      <span lang="en">{line.slice(at + 3)}</span>
    </p>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)}A${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/** Little radiating stubs so "more connected" reads without a caption. */
function stubs(cx: number, cy: number, r: number, n: number, length: number, color: string, k: string): JSX.Element[] {
  return Array.from({ length: n }, (_, i) => {
    const deg = (360 / n) * i + 18;
    const a = polar(cx, cy, r, deg);
    const b = polar(cx, cy, r + length, deg);
    return (
      <line
        key={`${k}${i}`}
        x1={a.x.toFixed(2)}
        y1={a.y.toFixed(2)}
        x2={b.x.toFixed(2)}
        y2={b.y.toFixed(2)}
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    );
  });
}

/* ── the legend's discs carry faces ─────────────────────────────────────────
   Every plate in the app holds a photograph, and this legend taught the whole
   plate grammar against an empty near-black disc: 'fine grey rim = no verified
   tie' demonstrated as the only mark on a bare circle, and then met in the wild
   as a 1.2-unit hairline against a photographed shoulder at 22px. The two
   marks the plate is least sure of — the laurel and the host hairline — were
   the two shown at maximum contrast here and minimum contrast there. So the
   tiles draw the object the reader will actually meet.

   THE GRADE IS THE SVG PLATE'S GRADE, not a look chosen here: saturate(
   PHOTO_SAT), the three linear slopes at PHOTO_LEVEL × gain, and the flat
   three-stop seat off PHOTO_SEAT_A0 / _IN / _A1 — the same constants in the
   same order as components/Portrait.tsx:341–364, read from plateGeometry
   rather than restated. `gain` is subscribed the same way too, because the
   per-image exposure correction is measured against the median of everyone
   decoded so far and a sheet opened during the cold open would otherwise print
   one exposure while the gallery behind it prints another. This is the THIRD
   call site of that grade; see the handoff about giving Portrait.tsx a
   `<PlatePhoto>` primitive so there is one drawing of it.

   WHICH FACE GOES IN WHICH TILE is not decorative. Each specimen is somebody
   the mark is actually true of — 이태균 under the brass laurel, 박지민 under
   the host ring, 신승용 under the fine grey rim and again in the cold band,
   최연청 under the newcomer dash — so a reader who later opens that person's
   dossier finds the same mark on the same face. That is why a face recurs
   across tiles: the facts recur.

   And it is gated on HAS_PORTRAITS, which is the same switch that picks
   between `about.tilePlate` and `about.tilePlatePhotos`. Empty the folder and
   the legend goes back to bare discs on the same frame that the caption stops
   claiming photographs — one condition, both halves. */
function PlateFace({
  id,
  cx,
  cy,
  r,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
}): JSX.Element | null {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gain = useSyncExternalStore(
    onPortraitLoad,
    () => photoGain(id),
    () => 1,
  );
  const photo = portraitUrl(id);
  if (!photo) return null;
  return (
    <>
      <defs>
        <clipPath id={`kc${uid}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <radialGradient id={`ks${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={PHOTO_SEAT_INK} stopOpacity={PHOTO_SEAT_A0} />
          <stop offset={`${PHOTO_SEAT_IN * 100}%`} stopColor={PHOTO_SEAT_INK} stopOpacity={PHOTO_SEAT_A0} />
          <stop offset="100%" stopColor={PHOTO_SEAT_INK} stopOpacity={PHOTO_SEAT_A1} />
        </radialGradient>
        <filter id={`kg${uid}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values={String(PHOTO_SAT)} />
          <feComponentTransfer>
            <feFuncR type="linear" slope={PHOTO_LEVEL * gain} />
            <feFuncG type="linear" slope={PHOTO_LEVEL * 0.97 * gain} />
            <feFuncB type="linear" slope={PHOTO_LEVEL * 0.93 * gain} />
          </feComponentTransfer>
        </filter>
      </defs>
      {/* The plate's own ground under the picture, so a transparent or
          still-loading image is a seated disc rather than a hole. */}
      <circle cx={cx} cy={cy} r={r} fill={PHOTO_SEAT_INK} />
      <image
        href={photo}
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        /* xMidYMin, matching the SVG plate: a circular crop centred on a tall
           portrait centres on the chin. */
        preserveAspectRatio="xMidYMin slice"
        clipPath={`url(#kc${uid})`}
        filter={`url(#kg${uid})`}
      />
      <circle cx={cx} cy={cy} r={r} fill={`url(#ks${uid})`} clipPath={`url(#kc${uid})`} />
    </>
  );
}

/** `PlateFace` when the folder has pictures, nothing when it does not. */
function Face(props: { id: string; cx: number; cy: number; r: number }): JSX.Element | null {
  return HAS_PORTRAITS ? <PlateFace {...props} /> : null;
}

const SEASON_NUMBERS: SeasonNumber[] = [1, 2, 3];

/* ── the track record ───────────────────────────────────────────────────────
   Every comparison this dataset supports used to be available one person at a
   time: the dossier's franchise strip is excellent and it is per-person, the
   cast wall groups by X bloc, and the by-season layout is a grouping rather
   than a chronology. "Who has the best record in this house" and "who was
   where, when" are the first two questions a franchise fan asks, and the atlas
   held the data to answer both while offering neither. */

/* WHAT AN EMPTY TRACK RECORD SAYS — now `about.recordSealedNote` in
   data/i18n/ui.ts, where the reasoning lives with the string.
   It used to be a `Record<Lang, string>` parked here because ui.ts had two
   owners queued on it that session and the previous owner would not race them.
   This round holds both files, so the lift is done: same words, both sides, a
   `UiKey` like every other line of copy in the app. */

type SortKey = 'name' | 'seasons' | 'best' | 'share' | 'ties';

interface RecordCell {
  /** '우승' / '4th' / '진행' — the short form, in the reader's language.
      Empty when the finish is withheld: the cell then falls to the same '—'
      an unplayed season gets. Telling those two states apart on the page is
      Phase 3's sealed mark, not this phase's. */
  label: string;
  /** '/ 13명 중' — the field the rank was taken from, where there is one. */
  of: string;
  /** GATED. Drives the brass on a win and the muted ink on a role, so it is
      `runFacts().rank` and never `run.rank`. */
  rank?: number;
  season: SeasonNumber;
}

interface RecordRow {
  id: string;
  primary: string;
  secondary: string;
  cells: Map<SeasonNumber, RecordCell>;
  played: number;
  /** Lowest rank across played seasons; Infinity when they never had a placing. */
  best: number;
  bestLabel: string;
  ties: number;
  /* ── the career columns ────────────────────────────────────────────────
     Read off `career`/`careerTable` rather than recomputed here. Best finish
     is an integer taken from a field that changed size every year and Top %
     is one run; `share` is players outlasted over players faced summed across
     every ranked run, which is the only figure on this table that makes two
     whole careers comparable — 홍진호 outlasted 25 of the 29 he has faced over
     two seasons, 허성범 14 of 17 in one. */
  /** outlasted / faced, 0–1; undefined when nothing on the record is ranked. */
  share?: number;
  faced: number;
  outlasted: number;
  titles: number;
  /** Position in `careerTable`; Infinity for a career it cannot rank. */
  careerRank: number;
  /** Ties that are a `parallel` record, i.e. explicitly not a meeting. */
  parallelTies: number;
  /**
   * How many of this person's played seasons have a finish this reader may not
   * be told. Zero for every row at the default set, which is what makes the
   * note this feeds invisible until somebody narrows their answer.
   *
   * Counted rather than flagged because the sum across the table is the number
   * the note is about — 'this table is missing finishes' is a different and
   * much less honest sentence than nothing at all when the answer is one.
   */
  sealedRuns: number;
}

/** What `runFacts` hands back, named so it can be computed once per run and
    spent on the cell, its denominator, the best-finish column and the sort. */
type RunFacts = ReturnType<typeof runFacts>;

/** A finish in one notation, in the reader's language. The rank only; the
    denominator is `fieldOf` below, because this table sets the two at
    different ranks of ink.
    THE RANK ARRIVES GATED — see `runFacts` — rather than being read off the
    record here, which is what printed eight placements and four 우승 into this
    table for a reader who had watched nothing. */
function shortFinish(
  p: Person,
  run: SeasonRun,
  index: number,
  lang: Lang,
  facts: RunFacts,
  watched: WatchedSet,
): string {
  if (run.role === 'contestant') {
    /* WITHHELD IS EMPTY, AND MUST NOT FALL THROUGH to the role branch. `role`
       is deliberately never gated, so a redacted contestant reaching the lines
       below would be labelled off a sealed placement string — '' — and then
       off `gallery.hostShort`, which asserts they were there and not playing.
       That is a false claim standing in for a withheld one. All fourteen
       contestant runs carry a rank (measured), so at the default set this
       early return is unreachable and the column is byte-identical. */
    if (!facts.rank) return '';
    if (facts.rank === 1) return t(lang, 'gallery.winnerShort');
    if (lang === 'ko') return `${facts.rank}${t(lang, 'gallery.rankUnit')}`;
    const tens = facts.rank % 100;
    const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][facts.rank % 10] ?? 'th');
    return `${facts.rank}${suffix}`;
  }
  /* A non-playing run has no number and the roles are not interchangeable —
     a studio panel seat is not a dealer's chair — so the head of the record's
     own placement string is used rather than a flattened "Host". */
  const head = runText(p.id, run, index, lang, watched).placement.split(/\s+[·—]\s+/)[0].trim();
  return head || t(lang, 'gallery.hostShort');
}

/**
 * The field a rank was taken from — '/ 13명 중', 'of 13'.
 *
 * records.ts writes this into every placement string and says why in its own
 * header; this table rebuilds the short form out of `run.rank` and so dropped
 * it, printing 홍진호's 3 of 13 and his 3 of 18 as the same cell on the one
 * screen in the app that exists to set records against each other. It is a
 * separate string rather than part of `shortFinish` because it is set a rank
 * quieter than the rank it qualifies: the ordinal is the figure being scanned,
 * the denominator is what makes it a fact. Empty where there is no placing or
 * no recorded field.
 *
 * IT TAKES THE GATED PAIR, and the pair is why `runFacts` returns both together:
 * `rank / fieldSize` is exactly invertible, so a denominator that outlived its
 * numerator would hand back the finish it was hiding. The rank check below is
 * therefore belt to `runFacts`'s braces rather than a second opinion.
 */
function fieldOf(run: SeasonRun, lang: Lang, facts: RunFacts): string {
  if (run.role !== 'contestant' || !facts.rank || !facts.fieldSize) return '';
  return t(lang, 'record.ofField').replace('{n}', String(facts.fieldSize));
}

/* The sheet enters over 420ms; it used to leave in a single frame. Exits run
   at roughly 60% of the entrance and collapse the panel as one object. */
const EXIT_MS = 200;

/** A keycap row: the caps themselves plus the key of the line describing them. */
interface Shortcut {
  keys: string[];
  k: UiKey;
}

const KEY_SHORTCUTS: Shortcut[] = [
  { keys: ['⌘K', 'Ctrl K', '/'], k: 'shortcut.search' },
  /* Same four names the top bar uses. Three vocabularies for four views was
     one of the reasons the copy stopped reading as one voice. */
  { keys: ['1', '2', '3', '4'], k: 'shortcut.layouts' },
  /* Arrow traversal, Enter and Shift+Enter are the only keyboard route into
     the content, and the graph's own aria-label was describing them to screen
     readers alone. A sighted keyboard user had to find them by accident. */
  { keys: ['↑', '↓', '←', '→'], k: 'shortcut.moveCursor' },
  { keys: ['Enter'], k: 'shortcut.openPerson' },
  { keys: ['Shift Enter'], k: 'shortcut.traceKeyboard' },
  /* The relationship lines are readable objects now, and a pointer was the only
     way to reach one. E walks the selected person's ties forward, Shift+E back
     — the same row the 'how to read' tiles above teach as a hover. */
  { keys: ['E', 'Shift E'], k: 'edge.cycleKey' },
  { keys: ['G'], k: 'shortcut.gallery' },
  { keys: ['F'], k: 'shortcut.fit' },
  { keys: ['+', '−'], k: 'shortcut.zoom' },
  { keys: ['['], k: 'shortcut.rail' },
  { keys: ['?'], k: 'shortcut.about' },
  { keys: ['Esc'], k: 'shortcut.escape' },
  { keys: ['Backspace'], k: 'shortcut.back' },
];

/* The pointer "keys" are gestures, not keycaps, so they are named in the
   reader's language too. */
const POINTER_SHORTCUTS: { keys: UiKey[]; k: UiKey }[] = [
  { keys: ['shortcut.keyDrag'], k: 'shortcut.pan' },
  { keys: ['shortcut.keyScroll'], k: 'shortcut.zoomPointer' },
  { keys: ['shortcut.keyDragNode'], k: 'shortcut.moveNode' },
  { keys: ['shortcut.keyShiftClick'], k: 'shortcut.tracePath' },
];

/* ── presentational bits ────────────────────────────────────────────────── */

/** A section heading and the sub-heading under it. The `-en` span is the Latin
    gloss, present only in the Korean UI. */
function SecH({ lang, k }: { lang: Lang; k: UiKey }): JSX.Element {
  return (
    <h3 className="abt-sec__h">
      {t(lang, k)}
      {lang === 'ko' && (
        <span className="abt-sec__h-en" lang="en">
          {ui.en[k]}
        </span>
      )}
    </h3>
  );
}

function SecSub({ lang, k }: { lang: Lang; k: UiKey }): JSX.Element {
  return (
    <h4 className="abt-sec__sub">
      {t(lang, k)}
      {lang === 'ko' && (
        <span className="abt-sec__sub-en" lang="en">
          {ui.en[k]}
        </span>
      )}
    </h4>
  );
}

function Fact({
  lang,
  k,
  value,
  valueLang,
  sub,
  subLang,
  tone,
  pip,
}: {
  lang: Lang;
  k: UiKey;
  value: string | null | undefined;
  /** Set when the value is only on record in one language. */
  valueLang?: Lang;
  /** The same value in the other script — a winner's romanised name, say. */
  sub?: string;
  subLang?: Lang;
  tone?: 'brass';
  pip?: string;
}): JSX.Element | null {
  if (!has(value)) return null;
  return (
    <div className="abt-fact">
      <dt className="abt-fact__key">
        <span className="abt-fact__key-ko">{t(lang, k)}</span>
        {lang === 'ko' && (
          <span className="abt-fact__key-en eyebrow" lang="en">
            {ui.en[k]}
          </span>
        )}
      </dt>
      <dd className={`abt-fact__val${tone ? ` abt-fact__val--${tone}` : ''}`}>
        <span className="abt-fact__val-ko" lang={valueLang}>
          {value}
        </span>
        {has(sub) && (
          <span className="abt-fact__val-en" lang={subLang}>
            {sub}
          </span>
        )}
        {has(pip) && <span className="abt-fact__val-pip">{pip}</span>}
      </dd>
    </div>
  );
}

function KeyTile({ lang, k, children }: { lang: Lang; k: UiKey; children: ReactNode }): JSX.Element {
  return (
    <li className="abt-tile">
      <svg className="abt-tile__art" viewBox="0 0 132 80" aria-hidden="true" focusable="false">
        {children}
      </svg>
      <div className="abt-tile__text">
        <span className="abt-tile__ko">{t(lang, k)}</span>
        {lang === 'ko' && (
          <span className="abt-tile__en" lang="en">
            {ui.en[k]}
          </span>
        )}
      </div>
    </li>
  );
}

function ShortcutTable({
  lang,
  rows,
  captionKey,
  pointer,
}: {
  lang: Lang;
  rows: Shortcut[];
  captionKey: UiKey;
  pointer?: boolean;
}): JSX.Element {
  return (
    <table className="abt-keys">
      <caption className="sr-only">{t(lang, captionKey)}</caption>
      <thead>
        <tr>
          <th scope="col" className="eyebrow">
            <Pair lang={lang} k="about.keyColKey" />
          </th>
          <th scope="col" className="eyebrow">
            <Pair lang={lang} k="about.keyColAction" />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.k}>
            <td className="abt-keys__combo">
              {s.keys.map((cap) => (
                <span key={cap} className={pointer ? 'abt-kbd abt-kbd--soft' : 'abt-kbd'}>
                  {cap}
                </span>
              ))}
            </td>
            <td className="abt-keys__what">
              <span className="abt-keys__ko">{t(lang, s.k)}</span>
              {lang === 'ko' && (
                <span className="abt-keys__en" lang="en">
                  {ui.en[s.k]}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── the sheet ──────────────────────────────────────────────────────────── */

type TabId = 'what' | 'read' | 'seasons' | 'record' | 'glossary' | 'franchise' | 'keys' | 'sources' | 'made';

interface TabDef {
  id: TabId;
  k: UiKey;
}

export function AboutSheet({ open, dataset, onClose }: AboutSheetProps): JSX.Element | null {
  const { lang } = useLang();
  /* THE HOOK, NOT `currentWatched()`, AND THREADED EXPLICITLY EVERYWHERE BELOW.
     This is the subscription: the context changing identity is the only thing
     that tells React this sheet has to paint again. Every accessor and every
     `*SeenBy` call on this surface is handed `watched` by hand and every memo
     that consumes one carries it in its dependency array — an omitted dep here
     is not a lint nit, it is the track-record table keeping eight placements on
     screen after the reader has just said they have not seen those seasons.
     Leaving an accessor on its default parameter would read the module global,
     which React knows nothing about; see the note on `currentWatched` in
     state/useWatched.ts. */
  const { watched } = useWatched();
  const reduced = Boolean(useReducedMotion());
  const uid = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const close = useCallback(() => onCloseRef.current(), []);

  const seasons = dataset.seasons ?? [];
  const glossary = dataset.glossary ?? [];
  const franchise = dataset.franchise;
  const meta = dataset.meta;
  const sources = meta?.sources ?? [];

  /* Which script trails the one that leads. */
  const subLang: Lang = lang === 'en' ? 'ko' : 'en';

  /* Three dataset fields carry an optional English sibling. Use it when the
     reader is in English; otherwise show the Korean and tag it, so the font
     and the tracking stay correct rather than the text going blank. */
  const bilingual = useCallback(
    (ko: string | undefined, en: string | undefined): { text: string; lang: Lang } =>
      lang === 'en' && has(en) ? { text: en as string, lang: 'en' } : { text: ko ?? '', lang: 'ko' },
    [lang],
  );
  const policy = bilingual(meta?.spoilerPolicy, meta?.spoilerPolicyEn);
  /* The provenance paragraph. It was authored, build-validated against the live
     citation count by tools/validate-data.mjs section 9, quoted as a blocker by
     three data-file comments — and rendered nowhere: `grep -rn sourcing src/`
     outside the data files returned one hit and it was a comment. See the
     Sources panel for where it goes and why it goes first. */
  const sourcing = bilingual(meta?.sourcing, meta?.sourcingEn);
  const premise = bilingual(dataset.currentSeason?.premise, dataset.currentSeason?.premiseEn);
  const episodes = bilingual(dataset.currentSeason?.episodes, dataset.currentSeason?.episodesEn);

  /* Who among the past winners is actually standing in this graph. */
  const castIds = useMemo(() => new Set((dataset.people ?? []).map((p) => p.id)), [dataset.people]);

  /* A legend is a promise about what you will see. Mapping ALL_EDGE_TYPES
     handed the reader a colour key for six relationships that appear nowhere
     in the data — and FilterRail already filters to count > 0, so the legend
     and the rail contradicted each other in the same session. Same source of
     truth on both surfaces now; if an edge of that type is ever authored the
     row appears on its own. */
  const liveEdgeTypes = useMemo(() => {
    const used = new Set((dataset.edges ?? []).map((e) => e.type));
    return ALL_EDGE_TYPES.filter((type) => used.has(type));
  }, [dataset.edges]);

  const hasFranchise =
    has(franchise?.premise) || has(franchise?.lineage) || has(franchise?.creator) || has(franchise?.reception);
  const hasSources = sources.length > 0 || has(meta?.lastUpdated);

  /* One row per person who has already played, with their whole record on it.
     Degree is counted off the edge list rather than off the graph, because the
     sheet is handed the dataset and not the built graph — and the two agree by
     construction, every edge being a verified tie between two cast members. */
  /* Default to the one column that orders whole careers. 'best' put 홍진호's
     3rd of 18 above 서출구's 4th of 13 by comparing two integers taken from
     fields five players apart, on the one table in the app whose job is to
     make finishes comparable. */
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'share', dir: 1 });

  const records = useMemo<RecordRow[]>(() => {
    /* Two degrees, not one, and the header calls the first '확인된 인연'. A
       `parallel` edge records that two people have demonstrably NEVER shared a
       room; counting it as a verified tie is the one claim in the product that
       contradicts its own schema. See NON_MEETING_TYPES in edges.ts. */
    const degree = new Map<string, number>();
    const parallel = new Map<string, number>();
    for (const e of dataset.edges ?? []) {
      const bucket = isMeeting(e.type) ? degree : parallel;
      bucket.set(e.source, (bucket.get(e.source) ?? 0) + 1);
      bucket.set(e.target, (bucket.get(e.target) ?? 0) + 1);
    }
    /* `careerTableSeenBy`, not the pinned `careerTable`: the ordering IS a
       result. The pinned constant ranks whole careers off finishes the reader
       may not have been told, so at a narrow set the rows would have come out
       in an order that answers the question the cells refuse to. It returns 0
       rows for a reader who has watched nothing, and `careerRank` then falls to
       Infinity for everybody, which the sort below already handles as "not a
       bad career, an unmeasured one" — the neutral ordering, by name. */
    const careerOrder = new Map(careerTableSeenBy(watched).map((c, i) => [c.id, i]));
    const career = careerSeenBy(watched);
    const rows: RecordRow[] = [];
    for (const p of dataset.people ?? []) {
      const runs = p.priorSeasons ?? [];
      if (runs.length === 0) continue;
      const name = personName(p, lang);
      const cells = new Map<SeasonNumber, RecordCell>();
      let best = Infinity;
      let bestLabel = '';
      let sealedRuns = 0;
      runs.forEach((run, i) => {
        /* One call per run, spent five ways: the cell label, its denominator,
           the cell's own rank, the best-finish column and the sealed count. */
        const facts = runFacts(run, lang, watched);
        const label = shortFinish(p, run, i, lang, facts, watched);
        /* THE CELL IS STILL SET even when the finish is withheld. It is what
           the chronology spine counts — `r.cells.has(season)` is "was this
           person in that season", which is participation and is never
           redacted — so dropping the entry here would have quietly emptied the
           연표 as well as the table. */
        cells.set(run.season, {
          label,
          of: fieldOf(run, lang, facts),
          rank: facts.rank,
          season: run.season,
        });
        if (run.role === 'contestant' && !facts.rank) sealedRuns += 1;
        if (run.role === 'contestant' && facts.rank && facts.rank < best) {
          best = facts.rank;
          bestLabel = label;
        }
      });
      const c = career[p.id];
      rows.push({
        id: p.id,
        primary: name.primary,
        secondary: name.secondary,
        cells,
        played: runs.length,
        best,
        bestLabel,
        ties: degree.get(p.id) ?? 0,
        parallelTies: parallel.get(p.id) ?? 0,
        share: c?.share,
        faced: c?.faced ?? 0,
        outlasted: c?.outlasted ?? 0,
        titles: c?.titles ?? 0,
        careerRank: careerOrder.get(p.id) ?? Infinity,
        sealedRuns,
      });
    }
    return rows;
  }, [dataset.edges, dataset.people, lang, watched]);

  const sortedRecords = useMemo<RecordRow[]>(() => {
    const byName = (a: RecordRow, b: RecordRow): number =>
      a.primary.localeCompare(b.primary, lang === 'en' ? 'en' : 'ko');
    const rows = [...records];
    rows.sort((a, b) => {
      if (sort.key === 'name') return byName(a, b) * sort.dir;
      if (sort.key === 'seasons') return (b.played - a.played) * sort.dir || byName(a, b);
      if (sort.key === 'ties') return (b.ties - a.ties) * sort.dir || byName(a, b);
      /* Career order comes out of `careerTable`, already sorted by share and
         then by how many players were faced, so the table and the module agree
         on one ordering rather than reproducing it twice with two tie-breaks.
         Somebody with nothing rankable sits at the end in both directions —
         that is not a bad career, it is an unmeasured one. */
      if (sort.key === 'share') {
        const af = Number.isFinite(a.careerRank);
        const bf = Number.isFinite(b.careerRank);
        if (af !== bf) return af ? -1 : 1;
        if (!af) return byName(a, b);
        return (a.careerRank - b.careerRank) * sort.dir || byName(a, b);
      }
      /* Somebody who has only ever presided has no placing, and the finish
         column cannot rank them. That is not a bad finish, so they sit at the
         end in both directions rather than being sorted as if they had come
         last. */
      const av = a.best;
      const bv = b.best;
      const af = Number.isFinite(av);
      const bf = Number.isFinite(bv);
      if (af !== bf) return af ? -1 : 1;
      if (!af) return byName(a, b);
      return (av - bv) * sort.dir || byName(a, b);
    });
    return rows;
  }, [records, sort, lang]);

  const hasRecords = records.length > 0;

  /**
   * How many finishes this table is not printing.
   *
   * Zero at the default watched-set — all fourteen contestant runs are ranked
   * and every rank is visible — so the note it feeds does not exist for anybody
   * who has not narrowed their answer, and Rule 0 holds by construction. It is
   * a sum over rows rather than a boolean because it also has to be zero, not
   * merely false, on the partial sets: a reader who has seen season 1 and
   * nothing else is missing eleven of them and should be told once, not per
   * cell.
   */
  const sealedFinishes = useMemo(
    () => records.reduce((n, r) => n + r.sealedRuns, 0),
    [records],
  );

  /* The three the `parallel` edge type was invented for, named. */
  const coldCast = useMemo(
    () =>
      neverFacedSeenBy(watched)
        .map((id) => (dataset.people ?? []).find((p) => p.id === id))
        .filter((p): p is Person => p !== undefined)
        .map((p) => ({ id: p.id, ...personName(p, lang) })),
    [dataset.people, lang, watched],
  );

  const tabs = useMemo<TabDef[]>(() => {
    const list: TabDef[] = [
      { id: 'what', k: 'about.tabWhat' },
      { id: 'read', k: 'about.tabRead' },
    ];
    if (seasons.length) list.push({ id: 'seasons', k: 'about.tabSeasons' });
    if (hasRecords) list.push({ id: 'record', k: 'about.tabRecord' });
    if (glossary.length) list.push({ id: 'glossary', k: 'about.tabGlossary' });
    if (hasFranchise) list.push({ id: 'franchise', k: 'about.tabFranchise' });
    list.push({ id: 'keys', k: 'about.tabKeys' });
    if (hasSources) list.push({ id: 'sources', k: 'about.tabSources' });
    /* UNCONDITIONAL, and last. Every other optional tab is gated on the dataset
       having something to put in it; this one is about the app rather than
       about the data, so there is no empty state to guard against and nothing
       that could make it disappear. Last because it is the colophon — see
       `about.tabMade`. */
    list.push({ id: 'made', k: 'about.tabMade' });
    return list;
  }, [seasons.length, hasRecords, glossary.length, hasFranchise, hasSources]);

  const [tabId, setTabId] = useState<TabId>('what');
  const active: TabDef = tabs.find((tab) => tab.id === tabId) ?? tabs[0];

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
    const timer = window.setTimeout(() => setAlive(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  /* Always reopen on the first tab. */
  useEffect(() => {
    if (open) setTabId('what');
  }, [open]);

  /* Esc, focus trap, focus restore. */
  useEffect(() => {
    if (!open) return;
    const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      const root = panelRef.current;
      if (!root) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const here = document.activeElement;
      const inside = here instanceof Node && root.contains(here);

      if (e.shiftKey && (!inside || here === first || here === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || here === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restoreTo?.focus();
    };
  }, [open]);

  const onTabKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      e.stopPropagation();
      const target = tabs[next];
      setTabId(target.id);
      tabRefs.current[target.id]?.focus();
    },
    [tabs],
  );

  /* Stay mounted for the length of the exit so the panel is shown leaving.
     Everything that matters for access — the focus trap, the Esc handler and
     the focus restore — is still keyed on `open`, so it all releases the
     instant the sheet is dismissed rather than 200ms later. */
  if (!alive) return null;
  const leaving = !open;

  const titleId = `${uid}-title`;

  /* ── section bodies ───────────────────────────────────────────────── */

  const whatPanel = () => (
    <>
      <SecH lang={lang} k="about.whatHeading" />
      <p className="abt-prose">{t(lang, 'about.whatBody')}</p>

      <div className="abt-spoiler" role="note">
        <p className="abt-spoiler__flag eyebrow">
          <Pair lang={lang} k="about.spoilerFlag" />
        </p>
        <p className="abt-spoiler__ko">{t(lang, 'about.spoilerBody')}</p>
        {/* The dataset's own policy note, in whichever language the reader is in. */}
        {has(policy.text) && (
          <p className="abt-spoiler__policy" lang={policy.lang}>
            {policy.text}
          </p>
        )}
      </div>

      {(has(dataset.currentSeason?.network) ||
        has(dataset.currentSeason?.premiereDate) ||
        has(dataset.currentSeason?.episodes) ||
        has(dataset.currentSeason?.prize)) && (
        <>
          <hr className="rule abt-sec__rule" />
          <SecSub lang={lang} k="about.nowHeading" />
          <dl className="abt-facts">
            <Fact lang={lang} k="about.factNetwork" value={dataset.currentSeason.network} />
            <Fact lang={lang} k="about.factPremiere" value={dataset.currentSeason.premiereDate} />
            <Fact lang={lang} k="about.factEpisodes" value={episodes.text} valueLang={episodes.lang} />
            <Fact lang={lang} k="about.factPrize" value={dataset.currentSeason.prize} />
          </dl>
          {has(premise.text) && (
            <p className="abt-prose" lang={premise.lang}>
              {premise.text}
            </p>
          )}
        </>
      )}
    </>
  );

  const readPanel = () => (
    <>
      <SecH lang={lang} k="about.readHeading" />
      <p className="abt-prose">{t(lang, 'about.readBody')}</p>

      <ul className="abt-tiles">
        {/* The two ends of the actual range: 홍진호 carries the most verified
            ties in the twenty and 강지후 none, so the size difference the tile
            teaches is the one the reader will find on the canvas. Each disc
            takes its own archetype hue because that is what a ring means —
            drawing both in one hue to "isolate the variable" would have been
            the legend telling a lie to make a point. */}
        <KeyTile lang={lang} k="about.tileSize">
          {stubs(34, 42, 11, 2, 9, CATEGORY_COLOR.other, 'a')}
          {stubs(94, 42, 21, 7, 10, CATEGORY_COLOR.esports, 'b')}
          <Face id="kang-ji-hoo" cx={34} cy={42} r={11} />
          <circle cx="34" cy="42" r="11" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.other, 0.16)} stroke={CATEGORY_COLOR.other} strokeWidth="2" />
          <Face id="hong-jin-ho" cx={94} cy={42} r={21} />
          <circle cx="94" cy="42" r="21" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.esports, 0.16)} stroke={CATEGORY_COLOR.esports} strokeWidth="2.4" />
        </KeyTile>

        {/* One person per hue, and each is that archetype: 곽범 코미디언,
            하승진 운동선수, 김유현 포커. */}
        <KeyTile lang={lang} k="about.tileRing">
          <Face id="kwak-beom" cx={30} cy={40} r={14} />
          <circle cx="30" cy="40" r="14" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.comedian, 0.14)} stroke={CATEGORY_COLOR.comedian} strokeWidth="2.4" />
          <Face id="ha-seung-jin" cx={66} cy={40} r={14} />
          <circle cx="66" cy="40" r="14" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.athlete, 0.14)} stroke={CATEGORY_COLOR.athlete} strokeWidth="2.4" />
          <Face id="kim-yoo-hyun" cx={102} cy={40} r={14} />
          <circle cx="102" cy="40" r="14" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.poker, 0.14)} stroke={CATEGORY_COLOR.poker} strokeWidth="2.4" />
        </KeyTile>

        {/* 서출구, who played seasons 2 and 3 — so the two arcs are his two
            arcs, in his two seasons' colours, around his own ring. */}
        <KeyTile lang={lang} k="about.tileArcs">
          <Face id="seo-chul-gu" cx={66} cy={40} r={15} />
          <circle cx="66" cy="40" r="15" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.musician, 0.14)} stroke={CATEGORY_COLOR.musician} strokeWidth="2" />
          <path d={arcPath(66, 40, 24, -128, -38)} fill="none" stroke={SEASON_COLOR[2]} strokeWidth="3.4" strokeLinecap="round" />
          <path d={arcPath(66, 40, 24, -22, 74)} fill="none" stroke={SEASON_COLOR[3]} strokeWidth="3.4" strokeLinecap="round" />
        </KeyTile>

        {/* 이태균 — the franchise's first champion, which is the only claim
            this mark makes. */}
        <KeyTile lang={lang} k="about.tileHalo">
          <circle cx="66" cy="40" r="26" fill="none" stroke={alpha(BRASS, 0.22)} strokeWidth="7" />
          <circle cx="66" cy="40" r="21" fill="none" stroke={BRASS} strokeWidth="2" />
          <Face id="lee-tae-gyun" cx={66} cy={40} r={15} />
          <circle cx="66" cy="40" r="15" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.professional, 0.14)} stroke={CATEGORY_COLOR.professional} strokeWidth="2" />
        </KeyTile>

        {/* Three different dashed circles are drawn on the plates and the key
            used to carry one entry for all of them, worded as the season ring.
            Under that key the two host plates presented as franchise newcomers
            — the precise opposite of the truth for the two most
            franchise-embedded people in the cast. One tile per ring, drawn at
            the radius and dash the plate actually uses. */}
        {/* 최연청 — a 루키, i.e. a franchise newcomer, which is exactly what
            the dashed rim says. */}
        <KeyTile lang={lang} k="about.tileDashedRim">
          <circle
            cx="66"
            cy="40"
            r="21"
            fill="none"
            stroke={CATEGORY_COLOR.actor}
            strokeOpacity="0.75"
            strokeWidth="1.6"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          <Face id="choi-yeon-cheong" cx={66} cy={40} r={15} />
          <circle cx="66" cy="40" r="15" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.actor, 0.14)} stroke={CATEGORY_COLOR.actor} strokeWidth="2" />
        </KeyTile>

        {/* Presiding over a season is not a finish, and the plate used to draw
            it as one — a host's arc fell between a 12th and a 13th place. It is
            a beaded arc across the whole slot now, and the outer ring that says
            "this person has run a season" is SOLID, because the dashed language
            belongs to the franchise newcomer one tile up.
            박지민, the only person in the twenty who has run a season. */}
        <KeyTile lang={lang} k="about.tileHostRing">
          <circle cx="66" cy="40" r="26" fill="none" stroke={BONE} strokeOpacity="0.6" strokeWidth="1.3" />
          <path
            d={arcPath(66, 40, 21, -110, 50)}
            fill="none"
            stroke={SEASON_COLOR[3]}
            strokeWidth="3"
            strokeDasharray="0.01 7"
            strokeLinecap="round"
          />
          <Face id="park-ji-min" cx={66} cy={40} r={15} />
          <circle cx="66" cy="40" r="15" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.broadcaster, 0.14)} stroke={CATEGORY_COLOR.broadcaster} strokeWidth="2" />
        </KeyTile>

        {/* 신승용, one of the three who walked in with no verified tie — and
            the tile the round-8 review named: a 1.2-unit hairline is a
            different object against a face than against an empty disc, and
            this is where the reader has to learn to find it. */}
        <KeyTile lang={lang} k="about.tileNoTies">
          <circle
            cx="66"
            cy="40"
            r="25"
            fill="none"
            stroke={INK_LOW}
            strokeWidth="1.2"
            strokeDasharray="2 4"
            strokeLinecap="round"
          />
          <Face id="shin-seung-yong" cx={66} cy={40} r={15} />
          <circle cx="66" cy="40" r="15" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.professional, 0.14)} stroke={CATEGORY_COLOR.professional} strokeWidth="2" />
        </KeyTile>

        {/* ONCE A DISC CARRIES A FACE, A LINE BETWEEN TWO OF THEM IS A CLAIM.
            A mint rule between two anonymous circles is a specimen; the same
            rule between two named living people says they were allies, and a
            crimson arrow says one of them knifed the other. So every line tile
            below draws a pair the dataset actually draws, at the type it
            actually carries — 이태균×김유현 프로젝트 지니어스 (prior-show, and
            outside the house, hence the dash) and 김경훈→이상민 (betrayal, and
            the arrow points the way the edge does). The legend is now checkable
            against the graph it explains, which is the stronger version of
            being merely inoffensive. */}
        <KeyTile lang={lang} k="about.tileDashedLine">
          <line
            x1="34"
            y1="40"
            x2="98"
            y2="40"
            stroke={EDGE_COLOR['prior-show']}
            strokeWidth="2.4"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          <Face id="lee-tae-gyun" cx={26} cy={40} r={9} />
          <circle cx="26" cy="40" r="9" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.professional, 0.16)} stroke={CATEGORY_COLOR.professional} strokeWidth="2" />
          <Face id="kim-yoo-hyun" cx={106} cy={40} r={9} />
          <circle cx="106" cy="40" r="9" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.poker, 0.16)} stroke={CATEGORY_COLOR.poker} strokeWidth="2" />
        </KeyTile>

        <KeyTile lang={lang} k="about.tileArrow">
          <line x1="34" y1="40" x2="88" y2="40" stroke={EDGE_COLOR.betrayal} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M88 33.5 L99 40 L88 46.5 Z" fill={EDGE_COLOR.betrayal} />
          <Face id="kim-kyung-hoon" cx={26} cy={40} r={9} />
          <circle cx="26" cy="40" r="9" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.professional, 0.16)} stroke={CATEGORY_COLOR.professional} strokeWidth="2" />
          <Face id="lee-sang-min" cx={112} cy={40} r={9} />
          <circle cx="112" cy="40" r="9" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.broadcaster, 0.16)} stroke={CATEGORY_COLOR.broadcaster} strokeWidth="2" />
        </KeyTile>

        {/* The lines became interactive and the field guide never said so: a
            reader who never happens to rest the cursor on a line has no way to
            learn that the lines answer questions at all. Drawn the way the
            canvas draws it — the fat faint underlay, the solid stroke over it,
            and the bead at the line's own midpoint, which is the point the
            readout is speaking for. */}
        <KeyTile lang={lang} k="about.tileEdgeRead">
          <defs>
            {/* The card's own accent: a 2px bar along its top edge in the
                relationship's hue, fading out at 78% — EdgeCard.css:57. */}
            <linearGradient id="abt-edge-accent" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={EDGE_COLOR.alliance} stopOpacity="0.95" />
              <stop offset="78%" stopColor={EDGE_COLOR.alliance} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="18" y1="59" x2="56" y2="27" stroke={alpha(EDGE_COLOR.alliance, 0.15)} strokeWidth="9" strokeLinecap="round" />
          <line x1="18" y1="59" x2="56" y2="27" stroke={EDGE_COLOR.alliance} strokeWidth="2.6" strokeLinecap="round" />
          {/* 홍진호 × 서출구, the alliance edges.ts calls the sturdiest pair on
              the wall — a real line, for the reason given above the dashed-line
              tile. Neither ring is mint, so a half-chroma ring on a
              full-chroma alliance line cannot read as one object. */}
          <Face id="hong-jin-ho" cx={12} cy={64} r={8} />
          <circle cx="12" cy="64" r="8" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.esports, 0.18)} stroke={CATEGORY_COLOR.esports} strokeWidth="2" />
          <Face id="seo-chul-gu" cx={62} cy={22} r={8} />
          <circle cx="62" cy="22" r="8" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.musician, 0.18)} stroke={CATEGORY_COLOR.musician} strokeWidth="2" />
          <circle cx="37" cy="43" r="6.6" fill="none" stroke={alpha(EDGE_COLOR.alliance, 0.4)} strokeWidth="1" />
          <circle cx="37" cy="43" r="3.4" fill={EDGE_COLOR.alliance} />
          {/* the readout itself, stood off the line the way it places */}
          <rect x="78" y="12" width="48" height="56" rx="4" fill="rgba(255,255,255,0.05)" stroke={INK_LOW} strokeOpacity="0.55" strokeWidth="1" />
          <rect x="79" y="13" width="46" height="2.5" fill="url(#abt-edge-accent)" />
          <rect x="84" y="22" width="17" height="7" rx="3" fill="none" stroke={EDGE_COLOR.alliance} strokeOpacity="0.7" strokeWidth="1" />
          <rect x="104" y="22" width="13" height="7" rx="3" fill="none" stroke={INK_LOW} strokeOpacity="0.6" strokeWidth="1" />
          {[
            { y: 40, x2: 118 },
            { y: 48, x2: 120 },
            { y: 56, x2: 106 },
          ].map((r) => (
            <line
              key={`rd${r.y}`}
              x1="84"
              y1={r.y}
              x2={r.x2}
              y2={r.y}
              stroke={INK_MID}
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </KeyTile>

        {/* Held open is a different state from read in passing, so it gets its
            own row rather than a clause. Brass is the winner's colour
            everywhere else in this app, and it is spent here deliberately: the
            canvas draws the pinned collar in brass (render.ts:464) and a legend
            that names a colour the canvas never draws is worse than none. */}
        <KeyTile lang={lang} k="about.tileEdgePin">
          <line x1="12" y1="58" x2="120" y2="22" stroke={alpha(EDGE_COLOR.alliance, 0.15)} strokeWidth="11" strokeLinecap="round" />
          <line x1="12" y1="58" x2="120" y2="22" stroke={EDGE_COLOR.alliance} strokeWidth="3" strokeLinecap="round" />
          <circle cx="66" cy="40" r="11.5" fill="none" stroke={BRASS} strokeOpacity="0.92" strokeWidth="2" />
          <circle cx="66" cy="40" r="5.6" fill={EDGE_COLOR.alliance} />
        </KeyTile>

        {/* The band along the bottom of the graph. It is drawn, captioned and
            never explained anywhere else. */}
        <KeyTile lang={lang} k="about.tileColdBand">
          <defs>
            <linearGradient id="abt-cold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INK_LOW} stopOpacity="0.16" />
              <stop offset="100%" stopColor={INK_LOW} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="10" y="30" width="112" height="42" fill="url(#abt-cold)" />
          <line
            x1="10"
            y1="30"
            x2="122"
            y2="30"
            stroke={INK_MID}
            strokeWidth="1.4"
            strokeDasharray="5 7"
            strokeLinecap="round"
          />
          {/* The three who are actually in it — 신승용, 강지후, 최연청 — in
              their own archetype hues. The third was drawn in `creator`, which
              is nobody in that band. */}
          <Face id="shin-seung-yong" cx={38} cy={48} r={8} />
          <circle cx="38" cy="48" r="8" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.professional, 0.12)} stroke={alpha(CATEGORY_COLOR.professional, 0.7)} strokeWidth="1.6" />
          <Face id="kang-ji-hoo" cx={66} cy={48} r={8} />
          <circle cx="66" cy="48" r="8" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.other, 0.12)} stroke={alpha(CATEGORY_COLOR.other, 0.7)} strokeWidth="1.6" />
          <Face id="choi-yeon-cheong" cx={94} cy={48} r={8} />
          <circle cx="94" cy="48" r="8" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.actor, 0.12)} stroke={alpha(CATEGORY_COLOR.actor, 0.7)} strokeWidth="1.6" />
        </KeyTile>

        {/* Portrait plates: the gallery and the dossier both draw them, and
            every mark on them is data. */}
        {/* Drawn at the plate's own radii: the laurel now sits OUTBOARD of the
            tick rim as two hairlines with rungs between them, so on the amber
            archetypes it can no longer be mistaken for a rookie's dashed
            season ring. The long S1 arc carries the winner's cap dot. */}
        {/* The claim changes with the folder: a wall of photographs under a
            tile saying the plates are "not photographed" contradicts the page
            it is printed on. See gallery.note. */}
        {/* 이진형's plate, and every mark on it is his: the 전문직 ring, one
            season-2 arc carrying the winner's cap dot, and the laurel outboard
            of the tick rim. It used to be an assembly — an e스포츠 ring under a
            season-1 arc under a franchise laurel, which is nobody — and the
            moment a face went in behind it the assembly would have been a
            claim about whoever that face belonged to. */}
        <KeyTile lang={lang} k={HAS_PORTRAITS ? 'about.tilePlatePhotos' : 'about.tilePlate'}>
          <Face id="lee-jin-hyung" cx={66} cy={40} r={16} />
          <circle cx="66" cy="40" r="16" fill={HAS_PORTRAITS ? 'none' : 'rgba(255,255,255,0.03)'} stroke={CATEGORY_COLOR.professional} strokeOpacity="0.8" strokeWidth="1.6" />
          <path d={arcPath(66, 40, 21, -110, -10)} fill="none" stroke={SEASON_COLOR[2]} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx={polar(66, 40, 21, -10).x} cy={polar(66, 40, 21, -10).y} r="2.4" fill={SEASON_COLOR[2]} />
          <circle cx="66" cy="40" r="28" fill="none" stroke={BRASS} strokeOpacity="0.5" strokeWidth="0.8" />
          <circle cx="66" cy="40" r="31.5" fill="none" stroke={BRASS} strokeOpacity="0.75" strokeWidth="0.9" />
          {Array.from({ length: 16 }, (_, i) => {
            const a = polar(66, 40, 28, (360 / 16) * i);
            const b = polar(66, 40, 31.5, (360 / 16) * i);
            return (
              <line
                key={`lau${i}`}
                x1={a.x.toFixed(2)}
                y1={a.y.toFixed(2)}
                x2={b.x.toFixed(2)}
                y2={b.y.toFixed(2)}
                stroke={BRASS}
                strokeWidth="1.1"
                strokeOpacity="0.65"
                strokeLinecap="round"
              />
            );
          })}
        </KeyTile>

        <KeyTile lang={lang} k="about.tileRimTicks">
          <Face id="yoon-bi" cx={34} cy={40} r={13} />
          <circle cx="34" cy="40" r="13" fill={HAS_PORTRAITS ? 'none' : 'rgba(255,255,255,0.03)'} stroke={CATEGORY_COLOR.musician} strokeOpacity="0.8" strokeWidth="1.4" />
          {[EDGE_COLOR.alliance, EDGE_COLOR.betrayal, EDGE_COLOR['prior-show']].map((c, i) => {
            const deg = 40 + i * 120;
            const a = polar(34, 40, 18, deg);
            const b = polar(34, 40, 23, deg);
            return (
              <line key={`t1${i}`} x1={a.x.toFixed(2)} y1={a.y.toFixed(2)} x2={b.x.toFixed(2)} y2={b.y.toFixed(2)} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
            );
          })}
          <Face id="jung-keun-woo" cx={94} cy={40} r={13} />
          <circle cx="94" cy="40" r="13" fill={HAS_PORTRAITS ? 'none' : 'rgba(255,255,255,0.03)'} stroke={CATEGORY_COLOR.athlete} strokeOpacity="0.8" strokeWidth="1.4" />
          {[
            EDGE_COLOR.alliance,
            EDGE_COLOR.betrayal,
            EDGE_COLOR.rivalry,
            EDGE_COLOR['prior-show'],
            EDGE_COLOR['co-season'],
            EDGE_COLOR.collab,
            EDGE_COLOR.alliance,
            EDGE_COLOR.mentor,
            EDGE_COLOR.teammate,
          ].map((c, i, all) => {
            const deg = (360 / all.length) * i + 12;
            const a = polar(94, 40, 18, deg);
            const b = polar(94, 40, 23.5, deg);
            return (
              <line key={`t2${i}`} x1={a.x.toFixed(2)} y1={a.y.toFixed(2)} x2={b.x.toFixed(2)} y2={b.y.toFixed(2)} stroke={c} strokeWidth="1.6" strokeLinecap="round" />
            );
          })}
        </KeyTile>

        {/* The one gesture that answers the question a relationship graph
            exists to answer — and a real two-hop chain, for the reason above:
            하승진 –동맹– 이진형 –배신→ 윤비, all three lines in the file. The two
            hollow circles stay hollow on purpose: they are the routes the
            trace did NOT take, and a face in them would make them people the
            reader is being told something about. */}
        <KeyTile lang={lang} k="about.tileShiftClick">
          <line x1="24" y1="56" x2="52" y2="24" stroke={INK_LOW} strokeOpacity="0.35" strokeWidth="1.4" />
          <line x1="80" y1="24" x2="108" y2="56" stroke={INK_LOW} strokeOpacity="0.35" strokeWidth="1.4" />
          <line x1="26" y1="30" x2="66" y2="58" stroke={EDGE_COLOR.alliance} strokeWidth="2.6" strokeLinecap="round" />
          <line x1="66" y1="58" x2="106" y2="30" stroke={EDGE_COLOR.betrayal} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="52" cy="24" r="6" fill="none" stroke={INK_LOW} strokeOpacity="0.4" strokeWidth="1.4" />
          <circle cx="80" cy="24" r="6" fill="none" stroke={INK_LOW} strokeOpacity="0.4" strokeWidth="1.4" />
          <Face id="ha-seung-jin" cx={26} cy={30} r={10} />
          <circle cx="26" cy="30" r="10" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.athlete, 0.2)} stroke={CATEGORY_COLOR.athlete} strokeWidth="2.2" />
          <Face id="lee-jin-hyung" cx={66} cy={58} r={9} />
          <circle cx="66" cy="58" r="9" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.professional, 0.2)} stroke={CATEGORY_COLOR.professional} strokeWidth="2" />
          <Face id="yoon-bi" cx={106} cy={30} r={10} />
          <circle cx="106" cy="30" r="10" fill={HAS_PORTRAITS ? 'none' : alpha(CATEGORY_COLOR.musician, 0.2)} stroke={CATEGORY_COLOR.musician} strokeWidth="2.2" />
        </KeyTile>
      </ul>

      <hr className="rule abt-sec__rule" />

      <SecSub lang={lang} k="about.lineColourHeading" />
      <ul className="abt-legend">
        {liveEdgeTypes.map((type) => (
          <li className="abt-legend__row" key={type}>
            <svg className="abt-legend__art" viewBox="0 0 44 12" aria-hidden="true" focusable="false">
              <line
                x1="2"
                y1="6"
                x2={type === 'betrayal' ? 32 : 42}
                y2="6"
                stroke={EDGE_COLOR[type]}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              {type === 'betrayal' && <path d="M32 1.5 L42 6 L32 10.5 Z" fill={EDGE_COLOR.betrayal} />}
            </svg>
            <span className="abt-legend__ko">{EDGE_LABEL_I18N[lang][type]}</span>
            {lang === 'ko' && (
              <span className="abt-legend__en" lang="en">
                {EDGE_LABEL_I18N.en[type]}
              </span>
            )}
            <span className="abt-legend__gloss">{EDGE_GLOSS_I18N[lang][type]}</span>
          </li>
        ))}
      </ul>
      <p className="abt-note">{t(lang, 'about.dashedNote')}</p>

      <hr className="rule abt-sec__rule" />

      <SecSub lang={lang} k="about.archetypesHeading" />
      <ul className="abt-swatches">
        {ALL_CATEGORIES.map((c) => (
          <li className="abt-swatch" key={c}>
            <svg className="abt-swatch__art" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <circle cx="9" cy="9" r="6" fill={alpha(CATEGORY_COLOR[c], 0.18)} stroke={CATEGORY_COLOR[c]} strokeWidth="2" />
            </svg>
            <span className="abt-swatch__ko">{CATEGORY_LABEL_I18N[lang][c]}</span>
            {lang === 'ko' && (
              <span className="abt-swatch__en" lang="en">
                {CATEGORY_LABEL_I18N.en[c]}
              </span>
            )}
          </li>
        ))}
      </ul>

      <SecSub lang={lang} k="about.seasonArcsHeading" />
      <ul className="abt-swatches abt-swatches--tight">
        {SEASON_NUMBERS.map((n) => (
          <li className="abt-swatch" key={n}>
            <svg className="abt-swatch__art" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <path d={arcPath(9, 9, 6, -130, 50)} fill="none" stroke={SEASON_COLOR[n]} strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="abt-swatch__ko">{`${t(lang, 'about.seasonLabel')} ${n}`}</span>
            {lang === 'ko' && (
              <span className="abt-swatch__en" lang="en">{`${ui.en['about.seasonLabel']} ${n}`}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );

  const seasonsPanel = () => (
    <>
      <SecH lang={lang} k="about.seasonsHeading" />
      <p className="abt-prose">{t(lang, 'about.seasonsBody')}</p>
      <div className="abt-seasons">
        {seasons.map((s) => {
          /* `seasonTitle` takes no watched-set and wants none: a season's title
             is the name of a programme, not a result. `seasonText` gates the
             prize and the signature moment and so is handed the set by hand. */
          const title = seasonTitle(s, lang);
          const text = seasonText(s, lang, watched);
          /* THE MOST SPOILING FIELD IN THE DATASET, and this panel printed it
             raw: '우승 / Winner' in brass beside a name, three times, on the one
             tab a reader opens to find out what this franchise IS. `winnerId`
             comes through the same accessor and is gated with the names,
             because the 'X 출연' pip beside a sealed name is not a name but it
             does narrow twenty people to one bloc. Sealed, all three resolve to
             '' / undefined and `<Fact>` renders null — the row simply is not
             there. At the default they are what the record holds. */
          const winner = seasonWinner(s, lang, watched);
          return (
            /* SEASON_COLOR, not the dataset's own `accent`: this panel is the
               surface that TEACHES the season hues, and the two had already
               drifted — season 3's accent is literally the BRASS winner value,
               which the palette file exists to keep 22 ΔE away from a season
               mark. A legend that names a colour the canvas never draws is
               worse than no legend. */
            <article
              className="abt-season"
              key={s.season}
              style={{ '--tint': SEASON_COLOR[s.season] } as CSSProperties}
            >
              <header className="abt-season__head">
                <span className="abt-season__num mono tnum">S{s.season}</span>
                <h4 className="abt-season__title">
                  <span lang={lang}>
                    {has(title.primary) ? title.primary : `${t(lang, 'about.seasonLabel')} ${s.season}`}
                  </span>
                  {has(title.secondary) && (
                    <span className="abt-season__title-en" lang={subLang}>
                      {title.secondary}
                    </span>
                  )}
                </h4>
              </header>
              {has(text.hook) && <p className="abt-season__hook">{text.hook}</p>}
              <dl className="abt-facts abt-facts--tight">
                <Fact lang={lang} k="about.factNetwork" value={s.network} />
                <Fact lang={lang} k="about.factAirDates" value={s.airDates} />
                <Fact lang={lang} k="about.factEpisodes" value={text.episodes} />
                <Fact lang={lang} k="about.factPrize" value={text.prize} />
                {/* Authored since the first cut and never rendered anywhere. A
                    franchise reference panel that cannot tell you who won is
                    missing the one fact every season card is asked for. */}
                <Fact
                  lang={lang}
                  k="about.factWinner"
                  value={winner.primary}
                  /* `translated` off the accessor, not `lang === 'en' &&
                     s.winnerNameEn`: once the name is gated, "is this the
                     English one?" can no longer be recovered by looking at the
                     string, because a sealed English name and a Korean
                     fallback both come back as something that is not
                     `winnerNameEn`. The flag is the answer, and it is computed
                     on the raw record before the gate. */
                  valueLang={winner.translated ? 'en' : 'ko'}
                  sub={winner.secondary}
                  subLang={lang === 'en' ? 'ko' : 'en'}
                  tone="brass"
                  pip={winner.id && castIds.has(winner.id) ? pairText(lang, 'about.inThisCast') : undefined}
                />
              </dl>
              {has(text.signatureMoment) && (
                <figure className="abt-season__moment">
                  <figcaption className="abt-season__moment-flag eyebrow">
                    <Pair lang={lang} k="about.signatureMoment" />
                  </figcaption>
                  <blockquote className="abt-season__moment-text">{text.signatureMoment}</blockquote>
                </figure>
              )}
              {has(text.format) && <p className="abt-season__format">{text.format}</p>}
            </article>
          );
        })}
      </div>
    </>
  );

  /* The one surface in the app where the twelve returning players are set
     against each other, and the only chronological spine anywhere: the by-season
     layout is a grouping, the cast wall groups by X bloc, and the dossier's
     franchise strip is per-person. */
  const recordPanel = () => {
    const head = (key: SortKey, k: UiKey, numeric?: boolean): JSX.Element => {
      const on = sort.key === key;
      return (
        <th
          scope="col"
          className={`abt-rec__h${numeric ? ' abt-rec__h--n' : ''}`}
          aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
        >
          <button
            type="button"
            className={`abt-rec__sort${on ? ' is-on' : ''}`}
            onClick={() =>
              setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
            }
            title={t(lang, 'about.sortAria')}
          >
            <span className="abt-rec__h-lead">{t(lang, k)}</span>
            {lang === 'ko' && (
              <span className="abt-rec__h-en" lang="en">
                {ui.en[k]}
              </span>
            )}
            {/* The resting glyph is a two-way arrow, not a dot: a bare · beside
                a heading reads as a stray separator rather than as "this is
                sortable". */}
            <span className="abt-rec__caret" aria-hidden="true">
              {on ? (sort.dir === 1 ? '▲' : '▼') : '↕'}
            </span>
            <span className="sr-only">{t(lang, 'about.sortAria')}</span>
          </button>
        </th>
      );
    };

    return (
      <>
        <SecH lang={lang} k="about.recordHeading" />
        <p className="abt-prose">{t(lang, 'about.recordBody')}</p>
        {/* Above the spine and the table rather than under them, because it is
            the frame a reader needs before they scan a column of dashes, not a
            footnote explaining one afterwards. `sealedFinishes` is 0 at the
            default set, so this element does not exist on the default page. */}
        {sealedFinishes > 0 && <p className="abt-note">{t(lang, 'about.recordSealedNote')}</p>}

        {/* the chronological spine — 2021 to now, in one line */}
        <SecSub lang={lang} k="about.recordSpine" />
        <ol className="abt-spine">
          {seasons.map((s) => {
            const inCast = records.filter((r) => r.cells.has(s.season)).length;
            return (
              <li
                className="abt-spine__step"
                key={s.season}
                style={{ '--tint': SEASON_COLOR[s.season] } as CSSProperties}
              >
                <span className="abt-spine__num mono tnum">S{s.season}</span>
                <span className="abt-spine__dates mono">{s.airDates}</span>
                <span className="abt-spine__n">
                  <span className="mono tnum">{inCast}</span>
                  {lang === 'ko' && <span>{t(lang, 'common.people')}</span>}
                  <span className="abt-spine__n-l">{t(lang, 'about.spineInLineup')}</span>
                </span>
              </li>
            );
          })}
          {/* The season the atlas is about is the one it holds no results for.
              Its step is drawn open and uncoloured rather than in the brand
              crimson — the colour law reserves that for the wordmark, the title
              card and betrayal, and a red step here would also read as a
              finished season with a record behind it. */}
          <li className="abt-spine__step abt-spine__step--now" style={{ '--tint': 'var(--ink-low)' } as CSSProperties}>
            <span className="abt-spine__num">X</span>
            <span className="abt-spine__dates mono">{dataset.currentSeason?.premiereDate ?? ''}</span>
            <span className="abt-spine__n">
              <span className="mono tnum">{(dataset.people ?? []).length}</span>
              {lang === 'ko' && <span>{t(lang, 'common.people')}</span>}
              <span className="abt-spine__n-l">{t(lang, 'about.spineInLineup')}</span>
            </span>
          </li>
        </ol>

        <div className="abt-rec__wrap scroll">
          <table className="abt-rec">
            <caption className="sr-only">{t(lang, 'about.recordCaption')}</caption>
            <thead>
              <tr>
                {head('name', 'about.colPerson')}
                {SEASON_NUMBERS.map((n) => (
                  <th scope="col" className="abt-rec__h abt-rec__h--s" key={n}>
                    <span className="abt-rec__s mono" style={{ color: SEASON_COLOR[n] }}>
                      S{n}
                    </span>
                  </th>
                ))}
                {head('seasons', 'about.colSeasonsPlayed', true)}
                {head('best', 'about.colBest', true)}
                {/* ── the comparable column, and why it is now this one ──────
                    This slot has always held "the one column that can be
                    compared straight down", because 최고 성적 is an integer
                    taken from a field that changed size every year: sorted by
                    it, 홍진호's 3rd of 18 and 서출구's 4th of 13 come out in that
                    order and by share of the field they come out in the other.

                    It used to hold 상위 % — rank over field for the single best
                    run. It now holds 생존률: players outlasted over players
                    faced, summed across EVERY ranked run, straight off
                    `careerTable`. Three reasons, in order of weight. It is a
                    career against a career rather than a best afternoon
                    against a best afternoon, which is the question this table
                    asks. It is additive, so 홍진호's two seasons and 허성범's one
                    land on the same axis (86% of 29 faced against 82% of 17)
                    instead of being ordered by whichever run happened to be
                    the best. And it is the number the module was written to
                    supply, which had been computed and rendered nowhere.

                    Both did not fit: measured on the running sheet, the ten-
                    column table came to 986px inside an 870px scroller at
                    1280, 1600 and 1920 alike — the sheet's table area is a
                    fixed width — so the 확인된 인연 column, the one this round's
                    other fix is about, fell off the right edge. Two columns
                    answering one question is what gave way. */}
                {head('share', 'career.share', true)}
                {/* No Titles column. `career.titles` counts franchise wins and
                    nobody in this lineup has two — the column would be 1, 1,
                    and ten dashes for 85px of a budget that has none, and the
                    fact is already on the row twice: 우승 in brass in the season
                    cell and again under 최고 성적. It is spent as the accessible
                    name on that brass cell instead. */}
                {head('ties', 'about.colTies', true)}
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="abt-rec__who">
                    <span className="abt-rec__name">{r.primary}</span>
                    <span className="abt-rec__name-sub" lang={subLang}>
                      {r.secondary}
                    </span>
                  </th>
                  {SEASON_NUMBERS.map((n) => {
                    const cell = r.cells.get(n);
                    return (
                      <td className="abt-rec__cell" key={n}>
                        {/* `cell.label` AND NOT JUST `cell`. A withheld finish
                            keeps its cell — the spine counts those — but has no
                            string to set, and rendering the chip empty would
                            print a bordered, season-tinted box around nothing:
                            a mark that says "there is a result here" while
                            refusing to say what, which is a louder claim than
                            the dash. It falls to the same '—' an unplayed
                            season gets. Those two states are deliberately not
                            distinguished this phase; the sealed mark that tells
                            them apart is Phase 3, in the commit that also adds
                            the legend row explaining it. At the default every
                            cell has a label, so this reads as it always did. */}
                        {cell && cell.label ? (
                          <span
                            className={`abt-rec__run${cell.rank === 1 ? ' abt-rec__run--win' : ''}${
                              cell.rank ? '' : ' abt-rec__run--role'
                            }`}
                            style={{ '--run': SEASON_COLOR[n] } as CSSProperties}
                          >
                            {cell.label}
                            {cell.of && <span className="abt-rec__of">{cell.of}</span>}
                          </span>
                        ) : (
                          <span className="abt-rec__none" aria-hidden="true">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="abt-rec__n mono tnum">{r.played}</td>
                  <td
                    className={`abt-rec__n${r.best === 1 ? ' abt-rec__n--win' : ''}`}
                    title={r.titles > 0 ? t(lang, 'career.titles') : undefined}
                  >
                    {r.bestLabel || <span className="abt-rec__none">—</span>}
                    {r.titles > 0 && (
                      <span className="sr-only">
                        {' '}
                        {t(lang, 'career.titles')} {r.titles}
                      </span>
                    )}
                  </td>
                  {/* The sentence behind the percentage — '29명 중 25명보다 오래
                      남았다' — is the cell's title and its screen-reader text,
                      because 86% on its own does not say what it is a share
                      of, and the two numbers are what make it checkable. */}
                  <td
                    className="abt-rec__n mono tnum"
                    title={
                      r.share === undefined
                        ? undefined
                        : fill(t(lang, 'career.outlasted'), { n: r.faced, k: r.outlasted })
                    }
                  >
                    {r.share === undefined ? (
                      <span className="abt-rec__none">—</span>
                    ) : (
                      <>
                        {Math.round(r.share * 100)}%
                        <span className="sr-only">
                          {' '}
                          {fill(t(lang, 'career.outlasted'), { n: r.faced, k: r.outlasted })}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="abt-rec__n mono tnum">
                    {r.ties}
                    {/* Counted apart and printed apart. A parallel record is a
                        real row in the dataset and it is not a verified tie,
                        so it sits beside the number rather than inside it. */}
                    {r.parallelTies > 0 && (
                      /* `abt-rec__of` rather than a class of its own: it is the
                         same typographic job as the '/ 13명 중' beside a rank —
                         a qualifier set a rank quieter than the figure it
                         follows — and this table already owns that treatment. */
                      <span className="abt-rec__of" title={t(lang, 'tie.parallelNote')}>
                        +{r.parallelTies}
                        <span className="sr-only"> {t(lang, 'tie.parallel')}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="abt-note">{t(lang, 'about.recordRest')}</p>

        {/* ── walking in cold ────────────────────────────────────────────
            The table above is about the twelve who have a record. The other
            finding in the same data is about three of the eight who do not,
            and the app knew it and never said it: 강지후, 신승용 and 최연청 have
            never been in a field with anyone else in this lineup. On the
            default graph that reads as missing research — three ghosted discs
            at the frame edge — when it is a casting decision, and `neverFaced`
            has computed exactly this list since the round it was written.

            Names come from `neverFaced` and are looked up in the cast, so the
            block cannot name somebody the edge data no longer agrees about. */}
        {coldCast.length > 0 && (
          <>
            <SecSub lang={lang} k="about.coldHeading" />
            {/* Set with the sheet's existing prose classes rather than new
                ones — AboutSheet.css is not this file's to extend, and three
                names in a row is a sentence, not a table. */}
            <p className="abt-prose">
              {coldCast.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ' · '}
                  <strong>{c.primary}</strong>{' '}
                  <span lang={subLang}>{c.secondary}</span>
                </span>
              ))}
            </p>
            <p className="abt-note">{t(lang, 'about.coldBody')}</p>
          </>
        )}
      </>
    );
  };

  const glossaryPanel = () => (
    <>
      <SecH lang={lang} k="about.glossaryHeading" />
      <dl className="abt-glossary">
        {glossary.map((g) => {
          const entry = glossaryTerm(g, lang, watched);
          return (
            <div className="abt-gloss" key={`${g.termKo}-${g.termEn}`}>
              <dt className="abt-gloss__term">
                <span className="abt-gloss__ko" lang={lang}>
                  {entry.term}
                </span>
                {has(entry.other) && (
                  <span className="abt-gloss__en" lang={subLang}>
                    {entry.other}
                  </span>
                )}
              </dt>
              <dd className="abt-gloss__meaning">{entry.meaning}</dd>
            </div>
          );
        })}
      </dl>
    </>
  );

  const franchisePanel = () => {
    const fr = franchiseText(franchise, lang);
    return (
      <>
        <SecH lang={lang} k="about.franchiseHeading" />
        {has(fr.premise) && (
          <section className="abt-block">
            <SecSub lang={lang} k="about.premise" />
            <p className="abt-prose">{fr.premise}</p>
          </section>
        )}
        {has(fr.lineage) && (
          <section className="abt-block">
            <SecSub lang={lang} k="about.lineage" />
            <p className="abt-prose">{fr.lineage}</p>
          </section>
        )}
        {has(franchise?.creator) && (
          <section className="abt-block">
            <SecSub lang={lang} k="about.creator" />
            <p className="abt-prose">{franchise.creator}</p>
          </section>
        )}
        {has(fr.reception) && (
          <section className="abt-block">
            <SecSub lang={lang} k="about.reception" />
            <p className="abt-prose">{fr.reception}</p>
          </section>
        )}
      </>
    );
  };

  const keysPanel = () => (
    <>
      <SecH lang={lang} k="about.keysHeading" />
      <SecSub lang={lang} k="about.keyboard" />
      <ShortcutTable lang={lang} rows={KEY_SHORTCUTS} captionKey="about.keysCaption" />
      {/* The 1–4 row is otherwise a promise the app breaks: pressing 4 with
          nobody selected does nothing at all. */}
      <p className="abt-note">{t(lang, 'about.keysOrbitNote')}</p>
      <hr className="rule abt-sec__rule" />
      <SecSub lang={lang} k="about.pointer" />
      <ShortcutTable
        lang={lang}
        rows={POINTER_SHORTCUTS.map((row) => ({ keys: row.keys.map((cap) => t(lang, cap)), k: row.k }))}
        captionKey="about.pointerCaption"
        pointer
      />
    </>
  );

  /* ── the one uncited thing ───────────────────────────────────────────────
     This app prints 확인된 on a tie, carries a confidence field per edge,
     cites the narrowest per-day wiki page for a 4위, and volunteers in
     dataset.meta.sourcing that 77% of its evidence is one crowd-editable
     wiki. Then twenty photographs of twenty identifiable living people ship
     as the default presentation with no credit, no source and no licence
     anywhere in the product — the schema does not have a field to put one in,
     the files carry no metadata (measured: every one of the twenty is a bare
     VP8 chunk, no EXIF, no XMP, no ICC), and this sheet's source list is text
     URLs only. A reader who trusts the citation apparatus has no way to
     notice the exception.

     So the sheet says so, in the tab where a reader goes to ask where things
     came from, next to the text sources rather than in a corner. It states
     what is knowable — how many plates are photographs, where the files enter
     the build, that nothing about their origin is recorded — and it does not
     invent a supplier or a licence, because inventing one is the failure this
     block exists to stop. The count comes off the manifest rather than the
     word 'twenty', so emptying the folder empties the claim with it.

     HANDOFF (src/data/types.ts + src/data/dataset.ts, not owned here): the
     honest version is per-image provenance, not a paragraph. Add
     `portraits?: { credit: string; creditEn?: string; source?: string;
     licence?: string; per?: Record<string, {credit: string; source?: string}> }`
     to `Dataset['meta']`, and this block prints it — supplier and basis per
     image where it is known, and this text only for whatever is left. The
     `Person.portraitUrl` comment at types.ts:178-184 also still documents the
     abandoned policy ('left empty on purpose… the app draws generated portrait
     plates instead'); it wants to describe the shipped state — folder-loaded
     at build time by tools/vite-plugin-portraits.mjs, generated plate as the
     fallback. */
  /* A plain count and not a memo: this file's panels are thunks built after an
     early return, so a hook here would be conditional, and twenty `portraitUrl`
     lookups on a tab the reader opened deliberately is not worth a cache. */
  const sourcesPanel = () => {
    const cast = dataset.people ?? [];
    const photoCount = cast.filter((p) => portraitUrl(p.id) !== undefined).length;
    /* Set-level, in the reader's language, and empty when the dataset does not
       state one — which is what switches the paragraph below back to the
       uncredited wording. See `meta.portraits` in types.ts. */
    const portraitCredit = meta?.portraits
      ? (lang === 'en' && has(meta.portraits.creditEn)
          ? meta.portraits.creditEn
          : meta.portraits.credit) ?? ''
      : '';
    return (
    <>
      <SecH lang={lang} k="about.sourcesHeading" />
      {/* ── the provenance paragraph, FIRST ─────────────────────────────────
          This is the tab a reader opens to ask where any of this came from,
          and until now it answered with seven top-level links and a notice
          about photographs — nothing at all about the QUALITY of the evidence.
          Meanwhile dataset.meta.sourcing, which says that about 77% of the
          citations are one crowd-editable wiki and counts exactly how many
          ties stand on it alone, was dead data: authored, asserted against the
          live citation count by validate-data section 9, cited by three
          data-file comments as the reason they cannot add references, and
          never once painted.

          It goes ABOVE the link list and above the portraits notice because it
          is the frame those two are read inside: a list of sources means one
          thing under "most of this is a wiki anyone can edit" and another
          thing without it. Same treatment `policy` already gets on the
          What-this-is tab — the dataset's own prose, in whichever language the
          reader is in, tagged so the font and tracking follow the run. */}
      {has(sourcing.text) && (
        <p className="abt-prose" lang={sourcing.lang}>
          {sourcing.text}
        </p>
      )}
      {/* `abt-block` and nothing new: AboutSheet.css is not owned by this
          change, so the block takes the spacing every other block in the sheet
          already has. */}
      {HAS_PORTRAITS && photoCount > 0 && (
        <section className="abt-block">
          <SecSub lang={lang} k="about.portraitsHeading" />
          {/* Credited when the dataset states an origin, apologetic when it does
              not. The two strings are alternatives rather than neighbours: the
              uncredited one asserts "이 앱은 그 사진들의 출처를 모른다", and
              printing that under a stated credit would make the sheet contradict
              itself on the one tab a reader opens to check exactly this. */}
          <p className="abt-prose">
            {portraitCredit
              ? fill(t(lang, 'about.portraitsCredited'), {
                  n: photoCount,
                  total: cast.length,
                  credit: portraitCredit,
                })
              : fill(t(lang, 'about.portraitsBody'), { n: photoCount, total: cast.length })}
          </p>
          <p className="abt-note">{t(lang, 'about.portraitsRights')}</p>
        </section>
      )}
      {sources.length > 0 ? (
        <ul className="abt-sources">
          {sources.map((src) => {
            const host = hostOf(src);
            return (
              <li className="abt-source" key={src}>
                {host ? (
                  <a className="abt-source__link" href={src} target="_blank" rel="noreferrer noopener">
                    <span className="abt-source__host">{host}</span>
                    <span className="abt-source__url">{src}</span>
                    <span className="abt-source__out" aria-hidden="true">
                      ↗
                    </span>
                    <span className="sr-only">({t(lang, 'about.newTab')})</span>
                  </a>
                ) : (
                  <span className="abt-source__plain">{src}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="abt-note">{t(lang, 'about.sourcesEmpty')}</p>
      )}
      {has(meta?.lastUpdated) && (
        <p className="abt-updated">
          <span className="eyebrow">{t(lang, 'about.lastUpdated')}</span>
          <span className="mono tnum abt-updated__date">{meta.lastUpdated}</span>
        </p>
      )}
    </>
    );
  };

  /* ── the colophon ────────────────────────────────────────────────────────
     The one thing this app never cited was itself.

     It cites 309 claims, fails its own build when the sourcing paragraph drifts
     from the citation histogram, and prints a whole paragraph one tab to the
     left apologising for twenty photographs whose origin it cannot state. The
     status bar carries a byline; a byline is a name, not a reason. This is the
     reason, in the tab a reader reaches after they have been told where the
     facts came from — which is the right order, because "who assembled this"
     is the last question, not the first.

     THREE CLAIMS AND NO FOURTH. What the maker thinks is coming, how long she
     has watched, and where to reach her. It states the prediction as hers
     rather than as a fact about the market, because it is one, and this sheet's
     whole register is the difference between those two. Nothing about
     affiliation, licensing or scale is asserted here: none of it is on record
     anywhere in the repository, and inventing a line about it is the exact
     failure the portraits block one tab left exists to name.

     NOT GATED, and it wants no watched-set. There is no outcome in it — no
     placement, no winner, no season X — so `pick`/`prose` have nothing to gate
     and threading `watched` in would have been ceremony. Measured both ways:
     this panel is byte-identical at the default set and at '[]'. */
  const madePanel = () => (
    <>
      <SecH lang={lang} k="about.madeHeading" />
      <p className="abt-prose">{t(lang, 'about.madeBody')}</p>
      <p className="abt-prose">{t(lang, 'about.madeFan')}</p>

      <hr className="rule abt-sec__rule" />

      <SecSub lang={lang} k="about.madeReachHeading" />
      {/* `LINKS.length`, never the word three, so the sentence and the row
          below it are one object and cannot disagree about how many there are.
          Only the Korean string actually has a `{n}` — Korean's 곳 wants a
          counter in front of it and English reads better with no number at all
          — so on the English side `fill` is a no-op and the sentence is
          drift-proof by not making the claim. See `about.madeReach`. */}
      <p className="abt-prose">{fill(t(lang, 'about.madeReach'), { n: LINKS.length })}</p>
      <ul className="abt-made">
        {LINKS.map((l) => (
          <li key={l.href}>
            {/* THE SAME ANCHOR THE STATUS BAR DRAWS, from the same array.
                `rel="me"` is what the personal site's own rel-me verification
                wants on this end, so the three corroborate each other rather
                than being three loose URLs; `noopener` because an opened tab
                holding `window.opener` can navigate this one, and this one
                holds a reader's watched set and their place in a graph. Both
                are restated here rather than inherited, because rel is a
                property of the anchor and not of the destination. */}
            <a
              className="abt-made__link"
              href={l.href}
              target="_blank"
              rel="me noopener noreferrer"
              /* A superset of the status bar's name, not a different one. The
                 prefix and the label are the same two strings in the same
                 order — so a screen reader hears one destination named one way
                 in both places — with this sheet's own new-tab notice on the
                 end, which every other outbound link on the Sources tab
                 already carries. The visible host text is inside the
                 accessible name, so voice control can still say it. */
              aria-label={`${t(lang, 'credit.linkPrefix')} ${l.label} (${t(lang, 'about.newTab')})`}
            >
              <svg className="abt-made__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                {l.path}
              </svg>
              {/* Not a bare icon row. The status bar has 13px and no room for
                  words; a modal has both, and a globe glyph on its own does not
                  say WHICH site. The mark stays because it is the row's rhythm
                  and it is already drawn. */}
              <span className="abt-made__host">{l.label}</span>
              <span className="abt-made__out" aria-hidden="true">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );

  /* Thunks: only the visible section is ever built. */
  const bodies: Record<TabId, () => ReactNode> = {
    what: whatPanel,
    read: readPanel,
    seasons: seasonsPanel,
    record: recordPanel,
    glossary: glossaryPanel,
    franchise: franchisePanel,
    keys: keysPanel,
    sources: sourcesPanel,
    made: madePanel,
  };

  return createPortal(
    // `inert` rather than aria-hidden: it drops the leaving sheet out of the
    // accessibility tree AND out of the focus order in one step, without the
    // aria-hidden-over-a-focused-element trap.
    <div className={`about${leaving ? ' about--out' : ''}`} inert={leaving}>
      <div className="about__backdrop" role="presentation" onClick={close} />

      <div
        className="about__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="about__head">
          <div className="about__head-text">
            <SheetEyebrow lang={lang} />
            <h2 id={titleId} className="about__title">
              {t(lang, 'about.title')}
              {lang === 'ko' && (
                <span className="about__title-en" lang="en">
                  {ui.en['about.title']}
                </span>
              )}
            </h2>
          </div>
          <button type="button" className="about__close" onClick={close} aria-label={t(lang, 'about.close')}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M5 5 L15 15 M15 5 L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </header>

        <div className="about__tabs" role="tablist" aria-label={t(lang, 'about.tablistLabel')}>
          {tabs.map((tab, i) => {
            const selected = tab.id === active.id;
            return (
              <button
                type="button"
                key={tab.id}
                id={`${uid}-tab-${tab.id}`}
                className={`about__tab${selected ? ' about__tab--on' : ''}`}
                role="tab"
                aria-selected={selected}
                aria-controls={`${uid}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                onClick={() => setTabId(tab.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
              >
                <span className="about__tab-ko">{t(lang, tab.k)}</span>
                {lang === 'ko' && (
                  <span className="about__tab-en" lang="en">
                    {ui.en[tab.k]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <hr className="rule about__rule" />

        <div className="about__scroller">
          <div
            className="about__body scroll"
            role="tabpanel"
            id={`${uid}-panel-${active.id}`}
            aria-labelledby={`${uid}-tab-${active.id}`}
            tabIndex={0}
            key={active.id}
            data-scrolled="false"
            /* Written straight to the DOM: the top fade is presentation only
               and is not worth a re-render of the panel on every scroll
               frame. */
            onScroll={(e) => {
              const el = e.currentTarget;
              el.dataset.scrolled = el.scrollTop > 4 ? 'true' : 'false';
            }}
          >
            <div className="about__inner">{bodies[active.id]()}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
