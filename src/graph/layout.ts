import type { Category, SeasonNumber } from '../data/types';
import { ACCENT, CATEGORY_RING, INK_LOW, INK_SUB, SEASON_INK, mix } from './palette';
import { plateExtent } from './plate';
import type { GLink, GNode, LayoutMode } from './types';

/**
 * Layout = a set of anchor points. The simulation always runs; each mode just
 * decides how hard nodes are pulled toward a target. Mode switches therefore
 * animate for free, and the graph never looks "snapped".
 *
 * Three rules keep the anchored modes honest:
 *   • every region a mode labels has to be reachable, so the anchor spring has
 *     to out-pull the mesh (see `anchorK` — GraphCanvas also attenuates link and
 *     charge forces while an anchored mode is on),
 *   • every region a mode labels has to fit on screen, so the ring geometry is
 *     derived from the uncovered viewport rather than from constants,
 *   • **a drawn region is a claim about membership.** Two enclosures may only
 *     intersect where a node actually belongs to both, and two enclosures that
 *     mean different things may not intersect at all. Round 3 failed this on
 *     both anchored modes at once: the season bands overlapped while every
 *     multi-season player was floated *out* of the overlap, and the archetype
 *     rings were seated at even angles regardless of radius so a five-person
 *     ring swallowed its one-person neighbours. Both are geometry bugs, and
 *     both are fixed here rather than papered over in the renderer.
 */

const TAU = Math.PI * 2;

/** Deterministic 0..1 from a string — keeps layouts stable across reloads. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export interface LayoutResult {
  /** How strongly anchors bind, 0 = pure force-directed. */
  strength: number;
  /**
   * Per-tick spring coefficient for the anchor pull. The anchored modes have to
   * beat 40 links and a full-strength charge to seat a node inside the region
   * that names it, so they are stiff. The free web layout is not seating
   * anybody — its anchors only carry a proportion (see shapeToFrame), and they
   * go to zero as the arrangement takes it — so it runs at a quarter of that,
   * which is what keeps "free" honest.
   */
  anchorK: number;
  /**
   * Every node has a meaningful anchor, so the camera can frame where the graph
   * is going instead of where it currently is.
   */
  anchored: boolean;
  /** Optional decorative cluster hulls for the renderer. */
  clusters: Cluster[];
  /**
   * Ego-ring membership by node id, for the modes that have one — 0 is the
   * focus, 1 is a direct tie, 2 is a friend of a friend, 3 is everyone else.
   *
   * It is published because the renderer's de-emphasis pass cannot re-derive
   * it: orbit is the one mode that *requires* a selection, so its dim pass
   * treats every non-neighbour as background and paints ring 2 at ~8% with no
   * label — eleven people the caption counts and the reader cannot see.
   * Distance from the centre is already carrying "less relevant" in this mode;
   * alpha must not carry it as well, and the render side needs this map to
   * know which nodes to hold above the floor.
   */
  rings?: Map<string, number>;
}

export interface Cluster {
  key: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  r: number;
  /** Explicit ellipse radii; `r` is the fallback for both. */
  rx?: number;
  ry?: number;
  /**
   * World position for the caption: the point CAPTION_GAP outboard of the
   * hull's rim, along the ray from the figure's centroid to this cluster. Both
   * halves of the vector, not just the vertical one — see CAPTION_GAP.
   *
   * `labelX` falls back to `c.x` in the renderer, so a region that has nothing
   * to say about the horizontal (the rookie band, orbit's concentric rings)
   * simply omits it and stays centred.
   */
  labelX?: number;
  labelY?: number;
  color: string;
  /** Draw as a wide, shallow band rather than a circle. */
  flat?: boolean;
  /**
   * A region of one: caption and leader, no enclosure.
   *
   * NOTHING SETS THIS ANY MORE, and the reversal is worth writing down because
   * the reasoning that set it was sound and the conclusion was still wrong.
   *
   * Five of the ten archetypes hold exactly one person. Round 7 drew no ring
   * round them, because a ring sized to its group came out as a halo —
   * measured, 크리에이터's ring was 64 world units against 혜선's own plate rim
   * of 40, i.e. 24 units of gap in the SAME pink her archetype ring is drawn
   * in, so it read as a second ring on the node rather than as a region
   * containing it. True, and it fixed the halo. What it bought was worse: half
   * the regions in the mode drawn as enclosures and half as floating dots on
   * leader lines, so a reader had to learn two encodings for one thing and
   * 홍진호 — the app's own hub — sat outside every enclosure on the frame's
   * edge with a dot beside him.
   *
   * The halo was never caused by the ring existing. It was caused by the ring
   * being 1.6× the plate. RING_MIN_SOLO fixes the actual variable: a
   * singleton's enclosure is at least 2.15× its plate rim, which no plate mark
   * reaches and no reader mistakes for one, and it carries the same area fill
   * every other region has — which a plate ring never does.
   *
   * Kept as a field because the renderer reads it (drawClusters skips the
   * ellipse, drawCaptions shortens the leader tolerance) and because a filter
   * that leaves one archetype standing alone is still a real data state.
   */
  bare?: boolean;
  /**
   * Radius of what is actually DRAWN at the region's centre, when that is not
   * `r`. Only a `bare` region sets it, and only the caption's leader reads it.
   *
   * The distinction matters because the two numbers are 34 units apart and the
   * leader is a line between two visible things. `r` for a singleton is the
   * space the packing reserved — the plate plus RING_CLEAR — and nothing is
   * painted at that radius, so a leader started there begins in mid-air and the
   * "is this caption attached" test is run against a circle the reader cannot
   * see. `markR` is the plate rim, which is the thing the line has to touch.
   */
  markR?: number;
  /**
   * Ellipses to intersect and shade as a lens — the overlap of two or three
   * season sets. `label` is empty; a lens is a place, not a heading.
   *
   * The three season hulls were drawn as outlines only, so the six people in
   * the overlaps were the six the diagram could not answer for: nothing
   * distinguished "in the lens because he played both" from "in the lens
   * because the layout put him there". Membership reads off area, not off
   * counting which strokes a dot is inside.
   */
  lens?: { x: number; y: number; rx: number; ry: number }[];
  /**
   * **This ellipse is a region boundary, not a relationship.** Draw it solid
   * and filled; never dashed.
   *
   * This is the field that separates the two languages the canvas speaks. A
   * cluster hull used to stroke at alpha 0.3, 1.4/k, dash [6/k, 8/k]; a
   * shared-show or collab edge strokes at ~0.34, ~2/k, dash [7/k, 10.5/k].
   * Same weight, same alpha, near-identical dash rhythm — so on the by-season
   * screen fourteen long dashed edges cross three dashed season hulls and
   * there is no way to tell a season boundary from a "met on another
   * programme" tie crossing it. The Euler diagram is the entire claim of that
   * mode, and it had no organising device left.
   *
   * Boundary is a *kind*, not an alpha: a region is a continuous line with
   * area behind it, a relationship is a dashed line with nothing behind it.
   * Every enclosure this file emits sets it. `flat` bands do not — a band is a
   * caption on the graph rather than a region of it, and it keeps its dashes.
   *
   * RENDER CONTRACT, honoured. drawClusters reads this field (falling back to
   * `solid`, which is its stroke half and is still set alongside it): a
   * boundary strokes solid at 0.38 and 1.6/k with no dash, and takes its area
   * from *being* a boundary — 0.075 / 0.045 at the two radial stops — with
   * `fill` below acting as a relative trim rather than as the thing that
   * decides whether there is a fill at all. The other half, which could never
   * be done from this file, is done too: resting link alpha is attenuated by
   * 45% while `LayoutResult.anchored` is true, so the relationship language
   * sits back when the region language is on. Measured in the running app:
   * 0.34 in web, 0.187 in by-season and by-archetype, and no dashed hull
   * anywhere.
   */
  boundary?: boolean;
  /**
   * Solid ring instead of the default dashed one; the render-side half of
   * `boundary`. Orbit's two rings were also told apart by dash alone at 0.03
   * of alpha — they are told apart by channel (accent vs ink), by area and by
   * radius instead, all of which survive an edge being drawn across them.
   */
  solid?: boolean;
  /**
   * Relative trim on a region's own area fill. A region with area reads as a
   * place, an outline reads as a stray ellipse — and area at low chroma is far
   * more hue-legible than a hairline at the same chroma, which is what the ten
   * value-equalised archetype rings need.
   *
   * 1.65 is the unmodified boundary and lands the stops at 0.075 / 0.045; the
   * renderer normalises against it, so 1.85 is 12% more area and 0.9 is 55% of
   * it. (The number is historical — it was a multiplier on the old, weaker
   * stops — but it is the value every caller was authored against, so it stays
   * the reference rather than being renumbered to 1 in two files at once.)
   */
  fill?: number;
}

/** The zoom a freshly fitted layout should land near. */
const FIT_K = 0.92;

/**
 * The one distance every region caption sits from the thing it names, in world
 * units, measured outboard from the hull's rim along the centroid→cluster
 * vector.
 *
 * There used to be no such constant and it showed: on by-season, 시즌 2 sat
 * exactly on its hull's top rim (offset 0) while 시즌 1 and 시즌 3 sat 54 units
 * *below* their own rims — in the dead band under the figure, with three dashed
 * edges running through them — and 이전 시즌 없음 sat at a third distance again.
 * On by-archetype the top rings got 0 and the bottom rings got 52. Four
 * captions, four distances, no leader line and no plate: a caption that is not
 * visibly attached to the thing it names is not a caption, and the renderer's
 * collision walk (which steps ±(titleSize+10) until the box is clear) then made
 * the final offset effectively arbitrary.
 *
 * One constant, applied at the rim rather than at the centre, so the distance
 * is the same whether a hull is 160 units tall or 240. 34 clears the hull
 * stroke and the caption's own half-height once the renderer has stood the
 * block off along the same ray.
 *
 * The whole vector ships now, not just its vertical half: render.ts reads
 * `labelX ?? c.x`, so season 1's caption sits down-and-LEFT of its circle on
 * the ray that points at it, instead of being centred on the circle at a
 * vertical offset that was computed for a diagonal. `rimOut()` below is the
 * one place the rim intersection is solved.
 */
const CAPTION_GAP = 34;

/**
 * The point CAPTION_GAP outboard of an ellipse's rim, along a ray from the
 * ellipse's own centre.
 *
 * Solved rather than approximated: for a unit direction `d`, the ray meets the
 * (rx, ry) ellipse at `t = 1 / hypot(d.x/rx, d.y/ry)`, so the caption anchor is
 * `centre + d · (t + CAPTION_GAP)` and the gap between rim and anchor is
 * exactly CAPTION_GAP for every region regardless of how eccentric its hull is
 * or which way the ray points. That is the property the round-4 critique was
 * asking for — "one constant outboard offset" — and it is measurable from
 * outside: |anchor − centre| − |rim − centre| == 34 for all fourteen captions.
 */
function rimOut(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  dx: number,
  dy: number,
): { x: number; y: number } {
  const dl = Math.hypot(dx, dy) || 1;
  const ux = dx / dl;
  const uy = dy / dl;
  const t = 1 / Math.hypot(ux / Math.max(1, rx), uy / Math.max(1, ry));
  return { x: cx + ux * (t + CAPTION_GAP), y: cy + uy * (t + CAPTION_GAP) };
}

/**
 * Caption text for a region: the name, then its population after a mid dot.
 *
 * The count used to be the `sublabel`, i.e. a bare digit on its own line under
 * the title — "7" alone under 시즌 2, which reads as a footnote marker rather
 * than as seven people. On one line after a mid dot it reads as the count it
 * is, and it also halves the caption's measured box, which is what was pushing
 * the renderer's collision walk into moving captions in the first place.
 *
 * `strings.count` is the full form ("{n}명" / "{n} people"), so a caption reads
 * "시즌 2 · 7명" / "Season 2 · 7 people". See LayoutStrings.count.
 */
function caption(strings: LayoutStrings, label: string, n: number): string {
  const form = (n === 1 ? strings.countOne ?? strings.count : strings.count) ?? '{n}';
  return `${label} · ${form.replace('{n}', String(n))}`;
}

/**
 * The layout is authored in world units, but it has to end up inside a specific
 * rectangle of screen — the part of the canvas no panel is sitting on. Convert
 * once, here, so every mode composes for the frame it will actually be seen in.
 */
