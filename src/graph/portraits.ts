import { PORTRAITS } from 'virtual:portraits';
import {
  PHOTO_LEVEL,
  PHOTO_RIM_TARGET,
  PHOTO_SEAT_A1,
  PHOTO_SEAT_A1_MAX,
  PHOTO_SEAT_A1_MIN,
  PHOTO_SEAT_BED,
  PHOTO_SEAT_INK,
  PHOTO_SEAT_LUMA,
  PHOTO_TONE_BASIS,
  PHOTO_TONE_MAX,
  PHOTO_TONE_MIN,
  PHOTO_TONE_STRENGTH,
  PHOTO_WALL_TARGET,
  seatAlphaAt,
  seatStops,
} from './plateGeometry';

/**
 * Photographs, when there are any.
 *
 * `public/portraits/<person-id>.<ext>` is a drop-in folder: put a file there and
 * that person's plate carries the picture — on the graph node, the gallery
 * card, the dossier crest and the hover card at once — with the generated
 * plate's rings, season arcs, rim ticks and laurel drawn AROUND it exactly as
 * before. Take the file away and the generated plate comes back. The manifest
 * is built by `tools/vite-plugin-portraits.mjs`, so no id list is maintained by
 * hand and a filename that matches nobody is reported at startup.
 *
 * The folder now holds one for every person, so the photographed plate is the
 * DEFAULT presentation rather than the exception it was written as: no mark is
 * drawn on any node, and the caption under a disc is the whole of its
 * identification. The generated plate is not dead code — removing one file has
 * to bring that person's mark back, and the mark path is still solved for the
 * whole cohort — but nothing in the default view exercises it.
 *
 * ── the two consumers want different things ─────────────────────────────────
 * The SVG plate (`components/Portrait.tsx`) wants a URL — it hands it to an
 * <image> and the browser does the rest. The canvas plate (`graph/plate.ts`)
 * is inside a render loop and cannot await anything, so it wants a decoded
 * bitmap or nothing, this instant. Hence `portraitUrl` and `portraitImage`.
 */

/** Person id → served URL, resolved at build time. Empty when the folder is. */
export const PORTRAIT_URL: Record<string, string> = PORTRAITS;

export function portraitUrl(id: string): string | undefined {
  return PORTRAIT_URL[id];
}

/** True if anybody at all has a photograph — lets a surface skip the whole
    branch, and lets the About sheet say which kind of plate it is showing. */
export const HAS_PORTRAITS = Object.keys(PORTRAIT_URL).length > 0;

/* ── "there IS a picture, it just is not here yet" ──────────────────────────
   `portraitImage` used to answer null for three different situations — nobody
   has a file, the file is still on the wire, and the file failed — and the
   canvas painter reads null as "draw the name mark". So the plate CHANGED KIND
   between two frames on a cold load. Measured on the production build at
   1280×800 dpr2, four runs, with all twenty files present and served: the mark
   was painted for all twenty people across a window of 28ms, 1.04s, 1.08s and
   2.29s after the graph appeared. That is the [minor] "mixed wall of faces and
   initials" and it is the same code path the [blocker] reaches by its other
   two doors.

   So "loading" gets an answer of its own. It is a bitmap the painter can hold
   like any other — a 1×1 transparent canvas — and its identity is the signal:
   `isPortraitPending` says "this person's plate is a photograph that has not
   landed", and the painter draws the seated disc and NO MARK. The kind of
   object never changes; only its contents arrive.

   Null still means what the mark is for, and only that: this person has no file
   (or the one they have could not be decoded), so the generated plate is the
   honest presentation and the mark is its identification. */
let pendingPlateCanvas: HTMLCanvasElement | null = null;
function pendingPlate(): HTMLCanvasElement | null {
  if (pendingPlateCanvas) return pendingPlateCanvas;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  pendingPlateCanvas = c;
  return c;
}

/** True for the one object `portraitImage` returns while a picture is on its
    way. A painter that gets this must not fall back to anything: the plate is
    photographic and its photograph is in flight. */
export function isPortraitPending(img: unknown): boolean {
  return pendingPlateCanvas !== null && img === pendingPlateCanvas;
}

/**
 * What a decoded portrait ends up being.
 *
 * An `ImageBitmap` where the browser has one, and the `HTMLImageElement` it was
 * decoded from otherwise. The bitmap is not an optimisation — see the note over
 * the load callback: a detached `new Image()` is allowed to have its decoded
 * pixels purged under memory pressure, and the plate's whole identification
 * system is one `drawImage` of that bitmap. Verified pixel-identical on this
 * cast: 300×300 × 4 channels × 5 sampled portraits, 0 differing bytes and a max
 * per-channel delta of 0 between the two paths, so nothing in the tone solve
 * moves when the bitmap route is taken.
 */
type Decoded = HTMLImageElement | ImageBitmap;

type Entry =
  | { state: 'loading' }
  | { state: 'ready'; img: Decoded }
  | { state: 'failed' };

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
/** Bumped once per portrait that lands — see `portraitRevision`. */
let revision = 0;

