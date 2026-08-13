import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from 'react';
import { TEAM_COLOR } from '../data/lineage';
import { tieCounts, tieTypeVisible } from '../data/edges';
import type { Category, EdgeType, SeasonNumber } from '../data/types';
import { CATEGORY_COLOR, EDGE_COLOR } from '../graph/palette';
import {
  CATEGORY_LABEL_I18N,
  EDGE_GLOSS_I18N,
  EDGE_LABEL_I18N,
  LINEAGE_CHIP_I18N,
  LINEAGE_LABEL_I18N,
  personName,
  t,
  ui,
} from '../data/i18n';
import type { Lang, UiKey } from '../data/i18n';
import { useLang } from '../state/useLang';
import { useWatched } from '../state/useWatched';
import {
  ALL_CATEGORIES,
  ALL_EDGE_TYPES,
  ALL_REPRESENTS,
  type AtlasState,
  type RepresentFilter,
} from '../state/useAtlas';
import { PlateMarkSwatch } from './Portrait';
import './FilterRail.css';
import { dataset } from '../data/dataset';

/* The node key's specimen. The rail's key is not about any one person, so it
   needs a stand-in: one archetype hue for the ring row and two seasons for the
   arc row. The hue is `professional` because that is the largest archetype in
   this lineup, and the ten-row Archetype section directly below carries the
   whole ramp as its own swatches — this row only has to say WHERE the hue is
   read, not which hues exist. */
const KEY_HUE = CATEGORY_COLOR.professional;
const KEY_SEASONS: SeasonNumber[] = [1, 2];
const KEY_TICKS = [EDGE_COLOR.alliance, EDGE_COLOR.betrayal, EDGE_COLOR['prior-show']];

/** Every bloc gets a colour; the canonical values live in data/lineage. */
const REPRESENT_COLOR: Record<RepresentFilter, string> = {
  season1: TEAM_COLOR.season1,
  season2: TEAM_COLOR.season2,
  season3: TEAM_COLOR.season3,
  challenger: TEAM_COLOR.challenger,
  rookie: TEAM_COLOR.rookie,
};

/** Fallback for the dashed swatch while no edge of that type exists yet. */
const OUTSIDE_BY_NATURE = new Set<EdgeType>([
  'prior-show',
  'friendship',
  'family',
  'agency',
  'teammate',
  'mentor',
  'collab',
]);

function zeroCategories(): Record<Category, number> {
  const out = {} as Record<Category, number>;
  for (const c of ALL_CATEGORIES) out[c] = 0;
  return out;
}

function zeroEdgeTypes(): Record<EdgeType, number> {
  const out = {} as Record<EdgeType, number>;
  for (const t of ALL_EDGE_TYPES) out[t] = 0;
  return out;
}

/* ── small building blocks ────────────────────────────────────────────── */

/**
 * A heading, and optionally a caption under the group.
 *
 * Both are read from one key twice: `t()` for the line the reader is in, and
 * the English table for the Latin eyebrow that glosses a Korean line. In
 * English the line already is the Latin, so the gloss is dropped rather than
 * printed twice.
 */
