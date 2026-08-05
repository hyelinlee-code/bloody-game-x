/**
 * The portrait plate's geometry and encoding, in one place.
 *
 * There are now two painters for the same object: the SVG one in
 * components/Portrait.tsx (gallery cards, dossier crest, hover card) and the
 * canvas one in graph/plate.ts (every node in the graph view). They have to
 * draw the SAME plate — a reader who learns the grammar from a hover card and
 * then reads it off the canvas is relying on that — and two copies of "a first
 * place sweeps 1.74 radians" is a promise nobody can keep across two files.
 *
 * So the numbers, the rank ramp and the mark's fit live here and both painters
 * import them. Neither file may hardcode a radius, a span or a percentage of
 * one: the fit in particular is a property of the SET of plates on screen, not
 * of any one plate, and a painter that solves it locally cannot get it right.
 * `glyphEm` is deliberately not exported for the same reason — the entry points
 * are `markSet` for a frame full of plates and `fitMark` for a lone one.
 *
 * ── the plate's radii ────────────────────────────────────────────────────────
 * Authored in the SVG's units, where the viewBox is 100 wide and the subject
 * disc is 27. The canvas painter divides through by R_DISC to get multiples of
 * a node's own radius, so the plate is the same shape at every node size.
 *
 *   disc → season arcs → host hairline → connection ticks → winner laurel
 */

/** The subject disc. On the graph this is the node's own `radius`. */
export const R_DISC = 27;
/** Where the season arcs and the newcomer's dashed ring sit. */
export const R_SEASON = 34;
/** The bone hairline of someone who has presided over a season. */
export const R_HOST = 37.2;
/** The base of the connection ticks; they grow outward from here. */
export const R_RIM = 40.4;
export const R_LAUREL_IN = 47.5;
export const R_LAUREL_OUT = 49.4;

/**
 * The host hairline's ink. A ROLE, so it may not be drawn in the state channel.
 *
 * It used to be BONE #efe6da at alpha 0.5–0.8. tokens.css and palette.ts both
 * reserve the bone/accent register for state — "Focus / selection / active
 * state / the orbit ego ring" — and BONE sits ΔE 10.9 from ACCENT, which at
 * those alphas over #0b0a0f is perceptually one warm white. The consequence was
 * visible in the default frame with nothing selected: 상민 and 지민 carried a
 * bright warm outer ring and nobody else did, so the app looked like it had
 * opened with two nodes already selected, and a genuinely selected host had no
 * mark left to distinguish it.
 *
 * A cool near-neutral instead — same job, different channel. Measured: ΔE 23.7
 * from ACCENT and 20.7 from BONE (so it can never be read as either), ΔE 47+
 * from BRASS, and >20 from every CATEGORY_COLOR it is drawn beside. Contrast on
 * the canvas backdrop is 10.9:1 at full alpha and 3.42:1 at the 0.5 this is
 * stroked at, i.e. still above the 3:1 floor palette.ts sets for a meaningful
 * graphic while reading as quieter than the archetype ring inboard of it.
 *
 * It lives here rather than in palette.ts because both painters have to agree
 * on it and both already import this module; palette.ts is its proper long-term
 * home once components/Portrait.tsx is switched over to read it from here.
 */
export const HOST_RING = '#bcc0d0';

/* ── the rank ramp ──────────────────────────────────────────────────────────
   Ranks in this dataset run to 13 and season 3's field was 18. A denominator
   of 12 made 13th and 12th draw the same clamped stub while the top of the
   table — the interesting end for this cast — compressed into two degrees. */
export const FIELD_DEFAULT = 13;

/**
 * Radians a first place draws, on every plate.
 *
 * Fixed rather than derived from the slot, so arc length means the same thing
 * whether a person played one season or three. Kept under `slot - SLOT_GAP`
 * for the widest slot in use.
 */
export const SPAN_MAX = 1.74;

/** What is left of the ramp at the bottom of the field. Never zero: a last
    place is still a season played. */
export const SPAN_FLOOR = 0.18;

/** Dead angle between two adjacent slots. Half of it sits either side, so no
    two arcs on a three-season plate can ever touch. */
export const SLOT_GAP = 0.35;

export const TAU = Math.PI * 2;

/**
 * Where a finish sits on the ramp, 0..1.
 *
 * 1 at the top of the table, SPAN_FLOOR at the bottom of the field. Linear, so
 * the difference between 1st and 2nd is the same arc as between 8th and 9th —
 * which is the only reading that lets somebody compare two plates.
 */
export function rankFrac(rank: number, field: number): number {
  const last = Math.max(3, field - 1);
  const f = SPAN_FLOOR + (1 - (rank - 1) / last) * (1 - SPAN_FLOOR);
  return Math.min(1, Math.max(SPAN_FLOOR, f));
}

/**
 * The medallion mark, split into the lines it is set on.
 *
 * The Korean mark is two Hangul syllable blocks — 진호 — which fit a disc on one
 * line because a syllable block is one square. Romanised, the same two
 * syllables are "Jin-ho", and at eight or eleven characters ("Yeon-cheong")
 * one line inside a 30px disc sets at about four pixels.
 *
 * So the Latin mark stacks on its own syllable boundary, which the hyphen
 * already marks: Jin over ho, Yeon over cheong. That is the same mark as the
 * Hangul one — the given name, which is how a Korean person is addressed —
 * arranged the way its own script wants to be arranged. A name with one
 * syllable (Bi, Beom) is one line and needs no rule.
 *
 * Both painters call this. Neither may split on a hyphen itself.
 */
export function markLines(glyph: string): string[] {
  const parts = glyph.split('-').filter(Boolean);
  return parts.length ? parts : [glyph];
}