function worldBox(view?: { w: number; h: number }): { w: number; h: number } {
  const w = view && view.w > 320 ? view.w : 1180;
  const h = view && view.h > 240 ? view.h : 780;
  return { w: w / FIT_K, h: h / FIT_K };
}

const CAT_ORDER: Category[] = [
  'comedian',
  'broadcaster',
  'creator',
  'athlete',
  'esports',
  'poker',
  'musician',
  'actor',
  'professional',
  'other',
];

/**
 * Every caption this file emits is copy, so none of it is written here. The
 * canvas is handed the strings already in the reader's language and passes them
 * through — that is the only way a layout that names regions can be bilingual.
 */
export interface LayoutStrings {
  /** "Season {n}" — {n} is substituted. */
  season: string;
  /** The row for people with no prior season. */
  rookie: string;
  /** Orbit's two rings. */
  ring1: string;
  ring2: string;
  /** Archetype ring captions, by category. */
  category: Record<Category, string>;
  /**
   * "{n}명" / "{n} people" — the counter that turns a region caption's trailing
   * digit into a count. `canvas.regionCount` in ui.ts; GraphCanvas spends it in
   * its layoutStrings memo. Still optional so that `caption()` degrades to the
   * bare number rather than to "undefined" if a caller omits it.
   */
  count?: string;
  /**
   * The same counter in the singular. Five of the ten archetype regions hold
   * exactly one person, so English would otherwise read "Creator · 1 people"
   * five times on the flagship view of that mode. Korean does not inflect the
   * counter, so both forms are the same string there — which is why this is a
   * separate optional field rather than a rule: the caller supplies whatever
   * its own language needs and this file makes no claim about either.
   */
  countOne?: string;
  /**
   * Second line of a season caption: "{n} of them also played another season".
   *
   * THE TWO PANELS COUNT DIFFERENT THINGS AND USED THE SAME WORD FOR IT. The
   * filter rail's 시즌 2 is a lineage bloc — an editorial assignment, four
   * people per bloc, twenty in five blocs. This diagram's 시즌 2 is an
   * appearance — everyone who played it, whichever bloc they are filed under.
   * So the rail summed to 20 and the four captions three inches to its right
   * summed to 24, on the same screen, with nothing on either surface saying why,
   * and a reader who counted concluded the app could not.
   *
   * The honest fix is not to make the numbers match — they are different
   * quantities and both are true — but to publish the term that reconciles them.
   * 4 + 7 + 5 = 16 appearances by 12 people, and this line is where the other 4
   * are accounted for. Without it the diagram silently double-counts; with it,
   * "시즌 2 · 7명 / 이 중 3명은 다른 시즌에도" is a complete statement and the
   * lens shading below it is what the sentence points at.
   *
   * Optional: a caller that does not supply it gets the caption it had, so the
   * layout still composes for a language whose copy has not been written yet.
   * `{n}` is substituted.
   */
  seasonAlso?: string;
}

export interface LayoutOpts {
  focusId?: string | null;
  seasonColor: Record<SeasonNumber, string>;
  catColor: Record<Category, string>;
  strings: LayoutStrings;
  /** Uncovered canvas rect, in CSS pixels. */
  view?: { w: number; h: number };
}

export function applyLayout(mode: LayoutMode, nodes: GNode[], links: GLink[], opts: LayoutOpts): LayoutResult {
  if (!nodes.length) return { strength: 0, anchorK: 0, anchored: false, clusters: [] };

  switch (mode) {
    case 'seasons':
      return seasonLayout(nodes, opts.seasonColor, opts.strings, opts.view);
    case 'archetype':
      return archetypeLayout(nodes, opts.catColor, opts.strings, opts.view);
    case 'orbit':
      return orbitLayout(nodes, links, opts.focusId ?? null, opts.strings, opts.view);
    case 'web':
    default:
      return webLayout(nodes, opts.view);
  }
}

/**
 * Golden-angle fill of a disc. Even density, no visible rows, and — unlike the
 * raw `sqrt((i+0.5)/n)` it replaces — a lone member sits dead centre instead of
 * 70% of the way to the rim, which is what let a single-node bucket drift out
 * of the region that named it.
 */
function phyllo(i: number, count: number): { u: number; v: number } {
  if (count <= 1) return { u: 0, v: 0 };
  const t = Math.sqrt(i / (count - 1));
  const a = i * 2.399963;
  return { u: Math.cos(a) * t, v: Math.sin(a) * t };
}

/** Clear space between two PLATE RIMS seated in the same region, world units. */
const SEAT_GAP = 12;

/**
 * What two people seated in the same region have to be apart, centre to centre.
 *
 * **The disc is not the object.** A node's plate reaches 1.72× its radius (1.83
 * with a laurel) for the season arcs, the host hairline and the rim ticks, so a
 * separation measured on the discs seats one person's laurel across another
 * person's arcs. On the shipped build that is 진형/태균 in the professional ring
 * and 태균/상민/근우 in the season-1 cap: two monograms inside one malformed
 * object, which destroys the size-encodes-degree reading the node channel is
 * carrying.
 *
 * The free web layout has separated on `plateExtent(d) + 14` in its collide
 * force ever since the disc became a plate. The anchored modes were still
 * separating on the disc, so switching out of Web made plates that were clear of
 * each other overlap — the arrangement changed and the object got worse.
 */
function seatNeed(a: GNode, b: GNode): number {
  return plateExtent(a) + plateExtent(b) + SEAT_GAP;
}

/**
 * How densely a phyllotaxis actually packs discs of mixed size, as a fraction of
 * the area it covers. Used only to guess where `relax` should START; the answer
 * is measured off the seats it produces.
 */
const SEAT_DENSITY = 0.58;

/**
 * Short repel pass over one cluster's seats.
 *
 * The web layout relaxes; the cluster layouts did not. They seated by
 * phyllotaxis at a spread solved from a headcount, and node radius varies with
 * degree, so a ring with two hubs in it packed them inside their own discs —
 * two intersecting medallions read as one malformed object and the labels then
 * have nowhere to go. Phyllotaxis gets the arrangement right; this makes it
 * true. Deterministic (no random tie-break), converges in a handful of passes
 * on groups of five, and runs on a mode change rather than per frame.
 *
 * `limit` caps how far from (cx, cy) a seat may end up. The by-season caps pass
 * a real one — nobody may be pushed out of the circle that names them, which is
 * the one thing a region layout may never do. The archetype rings pass Infinity,
 * because there the ring is drawn round whatever this produces rather than the
 * other way about, so a clamp there would only re-introduce the overlap it is
 * being asked to remove.
 */
function relax(group: GNode[], cx: number, cy: number, limit: number): void {
  const n = group.length;
  if (n < 2 || limit <= 0) return;
  for (let pass = 0; pass < 24; pass++) {
    let worst = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = group[i];
        const b = group[j];
        let dx = b.ax - a.ax;
        let dy = b.ay - a.ay;
        let d = Math.hypot(dx, dy);
        const need = seatNeed(a, b);
        if (d >= need) continue;
        if (d < 1e-4) {
          // Coincident seats have no separating direction of their own; take a
          // stable one from the pair's ids so the layout stays reproducible.
          const ang = hash01(a.id + b.id) * TAU;
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        const push = ((need - d) / d) * 0.5;
        a.ax -= dx * push;
        a.ay -= dy * push;
        b.ax += dx * push;
        b.ay += dy * push;
        worst = Math.max(worst, need - d);
      }
    }
    if (Number.isFinite(limit)) {
      for (const nd of group) {
        const dx = nd.ax - cx;
        const dy = nd.ay - cy;
        const d = Math.hypot(dx, dy);
        if (d > limit) {
          nd.ax = cx + (dx / d) * limit;
          nd.ay = cy + (dy / d) * limit;
        }
      }
    }
    if (worst < 0.5) break;
  }
}

/* ── web ─────────────────────────────────────────────────────────────────
   Free force layout for anyone who has a tie.

   Free did not mean shapeless. Link length and charge are isotropic, so the
   mesh relaxed to whatever proportion the edge list happened to imply — a
   0.85:1 portrait cloud at every viewport, measured identically at 1600×1000,
   1280×800 and 390×844. The camera then fitted that portrait cloud into a
   landscape frame, so the short axis bound the zoom and the long one paid for
   it: 35% of the width covered on a desktop, and on a phone the same cloud
   arrives sideways-on and lands at k≈0.27. Neither is a camera bug. A layout
   that ignores the frame it is composed for cannot be framed well.

   So the free layout is given the one thing it was missing: a proportion. Not
   a cage — a weak pull toward the ellipse the frame would draw. See
   shapeToFrame().

   The cold branch below is dormant: every person in the cast now has at least
   one verified tie, so `cold` is empty and nothing here reserves the row's
   band, its 212 units of clearance, or its cluster. It is kept because the row
   is a real composition for a real data state (an edge list that loses a
   person's only tie brings it straight back), and because it costs one
   `filter` per relayout to keep honest. */

/** Narrowest and widest proportion the mesh is asked to take.
 *
 *  Past these the cloud stops being a cloud. The frame's own aspect runs from
 *  0.46 (390×844) to 1.60 (1600×1000), and the rectangle the camera actually
 *  fits into is more extreme still, because it spends a fixed padding and a
 *  measured label allowance out of the frame first — both of which cost the
 *  short axis proportionally more. Chasing that all the way down would give a
 *  phone a vertical string of twenty discs, so the ask stops just short of 1:2
 *  either way. Same reasoning as the 1.85 cap in seasonLayout.
 *
 *  The upper end is 2.15 rather than 1.72 because the mesh is no longer the
 *  whole figure. Once three people have no verified tie, the composition is
 *  mesh + COLD_RESERVE of band beneath it, and the camera frames the pair; a
 *  mesh that takes the FRAME's proportion therefore hands the camera a figure
 *  that is a third taller than the frame, and the fit then gives the whole
 *  difference back as dead width. Measured at 1600×1000 before: the mesh
 *  arrived at 1.451 against a frame of 1.442 — the shaping was working
 *  perfectly — and the camera still covered 50.7% of the width, because the
 *  box it actually fits came out at 0.978. See shapeToFrame's `reserveY`. The
 *  solved ask on a 1600×1000 desktop is 2.33, and the mesh — which is braked
 *  before it ever fully arrives — lands around 1.9, which is the proportion the
 *  camera then measures. */
const WEB_AR_MIN = 0.52;
const WEB_AR_MAX = 2.4;
/** Narrowest and widest reshape a single pass may ask for, as a safety rail on
 *  the gain below. The natural cloud is 0.85:1, so 1.62 already over-covers the
 *  widest frame; the rail is here so that a degenerate arrangement — everyone
 *  filtered down to one column — cannot be launched across the frame at once. */
const WEB_SHAPE_MIN = 0.62;
const WEB_SHAPE_MAX = 1.62;
/**
 * Gain on the reshape, as a power of the proportion error.
 *
 * 0.5 is the exact solve: `s = √(want/have)` lands the anchors on the wanted
 * proportion precisely. But the anchors are a target, not a teleport, and the
 * mesh only ever gets partway to them — GraphCanvas brakes the free layout from
 * 620ms and parks it as soon as the fastest node drops under 1.5 units/tick, so
 * an exact ask arrives about two thirds honoured and the graph settles at
 * ~1.25:1 where 1.6:1 was asked for. 0.65 over-asks in proportion to how wrong
 * the shape currently is, which is exactly the error the brake is going to eat.
 *
 * The fixed point is what makes this safe rather than a fudge: at `have = want`
 * the ask is 1.0 at any exponent, so an arrangement that has arrived is still
 * asked for nothing, and the over-ask decays to nothing with the error.
 *
 * TWO EXPONENTS, because the mesh answers the two directions differently.
 * Widening spreads discs into black and collide assists it, so the ask lands
 * short and 0.9 pays for the shortfall: at 1600×1000 the target became 2.33:1
 * once it was solved for the composed figure rather than the frame (see
 * shapeToFrame), which is a far longer journey than the old 1.44 and needs a
 * proportionally bigger over-ask.
 *
 * Narrowing compresses seventeen plates against each other and collide resists
 * it, so an over-ask there is spent entirely on making collide push back
 * harder. Measured at 390×844 across four runs each: at 0.65 the mesh settled
 * at 0.775 against an ask of 0.543 and the camera covered 80×74 of the phone's
 * rect; at 0.9 it settled at 0.88–0.93 and covered 83×68. The stronger ask made
 * the arrangement WIDER — which is the signature of an actuator being fought
 * rather than driven, and the reason the inward gain stays where it was
 * measured.
 */
