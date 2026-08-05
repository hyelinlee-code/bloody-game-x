import { BONE, BRASS, INK_FAINT, INK_HI, INK_LOW, INK_SUB, SEASON_COLOR } from './palette';
import {
  HOST_RING,
  MARK_LEADING,
  PHOTO_LEVEL,
  PHOTO_MAX_UPSCALE,
  PHOTO_SAT,
  PHOTO_SEAT_INK,
  R_DISC,
  R_HOST,
  R_LAUREL_IN,
  R_LAUREL_OUT,
  R_RIM,
  R_SEASON,
  TAU,
  fitMark,
  markLines,
  seasonArcs,
  seatStops,
  seeded,
} from './plateGeometry';
import {
  PORTRAIT_URL,
  coverRect,
  isPortraitPending,
  photoGain,
  photoKey,
  photoKeyOf,
  photoSeatOf,
  portraitImage,
} from './portraits';
import type { GNode } from './types';

/**
 * The portrait plate, painted onto the graph canvas.
 *
 * Every node in the graph view is the same object the gallery card and the
 * dossier crest show: a plate struck from that person's own record. The graph
 * used to draw a reduced, differently-proportioned version of it — equal-length
 * season arcs regardless of finish, no track, no ticks, no host ring — so the
 * disc a reader hovered and the plate that appeared in the hover card were two
 * different pictures of the same person, and only one of them was true.
 *
 * They now share `plateGeometry.ts`, and this file is a faithful canvas port of
 * `components/Portrait.tsx`. If you change an encoding, change it in both or
 * change it in neither.
 *
 * ── why not rasterise the SVG once and blit it ───────────────────────────────
 * Because the plate has to stay sharp through a 0.35–3.2× camera and because
 * the marks are size-dependent: a per-connection tick that is legible on a
 * 200px gallery card is coloured dust on a 30px node, so the plate rolls the
 * ticks up by relationship type there instead of scaling them down. A blitted
 * bitmap can only do the second thing. Painting live also sidesteps the real
 * trap in the blit route — an SVG turned into an <img> does not load web fonts,
 * so every monogram would silently fall back to the system UI face.
 *
 * ── the detail ladder ────────────────────────────────────────────────────────
 * Detail is chosen from the plate's radius ON SCREEN, not in world units, so
 * the decision is made against what the eye actually gets. Zooming in is
 * therefore not just magnification: marks arrive. That is the reward the graph
 * offers for looking closer, and it is why the tiers are cut where a mark stops
 * being readable rather than at round numbers.
 */

/** What the painter needs from a person. Precomputed once in `build.ts` — this
    runs for twenty nodes per frame and must not be doing lookups. */
export interface PlateSpec {
  /** Prior seasons, ascending. */
  seasons: number[];
  /** Best rank in each, aligned with `seasons`; undefined for a run with no
      finish to record (a panel seat, a dealer, a host). */
  ranks: (number | undefined)[];
  /** Field size for each of those runs, aligned. */
  fieldSizes: (number | undefined)[];
  /** One entry per tie, best first, for the rim ticks. Should be meetings only
      — a `parallel` record is by definition not one and the rim tick is the mark
      the legend calls a verified connection — but is not filtered yet; see the
      note over the tick loop in `buildGraph`. */
  ties: { type: string; strength: number }[];
  /** Rolled up by relationship type — what the mid tiers draw instead. */
  tieTypes: { type: string; n: number }[];
  isHost: boolean;
  isWinner: boolean;
  noTies: boolean;
}

/** Must stay in step with render.ts's FONT — the monogram and the name beneath
    it are one lockup and cannot be set in two different faces. */
const PLATE_FONT = `'Pretendard Variable', Pretendard, 'Inter Variable', Inter, -apple-system, 'Malgun Gothic', system-ui, sans-serif`;

export type PlateTier = 0 | 1 | 2 | 3;

/**
 * Which tier a plate of this on-screen radius can carry.
 *
 *   0  under 8px — a dot. Anything inside it is noise, and the ring bands are
 *      sub-pixel, so they alias into a grey halo that reads as blur.
 *   1  8–15px — the disc reads as a disc. Season arcs land, but the track
 *      (1.2 units ≈ 0.5px here) and the 2.6-unit winner cap do not.
 *   2  15–29px — the plate proper: rank-encoded arcs against their track, the
 *      winner's cap, the host hairline, ticks rolled up by relationship type.
 *   3  29px and over — one tick per verified tie in a stable order, the
 *      laurel's rungs, and the etching field.
 */
export function plateTier(screenRadius: number): PlateTier {
  if (screenRadius < 8) return 0;
  if (screenRadius < 15) return 1;
  if (screenRadius < 29) return 2;
  return 3;
}

/* Ring radii as multiples of the subject disc, so the plate is self-similar at
   every node size instead of being an additive stack that crowds the small
   nodes and strands the large ones. */
const M_SEASON = R_SEASON / R_DISC;
const M_HOST = R_HOST / R_DISC;
const M_RIM = R_RIM / R_DISC;
const M_LAUREL_IN = R_LAUREL_IN / R_DISC;
const M_LAUREL_OUT = R_LAUREL_OUT / R_DISC;
/** Tick length and band widths are also in disc units. */
const U = 1 / R_DISC;

