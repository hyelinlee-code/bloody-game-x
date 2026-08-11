import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from 'react';
import { lineageOf } from '../data/lineage';
import { isMeeting, tieCounts } from '../data/edges';
import { career, ledgerFor, neverFaced, noComparableResult, type Meeting } from '../data/headToHead';
import { fill } from '../data/i18n/ui';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import type {
  Dataset,
  EdgeType,
  ExternalShow,
  Person,
  PriorElsewhere,
  SeasonMeta,
  SeasonNumber,
  SeasonRun,
} from '../data/types';
import type { GLink, GNode, LayoutMode } from '../graph/types';
import { EDGE_COLOR, SEASON_COLOR } from '../graph/palette';
import {
  CATEGORY_LABEL_I18N,
  EDGE_LABEL_I18N,
  LINEAGE_LABEL_I18N,
  TEAM_LABEL_I18N,
  edgeText,
  personBio,
  personName,
  personNotableFor,
  personOccupation,
  runText,
  t,
  ui,
  type Lang,
  type UiKey,
} from '../data/i18n';
import { useLang } from '../state/useLang';
import { PlateKey, Portrait, type PortraitConnection } from './Portrait';
import './Dossier.css';
import { watched, type Role } from '../data/types';

export interface DossierProps {
  node: GNode | null;
  relations: { link: GLink; other: GNode }[];
  dataset: Dataset;
  onSelect: (id: string) => void;
  onClose: () => void;
  onOrbit: () => void;
  mode: LayoutMode;
  canGoBack: boolean;
  onBack: () => void;
}

/* ── language plumbing ────────────────────────────────────────────────────
   Every string in this panel is either a ui key or a content accessor. The
   taxonomies come from the shared *_I18N maps so the edge vocabulary here is
   the same vocabulary the rail and the legend use. */

/** The script the reader is NOT in — used for glosses and for lang attrs. */
function otherLang(lang: Lang): Lang {
  return lang === 'ko' ? 'en' : 'ko';
}

/**
 * One key, read twice: the line in the reader's language, the gloss in the
 * other. Because both sides come from the same key they can never drift, and
 * the `lang` attribute keeps Hangul on Hangul metrics inside an English panel
 * (and vice versa).
 */
function Gloss({ k, lang, className }: { k: UiKey; lang: Lang; className?: string }): JSX.Element {
  const other = otherLang(lang);
  return (
    <span className={className} lang={other}>
      {ui[other][k]}
    </span>
  );
}

/**
 * "4위" in Korean, "No. 4" in English — the same fact, each language's order.
 *
 * Read straight off the table rather than through `t()`: one side of each of
 * these two keys is deliberately empty, and `t()` treats an empty English
 * string as a missing one and hands back the Korean, which would print "No. 4위".
 */
function rankText(rank: number, lang: Lang): string {
  return `${ui[lang]['dossier.rankPrefix']}${rank}${ui[lang]['dossier.rankSuffix']}`;
}

/**
 * A short data field that may or may not have an authored English sibling.
 * Where it does, use it; where it does not, the Korean stands rather than the
 * row going blank — the same contract the content accessors use.
 */
function pickRun(lang: Lang, ko: string, en: string | undefined): string {
  return lang === 'en' && en && en.trim() ? en : ko;
}

/** Korean counts glue to their counter; English wants the space. */
function gap(lang: Lang): string {
  return lang === 'ko' ? '' : ' ';
}

/**
 * The counter for `n` of something, picked off a singular/plural key pair.
 *
 * Korean counters do not inflect, so both halves hold the same word there and
 * this is a no-op; English is the reason the pair exists at all. Reading the
 * plural key unconditionally is what produced "1 seasons".
 */
function unit(lang: Lang, n: number, one: UiKey, many: UiKey): string {
  return t(lang, n === 1 ? one : many);
}

/** What the SOURCE of a directed edge did. Rendered as words, never as an icon. */
function directionKey(type: EdgeType): UiKey {
  switch (type) {
    case 'betrayal':
      return 'dossier.dirBetrayal';
    case 'rivalry':
      return 'dossier.dirRivalry';
    case 'mentor':
      return 'dossier.dirMentor';
    case 'alliance':
      return 'dossier.dirAlliance';
    default:
      return 'dossier.dirDefault';
  }
}

/* ── motion ───────────────────────────────────────────────────────────────
   Sections rise in sequence so the panel reads top-to-bottom on arrival, and
   the whole panel leaves as one object — an entrance with no exit is the
   loudest craft tell there is. Under prefers-reduced-motion both collapse.

   ── why the cascade is capped ────────────────────────────────────────────
   The previous cut ran `staggerChildren: 0.06` with `delayChildren: 0.06`
   over ~10 direct children at 340ms each. Measured: the last section STARTED
   at ~600ms and finished at ~940ms, so for the first two thirds of a second
   the panel was an identity header floating above 370px of black with the
   footer pinned to the bottom of nothing. That does not read as an entrance,
   it reads as a failed load — and the reader is back on the graph before the
   bio arrives.

   A stagger is only worth paying for on the rows the eye can actually see.
   Four sections fit above the fold, so four get a slot, and everything below
   it gets no delay at all (see SECTION_TAIL): nothing below the fold is being
   watched arrive, and holding it back only extends the window in which the
   panel is half-built. Slots are explicit per child rather than orchestrated
   by `staggerChildren`, because the body commits one frame after the header
   (see `bodyReady`) and an index-derived stagger over a list whose membership
   changes per person is not a schedule anyone can reason about.

   ── why the step is 65ms and not 35 ──────────────────────────────────────
   35ms is one to two frames. Sampled at the time, the four slots reached full
   opacity within 60ms of each other and read as simultaneous, so the whole
   apparatus — four frozen variants, a slot function, the fold reasoning —
   bought nothing the eye could see. A stagger is either perceptible or it is
   dead code. 65ms is ~4 frames between siblings, which is the shortest gap at
   which a sequence reads as a sequence rather than as jitter.

   The duration came down from 260ms to 220ms to pay for it: what makes a
   cascade legible is the gap between starts, not how long each one takes, and
   the measured completion has to stay inside the panel-entrance budget.

   ── why the lead is 90ms ─────────────────────────────────────────────────
   The panel is translucent glass and it used to fade up over the canvas at
   the same rate as its own contents, so mid-fade the reader saw two full
   typographic layers on the same pixels — measured at 269ms after a click,
   the identity chips printed straight through the graph labels beneath them.
   The answer was to fade the SURFACE faster than its contents (90ms against
   285) and let the lead cover the difference. It was not enough: a 90ms fade
   is five frames of budget on a loop that was delivering this interaction
   frames 300–700ms apart, so mid-entrance the panel was still measured at a
   composite 0.17 alpha with ten canvas captions legible through it.

   The surface no longer fades at all — it arrives opaque and slides (see
   `enter` below, and the `dsr-bed` keyframe in Dossier.css that holds the
   background off glass for the length of the move). The lead survives because
   it is worth having on its own terms: it is the beat between the panel
   landing and the panel filling. What it is no longer doing is racing a
   frame budget it could lose.

   Budget: last start 90 + 195 = 285ms, + 220ms duration = 505ms nominal.
   Measured end-to-end on a real click (which pays for input latency and the
   body commit as well) it lands at ~560ms — inside the entrance window, and
   the sequence is now visible. */

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** How long one section takes to rise. */
const SECTION_DUR = 0.22;
/** Gap between consecutive slots — see "why the step is 65ms" above. */
const SECTION_STEP = 0.065;
/** Before the first slot: the surface's own fade, so type never crosses type. */
const SECTION_LEAD = 0.09;
/** Slots, i.e. how many sections are above the fold. Beyond this it is flat. */
const SECTION_SLOTS = 4;

const STACK: Variants = { hidden: {}, show: {} };
const STACK_STILL: Variants = { hidden: {}, show: {} };

/* One frozen variant per slot — built once, so passing `sv(i)` down never
   creates a new object and never restarts an animation on re-render. */
const SECTION_BY_SLOT: Variants[] = Array.from({ length: SECTION_SLOTS }, (_, i) => ({
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: SECTION_DUR, ease: EASE_OUT, delay: SECTION_LEAD + i * SECTION_STEP },
  },
}));
const SECTION_STILL: Variants = { hidden: { opacity: 1 }, show: { opacity: 1 } };

/* Everything past the fold used to share the last slot's 285ms delay. That was
   the right call while all of it mounted in the same commit as the header: the
   delay was what stopped ten sections starting at once. It is the wrong call
   now that the tail mounts on its own commit two frames later, because the two
   waits add up — measured, the last section did not finish until 1.06–1.72s
   after the click, and 285ms of that was a hold on sections nobody can see.

   A stagger is either perceptible or it is dead code, and below the fold it is
   by definition the second. So the tail keeps the fade — a section revealed by
   a scroll should not pop, and on a tall window the first of them can be on
   screen — and drops the wait. */
const SECTION_TAIL: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: SECTION_DUR, ease: EASE_OUT } },
};

/** The variant for the section at position `i`: a slot each above the fold, no
 *  delay at all below it. */
function sectionAt(i: number, reduce: boolean): Variants {
  if (reduce) return SECTION_STILL;
  return i < SECTION_SLOTS ? SECTION_BY_SLOT[i] : SECTION_TAIL;
}