const WEB_SHAPE_P = 0.9;
const WEB_SHAPE_P_IN = 0.65;
/**
 * Anchor régime for the free layout: strength × anchorK = 0.048, a quarter of
 * what an anchored mode spends.
 *
 * The ceiling on it was measured, not guessed. Drag a person out of the mesh
 * and drop them and the residual spring reels them back for the ~0.4s of alpha
 * tail left before the brake parks the simulation, then abandons them
 * mid-flight. At 0.4 × 0.18 they lose 43% of the distance you moved them, which
 * reads as the graph overruling you; at 0.4 × 0.12 they keep 83–87% — a ~35px
 * settle on a 250px drag, which reads as the mesh taking up the slack — and the
 * frame coverage is within two or three points of what the stiffer spring
 * bought. Below 0.4 × 0.09 the spring stops being able to move the mesh inside
 * the arrival window at all.
 */
const WEB_SHAPE_STRENGTH = 0.4;
const WEB_SHAPE_K = 0.12;

/**
 * Give the free cloud the frame's proportion, weakly.
 *
 * Each node's anchor is its own position pushed onto the ellipse that has the
 * uncovered rectangle's aspect — an equal-area reshape about the centroid, so
 * `sx · sy = 1` and the packing density is untouched. Nobody is squeezed into a
 * neighbour, no relative ordering changes, no node trades places with another,
 * and the mesh keeps the shape its edges gave it; only the proportion moves.
 *
 * Two properties matter more than the shaping itself:
 *
 *  • It is self-cancelling. `s` is solved from the live extents, so as the
 *    cloud reaches the frame's proportion `s → 1`, every anchor converges onto
 *    the node's own position, and the pull goes to zero. The free layout can
 *    still brake to a genuine stop — there is no fixed target ellipse left
 *    behind for it to creep against, and creeping is the failure that was just
 *    designed out.
 *  • It never fights the mesh. The pull is bounded by the cloud's own half
 *    extent times (s−1) — ~180 world units at the worst desktop stretch, and
 *    zero for a node already sitting where the proportion wants it.
 */
function shapeToFrame(tied: GNode[], view: { w: number; h: number } | undefined, reserveY: number): void {
  for (const n of tied) {
    n.ax = n.x;
    n.ay = n.y;
    n.anchorW = 0;
  }
  // Below four nodes there is no meaningful proportion to read, and the
  // centroid is dominated by whichever node moved last.
  if (tied.length < 4) return;

  const box = worldBox(view);

  let cx = 0;
  let cy = 0;
  for (const n of tied) {
    cx += n.x;
    cy += n.y;
  }
  cx /= tied.length;
  cy /= tied.length;

  // Half-extents of the drawn discs, not of the centres — the box the camera
  // fits is the one that includes the radii, so that is the one to proportion.
  let hx = 1;
  let hy = 1;
  for (const n of tied) {
    hx = Math.max(hx, Math.abs(n.x - cx) + n.radius);
    hy = Math.max(hy, Math.abs(n.y - cy) + n.radius);
  }

  /* AIM THE FIGURE, NOT THE MESH.
   *
   * `reserveY` is the vertical the rest of the composition takes out of the
   * frame before the mesh gets any — the cold row seated beneath it and that
   * band's lower rail. The camera frames the pair, so a mesh given the FRAME's
   * proportion hands it a figure `reserveY` taller than the frame, and the fit
   * gives the whole difference back as dead width. Measured at 1600×1000
   * before: the mesh arrived at 1.451 against a frame of 1.442 — the shaping
   * doing exactly what it was written to do — and the camera still covered
   * 50.7% of the width, because the box it fits came out at 0.978.
   *
   * The mesh keeps its area (this is an equal-area reshape), so writing
   * W = √(Aa) and H = √(A/a) for a mesh of aspect `a` and requiring
   * W/(H + reserveY) = R gives a quadratic in √a with one positive root:
   *
   *     u² − (R·reserveY/√A)·u − R = 0,   a = u²
   *
   * exact, and equal to R when reserveY is 0 — so a cast where everybody has a
   * tie is asked for precisely what it was asked for before.
   *
   * …weighted by how landscape the frame is, because the mesh answers the two
   * directions differently and the difference is physical rather than
   * incidental. Widening a cloud spreads it into black, which collide assists;
   * narrowing one compresses seventeen plates against each other, which collide
   * resists. Measured: at 1600×1000 an ask of 2.33 was delivered as 1.73 — 75%
   * of it — while at 390×844 an ask of 0.72 was delivered as 0.95, i.e. 32%
   * WIDE of it, and the frame's own uncorrected 0.54 was delivered as 0.775
   * against an ideal of 0.724. On a portrait frame the uncorrected ask is
   * already the correct over-ask and the corrected one is a nearer target
   * handed to an actuator that undershoots; applying it there cost five points
   * of the phone's rect. So the correction ramps in with the frame's own
   * proportion — a constant for a given viewport, which is what keeps it a
   * target rather than a feedback loop.
   *
   * It must not be gated on the live mesh instead. That reads as the obvious
   * safeguard ("correct only while the mesh is still narrower than the frame")
   * and is a trap: the gate closes the moment the mesh passes R, the target
   * snaps back BELOW where the mesh now is, and the next pass narrows it again.
   * Measured, that oscillation gave the entire fix back — 53% of the frame's
   * width against 63% with the target held. A solver's target may not depend on
   * where the solver currently is. */
  const A = 4 * hx * hy;
  const R = box.w / Math.max(1, box.h);
  const meshHave = hx / hy;
  const b = (R * Math.max(0, reserveY)) / Math.sqrt(A);
  const corrected = ((b + Math.sqrt(b * b + 4 * R)) / 2) ** 2;
  const land = clamp((R - 0.85) / 0.35, 0, 1);
  /* The rail belongs on the TARGET, not on the over-ask. Moving it onto the
     resulting mesh aspect reads as the stricter, safer place for it and is not:
     WEB_AR_MIN then floors the ask itself, so on a phone the over-ask the
     exponent exists to provide is clamped away the moment it bites. Measured at
     390×844, that alone cost four points of vertical coverage. */
  const want = clamp(R + land * (corrected - R), WEB_AR_MIN, WEB_AR_MAX);

  // Spreading and compressing are not the same journey — see WEB_SHAPE_P. The
  // gain differs by direction, never the target, so the fixed point is still
  // exactly `have = want` and both branches give s = 1 there.
  const s = clamp(
    (want / meshHave) ** (want > meshHave ? WEB_SHAPE_P : WEB_SHAPE_P_IN),
    WEB_SHAPE_MIN,
    WEB_SHAPE_MAX,
  );
  for (const n of tied) {
    n.ax = cx + (n.x - cx) * s;
    n.ay = cy + (n.y - cy) / s;
    n.anchorW = 1;
  }
}

/**
 * The vertical the cold row costs the composition, world units, measured from
 * the bottom of the lowest connected disc.
 *
 * COLD_DROP is the row's own offset (see below) and COLD_TAIL is what the
 * camera adds under it for the band's lower rail — GraphCanvas's bounds() reads
 * a `flat` cluster as `c.y − 120 … c.y + 96`, and the 96 is the half that
 * extends the box. Named here because shapeToFrame has to spend it out of the
 * frame's height BEFORE it asks the mesh for a proportion; a mesh shaped to the
 * whole frame plus 308 units of band is a figure the camera cannot fit without
 * giving the difference back as dead width.
 */
const COLD_DROP = 212;
const COLD_TAIL = 96;

function webLayout(nodes: GNode[], view?: { w: number; h: number }): LayoutResult {
  const cold = nodes.filter((n) => n.noTies);
  const tied = nodes.filter((n) => !n.noTies);

  shapeToFrame(tied, view, cold.length ? COLD_DROP + COLD_TAIL : 0);

  if (!cold.length) {
    return { strength: WEB_SHAPE_STRENGTH, anchorK: WEB_SHAPE_K, anchored: false, clusters: [] };
  }

  // The cold row's own spring is far stiffer than the shaping one, and both
  // ride the same `strength × anchorK`. Re-express the mesh's share as a weight
  // under the row's régime so the two keep their intended ratio.
  const shapeW = (WEB_SHAPE_STRENGTH * WEB_SHAPE_K) / (0.5 * 0.12);
  for (const n of tied) n.anchorW *= shapeW;

  // Centre of mass of everyone who is connected, so the row sits under the
  // actual graph rather than under the origin.
  let cx = 0;
  for (const n of tied) cx += n.x;
  cx = tied.length ? cx / tied.length : 0;

  // The band is a factual claim — "nobody in here has met anyone else" — so it
  // has to clear the whole mesh, not just the mesh's centres. Measure to the
  // bottom of the lowest disc and then leave room for that node's label, which
  // is painted below it in screen space, before the band's own top rail
  // (coldBounds() in render.ts backs off a further 74 world units).
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const n of tied) {
    maxY = Math.max(maxY, n.y + n.radius);
    minX = Math.min(minX, n.x - n.radius);
    maxX = Math.max(maxX, n.x + n.radius);
  }
  if (!Number.isFinite(maxY)) maxY = 0;

  /* The row's pitch tracks the mesh above it. A fixed 168 was right when the
     mesh was a 0.85:1 cloud; now that shapeToFrame is aiming a landscape frame
     the mesh is ~1200 world units wide at 1600×1000, and three discs pitched at
     168 read as a clump dropped under a wall rather than as a rank of it.
     Bounded both ways: never tighter than the plates need, never so wide that
     the row rather than the mesh sets the figure's width. */
  const meshW = Number.isFinite(minX) ? maxX - minX : 0;
  const gap = clamp(meshW / (cold.length + 1), 168, 300);
  const y = maxY + COLD_DROP;
  cold.sort((a, b) => a.person.nameKo.localeCompare(b.person.nameKo, 'ko'));
  cold.forEach((n, i) => {
    n.ax = cx + (i - (cold.length - 1) / 2) * gap;
    n.ay = y;
    // These four have no links pulling them anywhere, but the whole cluster is
    // still pushing them away, and at anchorW 3.4 / anchorK 0.055 the charge
    // won: the "row" arrived as a 165px diagonal scatter. The spring is now
    // stiff enough to hold a line and still soft enough to fly there rather
    // than teleport — d3's fx/fy would pin them exactly and lose the transit.
    n.anchorW = 4;
  });

  // The caption and the band both hang off the anchors, not off the live
  // centroid. The row is a composed object; it should not wobble left and right
  // while the mesh above it settles.
  const rowW = (cold.length - 1) * gap;

  return {
    strength: 0.5,
    anchorK: 0.12,
    anchored: false,
    clusters: [
      {
        // The band's caption is the only one whose count changes as filters
        // move, so the renderer owns both lines: it has the live count and the
        // localised copy. Nothing to author here.
        key: 'cold',
        label: '',
        sublabel: '',
        x: cx,
        y,
        r: Math.max(240, rowW / 2 + 90),
        // Same reasoning as the "no prior season" band: neutral, but from the
        // sub step rather than the low one, or the band's rails and caption
        // both land under 2.6:1.
        color: INK_SUB,
        flat: true,
      },
    ],
  };
}

/* ── seasons ─────────────────────────────────────────────────────────────
   A three-set Euler diagram, drawn honestly.

   The previous version put the three seasons on a straight axis at a spacing
   that made them overlap, and then floated everyone who played two seasons
   *above* the whole figure. So the only region a reader reads as meaningful —
   the intersection — was empty of exactly the people it appeared to describe,
   while three nodes sat inside a hull they do not belong to. A drawn
   intersection nobody occupies is worse than no hull at all.

   Now the three circles sit on a triangle of side 1.44r. Two facts fall out of
   that number: 1.44 > 1 so no centre is inside another circle (a season-only
   player is never in a neighbour's disc), and 1.44 < √3 so the three-way
   intersection exists (see VENN below). Membership then places itself:

     one season   → the cap of that circle, pushed outward from the centroid
     two seasons  → the lens the two circles share
     three seasons→ the middle, where all three overlap

   Park Ji-min is the only person in the cast who played all three, and she is
   now the only node in the middle of the figure. That is the story this mode
   exists to tell, and the geometry tells it without a caption.

   The whole figure is then scaled by (SX, SY). An affine scale preserves every
   containment relation, so the diagram can be stretched to the shape of the
   uncovered canvas and stay true — but only down to a point, because the plates
   it has to seat do not scale with it. That floor is VENN_MIN_PLATES.

   Measured on the finished figure at 1600×1000 and 1280×800: every membership
   true (residual 0 in and 0 out), deepest plate-on-plate overlap 0 world units,
   0 text-on-text collisions, 0 labels outside the uncovered rect. At 390×844 the
   memberships come out within 3 world units — 1.3 screen px at the fitted zoom —
   and the season-2/3 lens still cannot hold 홍진호 and 서출구 without their rim
   ticks crossing; see MEMBERSHIP_FLOOR for which of the two gives way there and
   why. */