/* ── fitting the mark ───────────────────────────────────────────────────────
   The two painters have to arrive at the same font size for the same mark, and
   for two rounds they did not even aim at the same target: the SVG plate solved
   `(R * 1.62) / glyphEm(glyph)`, i.e. 81% of the disc diameter, while the
   canvas plate solved `(r * 2 * 0.62) / measuredAdvance`, i.e. 62%. Measured on
   this cast at R = 27: 진호 set at 21.6 units in the card and 19.4 on the
   canvas (−10.4%), and 'hyun' set at 21.6 in the card against 14.3 on the
   canvas (−51%) — the same person's mark, in two sizes, on two surfaces this
   file's own docblock says are one object.

   The round after that the canvas was switched onto `fitMark` and the SVG plate
   was not, so the same three literals were still being re-implemented inline in
   components/Portrait.tsx and only the canvas ever saw a cohort. Measured on the
   cast wall, where all twenty are side by side: 'Bi' set at 25.5 CSS px next to
   'Seung/jin' at 17.2 and 'Yeon/cheong' at 14.6 — a 74% spread across discs of
   identical diameter, which does not read as three names, it reads as one of
   them being broken.

   So the fit is solved HERE, once, both painters call `markSet`, and NEITHER
   may hold a span, a radius or a percentage of its own. */

/**
 * How far into the disc the mark's ink may reach, as a fraction of the radius.
 *
 * The rule used to be two independent budgets — 81% of the DIAMETER for the
 * widest line, 76% of it for the stack's height — and a disc is not a box, so
 * neither budget described the room a line actually has. A stacked line does not
 * sit at the centre: the top line's cap was about 0.74r above it, where the
 * available half-chord is r·√(1−0.74²) = 0.67r, i.e. 1.34r of width against the
 * 1.62r the width rule granted. 허성범's 'Seong' ran out onto the coloured ring
 * at 3 and 9 o'clock on his gallery card, which on a plate whose whole point is
 * precision reads as a fitting error.
 *
 * One rule replaces both: every line's ink box has four corners, and the
 * furthest of them must land inside `MARK_INSET × r`. That is the actual shape
 * of the container, so it cannot grant width the circle does not have — and
 * because it stops charging the stack for the em box's empty leading, it also
 * gives back about 18% of size that the two-budget rule was throwing away.
 */
export const MARK_INSET = 0.95;
/**
 * Ink height of one line, in em — ascender to descender in this face at weight
 * 700, near enough for both scripts (Hangul fills its box; Latin's 0.76 ascent
 * plus 0.22 descent lands in the same place).
 */
export const MARK_INK = 0.98;
/** Leading between the lines of a stacked mark, in em. A name broken on its own
    syllables is one word broken for fit, so it wants to read as a single block. */
export const MARK_LEADING = 0.92;
/** Ceiling as a fraction of the RADIUS, for the short marks ('Bi', 윤비) that
    would otherwise solve larger than the disc has any business carrying. */
export const MARK_MAX_R = 0.8;
/**
 * The most a line may be compressed horizontally to reach the cohort's size.
 *
 * The escape valve that lets the clamp be a percentile instead of a minimum:
 * one or two long marks take up to 12% of horizontal scale rather than dragging
 * the other eighteen down with them. 12% is where a compressed line stops being
 * readable as the same face as its neighbours — measured against the uncompressed
 * form at node size, the stem weights part company beyond about 15%.
 */
export const MARK_SQUEEZE = 0.88;
/**
 * Where in the cohort the one size is taken from, as a quantile of the fits.
 *
 * Not the minimum. Taking the smallest answer across twenty marks let the single
 * widest — 'Yeon-cheong' at 3.53em, against 1.73em for the widest Hangul pair —
 * set every English mark at 57% of its Korean counterpart. At the 15th centile
 * three marks need help and seventeen are set at a size the widest one was
 * costing them; the three take `MARK_SQUEEZE` instead.
 */
export const MARK_PCTL = 0.15;
/**
 * Screen pixels below which a mark is not a mark.
 *
 * The floor this replaces was `Math.max(7, …)` in WORLD units, so it scaled with
 * the camera and not with the eye: at k ≈ 0.5 it bottomed out at 3.5 CSS px, and
 * on a phone with the dossier open (k ≈ 0.15) at about one. A two-line bold
 * stack at that size is a texture, not an identification, and it was being drawn
 * under a caption set at 12.5.
 *
 * So the decision is made in the units the eye gets — `size × k` — and it is
 * made for the WHOLE cohort at once. A frame where six discs carry a mark and
 * fourteen do not reads as a bug; a frame with none of them reads as the zoom it
 * is, and the marks come back on the way in, which is what the plate's detail
 * ladder already promises everywhere else.
 *
 * 7.5 rather than a number chosen to sound safe: the camera's own resting scale
 * moves between 0.53 and 0.78 run to run (it is still correcting itself after
 * the reveal — a separate defect), and a floor inside that band would turn the
 * English marks on and off between two loads of the same page, which is worse
 * than either answer. This one sits below the band, so it fires on a deliberate
 * zoom-out and never on arrival.
 */
export const MARK_MIN_PX = 7.5;

/**
 * Advance of one character at 1em, at the weight the plate mark is set in.
 *
 * The estimate this replaces charged a flat 0.5em to every a–z character, which
 * is wrong by a factor of 1.76 across the alphabet: measured in Pretendard
 * Variable at weight 700, `i` is 0.257 and `m` is 0.879. Compounded over a
 * run it under-measured 'hyun' by 16.9% and 'Yeon-cheong' by 17.8% — so the
 * SVG plate, which divides by this number, set those marks ~17% too large and
 * ran them into the disc's own stroke — while over-measuring 'Bi' by 30% and
 * every Hangul pair by 9.9%, so those were set too small in the same frame.
 *
 * A table cannot be as right as a measurement, so it is the fallback rather
 * than the answer: `measureLine` below uses a real canvas when there is a DOM
 * and this table when there is not (the data validator imports this module
 * under node). The two agree to within 4.6% on every mark in this cast, worst
 * case 'Yeon' — the table sums advances and cannot see the Ye kern pair.
 */