function Section(props: {
  lang: Lang;
  titleKey: UiKey;
  footKey?: UiKey;
  index: number;
  action?: ReactNode;
  children: ReactNode;
  /** Rows behind the header, printed on it so a shut section still counts. */
  count?: number;
  /** Undefined = always open, no disclosure control. */
  open?: boolean;
  onToggle?: () => void;
}): JSX.Element {
  const { lang } = props;
  const collapsible = props.open !== undefined;
  const open = props.open !== false;
  const title = (
    <>
      <span className="frail__sec-line">{t(lang, props.titleKey)}</span>
      {lang === 'ko' ? (
        <span className="frail__sec-gloss eyebrow" lang="en">
          {ui.en[props.titleKey]}
        </span>
      ) : null}
      {props.count !== undefined ? <span className="frail__sec-n fig">{props.count}</span> : null}
    </>
  );

  return (
    <section
      /* The title key doubles as this section's identity, so the "still below"
         strip at the foot of the rail can find a heading in the DOM and name
         it from the same string the heading itself is set from. Nothing has to
         be kept in a second list. */
      data-sec={props.titleKey}
      className={`frail__sec${collapsible ? ' frail__sec--fold' : ''}${open ? '' : ' is-shut'}`}
      style={{ '--i': props.index } as CSSProperties}
    >
      <div className="frail__sec-head">
        <h3 className="frail__sec-title">
          {collapsible ? (
            <button type="button" className="frail__sec-btn" aria-expanded={open} onClick={props.onToggle}>
              <svg
                className="frail__sec-chev"
                viewBox="0 0 12 12"
                width="12"
                height="12"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M3.4 4.6 6 7.4 8.6 4.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        {/* All / none for a group you cannot see is a control with no subject. */}
        {open ? props.action : null}
      </div>
      {open ? props.children : null}
      {open && props.footKey ? (
        <p className="frail__sec-foot">
          {t(lang, props.footKey)}
          {lang === 'ko' ? (
            <span className="frail__sec-foot-gloss" lang="en">
              {ui.en[props.footKey]}
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

/** All / none for a filter group. */
function Bulk(props: {
  lang: Lang;
  /** What is being selected — `직업군` / `archetypes`. */
  nounKey: UiKey;
  onAll: () => void;
  onNone: () => void;
  allDisabled: boolean;
  noneDisabled: boolean;
}): JSX.Element {
  const { lang } = props;
  const noun = t(lang, props.nounKey);
  /* Korean puts the object before the verb, English after it. */
  const say = (verb: string) => (lang === 'ko' ? `${noun} ${verb}` : `${verb} ${noun}`);

  return (
    <span className="frail__bulk">
      <button
        type="button"
        className="fmini"
        onClick={props.onAll}
        disabled={props.allDisabled}
        aria-label={say(t(lang, 'rail.bulkAllAria'))}
      >
        {t(lang, 'rail.bulkAll')}
      </button>
      <span className="fmini__sep" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className="fmini"
        onClick={props.onNone}
        disabled={props.noneDisabled}
        aria-label={say(t(lang, 'rail.bulkNoneAria'))}
      >
        {t(lang, 'rail.bulkNone')}
      </button>
    </span>
  );
}

/**
 * The relationship swatch — and, when its row is switched off, the mark that
 * says so.
 *
 * The off-state used to be "drain the hue to --ink-faint", which spends the
 * one channel that tells the rows apart on the one thing that changes. The
 * strike is the second channel: it is drawn in every swatch and revealed by
 * CSS only under `[aria-pressed='false']`, so the hue can stay put. Markup
 * rather than a CSS pseudo-element because a pseudo cannot be a line inside an
 * SVG coordinate space, and the strike has to be measured against the rule it
 * crosses rather than against the button's box.
 */
function EdgeSwatch(props: { dashed: boolean }): JSX.Element {
  return (
    <svg
      className="fedge__swatch"
      viewBox="0 0 22 8"
      width="22"
      height="8"
      aria-hidden="true"
      focusable="false"
    >
      <line
        className="fedge__swatch-rule"
        x1="1"
        y1="4"
        x2="21"
        y2="4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={props.dashed ? '4 3.5' : undefined}
      />
      {/* Overshoots the rule at both ends so it reads as a strike laid across
          the swatch rather than as a shorter second line inside it. */}
      <path
        className="fedge__swatch-off"
        d="M4.4 7.2 17.6 0.8"
        fill="none"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A flag and a sentence — not a translation pair; both languages show both. */
function Quiet(props: { lang: Lang; lineKey: UiKey }): JSX.Element {
  return (
    <p className="frail__quiet">
      <span className="frail__quiet-flag">{t(props.lang, 'rail.emptyFlag')}</span>
      <span className="frail__quiet-line">{t(props.lang, props.lineKey)}</span>
    </p>
  );
}

/* ── the rail ─────────────────────────────────────────────────────────── */

export interface FilterRailProps {
  atlas: AtlasState;
  open: boolean;
  onClose: () => void;
  /**
   * True once the cold open has left the screen.
   *
   * The rail mounts *underneath* the intro overlay, so the `frail-rise`
   * cascade has to be held until the curtain is gone. It used to be derived
   * here from `document.querySelector('.intro')` inside a `useState`
   * initialiser — which runs during the first render pass, before React has
   * committed anything, so `.intro` never existed, `up` started true and the
   * MutationObserver returned immediately. App owns the real flag.
   */
  introDone: boolean;
  /**
   * Opens the field guide, for the node key's "the rest of the marks" line.
   *
   * Optional because App does not hand it down yet: with it the line is a
   * button, without it the same string prints as a note. Naming a destination
   * and not offering it is the failure this panel avoids everywhere else, so
   * this is the half that can ship from here.
   */
  onOpenAbout?: () => void;
}

export function FilterRail({ atlas, open, onClose, introDone, onOpenAbout }: FilterRailProps): JSX.Element {
  const { graph } = atlas;
  /* `!== false` rather than a bare read: an unwired flag must not leave the
     whole panel stuck at opacity 0. */
  const ready = introDone !== false;
  const updated = dataset.meta?.lastUpdated ?? '';
  const { lang } = useLang();
  /* THE HOOK, AND EVERY COUNT BELOW IS HANDED IT BY HAND. This panel prints
     four families of number and two of them are claims about outcomes: the
     per-type relationship tallies and the 인연 tile. `tieCounts`'s default
     parameter reads the module mirror, which carries no subscription — the
     ranking below was the app's last caller still leaning on it, named as such
     in data/edges.ts's own docblock — so a reader who narrowed their answer
     would have kept the wide ranking until something unrelated re-rendered the
     rail. Stale in that direction is a leak, not a lag. */
  const { watched } = useWatched();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  /* The top fade is held flat until the reader has actually scrolled — a
     panel that looks out of focus before it has been touched reads as a paint
     bug, which is exactly what base.css's shared utility gates against. The
     rail was reimplementing the mask with its own ungated 12px top. */
  const [scrolled, setScrolled] = useState(false);

  /* ── what is still below the fold ──────────────────────────────────────
     Folding the three long blocks put every section's heading, count and
     control into the column — but not into the PORT. Measured at 1280×800,
     which is the laptop capture the legend defect was filed against: 1045px
     of column in a 511px port, with the Relationships legend running to 683
     and the Archetype heading sitting at 872. So at rest a laptop reader sees
     four of seven legend rows and no evidence that a whole filter dimension
     exists below them; the only cue is the bottom ramp, and a soft mask reads
     as "end of content", not as "keep going".

     A visible scrollbar was the other candidate and it cannot work here: the
     scroller carries a mask, and a masked box in Chromium paints no
     scrollbar at all — the 10px `scrollbar-gutter` reserve is there and the
     thumb is not, which is exactly what the review measured.

     So the rail states it. The strip names the sections whose HEADINGS are
     below the fold and jumps to them, which makes it a jump nav rather than a
     hint — the same object the dossier pins under its identity header, so a
     reader meets the pattern twice and learns it once. It needs no copy of
     its own: a section's name is its own heading string.

     `FOLD_SLACK` is the bottom ramp. A heading inside the ramp is dissolving,
     not visible, so it counts as below.

     IT MEASURES THE SECTION, NOT ITS HEADING, and that is a correction. The
     test used to be `head.top >= fold`, which reads "is this section's name
     off screen" — so a section whose heading was visible and whose CONTENT was
     sheared did not appear here. Measured at 1600×1000 in Korean that was
     exactly the lineage block: the 출신 heading sat at y=770 against a fold of
     812 and was therefore counted as present, while three of its five chips
     were half-painted or gone and the strip below named the other three
     sections and not this one. A jump nav whose test is the heading cannot see
     the failure it exists to answer. The test is now the section's box. */
  const FOLD_SLACK = 52;
  const [below, setBelow] = useState<UiKey[]>([]);

  const measureFold = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const fold = el.getBoundingClientRect().bottom - FOLD_SLACK;
    const next: UiKey[] = [];
    for (const sec of el.querySelectorAll<HTMLElement>('[data-sec]')) {
      const box = sec.getBoundingClientRect();
      /* `bottom > fold` alone would name a section hanging two pixels into the
         ramp, which is not a reader's problem; `top < fold` keeps a section
         that has scrolled off the TOP out of the list. */
      if (box.bottom > fold + 4) next.push(sec.dataset.sec as UiKey);
    }
    setBelow((prev) =>
      prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next,
    );
  }, []);

  const onBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const next = el.scrollTop > 4;
    setScrolled((prev) => (prev === next ? prev : next));
    measureFold();
  }, [measureFold]);

  /* Korean glues a counter to its unit (20명); English spaces it (20 people).
     English also inflects, so the unit arrives as a singular/plural key pair
     rather than as a finished string — picking between 'person' and 'people'
     here in the component would be hard-coding English morphology into the
     markup. Korean counters do not inflect and both keys hold 명, so the
     n === 1 branch is a no-op on that side. */
  const qty = (n: number, one: UiKey, many: UiKey) => {
    const unit = t(lang, n === 1 ? one : many);
    return lang === 'ko' ? `${n}${unit}` : `${n} ${unit}`;
  };
  /* And Korean names the thing before counting it (연결 5건) where English
     counts before naming it (5 ties). In English the counter already *is* the
     noun, so the Korean-only head noun is dropped rather than said twice. */
  const tally = (noun: string, n: number, one: UiKey, many: UiKey) =>
    lang === 'ko' ? `${noun} ${qty(n, one, many)}` : qty(n, one, many);

  const cast = useMemo(() => {
    const rep: Record<RepresentFilter, number> = {
      season1: 0,
      season2: 0,
      season3: 0,
      challenger: 0,
      rookie: 0,
    };
    const cat = zeroCategories();
    let returning = 0;

    for (const node of graph.nodes) {
      const p = node.person;
      const r = p.x?.team;
      if (r && r in rep) rep[r] += 1;
      cat[p.category] = (cat[p.category] ?? 0) + 1;
      if ((p.priorSeasons?.length ?? 0) > 0) returning += 1;
    }
    return { rep, cat, returning };
  }, [graph]);

  /* ── three tallies over one link list, and they are three because the rows
        of this section do three different jobs ────────────────────────────────
     `present` and `outside` describe THE PICTURE: how many lines of this type
     the canvas draws, and whether every one of them is dashed. Both are
     structure — works.ts leaves `Edge.source`, `target` and `season` off
     `OUTCOME_FIELDS.Edge` on purpose, and `graph/build.ts` draws all 52 lines
     at every watched-set. So both are counted raw, and a row exists exactly
     when the dataset holds a line of that type. Measured: 7 rows at the default
     and 7 at `bgx.watched='[]'`, which is what keeps a colour the reader can
     see on the canvas from losing its key and its filter.

     `count` is THE CLAIM, and it is the one that was leaking. '동맹 14' asserts
     fourteen alliances happened and '배신 5' names five betrayals; `type` is in
     `OUTCOME_FIELDS.Edge` precisely because a betrayal is a verdict about a
     named person, and edges.ts says in as many words that a tally by type
     prints that verdict as a census. Measured at `bgx.watched='[]'` this row of
     numbers was identical to the default — 동맹 14 · 배신 5 · 라이벌 10 · 바깥
     이력 12 · 같은 시즌 7 · 평행 이력 3 · 멘토 1 — while not one alliance and
     not one betrayal was nameable anywhere else in the app, every dossier row,
     hover row and edge card having been filtered out by this same predicate.

     `tieTypeVisible` IS THAT PREDICATE, imported rather than restated: it is
     the second half of `countsAsTie`, and asking it WITHOUT `isMeeting` is
     deliberate and is what Dossier and HoverCard already do here — a parallel
     record is a row of its own in this legend, so it is counted, not dropped.
     A sealed line is counted by nothing, which is edges.ts's rule verbatim. */
  const edges = useMemo(() => {
    const present = zeroEdgeTypes();
    const count = zeroEdgeTypes();
    const outside = zeroEdgeTypes();
    for (const link of graph.links) {
      present[link.type] = (present[link.type] ?? 0) + 1;
      if (link.edge?.season === 0) outside[link.type] = (outside[link.type] ?? 0) + 1;
      if (link.edge && tieTypeVisible(link.edge, watched)) count[link.type] = (count[link.type] ?? 0) + 1;
    }
    return { present, count, outside };
  }, [graph, watched]);

  /* The 인연 tile, and it is the sum of the rows above it rather than a second
     reading of the same list. That invariant is the whole reason this number
     exists at the tile size it does: the tile used to print `graph.links.length`
     and its own comment defended the 47 on the grounds that the legend itemises
     it, which was true at the default and false everywhere else — at
     `bgx.watched='[]'` it printed 52 above a legend that could account for 24 of
     them and a ranking that had already re-ranked. Summing the rows makes the
     two agree by construction at every set: 52 = 14+12+5+10+7+1+3 at the
     default, 24 = 12+1+7+1+3 at the empty set.

     IT IS NOT THE RANKING'S NUMBER AND IS NOT MEANT TO BE. The ranking counts
     verified connections per person, so it drops the three parallel records;
     this counts lines the reader can be told the meaning of. That gap is 3 at
     every set and is the one the legend names on its own row. */
  const visibleLinks = useMemo(
    () => ALL_EDGE_TYPES.reduce((n, type) => n + (edges.count[type] ?? 0), 0),
    [edges],
  );

  /* Most connected: VERIFIED connections, counted with the rule data/edges.ts
     owns rather than straight off the adjacency. The row's own aria-label says
     연결 n건 / 'n ties', which is the sentence a `parallel` edge exists to keep
     nobody from writing — and a ranking is the one place a wrong denominator is
     invisible, because every row is wrong by the same kind of amount. Nobody in
     the current top three carries a parallel record, so this changes no row
     today; it changes what the number MEANS, which is the point. `count > 0`
     then also drops the three who have met nobody, which is the honest answer
     to "most connected" for a person with no connections.

     Ties are marked rather than silently broken. The sort still falls back to
     the printed name in its own collation, but that fallback was deciding the
     answer: Lee Sang-min and Seo Chul-gu are both on 7, so the Korean rail
     printed "3 서출구 7" and the English rail printed "3 Lee Sang-min 7" —
     two readers of the same atlas getting different answers to a question
     presented as a ranked fact, and neither told there was a tie. The rank a
     row carries is now its COUNT's rank, ties share it and are printed with a
     leading '=', and a shared third place shows every row that holds it. The
     tie is a better fact than either ordering: two people on 7, one from the
     panel desk and one from the house. */
  const top = useMemo(() => {
    const rows = graph.nodes
      /* `watched` PASSED, not defaulted. See the hook at the top of this
         component: the default parameter reads a module global React does not
         subscribe to, and this ranking was the last caller in the app still
         taking it. */
      .map((node) => ({ node, count: tieCounts(graph.edgesOf.get(node.id) ?? [], watched).met }))
      .filter((row) => row.count > 0)
      .sort(
        (a, b) =>
          b.count - a.count ||
          personName(a.node.person, lang).primary.localeCompare(
            personName(b.node.person, lang).primary,
            lang,
          ),
      );

    /* Standard competition ranking: 1, 2, =3, =3. Cut after the third
       distinct count, keeping everyone who holds it. */
    const out: { node: (typeof rows)[number]['node']; count: number; rank: number; tied: boolean }[] =
      [];
    let rank = 0;
    let prev = Number.NaN;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].count !== prev) {
        rank += 1;
        prev = rows[i].count;
        if (rank > 3) break;
      }
      out.push({ node: rows[i].node, count: rows[i].count, rank, tied: false });
    }
    for (const row of out) row.tied = out.filter((r) => r.rank === row.rank).length > 1;
    return out;
  }, [graph, lang, watched]);

  const total = graph.nodes.length;
  const shown = atlas.visible.size;
  const topMax = top.length > 0 ? top[0].count : 1;
  const isEmpty = total === 0;

  const catsOn = ALL_CATEGORIES.filter((c) => atlas.categories.has(c)).length;
  /* `t` is the string reader in this file, so edge types are never bound to
     it — a shadowed accessor here would be a very quiet bug. */
  const edgesOn = ALL_EDGE_TYPES.filter((type) => atlas.edgeTypes.has(type)).length;

  /* AtlasState only exposes toggles, so bulk actions are a run of toggles.
     The underlying setters are functional, so the run composes correctly. */
  const setAllCategories = (on: boolean) => {
    for (const c of ALL_CATEGORIES) if (atlas.categories.has(c) !== on) atlas.toggleCategory(c);
  };
  const setAllEdgeTypes = (on: boolean) => {
    for (const type of ALL_EDGE_TYPES)
      if (atlas.edgeTypes.has(type) !== on) atlas.toggleEdgeType(type);
  };
  /* The blocs were the one multi-select group in this rail with no all/none,
     and being five chips rather than a list is not a reason: clearing four of
     five to look at one bloc was four clicks, and the way back was four more.
     `Reset` is not that control — it clears every filter in the panel, so a
     reader who had also switched off two relationship types loses those too. */
  const repsOn = ALL_REPRESENTS.filter((r) => atlas.represents.has(r)).length;
  const setAllRepresents = (on: boolean) => {
    for (const r of ALL_REPRESENTS) if (atlas.represents.has(r) !== on) atlas.toggleRepresent(r);
  };

  /* ── what is behind the fold, and why these three fold ──────────────────
     Measured at 1600×1000: 1856px of content in a 685px port. At rest the
     reader saw Lineage, the franchise switch and four of the seven
     relationship rows; the entire Archetype section — one of the three filter
     dimensions this panel offers — was invisible, and the only cue that it
     existed was a 52px bottom mask that reads as "end of content". At
     1280×800 the port is smaller still and the legend itself is cut.

     A soft mask is not a structure. The three long blocks are disclosures
     now, so every section this rail contains has a heading, a count and a
     control on screen at rest whatever the viewport does.

     Which ones fold, and which do not:
       Lineage / the switch  stay open — five chips and one row.
       Relationships         opens by default, and is now the first block in
                             the column. It is the only always-available key to
                             a five-hue, two-dash edge encoding; the comment on
                             that section records the measurement that moved it
                             there, and shutting it by default would undo the
                             whole point.
       Node key              opens by default, and is four rows.
       Archetype             shut. It filters, it does not explain, and ten
                             rows is the single biggest block in the panel.
       Most connected        shut. A reading of the graph, not a control. */
  const [openRel, setOpenRel] = useState(true);
  const [openKey, setOpenKey] = useState(true);
  const [openCat, setOpenCat] = useState(false);
  const [openTop, setOpenTop] = useState(false);

  /* Three things move a heading across the fold and only one of them is a
     scroll: folding a section, a language swap that re-wraps every gloss, and
     the viewport. The layout effect covers the first two — it runs after the
     commit that changed the height, before paint, so the strip never shows a
     stale section for a frame. The observer covers the third, and fires once
     on observe, which is also the mount measurement. */
  useLayoutEffect(() => {
    measureFold();
  }, [measureFold, openRel, openKey, openCat, openTop, lang, ready, graph]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measureFold);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureFold]);

  /* …and once more when the entrance stops moving things.
     `frail-rise` translates every section 7px and getBoundingClientRect reads
     transforms, so a measurement taken while the cascade is running puts each
     section 7px lower than it will rest. On a heading test that was invisible;
     on the section-box test above it is one false entry — measured at 1440×900
     the relationship block rests 2px ABOVE the fold and was named as below it.
     The animation is the only thing that moves this column without changing
     its size or its scroll offset, so it is the only event the two observers
     do not already cover. */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === 'frail-rise') measureFold();
    };
    el.addEventListener('animationend', onEnd);
    return () => el.removeEventListener('animationend', onEnd);
  }, [measureFold]);

  /* The types the dataset actually holds. Resolved once so the section's
     header count and its row list cannot disagree — a shut section whose
     number does not match what opening it shows is worse than no number.

     KEYED ON `present`, NOT ON `count`, and that distinction is this round's.
     The row is a colour key AND a filter for lines the canvas draws whatever
     the reader has watched, so gating its EXISTENCE on the redacted tally would
     have deleted the 동맹 and 배신 rows at `bgx.watched='[]'` — taking with them
     the only key to two hues that are still on screen and the only control that
     can switch them off. The tally inside the row is redacted; the row is not.
     Consequence, stated because it is the honest one: at a narrow set a row can
     read 0. That is the true count of alliances this reader may be told about,
     and 0 is the under-statement direction. This list is 7 at every set, so the
     rail's legend and the About sheet's colour legend — which is keyed on the
     same raw presence — cannot drift apart either. */
  const liveEdgeTypes = useMemo(
    () => ALL_EDGE_TYPES.filter((type) => (edges.present[type] ?? 0) > 0),
    [edges],
  );

  /* Is anybody on this canvas wearing the sealed band? See the node key below
     for why the row is asked this rather than asked the watched-set. */
  const anySealed = useMemo(() => graph.nodes.some((n) => n.plate.sealed.some(Boolean)), [graph]);

  return (
    <aside
      className={`rail pane frail${ready ? ' is-ready' : ''}${lang === 'en' ? ' latin-run' : ''}`}
      aria-label={t(lang, 'rail.ariaLabel')}
      inert={!open}
    >
      <header className="frail__head" style={{ '--i': 0 } as CSSProperties}>
        <div className="frail__head-row">
          <h2 className="frail__title">
            {t(lang, 'rail.title')}
            {lang === 'ko' ? (
              <span className="frail__title-gloss eyebrow" lang="en">
                {ui.en['rail.title']}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            className="frail__close"
            onClick={onClose}
            aria-label={t(lang, 'rail.close')}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <path
                d="M3.6 3.6 12.4 12.4 M12.4 3.6 3.6 12.4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* `.fig` — the sans with tabular figures. It used to be `tnum` here
            plus a font-family override in the stylesheet, which said the right
            thing in two places instead of one. base.css owns the rule now: a
            figure the reader compares is .fig, an identifier is .mono. */}
        <p className="frail__count" role="status">
          <span className="frail__count-n fig">{shown}</span>
          <span className="frail__count-sep fig" aria-hidden="true">
            /
          </span>
          <span className="frail__count-tot fig">{total}</span>
          <span className="frail__count-lab">
            {t(lang, 'rail.countLabel')}
            {lang === 'ko' ? (
              <span className="frail__count-gloss eyebrow" lang="en">
                {ui.en['rail.countLabel']}
              </span>
            ) : null}
          </span>
        </p>

        <button
          type="button"
          className="frail__reset"
          onClick={atlas.resetFilters}
          disabled={!atlas.filtersActive}
        >
          <span className="frail__reset-dot" aria-hidden="true" />
          {t(lang, 'rail.reset')}
          {lang === 'ko' ? (
            <span className="frail__reset-gloss eyebrow" lang="en">
              {ui.en['rail.reset']}
            </span>
          ) : null}
        </button>

        {isEmpty ? (
          <p className="frail__note">
            <span className="frail__note-flag eyebrow">{t(lang, 'rail.emptyFlag')}</span>
            {t(lang, 'rail.emptyBody')}
          </p>
        ) : null}
      </header>

      <hr className="rule frail__head-rule" />

      {/* `.scroll--tail` adds a block of scrollable whitespace equal to the
          bottom ramp, so the last real line in the column — the scope note —
          can reach full opacity at the end of the scroll instead of ending its
          life inside the fade. */}
      <div
        className="scroll scroll--faded scroll--tail frail__body"
        ref={bodyRef}
        onScroll={onBodyScroll}
        data-scrolled={scrolled ? 'true' : 'false'}
      >
        {/* ── 1. lineage — the five blocs, and the switch that spans them ──
            ONE BLOCK, and that is the fix. The chips and the 프랜차이즈
            경험자만 switch were two sections with a 24px gap between them, and
            the gap is where the bottom ramp came to rest: measured at
            1600×1000 in Korean, 시즌1/시즌2 sat at y 803–835 against a fold of
            812, 시즌3/챌린저 at 843–875 (half-painted), 루키 at 883 (gone) and
            the switch at 998 — 196px below the port. Three of five blocs and
            the whole switch, on the panel that is open 100% of the time, at
            the commonest desktop height. They are one filter dimension — which
            bloc a person walked in from, and whether they have walked in
            before — so they are one section now and the fade cannot land
            between them.

            AND IT LEADS THE COLUMN. Round 7 put the relationship legend first
            on the argument that a key outranks a control, which is true and is
            not what was measured: with the per-row descriptions compacted (see
            .fedge__meaning) the legend's seven rows are 279px rather than 420,
            and BOTH blocks clear the fold. Five blocs is a bounded object —
            five chips and a switch, the same height on every viewport — and a
            list of five cut at two is a false statement about the cast; seven
            rows of one kind of object cut at five is a list the reader can see
            continues. So the bounded thing goes where it cannot be cut and the
            list takes the ramp. Measured after the change at 1600×1000 KO: all
            five chips and the switch fully painted, and all seven legend rows
            still above the fold.

            The section's caption is gone from the page and not from the app.
            'rail.secLineageFoot' — 시즌 1–3 출신 세 팀과 챌린저·루키 두 팀 —
            reads the chip row underneath it out loud, which was worth 47px
            while three of those chips were invisible and is worth nothing now
            that all five are on screen. It rides the group's accessible name
            and its tooltip instead, the same place .fedge__meaning's sentence
            goes when its row has to compress. */}
        <Section
          lang={lang}
          titleKey="rail.secLineage"
          index={1}
          action={
            <Bulk
              lang={lang}
              nounKey="rail.lineageBulkLabel"
              onAll={() => setAllRepresents(true)}
              onNone={() => setAllRepresents(false)}
              allDisabled={repsOn === ALL_REPRESENTS.length}
              noneDisabled={repsOn === 0}
            />
          }
        >
          <div
            className="frail__chips"
            role="group"
            aria-label={`${t(lang, 'rail.lineageGroupAria')} — ${t(lang, 'rail.secLineageFoot')}`}
            title={t(lang, 'rail.secLineageFoot')}
          >
            {ALL_REPRESENTS.map((r, i) => {
              const on = atlas.represents.has(r);
              const tint = REPRESENT_COLOR[r];
              const n = cast.rep[r];
              return (
                <button
                  key={r}
                  type="button"
                  className="fchip"
                  aria-pressed={on}
                  /* The chip is the short form; the spoken name is the full
                     one, because "Season 1" alone does not say what it is. */
                  aria-label={`${LINEAGE_LABEL_I18N[lang][r]} — ${qty(n, 'common.person', 'common.people')}`}
                  onClick={() => atlas.toggleRepresent(r)}
                  style={{ '--i': i, '--tint': tint } as CSSProperties}
                >
                  <span className="fchip__dot" aria-hidden="true" />
                  <span className="fchip__label">{LINEAGE_CHIP_I18N[lang][r]}</span>
                  <span className="fchip__n fig">{n}</span>
                </button>
              );
            })}
          </div>

          {/* Inside the lineage section rather than beside it: "has been in
              this house before" is the union of the three season blocs above,
              so it belongs to the same question and reads as its summary row. */}
          <button
            type="button"
            role="switch"
            aria-checked={atlas.onlyReturning}
            className="fswitch"
            /* Without this the accessible name is the concatenated text
               content — "Been in the house before12" — because the counter is
               a sibling span with no separator. Assembled the same way every
               other count in this file is: Korean glues the counter to its
               unit, English spaces it. */
            aria-label={`${t(lang, 'rail.onlyReturning')} — ${qty(cast.returning, 'common.person', 'common.people')}`}
            onClick={() => atlas.setOnlyReturning(!atlas.onlyReturning)}
          >
            <span className="fswitch__text">
              <span className="fswitch__line">{t(lang, 'rail.onlyReturning')}</span>
              {lang === 'ko' ? (
                <span className="fswitch__gloss" lang="en">
                  {ui.en['rail.onlyReturning']}
                </span>
              ) : null}
            </span>
            <span className="fswitch__n fig" aria-hidden="true">
              {cast.returning}
            </span>
            <span className="fswitch__track" aria-hidden="true">
              <span className="fswitch__thumb" />
            </span>
          </button>
        </Section>

        {/* ── 2. relationships ──────────────────────────────────────────
            The only always-available key to what the coloured, dashed and
            arrowed lines MEAN — solid vs dashed, arrowhead vs none, five hues,
            all load-bearing — so it is the first thing under the filters and
            it opens by default. See the lineage note above for why it is
            second rather than first, and .fedge__meaning in the stylesheet for
            the compression that lets both fit. */}
        <Section
          lang={lang}
          titleKey="rail.secRelationships"
          index={2}
          count={liveEdgeTypes.length}
          open={openRel}
          onToggle={() => setOpenRel((v) => !v)}
          action={
            <Bulk
              lang={lang}
              nounKey="rail.relationshipsBulkLabel"
              onAll={() => setAllEdgeTypes(true)}
              onNone={() => setAllEdgeTypes(false)}
              allDisabled={edgesOn === ALL_EDGE_TYPES.length}
              noneDisabled={edgesOn === 0}
            />
          }
        >
          <div role="group" aria-label={t(lang, 'rail.relationshipsGroupAria')}>
            <ul className="frail__rows">
              {liveEdgeTypes.map((type, i) => {
                const on = atlas.edgeTypes.has(type);
                /* The claim: how many of this type the reader may be told about. */
                const n = edges.count[type] ?? 0;
                // Dashed once every recorded edge of this type happened outside
                // the franchise; before any data lands, fall back to taxonomy.
                /* OFF `present`, NOT `n`. The dash is a description of the lines
                   on the canvas, and `season` is structure — all of them are
                   drawn at every set. Reading it off the redacted tally would
                   have made the swatch describe a subset: at `bgx.watched='[]'`
                   the one visible 라이벌 line is an outside one, so the key would
                   have gone dashed while nine solid rivalry lines sat on the
                   canvas under it. */
                const drawn = edges.present[type] ?? 0;
                const dashed = drawn > 0 ? edges.outside[type] === drawn : OUTSIDE_BY_NATURE.has(type);
                const label = EDGE_LABEL_I18N[lang][type];
                const meaning = EDGE_GLOSS_I18N[lang][type];
                return (
                  <li key={type} style={{ '--i': i } as CSSProperties}>
                    <button
                      type="button"
                      className="frow fedge"
                      aria-pressed={on}
                      /* Below 900px of viewport the description line is not
                         painted (see .fedge__meaning in the stylesheet), so
                         the row carries it here as well — the sentence stays
                         reachable by hover on the viewport where the legend
                         itself had to be compressed to fit. */
                      title={meaning}
                      aria-label={`${label} — ${qty(n, 'common.tie', 'common.ties')}${
                        dashed ? `, ${t(lang, 'rail.outsideTie')}` : ''
                      }. ${meaning}`}
                      onClick={() => atlas.toggleEdgeType(type)}
                      style={{ '--tint': EDGE_COLOR[type] } as CSSProperties}
                    >
                      <EdgeSwatch dashed={dashed} />
                      <span className="fedge__label">
                        <span className="frow__line">{label}</span>
                        {lang === 'ko' ? (
                          <span className="frow__gloss" lang="en">
                            {EDGE_LABEL_I18N.en[type]}
                          </span>
                        ) : null}
                      </span>
                      <span className="frow__n fig">{n}</span>
                      <span className="fedge__meaning">{meaning}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>

        {/* ── 3. the node key ────────────────────────────────────────────
            The rail had a complete key for the EDGE encoding and nothing at
            all for the NODE encoding, which is where most of the density
            lives: disc size, ring hue, outer arcs, brass laurel, beaded host
            arc, dashed newcomer ring, fine grey rim. All of it was explained
            only inside the field guide's second tab of eight. In the first ten
            seconds a newcomer could read the lines and could not read the
            dots — they would see 진형's laurel and 지민's beaded arc, the two
            loudest marks on the canvas, with no way to learn what either meant
            short of opening a modal they had no reason to open.

            Four rows, and deliberately only four. The hover card and the
            dossier header already teach this grammar contextually and in full,
            against the plate of a person who actually carries the mark; this
            is the resting version, and a second full grammar in the rail would
            be a third copy to keep true. The swatches are the same
            `PlateMarkSwatch` those two surfaces draw, so there is one drawing
            of each mark in the codebase. */}
        <Section
          lang={lang}
          titleKey="rail.secNodeKey"
          index={3}
          open={openKey}
          onToggle={() => setOpenKey((v) => !v)}
        >
          <ul className="platekey frail__nodekey">
            <li className="platekey__row">
              <span className="platekey__mark">
                {/* Degree is the one node channel with no single mark to point
                    at — it is the disc itself, so the specimen is two discs. */}
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <circle cx={6.4} cy={10} r={3} fill={KEY_HUE} fillOpacity={0.16} stroke={KEY_HUE} strokeWidth={1.4} />
                  <circle cx={13.4} cy={10} r={5.6} fill={KEY_HUE} fillOpacity={0.16} stroke={KEY_HUE} strokeWidth={1.6} />
                </svg>
              </span>
              <span className="platekey__what">{t(lang, 'rail.nodeSize')}</span>
            </li>
            <li className="platekey__row">
              <span className="platekey__mark">
                <PlateMarkSwatch kind="ring" color={KEY_HUE} seasons={KEY_SEASONS} tickColors={KEY_TICKS} />
              </span>
              <span className="platekey__what">{t(lang, 'rail.nodeRing')}</span>
            </li>
            <li className="platekey__row">
              <span className="platekey__mark">
                <PlateMarkSwatch kind="arcs" color={KEY_HUE} seasons={KEY_SEASONS} tickColors={KEY_TICKS} />
              </span>
              <span className="platekey__what">{t(lang, 'rail.nodeArcs')}</span>
            </li>
            <li className="platekey__row">
              <span className="platekey__mark">
                <PlateMarkSwatch kind="laurel" color={KEY_HUE} seasons={KEY_SEASONS} tickColors={KEY_TICKS} />
              </span>
              <span className="platekey__what">{t(lang, 'rail.nodeHalo')}</span>
            </li>
            {/* THE FIFTH ROW ARRIVES WITH THE MARK IT EXPLAINS, and it is the
                only conditional row in this key. PLAN-spoilers.md §3 requires
                the legend to move in the same commit as the geometry — "or a
                constant-length ring becomes a claim about a finish" — and this
                is the resting copy of it, on the panel that is open 100% of the
                time. It is keyed off the graph rather than off the watched-set
                because the question is "is this mark on screen", not "how much
                has this reader watched": a reader who has seen every season
                seals nothing and is not shown a row for a band no plate is
                wearing. */}
            {anySealed ? (
              <li className="platekey__row">
                <span className="platekey__mark">
                  <PlateMarkSwatch kind="sealed" color={KEY_HUE} seasons={KEY_SEASONS} tickColors={KEY_TICKS} />
                </span>
                <span className="platekey__what">{t(lang, 'rail.nodeSealed')}</span>
              </li>
            ) : null}
          </ul>
          {/* Names the destination AND offers it, when the app has handed one
              down. Prose that names a fix the reader then has to go find is
              the failure this panel already avoids everywhere else. */}
          {onOpenAbout ? (
            <button type="button" className="frail__keymore" onClick={onOpenAbout}>
              {t(lang, 'rail.nodeKeyMore')}
            </button>
          ) : (
            <p className="frail__keymore frail__keymore--static">{t(lang, 'rail.nodeKeyMore')}</p>
          )}
        </Section>

        {/* ── 4. archetype ──────────────────────────────────────────── */}
        <Section
          lang={lang}
          titleKey="rail.secArchetype"
          footKey="rail.secArchetypeFoot"
          index={4}
          count={ALL_CATEGORIES.length}
          open={openCat}
          onToggle={() => setOpenCat((v) => !v)}
          action={
            <Bulk
              lang={lang}
              nounKey="rail.archetypeBulkLabel"
              onAll={() => setAllCategories(true)}
              onNone={() => setAllCategories(false)}
              allDisabled={catsOn === ALL_CATEGORIES.length}
              noneDisabled={catsOn === 0}
            />
          }
        >
          <div role="group" aria-label={t(lang, 'rail.archetypeGroupAria')}>
            <ul className="frail__rows">
              {ALL_CATEGORIES.map((c, i) => {
                const on = atlas.categories.has(c);
                const n = cast.cat[c] ?? 0;
                const label = CATEGORY_LABEL_I18N[lang][c];
                return (
                  <li key={c} style={{ '--i': i } as CSSProperties}>
                    <button
                      type="button"
                      className="frow fcat"
                      aria-pressed={on}
                      aria-label={`${label} — ${qty(n, 'common.person', 'common.people')}`}
                      onClick={() => atlas.toggleCategory(c)}
                      style={{ '--tint': CATEGORY_COLOR[c] } as CSSProperties}
                    >
                      <span className="fcat__dot" aria-hidden="true" />
                      <span className="frow__label">
                        <span className="frow__line">{label}</span>
                        {lang === 'ko' ? (
                          <span className="frow__gloss" lang="en">
                            {CATEGORY_LABEL_I18N.en[c]}
                          </span>
                        ) : null}
                      </span>
                      <span className="frow__n fig">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>

        {/* ── 5. a reading of the graph ─────────────────────────────── */}
        <Section
          lang={lang}
          titleKey="rail.secMostConnected"
          index={5}
          open={openTop}
          onToggle={() => setOpenTop((v) => !v)}
        >
          <div className="frail__stats">
            <div className="fstat">
              <span className="fstat__n fig">{total}</span>
              <span className="fstat__l">
                {t(lang, 'rail.statPeople')}
                {lang === 'ko' ? (
                  <span className="fstat__gloss eyebrow" lang="en">
                    {ui.en['rail.statPeople']}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="fstat">
              {/* THE SUM OF THE LEGEND ABOVE, which is the invariant this tile
                  has always been defended on and did not actually hold. It read
                  `graph.links.length` — the raw edge array — so it printed 52 at
                  every watched-set while the list eight rows above it broke that
                  52 out by type. At the default the two agree and always did; at
                  `bgx.watched='[]'` the legend could account for 24 and the tile
                  still said 52, directly above a ranking that had correctly
                  re-ranked. One header, three answers.

                  Summing the rows removes the possibility rather than fixing an
                  instance: whatever the legend can itemise is what this prints,
                  at every set, by construction. Still not the ranking's number,
                  for the reason that comment always gave — a rank is a claim
                  about a person and drops the three parallel records; this is a
                  claim about the picture and keeps them, under their own name,
                  on their own row. */}
              <span className="fstat__n fig">{visibleLinks}</span>
              <span className="fstat__l">
                {t(lang, 'rail.statLinks')}
                {lang === 'ko' ? (
                  <span className="fstat__gloss eyebrow" lang="en">
                    {ui.en['rail.statLinks']}
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          {top.length === 0 ? (
            <Quiet lang={lang} lineKey="rail.noConnections" />
          ) : (
            <ol className="frail__top">
              {top.map((row) => {
                const name = personName(row.node.person, lang);
                /* A 0..1 factor, not a percentage: the bar is a full-width
                   element scaled on the compositor rather than a width the
                   browser has to relayout on every frame. */
                const pct = Math.max(0.08, Math.round((row.count / topMax) * 100) / 100);
                const selected = atlas.selectedId === row.node.id;
                return (
                  <li key={row.node.id} style={{ '--i': row.rank - 1 } as CSSProperties}>
                    <button
                      type="button"
                      className="ftop"
                      aria-current={selected ? 'true' : undefined}
                      aria-label={`${name.primary} ${name.secondary} — ${tally(
                        t(lang, 'rail.topRowAria'),
                        row.count,
                        'common.tie',
                        'common.ties',
                      )}, ${t(lang, 'rail.topRowAriaTail')}`}
                      onClick={() => atlas.select(row.node.id)}
                      style={
                        { '--tint': row.node.color, '--pct': String(pct) } as CSSProperties
                      }
                    >
                      {/* '=' is a symbol, not a word: it needs no translation
                          and it is the notation a league table already uses. */}
                      <span className="ftop__rank fig" aria-hidden="true">
                        {row.tied ? '=' : ''}
                        {row.rank}
                      </span>
                      {/* Both scripts stay; which one leads is what changes.
                          The trailing one is always the other language, so it
                          carries its own `lang` for the right metrics. */}
                      <span className="ftop__name">
                        <span className="ftop__line">{name.primary}</span>
                        <span className="ftop__sub" lang={lang === 'ko' ? 'en' : 'ko'}>
                          {name.secondary}
                        </span>
                      </span>
                      <span className="ftop__n fig" aria-hidden="true">
                        {row.count}
                      </span>
                      <span className="ftop__bar" aria-hidden="true">
                        <span className="ftop__bar-fill" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="frail__scope">
            {t(lang, 'rail.scopeNote')}
            {lang === 'ko' ? (
              <span className="frail__scope-gloss" lang="en">
                {ui.en['rail.scopeNote']}
              </span>
            ) : null}
          </p>
        </Section>
      </div>

      {/* Outside the scroller on purpose: a "there is more below" affordance
          that lives inside the box it is describing would be sitting in the
          bottom ramp, dissolving, which is the failure it exists to answer.
          It disappears the moment the last heading clears the fold, so on a
          tall viewport it never appears at all. */}
      {below.length > 0 ? (
        <div className="frail__below" style={{ '--i': 7 } as CSSProperties}>
          <span className="frail__below-mark" aria-hidden="true">
            <svg viewBox="0 0 12 12" width="12" height="12" focusable="false">
              <path
                d="M6 2.2v7.2M3.2 6.6 6 9.4l2.8-2.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {below.map((key) => (
            <button
              key={key}
              type="button"
              className="frail__below-b"
              onClick={() => {
                const el = bodyRef.current?.querySelector<HTMLElement>(`[data-sec="${key}"]`);
                /* Asked at the click and not cached: a reader who turns the
                   preference on mid-session gets the answer they just gave. */
                const still =
                  typeof matchMedia !== 'undefined' &&
                  matchMedia('(prefers-reduced-motion: reduce)').matches;
                el?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
              }}
            >
              {t(lang, key)}
            </button>
          ))}
        </div>
      ) : null}

      {/* The dashed-line key. It explains the one edge convention that colour
          cannot carry, so it is a fixed foot row rather than a footnote inside
          a scroll box whose bottom ramp was permanently parked on it. */}
      {/* Moved here from the status bar so the byline there has room — see the
          note at StatusBar's right-hand group. */}
      {updated ? (
        <p className="frail__updated" style={{ '--i': 8 } as CSSProperties}>
          <span className="eyebrow">{t(lang, 'status.updated')}</span>
          <time className="mono tnum" dateTime={updated.replace(/\./g, '-')}>
            {updated}
          </time>
        </p>
      ) : null}
      <p className="frail__foot" style={{ '--i': 7 } as CSSProperties}>
        <span className="frail__foot-swatch">
          <EdgeSwatch dashed />
        </span>
        <span className="frail__foot-text">
          <span>{t(lang, 'rail.secRelationshipsFoot')}</span>
          {lang === 'ko' ? (
            <span className="frail__foot-gloss" lang="en">
              {ui.en['rail.secRelationshipsFoot']}
            </span>
          ) : null}
        </span>
      </p>
    </aside>
  );
}