/**
 * Triangle side as a fraction of √3 × the SMALLEST circle radius.
 *
 * Two constraints bound it and they now have to hold for three circles of
 * different sizes: the side must exceed the largest radius (or one centre sits
 * inside another circle, and a season-only player would be drawn inside a
 * season they never played), and it must stay under √3 × the smallest radius
 * (or the three-way intersection is empty, and 박지민 — the only person in this
 * cast who played all three — has nowhere true to stand).
 *
 * Between those two it is solved rather than fixed, and it is solved DOWNWARD:
 * the smallest legal side gives the largest middle, and the middle is the one
 * region of this figure that has to hold a whole plate. At the shipped 1.44
 * (τ = 0.83 for equal circles) the triple region measured 39 world units of
 * clearance against 박지민's 44-unit disc, i.e. she could not be drawn inside
 * it however the layout tried. TAU_MIN is the floor because the caps — where
 * the single-season players sit — shrink as the overlaps grow.
 */
const VENN_TAU_MAX = 0.86;
const VENN_TAU_MIN = 0.74;
/**
 * The floor under the figure's scale, in widest-plates per unit circle radius.
 * See the note at the SY solve. 2.6 is measured, not chosen: it is the smallest
 * value at which every membership and every plate separation comes out true at
 * 1280×800, and it is inactive at 1600×1000, where the frame already affords
 * more than that.
 */
const VENN_MIN_PLATES = 2.6;
/** Unit direction from the centroid to each season's circle. Season 2 takes the
 *  apex because it is the season that shares a lens with both neighbours. */
const VENN_DIR: Record<SeasonNumber, { x: number; y: number }> = {
  1: { x: -Math.cos(Math.PI / 6), y: 0.5 },
  2: { x: 0, y: -1 },
  3: { x: Math.cos(Math.PI / 6), y: 0.5 },
};

/** Signed clearance of a point from an ellipse's rim along its own radial ray,
 *  world units. Positive inside, negative outside. Exact for a circle and a
 *  close approximation for the eccentricities this diagram uses (≤1.85:1). */
function ellipseClear(px: number, py: number, e: { x: number; y: number; rx: number; ry: number }): number {
  const dx = px - e.x;
  const dy = py - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return Math.min(e.rx, e.ry);
  const t = Math.hypot(dx / e.rx, dy / e.ry);
  return d / t - d;
}

/**
 * Make every drawn membership TRUE, in world units, with the plates the reader
 * actually sees.
 *
 * The seating above is solved in unit circle radii and then scaled by (SX, SY),
 * and SY is the smaller of the two — so the vertical half of every clearance
 * the unit-space arithmetic reserved arrives on screen at ~0.54 of its intended
 * size, while node radii do not scale at all. That is why 진호 straddled the
 * season-3 stroke and 출구 the season-2/3 stroke on a diagram whose entire claim
 * is "this person is inside that circle": the geometry was right in the space it
 * was solved in and wrong in the space it was drawn in.
 *
 * So membership is enforced where it is read. Each node is pushed radially in or
 * out of each hull until its own PLATE rim — not its disc; the plate reaches
 * 1.5–1.83× the radius and a season arc crossed by a region stroke is the same
 * ambiguity — clears the boundary either side. Interleaved with a separation
 * pass, because pushing two nodes into the same lens can stack them.
 */
/**
 * What the last membership solve could not satisfy, in world units.
 *
 * Published for the same reason render.ts publishes `paintedLabels`: this file
 * opens by asserting that "a drawn region is a claim about membership", and an
 * assertion that cannot be measured from outside is how round 5 came to report
 * this mode fixed and round 6 to photograph it broken. `worst` is the deepest
 * remaining incursion of any plate across any boundary it should be on the
 * other side of; zero means every drawn membership is true. Nothing reads it.
 */
export const membershipResidual: {
  falseIn: number;
  falseOut: number;
  who: string;
  /**
   * …and the third failure, which is neither. `bisect` is the deepest a hull
   * stroke still reaches into the PLATE of one of its own members — a person
   * drawn sitting ON the boundary rather than either side of it.
   *
   * It is reported separately because it is a different kind of wrong. A false
   * in or a false out is a lie about a person; a bisected plate is an unanswered
   * question, and in a Euler diagram the only thing a boundary does is answer
   * it. Round 8 photographed two of these (서출구 across the season-3 stroke,
   * 박지민 across season 1) while `falseIn` and `falseOut` both read exactly
   * zero, which is how a residual that measures the wrong thing certifies a
   * broken picture.
   */
  bisect: number;
  bisectWho: string;
} = {
  falseIn: 0,
  falseOut: 0,
  who: '',
  bisect: 0,
  bisectWho: '',
};

/**
 * The deepest remaining interpenetration of two PLATES in the last anchored
 * layout, world units, and the pair it belongs to. Zero means no two people's
 * marks touch.
 *
 * Published for the same reason as `membershipResidual`. "The discs are not
 * collision-resolved against each other" was filed against this file in two
 * consecutive rounds, on both anchored modes, and both times the reply was a
 * relaxation pass rather than a number. `seatNeed` is the claim; this is the
 * evidence. Nothing reads it.
 */
export const seatResidual: { worst: number; who: string } = { worst: 0, who: '' };

/** Audit the seats as they will be drawn. Called at the end of each anchored
 *  mode, on the nodes that mode actually placed. */
function auditSeats(nodes: GNode[]): void {
  seatResidual.worst = 0;
  seatResidual.who = '';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const over = plateExtent(a) + plateExtent(b) - Math.hypot(b.ax - a.ax, b.ay - a.ay);
      if (over > seatResidual.worst) {
        seatResidual.worst = over;
        seatResidual.who = `${a.id}/${b.id}`;
      }
    }
  }
}

/**
 * The two constraints are NOT symmetric, and treating them as if they were is
 * what makes this solver unsolvable.
 *
 *   • A non-member drawn inside a set is a false statement, full stop. The
 *     whole PLATE has to be clear of that boundary, because a season arc with a
 *     region stroke running through it is exactly the ambiguity being fixed.
 *   • A member is only misread if the reader would assign them elsewhere, so
 *     what has to be inside is the DISC — the thing that carries the mark and
 *     the thing a reader points at. Requiring the plate too is not merely
 *     stricter, it is infeasible: the triple overlap of any Venn is smaller
 *     than one plate at any scale this frame can afford, so 박지민 would have an
 *     unsatisfiable constraint and the damped solve would trade it against her
 *     neighbours' satisfiable ones.
 */
const OUT_MARGIN = 10;
const IN_MARGIN = 6;
/**
 * …and the clearance a member's PLATE is asked for, on top of that.
 *
 * The paragraph above is still right about what is INFEASIBLE — the triple
 * overlap cannot hold a whole plate at any scale this frame affords, so the
 * plate ask can never be a hard constraint. What it got wrong is that it
 * therefore never asked at all, and "cannot always be satisfied" is not the
 * same as "is never worth trying". Measured on the shipped build at 1600×1000,
 * with falseIn and falseOut both at exactly 0: four of the twelve people in the
 * figure had a season stroke drawn through their plate, the worst by 16.8 world
 * units, and a disc bisected by its own set's boundary is precisely the
 * ambiguity a Euler diagram exists to remove.
 *
 * So it is asked for as a SECOND, softer term, on top of the disc constraint
 * and never instead of it: it only runs on a (node, hull) pair whose hard
 * constraint is already satisfied, it pushes at half the gain, and it stands
 * down entirely at PLATE_YIELDS_AT if the hard memberships have not converged
 * by then — the same lesson MEMBERSHIP_FLOOR already encodes one line down.
 * Truth first, then clearance, then composition.
 */
const IN_MARGIN_PLATE = 4;
const PLATE_YIELDS_AT = 16;

/**
 * How wrong a membership may still be at the point where clearance stops being
 * worth anything, in world units — and the pass by which it has to have got
 * there.
 *
 * TRUTH BEATS CLEARANCE, and on a narrow frame the two are genuinely
 * incompatible. The Venn is authored in circle radii and scaled to the uncovered
 * rect; node radii do not scale at all, so a 390px viewport draws the same
 * plates against a figure the camera then has to shrink to 0.44 — the plates end
 * up roughly twice the size, relative to the lenses, that they are on a desktop.
 * Measured there: asking for full plate separation as well as true membership
 * left 서출구's disc 47 units outside the season-3 circle it is drawn as a
 * member of, and two people's plates still overlapped by 27 — the damped solve
 * traded a satisfiable constraint against an unsatisfiable one and lost both.
 *
 * So the separation stands down when the memberships have not converged. Plates
 * touching is a composition fault; a person drawn outside a set they played is a
 * false statement about a real person, which is the one thing this file's own
 * opening rule forbids. On a desktop the memberships are true well before the
 * threshold pass and the full separation is never given up: measured 0 and 0.
 */
const MEMBERSHIP_FLOOR = 0.8;
const SEPARATION_YIELDS_AT = 15;

function seatMembership(
  nodes: GNode[],
  hulls: { key: string; e: { x: number; y: number; rx: number; ry: number } }[],
  memberOf: (n: GNode) => Set<string>,
): void {
  let plateSep = true;
  let plateAsk = true;
  for (let pass = 0; pass < 36; pass++) {
    let worst = 0;
    let memErr = 0;
    let softErr = 0;
    for (const n of nodes) {
      const mine = memberOf(n);
      if (!mine.size) continue;
      const rim = plateExtent(n);
      for (const h of hulls) {
        const inside = mine.has(h.key);
        const want = inside ? n.radius + IN_MARGIN : -(rim + OUT_MARGIN);
        const have = ellipseClear(n.ax, n.ay, h.e);
        const err = inside ? want - have : have - want;
        // The soft second ask: the member's whole PLATE inside, not just the
        // disc. Only ever on a pair whose hard constraint is already met, at
        // roughly half the gain, and abandoned the moment it starts costing the
        // hard one anything. See IN_MARGIN_PLATE.
        const soft = inside && plateAsk ? rim + IN_MARGIN_PLATE - have : 0;
        if (err <= 0 && soft <= 0) continue;
        let dx = n.ax - h.e.x;
        let dy = n.ay - h.e.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        if (err > 0) {
          worst = Math.max(worst, err);
          memErr = Math.max(memErr, err);
          // Inward when the node has to get further inside, outward when it has
          // to get further out. Damped, because two hulls can ask at once.
          const step = err * 0.55 * (inside ? -1 : 1);
          n.ax += dx * step;
          n.ay += dy * step;
        }
        if (soft > 0) {
          /* The plate ask, on the part of the distance the disc ask did not
             already claim. Both push inward, so taking the remainder can never
             reverse the truth term — and it must be the REMAINDER rather than an
             either/or, because a member parked exactly on `radius + IN_MARGIN`
             holds a permanent hard error of a few tenths and an `else` therefore
             never fires: measured, 현성주 sat at err 0.4 and soft 20.8 for the
             whole solve and finished 16.8 units under the season-2 stroke.
             Tracked apart from `worst` because the two have different exit
             conditions — `worst` is the truth condition and must converge, this
             one may be unsatisfiable and is given a pass budget instead. */
          softErr = Math.max(softErr, soft);
          const extra = Math.max(0, soft - Math.max(0, err));
          n.ax -= dx * extra * 0.3;
          n.ay -= dy * extra * 0.3;
        }
      }
    }
    if (plateAsk && pass >= PLATE_YIELDS_AT && memErr > MEMBERSHIP_FLOOR) plateAsk = false;
    /* Keep the PLATES apart while they are being herded into the same lens.
       Separating on the discs left 태균's laurel drawn through 상민's season
       arcs in the season-1 cap and 진형's through 승진's in the season-2 one —
       two plates read as one object, in the mode whose whole job is to say who
       is in which set.

       …until the memberships stop converging, at which point it separates on the
       discs instead and lets the hulls have the room. See MEMBERSHIP_FLOOR. */
    if (plateSep && pass >= SEPARATION_YIELDS_AT && memErr > MEMBERSHIP_FLOOR) plateSep = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.ax - a.ax;
        let dy = b.ay - a.ay;
        let d = Math.hypot(dx, dy);
        const need = plateSep ? seatNeed(a, b) : a.radius + b.radius + SEAT_GAP;
        if (d >= need) continue;
        if (d < 1e-4) {
          const ang = hash01(a.id + b.id) * TAU;
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        const push = ((need - d) / d) * 0.5;
        a.ax -= dx * push;
        a.ay -= dy * push;
        b.ax += dx * push;
        b.ay += dy * push;
        worst = Math.max(worst, need - d);
      }
    }
    if (worst < 0.6 && (!plateAsk || softErr < 0.6 || pass >= PLATE_YIELDS_AT)) break;
  }

  // Final audit, on the seats as they will actually be drawn — the loop above
  // reports the error it saw BEFORE its own correction, which is not the same
  // number and is not the one worth publishing.
  membershipResidual.falseIn = 0;
  membershipResidual.falseOut = 0;
  membershipResidual.who = '';
  membershipResidual.bisect = 0;
  membershipResidual.bisectWho = '';
  for (const n of nodes) {
    const mine = memberOf(n);
    if (!mine.size) continue;
    const rim = plateExtent(n);
    for (const h of hulls) {
      const have = ellipseClear(n.ax, n.ay, h.e);
      // A stroke crosses a plate when the plate rim straddles it, whichever
      // side of it the person belongs on. Audited for every pair, member or
      // not: `falseIn` already keeps a non-member's plate out by OUT_MARGIN,
      // so any bisection this finds is a member's own boundary — but the
      // measurement should not assume that, because assuming it is how the
      // previous audit came to certify a picture it had not looked at.
      const bisect = rim - Math.abs(have);
      if (bisect > membershipResidual.bisect) {
        membershipResidual.bisect = bisect;
        membershipResidual.bisectWho = `${n.id} on ${h.key}`;
      }
      if (mine.has(h.key)) {
        // How far a member's disc pokes out of a set it belongs to.
        const err = n.radius - have;
        if (err > membershipResidual.falseOut) {
          membershipResidual.falseOut = err;
          membershipResidual.who = `${n.id} out of ${h.key}`;
        }
      } else {
        // How far a non-member's plate reaches into a set it does not belong to.
        const err = have + rim;
        if (err > membershipResidual.falseIn) {
          membershipResidual.falseIn = err;
          membershipResidual.who = `${n.id} into ${h.key}`;
        }
      }
    }
  }
}