const ADVANCE: Record<string, number> = {
  a: 0.557, b: 0.611, c: 0.564, d: 0.611, e: 0.574, f: 0.367, g: 0.608,
  h: 0.6, i: 0.257, j: 0.257, k: 0.558, l: 0.257, m: 0.879, n: 0.598,
  o: 0.59, p: 0.608, q: 0.608, r: 0.39, s: 0.539, t: 0.37, u: 0.597,
  v: 0.563, w: 0.819, x: 0.551, y: 0.563, z: 0.549,
  A: 0.718, B: 0.636, C: 0.724, D: 0.701, E: 0.588, F: 0.563, G: 0.733,
  H: 0.719, I: 0.266, J: 0.548, K: 0.663, L: 0.546, M: 0.883, N: 0.71,
  O: 0.753, P: 0.623, Q: 0.753, R: 0.632, S: 0.63, T: 0.643, U: 0.704,
  V: 0.718, W: 0.999, X: 0.686, Y: 0.696, Z: 0.641,
};
/** One Hangul syllable block. Square by design, but not 1em: 0.864 in this
    face, which is why the old 0.95 estimate set every Korean mark 10% small. */
const ADVANCE_HANGUL = 0.8643;
const ADVANCE_OTHER = 0.45;

function estimateLine(line: string): number {
  let w = 0;
  for (const ch of line) {
    if (ch >= '가' && ch <= '힣') w += ADVANCE_HANGUL;
    else w += ADVANCE[ch] ?? ADVANCE_OTHER;
  }
  return w;
}

/** Must stay in step with plate.ts's PLATE_FONT and render.ts's FONT — a
    measurement taken in a different face is worse than the table. */
const MARK_FONT = `700 100px 'Pretendard Variable', Pretendard, 'Inter Variable', Inter, -apple-system, 'Malgun Gothic', system-ui, sans-serif`;

/** The primary face alone, for `document.fonts.check` — MARK_FONT carries its
    own fallbacks, and a check against a stack with `system-ui` in it is true on
    the first frame of every session and therefore says nothing. */
const MARK_FACE = `700 100px 'Pretendard Variable'`;

let measureCtx: CanvasRenderingContext2D | null | undefined;
const advanceCache = new Map<string, number>();
let generation = 0;
let faceReady = false;

/**
 * Has the real face landed yet — and, if it just did, bump the generation.
 *
 * The measurement used to be taken the moment a DOM existed, i.e. against
 * whatever the browser was substituting at the time, and cached. That was
 * survivable while both painters re-fitted every mark on every render: the
 * cache was dropped on `document.fonts.ready` and the next frame read the
 * corrected number. A COHORT is solved once, though, and memoised — so a set
 * solved a beat early stayed wrong. Measured on the running app: the substitute
 * sets a Hangul syllable at 1.19–1.68em where Pretendard sets it at 0.864, so
 * the default frame drew the whole cast at 0.54r instead of 0.8r and only
 * healed when the reader happened to zoom.
 *
 * So a substituted measurement is not taken at all: the ADVANCE table is what
 * the fallback path is for, it is within 4.6% of the real face on every mark in
 * this cast, and it is the same answer for all twenty — which is the property
 * the cohort actually depends on. `check` rather than `ready` because `ready`
 * waits on the whole document's font work and resolved several seconds into the
 * session here, long after the plates were first painted.
 */
function faceLoaded(): boolean {
  if (faceReady) return true;
  if (typeof document === 'undefined' || !document.fonts?.check) return false;
  faceReady = document.fonts.check(MARK_FACE);
  if (faceReady) generation++;
  return faceReady;
}

/** Increments once, when the real face arrives. Anything caching a SOLVED
    cohort has to re-solve when it changes. */
export function markGeneration(): number {
  faceLoaded();
  return generation;
}