/* ── the tone correction ────────────────────────────────────────────────────
   Why the measurement lives here rather than in the grade: `plateGeometry` holds
   the numbers both painters agree on, and this is not a number — it is a
   property of a FILE somebody dropped in a folder five minutes ago. A table of
   per-person gains would be a second manifest to maintain by hand, and the whole
   point of the drop-in folder is that there is not one. So the picture is asked.

   Cost, measured on the running app: one 64×64 downscale and 4,096 samples per
   portrait for the two exposures, plus one 256×256 pass and a flood fill for the
   backdrop matte — 2.65ms a picture, 53ms for twenty, for the life of the page.
   All of it lands on the decode callback rather than in a paint, and it is one
   callback per portrait rather than twenty in whichever frame first draws the
   cast. The two depths are then solved arithmetically off a few hundred kept
   samples: 0.1ms for all twenty, so the set's median moving costs nothing.

   The edge grow this round adds one more 256² neighbourhood pass. Timed against
   itself on one machine so the two numbers are comparable, the whole of the
   measure-and-matte work went from 12.7ms a picture to 15.3 — +2.6ms, once per
   portrait, on the decode callback, and nothing at all per frame. */

/** Median luma of one picture's FACE, 0–255, once it has been measured — the
    inner disc with the keyed backdrop taken out of it. */
const toneOf = new Map<string, number>();
/**
 * The wall the person was standing in front of — a different photographic
 * accident from how their face was lit, and one that gets its own correction.
 * Flat [t, luma, keyness, …] over PHOTO_TONE_BASIS…PHOTO_SEAT_BED, subsampled.
 *
 * The seat's depth cannot be solved from that band's median alone: its alpha
 * varies by a factor of six across the band, so what a given depth does to the
 * band's median depends on how that picture's brightness is distributed IN
 * RADIUS, not just on one number. A closed form that solved the band's MEAN hit
 * its target exactly on paper and missed the measured median by 35 luma. So the
 * samples are kept and the depth is solved on them. ~360 per picture, which is
 * 20 × 4.3KB for the life of the page, and a median every bit as stable as one
 * over the full 1,100.
 */
const rimSamplesOf = new Map<string, Float32Array>();
/** The keyed backdrop, wherever it falls in the disc rather than in one band:
    the same [t, luma, keyness, …] triples over every pixel the matte claims.
    This is what PHOTO_WALL_TARGET is solved against. */
const wallSamplesOf = new Map<string, Float32Array>();
/** The matte itself, at KEY_PX: PHOTO_SEAT_INK carrying keyness as its alpha,
    so both painters can composite the identical object — the canvas with one
    `drawImage`, the SVG plate with one `<image>`. Null when the picture failed
    the gate and carries no key. */
const keyMaskOf = new Map<string, HTMLCanvasElement | null>();
/** …and the same thing as a URL, for the painter that cannot hold a canvas. */
const keyUrlOf = new Map<string, string | undefined>();
/** Solved seat depths, cleared with `toneTarget` because they depend on it. */
const seatOf = new Map<string, number>();
/** Solved matte depths, cleared with them and for the same reason. */
const keyDepthOf = new Map<string, number>();
/** The set's median of `toneOf`. Null when it has to be re-derived. */
let toneTarget: number | null = null;
/** The canvas painter is handed a decoded bitmap, not an id — see the note over
    `portraitImage`. This is how it gets back to the measurements. */
const idOfImage = new WeakMap<object, string>();

/* ── the backdrop key ───────────────────────────────────────────────────────
   Every one of the twenty files in the folder today was shot against one flat
   pale blue-grey seamless: measured on the decoded sources, the ring's median
   sits at luma 177–214 with a p10–p90 spread of about 16, and it covers 38–51%
   of the disc. That is a matte anybody could pull, and pulling it is the only
   thing that separates a face from the room it was photographed in, because on
   a head-and-shoulders crop the two occupy the same radii — see the seat block
   in plateGeometry for the measurement that killed the radial answer.

   It is pulled at LOAD, on the decoded bitmap, and nothing is written anywhere:
   public/portraits/ is the product owner's only copy of these files and is not
   touched, read-modify-write or otherwise. A file dropped in tomorrow that
   nobody has processed gets keyed the same way on its first paint.

   THE GATE IS THE POINT. A key that fires on a picture with no seamless would
   punch holes in it, so three things have to be true before a matte is kept at
   all — the ring has to be FLAT, it has to be BRIGHTER than the person, and the
   matte it produces has to be a plausible SIZE. Fail any of them and the picture
   carries no key, `photoSeatA1` is the only correction it gets, and the plate is
   exactly what it was before this existed. */

/** The matte's own resolution. Not the source's: the edge a matte cuts along is
    hair, and on a 300px file at 0.4 bpp that edge is already the codec's, so
    resolving it further only sharpens an artefact. 256 is a rung of the grade
    ladder, so the common case blits 1:1, and 20 × 256² × 4 = 5.2MB against the
    43MB the grade cache is already allowed. */
const KEY_PX = 256;
/**
 * THE KEY IS A DIRECTION AND A BRIGHTNESS WINDOW, NOT A COLOUR.
 *
 * The first version of this measured RGB distance from one sampled backdrop
 * colour, and it left a grey shadow standing behind three of the twenty heads:
 * a seamless is lit, so it falls off, and measured on the ring alone the same
 * wall runs from 0.75× to 1.08× of its own median brightness. Widening the ball
 * far enough to catch the dark corners (68) put magenta on 이진형's cheek and
 * 김경훈's chin — skin is only about 46 away from a pale blue-grey, so there is
 * no radius that holds one and not the other.
 *
 * What is constant across a lit seamless is its CHROMATICITY. So the test is
 * the perpendicular distance to the ray through the origin in the key's own
 * direction — "is this that grey, at any level" — and separately a window on
 * how far along the ray the pixel sits — "is this a plausible amount of light".
 * Measured on this cast, the matted backdrop's perpendicular distance has a
 * 99th percentile of 20.3 and the ring's a 90th of 3.75, while skin sits at 46
 * and up; black clothing is 2 away perpendicular and lands at 0.11 along, so it
 * is the window rather than the distance that refuses it.
 *
 * PERP_IN → PERP_OUT is a ramp rather than a threshold, and that is what makes
 * this a matte rather than a cut-out: a strand of hair against the seamless is
 * part backdrop and part hair, its distance lands in the ramp, and it is
 * darkened by exactly that fraction. A hard edge would be the only hard edge in
 * the picture, on 300px sources whose real edges are already the codec's.
 */