function seasonLayout(
  nodes: GNode[],
  seasonColor: Record<SeasonNumber, string>,
  strings: LayoutStrings,
  view?: { w: number; h: number },
): LayoutResult {
  for (const n of nodes) n.anchorW = 1;
  const box = worldBox(view);
  const seasons: SeasonNumber[] = [1, 2, 3];
  const held = (s: SeasonNumber) => nodes.filter((n) => n.seasons.includes(s)).length;

  /* AREA HAS TO TRACK HEADCOUNT. Three identical circles say the three seasons
     are the same size and they are not — 4, 7 and 5 people are on screen inside
     them, and a set diagram whose areas contradict its own counts is the one
     thing the form may not do. Radius by √count, so AREA is linear in
     membership, normalised so the mean radius stays 1 and the (SX, SY) fit
     below is unchanged.

     Then walked back toward equal radii until the two Venn constraints hold —
     `d > maxR` and `d < √3·minR` cannot both be satisfied for an arbitrarily
     lopsided triple, and under a filter the counts can be anything at all. The
     unfiltered cast lands at b = 1, i.e. exactly √count. */
  const roots = seasons.map((s) => Math.sqrt(Math.max(1, held(s))));
  const meanRoot = (roots[0] + roots[1] + roots[2]) / 3;
  /** Smallest legal side for a radius set, or null when there is none. */
  const sideFor = (rr: number[]): number | null => {
    const lo = Math.max(...rr) * 1.04;
    const hi = VENN_TAU_MAX * Math.sqrt(3) * Math.min(...rr);
    if (lo > hi) return null;
    return Math.max(lo, Math.min(hi, VENN_TAU_MIN * Math.sqrt(3) * Math.min(...rr)));
  };
  let R: number[] = [1, 1, 1];
  let D = sideFor(R)!;
  for (let b = 1; b >= 0; b -= 0.05) {
    const cand = roots.map((r) => 1 + b * (r / meanRoot - 1));
    const d = sideFor(cand);
    if (d !== null || b <= 0) {
      R = cand;
      D = d ?? sideFor([1, 1, 1])!;
      break;
    }
  }
  const RC = D / Math.sqrt(3);
  const radiusOf = (s: SeasonNumber) => R[s - 1];

  // Half-extents of the figure in circle radii — now that the three circles
  // differ, they have to be measured rather than derived from one constant.
  let halfW = 0;
  let top = 0;
  let bottom = 0;
  for (const s of seasons) {
    const d = VENN_DIR[s];
    const r = radiusOf(s);
    halfW = Math.max(halfW, Math.abs(d.x) * RC + r);
    top = Math.max(top, -d.y * RC + r);
    bottom = Math.max(bottom, d.y * RC + r);
  }

  /* Vertical budget, solved rather than guessed: the figure, a 150-unit gap,
     then the "no prior season" band. Horizontal: stretch to the frame, but
     never past 1.85:1 or the circles stop reading as circles and the diagram
     reads as three lozenges. */
  // The band's own people, not the whole cast: a rookie is by construction
  // low-degree and 26–30 units across, and sizing the band from 박지민's 44 cost
  // it 64 world units of height that the Venn above then had to give back.
  let maxNodeR = 24;
  for (const n of nodes) if (!n.seasons.length) maxNodeR = Math.max(maxNodeR, n.radius);
  /* The band is TWO RANKS now, not a 33-unit zigzag. Eight names set in screen
     space are ~74px wide and ~26px tall at the fitted zoom, i.e. ~120 × 43
     world units, against a row pitch of 97 — so every label overlapped its
     neighbours' and the solver spent its whole budget interleaving them, which
     is what put 'Kwak Beom' and 'Kim Nam-hee' on the same pixels. Two ranks
     halve the horizontal density and give each rank its own band of clear
     space for its labels; the rank offset is sized from the label box rather
     than from the ellipse.
     The separation is one node diameter plus one label box: at the fitted zoom
     that is 58 + 26 screen px ≈ 130 world, which `2 · rookieRank` covers. */
  const rookieRank = maxNodeR + 34;
  const rookieRy = rookieRank + maxNodeR + 22;
  /* THE SCALE HAS A FLOOR, AND THE FRAME IS NOT ALLOWED TO SET IT.
   *
   * The ellipses are solved in circle radii and scaled to the uncovered rect;
   * node plates are NOT scaled — a plate is 41–80 world units wherever it is
   * drawn. So shrinking the figure to fit a smaller frame makes the plates
   * bigger relative to every cap and lens they have to sit inside, and past a
   * point the diagram simply cannot be true: measured at 1280×800 the figure
   * solved to (SX 274, SY 190) and the season-2/3 lens could no longer hold
   * 홍진호 and 서출구 without their plates crossing, and at 390×844 (SX = SY =
   * 212) it could not hold their DISCS inside the circles at all — 서출구's disc
   * ended up 18 units outside a season he played, which is the one thing this
   * file's opening rule forbids.
   *
   * A figure that overflows its budget costs zoom, and zoom is recoverable: the
   * camera fits whatever this emits, and the reader can scroll into it. A figure
   * that fits and lies is not recoverable by anything. So the vertical budget is
   * a target and the floor under it is set by the widest PLATE in the cast —
   * that is the object the geometry has to make room for, so it is the object
   * the scale should be quoted in. Measured, both true at 1280×800 after:
   * membership residual 42.7 → 0 and plate overlap 42.7 → 0, at a cost of about
   * 8% of fitted zoom; inactive at 1600×1000, where the budget already exceeds
   * the floor and nothing changes. */
  let widestPlate = 0;
  for (const n of nodes) widestPlate = Math.max(widestPlate, plateExtent(n));
  const SY = clamp(
    Math.max((box.h - 120 - 2 * rookieRy) / (top + bottom), widestPlate * VENN_MIN_PLATES),
    104,
    232,
  );
  const SX = clamp(box.w / (2 * halfW), SY, SY * 1.85);

  const centre = (s: SeasonNumber) => ({
    x: VENN_DIR[s].x * RC * SX,
    y: VENN_DIR[s].y * RC * SY,
  });
  const hullOf = (s: SeasonNumber) => {
    const c = centre(s);
    return { x: c.x, y: c.y, rx: radiusOf(s) * SX, ry: radiusOf(s) * SY };
  };

  const buckets = new Map<string, GNode[]>();
  for (const n of nodes) {
    const key = n.seasons.slice().sort().join('-') || 'none';
    const arr = buckets.get(key);
    if (arr) arr.push(n);
    else buckets.set(key, [n]);
  }

  const rookieRx = Math.min(470, box.w * 0.32);
  const rookieY = bottom * SY + 120 + rookieRy;
  let rookies = 0;

  for (const [key, group] of buckets) {
    const ss: SeasonNumber[] = key === 'none' ? [] : (key.split('-').map(Number) as SeasonNumber[]);
    // Seat centre and spread, both in circle radii, converted at the end.
    let ux = 0;
    let uy = 0;
    let spread = 0;

    if (ss.length === 1) {
      // The cap of one circle: offset outward so the group sits clear of both
      // lenses, with room left for its own spread inside the rim. Both numbers
      // are now fractions of THIS circle's radius rather than of a shared one.
      const d = VENN_DIR[ss[0]];
      const r = radiusOf(ss[0]);
      ux = d.x * (RC + 0.34 * r);
      uy = d.y * (RC + 0.34 * r);
      spread = Math.min(0.42, 0.18 + group.length * 0.062) * r;
    } else if (ss.length === 2) {
      /* The lens — seated along the lens, not inside a disc drawn in it.
         Solved for two different radii: the lens's own centre sits `a` along the
         line joining the two, and its half-height across that line is `h`. */
      const A = VENN_DIR[ss[0]];
      const B = VENN_DIR[ss[1]];
      const rA = radiusOf(ss[0]);
      const rB = radiusOf(ss[1]);
      const ax0 = A.x * RC;
      const ay0 = A.y * RC;
      const jx = (B.x - A.x) * RC;
      const jy = (B.y - A.y) * RC;
      const jl = Math.hypot(jx, jy) || 1;
      const ux0 = jx / jl;
      const uy0 = jy / jl;
      const a = (jl * jl + rA * rA - rB * rB) / (2 * jl);
      const h = Math.sqrt(Math.max(0.02, rA * rA - a * a));
      // Lens centre, and the axis along it.
      const mx0 = ax0 + ux0 * a;
      const my0 = ay0 + uy0 * a;
      let qx = -uy0;
      let qy = ux0;
      // Point the along-lens axis AWAY from the figure's centre: one end of a
      // lens opens into clear canvas and the other runs at the triple overlap,
      // and a two-season player drawn inside all three circles is a false
      // statement.
      if (mx0 * qx + my0 * qy < 0) {
        qx = -qx;
        qy = -qy;
      }
      const count2 = group.length;
      const half = count2 > 1 ? 0.3 * h : 0;
      group.sort((p, q) => q.weight - p.weight);
      group.forEach((n, i) => {
        // Biased 0.44h out along the lens: the inboard end of every two-way
        // lens runs at the triple overlap, so a pair seated on the midpoint
        // ends up shoulder-to-shoulder with whoever is standing in the middle.
        const t = 0.44 * h + (count2 > 1 ? (i / (count2 - 1) - 0.5) * 2 * half : 0);
        const off = count2 > 2 ? (i % 2 === 0 ? -0.06 : 0.06) : 0;
        n.ax = (mx0 + qx * t + ux0 * off) * SX;
        n.ay = (my0 + qy * t + uy0 * off) * SY;
      });
      continue;
    } else if (ss.length >= 3) {
      // The middle. RC from every centre, so min(R) − RC of spread still clears
      // all three rims; grow into it with the group rather than sitting at a
      // fixed fraction whatever lands there.
      spread = Math.min(Math.max(0.04, Math.min(...R) - RC) * 0.8, 0.06 + group.length * 0.05);
    } else {
      /* Nobody's prior-season column: a wide, shallow band under the figure,
         laid out as an explicit two-rank grid — read left to right, sorted the
         way the reader will read the names. The rank offset is clipped to the
         band's own ellipse at that x, so the outermost pair cannot poke through
         the boundary that is supposed to contain them. */
      rookies = group.length;
      const count = group.length;
      group.sort((a, b) => a.person.nameKo.localeCompare(b.person.nameKo, 'ko'));
      const step = (rookieRx * 2 * 0.88) / Math.max(1, count - 1);
      group.forEach((n, i) => {
        const x = (i - (count - 1) / 2) * step;
        const room = (rookieRy - n.radius - 8) * Math.sqrt(Math.max(0, 1 - (x / rookieRx) ** 2));
        n.ax = x;
        n.ay = rookieY + (i % 2 === 0 ? -1 : 1) * Math.min(rookieRank, room);
      });
      continue;
    }

    const count = group.length;
    group.sort((a, b) => b.weight - a.weight);
    group.forEach((n, i) => {
      const p = phyllo(i, count);
      n.ax = (ux + p.u * spread) * SX;
      n.ay = (uy + p.v * spread) * SY;
    });
  }

  /* Now make it true where it is drawn. Rookies are excluded — they belong to
     the band below the figure and are governed by it, not by the three hulls. */
  const hulls = seasons.map((s) => ({ key: `s${s}`, e: hullOf(s) }));
  seatMembership(
    nodes.filter((n) => n.seasons.length > 0),
    hulls,
    (n) => new Set(n.seasons.map((s) => `s${s}`)),
  );

  /** …of whom this many are also drawn inside another season's circle. The term
   *  that reconciles 4 + 7 + 5 = 16 appearances with 12 people. */
  const alsoElsewhere = (s: SeasonNumber) =>
    nodes.filter((n) => n.seasons.includes(s) && n.seasons.length > 1).length;

  const clusters: Cluster[] = seasons.map((s) => {
    const c = centre(s);
    const also = alsoElsewhere(s);
    // One distance for all three, taken outboard along the centroid→circle
    // vector — the whole vector, so season 1's caption stands down-and-left of
    // its circle and season 3's down-and-right, on the rays that already say
    // which circle is which. render.ts walks a blocked caption further out
    // along that same ray and runs a leader back to the rim.
    const rx = radiusOf(s) * SX;
    const ry = radiusOf(s) * SY;
    const cap = rimOut(c.x, c.y, rx, ry, VENN_DIR[s].x, VENN_DIR[s].y);
    return {
      key: `s${s}`,
      label: caption(strings, strings.season.replace('{n}', String(s)), held(s)),
      // See LayoutStrings.seasonAlso. Suppressed at zero rather than printed as
      // "0 of them", which is a sentence about nothing.
      sublabel: also && strings.seasonAlso ? strings.seasonAlso.replace('{n}', String(also)) : undefined,
      x: c.x,
      y: c.y,
      r: rx,
      rx,
      ry,
      labelX: cap.x,
      labelY: cap.y,
      boundary: true,
      solid: true,
      fill: 1.65,
      // The ink ramp, not the mark ramp. A cluster's colour is spent on three
      // things at once — a hairline hull stroke at part alpha, a 3.2px caption
      // dot, and the caption's own letterforms — and SEASON_COLOR is
      // deliberately dark because it is an arc on a plate. Composited at the
      // alpha a region stroke can afford it lands at 2.13 / 2.64 / 3.10:1, so
      // the season-1 hull would be half the weight of the season-3 one and
      // none of the three would clear the 3:1 floor. SEASON_INK is the same
      // three hues lifted for glyphs: 2.97 / 3.14 / 3.51 at alpha 0.6, i.e.
      // balanced and at the floor. SEASON_COLOR keeps the arcs.
      color: SEASON_INK[s] ?? seasonColor[s],
    };
  });

  /* THE LENSES. Every overlap the figure draws, shaded, so that "played both"
     is somewhere the eye lands rather than a deduction from which of three
     hairlines a dot happens to be inside. Pushed to the FRONT of the list so
     they are painted under the hull strokes and under the links.

     Colour is the mix of the two seasons that make the region, at full ink
     value — an overlap is not a fourth season, it is those two at once, and a
     neutral wash there would have said the opposite. The three-way lens takes
     all three mixed, and lands at roughly three times a single region's density
     because the fills stack; that is the reading. */
  const lensOf = (ss: SeasonNumber[]): Cluster => {
    let col = SEASON_INK[ss[0]];
    for (let i = 1; i < ss.length; i++) col = mix(col, SEASON_INK[ss[i]], 1 / (i + 1));
    const es = ss.map(hullOf);
    let cx = 0;
    let cy = 0;
    for (const e of es) {
      cx += e.x / es.length;
      cy += e.y / es.length;
    }
    return {
      key: `lens${ss.join('')}`,
      label: '',
      x: cx,
      y: cy,
      // Nothing beyond the hulls it is cut from, so it must not enlarge the box
      // the camera frames.
      r: 0,
      rx: 0,
      ry: 0,
      color: col,
      lens: es,
    };
  };
  clusters.unshift(
    lensOf([1, 2]),
    lensOf([2, 3]),
    lensOf([1, 3]),
    lensOf([1, 2, 3]),
  );

  if (rookies) {
    clusters.push({
      key: 'rookies',
      label: caption(strings, strings.rookie, rookies),
      x: 0,
      y: rookieY,
      r: rookieRx,
      rx: rookieRx,
      ry: rookieRy,
      // The vector from the figure's centroid to this band points straight
      // down, but down is the bottom of the frame — the renderer would clamp
      // the caption back into the uncovered rect and land it on the band it
      // names. The gap is the same as everywhere else; only the side is the
      // inboard one, because that is the only side that exists here. No
      // labelX: there is no horizontal half to a straight-up ray.
      labelY: rookieY - rookieRy - CAPTION_GAP,
      boundary: true,
      solid: true,
      fill: 1.65,
      // Neutral, because "no season" is the absence of the hue the other three
      // regions carry — but INK_SUB rather than INK_LOW, which composites to
      // 2.57:1 under a region stroke and disappears next to the three coloured
      // hulls it is supposed to sit beside.
      color: INK_SUB,
    });
  }

  auditSeats(nodes);

  // Stiffer than it was: in a diagram whose whole claim is "this node is inside
  // that circle", a node the residual link force has dragged 40px out of its
  // lens is a false statement, not a loose spring.
  return { strength: 0.6, anchorK: 0.3, anchored: true, clusters };
}