function measureLine(line: string): number {
  if (!faceLoaded()) return estimateLine(line);
  const hit = advanceCache.get(line);
  if (hit !== undefined) return hit;
  if (measureCtx === undefined) {
    measureCtx = null;
    if (typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
  }
  let w: number;
  if (measureCtx) {
    measureCtx.font = MARK_FONT;
    w = measureCtx.measureText(line).width / 100 || estimateLine(line);
  } else {
    w = estimateLine(line);
  }
  if (advanceCache.size < 512) advanceCache.set(line, w);
  return w;
}

/**
 * Half-width and centre offset of each line of a mark, in em.
 *
 * Both painters set the stack centred on the disc's centre, so line `i` of `n`
 * sits `(i − (n−1)/2) × MARK_LEADING` em off it. The furthest corner of a line's
 * ink box is what the disc has to contain, and it is that corner — not the
 * line's width and the stack's height separately — that the fit is solved
 * against. See MARK_INSET.
 */
function lineBoxes(glyph: string, squeeze: number): { hw: number; dy: number }[] {
  const lines = markLines(glyph);
  const half = (lines.length - 1) / 2;
  return lines.map((line, i) => ({
    hw: (Math.max(0.6, measureLine(line)) * squeeze) / 2,
    dy: Math.abs(i - half) * MARK_LEADING + MARK_INK / 2,
  }));
}

/** Distance from the disc centre to the furthest ink corner of a mark, per em. */
function cornerEm(glyph: string, squeeze: number): number {
  let worst = 0;
  for (const b of lineBoxes(glyph, squeeze)) worst = Math.max(worst, Math.hypot(b.hw, b.dy));
  return Math.max(0.3, worst);
}

/**
 * Font size for ONE mark inside a disc of radius `r`, on its own.
 *
 * This is the size the mark would take if it were the only plate on screen. It
 * is not what either painter draws — see `markSet`, which is what a frame full
 * of plates has to use — but it is the ceiling every member of a set is capped
 * by, and it is the right answer for a lone plate (the dossier crest, a hover
 * card, a palette row).
 */
export function fitMark(glyph: string, r: number, squeeze = 1): number {
  return Math.min(r * MARK_MAX_R, (r * MARK_INSET) / cornerEm(glyph, squeeze));
}

/** One mark and the disc it has to fit inside. */
export interface MarkSpec {
  glyph: string;
  /** Disc radius, in whatever units the caller draws in. */
  r: number;
}

/** What one member of a solved cohort is struck at. */
export interface MarkCut {
  /** Font size, in the caller's units. 0 when the set carries no mark at all. */
  size: number;
  /** Horizontal scale its lines are set at — 1 for all but the outliers. */
  squeeze: number;
}

export interface MarkSet {
  /** The one size this set is struck at, before any per-disc capping. */
  size: number;
  /** How this member reaches it. */
  cut(glyph: string, r: number): MarkCut;
  /** False when `size × k` is under MARK_MIN_PX — the whole set stands down. */
  legible(k: number): boolean;
}

/**
 * THE COHORT CLAMP — one size for every plate in a frame.
 *
 * Twenty plates are on screen at once and a mark is read as a set, not one at a
 * time, so the thing that has to be constant is the SIZE, not the fraction of
 * the disc each mark happens to fill. The previous attempt at this took the
 * smallest answer across the cohort but evaluated it at EACH NODE'S OWN RADIUS,
 * which equalises the fraction and not the size — and node radius encodes
 * degree, so it varies 24 to 41. Instrumented on the running app that came out
 * as 11.0–16.3 CSS px in English and 19.4–28.4 in Korean in one frame, a 46%
 * spread, against a caption set at a constant 12.5. The docblock claimed the
 * opposite. The measurement is the one that was right.
 *
 * Two changes make the claim true:
 *
 *   • the set is solved ONCE, at every member's real radius, and every member
 *     is then handed the same number (capped only where a disc is physically too
 *     small to carry it, which is the one variation a reader reads as the disc
 *     being small rather than the mark being broken);
 *   • the number is a QUANTILE of the members' own fits rather than the minimum
 *     of them, so the one longest name cannot set the size of the other
 *     nineteen. What the longest name gets instead is MARK_SQUEEZE.
 *
 * Measured on this cast, English: the set went from 11.14–18.60 world units (a
 * 67% spread, and 57% of the Korean size) to 12.67–15.26 (a 20% spread, and 78%
 * of the Korean size), with exactly two marks — 'Yeon-cheong' and 'Seung-yong' —
 * taking the full compression and one ('Kyung-hoon') taking 3%. Korean went from
 * 19.44–32.46 (a 67% spread) to 19.44–19.64, i.e. 1%.
 */
export function markSet(specs: readonly MarkSpec[]): MarkSet {
  const solos = specs
    .filter((s) => s.glyph && s.r > 0)
    .map((s) => fitMark(s.glyph, s.r))
    .sort((a, b) => a - b);

  /* Linear-interpolated quantile. With twenty marks MARK_PCTL lands between the
     third and fourth smallest, so three of them are asked to compress and
     seventeen are set at a size the widest was costing them. */
  let size = 0;
  if (solos.length === 1) size = solos[0];
  else if (solos.length > 1) {
    const p = MARK_PCTL * (solos.length - 1);
    const i = Math.floor(p);
    size = solos[i] + (solos[Math.min(solos.length - 1, i + 1)] - solos[i]) * (p - i);
  }

  return {
    size,
    legible: (k: number) => size * k >= MARK_MIN_PX,
    cut(glyph: string, r: number): MarkCut {
      if (!glyph || size <= 0) return { size: 0, squeeze: 1 };
      const solo = fitMark(glyph, r);
      if (solo >= size) return { size: Math.min(size, r * MARK_MAX_R), squeeze: 1 };

      /* This mark cannot reach the set's size at its natural width. Solve the
         horizontal scale that would put its furthest corner exactly on the
         inset circle at that size — hypot(hw·q, dy) = r·MARK_INSET / size — and
         take the tightest answer across its lines. */
      const c = (r * MARK_INSET) / size;
      let q = 1;
      for (const b of lineBoxes(glyph, 1)) {
        if (b.hw <= 0) continue;
        q = Math.min(q, Math.sqrt(Math.max(0, c * c - b.dy * b.dy)) / b.hw);
      }
      q = Math.max(MARK_SQUEEZE, Math.min(1, q));
      /* At the floor the mark may still not reach `size`; then it is set at what
         it does reach, which is at worst MARK_SQUEEZE's worth below the set —
         near enough that the frame still reads as one size. */
      return { size: Math.min(size, fitMark(glyph, r, q)), squeeze: q };
    },
  };
}

/* ── seating a photograph ───────────────────────────────────────────────────
   Both painters can carry a photograph inside the subject disc, and both have to
   grade it the same way or the same person is two different values on two
   surfaces.

   THE REFERENCE HAS CHANGED, and that is what this block is now about.

   The grade was tuned when two sample tiles sat among eighteen drawn plates, so
   the only question was whether a photographed disc outshouted its drawn
   neighbours, and the answer was written down as a target: land the photograph's
   median "inside one value step of the drawn plate's #231e1c→#110e0b body". All
   twenty people now carry a real photograph. There is no drawn disc left on
   screen to be measured against, that target would put twenty faces at L* 5–12
   where a face stops being one, and the claim was false anyway: measured on the
   running app through the real painter, the graded disc's median is L* 35.2
   (min 29.2, max 37.8, at r = 22) against the drawn body's L* 4.8–11.8. The
   target is retired rather than met.

   What replaces it is the question twenty photographs actually ask, which is
   whether they agree with EACH OTHER. Twenty sources means twenty exposures:
   measured over the disc crop before grading, the per-image median luma spans
   140.5–197.7 across the whole disc and 90.9–167.3 over the inner 62% — the
   band a head-and-shoulders crop puts the face in and the band the seat below
   leaves flat. After grading, that came out as an inner-disc median of L* 24.6
   to 44.5, a 20.0 spread: side by side on the cast wall, half the set reads as
   lit and half as standing in shadow.

   So the grade gains a fourth step, ahead of the other three: a per-image
   luminance correction toward the set's own median, measured from the picture
   rather than declared (see `photoGain` in graph/portraits.ts). It is
   deliberately PARTIAL — see PHOTO_TONE_STRENGTH. Faces are supposed to differ;
   exposures are not.

   The correction is folded into the LEVEL rather than baked into the bitmap, and
   that is not an implementation detail: every one of these twenty pictures has a
   95th-percentile luma of 196–219 out of 255, so a gain applied to the pixels
   would clip the top of eight of them, while `PHOTO_LEVEL × gain` never exceeds
   0.825 and therefore cannot clip anything.

   ── AND A FIFTH, because a face is not the only thing in a photograph ────────
   That correction measures the inner PHOTO_TONE_BASIS — the FACE — and it works:
   measured through the real painter across all twenty, the graded face lands at
   L* 29.0–35.5, a spread of 6.5. Everything outside it is whatever wall the
   person happened to be standing in front of, and nothing was correcting that at
   all. Measured on the same twenty plates, over the band between the face and
   the archetype ring's bed: L* 27.5–39.8, a spread of 12.3 — twice the faces'.
   So the loudest value difference on the cast wall was which studio took the
   picture, not who is in it: the light half read as pale coins and the dark half
   as holes, which is exactly what a reader is being asked to read focus and dim
   off.

   The face correction cannot fix it and makes it proportionally worse, because
   the level multiplies the wall as well as the face: the raw wall band spans
   148–208 luma and comes out of the level pass spanning 108–158 — the same
   50-luma spread on a base a third darker.

   So the seat — which was a constant vignette — becomes the second half of the
   tone correction: its depth is solved per picture, from that picture's own
   pixels, so every plate's wall arrives at one value. See PHOTO_RIM_TARGET and
   `photoSeatA1` in graph/portraits.ts. Measured after: L* 23.1–24.0, a spread of
   0.9, with the faces still at 29.0–35.5.

   ── AND A SIXTH, because A RADIUS IS NOT A SUBJECT ───────────────────────────
   That was measured on the annulus 0.62–0.90, and measuring it there was how the
   round hit its number and still shipped the defect underneath. The seat is flat
   at PHOTO_SEAT_A0 everywhere inside PHOTO_SEAT_IN, and the inside of a
   head-and-shoulders crop is not a head: keyed against each picture's own
   backdrop and measured through this painter at r = 150, the STUDIO WALL inside
   t = 0.62 read luma 101.6–142.1 against the faces beside it at 57.3–75.5. The
   ratio of a face to the wall next to it was 0.42–0.66 on all twenty — the room
   was half again to twice as bright as the person in it, on every plate, and
   that is what made the cast wall read as twenty grey coins with a dark smudge
   in the middle rather than twenty faces coming out of the dark.

   A DEEPER, EARLIER VIGNETTE CANNOT FIX IT, and it is worth writing down why so
   the next round does not spend itself finding out again. Measured, with
   PHOTO_SEAT_IN pulled to 0.20 and PHOTO_SEAT_A0 raised to 0.35 — the obvious
   two-constant answer — the wall does land where it is asked to (24.2–28.5 luma)
   and the defect survives: face-to-inner-wall came out 0.70–1.11, i.e. still at
   or under parity on sixteen of the twenty, while the faces themselves fell from
   L* 24.1–32.1 to 12.9–18.5. A vignette is a function of RADIUS, and on a
   head-and-shoulders crop the face and the wall occupy the same radii — the
   cheek at t = 0.4 and the seamless at t = 0.4 are the same pixel to it. Buying
   one costs the other, at parity, forever.

   The wall is not a radius, it is a COLOUR: every one of these twenty was shot
   against one flat pale blue-grey seamless (keyed medians 177–214 luma, and the
   ring is flat to within ~16 luma p10–p90). So the seat gains a per-pixel term
   that is keyed rather than solved on t — see `photoKey` in graph/portraits.ts.
   The backdrop is matted toward the plate's own ground at a depth solved from
   that picture's own pixels, exactly the way the radial depth already was, and
   the face is not touched at all because the face is not the key colour.

   THE ORIGINALS ARE NOT PROCESSED AND MUST NOT BE. public/portraits/ is the
   product owner's only copy and this runs on the decoded bitmap at load, so a
   file dropped in tomorrow that nobody has ever looked at gets the same
   treatment — and a file with no keyable backdrop (the ring is not flat, or is
   not brighter than the subject, or the matte comes out absurdly large or small)
   fails the gate, carries no key at all, and is seated by the radial solve
   exactly as it was before. The drop-in folder stays dumb.

   The six passes, in order: correct, desaturate, drop the level, matte the
   backdrop to the set's value, seat what is left, and only then let the
   archetype ring cross it.

   Both painters run all six. components/Portrait.tsx paints the key as the same
   mask bitmap the canvas composites (`seatMaskUrl`) and builds `#pseat` from
   `seatStops(photoSeatA1(id))` — which also lands the handoff that stood here
   for a round: the flat three-stop gradient it used to build put the same band
   at L* 21.3–30.6 against the canvas's 23.1–24.0, i.e. the same person at two
   exposures on the two surfaces this file's own docblock calls one object.
   PHOTO_SEAT_A1 survives only as the depth of an unmeasured picture. */

/** Saturation kept. A press crop's colour is the loudest thing it brings to a
    near-monochrome frame, and the plate has four colour channels of its own. */
export const PHOTO_SAT = 0.78;
/**
 * Level the graded image is multiplied by — sRGB, so luminance falls by about
 * this to the 2.4. Below ~0.55 the face stops being a face, which is the other
 * failure and the more expensive one.
 *
 * 0.70 → 0.66 for one measured reason: the per-image correction lifts the
 * pictures that were shot dark, and the brightest decile of a lifted disc had
 * gone to L* 59.9 — inside two points of the brass laurel at 61.8, which the
 * palette reserves as the only gold in the app. At 0.66 the same decile lands at
 * 54 and the laurel is the brightest thing on the plate again.
 *
 * The per-image gain multiplies THIS, so the product — 0.53 to 0.83 on this cast
 * — is what any one plate is actually printed at, and the low end of that looks
 * like a violation of the ~0.55 floor above. It is not: a level below 0.6 is only
 * ever handed to a picture measured brighter than the set, and measured after
 * grading, the most-darkened plate of the twenty (0.835 × 0.66 = 0.551) sits at
 * the TOP of the set's inner-disc range at L* 35.3, not the bottom.
 */
export const PHOTO_LEVEL = 0.66;

/**
 * The fraction of the radius the per-image tone correction is measured over.
 *
 * Not the whole disc. A photograph's outer ring is mostly whatever was behind
 * the person, and normalising on it corrects backgrounds rather than faces:
 * measured across all twenty, correcting on the whole-disc median took the
 * whole-disc spread from L* 7.4 to 4.0 and left the FACES at 16.9 — barely
 * moved from the 20.0 they started at. Measured on this band instead, the faces
 * close to 6.0. It is the same 0.62 the seat holds flat, which is not a
 * coincidence: the region the vignette does not touch is exactly the region
 * whose exposure the reader is comparing.
 *
 * The band is not the whole of it, though: 38–51% of these discs is backdrop,
 * and a good third of that sits INSIDE this radius, so a median taken here was
 * a median of a face and the room behind it in unknown proportion. Now that the
 * key knows which pixels are which, the wall is dropped from the measurement —
 * see `measureBands`. Measured through this painter, that alone took the graded
 * faces from a 5.4-luma spread to 4.7 and stopped the two people photographed
 * closest to their seamless being read as brighter than they are.
 */
export const PHOTO_TONE_BASIS = 0.62;
/**
 * How much of the correction to apply, as an exponent on the ratio.
 *
 * 1.0 would make every median identical, and identical is wrong: a face that
 * was genuinely shot darker should stay the darker of the twenty. At 0.75 the
 * spread closes from L* 20.0 to 6.0 and the ORDER survives — the darkest face
 * in the set is still the darkest afterwards (L* 30.6) and the lightest still
 * the lightest (36.6). At 1.0 with a wide clamp it collapses to 1.5, which is
 * twenty faces pretending to have been shot in one room.
 */
export const PHOTO_TONE_STRENGTH = 0.75;
/** The correction's bounds. A picture more than a quarter-stop off the set is
    a picture the folder should not have been given; past these the plate stops
    trying to rescue it, because a gain large enough to fix it is also large
    enough to clip the highlights or bury the shadows. Measured on this cast,
    exactly two of twenty reach a bound. */
export const PHOTO_TONE_MIN = 0.8;
export const PHOTO_TONE_MAX = 1.25;

/**
 * Where the rim seat starts, as a fraction of the radius. Everything inside it
 * is held at A0 — the centre alpha is not zero, and that is the whole of "grade
 * the disc, not the rim".
 *
 * It is PHOTO_TONE_BASIS, and the two must move together: the band whose
 * exposure the face correction measures is the band the vignette is forbidden to
 * touch, or the correction would be solving against a value it then changes. It
 * was pushed out to 0.75 in the round that first put real photographs on every
 * node, to steepen the last quarter and hand the archetype stroke a bed. That
 * bought the stroke its contrast and cost the set its backgrounds: with the ramp
 * only starting at 0.75, the band from 0.62 to 0.75 — which on a head-and-
 * shoulders crop is almost entirely wall — sat at A0, i.e. ungraded, so a white
 * seamless stayed white. The bed is now bought by PHOTO_SEAT_EDGE instead, which
 * costs the last 6% of the radius rather than the outer third of the picture.
 *
 * The obvious reading of the defect this round closed is that these two should
 * come apart and this one should drop to about 0.2. They should not, and it is
 * the same reason as ever — the correction may not measure a band it then
 * changes — plus a measured one: pulled to 0.2 with A0 at 0.35, the wall lands
 * on target and the face-to-inner-wall ratio still comes out 0.70–1.11 (see the
 * seat block above). What was wrong was not where the ramp started; it was that
 * a ramp on t was being asked to find a subject. The key finds the subject, and
 * this goes back to meaning what it says: everything inside is the picture.
 */
export const PHOTO_SEAT_IN = PHOTO_TONE_BASIS;
/** Alpha over the face band. */
export const PHOTO_SEAT_A0 = 0.1;
/**
 * The seat's depth for a picture nobody has measured.
 *
 * It used to be the flat outer alpha components/Portrait.tsx built its own
 * three-stop gradient from, and that handoff has landed: both painters now take
 * `seatStops(photoSeatA1(id))`. What is left is the honest fallback — a caller
 * holding a bitmap this module never measured (a cross-origin file, which taints
 * the canvas and cannot be sampled, or an `imageUrl` passed in over the folder's
 * own) still needs a seat, and 0.9 is roughly where the solve lands a picture
 * shot against a normal wall.
 */
export const PHOTO_SEAT_A1 = 0.9;
/**
 * How much of the room between PHOTO_SEAT_IN and the rim the rise spends, so the
 * seat reaches its solved depth before the rim rather than at it.
 *
 * The obvious shape — a straight line from PHOTO_SEAT_IN to the edge — cannot be
 * both smooth where it starts and deep by mid-annulus. A smoothstep compressed
 * into the first 70% is deep by 0.83r and still leaves the picture untouched at
 * 0.62: on a plate solved to A1 0.60 the alpha runs 0.10 at t 0.620 → 0.14 at
 * 0.664 → 0.23 at 0.709 → 0.35 at 0.753 → 0.47 at 0.797 → 0.56 at 0.842 → 0.60
 * at 0.886. There is no step anywhere in it, which a power curve steep enough to
 * reach the same depth would have put right at PHOTO_SEAT_IN — a visible ring
 * around every face.
 */
export const PHOTO_SEAT_EASE = 0.7;
/**
 * Where the solved seat ends and the archetype stroke's BED begins.
 *
 * Outboard of this the seat stops belonging to the picture and belongs to the
 * ring, so this is also where the solve's band stops: `photoSeatA1` is asked to
 * land the wall between PHOTO_SEAT_IN and here on one value, and what happens
 * outside it is a constant. Solving over the bed as well is what broke the ring
 * the first time this retune was measured — the bed is the darkest part of the
 * annulus, so counting it let the solve leave the visible wall brighter and
 * still hit its number, and the stroke's contrast against the picture inside it
 * fell from 2.49–2.93:1 to 2.09–2.63:1.
 */
export const PHOTO_SEAT_BED = 0.9;
/**
 * The alpha at the disc's own edge — the bed the archetype ring is stroked into.
 *
 * The one part of the seat that is NOT solved from the picture, because a ring
 * saying which archetype somebody belongs to has to be legible on the lightest
 * plate in the set as well as the darkest. 1 rather than a near-value: the
 * archetype stroke is the only ring drawn ON the photograph instead of outside
 * it, it spans t = 0.970–1.030, and every OTHER ring on the plate is stroked
 * against the plate's own ground. Taking the picture all the way out at the rim
 * is what makes this one the same object as those.
 *
 * Measured over all ten archetype hues × all twenty faces, the WORST pairing's
 * stroke-against-the-picture-inside-it goes from 2.49:1 to 2.96:1 — which is at
 * the 3:1 floor palette.ts sets for a graphic that means something rather than
 * clear of it, and is the reason this is 1 and not 0.9. The seat that shipped
 * before the photographs measured 1.24–1.75:1 for the same pairing.
 */
export const PHOTO_SEAT_EDGE = 1;
/** Bounds on the solved depth. Guards, not tunings: a picture shot against
    something genuinely darker than the plate's own ground wants no seat at all,
    and the edge segment above still gives the ring its bed. Measured on this
    cast the solve answers 0.581–0.777, so neither bound is live. */
export const PHOTO_SEAT_A1_MIN = 0.42;
export const PHOTO_SEAT_A1_MAX = 1;
/**
 * The one value every plate's wall is seated to: the MEDIAN encoded luma of the
 * band PHOTO_SEAT_IN…PHOTO_SEAT_BED after seating, 0–255.
 *
 * Encoded luma and not linear light, for the same reason the tone correction
 * works there: the seat is a source-over composite of sRGB values, so a target
 * in linear light would be the wrong size by the transfer curve.
 *
 * The median rather than the mean, and that is not a detail — it is the first
 * thing this retune got wrong. A closed form solved the band's MEAN and hit it
 * exactly on paper; measured back through the real painter the medians came out
 * 35 luma below it and no better converged, because the seat's alpha varies by a
 * factor of six across the band and the two statistics stop tracking each other.
 * So the solve runs on the same statistic that is reported, over the picture's
 * own pixels — see `photoSeatA1` in graph/portraits.ts.
 *
 * 57 sits below where any of the twenty already were, and deliberately.
 * Measured before, that band ran L* 27.5–39.8 — luma 66 to 96 — and the whole
 * complaint is that the light end reads as a lit wall. Landing the set on its
 * own median would keep half of them there; landing it under the dark end puts
 * every plate at the value the plate's own ground and the backdrop are arguing
 * for. It cannot go much lower: under about 45 the shoulders leave the picture
 * and twenty faces float in twenty holes — and THAT is the whole reason this
 * number cannot also be the wall's. A radial seat deep enough to bed a 200-luma
 * seamless takes the shoulders with it, because it cannot tell them apart.
 *
 * So this is now the SECOND stage and the fallback one. On a keyed picture the
 * backdrop has already been taken to PHOTO_WALL_TARGET before this band is
 * measured, so the solve finds it under target and answers PHOTO_SEAT_A1_MIN —
 * a plain vignette on the shoulders, which is all that is left to do. On a
 * picture that fails the key's gate this is unchanged and is the only thing
 * holding that plate's wall to the set's value, which is why it stays.
 */
export const PHOTO_RIM_TARGET = 57;
/**
 * The one value every plate's BACKDROP is matted to: median encoded luma of the
 * keyed pixels, 0–255, after the key and the seat have both been composited.
 *
 * The same statistic and the same domain as PHOTO_RIM_TARGET, and solved the
 * same way (`photoKeyDepth` in graph/portraits.ts bisects on the picture's own
 * sampled wall) — the two differ only in which pixels they are asked about.
 *
 * 25 rather than 57 because this one is not paying for the shoulders. The
 * constraint that held PHOTO_RIM_TARGET up — a radial seat deep enough to bed
 * the wall also buries the subject at the same radius — does not exist for a
 * term that only fires on the backdrop's own colour, so the number can be set
 * from what the plate wants instead of from what the vignette can survive: the
 * plate's body runs #231e1c → #110e0b, i.e. luma 32 down to 14, and 25 puts the
 * room the person was photographed in inside that range rather than 40 luma
 * above it. Measured through this painter across all twenty, the wall lands at
 * 24.3–25.6 luma (L* 8.5–9.1) under faces held at their existing 57.1–75.7
 * (L* 24.0–32.2) — a face-to-wall ratio of 2.30–3.02 where it was 0.42–0.66,
 * with no face darker than it was before.
 *
 * It is not 14. Taking the seamless all the way to the plate's ground reads as
 * a cut-out pasted on a disc — the edge of the matte becomes the only edge in
 * the picture, and on 300px sources at 0.4 bpp that edge is where the codec's
 * artefacts live. 25 leaves the room a few levels above the plate, which is
 * enough for a shoulder to be seen leaving the frame and not enough for anyone
 * to read it as lit.
 */
export const PHOTO_WALL_TARGET = 25;
/** The seat's ink — the plate's own ground, so the picture ends where the plate
    begins rather than at a grey. */
export const PHOTO_SEAT_INK = '#110e0b';

/**
 * The most a photograph may be enlarged past its own resolution, as a multiple
 * of the SOURCE square's device pixels.
 *
 * The files in the folder today are 300×300. At the camera's top scale the
 * subject disc reaches ~608 device pixels, which is a 2.03× upsample: measured
 * on those plates, skin goes plastic, the codec's blocking becomes visible on a
 * forehead, hair strands smear, and eyelashes leave. What makes it unmissable
 * rather than merely soft is that everything drawn AROUND the picture — the
 * archetype ring, the season arcs, the rim ticks, the caption — is vector work
 * and stays hairline-crisp at any zoom. A soft photograph inside a perfect ring
 * reads as a broken asset; the same photograph inside a ring system that has
 * visibly outgrown it reads as a cap.
 *
 * So past this multiple the SUBJECT DISC stops growing and everything outboard
 * of it carries on. The archetype ring goes with the disc, because it is the
 * disc's own edge and the only ring drawn ON the picture; the season arcs, the
 * host hairline, the tick gauge, the laurel and the caption keep their places
 * against the node's real radius, so the plate's outer geometry — which the
 * camera, the hit test and the collide force all read — does not move at all.
 *
 * 1.35 rather than 1: a modest upsample is what every photograph on every
 * screen already survives, and stopping at 1.0 would cap the disc a full zoom
 * step earlier for no visible gain. Measured against these sources it holds the
 * disc at 405 device px, which is 2/3 of what the top of the zoom would have
 * asked for and the point at which the WebP's own artefacts are still under a
 * device pixel.
 *
 * It is a multiple of the SOURCE and not a constant number of pixels, and that
 * is the part that matters next: the day 600×600 files land in the folder the
 * cap doubles to 810 device px on its own, the clamp stops firing anywhere in
 * the camera's range, and nothing here is edited.
 */
export const PHOTO_MAX_UPSCALE = 1.35;

/** One stop of the seat gradient: `at` is a fraction of the disc radius. */
export interface SeatStop {
  at: number;
  a: number;
}

function smoothstep(u: number): number {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
}

/**
 * The seat, as a stop list both painters can build their own gradient from.
 *
 * Canvas takes these straight to `addColorStop`; the SVG plate takes them to
 * `<stop offset stopOpacity>`. Neither may hold a radius or an alpha of its own —
 * a vignette that differs between the node and the gallery card is the same
 * person at two exposures, which is the defect this whole block exists to close.
 */
/** Segments the rise is sampled into. A gradient interpolates linearly between
    stops, so this is how faithfully the smoothstep is carried: at six the worst
    departure from the curve is 0.017 of alpha, about 2 luma on a band across
    which the seat itself moves 80. At three it was 0.056, which is a visible
    flat spot a third of the way up. */
const SEAT_SEGMENTS = 6;

export function seatStops(a1: number): SeatStop[] {
  const end = PHOTO_SEAT_IN + PHOTO_SEAT_EASE * (1 - PHOTO_SEAT_IN);
  const room = end - PHOTO_SEAT_IN;
  const dA = a1 - PHOTO_SEAT_A0;
  const stops: SeatStop[] = [{ at: 0, a: PHOTO_SEAT_A0 }];
  // The rise, from PHOTO_SEAT_IN (where it is still flat at A0) to the solved
  // depth, then a hold across to the bed, then the ring's floor at the rim.
  for (let i = 0; i <= SEAT_SEGMENTS; i++) {
    const u = i / SEAT_SEGMENTS;
    stops.push({ at: PHOTO_SEAT_IN + room * u, a: PHOTO_SEAT_A0 + dA * smoothstep(u) });
  }
  stops.push({ at: PHOTO_SEAT_BED, a: a1 });
  stops.push({ at: 1, a: Math.max(a1, PHOTO_SEAT_EDGE) });
  return stops;
}

/** The seat's alpha at a fraction `t` of the radius, off a solved stop list.
    Both painters build a gradient from `seatStops`; this is for the solver,
    which has to evaluate the same curve on a few hundred sampled pixels. */
export function seatAlphaAt(stops: readonly SeatStop[], t: number): number {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].at) {
      const p = stops[i - 1];
      const q = stops[i];
      return q.at === p.at ? q.a : p.a + ((q.a - p.a) * (t - p.at)) / (q.at - p.at);
    }
  }
  return stops[stops.length - 1].a;
}

