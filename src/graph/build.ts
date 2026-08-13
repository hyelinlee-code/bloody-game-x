import type { Dataset, Edge, Person } from '../data/types';
import { dataset } from '../data/dataset';
import { countsAsTie, tieTypeVisible } from '../data/edges';
import type { WatchedSet } from '../data/redact';
import { runFacts } from '../data/i18n';
import { peopleEn } from '../data/i18n/people.en';
import { CATEGORY_COLOR, EDGE_COLOR, INK_LOW } from './palette';
import { markGeneration, markSet, type MarkSet } from './plateGeometry';
import type { GLink, GNode } from './types';
import { currentWatched } from '../state/useWatched';
/* ALIASED, NOT TIDIED. `watched(run)` from data/types answers "was this person
   present that season without competing" — a fact about a RUN. Phase 2's
   `watched` is the reader's set of works. Both belong in this function and the
   parameter would shadow the import, so the older, narrower one takes the
   suffix. Do not rename it back: `p.priorSeasons.some(watched)` inside a
   function whose parameter is a Set is a type error today and a silent wrong
   answer the moment someone makes the types line up. The two files this note
   used to name as waiting — CommandPalette.tsx and HoverCard.tsx — have both
   hit the collision now and both took this same alias, so the convention is
   settled rather than predicted: `watchedRun` is the run predicate, `watched`
   is the reader. */
import { watched as watchedRun } from '../data/types';