const KEY_PERP_IN = 12;
const KEY_PERP_OUT = 32;
/**
 * ── THE EDGE, WHICH IS WHERE THE LAST ROUND'S KEY SHIPPED ITS DEFECT ────────
 *
 * The ramp above is right about a pixel that is PART of the backdrop and wrong
 * about what to DO with it, and the two are easy to confuse. Take a pixel that
 * is a fraction `a` of hair and `1−a` of seamless. Its colour is a·H + (1−a)·W.
 * The ramp scores it at roughly k = 1−a and the painter composites source-over
 * toward the plate's ink at that alpha, which resolves to
 *
 *     a²·H  +  a(1−a)·W  +  (1−a)·Ink
 *
 * — and the middle term is the halo. It peaks at a = ½, where a quarter of a
 * 195-luma seamless is left standing in a ring one pixel wide, against a wall
 * that has been taken to 25. Measured on the shipped build through the real
 * grade, across all twenty: the ring of pixels immediately outside each
 * silhouette sat 11.4–22.5 luma ABOVE that plate's own settled backdrop, and on
 * eight of the twenty it was brighter than the subject it outlined. That is the
 * "badly cut-out sticker".
 *
 * Two things do not fix it, and both were measured rather than reasoned about:
 *
 *   • ERODING the keyness one pixel first (the fix as filed) makes it 2.6×
 *     worse — 31.2–47.4 luma over the backdrop — because erosion hands the
 *     mixed pixels BACK to the picture at their full mixed brightness while the
 *     wall beside them still goes to 25. The crops are unambiguous: it puts a
 *     white rim round every head. Widening KEY_PERP_OUT to 44 does nothing
 *     either way (−0.1 luma) and walks the ramp's outer edge up to within two
 *     units of skin's own perpendicular distance, which is the one thing this
 *     key must never do.
 *   • MULTIPLYING instead of compositing on the ramp band moves the same pixel
 *     from 69 to 63 luma where the honest answer is 22, because the residual is
 *     the wall's own contribution and a multiply cannot remove a sum. It also
 *     cannot be done at all without breaking the promise this module is built
 *     on: components/Portrait.tsx composites the identical mask bitmap with
 *     source-over, so a blend mode that lives in the canvas painter alone is
 *     the same person at two exposures on two surfaces.
 *
 * What does work is to stop producing half-keyed pixels. The matte is GROWN one
 * pixel into the subject and the ramp's outer half is claimed outright, so a
 * boundary pixel is either the room (and goes to the plate's ink) or the person
 * (and is left alone). What that costs is one matte pixel of silhouette — 1.17
 * source pixels, 2.4 device pixels at maximum zoom — off an edge that is hair
 * against a backdrop already taken to within 11 luma of the plate's own ground,
 * which is the cheapest pixel in the picture. Measured after: the same ring
 * sits −11.1 to +1.4 luma of the backdrop (from +11.4…+22.5), and the 99th
 * percentile of "brighter than both the subject and the wall" falls from
 * 20.4–36.4 to 3.0–9.2.
 *
 * Both numbers are held by `tools/assert-visual.mjs` against `__plateProbe`.
 */
/** How far the matte grows into the subject, as a fraction of the disc's
    diameter — one pixel at KEY_PX. Deliberately expressed as a fraction rather
    than a pixel count: `measureBands` pulls the same field at 64, where one
    pixel is four source pixels and a dilation would eat a face. At that size
    this rounds to zero passes, which is the right answer and not an accident. */
const KEY_EDGE_GROW = 1 / KEY_PX;
/** …and how hard the ramp's outer half is claimed. 2 folds the band that used
    to run 12→32 perpendicular into a full key out to 22 and a short ramp after
    it, so the pixels that were being half-composited are composited. Skin sits
    at 46 and up, so this is nowhere near it; measured, the matte's share of the
    disc moves from 0.39–0.52 to 0.39–0.53. */
const KEY_EDGE_GAIN = 2;
/** How far along the key's own direction a pixel may sit and still be the same
    wall, as a multiple of the key's length. The soft margin either side is what
    keeps the window from cutting a visible contour of its own across a falloff. */
const KEY_SCALE_LO = 0.55;
const KEY_SCALE_HI = 1.22;
const KEY_SCALE_SOFT = 0.08;
/** Only a region touching the rim can be the backdrop. Without this, a pale
    grey shirt in the middle of the frame keys as sky and the person loses their
    chest; with it, the matte is the one connected field the camera saw behind
    them. It is also the only thing standing between a stray neutral pixel in
    the middle of a cheek and being matted. */
const KEY_SEED_T = 0.95;
/** …and it has to be a believable amount of the disc. Under this and there was
    no seamless to speak of; over it and the "subject" is a sliver, which means
    the key colour was taken off the person rather than off the wall. */