function alpha(hex: string, a: number): string {
  const v = Math.max(0, Math.min(1, a));
  if (hex.startsWith('#') && hex.length === 7) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${v})`;
  }
  return hex;
}

export interface PlateDraw {
  /** Disc centre, world units. */
  x: number;
  y: number;
  /** Disc radius, world units. */
  r: number;
  /** Camera scale, for the screen-space decisions. */
  k: number;
  /** Archetype colour. */
  color: string;
  /** 0..1 — brightens every mark and is what a hovered node spends. */
  focus: number;
  /** The mark inside the disc. Empty string draws none. */
  glyph: string;
  /**
   * Font size for the glyph, if the caller has already solved one.
   *
   * There is only one fit rule now and it lives in `plateGeometry`, which
   * measures in a real canvas — so this is a cache slot for a caller that has
   * the number already, not a second opinion. It used to be the *better* of two
   * answers, because the SVG plate estimated the advance from character classes
   * and this one measured it; the estimate is gone and both painters solve the
   * same number from the same function.
   *
   * A caller drawing a whole frame of plates must pass this, because the size is
   * a property of the SET (see `markSet`) and a single plate cannot know it.
   * Zero means that caller has decided this frame carries no mark — the set is
   * under MARK_MIN_PX on screen — and is not the same as leaving it undefined.
   */
  glyphSize?: number;
  /** Horizontal scale for the mark's lines, from the same solve. 1 unless this
      is one of the long marks taking compression instead of shrinking the set. */
  glyphSqueeze?: number;
  spec: PlateSpec;
  /** A photograph from `public/portraits/`, once decoded. Drawn clipped to the
      disc, and the mark steps aside for it — exactly as in the SVG plate.
      Narrower than `CanvasImageSource` because `coverRect` has to read the
      intrinsic size, which SVGImageElement and VideoFrame do not carry. */
  image?: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null;
  /** This picture's own exposure correction — `photoGain(id)` from
      graph/portraits. Passed in rather than looked up because this runs twenty
      times a frame and because the SVG painter reads the same function for the
      same person; see the grade note in plateGeometry. 1 leaves the level
      exactly where PHOTO_LEVEL puts it. */
  imageGain?: number;
  /** Suppress the outer decoration and paint the subject only. Used while a
      plate is still arriving, where the rings would pop in at full strength
      against a disc that is still growing. */
  ringsOnly?: boolean;
}

/* ── the graded photograph, struck into a buffer of its own ──────────────────
 *
 * WHY THE GRADE MAY NOT BE PAINTED STRAIGHT ONTO THE SCENE.
 *
 * The grade is three composited fills, two of them in blend modes. Porter-Duff
 * says a blend-mode source over a backdrop of alpha αb resolves to
 *
 *     Co = (1 − αb)·Cs + αb·B(Cb, Cs)      αo = 1
 *
 * — so where the backdrop is thin, a `multiply` is not a multiply at all: it is
 * an OPAQUE fill of the source colour. render.ts clears the node canvas to
 * transparent (the backdrop is a separate layer beneath it) and paints a
 * de-emphasised node at `appear × (1 − dim × 0.78)` ≈ 0.22, so αb inside the
 * disc was 0.22 and the level pass — a fill of rgb(168,163,157) — landed as an
 * opaque pale puck. Measured through the real painter at that alpha, over the
 * real backdrop: the twenty discs came out at L* 38.3–57.1 against a backdrop of
 * L* 4.5 and an UNDIMMED graded face of L* 29.0–35.5. Every node the app was
 * suppressing was brighter than the node it was pointing at, on every hover,
 * every selection and every path trace.
 *
 * Capturing and restoring `globalAlpha` around the fills would stop them
 * resolving opaque, but it does not fix them: `B(Cb, Cs)` still reads a Cb that
 * has already been mixed with whatever is under the disc, so the picture would
 * be graded against the backdrop instead of against itself, differently at every
 * intermediate alpha of a fade.
 *
 * So the grade is struck where αb is 1 by construction — an opaque offscreen
 * disc — and the scene gets one `drawImage` under the caller's alpha, which is
 * the one operation that means exactly "this, at 22%".
 *
 * ── what it costs ───────────────────────────────────────────────────────────
 * One canvas per (bitmap, exposure, size). The size ladder is powers of two
 * capped at the SOURCE's own square, so a 300px portrait is only ever struck at
 * 32/64/128/256/300 device px — five buffers per person for the life of the
 * page, however far the camera moves, and never an upscale inside the buffer
 * that the final drawImage was not going to do anyway. The rebuild is one
 * drawImage and three fills at ≤300px; a full zoom sweep crosses at most four
 * boundaries.
 */

type PlateImage = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

const gradeCache = new WeakMap<PlateImage, Map<string, HTMLCanvasElement>>();
/**
 * The last buffer that was struck successfully for this bitmap, whatever rung
 * it was struck at.
 *
 * A PLATE THAT HAS EVER BEEN PHOTOGRAPHED MAY NOT GO BACK. `buildGrade` can
 * answer null — `getContext('2d')` returns null when the process is out of
 * canvas memory, and a detached bitmap can lose its intrinsic size — and the
 * old code read that as "no picture this frame", which fell through to the name
 * mark. The two presentations are so far apart that a reader sees a broken load
 * rather than a degradation, so a stale rung of the ladder is strictly better
 * than the truth: it is the same face, one zoom step soft, for the frames it
 * takes the strike to come back.
 */
const lastGrade = new WeakMap<PlateImage, HTMLCanvasElement>();
/** Buffers kept per bitmap: the five rungs of the ladder plus one spare for the
    exposure moving as the last portraits decode. */
const GRADE_KEEP = 6;

/* Counters for `__plateProbe`, which is how tools/assert-visual.mjs asks the
   running app whether the plate has fallen back. Free at rest and free while
   painting; see the probe block at the foot of this file. */
const tally = { marks: 0, pending: 0, photos: 0, strikeFail: 0, lastGood: 0, clamped: 0, maxUpscale: 0 };
/** The seat's ink as an `rgba()` prefix — the stop list carries the alphas. */
const SEAT_RGB = ((n: number) => `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`)(
  parseInt(PHOTO_SEAT_INK.slice(1), 16),
);

function buildGrade(
  image: PlateImage,
  gain: number,
  a1: number,
  key: { mask: HTMLCanvasElement; depth: number } | null,
  px: number,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  const g = c.getContext('2d');
  if (!g) return null;
  const R = px / 2;

  /* The plate's own ground, opaque, under everything — the same warm black the
     drawn disc is filled with, so a picture with a transparent corner or an
     odd aspect still ends on the plate rather than on nothing. This is also the
     opaque backdrop the two blend passes below need. */
  const body = g.createRadialGradient(R - R * 0.32, R - R * 0.44, R * 0.1, R, R, R);
  body.addColorStop(0, '#231e1c');
  body.addColorStop(1, '#110e0b');
  g.fillStyle = body;
  g.fillRect(0, 0, px, px);

  /* Cover, not fill — see `coverRect`. Painting the whole image into the square
     box stretches a 3:2 press crop by half its width, and a face is the one
     subject where that is instantly obvious. */
  const cr = coverRect(image);
  g.drawImage(image, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, px, px);

  /* THE GRADE. Five passes, in this order:

       saturation  the picture's colour stands down so it cannot compete with
                   the four channels the plate already spends colour on;
       multiply    the level comes down to the plate's own ground, carrying this
                   picture's own exposure correction with it. A wash at an alpha
                   would flatten the picture toward one grey; a multiply keeps
                   its ratios and moves the whole curve, which is what a printed
                   plate does to a halftone;
       key         the studio seamless is matted down to the plate's ground, at
                   THIS picture's own depth — the correction that finds the wall
                   by its colour rather than by its radius, which is the only way
                   to find it, because a face and the room behind it are at the
                   same radius. See `photoKey` in graph/portraits.ts;
       seat        the vignette, at THIS picture's own depth, which sits the
                   shoulders down and beds the archetype ring — see
                   `photoSeatA1` and the seat block in plateGeometry;
       punch       and the disc, so the caller can blit without a clip. */
  g.globalCompositeOperation = 'saturation';
  g.globalAlpha = 1 - PHOTO_SAT;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, px, px);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'multiply';
  /* Clamped at 1: a gain above 1/PHOTO_LEVEL would be asking the multiply to
     brighten, which it cannot do — it would silently saturate at white and the
     correction would read as "no correction" for exactly the pictures that
     needed the most. PHOTO_TONE_MAX is well inside that, so the clamp is a
     guard against a future retune rather than a live branch. */
  const lv = Math.round(Math.min(1, PHOTO_LEVEL * gain) * 255);
  g.fillStyle = `rgb(${lv},${Math.round(lv * 0.97)},${Math.round(lv * 0.93)})`;
  g.fillRect(0, 0, px, px);
  g.globalCompositeOperation = 'source-over';

  /* The matte carries the seat's own ink and keyness as its alpha, so the depth
     is the one thing left to spend and `globalAlpha` is exactly the operation
     that spends it. Drawn under the same source-over as the seat below and
     toward the same colour, which is why the two stack to 1−(1−a)(1−b) and the
     solver in graph/portraits can compose them arithmetically. */
  if (key) {
    g.globalAlpha = key.depth;
    g.drawImage(key.mask, 0, 0, px, px);
    g.globalAlpha = 1;
  }

  const seat = g.createRadialGradient(R, R, 0, R, R, R);
  for (const s of seatStops(a1)) seat.addColorStop(s.at, `rgba(${SEAT_RGB},${s.a})`);
  g.fillStyle = seat;
  g.fillRect(0, 0, px, px);

  g.globalCompositeOperation = 'destination-in';
  g.beginPath();
  g.arc(R, R, R, 0, TAU);
  g.fillStyle = '#000';
  g.fill();
  g.globalCompositeOperation = 'source-over';
  return c;
}

/**
 * The graded disc for this bitmap at roughly this size on screen, cached.
 *
 * `deviceDiameter` is how many real pixels the disc will occupy — taken from the
 * context's own matrix, so it already carries both the camera and the display's
 * DPR and cannot drift out of step with either.
 */
function gradedDisc(
  image: PlateImage,
  gain: number,
  deviceDiameter: number,
): HTMLCanvasElement | null {
  /* Not `Math.max(16, …)`. A bitmap whose intrinsic size has gone to zero —
     `coverRect`'s own answer for that is a 1×1 rect — is not a 16px picture,
     it is a picture that is not there this frame, and floor-ing it built a
     16-pixel buffer out of nothing and blitted it over a face. */
  const srcSq = Math.round(coverRect(image).sw);
  if (srcSq <= 1) {
    const kept = lastGrade.get(image);
    if (kept) tally.lastGood++;
    else tally.strikeFail++;
    return kept ?? null;
  }
  const cap = Math.min(512, srcSq);
  let px = 32;
  while (px < deviceDiameter && px < cap) px *= 2;
  px = Math.min(px, cap);

  const a1 = photoSeatOf(image);
  const matte = photoKeyOf(image);
  const key = `${px}|${gain.toFixed(3)}|${a1.toFixed(3)}|${(matte?.depth ?? 0).toFixed(3)}`;
  let byKey = gradeCache.get(image);
  if (!byKey) {
    byKey = new Map();
    gradeCache.set(image, byKey);
  }
  const hit = byKey.get(key);
  if (hit) return hit;

  /* The strike is three composites and a `drawImage` on a source the browser
     owns, so it can fail in ways this file cannot enumerate — and it runs
     inside the render loop, where an exception is twenty blank plates and a
     dead canvas rather than one soft one. */
  let made: HTMLCanvasElement | null = null;
  try {
    made = buildGrade(image, gain, a1, matte, px);
  } catch {
    made = null;
  }
  if (!made) {
    const kept = lastGrade.get(image);
    if (kept) tally.lastGood++;
    else tally.strikeFail++;
    return kept ?? null;
  }
  byKey.set(key, made);
  lastGrade.set(image, made);
  // Insertion-ordered, so the oldest rung of the ladder is the one that goes.
  if (byKey.size > GRADE_KEEP) byKey.delete(byKey.keys().next().value as string);
  return made;
}

/**
 * Paint one plate in WORLD space. The caller owns the transform, the alpha and
 * the save/restore — this function draws and returns.
 */
export function drawPlate(ctx: CanvasRenderingContext2D, d: PlateDraw): void {
  const { x, y, r, k, color, focus, spec } = d;
  const tier = plateTier(r * k);
  /* Hairlines are authored against a 27-unit disc. Below tier 2 they would be
     under a device pixel, so the floor keeps them visible rather than letting
     the browser dither them into a grey wash. */
  const hair = Math.max(r * U * 0.9, 0.75 / k);

  /* ── the subject ────────────────────────────────────────────────────────── */
  /* How many device pixels this disc is about to cover. `getTransform().a`
     carries the camera scale AND the display's DPR, which is the pair that
     decides how big the buffer has to be; `k` alone would strike every plate at
     half size on a retina display. */
  const scale =
    typeof ctx.getTransform === 'function' ? Math.abs(ctx.getTransform().a) || k : k;

  /* A photograph this person HAS but has not received yet is not the same
     situation as a person with no photograph, and the plate may not answer them
     the same way — see `isPortraitPending` in graph/portraits. The disc is
     drawn as the plate's own ground and the mark stands down, so the medallion
     never changes KIND between two frames of a cold load. */
  const pending = isPortraitPending(d.image);
  const source = pending ? null : d.image;

  /* THE UPSCALE CLAMP. `wantDev` is what the camera has asked for; `drawDev` is
     what the source can honestly carry. Only the subject disc is clamped — see
     PHOTO_MAX_UPSCALE — so `rPhoto` is what the picture and the archetype ring
     use and everything else on the plate keeps using `r`. */
  const wantDev = r * 2 * scale;
  const srcSq = source ? Math.round(coverRect(source).sw) : 0;
  const drawDev = srcSq > 1 ? Math.min(wantDev, srcSq * PHOTO_MAX_UPSCALE) : wantDev;
  const photo = source ? gradedDisc(source, d.imageGain ?? 1, drawDev) : null;
  const rPhoto = photo && scale > 0 ? Math.min(r, drawDev / (2 * scale)) : r;

  if (photo) {
    tally.photos++;
    if (rPhoto < r - 1e-6) tally.clamped++;
    if (srcSq > 1) {
      const up = (rPhoto * 2 * scale) / srcSq;
      if (up > tally.maxUpscale) tally.maxUpscale = up;
    }
    /* ONE composite, under whatever alpha the caller set — the grade itself was
       struck opaque, offscreen, where the blend modes behave. See the note over
       `buildGrade`. No clip: the buffer is already a disc. */
    ctx.drawImage(photo, x - rPhoto, y - rPhoto, rPhoto * 2, rPhoto * 2);
  } else {
    if (pending) tally.pending++;
    // Warm black, matching the backdrop and the six surface steps in tokens.css.
    const body = ctx.createRadialGradient(x - r * 0.32, y - r * 0.44, r * 0.1, x, y, r);
    body.addColorStop(0, '#231e1c');
    body.addColorStop(1, '#110e0b');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();
  }

  /* The archetype ring, and the ONLY ring drawn on the picture rather than
     outside it. It was stroked at 0.5 here and at 0.8 in the SVG plate — the one
     surviving place where the two painters of "one object" disagreed, and it was
     the canvas that was wrong: measured against the real photographs at every
     tier, 0.5 read 1.24–1.75:1 against the picture immediately inside it. The
     deepened seat gives it a bed and this gives it its ink back. Focus still
     takes it to full.

     `rPhoto`, not `r`: this ring is the subject disc's own edge — the seat is
     bedded into it and PHOTO_SEAT_EDGE exists to give it its contrast — so when
     the clamp holds the disc, the ring holds with it. It is the only ring on
     the plate that does. */
  ctx.beginPath();
  ctx.arc(x, y, rPhoto, 0, TAU);
  ctx.strokeStyle = alpha(color, 0.8 + focus * 0.2);
  ctx.lineWidth = Math.max(1.6 * r * U * (R_DISC / 27), 1 / k);
  ctx.stroke();

  /* No mark over a face: a photograph IS the identification, and a name set
     across someone's eyes is neither. What that costs is the caption becoming
     compulsory rather than optional for those plates, which `drawLabels` owes
     them — see `mustLabel` in render.ts. */
  const fs = d.glyphSize ?? fitMark(d.glyph, r);
  /* THE MARK IS FOR A PERSON WITH NO PHOTOGRAPH, AND FOR NOBODY ELSE.
     It used to be reached by `!photo`, which is true in three situations and
     only one of them means that: the file has not arrived (now `pending`, and
     handled above), the strike failed (now answered by the last good buffer in
     `gradedDisc`), or there is genuinely no file. Measured on the production
     build before this change, 1280×800 dpr2, all twenty files present and
     served: four runs painted the mark for all twenty people across windows of
     28ms, 1.04s, 1.08s and 2.29s. The count `__plateProbe` reports for it is
     asserted at zero. */
  if (d.glyph && !photo && !pending && tier >= 1 && fs > 0) {
    tally.marks++;
    /* Solved for advance rather than branched on script: a Hangul syllable
       block sets at 0.864em where a Latin `i` sets at 0.257, so one hardcoded
       size blows straight through the ring in one script and floats in the
       other. `markSet` is the SVG plate's rule too — see plateGeometry. */
    const lines = markLines(d.glyph);
    // Canvas takes a font shorthand string, not CSS — a var() here silently
    // fails the whole declaration and leaves the previous font in place.
    ctx.font = `700 ${fs}px ${PLATE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = alpha(INK_HI, 0.82 + focus * 0.18);
    /* The stack is centred on the disc's centre, not hung from it. */
    const lh = fs * MARK_LEADING;
    const top = y + fs * 0.04 - ((lines.length - 1) * lh) / 2;
    const sq = d.glyphSqueeze ?? 1;
    if (sq >= 0.999) {
      lines.forEach((line, i) => ctx.fillText(line, x, top + i * lh));
    } else {
      /* One or two marks in a cohort are too long to reach the set's size at
         their natural width, and the alternative to compressing them is setting
         all twenty at the longest one's size. Scaled about the disc's own centre
         so the stack stays centred; capped at MARK_SQUEEZE where it is solved. */
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(sq, 1);
      lines.forEach((line, i) => ctx.fillText(line, 0, top + i * lh));
      ctx.restore();
    }
  }

  if (d.ringsOnly === true || tier === 0) return;

  /* ── the etching field ──────────────────────────────────────────────────── */
  if (tier >= 3) {
    const rnd = seeded(spec.seasons.join('') + spec.ties.length + d.glyph);
    ctx.fillStyle = color;
    for (let i = 0; i < 22; i++) {
      const a = rnd() * TAU;
      const rr = r * (M_RIM + (5 + rnd() * 18) * U);
      ctx.globalAlpha = (0.05 + rnd() * 0.1) * (0.6 + focus * 0.4);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * (0.35 + rnd() * 0.4) * U, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ── season arcs ────────────────────────────────────────────────────────── */
  const rSeason = r * M_SEASON;
  if (spec.seasons.length === 0) {
    // Franchise newcomer: no history here yet.
    ctx.beginPath();
    ctx.arc(x, y, rSeason, 0, TAU);
    ctx.setLineDash([r * 2.5 * U, r * 4 * U]);
    ctx.strokeStyle = alpha(color, 0.42 + focus * 0.3);
    ctx.lineWidth = hair * 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const arcs = seasonArcs(spec.seasons, spec.ranks, spec.fieldSizes);
    arcs.forEach((s, i) => {
      const ink = SEASON_COLOR[spec.seasons[i] as 1 | 2 | 3] ?? BONE;
      ctx.lineCap = 'round';

      if (s.beaded) {
        /* Present all season, no finish to record. A dash pattern of
           [~0, gap] with a round cap is a bead: the cap draws the dot. */
        ctx.beginPath();
        ctx.arc(x, y, rSeason, s.start, s.start + s.room);
        ctx.setLineDash([0.01, r * 5.2 * U]);
        ctx.strokeStyle = alpha(ink, 0.9 + focus * 0.1);
        ctx.lineWidth = Math.max(r * 2.2 * U, 1.1 / k);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      /* The track. A length is not a quantity until the reader can see what it
         is a fraction OF — and because SPAN_MAX (1.74) is within a quarter of a
         degree of `room` (1.744) for every plate in this cast, the track's own
         cap IS the top of the table. That is why there is no separate end-stop
         mark: it would be a second mark in the same place. */
      if (tier >= 2) {
        ctx.beginPath();
        ctx.arc(x, y, rSeason, s.start, s.start + s.room);
        ctx.strokeStyle = alpha(ink, 0.12 + focus * 0.06);
        ctx.lineWidth = Math.max(r * 1.2 * U, 0.6 / k);
        ctx.stroke();
      }

      /* THE VALUE ARC, at the ink the shared plate strikes it at.
       *
       * It was `0.95 × (0.66 + focus × 0.34)` — 0.627 at rest against the SVG
       * plate's flat 0.95, and with the beaded run above it the only two marks
       * on this plate that did not already match their counterpart at focus 0
       * (the track's 0.12, the host hairline's 0.5, both laurel rings, the
       * newcomer's dash and the cold rim all agree exactly). So a season arc was
       * being drawn at two thirds of its ink on the one surface that shows all
       * twenty at once, and the file's "faithful canvas port" was false for the
       * mark the plate exists to carry.
       *
       * What made it show up now is the picture underneath. Measured against the
       * real photographs: the season-1 arc's ink read L* 24.9 while the disc it
       * annotates reads L* 31 — the finish, which is the plate's one quantity,
       * was DARKER than the subject. Against a near-black drawn disc that
       * inversion did not exist and the 0.627 cost nothing visible. Restored,
       * the worst season arc goes from 1.80:1 on the backdrop to over 3:1, which
       * is the floor palette.ts sets for a graphic that means something. */
      ctx.beginPath();
      ctx.arc(x, y, rSeason, s.start, s.start + s.span);
      ctx.strokeStyle = alpha(ink, 0.95 + focus * 0.05);
      ctx.lineWidth = Math.max(r * (s.won ? 3.2 : 2.6) * U, 1.2 / k);
      ctx.stroke();

      // Two degrees of arc is not a readable difference between 1st and 2nd.
      if (s.won && tier >= 2) {
        const ex = x + Math.cos(s.start + s.span) * rSeason;
        const ey = y + Math.sin(s.start + s.span) * rSeason;
        ctx.beginPath();
        ctx.arc(ex, ey, r * 2.6 * U, 0, TAU);
        ctx.fillStyle = alpha(ink, 0.95);
        ctx.fill();
      }
    });
  }

  /* ── has presided over a season ─────────────────────────────────────────── */
  if (spec.isHost && tier >= 2) {
    // Solid: the dashed language belongs to the newcomer, and two faint dashed
    // circles on one plate is why the two used to be unreadable against each other.
    // HOST_RING rather than BONE: presiding is a role, and the bone/accent
    // register is the state channel. See the note on HOST_RING.
    ctx.beginPath();
    ctx.arc(x, y, r * M_HOST, 0, TAU);
    ctx.strokeStyle = alpha(HOST_RING, 0.5 + focus * 0.3);
    ctx.lineWidth = hair;
    ctx.stroke();
  }

  /* ── connection ticks ───────────────────────────────────────────────────── */
  const rRim = r * M_RIM;
  if (tier >= 2) {
    const list =
      tier >= 3
        ? spec.ties.slice(0, 28).map((c, i, all) => ({
            a: -Math.PI / 2 + (i / Math.max(1, all.length)) * TAU,
            len: 2.6 + c.strength * 0.9,
            w: 1.5,
          }))
        : /* At node size one tick per tie is 1.1px wide and 1.8px long —
             coloured dust, not a count. Roll up by relationship type (never
             more than the types in the data) and spend the saved room on
             weight and length, with the tally carried by how far each reaches. */
          spec.tieTypes.slice(0, 8).map((c, i, all) => ({
            a: -Math.PI / 2 + (i / Math.max(1, all.length)) * TAU,
            len: 4.2 + Math.min(c.n, 4) * 0.5,
            w: 2.6,
          }));

    /* A GAUGE RING, not confetti — two changes, both measured.
     *
     * LENGTH IS CAPPED IN SCREEN PIXELS, the way the dash patterns already are.
     * The ticks were authored in world units at the rim, so they scaled with the
     * camera: at k = 3.1 (fully zoomed in) an 11-tie plate threw eleven 22px
     * coloured spokes standing clear of the ring, adjacent nodes' tick fields
     * interleaved, and a tick at 4 o'clock was indistinguishable from the stub
     * of an edge entering the node — at the exact place a reader looks to trace
     * a relationship. Held between 2.5 and 5.5 screen px the field stays a
     * gauge at every zoom: it grows as the plate grows and then stops.
     *
     * AND THE HUE IS GONE at node scale. A tick's job on the canvas is a COUNT.
     * Carrying EDGE_COLOR made every tick a second, unlegended copy of the edge
     * ramp, drawn 1.5px long in six hues on one plate — which is not a total
     * anyone can read, and is confusable with the lines it borrows from. There
     * is no legend beside a node, so there is nothing here for a hue to be read
     * against; the count is the message and INK_SUB says it once. (The card-size
     * SVG plate keeps the hue-coded tick, because a legend sits next to it.)
     *
     * The unfilled ring under them is what makes the marks countable rather than
     * scattered: ticks now sit ON something, the same way a season arc sits on
     * its track. Only at tier 3, where one tick means one tie. */
    const lenPx = (base: number) => Math.max(2.5, Math.min(5.5, r * base * U * k)) / k;

    if (tier >= 3 && list.length > 1) {
      ctx.beginPath();
      ctx.arc(x, y, rRim, 0, TAU);
      ctx.strokeStyle = alpha(INK_FAINT, 0.5 + focus * 0.25);
      ctx.lineWidth = Math.max(r * 0.7 * U, 0.5 / k);
      ctx.stroke();
    }

    ctx.lineCap = 'butt';
    for (const t of list) {
      const c = Math.cos(t.a);
      const s = Math.sin(t.a);
      const len = lenPx(t.len);
      ctx.beginPath();
      ctx.moveTo(x + c * rRim, y + s * rRim);
      ctx.lineTo(x + c * (rRim + len), y + s * (rRim + len));
      ctx.strokeStyle = alpha(INK_SUB, 0.85 * (0.7 + focus * 0.3));
      ctx.lineWidth = Math.max(r * t.w * U, 1 / k);
      ctx.stroke();
    }
    ctx.lineCap = 'round';
  }

  /* ── nobody yet ─────────────────────────────────────────────────────────── */
  if (spec.noTies && tier >= 2) {
    ctx.beginPath();
    ctx.arc(x, y, rRim, 0, TAU);
    ctx.setLineDash([r * 1.5 * U, r * 5 * U]);
    ctx.strokeStyle = alpha(INK_LOW, 0.62 + focus * 0.25);
    ctx.lineWidth = hair;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* ── the laurel ─────────────────────────────────────────────────────────── */
  if (spec.isWinner) {
    // A different SHAPE rather than a different shade: on the amber archetypes
    // a single brass ring is the same hue, radius and broken-ring reading as a
    // newcomer's dashed season ring.
    if (tier === 1) {
      ctx.beginPath();
      ctx.arc(x, y, r * M_LAUREL_OUT, 0, TAU);
      ctx.strokeStyle = alpha(BRASS, 0.6 + focus * 0.35);
      ctx.lineWidth = hair * 1.1;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r * M_LAUREL_IN, 0, TAU);
      ctx.strokeStyle = alpha(BRASS, 0.5 + focus * 0.3);
      ctx.lineWidth = hair * 0.9;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * M_LAUREL_OUT, 0, TAU);
      ctx.strokeStyle = alpha(BRASS, 0.75 + focus * 0.25);
      ctx.lineWidth = hair;
      ctx.stroke();
      if (tier >= 3) {
        ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          const c = Math.cos(a);
          const s = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(x + c * r * M_LAUREL_IN, y + s * r * M_LAUREL_IN);
          ctx.lineTo(x + c * r * M_LAUREL_OUT, y + s * r * M_LAUREL_OUT);
          ctx.strokeStyle = alpha(BRASS, 0.65 + focus * 0.3);
          ctx.lineWidth = hair * 1.1;
          ctx.stroke();
        }
      }
    }
  }
}