/* ── archetype ───────────────────────────────────────────────────────────
   Ten labelled regions, PACKED — not threaded on a necklace.

   Round 3 seated them at even angles, which is only correct when every cluster
   is the same size, so a five-person ring swallowed its one-person neighbours.
   Round 6 replaced that with a variable-step necklace, which fixed the
   overlaps and bought a new problem: ten regions of unrelated radii strung
   round the rim of an ellipse with nothing in the middle of it. Measured on the
   shipped build at 1600×1000 — the union of the ten hulls covered a
   806 × 587 box inside an 1180 × 860 uncovered rect, with a ~300-unit hole
   through the centre of the figure and both bottom corners empty. Nothing was
   overlapping and nothing was composed either.

   So the regions are packed instead of strung: largest first, each new region
   seated tangent to two already-placed ones at whichever of the two tangent
   points sits closest to the figure's own centre, measured in a metric with the
   frame's aspect. That is a standard front-chain pack, and it does three things
   at once — the middle is occupied by the biggest region rather than by a hole,
   the union is compact and centred, and the outline of the whole figure takes
   the shape of the rectangle it is going to be seen in.

   Two things follow from packing rather than stringing, and both are handled
   below rather than in the renderer. The regions are seated BEFORE they are
   sized, because a ring drawn round a measured arrangement is the only way both
   "every plate is inside its ring" and "no two plates touch" can hold at once —
   see seatLocal. And the region the pack puts in the middle has no outward ray
   to hang a caption on, because it has no outside — see captionRay. Measured
   after, at 1600×1000, 1280×800 and 390×844: deepest plate-on-plate overlap 0
   world units in all three, 0 text-on-text label collisions, 0 labels outside
   the uncovered rect.

   Colour: the ring is drawn as a stroke at a fraction of alpha over a near
   black backdrop, which is why CATEGORY_RING exists — the archetype ramp
   itself is half-chroma by design and composites to ~1.5:1 at any alpha the
   region system can afford. See the note above CATEGORY_RING in palette.ts. */

/**
 * Clear black between the widest PLATE RIM in a region and the region's own
 * stroke, in world units.
 *
 * Against the plate rim, not the disc: a node's radius is 24–44 and its plate
 * reaches 1.50× that (1.83× with a laurel), so a clearance measured on the disc
 * leaves the enclosure sitting inside the marks it is supposed to enclose. That
 * is exactly what happened to the singleton rings — and it is why the reviewer
 * read one of them as a second ring on the node rather than as a region.
 */
const RING_CLEAR = 34;
/**
 * …and never closer in than this multiple of that rim, whatever the clearance
 * arithmetic says. A two-person region of two big plates can satisfy
 * RING_CLEAR and still come out as a snug oval; below about 1.55 the stroke
 * stops reading as an enclosure and starts reading as part of the plate.
 */
const RING_MIN_FACTOR = 1.55;
/**
 * …and a region of ONE is held further out still, as a multiple of its single
 * plate's rim.
 *
 * This is the number that decides whether a singleton's enclosure reads as a
 * region or as a second ring on the node, and it is the whole reason
 * `Cluster.bare` is no longer set. At RING_MIN_FACTOR the ring lands 1.55× the
 * plate — 24 world units of gap, in the archetype's own hue, immediately
 * outboard of the archetype ring the plate already carries. At 2.15 it lands
 * ~46 units out, which is wider than the entire plate stack (disc → season
 * arcs → host hairline → rim ticks → laurel spans 1.83× the disc), so there is
 * no radius at which the two could be confused. Measured on the finished figure
 * at 1600×1000: the tightest singleton enclosures (배우, 기타) draw at 89 world
 * units against 41-unit plate rims, and the widest (e스포츠, which holds the
 * cast's most connected person and therefore its largest plate) at 150 against
 * 70.
 */
const RING_MIN_SOLO = 2.15;
/** Black between two packed regions. Two strokes closer than this read as one
 *  double line, and the caption of the inner one has nowhere to sit. */
const RING_GAP = 40;

/**
 * How far past its own rim a caption's mass sits, for the purpose of choosing
 * which way it faces. Not the caption's real width — that is set in screen
 * space and this file has no zoom — but the distance at which "is there anything
 * in the way" stops being a useful question.
 */
const CAP_REACH = 96;
/**
 * How much a caption prefers to face out of the picture, in world units of
 * clearance it is willing to give up for it.
 *
 * Nine of the ten archetype regions have an outside, and for those the outward
 * ray *is* the clearest ray, so the bias only decides near-ties. The tenth is
 * the one the packing seats in the middle — five people, the largest ring, and
 * no direction that points away from anything. Its caption used to be emitted on
 * a ray solved from a 78-unit offset from the figure's centre, i.e. an arbitrary
 * direction, and then walked outward by the renderer until it cleared the four
 * regions in its way: on the shipped build "전문직 · 5명" ended up 198 units past
 * its own rim, stacked with four singleton captions in a column on the left of
 * the frame that reads as a legend rather than as four captions naming four
 * things. One rule that degrades correctly is better than a rule plus a special
 * case, so every caption faces its clearest ray and the outward preference is a
 * thumb on the scale rather than the scale.
 */
const CAP_OUT_BIAS = 70;

/**
 * Which way a region's caption faces: the ray out of its own centre with the
 * most clear black in front of it, preferring outward on a tie.
 *
 * Sampled rather than solved — a closed form for "the angle whose ray clears
 * nine other circles by the most" exists but is longer than the thirty-six
 * samples it would replace, and ten regions × thirty-six is nothing on a mode
 * change. Deterministic: no tie-break that depends on evaluation order.
 */