const KEY_MIN_AREA = 0.08;
const KEY_MAX_AREA = 0.85;
/** How much brighter than the centre of the picture the ring has to be before
    matting it is an improvement. Cheap insurance rather than a live gate: a
    picture shot against something no brighter than the person already solves to
    depth 0, because there is nothing for the solve to take down. */
const KEY_MIN_LIFT = 12;
/** How flat the ring has to be — 90th percentile of the perpendicular distance,
    i.e. does it hold ONE colour, whatever the lighting did to its level. A
    seamless does; a room, a window or a location does not. Measured on this
    cast: 1.95–3.75, so this rejects at roughly three times the worst of them. */
const KEY_MAX_PERP = 12;

function lumaAt(d: Uint8ClampedArray, i: number): number {
  return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
}
function quantile(a: number[], f: number): number {
  return a[Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * f)))];
}

/** What the camera was pointed at behind them, and whether it is keyable. */
interface KeyColour {
  rgb: [number, number, number];
  ok: boolean;
}

/**
 * The backdrop's own colour, off the ring the head does not reach.
 *
 * The upper ring only: a head-and-shoulders crop puts a collar at the bottom of
 * the disc and nothing but wall at the top, so sampling the whole annulus would
 * mix a black jacket into the key and swing its direction off the seamless.
 *
 * Two of the three gates are answered here — is the ring one colour, and is it
 * brighter than the person. The third needs the matte pulled and is in
 * `measureBands`.
 */
function keyColour(d: Uint8ClampedArray, N: number): KeyColour {
  const mid = N / 2;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const ringIdx: number[] = [];
  const ring: number[] = [];
  const core: number[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = Math.hypot(x - mid + 0.5, y - mid + 0.5) / mid;
      if (t > 1) continue;
      const i = (y * N + x) * 4;
      if (t > 0.84 && y < mid * 0.9) {
        rs.push(d[i]);
        gs.push(d[i + 1]);
        bs.push(d[i + 2]);
        ringIdx.push(i);
        ring.push(lumaAt(d, i));
      } else if (t <= 0.35) {
        core.push(lumaAt(d, i));
      }
    }
  }
  if (ring.length < 24 || core.length < 24) return { rgb: [0, 0, 0], ok: false };
  const num = (a: number, b: number) => a - b;
  rs.sort(num);
  gs.sort(num);
  bs.sort(num);
  ring.sort(num);
  core.sort(num);
  const rgb: [number, number, number] = [quantile(rs, 0.5), quantile(gs, 0.5), quantile(bs, 0.5)];
  const len = Math.hypot(rgb[0], rgb[1], rgb[2]) || 1;
  /* Flatness in the sense the key uses: how far the ring strays from its own
     direction, NOT how far its brightness moves. Measuring the second is what a
     first pass did, and it is the wrong question — a seamless is allowed to fall
     off, and on this cast it falls to 0.75 of its median inside the ring alone. */
  const perp: number[] = [];
  for (const i of ringIdx) {
    const along = (d[i] * rgb[0] + d[i + 1] * rgb[1] + d[i + 2] * rgb[2]) / len;
    perp.push(
      Math.hypot(
        d[i] - (along * rgb[0]) / len,
        d[i + 1] - (along * rgb[1]) / len,
        d[i + 2] - (along * rgb[2]) / len,
      ),
    );
  }
  perp.sort(num);
  const lift = quantile(ring, 0.5) - quantile(core, 0.5);
  return { rgb, ok: quantile(perp, 0.9) <= KEY_MAX_PERP && lift >= KEY_MIN_LIFT };
}

/**
 * Per-pixel keyness, 0..1, with everything not connected to the rim thrown away.
 *
 * The flood fill is the difference between a key and a threshold. 이상민 wears
 * pale frames and 최혜선 a pale collar; both sit inside the tolerance and both
 * would have been matted out of the middle of their own faces. Only the field
 * the rim can reach is the room.
 */