/** Outermost radius a node's plate reaches, world units — what the camera has
    to frame and what the hit-test and collide force have to respect. */
export function plateExtent(n: GNode): number {
  return n.radius * (n.isWinner ? M_LAUREL_OUT : M_RIM + 6 * U);
}

/* ── the probe ──────────────────────────────────────────────────────────────
 *
 * WHY THERE IS A MEASUREMENT HOOK IN THE PAINTER.
 *
 * Both of this round's plate defects were REGRESSIONS shipped by the round that
 * fixed something adjacent, and both of them are numbers: how far the ring of
 * pixels outside a silhouette sits above that plate's own backdrop, and how
 * many times a photographed plate painted a name instead. Neither is visible in
 * a source read and both are cheap to ask the running app. So the app answers
 * them — `tools/assert-visual.mjs` drives the production build and reads this,
 * the same way the screenshot harness reads `__atlasDebug` in GraphCanvas.
 *
 * It measures the REAL painter: `haloOf` strikes the disc through `gradedDisc`,
 * at the same rung, with the same grade, from the same matte. A metric that
 * re-implements the pipeline can only ever assert that the re-implementation is
 * fine, which is how this defect shipped in the first place.
 */

/** Luma by distance from the subject's silhouette, on one graded disc. */
function haloOf(id: string): {
  id: string;
  keyed: boolean;
  px: number;
  /** Median luma of the settled backdrop — six rings clear of any subject. */
  wall: number;
  /** …of the ring one pixel outside the silhouette. THE HALO NUMBER. */
  ring1: number;
  /** ring1 − wall. Positive is a pale fringe; this is what was 11.4–22.5. */
  fringe: number;
  /** 99th centile of "brighter than both the subject it borders and the wall",
      over the three rings outside the silhouette. */
  ridgeP99: number;
  /** Share of the disc the matte claims. The halo is fixed by growing the
      matte, so this is the number that says how far that may go: a matte that
      keeps growing stops being a backdrop and starts being a haircut. */
  keyArea: number;
  prof: number[];
} | null {
  if (typeof document === 'undefined') return null;
  const img = portraitImage(id);
  if (!img || isPortraitPending(img)) return null;
  const px = Math.round(coverRect(img as PlateImage).sw);
  if (px <= 1) return null;
  const matte = photoKey(id);
  const disc = gradedDisc(img as PlateImage, photoGain(id), px);
  if (!disc) return null;
  if (!matte) return { id, keyed: false, px, wall: 0, ring1: 0, fringe: 0, ridgeP99: 0, keyArea: 0, prof: [] };

  const read = (c: CanvasImageSource): Uint8ClampedArray | null => {
    const s = document.createElement('canvas');
    s.width = px;
    s.height = px;
    const g2 = s.getContext('2d', { willReadFrequently: true });
    if (!g2) return null;
    g2.drawImage(c, 0, 0, px, px);
    try {
      return g2.getImageData(0, 0, px, px).data;
    } catch {
      return null;
    }
  };
  const dd = read(disc);
  const kd = read(matte.mask);
  if (!dd || !kd) return null;

  const n = px * px;
  const mid = px / 2;
  const lum = new Float32Array(n);
  const inside = new Uint8Array(n);
  const dist = new Int16Array(n).fill(-1);
  const from = new Float32Array(n);
  let front: number[] = [];
  let discN = 0;
  let keyN = 0;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const p = y * px + x;
      const i = p * 4;
      lum[p] = 0.2126 * dd[i] + 0.7152 * dd[i + 1] + 0.0722 * dd[i + 2];
      /* Out to 0.95 of the radius rather than the whole disc: the last 5% is
         the archetype ring's bed, where the seat is at PHOTO_SEAT_EDGE and
         every pixel is the same ink whatever was photographed there. */
      if (Math.hypot(x - mid + 0.5, y - mid + 0.5) / mid > 1) continue;
      discN++;
      if (kd[i + 3] >= 128) keyN++;
      if (Math.hypot(x - mid + 0.5, y - mid + 0.5) / mid > 0.95) continue;
      inside[p] = 1;
      if (kd[i + 3] <= 38) {
        dist[p] = 0;
        from[p] = lum[p];
        front.push(p);
      }
    }
  }
  const MAXD = 12;
  for (let ring = 1; ring <= MAXD && front.length; ring++) {
    const next: number[] = [];
    for (const p of front) {
      const x = p % px;
      const y = (p / px) | 0;
      const step = (q: number): void => {
        if (inside[q] && dist[q] < 0) {
          dist[q] = ring;
          from[q] = from[p];
          next.push(q);
        }
      };
      if (x > 0) step(p - 1);
      if (x < px - 1) step(p + 1);
      if (y > 0) step(p - px);
      if (y < px - 1) step(p + px);
    }
    front = next;
  }
  const rings: number[][] = [];
  for (let i = 0; i <= MAXD; i++) rings.push([]);
  const far: number[] = [];
  const ridge: number[] = [];
  for (let p = 0; p < n; p++) {
    if (!inside[p]) continue;
    if (dist[p] >= 0) rings[dist[p]].push(lum[p]);
    if (dist[p] < 0 || dist[p] >= 6) far.push(lum[p]);
  }
  const med = (a: number[]): number => {
    if (!a.length) return 0;
    a.sort((x, y) => x - y);
    return a[a.length >> 1];
  };
  const prof = rings.map((a) => +med(a.slice()).toFixed(2));
  const wall = +med(far).toFixed(2);
  for (let p = 0; p < n; p++) {
    if (!inside[p] || dist[p] < 1 || dist[p] > 3) continue;
    ridge.push(lum[p] - Math.max(from[p], wall));
  }
  ridge.sort((a, b) => a - b);
  const p99 = ridge.length ? ridge[Math.min(ridge.length - 1, Math.round((ridge.length - 1) * 0.99))] : 0;
  return {
    id,
    keyed: true,
    px,
    wall,
    ring1: prof[1] ?? 0,
    fringe: +((prof[1] ?? 0) - wall).toFixed(2),
    ridgeP99: +p99.toFixed(2),
    keyArea: +(keyN / Math.max(1, discN)).toFixed(4),
    prof,
  };
}

if (typeof window !== 'undefined') {
  (window as unknown as { __plateProbe?: unknown }).__plateProbe = {
    /** What the painter did since the last `reset`. `marks` is the assertion:
        a plate that has a file may never be painted as a name. */
    stats: () => ({ ...tally, files: Object.keys(PORTRAIT_URL).length }),
    reset: () => {
      tally.marks = 0;
      tally.pending = 0;
      tally.photos = 0;
      tally.strikeFail = 0;
      tally.lastGood = 0;
      tally.clamped = 0;
      tally.maxUpscale = 0;
    },
    halo: (id: string) => haloOf(id),
    haloAll: () => Object.keys(PORTRAIT_URL).map(haloOf).filter(Boolean),
    upscaleCap: PHOTO_MAX_UPSCALE,
  };
}