/** Below this the panel is a bottom sheet, so it should arrive and leave on Y. */
function useSheet(): boolean {
  const [sheet, setSheet] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 640px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = (): void => setSheet(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return sheet;
}

/** Typed escape hatch for CSS custom properties in inline styles. */
function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

/** Long URLs are unreadable in a 428px column; keep host + tail. */
function prettyUrl(raw: string): string {
  const bare = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  if (bare.length <= 46) return bare;
  const slash = bare.indexOf('/');
  const host = slash > 0 ? bare.slice(0, slash) : bare.slice(0, 22);
  return `${host}/…${bare.slice(-18)}`;
}

function isLink(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/* ── portrait plumbing ────────────────────────────────────────────────────
   The plate in this panel must be the same object the user clicked in the
   graph, so it is fed from the same record: one season arc per prior season
   sized by how far they got, one rim tick per verified connection. */

/** Best rank per entry of `seasons`, in the same order the plate draws them. */
function ranksFor(node: GNode): (number | undefined)[] {
  return node.seasons.map((s) => {
    let best: number | undefined;
    for (const run of node.person.priorSeasons) {
      if (run.season !== s || run.rank === undefined) continue;
      best = best === undefined ? run.rank : Math.min(best, run.rank);
    }
    return best;
  });
}

/** How many people were in each of those fields, aligned with `ranksFor`.
    The plate scales arc length against the field, and nothing was passing it,
    so every arc in the app was drawn against the 13-seat default — which makes
    a 4th of 10 shorter than a 4th of 13 and a 3rd of 18 the same length as a
    3rd of 13, i.e. exactly the comparison the encoding exists to support. */
function fieldsFor(node: GNode): (number | undefined)[] {
  return node.seasons.map((s) => {
    for (const run of node.person.priorSeasons) {
      if (run.season === s && run.fieldSize) return run.fieldSize;
    }
    return undefined;
  });
}

function connectionsFor(relations: { link: GLink }[]): PortraitConnection[] {
  return relations.map((r) => ({ type: r.link.type, strength: r.link.edge.strength }));
}

/* ── input modality ───────────────────────────────────────────────────────
   The panel moves focus to the person's name every time the selection
   changes, which is right for the keyboard and wrong for the mouse: a 2px
   bone rectangle around a name is read as a validation error, not as a
   caret. `:focus-visible` cannot decide this for us — Chrome's heuristic
   honours whatever modality preceded the programmatic focus, so one keystroke
   anywhere in the session makes every subsequent mouse click draw the ring.
   So we ask the question directly, once, for the whole module. */
let pointerModality = true;

if (typeof window !== 'undefined') {
  const pointer = () => {
    pointerModality = true;
  };
  const keyboard = (e: KeyboardEvent) => {
    /* Modifiers alone are not navigation — holding Shift to trace a path is
       still a mouse gesture. */
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    pointerModality = false;
  };
  window.addEventListener('pointerdown', pointer, { capture: true });
  window.addEventListener('keydown', keyboard, { capture: true });
}

function lastInputWasPointer(): boolean {
  return pointerModality;
}

/* ── small parts ──────────────────────────────────────────────────────────── */

function Tick(): JSX.Element {
  return (
    <svg className="dsr-tick" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false">
      <path
        d="M1 5.2 L3.7 8 L9 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Medal({ rank, lang }: { rank: number; lang: Lang }): JSX.Element {
  return (
    <span className={`dsr-medal${rank === 1 ? ' is-gold' : ''}`}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M8 4.3 L9.1 6.6 L11.6 6.95 L9.8 8.7 L10.2 11.2 L8 10 L5.8 11.2 L6.2 8.7 L4.4 6.95 L6.9 6.6 Z"
          fill="currentColor"
        />
      </svg>
      <span className="mono tnum">{rankText(rank, lang)}</span>
    </span>
  );
}

interface SectionProps {
  /** The heading, as a key: the line and its gloss are the same string table entry. */
  k: UiKey;
  lang: Lang;
  count?: number;
  /** DOM id so the jump nav at the top of the panel can reach it. */
  anchorId?: string;
  variants: Variants;
  children: ReactNode;
}

function Section({ k, lang, count, anchorId, variants, children }: SectionProps): JSX.Element {
  const id = useId();
  return (
    <motion.section className="dsr-sec" id={anchorId} variants={variants} aria-labelledby={id}>
      <div className="dsr-sec__head">
        <h3 className="dsr-sec__ko" id={id}>
          {t(lang, k)}
        </h3>
        <Gloss k={k} lang={lang} className="eyebrow dsr-sec__en" />
        {count !== undefined && <span className="mono tnum dsr-sec__n">{count}</span>}
      </div>
      <hr className="rule" />
      {children}
    </motion.section>
  );
}

/* ── cumulative franchise strip ───────────────────────────────────────────
   Twelve of these twenty have played before, and the single densest fact
   about any of them is the line across seasons: 4th, 13th, then hosting. It
   used to take three scrolls and three plates to assemble. Everything here
   is read straight off priorSeasons — no new data. */

function FranchiseStrip({
  personId,
  runs,
  lang,
}: {
  personId: string;
  runs: SeasonRun[];
  lang: Lang;
}): JSX.Element | null {
  const chrono = useMemo(() => [...runs].sort((a, b) => a.season - b.season), [runs]);
  const best = useMemo(() => {
    let b: number | undefined;
    for (const r of runs) {
      if (r.role !== 'contestant' || r.rank === undefined) continue;
      b = b === undefined ? r.rank : Math.min(b, r.rank);
    }
    return b;
  }, [runs]);
  const played = useMemo(() => new Set(runs.map((r) => r.season)).size, [runs]);

  if (chrono.length === 0) return null;

  return (
    <div className="dsr-frx">
      <span className="eyebrow dsr-frx__key">
        {t(lang, 'dossier.franchiseTotals')}
        <span aria-hidden="true"> · </span>
        <Gloss k="dossier.franchiseTotals" lang={lang} />
      </span>
      <ul className="dsr-frx__list">
        {chrono.map((r, i) => {
          const host = watched(r);
          const result = host
            ? t(lang, roleKey(r.role))
            : r.rank !== undefined
              ? rankText(r.rank, lang)
              : t(lang, 'dossier.onRecord');
          /* The denominator, because this strip builds its own short form out
             of `rank` and therefore drops the one records.ts writes into every
             placement string. 홍진호's two 3rds are 3 of 13 and 3 of 18 — the
             same ordinal, and not the same result. The summary line below is
             left alone: its 최고 is an aggregate of these chips and its
             denominator is already sitting three centimetres to the left. */
          const of = !host && r.rank !== undefined && r.fieldSize
            ? t(lang, 'record.ofField').replace('{n}', String(r.fieldSize))
            : '';
          return (
            <li
              key={`${r.season}-${i}`}
              className={`dsr-frx__i${host ? ' is-host' : ''}${r.rank === 1 ? ' is-gold' : ''}`}
              style={cssVars({ '--c': SEASON_COLOR[r.season] })}
            >
              <span className="dsr-frx__s">
                S<span className="mono tnum">{r.season}</span>
              </span>
              <span className="dsr-frx__r">{result}</span>
              {of && <span className="dsr-frx__of">{of}</span>}
            </li>
          );
        })}
      </ul>
      <span className="dsr-frx__sum">
        {best !== undefined && (
          <>
            {t(lang, 'dossier.best')} <b className="mono tnum">{rankText(best, lang)}</b>
            <span className="dsr-frx__dot" aria-hidden="true">
              ·
            </span>
          </>
        )}
        <span className="mono tnum">{played}</span>
        {gap(lang)}
        {unit(lang, played, 'dossier.seasonPlayed', 'dossier.seasonsPlayed')}
        {/* The one figure that makes two careers comparable, and the strip
            printed everything except it: '최고 3위' is an integer taken from a
            field of 13 one year and 18 the next, so two of them cannot be
            ordered. Players outlasted over players faced, summed across every
            ranked run, can be — and the sentence behind the percentage is the
            title, because 86% on its own does not say what it is a share of. */}
        {career[personId]?.share !== undefined && (
          <>
            <span className="dsr-frx__dot" aria-hidden="true">
              ·
            </span>
            {t(lang, 'career.share')}{' '}
            <b
              className="mono tnum"
              title={fill(t(lang, 'career.outlasted'), {
                n: career[personId].faced,
                k: career[personId].outlasted,
              })}
            >
              {Math.round((career[personId].share ?? 0) * 100)}%
            </b>
            <span className="sr-only">
              {' '}
              {fill(t(lang, 'career.outlasted'), {
                n: career[personId].faced,
                k: career[personId].outlasted,
              })}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

/* ── franchise record plate ───────────────────────────────────────────────── */

interface SeasonPlateProps {
  personId: string;
  run: SeasonRun;
  /** Index in the person's own record, so the English account zips correctly. */
  index: number;
  meta?: SeasonMeta;
  lang: Lang;
}

function SeasonPlate({ personId, run, index, meta, lang }: SeasonPlateProps): JSX.Element {
  const color = SEASON_COLOR[run.season];
  const host = watched(run);
  const text = runText(personId, run, index, lang);
  /* When this run has no English account the accessor hands back the Korean
     rather than a blank — so say so to the font stack instead of pretending. */
  const ko = lang === 'en' && text.arc === run.arc ? 'ko' : undefined;
  return (
    <li className={`dsr-plate${host ? ' dsr-plate--host' : ''}`} style={cssVars({ '--c': color })}>
      <div className="dsr-plate__top">
        <span className="dsr-plate__s">
          {t(lang, 'dossier.seasonPrefix')} {run.season}
          {meta?.year && <span className="mono tnum dsr-plate__yr">{meta.year}</span>}
        </span>
        {run.rank !== undefined && <Medal rank={run.rank} lang={lang} />}
        {host && <span className="dsr-tag dsr-tag--host">{t(lang, roleKey(run.role))}</span>}
      </div>

      <p className="dsr-plate__place" lang={ko}>
        {text.placement}
      </p>

      {(run.team || run.eliminatedEpisode || !host) && (
        <p className="dsr-plate__meta">
          {run.team && (
            <span>
              {t(lang, 'dossier.teamPrefix')} <span>{pickRun(lang, run.team, run.teamEn)}</span>
            </span>
          )}
          {!host && <span>{t(lang, 'dossier.roleContestant')}</span>}
          {run.eliminatedEpisode && (
            <span>{pickRun(lang, run.eliminatedEpisode, run.eliminatedEpisodeEn)}</span>
          )}
        </p>
      )}

      {text.arc && (
        <p className="dsr-plate__arc" lang={ko}>
          {text.arc}
        </p>
      )}

      {text.beats.length > 0 && (
        <ul className="dsr-beats" lang={ko}>
          {text.beats.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── the record elsewhere ─────────────────────────────────────────────────
   Eight of the twenty have never played this franchise, and until this section
   existed their file was a bio, a billing line and a two-row table — the
   franchise-record plate said "first time in the house" and then nothing
   picked the sentence up. `priorElsewhere` is where that record actually
   lives: one authored paragraph per programme, in the same register and at
   the same length as a `SeasonRun.arc`, so a Genius run or a KBL career reads
   with the weight a season run reads with.

   It is bilingual inline rather than through the accessors — the paragraph and
   its translation are authored as one object precisely so they cannot drift —
   so this is the one block in the panel that picks its own language. */

/**
 * A title reduced to the thing two spellings of it have in common: case,
 * spacing, punctuation and any trailing "(season 4)" / "(TVING)" qualifier
 * dropped. Used only to decide whether the short table below is about to
 * reprint a show the section above has already given a paragraph to.
 */
function showKey(title: string): string {
  return title
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

/** Every title carried by a full account, in both spellings. */
function coveredTitles(entries: PriorElsewhere[]): Set<string> {
  const out = new Set<string>();
  for (const e of entries) {
    for (const title of [e.show, e.showKo]) {
      const k = showKey(title);
      if (k) out.add(k);
    }
  }
  return out;
}

interface ElsewherePlateProps {
  e: PriorElsewhere;
  lang: Lang;
  /** True when there is no franchise record above: this plate is the file. */
  lead: boolean;
}

function ElsewherePlate({ e, lang, lead }: ElsewherePlateProps): JSX.Element {
  /* Per-entry sources, folded away, the way the person's own sources are: a
     paragraph this specific has to be able to show its working, but the
     working is not what the reader came for. */
  const [open, setOpen] = useState(false);
  const listId = useId();
  const other = otherLang(lang);

  const primary = lang === 'en' ? e.show : e.showKo;
  const secondary = lang === 'en' ? e.showKo : e.show;
  const result = pickRun(lang, e.result, e.resultEn);
  const arc = pickRun(lang, e.arc, e.arcEn);
  /* Where no English was authored the Korean stands rather than the plate
     going blank — and it is tagged, so it keeps Hangul metrics. */
  const koArc = lang === 'en' && arc === e.arc ? 'ko' : undefined;
  const koRes = lang === 'en' && result === e.result ? 'ko' : undefined;
  const koRun = lang === 'en' ? 'ko' : undefined;
  const sources = e.sources ?? [];

  return (
    <li className={`dsr-plate dsr-plate--else${lead ? ' is-lead' : ''}`}>
      <div className="dsr-plate__top">
        <span className="dsr-plate__s">
          {primary}
          {e.year && <span className="mono tnum dsr-plate__yr">{e.year}</span>}
        </span>
        {secondary && secondary !== primary && (
          <span className="dsr-else__alt" lang={other}>
            {secondary}
          </span>
        )}
      </div>

      {result && (
        <p className="dsr-plate__place" lang={koRes}>
          {result}
        </p>
      )}

      {arc && (
        <p className="dsr-plate__arc" lang={koArc}>
          {arc}
        </p>
      )}

      {sources.length > 0 && (
        <div className="dsr-else__src">
          <button
            type="button"
            className="dsr-else__srcb"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={listId}
          >
            <span>{t(lang, 'dossier.sources')}</span>
            <span className="mono tnum dsr-else__n">{sources.length}</span>
          </button>
          <ul className="dsr-else__list" id={listId} hidden={!open}>
            {sources.map((s, i) => (
              <li key={i}>
                {isLink(s) ? (
                  <a href={s} target="_blank" rel="noreferrer noopener" title={s}>
                    {prettyUrl(s)}
                  </a>
                ) : (
                  <span lang={koRun}>{s}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/* ── elsewhere row ────────────────────────────────────────────────────────── */

function ShowRow({ s, lang }: { s: ExternalShow; lang: Lang }): JSX.Element {
  /* Both titles exist for most rows; the reader's language leads and the other
     one stays as the subtitle, the same way a person's name behaves. */
  const primary = lang === 'en' ? s.show : s.showKo || s.show;
  const secondary = lang === 'en' ? (s.showKo ?? '') : s.showKo ? s.show : '';
  const other = otherLang(lang);
  return (
    <li className="dsr-show">
      <span className="dsr-show__name">
        <span className="dsr-show__ko">{primary}</span>
        {secondary && (
          <span className="dsr-show__en" lang={other}>
            {secondary}
          </span>
        )}
      </span>
      <span className="dsr-show__side">
        {s.year && <span className="mono tnum dsr-show__yr">{s.year}</span>}
        {s.result && (
          <span className="dsr-show__res">{pickRun(lang, s.result, s.resultEn)}</span>
        )}
      </span>
    </li>
  );
}

/* ── the head-to-head ledger ──────────────────────────────────────────────
   'X는 Y에게 몇 승 몇 패인가' is the first question a franchise viewer asks
   about a returning-cast season, and until this block existed the app could
   not answer it although every ingredient was already in the file. Five
   authored duels with printed scorelines — 김경훈 22:0 이상민, 이진형 17:8
   서출구 — and thirty-five derived field finishes were computed in
   headToHead.ts and rendered nowhere; the atlas could tell you 홍진호 has
   eleven ties and not that a node three inches away knocked him out of a
   death match.

   It sits directly under the franchise record because it is the same
   question asked sideways: that section is this person against the field,
   this one is this person against the nineteen people in the house with them.

   NOTHING HERE IS COMPUTED. `ledgerFor` returns the rows already sorted
   most-contested first and already carrying `unadjudicated`; this file only
   chooses words for them. A finishing order computed twice is a finishing
   order that will eventually be computed differently, which is the failure
   records.ts's own header exists to stop.

   CHOOSING THE WORDS IS THE WHOLE JOB, AND IT WAS WRONG. Every row printed
   'faced.beat' — '{w}이/가 {l}을/를 이겼다' — over both kinds, so 35 of the 40
   results asserted a head-to-head that never happened, to the one audience
   that knows it did not. headToHead.ts's own header says in as many words that
   the two kinds "are not interchangeable" and hands `kind` to this file on
   every row; the copy simply never read it. Two things now do: the sentence
   (duel → 이겼다, field → 보다 높이 끝났다) and the aggregate chip. */

interface FacedRowProps {
  /** One opponent's row, straight off `ledgerFor`. */
  row: ReturnType<typeof ledgerFor>[number];
  subjectId: string;
  nameOf: (id: string) => string;
  lang: Lang;
  onSelect: (id: string) => void;
}

/** Where a result happened, plus whatever the source printed to fix it. */
function meetingWhere(m: Meeting, lang: Lang): string {
  return lang === 'en' ? m.whereEn : m.where;
}

function FacedRow({ row, subjectId, nameOf, lang, onSelect }: FacedRowProps): JSX.Element {
  const opponent = nameOf(row.opponentId);
  const subject = nameOf(subjectId);
  const won = row.wins > row.losses;
  const lost = row.losses > row.wins;

  /* The aggregate takes the noun its rows can pay for. '{w}승 {l}패' is a claim
     about matches played, and 58 of the 68 rows in this app hold none — the
     chip beside 서출구 on 홍진호's file read '2승 0패' for two seasons the two
     spent on the same side and never once played. So: 승/패 only when every
     row is a duel, 순위 when none is, 결과 for the four pairs carrying one of
     each, where neither of the other two nouns is true of the whole column. */
  const recordKey: UiKey =
    row.duels === 0
      ? 'faced.recordField'
      : row.duels === row.meetings.length
        ? 'faced.record'
        : 'faced.recordMixed';

  return (
    <li className="dsr-h2h">
      <button type="button" className="dsr-h2h__btn" onClick={() => onSelect(row.opponentId)}>
        <span className="sr-only">{t(lang, 'dossier.openFile')} — </span>
        <span className="dsr-h2h__who">{opponent}</span>
        {/* fill(), not .replace(): the Korean record template is '{w}승 {l}패'
            and the sentence below it carries 이/가 and 을/를 pairs that are
            selected from the preceding name's batchim at render. */}
        <span className={`dsr-h2h__rec mono tnum${won ? ' is-up' : ''}${lost ? ' is-down' : ''}`}>
          {fill(t(lang, recordKey), { w: row.wins, l: row.losses })}
        </span>
      </button>

      <ul className="dsr-h2h__ms">
        {row.meetings.map((m, i) => {
          const duel = m.kind === 'duel';
          const winner = m.winner === subjectId ? subject : opponent;
          const loser = m.loser === subjectId ? subject : opponent;
          const of =
            m.fieldSize !== undefined
              ? t(lang, 'record.ofField').replace('{n}', String(m.fieldSize))
              : '';
          return (
            <li className={`dsr-h2h__m${duel ? ' is-duel' : ''}`} key={`${m.season}-${m.where}-${i}`}>
              <span className="dsr-h2h__kind">{t(lang, duel ? 'faced.duel' : 'faced.field')}</span>
              <span className="dsr-h2h__where">{meetingWhere(m, lang)}</span>
              {m.score && (
                <span className="dsr-h2h__score mono tnum">
                  <span className="sr-only">{t(lang, 'faced.scoreLabel')} </span>
                  {m.score}
                </span>
              )}
              {!duel && m.winnerRank !== undefined && m.loserRank !== undefined && (
                <span className="dsr-h2h__ranks mono tnum">
                  {rankText(m.winnerRank, lang)}
                  <span className="dsr-h2h__dot" aria-hidden="true">
                    ·
                  </span>
                  {rankText(m.loserRank, lang)}
                  {of && <span className="dsr-h2h__of">{of}</span>}
                </span>
              )}
              {/* The sentence is chosen by `kind`, on the same ternary the chip
                  one line up already uses. Printed unguarded, 'faced.beat'
                  asserted 35 head-to-head results that were never played —
                  '홍진호가 최혜선을 이겼다' about the partner he took a 58:12
                  death match WITH — on the app's most fact-table-looking
                  surface. A field row states an order and nothing else, so it
                  gets the sentence that states an order and nothing else. */}
              <span className="dsr-h2h__beat">
                {fill(t(lang, duel ? 'faced.beat' : 'faced.finishedAbove'), { w: winner, l: loser })}
              </span>
            </li>
          );
        })}
      </ul>

      {/* A "1승 0패" printed next to two shared appearances nobody numbered is
          an overclaim, and the ledger already counted them. */}
      {row.unadjudicated > 0 && (
        <p className="dsr-h2h__un">
          {row.unadjudicated === 1
            ? t(lang, 'faced.unadjudicatedOne')
            : fill(t(lang, 'faced.unadjudicated'), { n: row.unadjudicated })}
        </p>
      )}
    </li>
  );
}

/* ── relation row ─────────────────────────────────────────────────────────── */

interface SeasonFinish {
  season: SeasonNumber;
  aRank: number;
  bRank: number;
}

/** Every prior season these two both played, with both ranks known.
 *
 * This used to key off `edge.season` — the single season the tie is filed
 * under — which meant the plate could state at most one comparison per pair
 * and none at all for a tie filed outside the house. Hong Jin-ho and Seo
 * Chul-gu were both contestants in season 2 (3rd / 4th) *and* season 3
 * (3rd / 6th), and the edge's own description says so, but the panel showed
 * only season 2; Hong Jin-ho and Hyun Seong-joo are filed `season: 0` for the
 * poker, so their season-2 meeting — the matchup the description is selling —
 * showed nothing at all. The two people's records already hold the answer, so
 * ask them instead of asking the edge. Newest season first, the same order the
 * franchise strip uses.
 */
function sharedSeasonFinishes(a: Person, b: Person): SeasonFinish[] {
  const ranked = (p: Person) => {
    const m = new Map<SeasonNumber, number>();
    for (const r of p.priorSeasons) {
      if (r.role !== 'contestant' || r.rank === undefined) continue;
      const prev = m.get(r.season);
      m.set(r.season, prev === undefined ? r.rank : Math.min(prev, r.rank));
    }
    return m;
  };
  const ra = ranked(a);
  const rb = ranked(b);
  const out: SeasonFinish[] = [];
  for (const [season, aRank] of ra) {
    const bRank = rb.get(season);
    if (bRank === undefined) continue;
    out.push({ season, aRank, bRank });
  }
  return out.sort((x, y) => y.season - x.season);
}

interface RelRowProps {
  link: GLink;
  other: GNode;
  subject: Person;
  lang: Lang;
  onSelect: (id: string) => void;
}

function RelRow({ link, other, subject, lang, onSelect }: RelRowProps): JSX.Element {
  const e = link.edge;
  const color = EDGE_COLOR[link.type];
  const dashed = e.season === 0;
  const directed = e.directed === true || link.type === 'betrayal';
  /* On a directed edge the source is the actor — so the person whose file we
     are reading is either the one who did it, or the one it was done to. */
  const subjectIsActor = link.source.id === subject.id;
  const unsure = e.confidence !== 'high';
  const finishes = sharedSeasonFinishes(subject, other.person);

  const text = edgeText(e, lang);
  const otherName = personName(other.person, lang);
  const secondary = otherLang(lang);
  const actor = personName(link.source.person, lang).primary;
  const note = t(lang, directionKey(link.type));
  /* Korean names the actor after the role, English before the verb. */
  const dirNote = lang === 'ko' ? `${note}: ${actor}` : `${actor} ${note}`;

  return (
    <li className="dsr-rel" style={cssVars({ '--c': color })}>
      <button type="button" className="dsr-rel__btn" onClick={() => onSelect(other.id)}>
        <span className="sr-only">{t(lang, 'dossier.openFile')} — </span>
        <span className={`dsr-rel__bar${dashed ? ' is-dashed' : ''}`} aria-hidden="true" />

        <span className="dsr-rel__body">
          <span className="dsr-rel__who">
            <span className="dsr-rel__mark">
              <Portrait
                id={other.id}
                initials={lang === 'en' ? other.initialsEn : other.initials}
                category={other.category}
                seasons={other.seasons}
                ranks={ranksFor(other)}
                fieldSizes={fieldsFor(other)}
                isWinner={other.isWinner}
                isHost={other.isHost}
                noTies={other.noTies}
                variant="chip"
                imageUrl={other.person.portraitUrl}
              />
            </span>
            <span className="dsr-rel__names">
              <span className="dsr-rel__ko">{otherName.primary}</span>
              <span className="dsr-rel__en" lang={secondary}>
                {otherName.secondary}
              </span>
            </span>
          </span>

          <span className="dsr-rel__tags">
            <span className="dsr-chip dsr-chip--edge">{EDGE_LABEL_I18N[lang][link.type]}</span>
            <span className="dsr-tag">
              {e.season > 0
                ? `${t(lang, 'dossier.seasonPrefix')} ${e.season}`
                : t(lang, 'dossier.outsideTag')}
            </span>
            {unsure && (
              <span className="dsr-tag dsr-tag--unsure" title={t(lang, 'dossier.unverifiedTie')}>
                {t(lang, 'dossier.unverified')}
              </span>
            )}
          </span>

          {text.label && <span className="dsr-rel__label">{text.label}</span>}

          {finishes.map((finish) => (
            <span className="dsr-rel__h2h" key={finish.season}>
              <span className="eyebrow dsr-rel__h2hk">
                {t(lang, 'dossier.seasonPrefix')} {finish.season} {t(lang, 'dossier.finishSuffix')}
              </span>
              <span className="dsr-rel__h2hv">
                <span className={finish.aRank <= finish.bRank ? 'is-better' : undefined}>
                  {personName(subject, lang).primary}{' '}
                  <span className="mono tnum">{rankText(finish.aRank, lang)}</span>
                </span>
                <span className="dsr-rel__h2hd" aria-hidden="true">
                  ·
                </span>
                <span className={finish.bRank < finish.aRank ? 'is-better' : undefined}>
                  {otherName.primary} <span className="mono tnum">{rankText(finish.bRank, lang)}</span>
                </span>
              </span>
            </span>
          ))}

          {directed && (
            <span className="dsr-rel__dir">
              <span className="dsr-rel__arrow mono" aria-hidden="true">
                <span className={subjectIsActor ? 'is-subject' : undefined}>
                  {personName(link.source.person, lang).primary}
                </span>
                <span className="dsr-rel__ar">→</span>
                <span className={subjectIsActor ? undefined : 'is-subject'}>
                  {personName(link.target.person, lang).primary}
                </span>
              </span>
              <span className="dsr-rel__dirnote">{dirNote}</span>
            </span>
          )}

          {/* An untranslated description is shown in Korean rather than blank,
              and marked as Korean so it is set with Korean metrics. */}
          {text.description && (
            <span className="dsr-rel__desc" lang={lang === 'en' && !text.translated ? 'ko' : undefined}>
              {text.description}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/* ── the panel ────────────────────────────────────────────────────────────── */

interface PanelProps extends Omit<DossierProps, 'node'> {
  node: GNode;
}

function DossierPanel({
  node,
  relations,
  dataset,
  onSelect,
  onClose,
  onOrbit,
  mode,
  canGoBack,
  onBack,
}: PanelProps): JSX.Element {
  const { lang } = useLang();
  const reduce = useReducedMotion() ?? false;
  const sheet = useSheet();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLHeadingElement | null>(null);
  const returnRef = useRef<Element | null>(null);
  const srcId = useId();
  const headId = useId();
  const secId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const personId = node.id;

  /* Where to fade the scroll region. The top edge stays crisp at scrollTop 0 —
     a fade there would look like the header had eaten the first line. */
  const [edge, setEdge] = useState({ top: false, end: false });

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 4;
    const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    setEdge((s) => (s.top === top && s.end === end ? s : { top, end }));
  }, []);

  /* Capture the element that had focus before this panel took it, so Escape
     puts the keyboard back where it was. */
  useEffect(() => {
    returnRef.current = document.activeElement;
    return () => {
      const el = returnRef.current;
      if (el instanceof HTMLElement && el !== document.body && document.contains(el)) {
        el.focus({ preventScroll: true });
      }
    };
  }, []);

  /* A new person is a new document: start at the top, sources folded away, and
     the keyboard on the name — otherwise selecting from the palette opens a
     panel that is 22 tab stops away.

     But the focus has to be *quiet* when the selection was made with a mouse.
     Chrome's :focus-visible heuristic honours the preceding keyboard
     modality, so `:focus:not(:focus-visible){outline:none}` did not save it:
     click a node after any keystroke and a 2px bone rectangle appeared around
     the name — 455px wide in 23-path-trace.png, wrapped around four
     characters. We therefore ask the modality ourselves and mark the heading
     as a quiet focus when the last input was a pointer; the ring returns the
     moment the reader touches a key. */
  const [quietFocus, setQuietFocus] = useState(false);

  /* ── two-commit mount ──────────────────────────────────────────────────
     Measured on a real click: `.dossier` did not exist in the DOM until 440ms
     after the pointerup and did not reach opacity 1 until 680ms, with a 346ms
     main-thread task inside that window. The panel's own entrance is 240ms,
     so two thirds of the perceived latency was React work before any motion
     could start — long enough that a reader clicks again.

     The header is cheap: a crest, a name, an occupation, the franchise strip.
     Everything below it is not — the connections list alone renders a
     Portrait per relation, and there are eleven of them on the hub. So the
     header commits immediately and the body commits on the next frame, which
     puts something on screen inside one frame of the click and moves the
     expensive work off the critical path.

     Two rAFs rather than one: the first fires before the paint that the state
     change scheduled, so flipping the flag there would land the heavy commit
     in the same frame and buy nothing.

     …but the wait is BOUNDED, and that is not a detail. Two rAFs is 33ms on a
     healthy loop and whatever the loop happens to cost otherwise: measured on
     the production build with the canvas repainting under the panel, frames
     ran 197–350ms and the body commit landed 1158ms after the header, which is
     precisely the photographed failure — an identity header floating over 370px
     of black with the footer pinned to the bottom of nothing. A split commit is
     a latency optimisation; it must never become the latency. So the frames
     race a 64ms timer and the first one home wins: at 60fps the rAF pair still
     wins and nothing changes, and when the frame loop is starved the body stops
     waiting on it. */
  const [bodyReady, setBodyReady] = useState(false);

  useEffect(() => {
    setBodyReady(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setBodyReady(true));
    });
    const cap = window.setTimeout(() => setBodyReady(true), 64);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(cap);
    };
  }, [personId]);

  /* ── and a third, for everything past the fold ─────────────────────────
     Two commits were still one commit too few. The second one built the whole
     document — eight sections, 8,975px on 홍진호, eleven relation rows each
     with its own portrait plate — while the panel was mid-slide, and the
     measurement said so: last section at full opacity 1.1–1.7s after the
     click, 8–10 frames over 33ms, one of them 700ms. A 65ms stagger cannot be
     read on frames that far apart, which is the exact condition 35ms was
     rejected for.

     The split follows the fold reasoning the cascade already uses. Slots 0–3
     — identity, jump nav, lineup, bio — are the four sections that animate on
     their own delay; everything past them shares the last slot's flat delay
     because nobody is watching it arrive. So the frame that has to move now
     carries only what is animating on its own clock, and the rest lands one
     frame behind it, off the critical path.

     Same bounded wait as above, and for the same reason: two rAFs when the
     loop is healthy, a 64ms timer when it is not, whichever is first. The one
     cost is that a jump-nav button pressed inside that window has nothing to
     scroll to yet — `goto` no-ops rather than misfiring, and the window is one
     frame after a panel that has only just appeared. */
  const [tailReady, setTailReady] = useState(false);

  useEffect(() => {
    if (!bodyReady) {
      setTailReady(false);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setTailReady(true));
    });
    const cap = window.setTimeout(() => setTailReady(true), 64);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(cap);
    };
  }, [personId, bodyReady]);

  useEffect(() => {
    setSourcesOpen(false);
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    setEdge({ top: false, end: false });
    setQuietFocus(lastInputWasPointer());
    headRef.current?.focus({ preventScroll: true });
  }, [personId]);

  /* `bodyReady` is in the dependency list because it is the whole point.
     Measured on a fresh click before it was: clientHeight 765, scrollHeight
     765, data-atend="true", --scroll-fade-b 8px — the panel latched "nothing
     left to reveal" on the header-only commit, when the scroller genuinely
     did hold nothing else, and no scroll event ever fired to correct it.
     scrollHeight jumped to 8761 one commit later and the 72px ramp the
     comment above spends fifteen lines justifying stayed switched off for
     the entire time the reader had not yet scrolled — i.e. always, on
     arrival. Re-running after the body commits closes it.

     The ResizeObserver closes the same hole for everything that changes the
     document height without a scroll event: the sources list unfolding, a
     late webfont metric, a viewport resize. It fires once on observe, so it
     also covers the body commit on its own — the dependency is belt to its
     braces, and cheap. */
  /* ── one measured pass, once the entrance is over ──────────────────────
     `content-visibility: auto` buys the entrance its frames by not laying out
     the four fifths of this document that are below the fold — and the price
     is that until a section has been rendered once, the browser answers with
     `contain-intrinsic-size` instead of its height. Everything that reads the
     document's geometry then reads an estimate: measured, the jump nav's last
     chip landed its section 191px below the top of the scroller in Korean and
     1,355px below in English, because five estimated sections were replaced by
     real ones while the scroll was running.

     `contain-intrinsic-size: auto <length>` exists for exactly this: once an
     element has been rendered, the remembered size is used instead of the
     guess. So the panel renders itself out once, on a timer, after the
     entrance has finished and while nothing is moving — one layout pass at an
     idle moment instead of eight of them on the frames that had to animate —
     and then goes back to skipping. Every jump after that is exact, and the
     paint saving continues.

     600ms: the cascade's own budget is ~505ms nominal, and this must not land
     inside it. */
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    setPrimed(false);
    if (!tailReady) return;
    let a = 0;
    let b = 0;
    const t = window.setTimeout(() => {
      setPrimed(true);
      a = requestAnimationFrame(() => {
        b = requestAnimationFrame(() => setPrimed(false));
      });
    }, 600);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [personId, tailReady]);

  useEffect(() => {
    onScroll();
    const doc = scrollRef.current?.querySelector('.dsr-doc');
    if (!doc || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(onScroll);
    ro.observe(doc);
    return () => ro.disconnect();
  }, [personId, bodyReady, tailReady, onScroll]);

  const seasonMeta = useMemo(() => {
    const m = new Map<SeasonNumber, SeasonMeta>();
    for (const s of dataset.seasons) m.set(s.season, s);
    return m;
  }, [dataset.seasons]);

  /* Newest season first for the reader, but each run keeps the index it has in
     the person's own record — that index is what the English account is
     keyed on. */
  const runs = useMemo(
    () =>
      node.person.priorSeasons
        .map((run, index) => ({ run, index }))
        .sort((a, b) => b.run.season - a.run.season),
    [node],
  );
  const runList = useMemo(() => runs.map((r) => r.run), [runs]);

  /* Three groups, not two. A `parallel` line is not a meeting — types.ts
     invented the type to say so — and filing it under 하우스 밖 put it in a
     list headed by ties that really happened. It now has its own subhead and
     its own count, and it is out of the headline number below. */
  const groups = useMemo(() => {
    const byStrength = (a: { link: GLink }, b: { link: GLink }) => b.link.edge.strength - a.link.edge.strength;
    const met = relations.filter((r) => isMeeting(r.link.type));
    return {
      inHouse: met.filter((r) => r.link.edge.season > 0).sort(byStrength),
      outside: met.filter((r) => r.link.edge.season === 0).sort(byStrength),
      parallel: relations.filter((r) => !isMeeting(r.link.type)).sort(byStrength),
    };
  }, [relations]);

  /* The headline count. 강지후 read '관계 1' with one line under it saying the
     two have never been in the same room; the tick and the number now count
     meetings, and the parallel record is stated beside it under its own name. */
  const ties = useMemo(() => tieCounts(relations.map((r) => r.link)), [relations]);

  const p = node.person;
  /* Slot 0 is the identity header, 1 the jump nav, 2 the lineup, 3 everything
     from the bio down — the fold sits between the lineup and the bio at every
     desktop height the panel ships at. */
  const sv = (i: number): Variants => sectionAt(i, reduce);
  const stack = reduce ? STACK_STILL : STACK;
  const other = otherLang(lang);
  /* A run of Korean data inside an English panel gets marked; inside the
     Korean panel it is simply the page language and needs no attribute. */
  const koRun = lang === 'en' ? 'ko' : undefined;

  /* Where they came from is answered in exactly one place, app-wide. */
  const lin = lineageOf(p);
  const repColor = lin.color;
  const teamPrimary =
    lang === 'en' ? p.x.teamLabelEn || TEAM_LABEL_I18N.en[lin.team] : p.x.teamLabelKo || TEAM_LABEL_I18N.ko[lin.team];
  const teamSecondary =
    lang === 'en' ? p.x.teamLabelKo || TEAM_LABEL_I18N.ko[lin.team] : p.x.teamLabelEn || TEAM_LABEL_I18N.en[lin.team];

  const name = personName(p, lang);
  const occupation = personOccupation(p, lang);
  const occupationOther = personOccupation(p, other);
  const bio = personBio(p, lang);
  const bioUntranslated = lang === 'en' && bio === p.bio;
  const notable = personNotableFor(p, lang);
  const notableUntranslated = lang === 'en' && notable === p.notableFor;
  const elsewhere = useMemo(() => p.priorElsewhere ?? [], [p.priorElsewhere]);
  /* The short table is a credits list; the section above it is the account.
     Where both are about the same programme the table would print the show
     title a second time, three lines under a paragraph that just spent 120
     words on it, so those rows drop out. A person whose every credit has an
     account — 김유현, 강지후, 신승용 — loses the table entirely, which is the
     right answer: it had nothing left to add. */
  const shows = useMemo(() => {
    const covered = coveredTitles(elsewhere);
    if (covered.size === 0) return p.otherShows ?? [];
    return (p.otherShows ?? []).filter(
      (s) => !covered.has(showKey(s.show)) && !(s.showKo ? covered.has(showKey(s.showKo)) : false),
    );
  }, [elsewhere, p.otherShows]);
  const sources = p.sources ?? [];
  const aka = (p.aka ?? []).filter(Boolean);

  /* ── the ledger ────────────────────────────────────────────────────────
     Three states, and a surface that renders an empty ledger has to be able
     to tell them apart, which is why headToHead exports two lists rather than
     one. `neverFaced` — no shared field with anyone, ever. `noComparableResult`
     — they have met, and nobody numbered either finish (김남희 and 홍진호 were
     two of ten in the same house on 더 타임 호텔; saying they have never faced
     each other would be false). Rows — there is a record to print. */
  const ledger = useMemo(() => ledgerFor(p.id), [p.id]);
  const coldCast = neverFaced.includes(p.id);
  /* The two lists partition everyone whose ledger is empty, and the sentence
     is chosen by testing membership rather than by guessing from the row
     count: 'never been in a field with anyone' is a fact about this person,
     'met, and nobody numbered either finish' is a fact about the sources. If a
     future edit ever leaves someone in neither, this resolves to null and the
     section does not render at all — an empty ledger with no explanation is a
     blank the reader has to interpret, and the wrong explanation is worse.

     The heading stays 기록된 결과 in both cases. The cold FINDING is stated
     once, in the connections section below, where the reader is asking about
     ties; repeating it here gave 강지후 the same headline twice in one
     document. */
  const facedEmptySub: UiKey | null = coldCast
    ? 'faced.none'
    : noComparableResult.includes(p.id)
      ? 'faced.noResult'
      : null;
  const showFaced = ledger.length > 0 || facedEmptySub !== null;
  const nameOf = useMemo(() => {
    const m = new Map(dataset.people.map((q) => [q.id, personName(q, lang).primary]));
    return (id: string): string => m.get(id) ?? id;
  }, [dataset.people, lang]);

  const A = {
    rel: `${secId}-rel`,
    rec: `${secId}-rec`,
    cred: `${secId}-cred`,
    out: `${secId}-out`,
    else: `${secId}-else`,
    faced: `${secId}-faced`,
  };

  /* Connections first: every click on a node is a question about relationships,
     and the answer used to be the last section of a five-screen document.

     Every chip in this row prints its number, including a zero. The row used
     to mix two treatments — `관계 0` beside a `피의 게임 기록` with no number
     at all — and a chip whose number is simply absent is indistinguishable
     from a chip whose number was truncated. The two unconditional sections
     (connections, franchise record) both render an authored empty state, so
     the index has to list them either way; a zero is then the honest count of
     what is behind the chip, and it is the same ledger voice the status bar
     uses for 20/20. Sections that do not render at all stay out of the row —
     that part was already right. */
  const jump: { id: string; label: string; n?: number }[] = [
    /* `ties.met`, not `relations.length`: the chip is the same number the
       gallery calls a verified connection, and a parallel record is not one. */
    { id: A.rel, label: t(lang, 'dossier.connections'), n: ties.met },
    ...(showFaced ? [{ id: A.faced, label: t(lang, 'faced.title'), n: ledger.length }] : []),
    { id: A.rec, label: t(lang, 'dossier.franchiseRecord'), n: runs.length },
    ...(elsewhere.length > 0
      ? [{ id: A.out, label: t(lang, 'dossier.elsewhereRecord'), n: elsewhere.length }]
      : []),
    ...(notable.length > 0 ? [{ id: A.cred, label: t(lang, 'dossier.credentials'), n: notable.length }] : []),
    ...(shows.length > 0 ? [{ id: A.else, label: t(lang, 'dossier.elsewhere'), n: shows.length }] : []),
  ];

  /* ── the jump has to re-aim ────────────────────────────────────────────
     `content-visibility: auto` on .dsr-sec (see Dossier.css) means a section
     the reader has never scrolled to reports `contain-intrinsic-size`, not its
     real height — so the sum of everything above the target is an estimate,
     and one scrollIntoView lands near the heading rather than on it. Measured
     on 홍진호 before this loop: jumping to the last chip left its section 191px
     below the top of the scroller in Korean and 1,355px below in English,
     because five estimated sections were replaced by their real heights while
     the scroll was running.

     So the jump keeps aiming. Each frame the browser has rendered a few more
     of the sections the scroll is passing through, the target's real position
     is known better, and the scroll is re-issued at the corrected offset —
     smooth scrolling re-targets rather than restarting, so this reads as one
     move. It stops as soon as the heading is within a pixel of the top, and it
     is capped at twelve frames so it can never argue with a reader who starts
     scrolling themselves. */
  const goto = (id: string): void => {
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    const scroller = scrollRef.current;
    if (!scroller) return;
    /* Where a jumped-to heading is supposed to come to rest: the container's
       own scroll-padding, read rather than restated — Dossier.css owns that
       number and explains why it is 56 and not 24. */
    const target = document.getElementById(id);
    if (!target) return;
    /* Both halves of the rest position: the container's padding and the
       section's own scroll-margin (--sp-3 on .dsr-sec). Reading them beats
       restating them — and a settle test that knew about only one of the two
       would correct a scroll that had already landed. */
    const pad =
      (parseFloat(getComputedStyle(scroller).scrollPaddingBlockStart) || 0) +
      (parseFloat(getComputedStyle(target).scrollMarginBlockStart) || 0);
    target.scrollIntoView({ behavior, block: 'start' });
    /* The safety net for a jump made before `primed` has measured the document
       (see below): with estimated section heights the offset the smooth scroll
       was aimed at can be wrong by hundreds of pixels, and it is only wrong
       downwards, so the heading ends up above the fold. Correcting DURING the
       smooth scroll does not work — re-issuing scrollIntoView re-targets the
       animation, so it never lands — and the correction is therefore made once
       the scroll has stopped, instantly, up to three times. In the primed case
       the first test passes and none of this runs. */
    let tries = 0;
    const settle = (): void => {
      const el = document.getElementById(id);
      if (!el) return;
      const gap = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (Math.abs(gap - pad) < 2 || ++tries > 3) return;
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      requestAnimationFrame(settle);
    };
    const armed = window.setTimeout(settle, 520);
    scroller.addEventListener(
      'scrollend',
      () => {
        window.clearTimeout(armed);
        settle();
      },
      { once: true },
    );
  };

  /* The panel ARRIVES OPAQUE and only leaves on a fade.
     It used to enter at opacity 0 as well, and the 90ms opacity lead below was
     the compensation: get the glass up fast, then bring the contents in behind
     it, so "nothing of this panel is ever legible over anything of the canvas".
     That reasoning is right and the implementation could not deliver it — 90ms
     is five frames of budget being spent on a loop that was handing this
     interaction frames 300–700ms apart, so the reader got a half-transparent
     panel for a third of a second and ten canvas captions printed through it.
     A surface that is opaque from frame one cannot be crossed at any frame
     rate, which is the same guarantee bought with none of the arithmetic. The
     travel still reads as an entrance; Dossier.css holds the background at
     --bg-panel for the length of the slide so the opacity is real and not just
     a number on a translucent fill. */
  const enter = sheet ? { opacity: 1, y: 26 } : { opacity: 1, x: 28 };
  const leave = sheet ? { opacity: 0, y: 18 } : { opacity: 0, x: 20 };

  return (
    <motion.aside
      className="dossier pane"
      role="complementary"
      aria-labelledby={headId}
      initial={reduce ? false : enter}
      /* The slide keeps its 240ms and the surface has no fade at all — see the
         note on `enter`. SECTION_LEAD still holds the contents back for 90ms
         behind it, which is now a rhythm rather than a race: the panel is
         already opaque, so the lead is buying the reader a beat between the
         surface arriving and the type arriving instead of preventing a
         double-exposure. */
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        transition: reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_OUT },
      }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { ...leave, transition: { duration: 0.16, ease: EASE_OUT } }}
    >
      {/* Controls stay pinned above the scroll so close is never a scroll away. */}
      <div className="dsr-bar">
        {canGoBack ? (
          <button type="button" className="dsr-icon" onClick={onBack} aria-label={t(lang, 'dossier.back')}>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
              <path
                d="M9.6 3.2 L4.8 8 L9.6 12.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="dsr-bar__spacer" aria-hidden="true" />
        )}

        <span className="eyebrow dsr-bar__label">
          {t(lang, 'dossier.barLabel')}
          <span aria-hidden="true"> / </span>
          <Gloss k="dossier.barLabel" lang={lang} />
        </span>

        <button type="button" className="dsr-icon" onClick={onClose} aria-label={t(lang, 'dossier.close')}>
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
            <path
              d="M4 4 L12 12 M12 4 L4 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {name.primary} — {t(lang, 'dossier.opened')} · {t(lang, 'dossier.connections')} {ties.met}
        {ties.parallel > 0 ? ` · ${t(lang, 'tie.parallel')} ${ties.parallel}` : ''}
      </p>

      <div
        className="scroll scroll--faded scroll--footer dsr-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        data-scrolled={edge.top ? 'true' : 'false'}
        data-atend={edge.end ? 'true' : 'false'}
      >
        {/* Keyed on the person so switching subjects replays the cascade. */}
        <motion.div
          key={p.id}
          className={`dsr-doc${primed ? ' is-primed' : ''}`}
          variants={stack}
          initial="hidden"
          animate="show"
        >
          {/* ── A. identity ─────────────────────────────────────────────── */}
          <motion.header className="dsr-id" variants={sv(0)}>
            <div className="dsr-id__crest" style={cssVars({ '--c': node.color })}>
              <Portrait
                id={node.id}
                initials={lang === 'en' ? node.initialsEn : node.initials}
                category={node.category}
                seasons={node.seasons}
                ranks={ranksFor(node)}
                fieldSizes={fieldsFor(node)}
                isWinner={node.isWinner}
                isHost={node.isHost}
                noTies={node.noTies}
                connections={connectionsFor(relations)}
                variant="mark"
                imageUrl={p.portraitUrl}
              />
            </div>

            <div className="dsr-id__text">
              <h2
                className={`dsr-id__ko${quietFocus ? ' is-quiet' : ''}`}
                id={headId}
                ref={headRef}
                tabIndex={-1}
                onKeyDown={() => setQuietFocus(false)}
                onBlur={() => setQuietFocus(false)}
              >
                {name.primary}
              </h2>
              <p className="dsr-id__en" lang={other}>
                {name.secondary}
              </p>

              {(p.realNameKo || aka.length > 0) && (
                <p className="dsr-id__alt">
                  {p.realNameKo && (
                    <span>
                      <span className="dsr-id__altk">{t(lang, 'dossier.realName')}</span>{' '}
                      <span lang={koRun}>{p.realNameKo}</span>
                    </span>
                  )}
                  {aka.length > 0 && (
                    <span>
                      <span className="dsr-id__altk">{t(lang, 'dossier.aka')}</span>{' '}
                      <span lang={koRun}>{aka.join(' · ')}</span>
                    </span>
                  )}
                </p>
              )}
            </div>

            <p className="dsr-id__occ">
              <span className="dsr-id__occk">{occupation}</span>
              {occupationOther && occupationOther !== occupation && (
                <span className="dsr-id__occe" lang={other}>
                  {occupationOther}
                </span>
              )}
              {p.birthYear && (
                <span className="dsr-id__yr">
                  <span className="dsr-id__yrk">{t(lang, 'dossier.birthYear')}</span>
                  <span className="mono tnum">{p.birthYear}</span>
                </span>
              )}
            </p>

            <FranchiseStrip personId={p.id} runs={runList} lang={lang} />

            <p className="dsr-id__chips">
              <span className="dsr-chip dsr-chip--cat" style={cssVars({ '--c': node.color })}>
                {CATEGORY_LABEL_I18N[lang][node.category]}
              </span>
              {node.isWinner && <span className="dsr-chip dsr-chip--brass">{t(lang, 'dossier.pastWinner')}</span>}
              {node.isHost && <span className="dsr-tag dsr-tag--host">{t(lang, 'dossier.hosted')}</span>}
              {p.confidence !== 'high' && (
                <span className="dsr-tag dsr-tag--unsure" title={t(lang, 'dossier.unverifiedProfile')}>
                  {t(lang, 'dossier.unverified')}
                </span>
              )}
            </p>

            {/* What the crest above is saying, in words. The hover card carries
                the same key on the canvas itself, but it is a pointer surface
                and is hidden outright on touch — this is the only route a phone
                reader has to the node grammar short of opening the field guide
                and switching tabs. Named marks only: the ones this person's
                plate actually draws. */}
            <PlateKey
              className="dsr-id__key"
              lang={lang}
              category={node.category}
              seasons={node.seasons}
              isWinner={node.isWinner}
              isHost={node.isHost}
              noTies={node.noTies}
              connections={connectionsFor(relations)}
            />
          </motion.header>

          {/* Everything from here down is the second commit. See the
              two-commit note above `bodyReady`. */}
          {bodyReady ? (
            <>
          {/* ── A2. section index ───────────────────────────────────────── */}
          <motion.nav className="dsr-jump" variants={sv(1)} aria-label={t(lang, 'dossier.sectionsNav')}>
            {jump.map((it) => (
              <button key={it.id} type="button" className="dsr-jump__b" onClick={() => goto(it.id)}>
                <span>{it.label}</span>
                {it.n !== undefined && <span className="mono tnum dsr-jump__n">{it.n}</span>}
              </button>
            ))}
          </motion.nav>

          {/* ── B. X lineup ─────────────────────────────────────────────── */}
          <Section k="dossier.lineupHeading" lang={lang} variants={sv(2)}>
            <div className="dsr-rep" style={cssVars({ '--c': repColor })}>
              <span className="dsr-rep__badge">
                <span className="dsr-rep__ko">{LINEAGE_LABEL_I18N[lang][lin.team]}</span>
                <span className="dsr-rep__en" lang={other}>
                  {LINEAGE_LABEL_I18N[other][lin.team]}
                </span>
              </span>
              {teamPrimary && (
                <span className="dsr-rep__team">
                  <span className="dsr-rep__teamk">{t(lang, 'dossier.team')}</span>
                  <span className="dsr-rep__teamv">
                    {teamPrimary}
                    {teamSecondary && (
                      <span className="dsr-rep__teame" lang={other}>
                        {teamSecondary}
                      </span>
                    )}
                  </span>
                </span>
              )}
            </div>

            {/* The billing line reads as a caption on the casting announcement.
                Where no English was authored the Korean stands, tagged. */}
            {p.x.billing && (
              <blockquote
                className="dsr-quote"
                lang={lang === 'en' && p.x.billingEn ? 'en' : koRun}
              >
                <span className="dsr-quote__mark" aria-hidden="true">
                  “
                </span>
                <p>{lang === 'en' && p.x.billingEn ? p.x.billingEn : p.x.billing}</p>
              </blockquote>
            )}

            <p className="dsr-note">{t(lang, 'dossier.lineupNote')}</p>
          </Section>

          {/* ── C. bio ──────────────────────────────────────────────────── */}
          {bio && (
            <motion.section className="dsr-sec dsr-sec--bio" variants={sv(3)}>
              <p className="dsr-bio" lang={bioUntranslated ? 'ko' : undefined}>
                {bio}
              </p>
            </motion.section>
          )}

          {/* Everything from here down is the THIRD commit — the sections
              below the fold, which share one flat delay and are not being
              watched arrive. See the note above `tailReady`. */}
          {tailReady ? (
            <>
          {/* ── D. credentials ──────────────────────────────────────────── */}
          {notable.length > 0 && (
            <Section k="dossier.credentials" lang={lang} anchorId={A.cred} variants={sv(4)}>
              <ul className="dsr-cred" lang={notableUntranslated ? 'ko' : undefined}>
                {notable.map((n, i) => (
                  <li key={i}>
                    <Tick />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ── E. franchise record ─────────────────────────────────────── */}
          {/* Counted even at zero, so the heading agrees with the jump chip
              that points at it. See the note on `jump`. */}
          <Section k="dossier.franchiseRecord" lang={lang} count={runs.length} anchorId={A.rec} variants={sv(5)}>
            {runs.length > 0 ? (
              <ul className="dsr-plates">
                {runs.map(({ run, index }) => (
                  <SeasonPlate
                    key={`${run.season}-${index}`}
                    personId={p.id}
                    run={run}
                    index={index}
                    meta={seasonMeta.get(run.season)}
                    lang={lang}
                  />
                ))}
              </ul>
            ) : (
              <div className="dsr-empty">
                <span className="dsr-empty__ko">{t(lang, 'dossier.emptyRecord')}</span>
                <Gloss k="dossier.emptyRecord" lang={lang} className="dsr-empty__en" />
                <span className="dsr-empty__sub">{t(lang, 'dossier.emptyRecordSub')}</span>
              </div>
            )}
          </Section>

          {/* ── E2. already crossed paths ───────────────────────────────
              The section above is this person against the field; this one is
              this person beside the other nineteen. See the block comment
              above FacedRow for why it is derived and not written, and why the
              heading takes the weaker of the two claims its rows make. */}
          {showFaced && (
            <Section k="faced.title" lang={lang} count={ledger.length} anchorId={A.faced} variants={sv(6)}>
              {ledger.length > 0 ? (
                <>
                  <ul className="dsr-h2hs">
                    {ledger.map((row) => (
                      <FacedRow
                        key={row.opponentId}
                        row={row}
                        subjectId={p.id}
                        nameOf={nameOf}
                        lang={lang}
                        onSelect={onSelect}
                      />
                    ))}
                  </ul>
                  <p className="dsr-note">{t(lang, 'faced.note')}</p>
                </>
              ) : (
                facedEmptySub && (
                  <div className="dsr-empty">
                    <span className="dsr-empty__ko">{t(lang, 'faced.eyebrow')}</span>
                    <Gloss k="faced.eyebrow" lang={lang} className="dsr-empty__en" />
                    <span className="dsr-empty__sub">{t(lang, facedEmptySub)}</span>
                  </div>
                )
              )}
            </Section>
          )}

          {/* ── F. the record elsewhere ─────────────────────────────────
              Sits directly under the franchise record because it answers the
              same question in the other direction, and because for the eight
              players with no franchise history the section above it is an
              empty state pointing straight down here. */}
          {elsewhere.length > 0 && (
            <Section
              k="dossier.elsewhereRecord"
              lang={lang}
              count={elsewhere.length}
              anchorId={A.out}
              variants={sv(7)}
            >
              <ul className="dsr-plates">
                {elsewhere.map((e, i) => (
                  <ElsewherePlate
                    key={`${e.show}-${i}`}
                    e={e}
                    lang={lang}
                    lead={runs.length === 0}
                  />
                ))}
              </ul>
            </Section>
          )}

          {/* ── G. elsewhere, as a table ────────────────────────────────── */}
          {shows.length > 0 && (
            <Section k="dossier.elsewhere" lang={lang} count={shows.length} anchorId={A.else} variants={sv(8)}>
              <ul className="dsr-shows">
                {shows.map((s, i) => (
                  <ShowRow key={`${s.show}-${i}`} s={s} lang={lang} />
                ))}
              </ul>
            </Section>
          )}

          {/* ── H. connections ──────────────────────────────────────────────
              The heading counts `ties.met`, not `relations.length`. The rim
              tick, the gallery card and this chip are all the same claim —
              '확인된 인연' — and a parallel record is the one edge type the
              schema created so that it could not be counted as one. */}
          <Section k="dossier.connections" lang={lang} count={ties.met} anchorId={A.rel} variants={sv(9)}>
            {/* The cold finding is stated for the three people it is true of
                whether or not a filter has emptied the list — it is a fact
                about them, not about the current view. `node.noTies` is the
                stronger form (no edge at all) and is kept because it is the
                condition the plate's own no-ties mark is drawn from. */}
            {coldCast || node.noTies ? (
              <div className="dsr-empty dsr-empty--cold">
                <span className="dsr-empty__ko">{t(lang, 'dossier.coldTitle')}</span>
                <Gloss k="dossier.coldTitle" lang={lang} className="dsr-empty__en" />
                <span className="dsr-empty__sub">{t(lang, 'dossier.coldSub')}</span>
              </div>
            ) : null}

            {relations.length === 0 && !coldCast && !node.noTies ? (
              <div className="dsr-empty">
                <span className="dsr-empty__ko">{t(lang, 'dossier.emptyTies')}</span>
                <Gloss k="dossier.emptyTies" lang={lang} className="dsr-empty__en" />
                <span className="dsr-empty__sub">{t(lang, 'dossier.emptyTiesSub')}</span>
              </div>
            ) : (
              <>
                {groups.inHouse.length > 0 && (
                  <>
                    <h4 className="dsr-subhead">
                      <span className="dsr-subhead__t">
                        {t(lang, 'dossier.inHouse')}{' '}
                        <Gloss k="dossier.inHouse" lang={lang} className="dsr-subhead__en" />
                      </span>
                      <span className="mono tnum">{groups.inHouse.length}</span>
                    </h4>
                    <ul className="dsr-rels">
                      {groups.inHouse.map(({ link, other: o }) => (
                        <RelRow key={link.id} link={link} other={o} subject={p} lang={lang} onSelect={onSelect} />
                      ))}
                    </ul>
                  </>
                )}

                {groups.outside.length > 0 && (
                  <>
                    <h4 className="dsr-subhead">
                      <span className="dsr-subhead__t">
                        {t(lang, 'dossier.outside')}{' '}
                        <Gloss k="dossier.outside" lang={lang} className="dsr-subhead__en" />
                      </span>
                      <span className="mono tnum">{groups.outside.length}</span>
                    </h4>
                    <ul className="dsr-rels">
                      {groups.outside.map(({ link, other: o }) => (
                        <RelRow key={link.id} link={link} other={o} subject={p} lang={lang} onSelect={onSelect} />
                      ))}
                    </ul>
                  </>
                )}

                {/* Its own group, below both, with its own name and its own
                    sentence. Filed under 하우스 밖 it read as a tie that
                    happened somewhere else; what it actually records is that
                    two records rhyme and the two people never met. */}
                {groups.parallel.length > 0 && (
                  <>
                    <h4 className="dsr-subhead dsr-subhead--par">
                      <span className="dsr-subhead__t">
                        {t(lang, 'tie.parallel')}{' '}
                        <Gloss k="tie.parallel" lang={lang} className="dsr-subhead__en" />
                      </span>
                      <span className="mono tnum">{groups.parallel.length}</span>
                    </h4>
                    <p className="dsr-note dsr-note--par">{t(lang, 'tie.parallelNote')}</p>
                    <ul className="dsr-rels">
                      {groups.parallel.map(({ link, other: o }) => (
                        <RelRow key={link.id} link={link} other={o} subject={p} lang={lang} onSelect={onSelect} />
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </Section>

          <div className="dsr-tail" aria-hidden="true" />
            </>
          ) : null}
            </>
          ) : null}
        </motion.div>
      </div>

      {/* ── I. actions ────────────────────────────────────────────────────── */}
      <footer className="dsr-foot">
        {sources.length > 0 && (
          <div className="dsr-src scroll" id={srcId} hidden={!sourcesOpen}>
            <ul>
              {sources.map((s, i) => (
                <li key={i}>
                  {isLink(s) ? (
                    <a href={s} target="_blank" rel="noreferrer noopener" title={s}>
                      {prettyUrl(s)}
                    </a>
                  ) : (
                    <span lang={koRun}>{s}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="dsr-foot__row">
          <button
            type="button"
            className="dsr-act dsr-act--primary"
            onClick={onOrbit}
            aria-pressed={mode === 'orbit'}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <ellipse cx="8" cy="8" rx="7" ry="3.4" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
              <circle cx="8" cy="8" r="2.4" fill="currentColor" />
            </svg>
            <span className="dsr-act__ko">{t(lang, 'dossier.focusOrbit')}</span>
            <Gloss k="dossier.focusOrbit" lang={lang} className="dsr-act__en" />
          </button>

          {sources.length > 0 && (
            <button
              type="button"
              className="dsr-act dsr-act--ghost"
              onClick={() => setSourcesOpen((v) => !v)}
              aria-expanded={sourcesOpen}
              aria-controls={srcId}
            >
              <span className="dsr-act__ko">{t(lang, 'dossier.sources')}</span>
              <Gloss k="dossier.sources" lang={lang} className="dsr-act__en" />
              <span className="mono tnum dsr-act__n">{sources.length}</span>
            </button>
          )}
        </div>
      </footer>
    </motion.aside>
  );
}

/** The panel leaves the way it arrived. AnimatePresence lives here rather than
    in App so the dossier owns both halves of its own transition. */
/* Which chip a non-playing run wears. `watched()` says only "was there without
   competing", and the two runs it covers are not the same thing: a studio
   panellist never entered the house, a dealer sat at a table players were sent
   to. Printing "Host" over both was a false credit about two named people. */
function roleKey(role: Role): UiKey {
  return role === 'panel' ? 'dossier.rolePanel' : role === 'crew' ? 'dossier.roleCrew' : 'dossier.roleHost';
}

export function Dossier(props: DossierProps): JSX.Element {
  const { node, ...rest } = props;
  return (
    <AnimatePresence initial={false}>
      {node ? <DossierPanel key="dossier" node={node} {...rest} /> : null}
    </AnimatePresence>
  );
}