function keyField(d: Uint8ClampedArray, N: number, key: readonly number[]): Float32Array {
  const len = Math.hypot(key[0], key[1], key[2]) || 1;
  const kx = key[0] / len;
  const ky = key[1] / len;
  const kz = key[2] / len;
  /* Written for the two early outs and against squared distances rather than
     `Math.hypot`, because this runs 65,536 times per portrait on the decode
     callback and the obvious spelling of it costs 16.8ms a picture — twenty of
     those is twenty dropped frames laid through the cold open, which is the one
     stretch of this app where a dropped frame is the thing being looked at.
     Measured, identical output: 2.65ms. */
  const kn = new Float32Array(N * N);
  const perpOut2 = KEY_PERP_OUT * KEY_PERP_OUT;
  for (let p = 0; p < N * N; p++) {
    const i = p * 4;
    const along = d[i] * kx + d[i + 1] * ky + d[i + 2] * kz;
    const s = along / len;
    if (s <= KEY_SCALE_LO || s >= KEY_SCALE_HI) continue;
    const ex = d[i] - along * kx;
    const ey = d[i + 1] - along * ky;
    const ez = d[i + 2] - along * kz;
    const perp2 = ex * ex + ey * ey + ez * ez;
    if (perp2 >= perpOut2) continue;
    const perp = Math.sqrt(perp2);
    const near = perp <= KEY_PERP_IN ? 1 : (KEY_PERP_OUT - perp) / (KEY_PERP_OUT - KEY_PERP_IN);
    const lit = Math.min(1, Math.min(s - KEY_SCALE_LO, KEY_SCALE_HI - s) / KEY_SCALE_SOFT);
    kn[p] = near * lit;
  }
  const mid = N / 2;
  const seed2 = (KEY_SEED_T * mid) * (KEY_SEED_T * mid);
  const seen = new Uint8Array(N * N);
  const stack: number[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      const dx = x - mid + 0.5;
      const dy = y - mid + 0.5;
      if (kn[p] > 0.25 && dx * dx + dy * dy > seed2) {
        seen[p] = 1;
        stack.push(p);
      }
    }
  }
  while (stack.length) {
    const p = stack.pop() as number;
    const x = p % N;
    const y = (p / N) | 0;
    if (x > 0 && !seen[p - 1] && kn[p - 1] > 0.25) { seen[p - 1] = 1; stack.push(p - 1); }
    if (x < N - 1 && !seen[p + 1] && kn[p + 1] > 0.25) { seen[p + 1] = 1; stack.push(p + 1); }
    if (y > 0 && !seen[p - N] && kn[p - N] > 0.25) { seen[p - N] = 1; stack.push(p - N); }
    if (y < N - 1 && !seen[p + N] && kn[p + N] > 0.25) { seen[p + N] = 1; stack.push(p + N); }
  }
  for (let p = 0; p < kn.length; p++) if (!seen[p]) kn[p] = 0;

  /* ── the edge, grown and claimed — see KEY_EDGE_GROW ──────────────────────
     After the flood fill, not before: the dilation may only grow the ONE field
     the rim can reach. Growing the raw ramp would let a pale collar or a pair of
     pale frames — the two things `keyField`'s own docblock exists to protect —
     spread a pixel of key into the middle of a face. */
  let field = kn;
  const passes = Math.round(N * KEY_EDGE_GROW);
  for (let g = 0; g < passes; g++) {
    const next = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const p = y * N + x;
        let m = field[p];
        const l = x > 0;
        const r = x < N - 1;
        const u = y > 0;
        const dn = y < N - 1;
        if (l && field[p - 1] > m) m = field[p - 1];
        if (r && field[p + 1] > m) m = field[p + 1];
        if (u && field[p - N] > m) m = field[p - N];
        if (dn && field[p + N] > m) m = field[p + N];
        if (l && u && field[p - N - 1] > m) m = field[p - N - 1];
        if (r && u && field[p - N + 1] > m) m = field[p - N + 1];
        if (l && dn && field[p + N - 1] > m) m = field[p + N - 1];
        if (r && dn && field[p + N + 1] > m) m = field[p + N + 1];
        next[p] = m;
      }
    }
    field = next;
  }
  for (let p = 0; p < field.length; p++) {
    const v = field[p] * KEY_EDGE_GAIN;
    field[p] = v > 1 ? 1 : v;
  }
  return field;
}

/** The matte as a bitmap both painters can composite: the seat's own ink,
    carrying keyness as its alpha. Drawn at whatever depth the solve asks for,
    so the bitmap itself never has to be rebuilt when the set's median moves. */