/** Compact monogram for the inside of a node — the Hangul form. */
export function monogram(nameKo: string, nameEn: string): string {
  const ko = nameKo.trim();
  const isHangul = /[가-힣]/.test(ko);
  if (isHangul) {
    if (ko.length <= 2) return ko;
    // Korean 3-syllable names: the given name is how people are addressed.
    if (ko.length === 3) return ko.slice(1);
    return ko.slice(0, 2);
  }
  const parts = (nameEn || ko).split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

/**
 * The mark an English reader gets: the ROMANISED GIVEN NAME, hyphen kept.
 *
 * `monogram`'s rule applied to the other alphabet — a Korean name is surname
 * first and the given name is what a person is called — so 진호 and Jin-ho are
 * one mark in two scripts. Reading the atlas in English should not mean reading
 * Hangul off every disc, and this is a product decision, not a typographic one.
 *
 * All twenty given names in this cast are distinct, so the mark identifies a
 * person outright. That is the property Latin INITIALS never had: HaJ / HyJ /
 * HeB, LJ / LS / LT, and five people separated only after a shared leading K.
 *
 * Three objections were raised against this form when it was tried and reverted
 * mid-round. Two are answered in code, and the third is a judgement the reader
 * gets to make:
 *
 *   • "the advances run 0.89em (Bi) to 3.53em (Yeon-cheong), so the wide forms
 *     set at 40% of the narrow ones in the same frame." True, and fatal, and
 *     fixed at the root: `fitMark` now takes a COHORT and every mark in the
 *     frame takes the smallest answer, so all twenty set at one optical size
 *     exactly as the Hangul form does.
 *   • "the first lines collide — Ji/Ji, Jin/Jin, Seong/Seong, Keun/Kyung."
 *     Both lines are always painted; a two-line mark is read as two lines. The
 *     Hangul form has the identical property (지민/지후 share 지) and has never
 *     been called ambiguous for it.
 *   • "it duplicates the label 30px below." It does, and that is the point: at
 *     a glance the disc is what you see, and the label is what you read.
 *
 * `markLines` sets the mark on the hyphen, so "Jin-ho" stacks as Jin over ho
 * and fits the disc at the size the Hangul form does. If a future cast ever
 * collides here, the fix is the surname's initial in front (`K. Ji-hoo`), NOT a
 * return to initialisms.
 */
export function monogramEn(nameKo: string, nameEn: string): string {
  const parts = (nameEn || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join('-');
  if (parts.length === 1) return parts[0];
  return monogram(nameKo, nameEn);
}

/**
 * The whole cast's marks, solved as one set, for the SVG plate.
 *
 * The canvas plate gets its cohort for free — `render.ts` is painting all twenty
 * at once and can hand `markSet` the node list. The SVG plate cannot: it is
 * mounted once per person, at seven call sites, none of which knows about the
 * other nineteen. So for two rounds it re-implemented the fit inline against its
 * own radius, and the cast wall — the one surface that shows all twenty side by
 * side — set 'Bi' at 25.5 CSS px next to 'Yeon/cheong' at 14.6 on discs of
 * identical diameter.
 *
 * The set a mark belongs to is decided by its own script rather than by a prop:
 * every call site already passes a mark in the reader's language, and threading
 * a `lang` through seven of them (and the eighth, which does not exist yet) is
 * exactly the kind of promise `portraitUrl` was centralised to stop making.
 *
 * Memoised per (script, radius) — the three plate variants use two radii — so
 * this is twenty `measureText` calls twice per session, not per render.
 */
/* Keyed by `markGeneration` as well as by script and radius: a set solved before
   the web font resolved was measured against the system fallback, which sets a
   Hangul syllable 38% wide of Pretendard's. See markGeneration. */
const CAST_SETS = new Map<string, MarkSet>();
export function castMarkSet(glyph: string, r: number): MarkSet {
  const script = /[가-힣]/.test(glyph) ? 'ko' : 'en';
  const key = `${script}:${r}:${markGeneration()}`;
  let hit = CAST_SETS.get(key);
  if (!hit) {
    hit = markSet(
      dataset.people.map((p) => ({
        glyph: script === 'ko' ? monogram(p.nameKo, p.nameEn) : monogramEn(p.nameKo, p.nameEn),
        r,
      })),
    );
    CAST_SETS.set(key, hit);
  }
  return hit;
}

/** Deterministic pseudo-random in [0,1) from a string. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/* ── WHAT A SEALED TIE LOOKS LIKE, AND WHY IT IS STILL DRAWN ─────────────────
 *
 * Two honest answers were on the table: don't draw the line at all, or draw it
 * in a neutral ink with no arrowhead. This file draws it, and the decision is
 * not this painter's to make — works.ts already made it. `OUTCOME_FIELDS.Edge`
 * says, in the comment beside the manifest entry:
 *
 *     "A line between two people is structure. `betrayal` is a verdict and
 *      `directed` is a verdict with a direction — both degrade to a NEUTRAL
 *      TIE, which is why the type itself is listed and source/target/season
 *      are not."
 *
 * So `type` and `directed` are sealed and the pair, the season and the fact of
 * a connection are not. Dropping the line would seal `source` and `target`,
 * which the manifest deliberately declines to list, and would be this file's
 * second private answer to a question the data layer has already answered —
 * exactly the class of defect the round that wrote this comment was cleaning
 * up. Three further consequences, all measured, all of them the same way:
 *
 *   · THE ARRANGEMENT WOULD BECOME A FUNCTION OF THE READER. `forceLink` is
 *     given `links`; its distance is `edge.season` and `edge.strength`, both
 *     structure. Keeping all 52 keeps the mesh's shape identical across
 *     watched-sets. Dropping 28 of them at the empty set re-solves the whole
 *     layout, and a layout that re-clusters when the reader narrows their set
 *     is itself a statement about who is connected to whom.
 *   · THE SURVIVORS WOULD MOVE TOO. `pairCount` fans siblings between one pair
 *     out by ARRIVAL INDEX (0, +1, −1, +2 …). Remove a sealed sibling and the
 *     visible one beside it takes a different curve — a watched-set-dependent
 *     change to a line the reader is allowed to see in full.
 *   · THE COLD BAND WOULD START LYING. `noTies` is read off `degree`, so
 *     somebody whose every tie is sealed is already seated under 확인된 인연
 *     없음. With the lines gone the canvas would assert there is no record;
 *     with them drawn and clipped at the rail (render.ts, THE TERMINATOR'S
 *     ADDRESS) it says the true thing — there is a record here and you have
 *     not unlocked it.
 *
 * WHAT THE NEUTRAL IS. `INK_LOW`, which is not a relationship hue at all: it
 * belongs to the canvas's STRUCTURE ink ramp, the register palette.ts reserves
 * for hairlines and rings — which is precisely the claim, that this line is
 * structure with the verdict withheld. Measured in CIELAB against the twelve
 * relationship hues it is ΔE 12.2 from its nearest (`collab`) and 15.0 from
 * `co-season`, i.e. under the 25.4 that ramp holds between two hues that mean
 * different things. No achromatic value can do better: `co-season` sits at
 * L* 40.5 and `collab` at L* 65.7, so a grey between them is ~12 from both and
 * a grey outside them is ~11 from one. Hue alone therefore does not carry it,
 * and it is not asked to — the same answer palette.ts reached for `parallel`.
 * Two more channels do: a sealed line never takes an arrowhead (below), and it
 * wears a fine dot rhythm nothing else on this canvas uses (render.ts,
 * SEALED_DASH). What is left unbuilt is the legend entry, which lives in a file
 * this change does not own; see the handoff.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * The ink a tie wears when the reader may not be told what kind of tie it is.
 *
 * It belongs in palette.ts beside the four channels it is a fifth member of,
 * and it is here because that file has a different owner this round. Move it
 * when the two can be edited together; nothing but the import site changes.
 */
export const SEALED_LINK_INK = INK_LOW;

export interface BuiltGraph {
  nodes: GNode[];
  links: GLink[];
  byId: Map<string, GNode>;
  /** id → connected ids */
  adjacency: Map<string, Set<string>>;
  /** id → the edges touching it */
  edgesOf: Map<string, GLink[]>;
}

/* ── `countsAsTie` NOW LIVES IN data/edges.ts, AND THAT IS THE POINT ─────────
 *
 * This file held a private copy: `isMeeting(e.type) && isVisible(e.scopes?.type
 * ?? e.scope, watched)`, under thirty lines of docblock arguing that six
 * surfaces have to agree about the rule. The argument was right and the copy
 * was the thing it argued against — the rule was authored twice, in a painter
 * and beside the data, and `tieCounts` was gated in only one of them, so at
 * `bgx.watched='[]'` a dossier's headline and the canvas behind it printed
 * different totals off one dataset.
 *
 * So the predicate is imported now, from beside `isMeeting` and the edge
 * vocabulary it is a fact about. Nothing in the two loops below changed: the
 * body is identical, the resolution `scopes.type ?? scope` is identical, and
 * fail-closed still costs what data/edges.ts says it costs. What changed is
 * that `degree`, the rim ticks, the dossier's headline and the cast wall now
 * agree BY CONSTRUCTION instead of by two authors keeping two functions in
 * step. Do not restore a local copy; if the graph ever needs a different
 * question, give it a different name and say why.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * `watched` DEFAULTS, so no call site breaks this phase.
 *
 * `currentWatched()` is the module-level mirror, and its one sanctioned
 * position is exactly this: a default-parameter slot in a module with no JSX.
 * Read the note on it in state/useWatched.ts before copying this line anywhere
 * else — the graph is rebuilt from `useAtlas`'s `useMemo`, so when Phase 4
 * mounts the provider, THAT call site has to start passing `useWatched().watched`
 * and adding it to the memo's dependency list. Until it does, the default is
 * `WATCHED_ALL` and every count below is the count this app has always printed.
 */
export function buildGraph(data: Dataset, watched: WatchedSet = currentWatched()): BuiltGraph {
  /* `degree` COUNTS MEETINGS. It is the root: the canvas's accessible node
     list reads it out as 관계 n개, `noTies` is decided from it, and every
     count downstream descends from the same adjacency. A `parallel` edge is
     the type the schema invented for the opposite claim — "demonstrably never
     shared a room" — and while it was counted here 강지후, 신승용 and 최연청
     each read as having one verified connection under a legend calling every
     one of them verified, and `noTies` was never true for anybody, so the
     canvas's cold band and dossier.coldTitle could not fire for the three
     people they were written for.

     The rule is `isMeeting`, imported from data/edges.ts rather than restated:
     six surfaces have to agree about it, and a seventh copy of
     `new Set(['parallel'])` is the drift this codebase's comments argue
     against everywhere.

     The parallel remainder is not tallied here because nothing on a GNode
     draws it — the plate has no mark for a non-meeting, and the surfaces that
     print the number call `tieCounts` on their own link list, which is this
     same rule applied to these same edges. See the round-9 handoff for the one
     place that could still use it: the canvas's sr-only list, which lives in a
     file this change does not own. */
  const degree = new Map<string, number>();
  const strengthSum = new Map<string, number>();
  for (const e of data.edges) {
    /* Strength is weighted connectedness and feeds `weight`, hence the disc's
       radius — and the rail's node key says in as many words that size is the
       connection count. A non-meeting is not connectedness, so it is not
       summed either. It costs the three cold plates 1 point of a 44-point
       maximum, i.e. 0.28px of radius, and makes the legend's claim true.

       A tie this reader may not be told about is not connectedness they can
       see, so it is not summed either — same gate, same line, because degree
       and strength must never disagree about which edges exist.

       NOTHING BELOW THIS LOOP CHANGED. `maxStrength`, `conn`, `history`,
       `weight` and `radius: 24 + weight * 20` are the same expressions with a
       shorter list feeding them, which is the whole of the brief: subtract
       edges, do not re-tune the map from edges to size. Note the one honest
       consequence, since it is a property of the existing arithmetic rather
       than of this line: `maxStrength` is a max over the survivors, so it
       renormalises. Hiding the busiest person's ties does not shrink everyone
       — it promotes whoever is busiest among what is left. That is the same
       relative reading the graph has always given, applied to a smaller set,
       and re-tuning it would be exactly the change this file may not make. */
    if (!countsAsTie(e, watched)) continue;
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    strengthSum.set(e.source, (strengthSum.get(e.source) ?? 0) + e.strength);
    strengthSum.set(e.target, (strengthSum.get(e.target) ?? 0) + e.strength);
  }
  const maxStrength = Math.max(1, ...strengthSum.values());

  const nodes: GNode[] = data.people.map((p, i) => {
    const isWinner = wonASeason(p, watched);
    const isHost = p.priorSeasons.some(watchedRun);
    const seasons = [...new Set(p.priorSeasons.map((s) => s.season))].sort();

    /* Importance blends how connected they are with how much franchise
       history they carry. Both matter; neither should dominate.

       THE ARITHMETIC IS UNTOUCHED AND `isWinner` IS NOT. Read the two terms:
       `seasons.length` is participation, which the plan keeps at every
       watched-set — the plain fact that somebody was in a season is structure
       — and `isWinner` is a verdict, which is why the flag above is now a
       function of the reader. The 0.45 is 62% of the whole history term, so
       until this round the graph STATED THE VERDICT IN GEOMETRY: at the empty
       set, 윤비 and 이진형 have one season each and not one visible tie between
       them, and the discs came out at r=26.09 and r=29.51. Same inputs, +13.1%
       radius, and the entire difference was who won season 2. No text gating
       reaches a radius; the number simply had to stop being computed off a raw
       rank.

       What that costs, and it is the honest cost: at the empty set the two
       champions lose 0.45 of history and shrink by up to 3.42 world units, so
       the cast reads flatter. That IS the redacted reading — a reader who has
       watched nothing is looking at twenty people they know nothing about — and
       the alternative is a graph that whispers the ending through size. */
    const conn = (strengthSum.get(p.id) ?? 0) / maxStrength;
    const history = Math.min(1, seasons.length / 2) * 0.55 + (isWinner ? 0.45 : 0);
    const weight = Math.min(1, conn * 0.62 + history * 0.38);

    // Seed on a golden-angle spiral: no two runs start from a different shape,
    // and the initial state already looks intentional.
    const a = i * 2.399963;
    const r = 26 * Math.sqrt(i + 1) + hash01(p.id) * 18;

    return {
      id: p.id,
      person: p,
      label: p.nameKo,
      labelEn: p.nameEn,
      sublabel: p.occupationKo || p.occupation,
      sublabelEn: peopleEn[p.id]?.occupation || p.occupation,
      initials: monogram(p.nameKo, p.nameEn),
      /* One mark, one alphabet, both languages — see `monogramEn`. The full
         "Kang Ji-hoo" is separately painted as the node's label directly
         beneath the disc, in whichever language is on, so nothing about a
         person is unreachable to an English reader. */
      initialsEn: monogramEn(p.nameKo, p.nameEn),
      category: p.category,
      color: CATEGORY_COLOR[p.category] ?? CATEGORY_COLOR.other,
      isWinner,
      isHost,
      seasons,
      weight,
      /* The disc is a PLATE now, not a dot, and the plate reaches out to ~1.5×
         this (1.83× with a laurel) for the season arcs, the host hairline and
         the rim ticks. At 15–30 the whole assembly landed inside ~24 screen px
         at fit zoom: the arcs were sub-pixel, the ticks were dust, and the mark
         inside set at about six points. There was nothing to look at.
         The camera fits a bounding box that these barely move, so a larger
         radius is very nearly a straight gain in on-screen size rather than
         something the fit takes back. */
      radius: 24 + weight * 20,
      /* Meetings THIS READER MAY BE TOLD ABOUT. Read `degree` as "verified
         connections you can see from where you are" everywhere it is consumed
         — at the default watched-set that is every verified connection, which
         is the number this app has always printed. */
      degree: degree.get(p.id) ?? 0,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      anchorW: 1,
      /* "Walks in cold" — no VERIFIED connection to anyone in the cast, which
         is a different question from "carries no line". The three who carry
         only a parallel record are exactly the three `neverFaced` names in
         headToHead.ts, computed there off the same predicate, so the plate's
         dashed rim, the canvas's cold band and the dossier's cold notice all
         fire for the same people for the same reason. Written once, from
         `degree`, so the two cannot disagree.

         IT IS NOW A FUNCTION OF THE READER as well as of the data, and that is
         the state a narrow watched-set is supposed to produce: someone whose
         every tie is sealed walks in cold, which is the honest description of
         what that reader can see, and the canvas already has a band for it.
         `neverFaced` in headToHead.ts is p2:ledger's file and gains the same
         parameter; the two agree only for as long as they are asked the same
         question with the same set, which the shared `isMeeting` + scope rule
         is what makes possible. */
      noTies: (degree.get(p.id) ?? 0) === 0,
      /* Seasons and finishes are known now; the tie arrays need the links, so
         they are filled in below once `edgesOf` exists. */
      plate: {
        seasons,
        /* The painter's copy of the finish, and the reason `bestRank` and
           `fieldOf` grew a parameter: an arc's SWEEP is `rank / fieldSize`
           drawn to scale, which is exactly invertible, so a plate handed a raw
           rank prints the placing whatever the text around it says. At the
           empty set this was still holding 이태균 `ranks: [1]`.

           A withheld rank arrives here as `undefined`, and `undefined` used to
           be the whole answer — so the plate drew the beaded ring, whose
           meaning is "present, not competing". That was not saying less than
           the truth, which the earlier note here claimed; it was saying
           something false about a named person, and at the empty set it said it
           about a season champion. `sealed` below is the third state, and the
           painters read it BEFORE they read a rank. */
        ranks: seasons.map((s) => bestRank(p, s, watched)),
        fieldSizes: seasons.map((s) => fieldOf(p, s, watched)),
        sealed: seasons.map((s) => sealedRun(p, s, watched)),
        ties: [],
        tieTypes: [],
        isHost,
        isWinner,
        noTies: (degree.get(p.id) ?? 0) === 0,
      },
      focus: 0,
      dim: 0,
      appear: 0,
      pulse: 0,
    };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Fan out parallel edges between the same pair so none are hidden.
  const pairCount = new Map<string, number>();
  const links: GLink[] = [];

  for (const e of data.edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t || s === t) continue;

    const key = [e.source, e.target].sort().join('|');
    const n = pairCount.get(key) ?? 0;
    pairCount.set(key, n + 1);
    // 0, +1, -1, +2, -2 …
    const step = Math.ceil(n / 2) * (n % 2 === 0 ? 1 : -1);
    const curve = n === 0 ? 0.14 : step * 0.42;

    /* MAY THIS READER BE TOLD WHAT KIND OF TIE THIS IS?
     *
     * `tieTypeVisible`, imported from beside the edge vocabulary — and
     * deliberately NOT `countsAsTie`, which is the predicate two paragraphs
     * down and answers a different question. A `parallel` edge whose scope is
     * satisfied is a tie this reader may be told all about; it simply is not a
     * MEETING, so it keeps its petrol hue, its long-dash/dot rhythm and its
     * cold-band terminator while staying out of `degree`. Measured on today's
     * corpus: 0 of 52 edges are sealed at the default set and 28 of 52 at the
     * empty one (14 alliance, 5 betrayal, 9 rivalry), of which 6 carry
     * `directed`. */
    const tellable = tieTypeVisible(e, watched);

    links.push({
      id: e.id,
      edge: e,
      source: s,
      target: t,
      /* `type` STAYS TRUE. It is the record's own field and half a dozen
         surfaces gate it themselves with their own `pick` — Dossier's relation
         row, EdgeCard, the hover card. Overwriting it here would seal the same
         claim twice in one file and break the callers that seal it correctly.
         What is gated is the PAINT: the two fields below, the dash in
         render.ts, and the type filter in GraphCanvas. */
      type: e.type,
      color: tellable ? EDGE_COLOR[e.type] ?? EDGE_COLOR.collab : SEALED_LINK_INK,
      curve,
      /* Strength is structure — works.ts lists it among the fields that are
         always shown — so a sealed line keeps its weight. It is also what
         `forceLink` reads, which is half of why the layout does not move. */
      width: 0.9 + e.strength * 0.52,
      // Dashed = history from outside the Bloody Game house. `season` is
      // structure too, so this rhythm survives sealing (and is overridden by
      // SEALED_DASH when it fires — see render.ts).
      dashed: e.season === 0,
      /* AN ARROWHEAD IS A VERDICT WITH A DIRECTION, which is the manifest's own
         phrasing, and it is the loudest thing a sealed line could say: at the
         empty set six of these were being drawn, five of them landing on the
         rim of the person who was betrayed. `directed` is on
         OUTCOME_FIELDS.Edge and `e.type === 'betrayal'` derives one from a
         field that is also on it, so both halves go behind the same gate. */
      directed: tellable && (Boolean(e.directed) || e.type === 'betrayal'),
      focus: 0,
      dim: 0,
      draw: 0,
      flow: 0,
    });
  }

  const adjacency = new Map<string, Set<string>>();
  const edgesOf = new Map<string, GLink[]>();
  for (const l of links) {
    if (!adjacency.has(l.source.id)) adjacency.set(l.source.id, new Set());
    if (!adjacency.has(l.target.id)) adjacency.set(l.target.id, new Set());
    adjacency.get(l.source.id)!.add(l.target.id);
    adjacency.get(l.target.id)!.add(l.source.id);
    if (!edgesOf.has(l.source.id)) edgesOf.set(l.source.id, []);
    if (!edgesOf.has(l.target.id)) edgesOf.set(l.target.id, []);
    edgesOf.get(l.source.id)!.push(l);
    edgesOf.get(l.target.id)!.push(l);
  }

  /* The rim ticks. Strongest first so the order is stable and meaningful —
     the plate reads clockwise from twelve o'clock, and a set of ticks that
     reshuffles between renders is decoration, not a count. The rolled-up form
     is what every plate under ~29px on screen actually draws, so it is
     computed here too rather than per frame.

     MEETINGS ONLY, for the same reason `degree` is: the gallery legend says
     out loud that every tick on the rim is one verified connection, and a
     parallel record is the one edge type that exists to say the two people
     never met. The line is still drawn between them on the canvas, in its own
     hue and its own dash rhythm — what it no longer does is add a tick to a
     tally the legend has already named. The three plates it empties get the
     dashed no-ties rim instead, which is the mark for exactly that state.
     Portrait.tsx filters its own `connections` prop the same way; both painters
     have to, because they are handed different lists.

     AND SEALED TIES ARE NOT TICKED, by the same predicate that decides
     `degree`. This is not scope creep, it is what makes `noTies` mean
     anything: `noTies` is read off `degree`, so a plate whose every edge is
     sealed would otherwise carry `noTies: true` AND a rim of ticks — the
     dashed no-ties rim and five marks contradicting it, on one disc, in one
     object. Worse, a tick is `{ type, strength }` and `tieTypes` is a census
     BY TYPE, so an unfiltered rim prints the sealed verdict as a tally: three
     of these edges are betrayals. One predicate for the count and the picture
     of the count, or they drift the way this comment's first paragraph
     describes. */
  for (const n of nodes) {
    const mine = (edgesOf.get(n.id) ?? [])
      .filter((l) => countsAsTie(l.edge, watched))
      .sort((a, b) => b.edge.strength - a.edge.strength);
    n.plate.ties = mine.map((l) => ({ type: l.type, strength: l.edge.strength }));
    const byType = new Map<string, number>();
    for (const l of mine) byType.set(l.type, (byType.get(l.type) ?? 0) + 1);
    n.plate.tieTypes = [...byType.entries()].map(([type, count]) => ({ type, n: count }));
  }

  return { nodes, links, byId, adjacency, edgesOf };
}

/* ── the three readings of a rank, and all three go through ONE accessor ─────
 *
 * `runFacts` in data/i18n/index.ts is the only function in the app that answers
 * "what is this run's finish, for this reader". The three below spend it and
 * none of them re-derives it, which matters more here than the usual
 * anti-duplication argument, for two reasons:
 *
 *   · THE PAIR IS AN INTERLOCK, NOT TWO FIELDS. `runFacts` composes `pick`
 *     twice so a `fieldSize` passes its own gate AND the RANK's — a denominator
 *     may never outlive the number it qualifies, because the plate draws
 *     `rank / fieldSize` as an arc length and the pair is invertible
 *     (PLAN-spoilers.md §3). That composition is private to i18n/index.ts.
 *     Restating `pick(r.rank, r.scopes?.rank ?? r.scope, …)` here would be one
 *     `pick` where there have to be three, and the bug would be invisible:
 *     right at the default set, wrong only for a narrowed reader.
 *   · IT IS THE SAME QUESTION SEARCH ALREADY ASKS. `CommandPalette.tsx:363`
 *     has its own `isWinner(p, lang, watched)` off `runFacts`; the graph asking
 *     it differently is how a rail and a disc come to disagree about a person.
 *
 * The `'ko'` is not a language choice. `runFacts` returns two bilingual strings
 * beside the rank pair and this reads neither; the rank and its field size are
 * numbers and are identical on both sides. Passing the source-of-record
 * language keeps that visible rather than threading a `Lang` through a painter
 * that has no text in it.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Best finish in a given season THIS READER MAY BE TOLD, or undefined when
 * there is no finish to record — a studio-panel seat, a dealer, a host — and
 * now also when there is one and it is sealed. The plate draws that case as a
 * beaded ring rather than as a bottom-of-table stub, so the difference between
 * "no rank" and "last place" has to survive all the way to here.
 */
function bestRank(p: Person, season: number, watched: WatchedSet): number | undefined {
  let best: number | undefined;
  for (const r of p.priorSeasons) {
    if (r.season !== season) continue;
    const { rank } = runFacts(r, 'ko', watched);
    if (typeof rank !== 'number') continue;
    if (best === undefined || rank < best) best = rank;
  }
  return best;
}

/**
 * WAS THERE A FINISH HERE THAT THIS READER MAY NOT BE TOLD ABOUT?
 *
 * The question the plate could not previously ask, and the reason 이태균 and
 * 이상민 came out identical: `bestRank` returns `undefined` for a sealed
 * champion and for a studio panellist alike, and the painters had no third
 * answer to give. This is the third answer.
 *
 * IT READS `r.rank` RAW, WHICH IS ALLOWED HERE AND ALMOST NOWHERE ELSE, and the
 * distinction is what the value is used FOR. Nothing downstream receives the
 * number; it is collapsed to a boolean that says only "a finish exists in the
 * record", which is participation — the thing PLAN §2 keeps at every
 * watched-set, and the thing the plate has always been allowed to state by
 * drawing the season's slot at all. What the number itself would say is exactly
 * what stays behind the accessor.
 *
 * The predicate is deliberately the CONTESTANT one, matching `wonASeason`: a
 * host's or a panellist's run has no finish to seal, so it must keep falling to
 * the beaded mark rather than being sealed into silence about a run that was
 * never a run at the prize.
 *
 * EXPORTED so the hover card's warm pass can ask the same question of the same
 * record. That pass paints, off-screen, the plate the card is about to show;
 * asking it differently would warm a plate that never arrives, and asking it
 * with a second copy of this predicate is how the two painters drifted before.
 */
export function sealedRun(p: Person, season: number, watched: WatchedSet): boolean {
  const played = p.priorSeasons.some(
    (r) => r.season === season && r.role === 'contestant' && typeof r.rank === 'number',
  );
  return played && bestRank(p, season, watched) === undefined;
}

/** Field size for that person's run in that season — the denominator a rank is
    meaningless without, and which `runFacts` will not hand back once the rank
    beside it is gone. */
function fieldOf(p: Person, season: number, watched: WatchedSet): number | undefined {
  for (const r of p.priorSeasons) {
    if (r.season !== season) continue;
    const { fieldSize } = runFacts(r, 'ko', watched);
    if (typeof fieldSize === 'number') return fieldSize;
  }
  return undefined;
}

/**
 * Has this person won a season of the franchise, AS FAR AS THIS READER KNOWS?
 *
 * ONE FLAG, SIX RENDERED SURFACES. The canvas laurel (`plate.ts`, where it also
 * widens the plate's own reach); the dossier's brass chip, its crest and the
 * crest it draws for the other person in a relation row; the cast wall; the
 * edge card's two portraits; the hover card's brass tag and plate — and,
 * invisibly and worst, the disc's own radius, which no text gating could ever
 * have reached (see `history` above). Three handoffs called this "one line in
 * build.ts" and the line stayed unwritten, so at the empty watched-set the
 * atlas drew a gold ring round the two champions and told the reader nothing
 * about why.
 *
 * `role` IS READ RAW AND THAT IS DELIBERATE. `OUTCOME_FIELDS.SeasonRun` leaves
 * `role` off the manifest on purpose — the painters have to keep knowing
 * whether a run was a run at the prize, or a redacted contestant gets drawn
 * with the beaded mark that means "present, not competing" and the app asserts
 * something false about a named person. So the gate goes on the rank, which is
 * the verdict, and the role stays structure. Reordered to test the cheap
 * structural half first; `rank === 1 && role === 'contestant'` is the same
 * predicate.
 */
function wonASeason(p: Person, watched: WatchedSet): boolean {
  return p.priorSeasons.some((r) => r.role === 'contestant' && runFacts(r, 'ko', watched).rank === 1);
}

/** Stable slug from a Korean or Latin name. */
export function slugify(nameEn: string, nameKo: string, taken?: Set<string>): string {
  let base = nameEn
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!base) base = `p-${hash01(nameKo).toString(36).slice(2, 8)}`;
  if (!taken) return base;
  let out = base;
  let i = 2;
  while (taken.has(out)) out = `${base}-${i++}`;
  taken.add(out);
  return out;
}

/** Convenience for panels: the edges touching a person, best first. */
export function relationsOf(g: BuiltGraph, id: string): { link: GLink; other: GNode }[] {
  const list = g.edgesOf.get(id) ?? [];
  return list
    .map((link) => ({ link, other: link.source.id === id ? link.target : link.source }))
    .sort((a, b) => b.link.edge.strength - a.link.edge.strength);
}

export type { Person, Edge };