/** Encoded luma of a #rrggbb, Rec.709 — the same weighting the band measurement
    in graph/portraits.ts uses, because the two numbers are compared. */
function lumaOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}
/** What the seat composites TOWARD. The solve needs it; the painters take the
    ink itself. */
export const PHOTO_SEAT_LUMA = lumaOf(PHOTO_SEAT_INK);

/** Stable 0..1 stream from a string — the same person always draws the same. */
export function seeded(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/**
 * The arc a single season run draws, resolved from the record.
 *
 * `beaded` is the case the plate exists to get right: a run with no rank — a
 * studio-panel seat, a dealer, a host — is NOT a bottom-of-table finish, and
 * drawing it as the shortest arc on the plate said the opposite of the truth.
 * It takes the whole slot as beads instead: present all season, no finish to
 * record.
 */
export interface SeasonArc {
  /** Where the slot starts, radians, 0 = 3 o'clock. */
  start: number;
  /** How much of the circle this slot owns, minus its gap. */
  room: number;
  /** How much of `room` the finish fills. 0 when beaded. */
  span: number;
  beaded: boolean;
  won: boolean;
}

/**
 * Lay out one plate's season arcs.
 *
 * `count` is at least 3 so a one-season plate does not draw a single arc
 * sweeping the whole circle — the slot is a unit of measure, and it has to be
 * the same unit on every plate for two plates to be comparable.
 */
export function seasonArcs(
  seasons: readonly number[],
  ranks?: readonly (number | undefined)[],
  fieldSizes?: readonly (number | undefined)[],
): SeasonArc[] {
  const slot = TAU / Math.max(3, seasons.length);
  const room = slot - SLOT_GAP;
  return seasons.map((_, i) => {
    const start = -Math.PI / 2 + i * slot + SLOT_GAP / 2;
    const rank = ranks?.[i];
    if (!rank || rank < 1) return { start, room, span: 0, beaded: true, won: false };
    const span = Math.min(room, SPAN_MAX * rankFrac(rank, fieldSizes?.[i] ?? FIELD_DEFAULT));
    return { start, room, span, beaded: false, won: rank === 1 };
  });
}