function buildKeyMask(img: Decoded, key: readonly number[]): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = KEY_PX;
  c.height = KEY_PX;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const r = coverRect(img);
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, KEY_PX, KEY_PX);
  let src: ImageData;
  try {
    src = ctx.getImageData(0, 0, KEY_PX, KEY_PX);
  } catch {
    return null;
  }
  const kn = keyField(src.data, KEY_PX, key);
  const n = parseInt(PHOTO_SEAT_INK.slice(1), 16);
  const out = ctx.createImageData(KEY_PX, KEY_PX);
  for (let p = 0; p < kn.length; p++) {
    const i = p * 4;
    out.data[i] = (n >> 16) & 255;
    out.data[i + 1] = (n >> 8) & 255;
    out.data[i + 2] = n & 255;
    out.data[i + 3] = Math.round(kn[p] * 255);
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

/**
 * The two exposures this picture was shot at, as the plate sees them.
 *
 * `coverRect` first, so the numbers describe the square the disc actually shows
 * and not the parts of the frame that get cropped away. Then two bands:
 *
 *   face  the inner PHOTO_TONE_BASIS, which is where a head-and-shoulders crop
 *         puts the face and the only part of the disc the seat leaves flat;
 *   rim   everything from there to the disc's edge, which is the part the seat
 *         covers and is mostly whatever was behind the person.
 *
 * They are corrected by two different mechanisms — a level on the face, a seat
 * depth on the rim — because they are two different accidents. Correcting them
 * with one number is what made the cast wall read as four studios: the level
 * that normalises a dark face also lifts the dark wall behind it.
 *
 * The key crosses both. `face` now takes only the pixels the matte does NOT
 * claim, so the level is solved on a person and not on a person plus however
 * much of their studio happened to fall inside 0.62; and every sample carries
 * its keyness so the two depths below can be solved against the composite the
 * painter will actually lay down rather than against the raw picture.
 *
 * The median rather than the mean in both: one blown window behind somebody's
 * shoulder should not decide how their face is printed, and one black jacket
 * should not decide how deep their seat is.
 *
 * Downscaled to 64×64 first — `drawImage` box-filters on the way down, so this
 * is a cheap area average, and a median of averages is stable where a median of
 * a 300×300 grain field is not. The matte is pulled again at KEY_PX for the
 * bitmap; this one is for the arithmetic, where 64 is plenty and the flood fill
 * is 4,096 cells instead of 65,536.
 */
function measureBands(
  img: Decoded,
): { face: number; samples: Float32Array; wall: Float32Array; key: KeyColour } | null {
  if (typeof document === 'undefined') return null;
  const N = 64;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const r = coverRect(img);
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, N, N);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, N, N).data;
  } catch {
    // A cross-origin file would taint the canvas. The plate still draws it; it
    // just does not get corrected, which is the right failure.
    return null;
  }
  const key = keyColour(data, N);
  const kn = key.ok ? keyField(data, N, key.rgb) : null;

  const faceAll: number[] = [];
  const faceSubject: number[] = [];
  const samples: number[] = [];
  const wall: number[] = [];
  const mid = N / 2;
  let seen = 0;
  let keyed = 0;
  let disc = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - mid + 0.5;
      const dy = y - mid + 0.5;
      const t = Math.hypot(dx, dy) / mid;
      if (t > 1) continue;
      const i = (y * N + x) * 4;
      const k = kn ? kn[y * N + x] : 0;
      /* Luma in the ENCODED domain, not linear light: the grade's level pass is
         a `multiply` and the seat is a source-over composite, both of which act
         on sRGB values, so a gain solved against linear luminance would be the
         wrong size by the transfer curve. */
      const v = lumaAt(data, i);
      disc++;
      if (k > 0.5) {
        keyed++;
        wall.push(t, v, k);
      }
      if (t <= PHOTO_TONE_BASIS) {
        faceAll.push(v);
        if (k <= 0.5) faceSubject.push(v);
      } else if (t <= PHOTO_SEAT_BED && seen++ % 3 === 0) {
        /* Only out to the bed: past it the seat stops being solved and becomes
           the archetype ring's constant floor, and counting the darkest part of
           the annulus as if the solve owned it lets the solve hit its number by
           leaving the part the reader actually sees too bright. Every third, and
           3 does not divide 64, so the stride walks diagonally across the band
           rather than sampling one column of it. */
        samples.push(t, v, k);
      }
    }
  }
  /* The last of the three gates, and the only one that needs the matte pulled
     to answer: a key that claims almost nothing found no seamless, and one that
     claims almost everything took its colour off the person. Either way the
     picture is handed back untouched — including its face median, which goes
     back to being the whole inner disc, because with no matte there is nothing
     to take the wall out with. */
  const area = keyed / Math.max(1, disc);
  const ok = key.ok && area >= KEY_MIN_AREA && area <= KEY_MAX_AREA;
  const face = ok && faceSubject.length >= 16 ? faceSubject : faceAll;
  if (!face.length || !samples.length) return null;
  if (!ok) for (let i = 2; i < samples.length; i += 3) samples[i] = 0;
  face.sort((a, b) => a - b);
  return {
    face: face[face.length >> 1],
    samples: Float32Array.from(samples),
    wall: ok ? Float32Array.from(wall) : new Float32Array(0),
    key: { rgb: key.rgb, ok },
  };
}

/**
 * Per-image luminance correction toward the set's median. 1 when unknown.
 *
 * Multiplies PHOTO_LEVEL, so it is the same operation in both painters — a
 * `multiply` wash on the canvas, the `feFuncR/G/B` slope in the SVG filter — and
 * both must apply it or the same person is two exposures on two surfaces.
 *
 * The target is the median of everyone measured SO FAR, which means it moves as
 * the last few images decode. That is deliberate and it is why `onPortraitLoad`
 * fires on every load rather than on the first: a target derived from three
 * pictures is not the set's, and the canvas has to be told to repaint when it
 * stops being wrong. Twenty small files land inside one entrance animation.
 */
export function photoGain(id: string): number {
  const v = toneOf.get(id);
  if (v === undefined || v <= 0) return 1;
  if (toneTarget === null) {
    const all = [...toneOf.values()].sort((a, b) => a - b);
    toneTarget = all[all.length >> 1];
  }
  const g = Math.pow(toneTarget / v, PHOTO_TONE_STRENGTH);
  return Math.max(PHOTO_TONE_MIN, Math.min(PHOTO_TONE_MAX, g));
}

/**
 * Median luma of a set of [t, luma, keyness] samples once the painter has been
 * over them: the matte at `depth`, then the seat at `a1`.
 *
 * Both are source-over composites toward the SAME ink, so stacking them is one
 * composite at 1−(1−a)(1−b) and the order they are laid down in cannot matter.
 * That is the only reason the two depths can be solved one after the other
 * rather than together.
 *
 * Monotone decreasing in both, which is what lets the two solves bisect.
 */
function seatedMedian(samples: Float32Array, level: number, a1: number, depth: number): number {
  const stops = seatStops(a1);
  const out = new Float64Array(samples.length / 3);
  for (let i = 0, j = 0; i < samples.length; i += 3, j++) {
    const k = depth * samples[i + 2];
    const s = seatAlphaAt(stops, samples[i]);
    const a = k + s - k * s;
    out[j] = (1 - a) * Math.min(255, samples[i + 1] * level) + a * PHOTO_SEAT_LUMA;
  }
  out.sort();
  return out[out.length >> 1];
}

/** Bisect a depth in [lo, hi] onto `target`, given a median that falls as the
    depth rises. Twenty-two halvings resolves 1e-7, which is far finer than the
    quarter-level the target is quoted to; the cost is the median, and these
    sample sets are a few hundred long. */