function captionRay(
  i: number,
  seats: { x: number; y: number }[],
  slots: number[],
): { x: number; y: number } {
  const S = seats[i];
  /* Sampled along the caption's whole reach, not at the far end of it.
   *
   * The score used to be the clearance at ONE point, `slot + gap + CAP_REACH`
   * out — which is past a tangent neighbour rather than at it, so a ray aimed
   * squarely down the 40-unit corridor between two regions scored as well as one
   * aimed into open black. Photographed on the ten-region figure: 전문직's
   * caption seated 32 units outboard of its own rim on a ray pointing at
   * 방송인, and its box — which is roughly 2·CAP_REACH wide and which this
   * scoring never knew about — was painted across 방송인's stroke, so the
   * largest region's caption read as the label of its neighbour.
   *
   * Three samples from where the caption SEATS to where it reads out to, scored
   * on the worst of them. `seat` is the one that matters most and `reach` is the
   * one that keeps a ray from being aimed at something far away. */
  const seat = slots[i] + CAPTION_GAP;
  const reach = seat + CAP_REACH;
  const ol = Math.hypot(S.x, S.y);
  // A region seated exactly on the figure's centre has no outward ray at all;
  // "up" is then as good as any other and the clearance term decides.
  const ox = ol > 1e-3 ? S.x / ol : 0;
  const oy = ol > 1e-3 ? S.y / ol : -1;
  let bx = ox;
  let by = oy;
  let bestScore = -Infinity;
  const N = 36;
  for (let a = 0; a < N; a++) {
    const th = (a / N) * TAU;
    const ux = Math.cos(th);
    const uy = Math.sin(th);
    let clear = Infinity;
    for (const t of [seat, (seat + reach) / 2, reach]) {
      const px = S.x + ux * t;
      const py = S.y + uy * t;
      for (let j = 0; j < seats.length; j++) {
        if (j === i) continue;
        clear = Math.min(clear, Math.hypot(px - seats[j].x, py - seats[j].y) - slots[j]);
      }
    }
    const score = clear + (ux * ox + uy * oy) * CAP_OUT_BIAS;
    if (score > bestScore) {
      bestScore = score;
      bx = ux;
      by = uy;
    }
  }
  return { x: bx, y: by };
}

/**
 * Front-chain circle packing. Returns a centre per input radius.
 *
 * `aspect` is the proportion the finished union should take: candidate seats
 * are ranked by distance to the origin measured with x divided by it, so the
 * pack grows into an ellipse of that shape rather than into a disc. Packing
 * straight and stretching afterwards would work too, but it would stretch the
 * GAPS as well and give back the compactness this exists to buy.
 *
 * Deterministic: seats are taken largest-first (a stable sort, so equal radii
 * keep CAT_ORDER), and every candidate is an exact tangency rather than a
 * sampled position, so the same ten radii always pack the same way.
 */
function packCircles(radii: number[], gap: number, aspect: number): { x: number; y: number }[] {
  const n = radii.length;
  const pos: { x: number; y: number }[] = new Array(n);
  const order = radii.map((_, i) => i).sort((a, b) => radii[b] - radii[a]);
  const seated: number[] = [];
  /** How far a seat is from the middle, in the frame's own proportion. */
  const cost = (x: number, y: number) => Math.hypot(x / aspect, y);
  const clearOf = (x: number, y: number, r: number, skip = -1): boolean => {
    for (const k of seated) {
      if (k === skip) continue;
      const need = radii[k] + r + gap - 0.5;
      const dx = x - pos[k].x;
      const dy = y - pos[k].y;
      if (dx * dx + dy * dy < need * need) return false;
    }
    return true;
  };

  for (const idx of order) {
    const r = radii[idx];
    if (!seated.length) {
      pos[idx] = { x: 0, y: 0 };
      seated.push(idx);
      continue;
    }
    if (seated.length === 1) {
      const a = seated[0];
      pos[idx] = { x: pos[a].x + radii[a] + r + gap, y: pos[a].y };
      seated.push(idx);
      continue;
    }

    let best: { x: number; y: number } | null = null;
    let bestCost = Infinity;
    for (let i = 0; i < seated.length; i++) {
      for (let j = i + 1; j < seated.length; j++) {
        const A = pos[seated[i]];
        const B = pos[seated[j]];
        const dA = radii[seated[i]] + r + gap;
        const dB = radii[seated[j]] + r + gap;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const d = Math.hypot(dx, dy);
        if (d < 1e-6 || d > dA + dB || d < Math.abs(dA - dB)) continue;
        const t = (dA * dA - dB * dB + d * d) / (2 * d);
        const hh = dA * dA - t * t;
        if (hh < 0) continue;
        const h = Math.sqrt(hh);
        const mx = A.x + (dx * t) / d;
        const my = A.y + (dy * t) / d;
        for (const sgn of [1, -1] as const) {
          const cx = mx + (sgn * h * -dy) / d;
          const cy = my + (sgn * h * dx) / d;
          const c = cost(cx, cy);
          if (c >= bestCost || !clearOf(cx, cy, r)) continue;
          bestCost = c;
          best = { x: cx, y: cy };
        }
      }
    }

    if (!best) {
      // No tangency survived — walk a golden-angle spiral until something does.
      // Reachable only for pathological radius sets; kept so the layout can
      // never return NaN seats.
      for (let s = 1; s < 400 && !best; s++) {
        const ang = s * 2.399963;
        const rad = 40 * Math.sqrt(s);
        const cx = Math.cos(ang) * rad * aspect;
        const cy = Math.sin(ang) * rad;
        if (clearOf(cx, cy, r)) best = { x: cx, y: cy };
      }
    }
    pos[idx] = best ?? { x: 0, y: 0 };
    seated.push(idx);
  }
  return pos;
}

/**
 * Pull a finished pack onto the frame's proportion, by moving seats apart and
 * never together.
 *
 * `packCircles` steers toward an aspect by ranking candidate tangencies in a
 * stretched metric, which biases the growth but cannot deliver a proportion:
 * the candidates are discrete tangency points, so ten regions of unrelated
 * radii land where they land. Measured at 1600×1000 with the frame at 1.442,
 * the union came out 1033 × 953 = 1.084, and the camera then spent the whole
 * difference as dead width — 46.9% of the frame covered horizontally.
 *
 * So the proportion is finished here, and the one property that matters is that
 * it CANNOT re-introduce an intersection: the scale is applied to one axis at a
 * time and is always ≥ 1, so every pairwise centre distance is non-decreasing
 * and every gap the pack solved for survives. That is also why this is not the
 * "pack straight and stretch afterwards" the packer's own docblock rejects —
 * that would stretch the radii too. Only the seats move; the rings keep the
 * size their headcount earned.
 */
function spreadToAspect(seats: { x: number; y: number }[], slots: number[], want: number): void {
  if (seats.length < 2) return;
  for (let pass = 0; pass < 2; pass++) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    seats.forEach((p, i) => {
      x0 = Math.min(x0, p.x - slots[i]);
      x1 = Math.max(x1, p.x + slots[i]);
      y0 = Math.min(y0, p.y - slots[i]);
      y1 = Math.max(y1, p.y + slots[i]);
    });
    const w = Math.max(1, x1 - x0);
    const h = Math.max(1, y1 - y0);
    const have = w / h;
    /* Capped, because the union's extremes are set by whole circles: asking for
       the last few per cent of a proportion buys a corridor of black between two
       regions rather than a wider figure.
       Aimed at the frame's proportion exactly, not at a trimmed version of it.
       The union of the rings is admittedly not the box the camera frames —
       every region hangs a caption CAPTION_GAP + CAP_REACH outboard of its own
       rim, and on a landscape frame those land left and right — so an allowance
       looks right on paper. Measured, it is not: a 0.88 trim moved the framed
       coverage at 1600×1000 from 65×68 to 60×70, at 1280×800 from 66×70 to
       56×66 and at 390×844 from 80×81 to 80×72. The captions are seated on
       rays chosen for clearance, so they do not all land on the long axis. */
    if (have < want) {
      const s = Math.min(1.35, want / have);
      if (s <= 1.01) return;
      for (const p of seats) p.x *= s;
    } else {
      const s = Math.min(1.35, have / want);
      if (s <= 1.01) return;
      for (const p of seats) p.y *= s;
    }
  }
}

function archetypeLayout(
  nodes: GNode[],
  catColor: Record<Category, string>,
  strings: LayoutStrings,
  view?: { w: number; h: number },
): LayoutResult {
  for (const n of nodes) n.anchorW = 1;
  const groups = new Map<Category, GNode[]>();
  for (const n of nodes) {
    const arr = groups.get(n.category);
    if (arr) arr.push(n);
    else groups.set(n.category, [n]);
  }
  const present = CAT_ORDER.filter((c) => groups.has(c));

  // A one-person trade gets a small ring around one node, not the same footprint
  // as a five-person one — the ring has to look like it is describing what is
  // inside it.
  //
  /** The widest plate rim in the group — what the enclosure has to clear. */
  const maxRim = (group: GNode[]): number => {
    let m = 0;
    for (const n of group) m = Math.max(m, plateExtent(n));
    return m;
  };

  /**
   * SEAT THE REGION FIRST, THEN DRAW THE RING ROUND WHAT IS THERE.
   *
   * The ring radius used to be estimated from the group's summed radii, and the
   * seats were then clamped inside the estimate — which is backwards twice over.
   * The estimate could not know how much room the relax would actually need (it
   * is a function of the plate rims, and a region of two hubs needs far more than
   * a region of two pendants at the same headcount), and the clamp then forbade
   * the relax from taking it. So the guarantee the clamp existed to protect —
   * nobody drawn outside the ring that names them — was bought by breaking the
   * one it stood on: no two plates in a region overlapping.
   *
   * Seated about the origin, relaxed with no ceiling, re-centred on its own
   * centroid, and measured. The ring is then whatever contains the result, so
   * both properties hold by construction rather than by arithmetic. Returns the
   * radius the region's plates reach from its own centre.
   */
  const seatLocal = (group: GNode[], cat: Category): number => {
    const rim = maxRim(group);
    if (group.length < 2) {
      group[0].ax = 0;
      group[0].ay = 0;
      return rim;
    }
    /* Where the relax starts. A phyllotaxis of mixed discs covers about
       SEAT_DENSITY of the area it spans, so the radius that holds these plates
       is √(Σ rim² / density) and the seats themselves sit a plate inside it.
       A starting point only: a poor guess costs passes, not correctness. */
    let area = 0;
    for (const n of group) {
      const e = plateExtent(n);
      area += e * e;
    }
    const spread = Math.max(rim * 0.55, Math.sqrt(area / SEAT_DENSITY) - rim);
    // Sorted by weight so the hub takes the middle seat, spun by category so ten
    // regions do not all present the same silhouette.
    group.sort((p, q) => q.weight - p.weight);
    const spin = hash01(cat) * TAU;
    group.forEach((node, j) => {
      const p = phyllo(j, group.length);
      node.ax = (p.u * Math.cos(spin) - p.v * Math.sin(spin)) * spread;
      // The ring is drawn as a circle; the seating inside it is not squashed to
      // match, or every pair is pulled 14% closer on one axis.
      node.ay = (p.u * Math.sin(spin) + p.v * Math.cos(spin)) * spread;
    });
    relax(group, 0, 0, Infinity);

    // Re-centre. `relax` only knows about pairs, so it is free to translate a
    // whole group — and a region whose seats have drifted off their own centre
    // packs as though it were larger than it is and hangs its caption off a ray
    // solved from the wrong point.
    let mx = 0;
    let my = 0;
    for (const n of group) {
      mx += n.ax;
      my += n.ay;
    }
    mx /= group.length;
    my /= group.length;
    let reach = 0;
    for (const n of group) {
      n.ax -= mx;
      n.ay -= my;
      reach = Math.max(reach, Math.hypot(n.ax, n.ay) + plateExtent(n));
    }
    return reach;
  };

  /** What a region occupies in the packing: everything it draws, plus the black
   *  the next region may not enter. Every group draws a ring now, including the
   *  five that hold one person — a singleton's is simply held further out, so it
   *  cannot be read as a mark on the plate. See RING_MIN_SOLO. */
  const slotOf = (group: GNode[], reach: number): number =>
    Math.max(reach + RING_CLEAR, maxRim(group) * (group.length > 1 ? RING_MIN_FACTOR : RING_MIN_SOLO));

  const box = worldBox(view);
  /* Keep the pack the shape of the frame it is seen in; the camera fits to the
     anchors and the hulls, so the figure is allowed to be larger than one
     screenful of world units — what it may not be is a different aspect.
     The floor is 0.55, not 1. A phone's uncovered rect is 0.54:1 and the old
     `Math.max(1, …)` forbade the pack from ever being taller than it is wide,
     so it packed a disc into a portrait frame: measured at 390×844 before,
     the ten regions covered 66.9% of the width and 32.2% of the height — two
     thirds of a phone screen given to a mode that had run out of shapes it was
     allowed to take. */
  const ar = clamp(box.w / Math.max(1, box.h), 0.55, 1.9);

  const reaches = present.map((c) => seatLocal(groups.get(c)!, c));
  const slots = present.map((c, i) => slotOf(groups.get(c)!, reaches[i]));
  const seats = packCircles(slots, RING_GAP, ar);
  spreadToAspect(seats, slots, ar);

  /* Centre the figure on the union of what is actually drawn, not on the seed
     circle. A pack grows outward from its first seat, so its centre of mass is
     nowhere near the origin — which on the shipped necklace was the difference
     between a composition and a mass shoved into one corner. bounds() in
     GraphCanvas already frames hulls as well as discs, so once the union is
     centred here the camera's fit is the composition's fit. */
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  present.forEach((_, i) => {
    x0 = Math.min(x0, seats[i].x - slots[i]);
    x1 = Math.max(x1, seats[i].x + slots[i]);
    y0 = Math.min(y0, seats[i].y - slots[i]);
    y1 = Math.max(y1, seats[i].y + slots[i]);
  });
  const offX = Number.isFinite(x0) ? (x0 + x1) / 2 : 0;
  const offY = Number.isFinite(y0) ? (y0 + y1) / 2 : 0;
  const centred = seats.map((p) => ({ x: p.x - offX, y: p.y - offY }));

  const clusters: Cluster[] = [];
  present.forEach((cat, i) => {
    const cx = centred[i].x;
    const cy = centred[i].y;

    const group = groups.get(cat)!;
    // Local seats → world. seatLocal solved them about the origin so the pack
    // could be given a measured radius; this is the only place they move.
    for (const node of group) {
      node.ax += cx;
      node.ay += cy;
    }
    // The drawn ring: the plates' reach plus the clearance, which is exactly
    // what the packing reserved. Every region draws one, so the two numbers are
    // the same for all ten and nothing is painted at a radius the pack did not
    // know about.
    const R = slots[i];

    /* ONE CAPTION RULE, for all ten: the point CAPTION_GAP outboard of the
       region's own rim, along the ray out of its centre with the most clear
       black in front of it — which for the nine regions that have an outside is
       the outward ray, and for the one the pack seats in the middle is the widest
       gap between its neighbours. See captionRay. render.ts stands the block off
       along that same ray and runs a leader back whenever the distance grows past
       the point where the eye stops making the connection by itself. */
    const ray = captionRay(i, centred, slots);
    const cap = rimOut(cx, cy, R, R * 0.92, ray.x, ray.y);
    clusters.push({
      key: cat,
      label: caption(strings, strings.category[cat], group.length),
      x: cx,
      y: cy,
      r: R,
      labelX: cap.x,
      labelY: cap.y,
      color: CATEGORY_RING[cat] ?? catColor[cat],
      // No `bare` and no `markR`: ten groups, ten enclosures, one encoding. A
      // set of one is still a set, and the leader now runs to a stroke the
      // reader can see rather than to the phantom radius the packing reserved.
      // See Cluster.bare for why the previous answer was the wrong fix.
      boundary: true,
      solid: true,
      // Ten archetype hues are value-equalised to within 6% of each other so
      // that all ten clear 3:1 as a stroke, which means hue survives only in
      // the 3.2px caption dot and five rings read as one grey. Area at low
      // chroma is far more hue-legible than a hairline at the same chroma, so
      // the identity is spent on the fill and the stroke keeps the equalised
      // value.
      fill: 1.85,
    });
  });

  auditSeats(nodes);

  // A ring that names a trade has to actually contain that trade's people. At
  // anchorK 0.2 the residual link force was dragging hub-adjacent nodes clean
  // out of the ring that labelled them (a Creator sitting on ATHLETE), so the
  // spring is stiffened here and GraphCanvas caps how far a node may stray
  // from its seat while an anchored mode is on.
  return { strength: 0.55, anchorK: 0.34, anchored: true, clusters };
}