function solveDepth(lo: number, hi: number, target: number, medianAt: (d: number) => number): number {
  if (medianAt(lo) <= target) return lo;
  if (medianAt(hi) >= target) return hi;
  for (let i = 0; i < 22; i++) {
    const m = (lo + hi) / 2;
    if (medianAt(m) > target) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * How far this picture's backdrop has to come down for it to land on the set's
 * one value. 0 when the picture carries no key.
 *
 * Solved against the matte's own pixels wherever they fall — not against a band
 * — because that is the whole of the change: the thing being corrected is a
 * colour the camera saw, and it is scattered from t = 0.05 to the rim.
 *
 * The seat is held at PHOTO_SEAT_A1_MIN inside the solve rather than at this
 * picture's solved `a1`, and that is not an approximation: a keyed picture's
 * band arrives under PHOTO_RIM_TARGET, so `photoSeatA1` answers exactly that
 * floor for every one of them. Fixing it here is what breaks the circle — the
 * seat's depth is solved against a matte that was solved against the seat.
 */
export function photoKeyDepth(id: string): number {
  const hit = keyDepthOf.get(id);
  if (hit !== undefined) return hit;
  const wall = wallSamplesOf.get(id);
  if (!wall || wall.length < 3) return 0;
  const level = PHOTO_LEVEL * photoGain(id);
  const d = solveDepth(0, 1, PHOTO_WALL_TARGET, (x) =>
    seatedMedian(wall, level, PHOTO_SEAT_A1_MIN, x),
  );
  keyDepthOf.set(id, d);
  return d;
}

/** The matte and the depth it is composited at, or null for a picture that
    carries no key. Both painters take exactly this pair. */
export function photoKey(id: string): { mask: HTMLCanvasElement; depth: number } | null {
  const mask = keyMaskOf.get(id);
  if (!mask) return null;
  const depth = photoKeyDepth(id);
  return depth > 0 ? { mask, depth } : null;
}

/** The same pair for a painter holding the decoded bitmap rather than the id —
    see the note over `photoSeatOf`. */
export function photoKeyOf(img: object | null | undefined): { mask: HTMLCanvasElement; depth: number } | null {
  const id = img ? idOfImage.get(img) : undefined;
  return id === undefined ? null : photoKey(id);
}

/**
 * The matte as a URL, for the SVG plate — which cannot hold a canvas and has to
 * hand an `<image>` something it can fetch.
 *
 * Encoded on demand and kept. Measured on this cast: a 256² PNG of one colour
 * and an alpha channel is 3–10KB and costs about 1.1ms to serialise — worth
 * paying when a card actually mounts, and not worth paying twenty times on the
 * cold open for cards nobody has asked for yet.
 */
export function seatMaskUrl(id: string): string | undefined {
  const hit = keyUrlOf.get(id);
  if (hit !== undefined) return hit;
  const k = photoKey(id);
  /* Only a hit is remembered. A miss here is almost always "the picture has not
     decoded yet" rather than "this picture has no matte" — a card can mount
     inside the cold open — and caching that would freeze the plate on the one
     surface `portraitRevision` exists to wake up. */
  if (!k) return undefined;
  const url = k.mask.toDataURL('image/png');
  keyUrlOf.set(id, url);
  return url;
}

/**
 * How deep this picture's seat has to be for its wall — the band between the
 * face and the archetype ring's bed — to arrive at the set's one value.
 * `PHOTO_SEAT_A1` (the flat constant) when the picture was never measured.
 *
 * The samples are levelled by this picture's own face gain before the solve,
 * because that is the value the seat is actually composited over: the face
 * correction multiplies the wall as well as the face, so two pictures shot
 * against the same wall arrive here at different values if their faces were lit
 * differently. That coupling is the whole reason the seat has to be solved
 * rather than declared — measured, the raw wall band spans 148–208 luma and
 * comes out of the level pass spanning 108–158, the same 50-luma spread on a
 * base a third darker.
 *
 * Twenty-two bisections over ~360 samples, once per picture per move of the
 * set's median. Memoised, because plate.ts asks for this on every node on every
 * frame — it is part of the grade cache's key.
 *
 * The samples are handed to the solve with the matte already on them, so on a
 * keyed picture the band arrives under target and this answers its floor: the
 * backdrop has been dealt with by colour and the only thing left for a radial
 * seat to do is sit the shoulders down. On a picture that failed the key's gate
 * the keyness is zero everywhere and this is the whole correction, unchanged.
 */
export function photoSeatA1(id: string): number {
  const hit = seatOf.get(id);
  if (hit !== undefined) return hit;
  const samples = rimSamplesOf.get(id);
  if (!samples || samples.length < 3) return PHOTO_SEAT_A1;

  const level = PHOTO_LEVEL * photoGain(id);
  const depth = photoKeyDepth(id);
  const a1 = solveDepth(PHOTO_SEAT_A1_MIN, PHOTO_SEAT_A1_MAX, PHOTO_RIM_TARGET, (x) =>
    seatedMedian(samples, level, x, depth),
  );
  seatOf.set(id, a1);
  return a1;
}

/** The same number, for a painter holding the decoded bitmap rather than the id.
    Both entry points exist for the same reason `portraitUrl` and `portraitImage`
    do: the two consumers of this module hold different things. */
export function photoSeatOf(img: object | null | undefined): number {
  const id = img ? idOfImage.get(img) : undefined;
  return id === undefined ? PHOTO_SEAT_A1 : photoSeatA1(id);
}

/**
 * Called once per image that finishes loading.
 *
 * The canvas only repaints when it believes something changed, and an image
 * arriving three hundred milliseconds after the graph settled is exactly the
 * case its motion gate is built to ignore — so the gate has to be told. Without
 * this the photographs appear on the next unrelated interaction, which reads as
 * the app having been broken until you touched it.
 */
export function onPortraitLoad(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * How many portraits have landed. The snapshot for a React subscriber.
 *
 * `photoGain(id)` used to be the snapshot, and it is not one: a store that
 * returns the same number twice does not re-render, so a card mounted during
 * the cold open would keep the plate it first solved even though the picture's
 * MATTE — which arrives on the same event and is a different object entirely —
 * had appeared in the meantime. Every grade this module publishes moves when a
 * portrait lands, so the count of them is the honest version number.
 */
export function portraitRevision(): number {
  return revision;
}

/**
 * A decoded portrait for `id`; `pendingPlate()` while one is on its way; null
 * only when this person has no showable file at all.
 *
 * Safe to call every frame for every node: the first call starts a load, and
 * every call after that is a Map hit. Never throws, never blocks, and never
 * retries a failure — a missing or corrupt file should cost one request for the
 * life of the page, not one per frame.
 *
 * The three answers are three different instructions to the painter and the
 * middle one is new. See the `pendingPlate` block above.
 */
export function portraitImage(id: string): Decoded | HTMLCanvasElement | null {
  const hit = cache.get(id);
  if (hit) {
    if (hit.state === 'ready') return hit.img;
    return hit.state === 'loading' ? pendingPlate() : null;
  }

  const url = PORTRAIT_URL[id];
  if (!url) {
    cache.set(id, { state: 'failed' });
    return null;
  }

  cache.set(id, { state: 'loading' });
  const img = new Image();
  // Same-origin (it is served out of our own public/), but decoding off the
  // main thread is free here and the plate is painted inside a rAF budget.
  img.decoding = 'async';
  img.addEventListener(
    'load',
    () => {
      /* Everything downstream — the two exposure measurements, the matte, and
         every `drawImage` the painters will ever do — runs against whichever
         object this is, and the whole point of the bitmap is that it is the one
         a browser may not quietly throw away. Measured identical to the element
         on this cast; see `Decoded`. */
      const adopt = (src: Decoded): void => {
        cache.set(id, { state: 'ready', img: src });
        idOfImage.set(src, id);
        const bands = measureBands(src);
        if (bands !== null) {
          toneOf.set(id, bands.face);
          rimSamplesOf.set(id, bands.samples);
          wallSamplesOf.set(id, bands.wall);
          /* The matte is pulled here rather than on first paint: it is the one
             expensive thing in this module (a 256² pass, a flood fill and the
             edge grow, ~3ms) and doing it on the decode callback spreads twenty
             of them across twenty separate events instead of stacking them into
             whichever frame first draws the cast. */
          keyMaskOf.set(id, bands.key.ok ? buildKeyMask(src, bands.key.rgb) : null);
          // One more sample moves the set's median, so every gain is now stale —
          // and so is every seat depth, which is solved against a levelled rim,
          // and every matte depth, which is solved against the same level.
          toneTarget = null;
          seatOf.clear();
          keyDepthOf.clear();
        }
        revision++;
        for (const fn of listeners) fn();
      };
      if (typeof createImageBitmap === 'function') {
        // A rejection here is not a failure of the portrait — the element is
        // still perfectly drawable — so it falls through to the element rather
        // than to `failed`.
        createImageBitmap(img).then(adopt, () => adopt(img));
      } else {
        adopt(img);
      }
    },
    { once: true },
  );
  img.addEventListener('error', () => cache.set(id, { state: 'failed' }), { once: true });
  img.src = url;
  return pendingPlate();
}

/**
 * Start every portrait loading now.
 *
 * Twenty small images is a rounding error next to the fonts, and loading them
 * lazily as nodes come into view means the graph visibly changes composition
 * while the reader is looking at it. Called once when the graph is built.
 */
export function preloadPortraits(ids: readonly string[]): void {
  for (const id of ids) if (PORTRAIT_URL[id]) portraitImage(id);
}

/**
 * Source rectangle that fills a square without distorting the picture.
 *
 * This is CSS `object-fit: cover` plus `object-position: 50% 38%`, which the
 * SVG plate gets for free from `preserveAspectRatio="xMidYMid slice"` and the
 * canvas has to be told. Painting the whole image into a square box — which is
 * what a naive `drawImage(img, x-r, y-r, 2r, 2r)` does — stretches a 3:2 press
 * crop by half its width, and a face is the one subject where that is
 * immediately obvious.
 *
 * The vertical bias is not 50%. Portraits put the head in the upper third and
 * the disc is a tight circular crop, so centring the rectangle centres on the
 * chin. 38% keeps eyes near the disc's optical centre for the usual framings
 * and still shows the shoulders.
 */
export function coverRect(
  img: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): { sx: number; sy: number; sw: number; sh: number } {
  const w = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
  const h = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;
  if (!w || !h) return { sx: 0, sy: 0, sw: 1, sh: 1 };
  if (w === h) return { sx: 0, sy: 0, sw: w, sh: h };
  if (w > h) {
    // Wider than tall: take a full-height square, centred horizontally.
    return { sx: (w - h) / 2, sy: 0, sw: h, sh: h };
  }
  // Taller than wide: take a full-width square, biased towards the head.
  return { sx: 0, sy: (h - w) * 0.38, sw: w, sh: w };
}