/* ── orbit ───────────────────────────────────────────────────────────────
   Ego network. Ring 1 = direct ties ordered by tie strength, ring 2 = friends
   of friends, ring 3 = everyone else pushed to the rim. The rings are ellipses
   fitted to the uncovered canvas, so the outermost one never lands off-frame.

   THE MODE ALWAYS HAS A SUBJECT. It used to return `{strength: 0, anchorK: 0,
   anchored: false, clusters: []}` when nothing was selected, which is not an
   empty state — it is the free web layout with a different tab underlined.
   Measured on the shipped build: `#m=orbit` with no selection published one
   cluster, the web mode's cold band, and covered 36.8% of the frame's width;
   07-orbit.png and 02-graph-default.png are the same picture. One of four
   advertised modes rendered as another one.

   So a mode that needs a centre picks one. The default subject is the most
   connected person in whatever is currently visible — the same node the
   entrance sweep already grows outward from, the same node the rail's
   '가장 얽힌 인물' jump names, and the only choice in this cast a reader would
   not have to be told. Choosing somebody else replaces it; nothing about the
   selected case changes.

   What this file cannot do is say WHOSE orbit the reader is looking at when
   they did not choose — that is a caption, and captions are copy. See the
   HANDOFF above the auto-focus below. */
function orbitLayout(
  nodes: GNode[],
  links: GLink[],
  focusId: string | null,
  strings: LayoutStrings,
  view?: { w: number; h: number },
): LayoutResult {
  for (const n of nodes) n.anchorW = 1;
  /* HANDOFF — src/App.tsx and src/data/i18n/ui.ts, not owned here.
     `4` is still a silent no-op without a selection (App.tsx:281 gates
     `setMode('orbit')` on `atlas.selectedId`) and the Orbit tab is still
     `aria-disabled`. Both can now be opened up: this layout composes for an
     empty selection. When they are, the mode wants one string it does not have
     — an eyebrow naming the auto-chosen subject, e.g. '{name} 중심 / centred on
     {name}', so a reader who did not pick anybody knows whose network they are
     reading. Until then the centre node is identified only by being at the
     centre, which is true but unsaid. */
  const focus =
    (focusId ? nodes.find((n) => n.id === focusId) : null) ??
    (nodes.length ? nodes.reduce((a, b) => (b.weight > a.weight ? b : a), nodes[0]) : null);
  if (!focus) return { strength: 0, anchorK: 0, anchored: false, clusters: [] };

  const strongestTie = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  for (const l of links) {
    const a = l.source.id;
    const b = l.target.id;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
    if (a === focus.id) strongestTie.set(b, Math.max(strongestTie.get(b) ?? 0, l.edge.strength));
    if (b === focus.id) strongestTie.set(a, Math.max(strongestTie.get(a) ?? 0, l.edge.strength));
  }

  const ring1 = nodes.filter((n) => n.id !== focus.id && strongestTie.has(n.id));
  const ring1Ids = new Set(ring1.map((n) => n.id));
  const ring2 = nodes.filter(
    (n) => n.id !== focus.id && !ring1Ids.has(n.id) && [...(adjacency.get(n.id) ?? [])].some((id) => ring1Ids.has(id)),
  );
  const ring2Ids = new Set(ring2.map((n) => n.id));
  const ring3 = nodes.filter((n) => n.id !== focus.id && !ring1Ids.has(n.id) && !ring2Ids.has(n.id));

  const box = worldBox(view);
  const r3x = Math.max(360, box.w / 2 - 96);
  const r3y = Math.max(240, box.h / 2 - 96);
  const r2x = r3x * 0.66;
  const r2y = r3y * 0.66;
  const r1x = r3x * 0.4;
  const r1y = r3y * 0.4;

  focus.ax = 0;
  focus.ay = 0;

  // Ring 1: strongest ties at the top, sweeping clockwise. Radius also
  // shortens with strength so "closeness" is literal.
  //
  // Above eight members a single ring packs the discs shoulder to shoulder and
  // there is nowhere left for a name — the hub's eleven ties left ~30px of gap
  // between 52px discs, so every label was flung a hundred pixels outward with
  // nothing tying it to its node. Past that count the ring splits into two
  // concentric lanes, which halves the angular density on each and gives every
  // label a slot beside the disc it belongs to.
  ring1.sort((a, b) => (strongestTie.get(b.id) ?? 0) - (strongestTie.get(a.id) ?? 0));
  const r1n = ring1.length || 1;
  const split = r1n > 8;
  ring1.forEach((n, i) => {
    const a = (i / r1n) * TAU - Math.PI / 2;
    const s = strongestTie.get(n.id) ?? 1;
    const t = 1 - Math.min(5, s) * 0.05 + (split ? 0.26 * (i % 2) : 0);
    n.ax = Math.cos(a) * r1x * t;
    n.ay = Math.sin(a) * r1y * t;
  });

  const place = (list: GNode[], radiusX: number, radiusY: number, jitter: number) => {
    const c = list.length || 1;
    list.forEach((n, i) => {
      const a = (i / c) * TAU - Math.PI / 2 + hash01(n.id) * 0.22;
      const t = 1 + (hash01(n.id + 'r') - 0.5) * jitter;
      n.ax = Math.cos(a) * radiusX * t;
      n.ay = Math.sin(a) * radiusY * t;
    });
  };
  place(ring2, r2x, r2y, 0.16);
  place(ring3, r3x, r3y, 0.14);

  const r1rx = r1x * (split ? 1.3 : 1.06);
  const r1ry = r1y * (split ? 1.3 : 1.06);
  /* TWO CONCENTRIC RINGS CANNOT BOTH HANG THEIR CAPTION STRAIGHT UP.
   *
   * Both used to sit at `-ry - CAPTION_GAP` on x = 0, and the two ellipses are
   * only 0.14·r3y apart on that axis — measured at 1600×1000, 48 world units,
   * against two caption blocks of ~30 screen px each. So '직접 연결 · 12명' and
   * '한 다리 건너 · 6명' arrived stacked on the same pixels at the top of the
   * figure, and the renderer's collision walk then pushed one of them further
   * out into the frame, where it named neither ring.
   *
   * Split onto opposite diagonals instead, each still exactly CAPTION_GAP
   * outboard of its OWN rim (rimOut solves that for a diagonal as well as for
   * an axis), which puts a full ring-width between them at every viewport and
   * keeps both in the upper half where the ego figure is thinnest. Inner ring
   * up-left, outer ring up-right — a fixed pairing, so the two captions never
   * swap sides between one selection and the next.
   */
  const capL = rimOut(0, 0, r1rx, r1ry, -0.72, -0.7);
  const capR = rimOut(0, 0, r2x, r2y, 0.72, -0.7);
  const clusters: Cluster[] = [
    {
      // Not --blood: the token file reserves crimson for the brand mark and for
      // betrayal, and an ego ring is neither. This is a selection — the warm
      // bone accent is the token built for exactly that.
      key: 'r1',
      label: caption(strings, strings.ring1, ring1.length),
      x: 0,
      y: 0,
      r: r1x,
      rx: r1rx,
      ry: r1ry,
      labelX: capL.x,
      labelY: capL.y,
      color: ACCENT,
      boundary: true,
      solid: true,
      fill: 1,
    },
    {
      key: 'r2',
      label: caption(strings, strings.ring2, ring2.length),
      x: 0,
      y: 0,
      r: r2x,
      rx: r2x,
      ry: r2y,
      labelX: capR.x,
      labelY: capR.y,
      color: INK_LOW,
      boundary: true,
      solid: true,
      // The outer ring is concentric with the inner one, so its fill stacks on
      // top of it — but at 0.35 the band between the two rings was empty black
      // with grey dots in it, and it is 220px of the frame. The two zones are
      // told apart by channel (bone vs ink) and by radius; the outer one is
      // allowed to be a place too.
      fill: 0.9,
    },
  ];

  // Published so the render side can hold ring 1 and ring 2 above the dim
  // floor. Orbit cannot be entered without a selection, so the selection dim is
  // not an edge case here — it is the mode's only state, and it is currently
  // painting the eleven people the ring-2 caption counts at ~8% alpha with no
  // labels at all. See LayoutResult.rings.
  const rings = new Map<string, number>();
  rings.set(focus.id, 0);
  for (const n of ring1) rings.set(n.id, 1);
  for (const n of ring2) rings.set(n.id, 2);
  for (const n of ring3) rings.set(n.id, 3);

  return { strength: 0.72, anchorK: 0.18, anchored: true, clusters, rings };
}
