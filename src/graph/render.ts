import { BRASS, EDGE_DASH, INK_HI, INK_LOW, INK_MID, alpha, mix } from './palette';
import { drawPlate, plateExtent } from './plate';
import { markGeneration, markSet, type MarkSet } from './plateGeometry';
import { PORTRAIT_URL, photoGain, portraitImage } from './portraits';
import { PROBES } from '../probe';
import type { Cluster } from './layout';
import type { GLink, GNode, Viewport } from './types';

/**
 * Canvas painter. Two coordinate systems on purpose:
 *   • shapes are drawn in world space (they scale with zoom),
 *   • text is drawn in screen space (it never blurs or shrinks below legible).
 * That split is most of the difference between "a d3 demo" and something that
 * feels designed.
 */

export interface RenderState {
  nodes: GNode[];
  links: GLink[];
  clusters: Cluster[];
  view: Viewport;
  /**
   * The viewport the camera is flying to, or `view` when it is not flying.
   *
   * The label solver needs it. During a mode change the discs are in transit
   * and the camera is in transit with them, so solving slot assignment against
   * live positions re-solves against a different picture every frame — names
   * blink out mid-flight and land in placements that exist in no frame before
   * or after. Solved against the *destination* instead (anchors under this
   * viewport), the assignment is computed once and each name then rides its own
   * disc at a fixed offset for the whole transit. See `settling`.
   */
  viewTo: Viewport;
  width: number;
  height: number;
  dpr: number;
  /** Screen-space area covered by chrome; the composition centres on the rest. */
  insets: { top: number; right: number; bottom: number; left: number };
  /**
   * Client rects of the FLOATING cards — hover card, edge card, path card —
   * when any of them is mounted.
   *
   * `insets` describes the four walls (rail, dossier, top bar, status bar) and
   * the label solver treats them as absolute obstacles for the reason quoted at
   * `chromeBoxes`: a label painted under a panel is not a shorter label, it is
   * a name cut in half. The cards are not insets, so the solver has never known
   * they are there, and every hover silently destroys one to three names on a
   * canvas where the caption is the whole of a node's identification.
   *
   * HANDOFF — GraphCanvas.tsx: the painter's half is done (they are pushed into
   * `placed` before CHROME_N is taken, so a seat under a card already scores
   * Infinity). What is missing is the publisher: measure the mounted card's
   * client rect — HoverCard, EdgeCard and PathCard are all absolutely positioned
   * DOM, so `el.getBoundingClientRect()` minus the canvas's own origin — and
   * pass the list here on the RenderState it already builds. One rect per card
   * per frame, no new geometry. Undefined until then, and the solver behaves
   * exactly as it does today.
   */
  cards?: Box[];
  time: number;
  hoverId: string | null;
  selectedId: string | null;
  /** Keyboard cursor — a node the user is standing on but has not opened. */
  cursorId: string | null;
  /** 0..1 master fade for the whole scene (used by the intro). */
  reveal: number;
  /**
   * 0..1 — how far the anchor spring has ramped in. Cluster hulls and captions
   * are the scaffolding of the arrangement the nodes are flying to, so they
   * bloom on this rather than appearing the frame React commits the mode.
   */
  regionAlpha: number;
  /**
   * The current mode seats every node inside a named region (by-season,
   * by-archetype, orbit). Two things follow from it, and both are about the
   * canvas speaking two languages at once rather than one:
   *
   *   • the relationship language stands back — resting link alpha is
   *     attenuated, because a region boundary and a dashed edge were the same
   *     ink and the Euler diagram had no organising device left;
   *   • the label policy changes — the positions are known ahead of time and
   *     the whole point of the mode is *who is in each set*, so the solver
   *     places all twenty deliberately instead of greedily dropping collisions.
   */
  anchored: boolean;
  /** The anchored arrangement is still in transit. See `viewTo`. */
  settling: boolean;
  /**
   * Ego-ring membership by id, published by orbitLayout. The zoom ramp treats
   * ring 1 and ring 2 as important, so the caption that counts ten people is
   * not pointing at ten unnamed discs.
   */
  rings: Map<string, number> | null;
  /** Every person is filtered out: the canvas has to say so itself. */
  empty: boolean;
  showLabels: boolean;
  /** Which script the canvas draws in. Follows the UI language. */
  lang: 'ko' | 'en';
  /** The relationship currently under the cursor or pinned by a click. */
  activeLinkId: string | null;
  activeLinkPinned: boolean;
  /** Copy the canvas has to paint itself, already in the right language. */
  strings: {
    emptyTitle: string;
    emptySub: string;
    emptyHint: string;
    coldLabel: string;
    coldSub: string;
  };
  reducedMotion: boolean;
}

const FONT = `'Pretendard Variable', Pretendard, 'Inter Variable', Inter, -apple-system, 'Malgun Gothic', system-ui, sans-serif`;

/** tokens.css publishes the weight ramp (450 / 600 / 700) and warns that any
 *  off-ramp value snaps to 400 or 700 on a Windows fallback. The canvas cannot
 *  read CSS variables, so it mirrors the three legal steps here — the same
 *  reason palette.ts mirrors the colour tokens. */
const W_TEXT = 450;
const W_MED = 600;
const W_BOLD = 700;

/** Sublabels are 10–11px on near-black: --ink-mid measures ~3.4:1 there, which
 *  is below AA for any size. Sit them between --ink-mid and --ink-hi instead. */
const INK_SUB = mix(INK_MID, INK_HI, 0.6);

let noisePattern: CanvasPattern | null = null;
function getNoise(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (noisePattern) return noisePattern;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    // Mid-grey ± a wide swing: soft-light leaves 128 untouched and pushes the
    // rest either way, which is what makes it read as emulsion rather than as a
    // grey wash. Per-channel jitter keeps it off pure monochrome.
    const v = 128 + (Math.random() - 0.5) * 116;
    img.data[i] = v + (Math.random() - 0.5) * 14;
    img.data[i + 1] = v;
    img.data[i + 2] = v + (Math.random() - 0.5) * 14;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(c, 'repeat');
  return noisePattern;
}

/** Where the mass of the graph actually is, in screen space. The backdrop
 *  lights the subject, so it has to follow the subject rather than the frame. */
function massCentre(s: RenderState): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let wsum = 0;
  for (const n of s.nodes) {
    if (n.appear <= 0.05) continue;
    const w = n.appear * (0.4 + n.weight);
    sx += n.x * w;
    sy += n.y * w;
    wsum += w;
  }
  const ins = s.insets;
  const fallbackX = ins.left + (s.width - ins.left - ins.right) / 2;
  const fallbackY = ins.top + (s.height - ins.top - ins.bottom) / 2;
  if (!wsum) return { x: fallbackX, y: fallbackY };
  const x = (sx / wsum) * s.view.k + s.view.x;
  const y = (sy / wsum) * s.view.k + s.view.y;
  // Never let the light source leave the frame entirely.
  return {
    x: Math.max(-s.width * 0.15, Math.min(s.width * 1.15, x)),
    y: Math.max(-s.height * 0.15, Math.min(s.height * 1.15, y)),
  };
}

export function render(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { width: w, height: h, dpr, view } = s;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  /* The curtain, clamped at both ends.
   *
   * This used to be `Math.min(1, s.reveal * 2.2)` — unclamped below, and handed
   * straight to `ctx.globalAlpha`. Assigning an out-of-range value to
   * globalAlpha does not throw and does not clamp: per spec it is *silently
   * ignored*, so the context keeps whatever it had — 1 — and the entire node
   * layer paints at full brightness. One negative `reveal` (the caller's rAF
   * timestamp precedes its own start time on the first frame) is therefore a
   * one-frame full-contrast flash of all twenty discs, immediately after a fade
   * to black. Never hand an unclamped expression to globalAlpha.
   *
   * The 2.2 multiplier is gone with it: it made the fade saturate at reveal
   * 0.4545, i.e. a fifth of the way through, so two thirds of the reveal's
   * duration changed no pixel while still forcing a repaint every frame. The
   * curtain and the number are now the same thing. */
  const sceneAlpha = Math.max(0, Math.min(1, s.reveal));
  // See paintedFrame.n: counted here, on the far side of the clear above and
  // the near side of the early-out below.
  paintedFrame.n++;
  paintedFrame.alpha = sceneAlpha;

  /* Nothing below this is visible. Painting it anyway — the whole label
     collision solve and 40+ fillText calls at alpha 0 behind an opaque cold
     open — is what held the intro at a 66.6ms median frame. The backdrop is a
     layer of its own now, so the canvas is never an empty rectangle either. */
  if (sceneAlpha <= 0.01) return;

  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.k, view.k);

  ctx.globalAlpha = sceneAlpha;
  drawClusters(ctx, s);
  drawLinks(ctx, s);
  drawNodes(ctx, s);
  ctx.globalAlpha = 1;

  ctx.restore();

  if (s.showLabels) drawLabels(ctx, s, sceneAlpha);
  if (s.empty) drawEmptyState(ctx, s, sceneAlpha);
}

/* ── backdrop ────────────────────────────────────────────────────────────── */

/**
 * The backdrop is a layer, not a pass.
 *
 * It is three full-viewport fills — a linear base, a radial bloom, a radial
 * vignette — plus a full-viewport `soft-light` grain, and all four were being
 * re-evaluated on every frame the canvas painted. That is ~6.4M gradient
 * samples and a whole-backing-store blend per frame at 1600×1000, and the
 * canvas repaints at 60fps for as long as a link is under the cursor, because a
 * hovered dashed edge marches its lineDashOffset.
 *
 * Measured with the pointer parked on a node: 116.7ms per frame (8fps) against
 * 16.7ms with the pointer off the graph, and a V8 sampling profile put 97.6% of
 * samples in `(program)` — none of it was JavaScript. Ablating the four fills
 * at the CanvasRenderingContext2D level took the same frame to 16.7ms; caching
 * them into a bitmap and blitting it took it to 66ms, because on this renderer
 * even one full-viewport blit costs most of a frame.
 *
 * So it stops being drawn per frame at all. Nothing in it depends on the graph
 * — only on the canvas size, the graph's centre of mass, and a bloom drift
 * whose period is ~90s — so it lives on its own canvas element behind the scene
 * and is repainted only when one of those three actually moves. The compositor
 * owns it after that, which is what compositors are for. The tolerance is
 * proportional: the bloom is a 0.085-alpha blob with an ~830px radius, so being
 * 1.4% of its own radius out of date is not a thing anyone can see, and it
 * means a camera tween repaints the layer a handful of times instead of once
 * per frame.
 *
 * The grain moved down here with it. It used to be composited over everything,
 * including the discs and the links; it now sits under them. That is 5% of the
 * frame's pixels, all of them opaque marks — a disc body, a 2px stroke, a
 * lettterform over its own plate — where a 0.55 soft-light of mid-grey noise on
 * near-black was doing nothing legible anyway. The 95% that carries the
 * emulsion is unchanged, and it costs nothing.
 */
interface Plate {
  w: number;
  h: number;
  dpr: number;
  cx: number;
  cy: number;
  t: number;
}
let plate: Plate | null = null;

/**
 * Repaint the backdrop layer if it has gone stale. Cheap and idempotent: the
 * common case is a bounds check and a return.
 *
 * Separate from `render()` because it targets a different canvas — the caller
 * owns both and calls this first.
 */
export function renderBackdrop(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const { width: w, height: h, dpr } = s;
  const centre = massCentre(s);
  const t = s.reducedMotion ? 0 : s.time;
  const tol = Math.max(8, Math.min(w, h) * 0.012);

  if (
    plate &&
    plate.w === w &&
    plate.h === h &&
    plate.dpr === dpr &&
    Math.abs(plate.cx - centre.x) <= tol &&
    Math.abs(plate.cy - centre.y) <= tol &&
    // 900ms of drift moves the bloom about 6px at 1600 wide. Repainting on the
    // clock rather than on the number keeps the layer honest without tying its
    // repaint rate to the frame rate.
    Math.abs(plate.t - t) <= 900
  )
    return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintBackdrop(ctx, w, h, centre, t);
  paintGrain(ctx, w, h, dpr);
  plate = { w, h, dpr, cx: centre.x, cy: centre.y, t };
}

/** Force the next `renderBackdrop` to repaint — the caller resized the layer's
 *  canvas, which clears it. */
export function invalidateBackdrop(): void {
  plate = null;
}

function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  centre: { x: number; y: number },
  t: number,
): void {
  /* Warm black, not violet — the same hue rotation tokens.css applies to the
     six surface steps, at within 0.7% of the same luminances. The panels float
     over this, and a warm sheet of glass on a blue-violet canvas made the
     frame disagree with itself: the chrome read as tinted rather than as lit.
     Luminance is what carries the ramp, so it is held and only the angle
     moves. */
  const base = ctx.createLinearGradient(0, 0, w * 0.35, h);
  base.addColorStop(0, '#0d0807');
  base.addColorStop(0.55, '#0a0706');
  base.addColorStop(1, '#070504');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // A slow, barely-there crimson bloom behind the mass of the graph. It reads
  // as light from off-camera rather than as a gradient — and it is anchored to
  // the graph's centre of mass, so when the graph is small or off to one side
  // the light goes with it instead of lighting empty black.
  const bx = centre.x + Math.cos(t * 0.00007) * w * 0.06;
  const by = centre.y + Math.sin(t * 0.00009) * h * 0.05;
  const bloomR = Math.max(w, h) * 0.52;
  const bloom = ctx.createRadialGradient(bx, by, 0, bx, by, bloomR);
  bloom.addColorStop(0, 'rgba(255,47,67,0.085)');
  bloom.addColorStop(0.42, 'rgba(120,20,40,0.038)');
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // Vignette keeps attention on the subject and hides edge-of-canvas clipping.
  // Same reasoning: it closes in around the graph, not around the window.
  const vig = ctx.createRadialGradient(
    centre.x,
    centre.y,
    Math.min(w, h) * 0.26,
    centre.x,
    centre.y,
    Math.max(w, h) * 0.82,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.66)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function paintGrain(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number): void {
  const p = getNoise(ctx);
  if (!p) return;
  ctx.save();
  // Device pixels, not CSS pixels: on a 2x display the tile was being drawn at
  // two device pixels per sample, which is chunky rather than fine.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // `overlay` on a sub-0.5 base evaluates to 2×base×blend and multiplies toward
  // zero, i.e. it does nothing in the shadows — which is 95% of this frame.
  // `soft-light` lifts and cuts around mid-grey and survives on near-black.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, Math.ceil(w * dpr), Math.ceil(h * dpr));
  ctx.restore();
}

/* ── clusters ────────────────────────────────────────────────────────────── */

/* ── the type ladder, shared ──────────────────────────────────────────────── */

/* Type is set in screen space and discs in world space, so both painters tie
   their size back to the camera through these two functions rather than each
   restating the arithmetic. They were inline in drawLabels until the cold band
   had to RESERVE its caption's height inside its own geometry (see coldBounds):
   a band that reserves one number while the painter sets another is the defect,
   not the fix, so there is now exactly one place the number comes from. */
function labelZoomScale(k: number): number {
  return Math.min(1, Math.sqrt(k / 0.62));
}
function captionLod(k: number): number {
  return Math.min(1.55, Math.max(1, k * 0.62)) * labelZoomScale(k);
}
/** The region caption's two type sizes at this camera. */
function captionSizes(k: number): { titleSize: number; subSize: number } {
  const titleSize = Math.round(Math.max(11, Math.min(16, 11.5 * captionLod(k))));
  return { titleSize, subSize: Math.round(Math.max(9.5, titleSize * 0.8)) };
}
/** …and the height of a caption block that carries both lines, in screen px.
 *  The band's caption always carries its count line, so this is the height the
 *  band has to make room for. Must stay in step with `capH` in drawCaptions. */
function captionBlockH(k: number): number {
  const { titleSize, subSize } = captionSizes(k);
  return titleSize * 0.7 + titleSize * 0.5 + subSize * 1.5 + 8;
}

/** Gutter between the band's top rail and a caption seated under it, and
 *  between the row's plates and a caption seated under them. One number, read
 *  by coldBounds (which reserves the room) and drawCaptions (which uses it). */
const COLD_CAP_GUTTER = 8;
/** Where a caption seated under the TOP rail hangs from. Measured on the
 *  default desktop frame when this was chosen: 33.4px of clearance to the
 *  plates and 51.9px to the faces, block 37.4px. */
const COLD_CAP_RAIL = 11;
/** …and the clearance a caption keeps from the FACES, on the side it is seated.
 *  A title grazing the top of somebody's rim ticks is a container labelling its
 *  own contents; a title across their eyes is not. */
const COLD_FACE_CLEAR = 6;

/** How many people currently have no verified tie. */
function coldCount(s: RenderState): number {
  let n = 0;
  for (const node of s.nodes) if (node.noTies && node.appear > 0.15) n++;
  return n;
}

/** World-space box around the "no prior tie" row, with breathing room.
 *
 *  The bottom rail used to be clamped to the viewport floor whenever the row
 *  would overflow — which fires at default zoom on a 390px phone and at any
 *  zoom-out — and that pulled the rail *above* the four nodes it is supposed to
 *  be containing: a grey rectangle floating over four unenclosed circles. A
 *  container may be cropped by the window; it may never be drawn inside its own
 *  contents. So the clamp now has a hard floor of `y1 + 24`, and the camera's
 *  bounds() reserves the whole band instead, which moves the row into frame
 *  rather than truncating what encloses it. */
function coldBounds(
  s: RenderState,
): {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  cx: number;
  /** Top of the highest photograph in the row — the one line the band's own
   *  caption may not cross, since a title set over a face is the same defect as
   *  a name set over one. */
  faceTop: number;
  rowBottom: number;
  /** Where the band wants its own caption: under the top rail when there is
   *  room between the rail and the faces, under the row's plates otherwise.
   *  `bottom` below reserves the block's height for the second case, which is
   *  the whole of the fix — the band used to leave the caption to a clamp that
   *  had nowhere to put it but the face row. */
  capBelow: boolean;
} | null {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  /** The bottom of the row's PLATES, not of its photographs. Only the caption
   *  needs it — the rails are seated off the discs and always have been — and
   *  it is what a caption seated *under* the row has to clear. */
  let rowBottom = -Infinity;
  let n = 0;
  for (const node of s.nodes) {
    if (!node.noTies || node.appear <= 0.15) continue;
    x0 = Math.min(x0, node.x - node.radius);
    x1 = Math.max(x1, node.x + node.radius);
    y0 = Math.min(y0, node.y - node.radius);
    y1 = Math.max(y1, node.y + node.radius);
    rowBottom = Math.max(rowBottom, node.y + plateExtent(node));
    n++;
  }
  if (!n || !Number.isFinite(x0)) return null;
  const padX = 96;
  let top = y0 - 74;
  // The band is a factual claim — "nobody in here met anyone else" — so nothing
  // with an edge may be drawn inside it. The rail is pushed below the lowest
  // connected disc that shares its horizontal run, but never so far that it
  // stops enclosing the row it exists to enclose.
  let lowestTied = -Infinity;
  for (const node of s.nodes) {
    if (node.noTies || node.appear <= 0.15) continue;
    if (node.x + node.radius < x0 - padX || node.x - node.radius > x1 + padX) continue;
    const b = node.y + node.radius;
    if (b > lowestTied) lowestTied = b;
  }
  if (lowestTied > top) top = Math.min(y0 - 22, lowestTied + 16);

  /* THE CAPTION IS PART OF THE BAND, so the band's height is a function of it.
   *
   * `top` above is whatever clearing the connected mesh left, and on a short
   * frame it is as little as 22 units above the faces — deliberately, so the
   * rail never encloses a node that has ties. When that happens the caption
   * cannot sit under the top rail and has to sit under the row instead, and
   * `bottom` was `y1 + 64` clamped to the viewport floor with a hard stop of
   * `y1 + 24` — 24 units, which is a fraction of a caption block. drawCaptions
   * then clamped the block back INSIDE the rectangle it had been given, and on
   * a short band that clamp lands the title on the face row: measured on the
   * running app before this, the band's caption sat 3.5–10.4px INSIDE the
   * photographs of 강지후, 신승용 and 최연청 in 5 of 18 states, worst 10.4px on
   * a 390px phone — over the faces of the three people it names.
   *
   * So the room is reserved here rather than clamped for there. `capBelow` is
   * the same test drawCaptions ranks its seats with, decided once. */
  const capH = captionBlockH(s.view.k) / s.view.k;
  const capBelow = y0 - (top + COLD_CAP_RAIL / s.view.k) < capH + COLD_FACE_CLEAR / s.view.k;
  const capFloor = capBelow
    ? rowBottom + (COLD_CAP_GUTTER * 2) / s.view.k + capH
    : -Infinity;

  // y1 already includes the node radius; +24 is the visual margin the rail
  // needs to read as "under them" rather than "through them".
  const floor = Math.max(y1 + 24, capFloor);
  let bottom = Math.max(y1 + 64, capFloor);
  const screenFloor = (s.height - s.insets.bottom - 10 - s.view.y) / s.view.k;
  if (bottom > screenFloor) bottom = Math.max(floor, screenFloor);
  return { x0: x0 - padX, x1: x1 + padX, top, bottom, cx: (x0 + x1) / 2, faceTop: y0, rowBottom, capBelow };
}

/** The cold band's world box, but only when the band is actually on the canvas.
 *
 *  `coldBounds` answers "where would the band be"; the link painter has to ask
 *  "is the reader looking at a band right now", because the clip below is a
 *  statement about a drawn container and it may not fire in a mode that draws
 *  no container. Both conditions are exactly the ones `drawClusters` uses to
 *  decide whether to paint the rails. */
function drawnColdBand(s: RenderState): ReturnType<typeof coldBounds> {
  if (!s.clusters.length || s.regionAlpha <= 0.01) return null;
  if (!s.clusters.some((c) => c.flat)) return null;
  return coldBounds(s);
}

/** A horizontal gradient that fades to nothing at both ends, so a band drawn
 *  with it has no hard vertical edges pretending to be borders. */
function fadeAcross(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  color: string,
  a: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, alpha(color, 0));
  g.addColorStop(0.14, alpha(color, a));
  g.addColorStop(0.86, alpha(color, a));
  g.addColorStop(1, alpha(color, 0));
  return g;
}

/** The `Cluster.fill` value layout.ts treats as an unmodified region boundary.
 *  Every other value is read as a proportion of it. */
const REGION_FILL_STD = 1.65;

/** Area of a two- or three-set overlap, as a fraction of a region's own fill.
 *
 *  A lens has to be visible as a place without becoming a third value step: the
 *  season hulls fill at 0.075 / 0.045 on their two radial stops, so a flat 0.07
 *  over the top of two of them lands the two-way overlap at roughly twice a
 *  single region's density and the three-way at three times — which is exactly
 *  the reading ("more sets here") the diagram wants, and it is why the fill is
 *  flat rather than another radial ramp. */
const LENS_FILL = 0.07;

function drawClusters(ctx: CanvasRenderingContext2D, s: RenderState): void {
  if (!s.clusters.length) return;
  // The regions belong to the arrangement the nodes are flying to, so they
  // bloom in on the same ramp the anchors do instead of hard-cutting on ~150ms
  // before anything has moved.
  const ra = s.regionAlpha;
  if (ra <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= ra;
  for (const c of s.clusters) {
    /* A LENS: the intersection of two or three hulls, shaded so that "played
       both seasons" is a place the reader can see rather than a deduction from
       which strokes a dot happens to be inside. Painted by clipping to every
       ellipse but the last and filling the last — canvas has no path-intersect,
       and successive clips are exactly that. */
    if (c.lens) {
      if (c.lens.length < 2) continue;
      ctx.save();
      for (let i = 0; i < c.lens.length - 1; i++) {
        const e = c.lens[i];
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2);
        ctx.clip();
      }
      const last = c.lens[c.lens.length - 1];
      ctx.beginPath();
      ctx.ellipse(last.x, last.y, last.rx, last.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(c.color, LENS_FILL * (c.fill ?? 1));
      ctx.fill();
      ctx.restore();
      continue;
    }
    /* A REGION OF ONE. No enclosure — see Cluster.bare. The caption, its swatch
       and its leader are drawn by drawCaptions like every other region's. */
    if (c.bare) continue;
    if (c.flat) {
      // A shallow band, not a circle: this group is a caption on the graph,
      // not a region of it. Its bounds come straight from where the nodes
      // actually are, so it can never drift away from what it labels.
      const b = coldBounds(s);
      if (!b) continue;
      const lw = 1 / s.view.k;
      const dash = [5 / s.view.k, 7 / s.view.k];

      // Both rails, both fading out at the ends — a band, not a three-sided box.
      // The lower rail is now the heavier of the two: it is the one doing the
      // containing, and it reads as ground under the row.
      for (const y of [b.top, b.bottom]) {
        ctx.beginPath();
        ctx.moveTo(b.x0, y);
        ctx.lineTo(b.x1, y);
        ctx.strokeStyle = fadeAcross(ctx, b.x0, b.x1, c.color, y === b.top ? 0.14 : 0.24);
        ctx.lineWidth = lw;
        ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Fill as stacked strips, each fading at both ends: a single vertical
      // gradient leaves hard left and right edges, which is what made this read
      // as a box with three sides. The ramp runs *downward* — the density has
      // to sit behind and under the nodes, not in the empty air above them,
      // otherwise the band is brightest where there is nothing to enclose.
      const strips = 9;
      const stripH = (b.bottom - b.top) / strips;
      for (let i = 0; i < strips; i++) {
        const t = (i + 0.5) / strips;
        ctx.fillStyle = fadeAcross(ctx, b.x0, b.x1, c.color, 0.085 * (0.16 + 0.84 * t * t));
        ctx.fillRect(b.x0, b.top + i * stripH, b.x1 - b.x0, stripH + 0.6);
      }
      continue;
    }

    const rx = c.rx ?? c.r;
    const ry = c.ry ?? c.r * 0.92;
    /* Boundary is a KIND, not an alpha.
     *
     * A hull used to stroke at 0.3, 1.4/k, dash [6/k, 8/k]; a shared-show edge
     * strokes at ~0.34, ~2/k, dash [7/k, 10.5/k]. Same weight, same alpha,
     * near-identical dash rhythm — so fourteen long dashed edges crossed three
     * dashed season hulls and there was no way to tell a season boundary from a
     * "met on another programme" tie crossing it. A region is a continuous line
     * with area behind it; a relationship is a dashed line with nothing behind
     * it. `Cluster.boundary` is the field that says which one this is, and
     * every enclosure the layout emits sets it. `solid` is its stroke half and
     * is read as the fallback so an older cluster still draws correctly. */
    const boundary = c.boundary ?? c.solid ?? false;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(c.color, boundary ? 0.38 : 0.3);
    ctx.lineWidth = (boundary ? 1.6 : 1.4) / s.view.k;
    if (!boundary) ctx.setLineDash([6 / s.view.k, 8 / s.view.k]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, ry / Math.max(1, rx));
    const g = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
    /* A region with area reads as a place; an outline reads as a stray ellipse
     * — and area at low chroma is far more hue-legible than a hairline at the
     * same chroma, which is what ten value-equalised archetype rings need.
     *
     * The area comes from `boundary` rather than from the multiplier: being a
     * region is what earns the fill, so a cluster that forgets to set `fill`
     * still gets one. `fill` is then a relative trim among boundaries, and it
     * is normalised at REGION_FILL_STD because that is the value layout.ts
     * authored as "the standard boundary fill" (its own comment: "1.65 lands
     * the stops at ~0.074 / ~0.050"). Seasons therefore land exactly on the
     * 0.075 / 0.045 the critique asked for, archetype 12% over it for hue, and
     * orbit's outer ring under it because it stacks on top of the inner one. */
    const trim = boundary ? (c.fill ?? REGION_FILL_STD) / REGION_FILL_STD : (c.fill ?? 1);
    g.addColorStop(0, alpha(c.color, (boundary ? 0.075 : 0.045) * trim));
    g.addColorStop(0.72, alpha(c.color, (boundary ? 0.045 : 0.03) * trim));
    g.addColorStop(1, alpha(c.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ── links ───────────────────────────────────────────────────────────────── */

/** The bowed quadratic between two points, as its control point and its own
 *  midpoint. Split out from `linkPath` because a `parallel` edge stopping at the
 *  cold band is re-aimed at a point that is not its target (see THE
 *  TERMINATOR'S ADDRESS) and has to be bowed by the same rule, from the same
 *  arithmetic, rather than by a second copy of it. */
function quadThrough(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  curve: number,
): { cx: number; cy: number; mx: number; my: number } {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const nx = -dy;
  const ny = dx;
  const len = Math.hypot(dx, dy) || 1;
  const off = curve * Math.min(len * 0.24, 90);
  const cx = x0 + dx / 2 + (nx / len) * off;
  const cy = y0 + dy / 2 + (ny / len) * off;
  // midpoint of the quadratic at t=0.5
  const mx = 0.25 * x0 + 0.5 * cx + 0.25 * x1;
  const my = 0.25 * y0 + 0.5 * cy + 0.25 * y1;
  return { cx, cy, mx, my };
}

function linkPath(l: GLink): { cx: number; cy: number; mx: number; my: number } {
  return quadThrough(l.source.x, l.source.y, l.target.x, l.target.y, l.curve);
}

export function linkMidpoint(l: GLink): { x: number; y: number } {
  const { mx, my } = linkPath(l);
  return { x: mx, y: my };
}

/** Resting link alpha in a mode that draws regions.
 *
 *  The other half of separating boundary from relationship, and the half that
 *  cannot be done from layout.ts: the hulls are solid and filled now, but the
 *  dashed edges crossing them were still at 0.34 — the same ink the hulls used
 *  to be drawn in. When a mode's claim is "this person is inside that circle",
 *  the lines running across the circle are context, not subject, so they sit
 *  back by ~45%. Nothing is hidden: 0.187 over #08070c is still plainly a line,
 *  and any link that is hovered, selected, traced or pinned comes back to full
 *  strength through the focus branch above. */
const ANCHORED_LINK_ATTEN = 0.55;

/** A quadratic restricted to [a,b], as the three control points of the same
 *  curve. de Casteljau: the sub-curve of a quadratic is a quadratic, so a
 *  clipped link is still one `quadraticCurveTo` and still carries the dash
 *  rhythm the type owns. `a = 0` is the entrance's draw-on split, which used to
 *  be written out longhand here; `b < 1` is the cold band's clip. */
function subQuad(
  p0x: number,
  p0y: number,
  cx: number,
  cy: number,
  p2x: number,
  p2y: number,
  a: number,
  b: number,
): { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number } {
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * p0x + 2 * u * t * cx + t * t * p2x, u * u * p0y + 2 * u * t * cy + t * t * p2y];
  };
  const [x0, y0] = at(a);
  const [x1, y1] = at(b);
  const w0 = (1 - a) * (1 - b);
  const w1 = (1 - a) * b + (1 - b) * a;
  const w2 = a * b;
  return { x0, y0, cx: w0 * p0x + w1 * cx + w2 * p2x, cy: w0 * p0y + w1 * cy + w2 * p2y, x1, y1 };
}

/**
 * Where a link first crosses into the cold band, as a curve parameter.
 *
 * THE BAND IS A CLAIM — "nobody in here is entangled with anybody" — and the
 * three `parallel` edges were drawn straight through its top rail and landed on
 * the discs inside it at full opacity, so the picture said the opposite of the
 * caption in the same 200px. Measured on the default desktop frame: 446 teal
 * pixels painted inside the band's own rectangle.
 *
 * A `parallel` line is not a tie — the validator excludes it from every count,
 * the About legend says it "gets no tick" — so the honest drawing is a line that
 * visibly REFUSES to enter: it stops short of the rail and terminates in an open
 * circle, which is the universal "does not connect here" cap and reads at every
 * zoom. Nothing is hidden; the line still points at whoever is inside.
 *
 * Only fires when exactly one end is inside, which is the real case: these three
 * run from a connected person above the rail to a cold person below it.
 */
function coldCrossing(
  l: GLink,
  cx: number,
  cy: number,
  band: { x0: number; x1: number; top: number; bottom: number },
): { t: number; keepSource: boolean } | null {
  const inside = (x: number, y: number) => y >= band.top && y <= band.bottom && x >= band.x0 && x <= band.x1;
  const s0 = inside(l.source.x, l.source.y);
  if (s0 === inside(l.target.x, l.target.y)) return null;
  let lo = 0;
  let hi = 1;
  // 18 halvings puts the crossing inside 4e-6 of the parameter — well under a
  // pixel at any zoom this camera reaches.
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2;
    const u = 1 - m;
    const px = u * u * l.source.x + 2 * u * m * cx + m * m * l.target.x;
    const py = u * u * l.source.y + 2 * u * m * cy + m * m * l.target.y;
    if (inside(px, py) === s0) lo = m;
    else hi = m;
  }
  return { t: (lo + hi) / 2, keepSource: !s0 };
}

/** Screen px the clipped line stops short of the rail, and the radius of the
 *  open circle that caps it. Both constants on screen rather than in world
 *  units: the gap has to stay legible as the reader zooms out, which is exactly
 *  where the 14/5/1.6/5 dash rhythm stops carrying the distinction on its own. */
const COLD_STOP_PX = 11;
const COLD_CAP_PX = 3.2;

function drawLinks(ctx: CanvasRenderingContext2D, s: RenderState): void {
  const k = s.view.k;
  const anyFocus = s.hoverId != null || s.selectedId != null || s.cursorId != null;
  const rest = 0.34 * (s.anchored ? ANCHORED_LINK_ATTEN : 1);
  const band = drawnColdBand(s);
  /* Refilled here rather than in drawNodes because this is the painter that
     puts the terminators on the canvas. See paintedFrame.stubs. */
  paintedFrame.stubs.length = 0;

  // Two passes so highlighted links always sit above the resting mesh.
  for (const pass of [0, 1] as const) {
    for (const l of s.links) {
      const hot = l.focus > 0.01;
      if (pass === 0 ? hot : !hot) continue;
      if (l.draw <= 0.001) continue;

      const a = (anyFocus ? 0.1 + l.focus * 0.85 : rest) * (1 - l.dim * 0.72);
      if (a <= 0.004) continue;

      let { cx, cy, mx, my } = linkPath(l);
      const active = l.id === s.activeLinkId;
      const width = (l.width + l.focus * (active ? 3.1 : 1.9)) / Math.max(0.55, Math.min(1.35, k));

      /* The parameter range this line is actually stroked over. It starts as
         the whole curve and is bitten into from both ends: the entrance's
         draw-on takes the far end, the cold band takes whichever end runs into
         it. Composing them as one interval is what keeps a `parallel` edge
         clipped correctly while it is still drawing itself on. */
      let t0 = 0;
      let t1 = Math.min(1, l.draw);
      /** The point the curve is drawn TO. For a `parallel` edge stopping at the
       *  band that is not the person — see THE TERMINATOR'S ADDRESS. */
      let p2x = l.target.x;
      let p2y = l.target.y;
      let capAtEnd = false;
      let capped = false;
      /** Who the terminator is pointing at, for `paintedFrame.stubs`. */
      let coldId: string | null = null;
      let coldX = 0;
      if (band && l.type === 'parallel') {
        const cross = coldCrossing(l, cx, cy, band);
        if (cross) {
          capAtEnd = cross.keepSource;
          const cold = cross.keepSource ? l.target : l.source;
          coldId = cold.id;
          coldX = cold.x;
          // The stop is a screen distance, in world units at this camera.
          const stop = COLD_STOP_PX / k;
          const aimY = band.top - stop;
          /* THE TERMINATOR'S ADDRESS.
           *
           * The line stops short of the rail and ends in an open circle, and the
           * whole meaning of that circle is "the person under here is the one
           * this record belongs to". It was landing wherever the BOWED curve
           * happened to cross the rail, which is not above anybody. Measured on
           * the production build against a control with this branch switched
           * off, six states, three caps each: the cap stood 2.0–91.0px off the
           * person it names, worst 최연청 at 1600×1000 — 86px to his LEFT, i.e.
           * toward 신승용, nearer a different member of the row than the one it
           * points at. A device invented to make one pairing legible, pointing
           * at the wrong half of the row.
           *
           * So the cap's x is not an outcome any more, it is an input: the curve
           * is re-aimed at the point directly above the cold person, one
           * COLD_STOP_PX clear of the rail, and re-bowed between its own two
           * endpoints by the same rule every other link is bowed by. The gap
           * still says "does not connect"; the vertical now says who. Clamped
           * into the band's own span so a member at the very edge of the row
           * cannot throw the cap outside the container.
           *
           * Only when the kept end is genuinely above the rail. The clip has to
           * keep working for the mirror case (a line leaving the band upward),
           * where there is no "above" to stand the cap on, and that falls back
           * to the crossing parameter below. */
          if (cross.keepSource && l.source.y < aimY) {
            p2x = Math.min(band.x1, Math.max(band.x0, cold.x));
            p2y = aimY;
            const re = quadThrough(l.source.x, l.source.y, p2x, p2y, l.curve);
            cx = re.cx;
            cy = re.cy;
            mx = re.mx;
            my = re.my;
          } else {
            // A screen distance converted to a share of the chord — a quadratic
            // this shallow is within a couple of percent of its chord in length,
            // and the gap only has to read, not measure.
            const chord = Math.hypot(l.target.x - l.source.x, l.target.y - l.source.y) || 1;
            const dt = stop / chord;
            if (cross.keepSource) t1 = Math.min(t1, Math.max(0, cross.t - dt));
            else t0 = Math.max(t0, Math.min(1, cross.t + dt));
          }
          capped = t1 > t0;
        }
      }
      if (t1 <= t0) continue;

      const seg = subQuad(l.source.x, l.source.y, cx, cy, p2x, p2y, t0, t1);
      // The cap is the end of what was actually stroked, whichever end that is,
      // so a line still drawing itself on carries its terminator with it.
      const capX = capAtEnd ? seg.x1 : seg.x0;
      const capY = capAtEnd ? seg.y1 : seg.y0;
      const path = new Path2D();
      path.moveTo(seg.x0, seg.y0);
      path.quadraticCurveTo(seg.cx, seg.cy, seg.x1, seg.y1);

      ctx.save();
      if (hot) {
        // Geometry, not ctx.shadowBlur: a software gaussian over 17 long
        // diagonal strokes was costing 100–140ms on the frame where the user
        // hovers the hub. A fat, faint underlay is visually the same thing.
        ctx.strokeStyle = alpha(l.color, 0.1 * l.focus * (1 - l.dim * 0.72));
        ctx.lineWidth = width * 3.4;
        ctx.lineCap = 'round';
        ctx.stroke(path);
        ctx.strokeStyle = alpha(l.color, 0.13 * l.focus * (1 - l.dim * 0.72));
        ctx.lineWidth = width * 1.9;
        ctx.stroke(path);
      }

      ctx.strokeStyle = alpha(l.color, a);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';

      /* DASH RHYTHM. The type's own pattern first, the season-derived one
       * second — which is the order palette.ts's EDGE_DASH note asks for and
       * which nothing had implemented, so the table had no importer anywhere in
       * src/ and the one type that owns a rhythm was painted in the default.
       *
       * `parallel` is the case it exists for. Its three edges are outside the
       * house, so `season === 0` and the fallback gives them 7/10.5 — the same
       * rhythm as the nine prior-show edges, i.e. exactly the grouping the type
       * was created to break, leaving hue alone to say "these two never met".
       * The long-dash/dot is the one rhythm nothing else here uses and it says
       * the right thing: two long runs of record with a gap where the meeting
       * would be.
       *
       * Divided by k like every other dash on this canvas, so the rhythm is a
       * constant on screen rather than something the camera stretches. */
      const pattern = EDGE_DASH[l.type];
      if (pattern) {
        ctx.setLineDash(pattern.map((v) => v / k));
        ctx.lineDashOffset = hot && !s.reducedMotion ? -l.flow : 0;
      } else if (l.dashed) {
        const d = 7 / k;
        ctx.setLineDash([d, d * 1.5]);
        ctx.lineDashOffset = hot && !s.reducedMotion ? -l.flow : 0;
      }
      ctx.stroke(path);
      ctx.setLineDash([]);

      /* THE TERMINAL. An open circle where the line stops, so the gap reads as
         a refusal rather than as a line that happens to be short. Drawn inside
         the same save() as the stroke, at the same alpha, so it dims and fades
         with the line it belongs to — and unfilled, because a filled dot is the
         active-link bead and means the opposite. */
      if (capped) {
        ctx.beginPath();
        ctx.arc(capX, capY, COLD_CAP_PX / k, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(l.color, Math.min(1, a * 1.6));
        ctx.lineWidth = Math.max(width * 0.85, 1 / k);
        ctx.stroke();
        // Published in screen px, with the one number the device's whole claim
        // rests on: how far the cap is from being above the person it names.
        if (coldId)
          paintedFrame.stubs.push({
            id: coldId,
            x: capX * k + s.view.x,
            y: capY * k + s.view.y,
            dx: (capX - coldX) * k,
          });
      }
      ctx.restore();

      if (l.directed && l.draw > 0.985 && (hot || !anyFocus)) {
        drawArrow(ctx, l, cx, cy, alpha(l.color, Math.min(1, a * 1.5)), k);
      }

      // The line under the cursor gets a bead at its own midpoint — the point
      // the readout is speaking for. Pinned, the bead takes a brass collar so
      // "this one is held open" is legible on the canvas and not only in the
      // card.
      if (active && l.draw > 0.9) {
        const rr = 3.6 / Math.max(0.6, Math.min(1.3, k));
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, rr, 0, Math.PI * 2);
        ctx.fillStyle = alpha(l.color, 0.95);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx, my, rr + 3 / k, 0, Math.PI * 2);
        ctx.strokeStyle = s.activeLinkPinned ? alpha(BRASS, 0.92) : alpha(l.color, 0.4);
        ctx.lineWidth = (s.activeLinkPinned ? 1.6 : 1) / k;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  l: GLink,
  cx: number,
  cy: number,
  color: string,
  k: number,
): void {
  // Land the head on the rim of the target node, along the curve's tangent.
  const t = 1;
  const tx = 2 * (1 - t) * (cx - l.source.x) + 2 * t * (l.target.x - cx);
  const ty = 2 * (1 - t) * (cy - l.source.y) + 2 * t * (l.target.y - cy);
  const len = Math.hypot(tx, ty) || 1;
  const ux = tx / len;
  const uy = ty / len;
  const back = l.target.radius + 5;
  const px = l.target.x - ux * back;
  const py = l.target.y - uy * back;
  const size = (7 + l.focus * 3) / Math.max(0.7, Math.min(1.25, k));

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.atan2(uy, ux));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, size * 0.5);
  ctx.lineTo(-size * 0.68, 0);
  ctx.lineTo(-size, -size * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/* ── nodes ───────────────────────────────────────────────────────────────── */

/**
 * The solved mark cohort for everyone currently on screen.
 *
 * The size a mark is struck at is a property of the SET — see `markSet` — so it
 * cannot be solved inside the per-node paint. Memoised on (language, node set)
 * rather than recomputed per frame: it is twenty `measureText` calls and it
 * changes only when the reader switches language or a filter changes who is
 * drawn. Keyed by identity, so a rebuilt graph drops the entry with the array.
 *
 * Solved against each node's RESTING radius, not the animated one, so the
 * entrance ramp does not re-solve the cohort sixty times a second — and so the
 * size the marks settle at is decided once rather than drifting up with the
 * discs. `cut` still caps each mark against the radius actually being painted,
 * which is what makes a mark grow with its disc during the ramp.
 */
/**
 * How far the focus dim takes a de-emphasised person — DISC and NAME, one
 * number for both painters.
 *
 * They were two: the disc faded to `1 - dim * 0.78` = 0.22 and the caption
 * floored at 0.45, so a name the reader had just pushed back was painted at
 * twice the alpha of its own portrait. The label floor was raised off zero for
 * a good reason ("a name faded to nothing is an anonymous face"); raising it
 * PAST the face inverts the problem — the reader can read who is de-emphasised
 * and cannot find them, and a name floating over a disc that is barely darker
 * than the backdrop is the commonest visual read of "this is a demo". Photo-
 * graphed in round 10 at 곽범 (legible name, near-invisible disc).
 *
 * So the disc comes up to meet the type rather than the type going down to meet
 * the disc: 0.22 is genuinely too dark for a face, and it is also too dark for
 * a glyph, which is why the floor exists at all. Exported the way `plateExtent`
 * is exported — one value, two readers, no chance of them drifting apart again.
 */
export const DIM_FLOOR = 0.45;

/**
 * The photograph's radius, in world units, at the size it is being PAINTED.
 *
 * `n.radius` is the resting value; the entrance ramps it and the focus swells
 * it, and the two painters that care — the disc and the caption that identifies
 * it — have to agree about which circle is on the canvas. They did not: the
 * label pass tested `n.radius * k` while the disc was drawn at `n.radius *
 * (0.6 + appear * 0.4) * k`, so during the entrance every visibility test in
 * this file was answering about a circle 40% larger than the one on screen.
 */
function photoRadius(n: GNode): number {
  return n.radius * (0.6 + n.appear * 0.4) * (1 + n.focus * 0.09);
}

/**
 * HOW MUCH OF A FACE HAS TO BE ON SCREEN BEFORE ITS NAME IS WORTH PAINTING.
 *
 * `chromeBoxes` has always treated the panels as absolute obstacles for the
 * label BOX — a name cut in half by the dossier is not a name — and nothing
 * ever asked the other half of the question: whether the PERSON is still
 * visible. So opening the dossier pushed 곽범's plate entirely behind the panel
 * and his caption was seated in the uncovered strip beside it, a name floating
 * in empty canvas whose nearest disc belonged to somebody else. Measured on the
 * production build across 30 states: 15 captions painted for a face with under
 * 35% of itself in the open, 8 of them for a face with NONE of itself in the
 * open — 곽범 at 1600×1000 with the dossier up, 강지후 and 신승용 at 1280×800,
 * 현성주 and 허성범 on a 390px phone, 하승진 and 윤비 at k = 4.2 where the disc
 * is simply off the edge. An orphaned name is the one artefact that makes a
 * carefully-built graph look broken, and it misleads twice over, because the
 * nearest thing to it is always somebody else's picture.
 *
 * 0.4 rather than the reviewer's "70% covered" because the measured
 * distribution is bimodal and 0.4 is inside its gap: of 468 painted names, 442
 * sat at 1.00, sixteen at ≤0.363 and the next at 0.513. A threshold in a gap is
 * a threshold nothing sits on the wrong side of by a pixel, which is what an
 * assertion needs. The number is a fraction of the PHOTOGRAPH's own box, not of
 * the plate: the photograph is the identification, and a laurel poking out from
 * behind a panel is not a face to hang a name on.
 */
const LABEL_SEEN_MIN = 0.4;

/**
 * The rectangle the reader can actually see.
 *
 * `chromeBoxes` states the same fact as four obstacles, which is what a
 * collision map needs; this is it as a positive area, which is what a
 * VISIBILITY test needs — and the two questions are genuinely different. A
 * label box is rejected when it lands under a panel. A label is *pointless*
 * when the person it names lands under one, and nothing was asking that.
 */
function uncovered(s: RenderState): Box {
  const ins = s.insets;
  const l = Math.max(0, ins.left);
  const t = Math.max(0, ins.top);
  return {
    x: l,
    y: t,
    w: s.width - l - Math.max(0, ins.right),
    h: s.height - t - Math.max(0, ins.bottom),
  };
}

/**
 * How much of a disc the reader can see, as a fraction of its own screen box:
 * 1 in the open, 0 entirely behind a panel or off the frame.
 *
 * Returns 1 when the uncovered rect has collapsed. A sheet that covers the
 * whole canvas is a state where the graph is not being read at all, and a
 * visibility test that answers "nobody is visible" there would take every name
 * off the canvas the frame the sheet closes — which is a worse artefact than
 * the one this exists to remove.
 */
function seenFraction(cx: number, cy: number, r: number, open: Box): number {
  if (r <= 0.01) return 0;
  if (open.w < 40 || open.h < 40) return 1;
  const ow = Math.min(cx + r, open.x + open.w) - Math.max(cx - r, open.x);
  if (ow <= 0) return 0;
  const oh = Math.min(cy + r, open.y + open.h) - Math.max(cy - r, open.y);
  if (oh <= 0) return 0;
  return (ow * oh) / (4 * r * r);
}

const cohortCache = new WeakMap<GNode[], { lang: string; gen: number; set: MarkSet }>();
function markCohort(s: RenderState): MarkSet {
  const gen = markGeneration();
  const hit = cohortCache.get(s.nodes);
  if (hit && hit.lang === s.lang && hit.gen === gen) return hit.set;
  const set = markSet(s.nodes.map((n) => ({ glyph: s.lang === 'en' ? n.initialsEn : n.initials, r: n.radius })));
  cohortCache.set(s.nodes, { lang: s.lang, gen, set });
  return set;
}

function drawNodes(ctx: CanvasRenderingContext2D, s: RenderState): void {
  // The plate's detail ladder is a screen-space decision, so the painter needs
  // the camera scale as well as the world position.
  const k = s.view.k;
  /* One solve for the whole frame, and one decision about whether the frame can
     carry a mark at all: a set struck under MARK_MIN_PX on screen is a texture,
     not an identification, and the caption under the disc is already carrying
     the name. All twenty stand down together — six marked discs among fourteen
     blank ones reads as a bug where a frame with none of them reads as the zoom
     it is, and the marks come back the moment the reader leans in. */
  const marks = markCohort(s);
  const marksLegible = marks.legible(k);
  /* The denominator of "every visible node is named" — see `paintedFrame`. */
  paintedFrame.k = k;
  paintedFrame.discs.length = 0;
  const open = uncovered(s);
  paintedFrame.open.x = open.x;
  paintedFrame.open.y = open.y;
  paintedFrame.open.w = open.w;
  paintedFrame.open.h = open.h;
  for (const n of s.nodes) {
    if (n.appear <= 0.002) continue;
    const r = photoRadius(n);
    const a = n.appear * (1 - n.dim * (1 - DIM_FLOOR));
    if (a <= 0.01) continue;
    {
      // On screen means the disc's own box intersects the viewport, not that
      // the node exists: at k = 4.2 most of the cast is off the edges.
      const cx = n.x * k + s.view.x;
      const cy = n.y * k + s.view.y;
      const rs = r * k;
      if (cx + rs >= 0 && cx - rs <= s.width && cy + rs >= 0 && cy - rs <= s.height)
        // …and `vis` is the second, stricter question: how much of it the
        // chrome has left the reader. See `seenFraction` and LABEL_SEEN_MIN.
        paintedFrame.discs.push({ id: n.id, x: cx, y: cy, r: rs, vis: seenFraction(cx, cy, rs, open) });
    }

    ctx.save();
    ctx.globalAlpha = a;

    // Click ripple: decelerating outward, fading fast. A ring that expands and
    // fades at a constant rate is the signature of an un-eased tween.
    if (n.pulse > 0.01) {
      const grow = 1 - Math.pow(n.pulse, 3); // 0 → 1, fast then easing out
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + grow * 42, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(n.color, n.pulse * n.pulse * 0.55);
      ctx.lineWidth = 0.6 + 2 * n.pulse * n.pulse;
      ctx.stroke();
    }

    // focus glow
    if (n.focus > 0.01) {
      const g = ctx.createRadialGradient(n.x, n.y, r * 0.6, n.x, n.y, r * 3.1);
      g.addColorStop(0, alpha(n.color, 0.34 * n.focus));
      g.addColorStop(1, alpha(n.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 3.1, 0, Math.PI * 2);
      ctx.fill();
    }

    /* THE PLATE.
     *
     * Everything from the subject disc out to the winner's laurel is drawn by
     * `graph/plate.ts`, which is a canvas port of the SVG plate in
     * `components/Portrait.tsx`, sharing its geometry through
     * `graph/plateGeometry.ts`.
     *
     * This used to be a reduced, differently-proportioned lookalike: season
     * arcs of equal length whatever the finish, no track behind them, no rim
     * ticks, no host hairline, rings stacked additively at r+5 / r+10.5 rather
     * than at the plate's own multiples of the disc. So the node a reader
     * hovered and the plate that appeared in the hover card a beat later were
     * two different pictures of the same person, and only one of them was
     * telling the truth about how far they got.
     *
     * Detail is chosen from the plate's radius ON SCREEN, so zooming in is not
     * magnification — marks arrive. See `plateTier`. */
    const glyph = s.lang === 'en' ? n.initialsEn : n.initials;
    const cut = marksLegible ? marks.cut(glyph, r) : { size: 0, squeeze: 1 };
    drawPlate(ctx, {
      x: n.x,
      y: n.y,
      r,
      k,
      color: n.color,
      focus: n.focus,
      /* 진호 in Korean, Jin-ho in English — one mark, two scripts. The full
         "Hong Jin-ho" is separately painted as the label under the disc by
         `drawLabels`. See `monogramEn` in build.ts. */
      glyph,
      /* Solved against every mark on screen, not just this one, so all twenty
         set at a single optical size — see the cohort note in `markSet`. The
         cohort is rebuilt only when the language or the node set changes. */
      glyphSize: cut.size,
      glyphSqueeze: cut.squeeze,
      /* A photograph, if `public/portraits/<id>.*` holds one. Null every time
         until it has decoded, so the plate paints its mark and swaps the
         instant the bitmap lands. */
      image: portraitImage(n.id),
      /* …and the exposure correction measured off that picture, so twenty
         sources read as one set. 1 until it has been measured; the load
         listener that repaints for the bitmap repaints for this too. */
      imageGain: photoGain(n.id),
      spec: n.plate,
    });

    // Keyboard cursor: where the user is standing without having opened anyone.
    // Outboard of the plate, so it is never confused with a mark on it.
    if (n.id === s.cursorId) {
      const cr = plateExtent(n) + 6;
      ctx.beginPath();
      ctx.arc(n.x, n.y, cr, 0, Math.PI * 2);
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = alpha(BRASS, 0.9);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
  paintedFrame.visible = paintedFrame.discs.length;
}

/* ── labels (screen space) ───────────────────────────────────────────────── */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

/** Smallest box containing both — the corridor a gliding label sweeps while it
 *  moves from one slot to another. Reserving the corridor rather than the
 *  destination is what stops names overprinting mid-transition. */
function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** A straight run of a link, in screen space. Links are sampled into a handful
 *  of these so a name can prefer a slot that is not sitting on a line. */
interface Seg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Exact segment/AABB test: three separating axes (x, y, the segment normal). */
function segHitsBox(s: Seg, b: Box): boolean {
  const bx1 = b.x + b.w;
  const by1 = b.y + b.h;
  if (Math.max(s.x0, s.x1) < b.x || Math.min(s.x0, s.x1) > bx1) return false;
  if (Math.max(s.y0, s.y1) < b.y || Math.min(s.y0, s.y1) > by1) return false;
  const dx = s.x1 - s.x0;
  const dy = s.y1 - s.y0;
  let pos = false;
  let neg = false;
  const corners: [number, number][] = [
    [b.x, b.y],
    [bx1, b.y],
    [b.x, by1],
    [bx1, by1],
  ];
  for (const [cx, cy] of corners) {
    const cross = dx * (cy - s.y0) - dy * (cx - s.x0);
    if (cross > 0) pos = true;
    else if (cross < 0) neg = true;
    else return true;
  }
  return pos && neg;
}

/**
 * Half-width of the name each node had painted last frame, in screen pixels.
 *
 * Labels are set in screen space and hang well outside the disc box, which is
 * the box the camera fits — so on a 390px phone six of them were framed
 * outside the viewport. The camera reads this back and pads its world box with
 * it. Weakly keyed so a rebuilt graph drops its entries with the nodes.
 */
export const labelExtent = new WeakMap<GNode, { left: number; right: number; up: number; down: number }>();

/**
 * Every box this painter actually put ink in, last frame, in screen pixels.
 *
 * It exists because round 5 reported "0 text-on-text collisions in by-season"
 * and round 6 photographed one ('Kwak BeomKim Nam-hee'). A claim about label
 * collisions is only worth what it can be measured at, and the collision solver
 * is the one part of this file whose output is invisible to the DOM — there is
 * no element to query, and reading it out of the pixels means OCR. So the
 * painter publishes what it painted, and a harness can intersect the list and
 * count. Refilled in place once per frame; nothing in the app reads it.
 */
export interface PaintedLabel {
  id: string;
  kind: 'name' | 'caption';
  x: number;
  y: number;
  w: number;
  h: number;
  /** The alpha it was actually inked at. "Named" is not a boolean any more:
   *  a de-emphasised person keeps their caption at a recessive alpha and a
   *  yielding one keeps it at the veil floor, so a harness counting names has
   *  to be able to tell 0.92 from 0.45 from 0.29 without OCR. */
  a: number;
}
export const paintedLabels: PaintedLabel[] = [];

/**
 * The camera the last frame was painted at, and who was on screen for it.
 *
 * The sibling of `paintedLabels`, published for the same reason and used
 * together with it: "every visible node is named at k = 3.5" is a RATIO, and
 * the list above is only its numerator. The denominator — which discs the
 * painter actually put inside the viewport — is decided in `drawNodes` from
 * `appear`, `dim` and the disc's own screen box, none of which any DOM query
 * can see. Reading it out of the pixels would mean segmenting twenty faces.
 *
 * `k` matters as much as the counts: the app deliberately exposes no camera
 * readout, so a harness driving the zoom by keystroke otherwise has to infer
 * the scale it landed on from disc diameters. Refilled in place once per frame;
 * nothing in the app reads it.
 */
export const paintedFrame = {
  k: 0,
  visible: 0,
  /**
   * How many times the painter has run, and the curtain alpha the last run
   * composed at.
   *
   * This file and GraphCanvas are full of measured paint RATES — "0.5 paints/s
   * with nothing selected", "43.7 full-scene paints/s with the hub selected" —
   * and until now every one of them was a number somebody took once with a
   * profiler and wrote into a comment. Nothing on the page published it, so the
   * idle gate's two opposite failure modes were both invisible from outside: a
   * loop that never sleeps costs a reader their battery, and a loop that sleeps
   * on an empty canvas is the reduced-motion blank-canvas defect. A counter is
   * one increment per frame and it makes both of them a subtraction.
   *
   * Counted BEFORE the `sceneAlpha` early-out, because that path has already
   * cleared the canvas — a pass that painted nothing is still a pass that
   * changed what is on screen, and `alpha` is what says which kind it was.
   */
  n: 0,
  alpha: 0,
  /**
   * The rectangle the chrome has left the reader, in screen px.
   *
   * Published because every visibility claim in this file is relative to it and
   * it is not derivable from anything else the page exposes — the insets live in
   * four CSS custom properties on `.app`, and a harness that re-reads them is a
   * second copy of the arithmetic that can disagree with the painter's. See
   * `uncovered`.
   */
  open: { x: 0, y: 0, w: 0, h: 0 },
  /** Screen-space disc of every node the painter put inside the viewport, and
   *  `vis`: the fraction of it standing in `open` rather than behind a panel. */
  discs: [] as { id: string; x: number; y: number; r: number; vis: number }[],
  /**
   * …and every visible node the label pass decided NOT to name, with the reason.
   *
   * The third of these surfaces, and the one that pays for itself fastest. With
   * no mark inside any disc an unnamed node is an anonymous face, so "18 of 20"
   * is not a score, it is two people — and the failures behind it (nowhere legal
   * to seat the box; seated but standing down under the veil; nowhere honest to
   * seat it; the person is behind a panel) want opposite fixes. Reading it out
   * of the pixels means OCR, and reading it out of the DOM is impossible; the
   * solver is the only thing that knows. Empty in the common case, so it costs a
   * `length = 0` per frame.
   */
  dropped: [] as { id: string; why: 'no-seat' | 'veiled' | 'too-small' | 'unseen' | 'stray' }[],
  /**
   * The `parallel` edges' terminators — the open circles that stop short of the
   * cold band's rail — in screen px, each with the id of the person it is
   * pointing at and `dx`, the signed screen distance from being directly above
   * them. See THE TERMINATOR'S ADDRESS. The device's entire claim is that the
   * vertical says who, so `dx` is the number that claim is worth.
   */
  stubs: [] as { id: string; x: number; y: number; dx: number }[],
  /**
   * …and every name the picture left nowhere honest to put.
   *
   * A caption whose box centre is nearer somebody else's plate centre than its
   * own is, with no mark inside any disc, a false statement about a named real
   * person — the round-10 blocker, filed four times off screenshots. The solver
   * now prices that seat above every other kind of collision, so this list is
   * empty whenever the geometry allows it to be; when it is not empty, every
   * entry here has had a leader hairline STROKED from its own rim to its box,
   * which is the correction. Published so both halves of that claim can be
   * asserted from outside instead of counted off pixels: the list should be
   * short, and nothing may be nearer a stranger without appearing in it.
   */
  strayed: [] as { id: string; reads: string | null; own: number; other: number }[],
};

/* …and the bridge that makes the two lists above worth publishing.
 *
 * Both were exported for a harness to read and nothing imported them, so the
 * claim "a harness can intersect the list and count" was true of the data
 * structure and false of the app: from outside the page there was no way to
 * reach either, and round 10 filed the caption-attribution blocker four times
 * off screenshots because measuring it meant OCR. Both objects are refilled in
 * PLACE once per frame, so one reference published once at module scope is a
 * live view of the current frame and costs nothing per frame. Same unconditional
 * treatment `__atlasDebug` already gets in GraphCanvas. */
if (typeof window !== 'undefined' && PROBES) {
  (window as unknown as { __atlasPaint?: unknown }).__atlasPaint = {
    labels: paintedLabels,
    frame: paintedFrame,
    /* …and the one threshold an assertion about the two lists has to share with
       the painter. "Every painted name's owner is at least this visible" and
       "whose name does this look like, of the faces on screen" are both written
       against LABEL_SEEN_MIN, and a harness that hard-codes 0.4 is a second copy
       of a number that can move. */
    seenMin: LABEL_SEEN_MIN,
  };
}

type Align = 'center' | 'left' | 'right';

/** Hermite ramp, so a label materialises across a zoom range instead of being
 *  switched on by an `if`. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Per-node label memory.
 *
 * The placer used to re-solve from scratch every frame, so any sub-pixel move
 * could flip the winner of a collision and a name would teleport 40–60px or
 * blink out. A label keeps the slot it has until that slot has been blocked
 * for a continuous quarter second, and it glides to a new one rather than
 * cutting. Keyed weakly so a rebuilt graph drops its entries with the nodes.
 */
interface LabelMemo {
  slot: number;
  /** ms the current slot has been blocked. */
  blocked: number;
  /** Eased offset from the node centre, in screen px. */
  ox: number;
  oy: number;
  seeded: boolean;
  /** 0 = painted, 1 = withheld. See VEIL. */
  veil: number;
}
const labelMemo = new WeakMap<GNode, LabelMemo>();
/** drawLabels is called once per frame and needs a dt for its dwell timers. */
let labelLastTime = 0;
const SLOT_DWELL_MS = 250;

/**
 * THE VEIL — how a name gets out of the way of another name, in transit.
 *
 * The slot solver guarantees no text-on-text at rest, and it does: measured on
 * the running app, by-season and by-archetype both settle at 0 overlapping
 * label boxes out of 24 and 30. It cannot guarantee it DURING a mode change,
 * and the reason is structural rather than a bug in the solver. The assignment
 * is solved once against the destination — which is what lets a name ride its
 * own disc for the whole flight instead of being re-solved against a different
 * picture every frame — but two discs whose destinations are far apart can pass
 * within a few pixels of each other on the way, and their names ride with them.
 * Measured before this: 15.2% of frames in web→archetype and 17.5% in
 * web→seasons carried at least one overlap, up to 10 concurrent and 19px deep,
 * across a 200–1030ms window.
 *
 * Solving that by re-solving per frame is what the destination solve replaced,
 * and pinning the names to their destinations for the flight throws away the
 * tracking the whole transition exists to support. So the only thing that
 * changes is which of two colliding names is on screen: the labels are painted
 * in priority order (focus, then weight), and a name that would land on one
 * already painted this frame stands down until the way is clear. That is the
 * rule this file already applies in the free layout — "an overprinted name is
 * not a shorter label, it is an unreadable one" — extended to the one case
 * where the solver cannot see the collision coming.
 *
 * Eased, not cut: out over three or four frames so the name is not seen to pop,
 * and back over 260ms so a pair grazing each other repeatedly does not strobe.
 *
 * IT IS A TRANSIT DEVICE AND IT WAS BEHAVING AS A CENSOR. Three things were
 * wrong once no plate carried a mark any more, and a veiled disc stopped being
 * a quieter node and became an anonymous face:
 *
 *   • it went to ZERO. A name at 0 identifies nobody; the whole argument for
 *     yielding is that two overprinted names are both unreadable, which is an
 *     argument for one of them being SECONDARY, not for it being gone.
 *   • the asymmetry ran the wrong way for the failure that actually shipped.
 *     55ms out against 260ms back is right for a graze in transit and wrong at
 *     rest, where the loser of a stand-off waits 260ms for a return that never
 *     comes; measured on the default 390x844 English view, "Jung Keun-woo" was
 *     absent from `paintedLabels` for the whole 5.1s the probe ran, with the
 *     scene reporting rest=true throughout, and "Kim Kyung-hoon" for 4.1s.
 *   • the solver was never told. A label sitting under a veil kept passing the
 *     `freeSoft(slot)` fast path — the clash is in PAINT space and the solver
 *     works in SOLVE space, which are the same rectangle at rest — so it held
 *     the seat it was being punished for and never looked for another.
 *
 * So: a floor, symmetric timings, and a veil above 0.5 counts as a blocked slot
 * so the search runs. What is left is a genuine stand-off in a picture with no
 * free seat, and there the name is set at a third of its weight, which is
 * plainly deferential and still says who this is.
 *
 * Measured across web→archetype and web→seasons, sampled every frame for 2s:
 * before any veil at all, 15.2% and 17.5% of frames carried an overlap, up to 10
 * concurrent and 19px deep, over a 737ms window. VEIL_OUT_MS 90 took that to
 * 4.0% and 0%, and 55 left only the fade itself — but both of those counts were
 * flattered by the thing being fixed here: a name faded to nothing is not in
 * `paintedLabels`, so it could not be counted as overlapping anything.
 *
 * Re-measured at 90/90 WITH the floor, so a yielding name is still ink and is
 * still counted: 6.3 / 2.7 / 6.3% of frames in web→seasons and 5.1 / 7.1 / 6.7%
 * in web→archetype across three runs each, 1–3 concurrent, never deeper than
 * 17px — and in every one of those 26 frames one of the two was already fading
 * out under the veil. Not one frame put two full-strength names on the same
 * pixels, which is the failure the veil exists for; what is left is a name
 * deferring in public instead of in secret.
 *
 * At rest there is now no clash to veil at all: the ranker below refuses a seat
 * that lands on another name outright, so the veil is what it says it is — a
 * transit device. Re-measured on the 390x844 English view that produced the
 * finding, 20 of 20 named continuously through a 6.2s probe with rest=true.
 */
const VEIL_OUT_MS = 90;
const VEIL_IN_MS = 90;
/** How much of a name the veil may take. It stops at the same 45% the focus dim
 *  stops at (DIM_FLOOR), so the canvas has ONE secondary weight for type
 *  rather than two — a name that is standing aside and a name that has been
 *  de-emphasised are the same claim about rank and should look it. Sampled off
 *  the painted canvas: glyph against its own plate reads 3.65–3.72:1 at this
 *  weight and 14.4–17.9:1 at full, which is a four-to-five-fold separation in
 *  the only channel that carries priority here. Going the rest of the way to
 *  zero buys the winner no legibility it does not already have, and costs the
 *  loser their identity outright. */
const VEIL_TAKE = 0.55;
/** A veil this deep is treated as a blocked slot, so the solver goes looking
 *  for a seat instead of leaving the name standing down forever. Above the
 *  half-way point, so a graze in transit never triggers a re-solve. */
const VEIL_RESOLVE = 0.5;
/** Below this the label is not putting readable ink on the canvas, so it also
 *  stops claiming the space — and stops being counted as painted. */
const VEIL_INK = 0.12;

/** Rectangles a label may not be set in. A label painted under the dossier is
 *  not a shorter label, it is a name cut in half, so the panels are obstacles
 *  in the collision map exactly like any other occupied box.
 *
 *  The four walls are unconditional, not `if (inset > 0)`. On a 390px phone the
 *  right and left insets are both 0 — the sheets take height, not width — so
 *  there was nothing on that side of the map at all, and a two-line focused
 *  label seated to the right of its disc ran clean off the viewport: "Former
 *  StarCraft professional · professional poker pla". The frame is an obstacle
 *  whether or not a panel happens to be standing on it. */
function chromeBoxes(s: RenderState): Box[] {
  const ins = s.insets;
  const BLEED = 600;
  // …and any floating card, which is a wall that happens to be small. See
  // RenderState.cards for the handoff that fills this in.
  return [
    ...(s.cards ?? []),
    { x: -BLEED, y: -BLEED, w: Math.max(0, ins.left) + BLEED, h: s.height + BLEED * 2 },
    {
      x: s.width - Math.max(0, ins.right),
      y: -BLEED,
      w: Math.max(0, ins.right) + BLEED,
      h: s.height + BLEED * 2,
    },
    { x: -BLEED, y: -BLEED, w: s.width + BLEED * 2, h: Math.max(0, ins.top) + BLEED },
    {
      x: -BLEED,
      y: s.height - Math.max(0, ins.bottom),
      w: s.width + BLEED * 2,
      h: Math.max(0, ins.bottom) + BLEED,
    },
  ];
}

/** Flat charge for hitting anything at all, on top of the area — so a caption
 *  seat that grazes one obstacle always loses to one that grazes none, whatever
 *  the areas are. See the walk in drawCaptions. */
const CAPTION_HIT = 400;


/** How far a piece of type may stand off the thing it names before it needs a
 *  hairline to hold it there. A little over three line-box heights at caption
 *  size; below it the standoff still reads as "this label belongs to that". One
 *  number for both painters — the region caption and the node label are the
 *  same object at two scales, and the reader learns the device once. */
const LEADER_MIN_GAP = 40;

/** Overlap area of two boxes, 0 when they are disjoint. Used to rank slots when
 *  every one of them is blocked and the mode has to name the node anyway. */
function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  if (w <= 0) return 0;
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return h <= 0 ? 0 : w * h;
}

/** Does a box reach inside a circle? The plate is square in the collision map
 *  and round on the canvas, and the difference is the whole margin a caption
 *  has at the corners of somebody's laurel. */
function boxHitsCircle(b: Box, cx: number, cy: number, r: number): boolean {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function drawLabels(ctx: CanvasRenderingContext2D, s: RenderState, sceneAlpha: number): void {
  const { view } = s;
  const dt = labelLastTime ? Math.min(64, s.time - labelLastTime) : 16;
  labelLastTime = s.time;
  paintedLabels.length = 0;
  paintedFrame.dropped.length = 0;
  paintedFrame.strayed.length = 0;

  /* Which picture the solver is looking at.
   *
   * An anchored arrangement in transit is a different picture on every frame,
   * and re-solving against it is what made names blink out mid-flight and land
   * in placements that exist in no frame before or after: at 472ms into
   * web → season the count went 18 → 17 → 20 with three names gone and one set
   * across a neighbouring disc. But an anchored arrangement is also the one
   * case where the destination is *known in advance* — every node has an anchor
   * and the camera has a tween — so the whole assignment can be solved once,
   * against where everything is going, and each name then rides its own disc at
   * a fixed offset for the entire flight. That is exactly the tracking the
   * transition exists to support.
   *
   * `solveAt` is therefore the destination projection while an anchored mode is
   * settling and the live one otherwise; the two converge on arrival, so there
   * is no seam when it switches back. */
  const solving = s.anchored && s.settling;
  const sv = solving ? s.viewTo : view;
  const solveAt = (n: GNode): { x: number; y: number } =>
    solving
      ? { x: n.ax * sv.k + sv.x, y: n.ay * sv.k + sv.y }
      : { x: n.x * sv.k + sv.x, y: n.y * sv.k + sv.y };

  const placed: Box[] = chromeBoxes(s);
  /** `placed` is built chrome-first, then discs, then captions and labels, so
   *  these two counts are all the slot ranker needs to know what it just hit. */
  const CHROME_N = placed.length;
  /** The same four walls as a positive area — what a name is worth painting
   *  INSIDE, as opposed to what it may not be painted OVER. See LABEL_SEEN_MIN. */
  const open = uncovered(s);

  /* Every visible node's PLATE goes into the map before a single string is laid
     out. Text set over a monogram is illegible whichever of the two was painted
     first, and this is what produced "ATHLE혜선TE" and "DIR성주TIES".

     The obstacle used to be the subject disc — the photograph — and the plate
     draws out to 1.72× that (1.83× for a champion): season arcs, host hairline,
     twenty rim ticks, brass laurel. So a name only had to clear someone's face
     to be considered clear of them, and it was landing in their laurel. Measured
     before this on the running app: 4 label boxes reaching into a neighbour's
     plate at the fitted desktop zoom after one wheel-out, 6 on a 390px phone
     with the dossier open — including 박지민's name 4.9px inside the plate of
     홍진호, who was the person the dossier was open on, and 현성주's name 3.8px
     inside 서출구's photograph. `plateExtent` has computed exactly this number
     since the plates were ported to the canvas; only the keyboard cursor was
     reading it. */
  const discs: Box[] = [];
  /** Who each of those belongs to, and where their PHOTOGRAPH is inside it —
   *  parallel to `discs`, so the slot ranker can tell "grazed a stranger's
   *  laurel" from "printed across a stranger's face" from "sat on its own
   *  plate", which as boxes are the same kind of hit. */
  const discOf: { id: string; x: number; y: number; rPhoto: number; rPlate: number; seen: boolean }[] = [];
  for (const n of s.nodes) {
    if (n.appear <= 0.08) continue;
    // The swell drawNodes gives a focused disc, so the collision circle is the
    // one the reader is looking at rather than the one at rest. Without it a
    // neighbour's picture is 3.8% wider than the map says and a caption grazes
    // the face the map swore was clear — measured at 1.2–3.0px on a phone.
    const swell = 1 + n.focus * 0.09;
    const r = plateExtent(n) * swell * sv.k + 4;
    const p = solveAt(n);
    if (p.x < -260 || p.x > s.width + 260 || p.y < -220 || p.y > s.height + 220) continue;
    const rPhoto = photoRadius(n) * sv.k;
    discs.push({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 });
    discOf.push({
      id: n.id,
      x: p.x,
      y: p.y,
      rPhoto,
      // The drawn plate, not the padded collision square — the leader below has
      // to know whether a caption is actually inside somebody's laurel.
      rPlate: plateExtent(n) * swell * sv.k,
      /* …and whether the reader can see this face at all.
       *
       * It stays an OBSTACLE either way — a name may not be painted over a
       * photograph the panel happens to be covering, because the panel can
       * close. But it stops being an OWNER: "whose name does this box look
       * like" is a question about what is on screen, and counting a disc behind
       * the dossier as the nearest face made honest seats read as lies and
       * pushed live names off the canvas to protect a picture nobody was
       * looking at. */
      seen: seenFraction(p.x, p.y, rPhoto, open) >= LABEL_SEEN_MIN,
    });
  }
  for (const d of discs) placed.push(d);

  // Link geometry as obstacles. The collision solver used to know about discs
  // and other labels but nothing about the thirty-three coloured lines running
  // between them, so at 1280×800 six names were painted directly on top of a
  // saturated dashed edge. A link is a quadratic, so it is sampled into six
  // straight runs and tested exactly rather than by its (useless) bounding box.
  const segs: Seg[] = [];
  const SEG_N = 6;
  for (const l of s.links) {
    if (l.draw <= 0.35 || l.dim > 0.85) continue;
    const a = solveAt(l.source);
    const b = solveAt(l.target);
    // The control point follows whichever endpoints the solver is using, so a
    // destination solve tests the destination curve rather than the live one.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = l.curve * Math.min(len * 0.24, 90 * sv.k);
    const qx = a.x + dx / 2 + (-dy / len) * off;
    const qy = a.y + dy / 2 + (dx / len) * off;
    if (
      Math.max(a.x, b.x, qx) < -200 ||
      Math.min(a.x, b.x, qx) > s.width + 200 ||
      Math.max(a.y, b.y, qy) < -200 ||
      Math.min(a.y, b.y, qy) > s.height + 200
    )
      continue;
    let px = a.x;
    let py = a.y;
    for (let i = 1; i <= SEG_N; i++) {
      const t = i / SEG_N;
      const u = 1 - t;
      const nx = u * u * a.x + 2 * u * t * qx + t * t * b.x;
      const ny = u * u * a.y + 2 * u * t * qy + t * t * b.y;
      segs.push({ x0: px, y0: py, x1: nx, y1: ny });
      px = nx;
      py = ny;
    }
  }

  /* Important nodes get first claim on the space; everything else yields.
   *
   * A PHOTOGRAPHED node claims it before any of them. Its plate carries no mark
   * — a name set across someone's face is neither a name nor a portrait — so it
   * has no identity of its own to fall back on, and the caption under it is the
   * whole of the identification rather than a repetition of it. Sorting them
   * first is also what keeps them out of the VEIL: the veil stands a name down
   * when it would land on one already inked this frame. Measured before this: at
   * k = 4.2 홍진호 was the largest disc on the canvas, the hub with eleven ties,
   * and carried no text of any kind.
   *
   * ALL TWENTY ARE PHOTOGRAPHED NOW, so this key is constant and the sort falls
   * straight through to focus-and-weight, which is where it was before the two
   * sample tiles arrived. That is correct and it is not dead: the predicate is
   * "carries no mark", the mark comes back the moment a file leaves
   * public/portraits/, and a mixed set is the case it exists for. What is no
   * longer true is the arithmetic under it — every node now takes the ranked
   * placement below rather than the free layout's licence to yield, so a name
   * that cannot be seated lands on its least-bad slot and the VEIL, not the
   * solver, is what decides whether it is inked. Measured over three runs at the
   * default camera: 18–20 of 20 named, the misses always a pair inside one
   * cluster. */
  /* Which side of the cold band's row its own caption took, so the three names
     can take the other one. Solved once for the frame — coldBounds walks every
     node — rather than per label. Null when there is no band on screen. */
  const coldSide = s.clusters.some((c) => c.flat) ? coldBounds(s) : null;

  const named = (n: GNode) => PORTRAIT_URL[n.id] !== undefined;
  const order = s.nodes
    .filter((n) => n.appear > 0.35)
    .slice()
    .sort(
      (a, b) =>
        (named(b) ? 1 : 0) - (named(a) ? 1 : 0) || b.focus + b.weight * 0.6 - (a.focus + a.weight * 0.6),
    );

  /* Zoom buys information, not just bigger circles: the caption grows with the
     monogram, and past ~1.8x every node volunteers its role line.

     Below the fitted zoom it has to work the other way too. Type is set in
     screen space and discs are set in world space, so the two diverge as the
     camera pulls back: on a phone with the dossier open the graph collapses to
     a ~180px blob at k ≈ 0.15 and the names beside it were still being set at
     their full desktop size — 12.5 CSS px, i.e. 25 device px, over 5px discs.
     `zoomScale` ties the type back to the picture below k = 0.62, which is
     where `lod` stopped having anything to say. */
  /* Above this the free web layout stops being allowed to yield a name. See the
     ranked-placement branch below. */
  const LABEL_RANK_K = 1.3;
  const zoomedIn = view.k > LABEL_RANK_K;
  const zoomScale = labelZoomScale(view.k);
  const lod = captionLod(view.k);
  const nameSize = 12.5 * lod;
  const subSize = Math.round(nameSize * 0.88);
  const alwaysSub = view.k >= 1.8;

  if (s.clusters.length && s.regionAlpha > 0.02) drawCaptions(ctx, s, sceneAlpha, placed);

  ctx.textBaseline = 'top';

  for (const n of order) {
    /* AN EXTENT IS A CLAIM ABOUT INK, and a stale one is a claim about ink that
     * is no longer there.
     *
     * `labelExtent` is the camera's allowance for how far the names hang past
     * the discs, and it was written only on the way out — so a name the solver
     * gave up on left its last measurement behind and the camera went on
     * reserving room for it. That was survivable while a drop was rare; this
     * round makes it ordinary (a face behind the dossier, a seat that would have
     * been a lie), and the reserve for a name that is not on screen is spent out
     * of the viewport, i.e. it zooms the graph out to make room for nothing.
     * Cleared here and written only when the label is actually inked, so the
     * allowance and the picture are the same frame. */
    labelExtent.delete(n);
    // Where the name is solved (the destination during an anchored transit)…
    const sp = solveAt(n);
    const sx = sp.x;
    const sy = sp.y;
    // …and where it is painted, which is always on the disc the reader is
    // watching. The two are the same everywhere except mid-transition.
    const px0 = n.x * view.k + view.x;
    const py0 = n.y * view.k + view.y;
    /** The whole object's radius and the photograph's, in screen px. The seat
     *  hangs off the first (see THE SEAT RADIUS); the second is the one thing
     *  a name may never be set on. */
    const rPlate = plateExtent(n) * sv.k;
    const rPhoto = photoRadius(n) * sv.k;

    /* NAMING SOMEBODY THE READER CANNOT SEE.
     *
     * The old test was the frame plus a 160×100 apron, on the node's centre —
     * which passes a disc that is entirely off the canvas (the apron), and says
     * nothing at all about the panels, which is where the failure actually
     * lives: the dossier overlays the canvas rather than shrinking it, so a
     * plate behind it is on screen by every test this file had. The question is
     * not "does this node exist near the viewport" but "can the reader see the
     * face this name is for", and that is `open` and a fraction of it.
     *
     * Measured in PAINT space, not solve space: mid-transit the label rides the
     * disc the eye is following, so the disc the eye is following is the one
     * that has to be visible.
     *
     * A node that is nowhere near the canvas is not a dropped name, it is not a
     * name — recording it would fill `dropped` with the fifteen people who are
     * simply off the edge at k = 4.2 and bury the two the reader might have
     * expected. Only a face that is ON the canvas and covered is reported. */
    const rPaint = photoRadius(n) * view.k;
    const onCanvas =
      px0 + rPaint >= 0 && px0 - rPaint <= s.width && py0 + rPaint >= 0 && py0 - rPaint <= s.height;
    if (seenFraction(px0, py0, rPaint, open) < LABEL_SEEN_MIN) {
      if (onCanvas) paintedFrame.dropped.push({ id: n.id, why: 'unseen' });
      continue;
    }

    // Below a certain zoom only hubs, hovered and selected nodes are named —
    // otherwise the canvas turns into soup. It is a ramp rather than an `if`,
    // because twenty names hard-cutting on in one frame as the entrance zoom
    // crosses a threshold is a pop, not a reveal.
    //
    // The cold-tray four count as important. They have weight 0 by
    // construction, so they used to be the dimmest text in the frame — sitting
    // directly under a caption telling the reader these are the four to look at.
    //
    // The zoom ramp used to hold ordinary names back until k ≥ 0.55, which is
    // above the zoom a 1280×800 laptop actually fits at — so on the commonest
    // desktop size nineteen of twenty people were anonymous discs, or painted
    // at 40% over a saturated edge. Culling by zoom was doing a job the slot
    // solver now does properly: it tests against discs, chrome, other labels
    // and the link geometry, and it yields when there is genuinely no room.
    // So the ramp only has to keep the very small end from turning to soup.
    //
    // Ring 1 and ring 2 of an ego network count as important as well. Orbit's
    // outer ring caption says "한 다리 건너 · 10명"; ten anonymous discs under
    // it is a lie about the picture, and those ten are exactly the nodes the
    // weight test rejects.
    const ring = s.rings?.get(n.id);
    // …and a photographed disc, whose caption is not a repetition of its mark
    // but the only text it has. See `named` above.
    const hasPhoto = named(n);
    const important = n.weight > 0.62 || n.noTies || hasPhoto || (ring !== undefined && ring <= 2);
    /* Only the person the reader is actually ON is exempt from the ramp.
     *
     * `focus > 0.02` exempted every *neighbour* too (they ease to 0.42), which
     * is how a 390px phone with the dossier open ended up painting three names
     * at full desktop size, 150–250px away from the 5px discs they belonged to,
     * over otherwise empty canvas. A neighbour is a normal node with a
     * highlight; it does not get to opt out of the zoom that decides whether a
     * name is readable at all. */
    const onIt = n.focus > 0.6;
    const zoomFade = onIt
      ? 1
      : important
        ? smoothstep(0.2, 0.32, view.k)
        : smoothstep(0.32, 0.46, view.k);
    /* DIMMING IS NOT CULLING, and it had become culling.
     *
     * `vis` used to carry the focus dim: `appear * (1 - dim * 0.88) * …` lands
     * a fully de-emphasised node at exactly 0.12, and the very next line drops
     * anything at or under 0.12. So the caption of every non-neighbour was not
     * dimmed, it was deleted — measured live at the fitted desktop zoom, hover
     * on 홍진호 dimmed 7 people and unnamed exactly those 7; with the dossier
     * open it was 8. Before the photographs that was survivable, because the
     * plate still carried a monogram; now no plate carries anything, so those
     * are faces with no name attached, and they are precisely the people the
     * reader is scanning for next.
     *
     * So the cull keeps the zoom ramp — which is a legibility test, and a name
     * too small to read is genuinely better off absent — and the dim moves into
     * the painted alpha, where it belongs. A de-emphasised name is set at 45% of
     * a lit one: recessive at a glance, and legible the moment the eye stops on
     * it. Sampled on the running canvas with the hub hovered, the seven dimmed
     * captions measure 3.65–3.72:1 glyph against their own plate, the twelve lit
     * ones 17.4–17.9:1. Twenty of twenty named, where the seven were nameless. */
    const vis = n.appear * sceneAlpha * zoomFade;
    // A half-painted name is worse than a suppressed one — the code already
    // says so where it yields a slot. So the ramp is spent in a narrow band and
    // anything that survives it is painted at ≥0.75, never at 40%.
    if (vis <= 0.12) {
      paintedFrame.dropped.push({ id: n.id, why: 'too-small' });
      continue;
    }
    // The same floor the disc itself now stops at — see DIM_FLOOR.
    const paint =
      Math.min(1, (vis - 0.12) / 0.1) *
      (0.75 + 0.25 * Math.min(1, (vis - 0.12) / 0.5)) *
      (1 - n.dim * (1 - DIM_FLOOR));

    // Only the person actually under the pointer or open in the dossier gets a
    // role line. At 0.25 every neighbour qualified, so selecting the hub put
    // eleven two-line labels inside one ego ring and none of them could be set
    // without overlapping something.
    // …and only once the type is at full size. Below that the role line is set
    // at 8px, which is not a role line, and it doubles the height of the one
    // box that most needs to fit — on a phone with the dossier open there are
    // 210px of uncovered canvas to place it in.
    /* …AND NOT FOR THE PERSON A CARD IS ALREADY DESCRIBING.
     *
     * `focus > 0.6` is "hovered, or open in the dossier", and in the hovered
     * half of that the HoverCard is mounted ~40px from the pointer showing this
     * person's name, this person's role line and a thumbnail of this person's
     * photograph. The canvas was setting the same role line a second time, on
     * top of the picture the card is showing a copy of.
     *
     * That duplication is not free. It is the mechanism the round-15 blocker
     * names: promoting to two lines takes a Korean caption from ~70px wide to
     * ~200px, and a 200px box on a crowded hub either finds nothing honest and
     * is dropped whole — this file already documents "the hub was the ONE
     * unnamed disc in the frame" — or lands somewhere it had to pay for.
     *
     * So the role line is the part that yields, which is the trade this file
     * already makes one step later where a two-line box cannot be seated
     * honestly: "the role line is an elaboration and it is also in the hover
     * card; the name is the identification". The name stays on the canvas, at
     * a third of the width.
     *
     * Only for the pointer. `alwaysSub` at k ≥ 1.8 is the whole cast growing a
     * role line together and one node opting out of that reads as a fault; the
     * DOSSIER is a 530px panel across the room rather than a card at the
     * pointer, so the caption is the anchor that says which disc it is about
     * and it keeps its second line; and the KEYBOARD CURSOR never sets
     * `hoverId` at all (GraphCanvas publishes it from pointermove only), so the
     * keyboard reader — who has no card — keeps everything. */
    const carded = s.hoverId === n.id && s.selectedId === null;
    const wantsSub = (n.focus > 0.6 && zoomScale >= 1 && !carded) || alwaysSub;
    ctx.textAlign = 'center';
    ctx.font = `${W_MED} ${nameSize}px ${FONT}`;
    const name = s.lang === 'en' ? n.labelEn : n.label;
    const sub = s.lang === 'en' ? n.sublabelEn : n.sublabel;
    const nameW = ctx.measureText(name).width;
    ctx.font = `${W_TEXT} ${subSize}px ${FONT}`;
    const subW = wantsSub ? ctx.measureText(sub).width : 0;

    // The reserved box is the glyph run plus its own clear space, not the glyph
    // run. 2.5px of leading is not enough of a gutter for two names the solver
    // has had to seat one above the other: they measure as disjoint boxes and
    // read as one paragraph, and their ascenders and descenders touch. 6px is
    // half a line of air, which is the least that reads as two labels.
    const lineH = Math.round(nameSize + 2.5);
    const dimsFor = (withSub: boolean) => ({
      w: Math.max(nameW, withSub ? subW : 0) + 14,
      h: (withSub ? lineH + subSize + 5 : lineH) + 6,
    });
    let useSub = wantsSub;
    let { w: boxW, h: boxH } = dimsFor(useSub);

    // Every label is collision-tested, including the focused ones — those are
    // exactly the labels that just grew a second line and are twice as tall, so
    // exempting them is how two role lines end up set as one nonsense string.
    // Eight anchors: the four cardinals first, then the diagonals, because the
    // node discs are now obstacles and the cardinals alone drop too much.
    // Far enough out that the diagonal box clears the node's own disc box,
    // which is now in `placed` like everyone else's.
    /* THE SEAT RADIUS. It is the PLATE's, and past a point it is neither.
     *
     * Every slot below hangs off a radius, and that radius used to be the
     * photograph's. But the object drawn at this node is the plate — season
     * arcs at 1.26×, host hairline at 1.38×, rim ticks at 1.50×, brass laurel
     * out to 1.83× — so seating a caption at r + 8 seated it in the middle of
     * somebody's record, and the collision map (which had the same radius) said
     * that was clear. Photographed: '이진형' set across 이태균's laurel in
     * 16-zoomed-in, and on a phone with 홍진호's dossier open, '박지민' painted
     * across 홍진호's own plate. A caption on the wrong plate is a false
     * statement about a real person, and with no mark inside any disc the
     * caption is the whole of the identification.
     *
     * `plateExtent` is that radius and has been exported since the plates were
     * ported to canvas; the keyboard cursor was its only reader.
     *
     * THE CAP is still needed and it now has a floor. Uncapped, at k ≈ 2.7 the
     * hub's slots were being thrown 180–400px out, past the viewport walls that
     * `chromeBoxes` makes absolute obstacles, and the ranker answered Infinity
     * for all sixteen: 1 of 3 visible nodes named at k = 3.5. But a flat cap of
     * 96 is now *inside* the photograph at high zoom — the largest disc is 149px
     * across the radius at k = 4.2 — and plate.ts's own rule is that a name set
     * across someone's eyes is neither a name nor a portrait. So the cap may
     * never come in past the picture: it lands the seat on the plate's own quiet
     * annulus, which is the one place a caption can sit at that zoom without
     * covering either a face or a neighbour. */
    const LABEL_SEAT_MAX = 96;
    const r = Math.min(rPlate, Math.max(LABEL_SEAT_MAX, rPhoto + 10));
    const dr = r + 12;
    /** …and the inner ring's radius: as far in as the photograph allows, never
     *  past it, and never outside the ordinary seat. See the four spots at the
     *  end of buildSpots. 7px of standoff, so the box is clear of the picture
     *  by half a line's leading rather than touching it. */
    const ir = Math.min(r, Math.max(rPhoto + 7, r * 0.55));

    /* THE ESCAPE BEARING — the one direction the fixed rings cannot offer.
     *
     * Every seat above sits on one of eight bearings 45° apart, and a caption's
     * honest region is its node's Voronoi cell: the half-plane away from the
     * nearest face. On a 390px phone at k = 0.45 the discs overlap, that cell is
     * narrow, and eight fixed bearings can miss it entirely — so the ranker had
     * nothing honest to choose and took the least-bad lie. Measured on the
     * production build before this: 37 painted captions across 30 states sat
     * nearer a stranger's disc centre than their own, 27 of them on the phone.
     *
     * So the node is also offered three seats on the bearing that points away
     * from the crowd, computed from the crowd rather than from a table: the
     * inverse-square sum of the unit vectors away from every disc within six
     * radii, which is the direction that maximises clearance from the near ones
     * without ignoring the far ones. Three distances — hard against the
     * photograph, at the ordinary seat ring, and one line-box beyond it — so the
     * ranker can trade honesty against how far the name has to stand off.
     *
     * They are LAST, after the inner ring, for the same reason the inner ring is
     * last: they are only worth taking when the alternative is naming somebody
     * else's face, and SEAT_PULL already prefers the nearest honest seat of
     * whatever kind. */
    let exs = 0;
    let eys = 0;
    for (const d of discOf) {
      if (d.id === n.id || !d.seen) continue;
      const vx = sx - d.x;
      const vy = sy - d.y;
      const dd = Math.hypot(vx, vy);
      if (dd < 1e-3 || dd > r * 6) continue;
      const wgt = 1 / (dd * dd);
      exs += (vx / dd) * wgt;
      eys += (vy / dd) * wgt;
    }
    const el = Math.hypot(exs, eys);
    // Nobody near enough to escape from: fall back to straight down, which is
    // the cardinal the picture reads first anyway.
    const ux = el > 1e-9 ? exs / el : 0;
    const uy = el > 1e-9 ? eys / el : 1;
    /* …and the other bearing worth having, which is not the same one: straight
       away from the SINGLE nearest face. The crowd vector is the best average
       clearance and the nearest-face vector is the best worst case, and it is
       the worst case that decides whether a box reads as somebody else's — one
       disc 30px away outranks four at 200. Two bearings, five seats. */
    let nx1 = 0;
    let ny1 = 1;
    let nd = Infinity;
    for (const d of discOf) {
      if (d.id === n.id || !d.seen) continue;
      const vx = sx - d.x;
      const vy = sy - d.y;
      const dd = Math.hypot(vx, vy);
      if (dd > 1e-3 && dd < nd) {
        nd = dd;
        nx1 = vx / dd;
        ny1 = vy / dd;
      }
    }

    const buildSpots = (bw: number, bh: number): { box: Box; tx: number; align: Align }[] => {
      const fr = r + 14 + bh * 2.1;
      /** A seat whose box's near edge stands `d` off the centre along a bearing.
       *  The half-extent along the ray is the box's own projection, so the
       *  standoff is the same whichever way the bearing happens to point. */
      const along = (bx1: number, by1: number, d: number): { box: Box; tx: number; align: Align } => {
        const half = (Math.abs(bx1) * bw + Math.abs(by1) * bh) / 2;
        const cxp = sx + bx1 * (d + half);
        const cyp = sy + by1 * (d + half);
        return { box: { x: cxp - bw / 2, y: cyp - bh / 2, w: bw, h: bh }, tx: cxp, align: 'center' };
      };
      const away = (d: number) => along(ux, uy, d);
      /* AND FOUR THAT SLIDE ALONG THE LINE THEY ARE SET ON.
       *
       * A caption box is three to five times wider than it is tall, so the
       * distance from a node to its box CENTRE — which is the whole of the
       * honesty test — is dominated by which way the box is pointing, not by how
       * far out it sits: a seat to the left or right puts its centre half a
       * name-width away, a seat above or below puts it half a line-height away.
       * That is why almost every honest seat on a crowded phone is above or
       * below, and why there were effectively four candidates rather than
       * twenty. Sliding the box a third of its own width along its baseline
       * moves the centre ~25px sideways while it stays over its own disc, which
       * is exactly the freedom the row needs when the face it must not be
       * confused with is directly to one side. */
      const slide = bw * 0.3;
      return [
        { box: { x: sx - bw / 2, y: sy + r + 8, w: bw, h: bh }, tx: sx, align: 'center' },
        { box: { x: sx - bw / 2, y: sy - r - 10 - bh, w: bw, h: bh }, tx: sx, align: 'center' },
        { box: { x: sx + r + 10, y: sy - bh / 2, w: bw, h: bh }, tx: sx + r + 16, align: 'left' },
        { box: { x: sx - r - 10 - bw, y: sy - bh / 2, w: bw, h: bh }, tx: sx - r - 16, align: 'right' },
        { box: { x: sx + dr, y: sy + dr, w: bw, h: bh }, tx: sx + dr + 6, align: 'left' },
        { box: { x: sx - dr - bw, y: sy + dr, w: bw, h: bh }, tx: sx - dr - 6, align: 'right' },
        { box: { x: sx + dr, y: sy - dr - bh, w: bw, h: bh }, tx: sx + dr + 6, align: 'left' },
        { box: { x: sx - dr - bw, y: sy - dr - bh, w: bw, h: bh }, tx: sx - dr - 6, align: 'right' },
        /* Eight more, a couple of line boxes further out. They are never reached
           by the greedy search below — a name that can sit beside its disc
           should — but they give the ranker somewhere to put the twentieth label
           in a packed cluster ring other than on top of the nineteenth, which is
           what produced "LeeYoon Biung" where 이진형 and 윤비 sit shoulder to
           shoulder in the season-2 cap. Nothing but backdrop between them and
           the rim, which is why this ring — and only this ring — is tethered by
           the leader drawn further down. */
        { box: { x: sx - bw / 2, y: sy + fr, w: bw, h: bh }, tx: sx, align: 'center' },
        { box: { x: sx - bw / 2, y: sy - fr - bh, w: bw, h: bh }, tx: sx, align: 'center' },
        { box: { x: sx + fr, y: sy - bh / 2, w: bw, h: bh }, tx: sx + fr + 6, align: 'left' },
        { box: { x: sx - fr - bw, y: sy - bh / 2, w: bw, h: bh }, tx: sx - fr - 6, align: 'right' },
        { box: { x: sx + fr * 0.7, y: sy + fr * 0.7, w: bw, h: bh }, tx: sx + fr * 0.7 + 6, align: 'left' },
        { box: { x: sx - fr * 0.7 - bw, y: sy + fr * 0.7, w: bw, h: bh }, tx: sx - fr * 0.7 - 6, align: 'right' },
        { box: { x: sx + fr * 0.7, y: sy - fr * 0.7 - bh, w: bw, h: bh }, tx: sx + fr * 0.7 + 6, align: 'left' },
        {
          box: { x: sx - fr * 0.7 - bw, y: sy - fr * 0.7 - bh, w: bw, h: bh },
          tx: sx - fr * 0.7 - 6,
          align: 'right',
        },
        /* AND FOUR INSIDE THE PLATE, standing off the PHOTOGRAPH instead of the
           rim. They are the answer to the one failure the ranker could not fix
           by choosing better among the twelve above it.

           A caption's honest region is its node's Voronoi cell — the set of
           points nearer this plate's centre than any other's — and at the zoom
           the app opens at, the tightest seat the rings above could offer was
           measurably OUTSIDE it. Measured on the running app at 1280×800:
           홍진호's closest possible seat centre sits 60.3px from his own plate
           centre while 박지민's centre is 90.2px away, so every bearing toward
           박지민 reads as 박지민 at any cost, and the bearings away from him
           were under somebody else's photograph. Same for 서출구 against
           허성범 (54.7 against a half-spacing of 42.2). The solver was not
           choosing badly; it had nothing honest to choose.

           What this costs is the node's OWN laurel and rim ticks, which this
           file already prices at nothing but their area — it is that person's
           own record and that person's own name, which is the whole difference
           from the foreign-plate case. And that area charge is exactly what
           keeps this ring last: an outer seat that is honest is always cheaper
           than an inner one, so these are only ever taken when the alternative
           is naming somebody else's face. It is the same argument THE CAP above
           already makes at k > 2.7, applied at the zoom the app opens at. */
        { box: { x: sx - bw / 2, y: sy + ir + 4, w: bw, h: bh }, tx: sx, align: 'center' },
        { box: { x: sx - bw / 2, y: sy - ir - 4 - bh, w: bw, h: bh }, tx: sx, align: 'center' },
        { box: { x: sx + ir + 6, y: sy - bh / 2, w: bw, h: bh }, tx: sx + ir + 12, align: 'left' },
        { box: { x: sx - ir - 6 - bw, y: sy - bh / 2, w: bw, h: bh }, tx: sx - ir - 12, align: 'right' },
        // …the five on the two escape bearings. See THE ESCAPE BEARING.
        away(ir + 4),
        away(r + 10),
        away(r + 10 + bh * 1.6),
        along(nx1, ny1, ir + 4),
        along(nx1, ny1, r + 10),
        // …and the four slid along their own baseline.
        { box: { x: sx - bw / 2 + slide, y: sy + r + 8, w: bw, h: bh }, tx: sx + slide, align: 'center' },
        { box: { x: sx - bw / 2 - slide, y: sy + r + 8, w: bw, h: bh }, tx: sx - slide, align: 'center' },
        { box: { x: sx - bw / 2 + slide, y: sy - r - 10 - bh, w: bw, h: bh }, tx: sx + slide, align: 'center' },
        { box: { x: sx - bw / 2 - slide, y: sy - r - 10 - bh, w: bw, h: bh }, tx: sx - slide, align: 'center' },
        /* THE SEAT THAT CANNOT BE WRONG WAS HERE — dead centre, on the person's
         * own photograph — and it is gone. Its argument was "its box centre is
         * the node centre, so no other face can be nearer: it is the one seat
         * that is honest by construction", and that is true about ATTRIBUTION
         * and irrelevant to what it actually did.
         *
         * What it actually did, measured on the production build:
         *
         *   laptop  en  fitted    jung-keun-woo   caption box over 92% of the face
         *   laptop  ko  dossier   lee-tae-gyun                     97%
         *   laptop  en  dossier   lee-tae-gyun                    100%
         *   desktop ko  dossier   hong-jin-ho                      93%
         *   mobile  en  fitted    lee-jin-hyung                    94%
         *
         * — and on hover it is worse than any of those rows, because the box
         * grows a role line first: measured on the same build, pointing at
         * 홍진호 on a 1600×1000 desktop put a 165×37 box over 63% of his 34px
         * photograph, and the wash under it goes to 94% opacity. The face
         * becomes a black silhouette with a name printed on it, in shots 03, 04,
         * 05, 06, and at the CENTRE of the orbit layout in 07.
         *
         * There is no zoom at which this seat is right, and the big-disc case is
         * not the exception it looks like. What a centred box covers is the
         * MIDDLE of the circle, which on a portrait is the eyes — that is the
         * seat's definition, not an accident of its size. Nor does the type
         * shrink away from the problem as the picture grows: `captionLod` caps
         * at 1.55, so a caption tops out near 19px while the photograph goes on
         * scaling with k, which makes the seat cheaper to take at high zoom and
         * no less wrong. `plate.ts` refuses to draw a MARK over a face on
         * exactly this reasoning — "a photograph IS the identification, and a
         * name set across someone's eyes is neither" — and the argument does not
         * get weaker because the ink is a name rather than a monogram.
         *
         * So the choice this seat existed to win — "a name on its own face, or
         * no name at all" — is settled the other way, and it is settled the same
         * way the ranker already settles a name on a STRANGER's face and a name
         * on another name: the caption yields. What it costs is `captions.unnamed`
         * on the few people who had nowhere else, and that number is asserted, so
         * the cost is visible rather than argued.
         *
         * The four INNER-RING seats above are the part of this that was worth
         * keeping: they stand the box off the photograph by 7px and set it on
         * the plate's own quiet annulus, which is where an oversized disc's
         * caption was always supposed to sit. They are untouched. */
      ];
    };
    let spots = buildSpots(boxW, boxH);
    /** How many of those the greedy search may use. The rest are the ranker's. */
    const NEAR_SLOTS = 8;

    let memo = labelMemo.get(n);
    if (!memo) {
      memo = { slot: -1, blocked: 0, ox: 0, oy: 0, seeded: false, veil: 0 };
      labelMemo.set(n, memo);
    }

    /* A slot is tested at the box the label will actually be *painted* in,
       which during a glide is the corridor between where it is and where it is
       going — not the destination alone. Testing the destination and painting
       the eased position is what made names overprint through every transition.
       `hard` obstacles are discs, chrome and other labels; links are a `soft`
       obstacle, preferred-against but yielded to when there is nowhere else. */
    // Under reduced motion a label does not glide, it cuts — so there is no
    // corridor to reserve, and reserving one anyway claims a box that spans
    // where the name was *and* where it is going, which blocks slots that are
    // in fact empty. That is most of why the reduced-motion by-season screen
    // was the one interleaving names.
    const swept = (i: number): Box =>
      memo.seeded && !s.reducedMotion
        ? union(spots[i].box, { x: sx + memo.ox, y: sy + memo.oy, w: boxW, h: boxH })
        : spots[i].box;
    const freeHard = (i: number) => !placed.some((p) => overlaps(swept(i), p));
    const freeSoft = (i: number) => freeHard(i) && !segs.some((g) => segHitsBox(g, swept(i)));

    /* WHOSE NAME DOES THIS BOX LOOK LIKE? — the predicate the whole round turns
     * on, and it is the one a reader applies without being taught it: a block
     * of type belongs to the nearest face.
     *
     * The solver priced a stranger's PHOTOGRAPH at Infinity and a stranger's
     * PLATE at PLATE_HIT, and in a dense hub every one of the sixteen slots
     * costs more than PLATE_HIT — so the least-bad won, and the least-bad was
     * regularly a seat nearer a stranger's centre than its own. Measured on the
     * running app before this change, 18 states across two languages, three
     * viewports and three zooms: 84 of 319 painted names sat nearer somebody
     * else's plate centre than their own; worst, on a 390px phone at k = 0.91,
     * 'Hong Jin-ho' 157.1px from his own disc and 47.9px from 이상민's. With no
     * mark inside any disc that is not a near miss — it is the caption naming
     * the wrong face, and there is no second signal to correct it with.
     *
     * Distance is measured centre to centre, exactly as the finding states it,
     * so what the solver optimises and what a critic measures are one number.
     *
     * Returns the stranger the box reads as and BY HOW FAR, because in a picture
     * where every seat is a misattribution the ranker still has to pick, and
     * "least wrong" is the only sane order to pick in. `who` is null — and
     * `by` zero or negative — when the box is this node's. */
    // One scratch record, refilled per call — this runs a few thousand times a
    // frame and a fresh object each time is GC the loop does not need. The
    // result is therefore valid only until the NEXT call; every reader below
    // copies what it needs out before doing anything else.
    const strayScratch = { who: null as string | null, by: 0, own: 0, other: Infinity };
    const ownerOf = (b: Box): { who: string | null; by: number; own: number; other: number } => {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const own = Math.hypot(cx - sx, cy - sy);
      let best = Infinity;
      let who: string | null = null;
      for (const d of discOf) {
        // …of the faces the reader can SEE. See `seen` in discOf.
        if (d.id === n.id || !d.seen) continue;
        const dd = Math.hypot(cx - d.x, cy - d.y);
        if (dd < best) {
          best = dd;
          who = d.id;
        }
      }
      strayScratch.who = best < own ? who : null;
      strayScratch.by = own - best;
      strayScratch.own = own;
      strayScratch.other = best;
      return strayScratch;
    };
    /** …and the weaker question, which only the leader asks: does this box put
     *  ink inside anybody else's plate at all — season arcs, host hairline, rim
     *  ticks, brass laurel. Read straight off the discs rather than out of
     *  `placed`, because the seat that most needs the answer is often the one
     *  the greedy search took, and the greedy search never calls boxCost. */
    const intrudes = (b: Box): boolean =>
      discOf.some((d) => d.id !== n.id && boxHitsCircle(b, d.x, d.y, d.rPlate));
    /** A seat that reads as somebody else's is not a free seat, whatever the
     *  collision map says — so the hold, the greedy search and the dwell timer
     *  all test it. Ownership is asked of the SEAT, not of the swept corridor:
     *  the corridor is a claim about space in transit, not about where the type
     *  ends up. */
    const mine = (i: number) => ownerOf(spots[i].box).who === null;
    const okHard = (i: number) => freeHard(i) && mine(i);
    const okSoft = (i: number) => freeSoft(i) && mine(i);

    /* The least-bad slot, for a mode that has to name this person anyway.
     *
     * A free web layout may yield: the arrangement is emergent, one unnamed
     * disc among twenty is a small loss, and an overprinted name is worse than
     * a missing one. An *anchored* layout may not. Its entire job is to show
     * you who is in each set — by-archetype was naming eight of twenty and
     * by-season six of twenty, so the two modes that exist to answer "who are
     * the poker players" and "who overlapped across seasons" were answering
     * with a field of anonymous monograms. And the positions in those modes are
     * stable and known in advance, so the solver can afford to place all twenty
     * deliberately rather than greedily dropping whatever collides.
     *
     * Deliberately means ranked by kind first, area second. Chrome is absolute
     * — a name cut in half by the dossier is not a name.
     *
     * SO IS A STRANGER'S FACE, and that is new. "A name over a disc costs a
     * monogram the name itself replaces" was true while a disc held a monogram;
     * a disc now holds a photograph of a named living person, and a clean
     * caption printed across it does not read as damaged, it reads as TRUE. It
     * is the one failure in this solver that a reader cannot detect, so it is
     * priced like the dossier: not at all. The name yields instead.
     *
     * SO IS ANOTHER NAME, and that is new for the same reason. Text-on-text was
     * priced at 1e5 — dear, but affordable, and the veil was what made it
     * survivable: the loser faded to nothing, so "LeeYoon Biung" was never
     * actually painted. The veil now floors at 45% (a name faded to nothing is
     * an anonymous face, which is the whole of the round-8 finding), so an
     * overprint the solver CHOOSES is an overprint the reader SEES — measured
     * on a 390px phone with the dossier open, '현성주홍진호김경훈' set as one
     * string across the top of the graph. If a name can only be placed on
     * another name, it is not placed. That is this file's own rule for the free
     * web layout ("an overprinted name is not a shorter label, it is an
     * unreadable one"); what changed is that the `hasPhoto` licence had quietly
     * exempted every node in the cast from it.
     *
     * What is left to rank is a stranger's PLATE — season arcs, rim ticks,
     * brass laurel — a real intrusion into somebody's record but self-evidently
     * a near miss rather than an attribution, and the only one of the four that
     * leaves both names readable. Then the node's OWN plate, which is where an
     * oversized disc's caption is supposed to sit and costs nothing but its
     * area. Then a line crossing the glyph box, the cheapest of all because
     * there is a knockout stroke under the letterforms. */
    const PLATE_HIT = 2.5e4;
    /* AND A SEAT THAT READS AS SOMEBODY ELSE'S IS NOT PRICED AT ALL.
     *
     * It was: dearer than sixteen plate hits put together, but finite, on the
     * argument that a picture with no honest seat left should still name the
     * person and tether the name with a leader. Two rounds of measurement say
     * that argument is wrong. The leader DOES fire — measured on the production
     * build, all 37 misattributed captions across 30 states had their hairline
     * stroked, so the round-11 promise was kept — and it does not correct the
     * reading: on a 390px phone 'Choi Hye-sun' still sat 34.2px from her own
     * face and 25.8px from 현성주's, with a 1px grey line as the only thing
     * saying otherwise, in a picture where no disc carries a mark and 1px grey
     * is also what the 같은 시즌 edge is drawn in.
     *
     * An unnamed disc is a gap and the reader can see that it is one. A name
     * under the wrong face is a false statement about a named living person and
     * the reader cannot see that it is one. This file already refuses to paint a
     * name over a stranger's photograph and refuses to paint one on top of
     * another name, on exactly that argument; the seat that READS as somebody
     * else is the same failure one step out, and it is the only one of the three
     * that was still affordable.
     *
     * So MISSEAT stays as the number the ranker sorts near-misses by — a picture
     * with nothing honest in it still has a least-wrong answer and the ranker
     * still has to be able to order them — and the acceptance test moved to
     * `< MISSEAT`. Nothing above it is ever taken. `paintedFrame.strayed` is
     * therefore empty in every state, which is the assertion. */
    const MISSEAT = 1e9;
    /** …and how much dearer per pixel it reads as theirs. Only ever compares
     *  two misattributed seats with each other — 300px of margin is 3e6, three
     *  orders under MISSEAT — but among those it dominates plate hits and areas
     *  outright, because in a picture with no honest seat left the only thing
     *  worth optimising is how nearly honest the answer is. Measured: without
     *  this the ranker took the least-overlapping seat and left 서출구's name
     *  68px nearer 윤비 than himself. */
    const MISSEAT_PX = 1e4;
    /** The seat's own distance from the node it names, at 60 cost units a pixel.
     *  This is the round-10 tie-break — "among slots of equal cost prefer the
     *  one whose box centre is nearest its OWN node centre" — written as a term
     *  rather than as a comparator, because sixteen seats almost never price
     *  EXACTLY equal (their overlap areas differ by a few px²) and a comparator
     *  that only fires on exact equality is a comment, not a rule. Bounded so it
     *  can never outrank a plate hit: the seat ring tops out around 300px, i.e.
     *  1.8e4 against PLATE_HIT's 2.5e4. So it decides between seats of the same
     *  KIND and nothing else. */
    const SEAT_PULL = 60;
    const boxCost = (b: Box): number => {
      const stray = ownerOf(b);
      let cost = stray.who === null ? 0 : MISSEAT + stray.by * MISSEAT_PX;
      cost += Math.min(300, stray.own) * SEAT_PULL;
      /* AND A SEAT ON THE READER'S OWN FACE IS NOT PRICED EITHER. It was
       * OWN_FACE = 4e6 — dear, but affordable, and therefore taken.
       *
       * This is the gate the previous round wrote out in full, measured, and
       * then left in a comment as "NOT GATED YET … it is a product call and it
       * is with the owner". The call arrived: round 15 filed the consequence as
       * a blocker twice over, once as "hovering a node erases that person's
       * photograph" and once as "the label solver seats a caption on its own
       * face at all". They are one defect at two magnifications.
       *
       * The measurements that were sitting in that comment, all on the
       * production build, all of them this seat and no other:
       *
       *   mobile 390  choi-hye-sun  disc 22.6px  box 75x18  covers 100%
       *   mobile 390  hong-jin-ho   disc 29.9px  box 69x18  covers  90%
       *   laptop  en  park-ji-min   disc 24.7px  box 62x18  covers  98%
       *   desktop 1600 (discs 37-63px)          — never taken, no state
       *
       * The proposed gate was `b.w > 2 * rPhoto`: offer the seat only when the
       * box fits within the picture. It would in fact have caught every case
       * measured — every own-face seat observed on this build had a box two to
       * five times the width of the disc it sat on — and it is still not the
       * rule to write, for two reasons.
       *
       * The first is that it encodes an accident. It passes whenever the disc
       * happens to be big enough, which is a fact about this cast at these
       * zooms and not a fact about what a caption may do; the day a portrait is
       * drawn larger the seat comes back, on a bigger face.
       *
       * The second is that a box which FITS is still a box on the eyes. This
       * seat's definition is that its centre is the node's centre, so what it
       * covers is always the middle of the portrait — and "a name set across
       * someone's eyes is neither a name nor a portrait" is plate.ts's rule
       * about the middle, not about the width. It does not close
       * `captions.overPlate` either: that check measures the share of a disc a
       * caption box is painted over, and a two-line box centred on even the
       * largest photograph in this app is several times the 0.05 it calls a
       * graze.
       *
       * So it is Infinity, like a stranger's photograph and like another name,
       * and for the same reason all three are: the caption yields. Geometric
       * rather than by index — the definition is "its centre is on its own
       * face", so no seat added later can drift back into this. The seat that
       * used to be the only way to reach here is gone from buildSpots; this is
       * what keeps it gone.
       *
       * THE INNER RING IS NOT THIS. Those four stand the box off the photograph
       * by 7px and set it on the plate's own annulus — `strayOwn < rPlate` and
       * not `< rPhoto` — which is a real intrusion into somebody's rim ticks and
       * their own laurel, priced at nothing but its area, and correct. It is the
       * seat this file always meant by "where an oversized disc's caption is
       * supposed to sit", and it is untouched.
       *
       * WHAT IT COSTS, measured on the production build across the harness's
       * full 13-state matrix, two runs each side:
       *
       *   captions.overPlate   5 states at 0.92–1.00  →  1–3 states, worst
       *                        0.20–0.34. Every "before" reading was type
       *                        through the middle of a face; every "after" one
       *                        is a caption's edge over a disc's RIM at 3.4×
       *                        zoom, where the box is 231–407px and the
       *                        photograph 97–137px, and two of them are 0.051 /
       *                        0.053 against a 0.05 graze line. Still open, and
       *                        a different question — the seat ring above k = 3.
       *   captions.unnamed     3 states / 4 people  →  5–6 states / 15–16 people
       *
       * That second number is the price and it is a real one: on a 390px phone
       * four of twenty discs now carry no name where none did before, the hub
       * among them. It is the trade this cast's premise picks. A disc with no
       * name is a gap and the reader can see that it is one; a face with a name
       * stamped through it is the identification destroyed in order to repeat
       * something the HoverCard is already showing 40px away. It is also the
       * trade the previous round costed out and left in a comment — it guessed
       * 7 of 20 anonymous on the phone, and it is 4.
       *
       * The gain is asserted in pixels rather than argued: `hover.facePhotoMid`,
       * six states including reduced motion and the keyboard cursor, measures
       * every face the app puts the focus on and finds 0.40–0.41 of it still
       * mid-tone — a photograph — where the worst readings before this were
       * 0.041–0.073, which is the range a blank name mark measures in. */
      if (stray.own < rPhoto) return Infinity;
      for (let j = 0; j < placed.length; j++) {
        const area = overlapArea(b, placed[j]);
        if (!area) continue;
        // chromeBoxes() is pushed first and never removed, so the first N
        // entries of `placed` are the panels, and the next `discs.length` the
        // node bodies. Everything after that is another caption or name.
        if (j < CHROME_N) return Infinity;
        const di = j - CHROME_N;
        if (di >= discs.length) return Infinity;
        const d = discOf[di];
        if (d.id === n.id) {
          cost += area;
        } else if (boxHitsCircle(b, d.x, d.y, d.rPhoto)) {
          return Infinity;
        } else {
          /* A DE-EMPHASISED PERSON MAY NOT BUY THEIR WAY ONTO A STRANGER'S
             RECORD. Everyone is photographed, so `hasPhoto` sends every label
             through this ranker and the licence it grants — "this mode has to
             name this person anyway" — is an argument about the SUBJECT of the
             frame. A node the reader has just de-emphasised is the opposite of
             that, and on a 390px phone with the dossier open there are ~210px
             of uncovered canvas for twenty plates, so the cheapest seat for a
             dimmed name is regularly inside somebody's rim ticks. A dimmed name
             therefore takes free space or none: the plate it would otherwise
             have intruded on belongs to someone the reader is looking at, and
             getting the caption back (which is the point of the dim floor
             above) is not worth taking it off them. */
          if (n.dim > 0.5) return Infinity;
          cost += PLATE_HIT + area;
        }
      }
      for (const g of segs) if (segHitsBox(g, b)) cost += 90;
      return cost;
    };
    /* The destination, NOT the swept corridor.
     *
     * `swept` unions a candidate with where the label currently is, which is
     * right for deciding whether a slot is free to glide into — but fatal here,
     * because the position this ranker is trying to escape is *inside every
     * candidate's corridor*. Every slot then scored TEXT_HIT, the argmin was
     * whichever added least area on top of the collision it already had, and
     * the label stayed exactly where it was. That is why "Seo Chul-guYoon Bi"
     * survived a penalty designed to make text-on-text unaffordable: the
     * penalty was being charged to all sixteen options equally. */
    const slotCost = (i: number): number => boxCost(spots[i].box);

    /* THE NAME OUTRANKS THE ROLE LINE, and until now it did not.
     *
     * A focused label carries a second line, which on the hub is the widest box
     * in the frame — '전 스타크래프트 프로게이머 · 포커 플레이어' measures wider
     * than any of the twenty names — and it is the box the solver has the least
     * room for, because the person the reader just opened is by construction the
     * one surrounded by their own neighbours. With every plate an obstacle and a
     * stranger's photograph forbidden, all sixteen slots came back Infinity and
     * the whole label was dropped: measured on hover over 홍진호 at 1600x1000,
     * the hub was the ONE unnamed disc in the frame. That is the wrong thing to
     * lose. The role line is an elaboration and it is also in the hover card and
     * the dossier three inches away; the name is the identification and there is
     * nowhere else to read it. So a two-line box that fits nowhere is retried as
     * one line before the name is given up. */
    /* …and the test is now "is there an HONEST seat for two lines", not "is
     * there any seat at all". A two-line box is the tallest thing this solver
     * places and it is placed on the most crowded node in the frame, so it is
     * the box most likely to have nothing left but a stranger's plate. Dropping
     * the role line first gives the name a smaller box to find an honest seat
     * with, which is the same trade the paragraph above makes. */
    if (useSub) {
      let any = false;
      for (let i = 0; i < spots.length && !any; i++) if (boxCost(spots[i].box) < MISSEAT) any = true;
      if (!any) {
        useSub = false;
        ({ w: boxW, h: boxH } = dimsFor(false));
        spots = buildSpots(boxW, boxH);
      }
    }

    let slot = memo.slot;
    let draw = true;
    /** …and whether what was given up was a seat or the truth. Two different
     *  failures wanting opposite fixes — "nowhere legal to put the box" is a
     *  crowding problem, "nowhere honest" is a layout one. */
    let strayDrop = false;
    const held = slot >= 0 && slot < spots.length;
    /* A seat the label is being VEILED in is not a seat it is happily holding.
       The clash the veil reacts to lives in paint space; at rest that is the
       same rectangle the solver works in, so the fast path below was declaring
       the slot free while the paint pass was hiding the name in it — for as
       long as the reader left the graph alone. Treat a deep veil as a blocked
       slot and the search runs; the dwell timer still governs whether it may
       actually move, so this cannot strobe. */
    /* THE COLD BAND IS A COMPOSED ROW, so its three names are set as a row.
     *
     * Every other node is somewhere the force layout put it and takes whichever
     * of sixteen seats the picture allows. These three are a deliberate line of
     * discs under a caption that makes one claim about all three, and they were
     * getting three different answers in the same frame: measured before this at
     * 1280×800 in Korean, 강지후 +43.2px and 최연청 +43.2px below their discs
     * while 신승용 was seated 45.2px ABOVE his — and on a 390px phone two of the
     * three were seated 37–39px above the row with the band's own caption
     * between them and their faces. Three items presented as one class,
     * formatted three ways, in the frame making the claim.
     *
     * So one cardinal, centred, for all three — and it is the cardinal OPPOSITE
     * the side the band's own caption took. On a short frame the caption has to
     * sit under the row (see coldBounds' `capBelow`), and three names seated
     * under the row as well put the band's title on the same optical baseline
     * as two of the people it is a title for. Names above, faces, title below:
     * three rows, each saying one thing. `< MISSEAT` rather than `< Infinity`
     * because a seat that reads as the person standing next to them in the row
     * is exactly the failure this is here to stop. */
    /* …AND A MEMBER MAY SLIDE ALONG THE ROW WITHOUT LEAVING IT.
     *
     * One cardinal for all three is the rule, and a single blocked seat used to
     * break it outright: the member fell through to the generic ranker and took
     * whatever the picture allowed, which is how one of the three ended up on
     * the other side of its own disc — measured on a 390px phone in Korean,
     * 신승용 seated +50.1px below the row while 강지후 and 최연청 sat -36.8px
     * above it. Three items in one composed row, two formats.
     *
     * The seats that share the chosen cardinal's BASELINE are found by their y
     * rather than by index — the two slid variants of the same cardinal, see the
     * four slid seats above — so a member whose seat is blocked shifts sideways
     * along the row and keeps the baseline that makes the three read as a set.
     * Only if all of those are blocked does it fall through. */
    const bandSlot = coldSide ? (coldSide.capBelow ? 1 : 0) : -1;
    let bandPick = -1;
    if (n.noTies && bandSlot >= 0) {
      const baseY = spots[bandSlot].box.y;
      let bandCost = MISSEAT;
      for (let i = 0; i < spots.length; i++) {
        if (Math.abs(spots[i].box.y - baseY) > 0.5) continue;
        const c = boxCost(spots[i].box);
        if (c < bandCost) {
          bandCost = c;
          bandPick = i;
        }
      }
    }
    const bandRow = bandPick >= 0;
    if (bandRow) {
      slot = bandPick;
      memo.blocked = 0;
    } else if (held && okSoft(slot) && memo.veil < VEIL_RESOLVE) {
      memo.blocked = 0;
    } else {
      memo.blocked += dt;
      // Prefer a slot that is clear of the lines; fall back to merely clear.
      let next = -1;
      for (let i = 0; i < NEAR_SLOTS && next < 0; i++) if (okSoft(i)) next = i;
      for (let i = 0; i < NEAR_SLOTS && next < 0; i++) if (okHard(i)) next = i;
      /* THE DWELL TIMER PROTECTS A NAME THE EYE IS ON. IT DOES NOT PROTECT A
       * FALSE ONE.
       *
       * `SLOT_DWELL_MS` exists so a name does not teleport the frame a
       * collision appears, and every branch below is gated on it — including the
       * two that could have moved a caption off a seat that reads as somebody
       * else. So a misattribution the solver had already decided to leave was
       * still painted for a quarter of a second after it was detected, which on
       * a graph the reader is dragging is most of the time. Hysteresis is for
       * choosing between two honest answers; there is nothing to be steady
       * about here. */
      const lying = held && !mine(slot);
      const urgent = slot < 0 || lying || memo.blocked >= SLOT_DWELL_MS;
      const holdStillFine = held && okHard(slot) && memo.blocked < SLOT_DWELL_MS;
      if (holdStillFine) {
        // The slot is only crossed by a line, not by another object: give the
        // solver a moment to find better before moving a name the eye is on.
      } else if (next >= 0 && urgent) {
        slot = next;
        memo.blocked = 0;
      } else if (slot < 0 || lying || (memo.blocked >= SLOT_DWELL_MS && !okHard(slot))) {
        /* `onIt` for the same reason as `s.anchored`: the person the reader is
         * pointing at, or has open, is the subject of the frame. At the centre
         * of a hub's star every near slot is under a disc or a line, so the
         * most-wanted name in the picture was the one the solver dropped.
         *
         * `hasPhoto` because those two have no mark to fall back on, and
         * `zoomedIn` because the free layout's licence to yield — "one unnamed
         * disc among twenty is a small loss" — is an argument about a crowded
         * picture, and a zoomed-in one is the opposite of crowded. Past
         * LABEL_RANK_K there are objectively fewer discs in the frame and more
         * empty canvas between them than at k = 1, so yielding there is not the
         * solver conceding to a full picture, it is the solver failing to look:
         * measured at k = 3.5, three discs visible and one named. */
        if (s.anchored || onIt || hasPhoto || zoomedIn) {
          // The tie-break lives in boxCost as SEAT_PULL rather than here as a
          // second comparator: sixteen seats almost never price EXACTLY equal,
          // so a rule that fires only on exact equality never fires.
          let best = -1;
          let bestCost = Infinity;
          for (let i = 0; i < spots.length; i++) {
            const c = slotCost(i);
            if (c < bestCost) {
              bestCost = c;
              best = i;
            }
          }
          /* Infinity means every slot is under a panel or on a stranger's
             photograph; MISSEAT means every slot reads as somebody else. A name
             is not shortened by the dossier, it is cut in half; a name on the
             wrong face is not a worse label, it is a wrong fact. All three are
             worth an unnamed disc, and the third is the one this round changed
             — see MISSEAT above. */
          if (best >= 0 && bestCost < MISSEAT) {
            slot = best;
            memo.blocked = 0;
          } else {
            draw = false;
            if (best >= 0 && bestCost < Infinity) strayDrop = true;
          }
        } else {
          // Nowhere to go. Yielding is the designed behaviour in the free web
          // layout — an overprinted name is not a shorter label, it is an
          // unreadable one.
          draw = false;
        }
      }
      // Between those two: keep the old slot for a moment rather than strobing
      // between two equally-bad answers.
    }
    memo.slot = slot;
    if (slot < 0 || !draw) {
      paintedFrame.dropped.push({ id: n.id, why: strayDrop ? 'stray' : 'no-seat' });
      continue;
    }
    /* THE LAST GATE, and the one the invariant is actually written against.
     *
     * Everything above is the solver choosing; this is the painter refusing.
     * The branches that keep a held slot — the dwell window, the "between those
     * two" fall-through — can each carry a seat the picture has since turned
     * into a lie, and a rule enforced in four places is a rule with four ways
     * out. One test, immediately before the ink, so `paintedFrame.strayed` being
     * empty is a fact about what was painted rather than about what was
     * intended. */
    if (!mine(slot)) {
      paintedFrame.dropped.push({ id: n.id, why: 'stray' });
      continue;
    }

    const spot = spots[slot];

    // The chosen anchor is stored as an offset from the node, so panning and
    // zooming are instant while a change of slot glides.
    const tox = spot.box.x - sx;
    const toy = spot.box.y - sy;
    if (!memo.seeded) {
      memo.ox = tox;
      memo.oy = toy;
      memo.seeded = true;
    } else {
      const e = s.reducedMotion ? 1 : 1 - Math.exp((-3 * dt) / 200);
      memo.ox += (tox - memo.ox) * e;
      memo.oy += (toy - memo.oy) * e;
    }

    /* A NAME MAY NOT GLIDE THROUGH A MISATTRIBUTION.
     *
     * The seat is honest and the destination is honest, but the eased position
     * between two seats is neither — it is wherever the exponential happens to
     * be, and on a crowded phone the straight line from one side of a disc to
     * the other passes through the neighbour the seat was chosen to avoid. A
     * ~200ms window in which the caption reads as somebody else is still a
     * caption reading as somebody else, and it is the frame the reader's eye
     * follows because it is the one that moved.
     *
     * Dropping the name for those frames would be a blink; the glide is worth
     * less than the name is. So the ease is cut instead: the label arrives in
     * one frame, and only in the case where continuing to slide would be a lie. */
    if (ownerOf({ x: sx + memo.ox, y: sy + memo.oy, w: boxW, h: boxH }).who !== null) {
      memo.ox = tox;
      memo.oy = toy;
    }

    // Painted on the live disc, at the offset the solve chose. During an
    // anchored transit those are different points — which is the whole idea:
    // the assignment is fixed against the destination while the name rides the
    // disc the eye is following.
    const bx = px0 + memo.ox;
    const by = py0 + memo.oy;
    const tx = spot.tx - spot.box.x + bx;
    const top = by;

    // Reserve what the *solver* claimed, so that every node in this frame is
    // tested against the same picture. (At rest the two are identical.)
    const painted: Box = { x: sx + memo.ox, y: sy + memo.oy, w: boxW, h: boxH };
    placed.push(union(spot.box, painted));

    /* The one collision the solver could not see: this box, where it is going
       to be PAINTED, against everything already inked this frame. See VEIL. */
    const inkBox: Box = { x: bx, y: by, w: boxW, h: boxH };
    const clash = paintedLabels.some((p) => overlaps(inkBox, p));
    const veilTau = clash ? VEIL_OUT_MS : VEIL_IN_MS;
    memo.veil += ((clash ? 1 : 0) - memo.veil) * (s.reducedMotion ? 1 : 1 - Math.exp((-3 * dt) / veilTau));
    const alphaOut = paint * (1 - VEIL_TAKE * memo.veil);
    if (alphaOut <= VEIL_INK) paintedFrame.dropped.push({ id: n.id, why: 'veiled' });
    if (alphaOut <= 0.02) continue;
    if (alphaOut > VEIL_INK) paintedLabels.push({ id: n.id, kind: 'name', ...inkBox, a: alphaOut });

    // Hand the camera the real screen extent of this name so bounds() can pad
    // the world box with it instead of framing bare discs.
    labelExtent.set(n, {
      left: Math.max(0, px0 - bx),
      right: Math.max(0, bx + boxW - px0),
      up: Math.max(0, py0 - by),
      down: Math.max(0, by + boxH - py0),
    });

    ctx.save();
    ctx.globalAlpha = alphaOut;

    /* THE LEADER, for the far ring only.
     *
     * The eight far slots stand a name `boxH * 2.1` past the seat, which the
     * ranker reaches for constantly above k = 1.3 — measured at k = 2.09, three
     * of eleven names seated there, the furthest 56px of clear backdrop from its
     * own plate rim. That was survivable when a disc carried a monogram: the
     * reader could match name to mark. No plate carries a mark now, so a name a
     * couple of line boxes out over empty black is attached to nothing, and the
     * nearest disc it appears to belong to is usually somebody else's.
     *
     * A hairline closes it, and only for the ring that needs it — the eight near
     * slots put the box against its own rim, where the eye closes the gap by
     * itself, and a leader there would be eight extra strokes saying nothing.
     * Exactly the rule drawCaptions already applies to a `bare` region.
     *
     * INK_LOW at 0.7, not INK_FAINT. INK_FAINT is this palette's hairline token
     * and would be the obvious pick, but palette.ts measures it at 2.11:1 and
     * sets 3:1 as the floor for a graphic that carries meaning — and a leader
     * carries the whole of the attachment. INK_LOW is 5.28:1 and lands here at a
     * sampled 3.0–3.35:1 against the backdrop it crosses, well under the name's
     * own 14–18:1 so it stays plainly subordinate to what it is holding. (Same
     * rays with no leader on them measure 1.0–1.84:1, which is the backdrop.)
     *
     * …AND UNCONDITIONALLY FOR A SEAT THAT LANDS ON SOMEBODY ELSE — which is
     * the correction the round-10 finding asked for and the one case that could
     * never get it. Both conditions above disqualified exactly the failure: a
     * caption that has been priced into a stranger's laurel is usually seated
     * on a NEAR slot (that is why the ranker could afford it), so `slot >=
     * NEAR_SLOTS` was false; and it is by definition CLOSE to a plate, so the
     * LEADER_MIN_GAP test was false too. The seat that most needs a tether was
     * the only one that could not have one. So when the box reads as somebody
     * else's — either its centre is nearer their disc, or it has put ink inside
     * their plate — the hairline is drawn whatever the slot and whatever the
     * gap, down to the 2px at which the stroke stops being degenerate. One
     * 1px line, and the attribution is unambiguous again. */
    const stray = ownerOf(painted);
    const strayed = stray.who !== null || intrudes(painted);
    const strayReads = stray.who;
    const strayOwn = stray.own;
    const strayOther = stray.other;
    if (slot >= NEAR_SLOTS || strayed) {
      const cxp = bx + boxW / 2;
      const cyp = by + boxH / 2;
      let dx = cxp - px0;
      let dy = cyp - py0;
      const dl = Math.hypot(dx, dy);
      if (dl > 1e-3) {
        dx /= dl;
        dy /= dl;
        const rimPx = plateExtent(n) * view.k;
        const enter = rayBoxEntry(px0, py0, dx, dy, { x: bx, y: by, w: boxW, h: boxH });
        // Both ends stand off, so the line touches neither the plate nor the
        // type — same clearances the region leader uses. And the same trigger
        // distance: past LEADER_MIN_GAP there is nothing but backdrop between
        // the two, which is where the eye stops closing the gap by itself —
        // except for a strayed seat, where the gap is not the question and the
        // only floor is "long enough to be a line".
        //
        // A strayed seat also starts the hairline further in. A seat only reads
        // as a stranger's when the two plates overlap, and then the caption is
        // frequently sitting ON its own rim, so a leader launched from the plate
        // rim has nowhere to go and the one case that most needs a tether gets
        // none — measured, exactly one such name in 18 states. It launches from
        // the photograph instead, so the line is seen to leave the face.
        const from = strayed
          ? Math.min(rimPx + 3, Math.max(rPhoto + 3, enter - 10))
          : rimPx + 3;
        const to = enter - 4;
        if (to - from > 2 && (strayed || enter - rimPx > LEADER_MIN_GAP)) {
          /* A TETHER IS NOT A RELATIONSHIP, and it was drawn like one.
           *
           * Solid, 1px, INK_LOW — which is a thinner version of the 같은 시즌
           * edge, a solid grey-lavender line at ~2px, and at a glance the two do
           * not separate: photographed in shots/16 and 17, 홍진호's ~110px
           * leader hanging off into type reads as a same-season tie running off
           * into empty space. Every stroke on this canvas is supposed to mean
           * something specific, and this is the one that means "these two marks
           * are one object", i.e. nothing about the person at the other end.
           *
           * So it takes a rhythm no edge owns. [2,3] is under half the pitch of
           * the tightest edge dash in EDGE_DASH (`parallel`, 14/5/1.6/5) and a
           * fifth of the season-derived 7/10.5 fallback, at a length where an
           * edge is never that finely broken — a stitch rather than a line. The
           * ink and the width are unchanged, so the contrast measurements above
           * still hold for the segments that are drawn, and it is not divided by
           * k because it is screen-space furniture like the type it holds. */
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(px0 + dx * from, py0 + dy * from);
          ctx.lineTo(px0 + dx * to, py0 + dy * to);
          ctx.setLineDash([2, 3]);
          ctx.strokeStyle = alpha(INK_LOW, 0.7);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          // Published only once the hairline is actually STROKED, so the list is
          // a claim about ink rather than about intent. See paintedFrame.strayed.
          if (strayReads !== null)
            paintedFrame.strayed.push({
              id: n.id,
              reads: strayReads,
              own: strayOwn,
              other: strayOther,
            });
        }
      }
    }

    /* A soft plate keeps names readable where they cross links. It used to be a
       flat 72% rectangle — the only hard geometric edge in a frame built out of
       haze — so it read as a hole punched in the artwork. Feathered, it can sit
       lower and still hold the text, and it is painted for every label rather
       than only the focused or two-line ones.

       The resting floor is 0.62, not 0.35. A wash of 0.35 over a 3px #ff2f43
       betrayal line still leaves roughly #a82533 running through the glyph box
       — fully saturated, and the highest-contrast thing in it. In a 3× crop of
       the default view a red betrayal edge ran straight through 이태균, a blue
       dashed edge through the 박 of 박지민 and a grey one across 하승진. That
       was the commonest defect in the app: primary surface, every layout, both
       languages, at rest. */
    {
      /* …AND IT CARRIES MORE WHEN THE TYPE IS SET ON THE PLATE ITSELF.
       *
       * The inner ring puts the box inside the drawn medallion rather than
       * beside it, and 0.62 — the wash for a name floating on backdrop — is not
       * enough to hold type over the plate's own hairline rings: photographed at
       * max zoom, the outer ring arc runs visibly through the descenders of
       * 'MBC announcer' and a second ring skims the cap-height of the name above
       * it. The wash is what the name is read against, so it is a function of
       * what is behind the name.
       *
       * THERE ARE NOW TWO CASES HERE AND THERE USED TO BE THREE. The third was
       * `onOwnFace` — `strayOwn < rPhoto`, the dead-centre seat — at 0.9, and
       * with the focus/two-line term on top of it, 0.94. A 94%-opaque near-black
       * ellipse ~109px in radius, painted over a photograph ~31px in radius,
       * every time the pointer touched a node. The comment beside the seat
       * argued the type then sat ON the photograph rather than in it; 0.94 is
       * not "on", it is "instead of", and the shipped screenshots show it.
       *
       * It is not clamped here, it is unreachable: `boxCost` returns Infinity
       * for any box whose centre is on its own face, so no seat this painter can
       * be handed is one. Clamping would have left the erasure in place at a
       * lower opacity — the box is still 200px of type across a 62px face at
       * ANY opacity, which is what `captions.overPlate` measures and what the
       * solver had to answer.
       *
       * `onOwnPlate` stays exactly as it was. That is the legitimate case the
       * brief protects: type on the annulus at high zoom, over somebody's own
       * rim ticks and their own laurel, which is their own record.
       *
       * THE WASH'S FOOTPRINT IS ALREADY THE BOX. `scale(1, ph/pw)` before an arc
       * of radius `pw/2` is an ellipse of semi-axes pw/2 × ph/2 — the ellipse
       * INSCRIBED in the padded glyph rect, touching its four mid-edges and
       * cutting its corners. So the review's third remedy, "clip the wash to a
       * rounded rect of boxW+18 × boxH+14", would enlarge this rather than
       * contain it; the shape was never the fault. The fault was a box centred
       * on a face, and it is fixed where boxes are chosen. */
      const onOwnPlate = strayOwn < rPlate;
      const plate = Math.min(
        0.94,
        (onOwnPlate ? 0.8 : 0.62) + 0.25 * Math.min(1, Math.max(n.focus * 2, useSub ? 1 : 0)),
      );
      const pw = boxW + 18;
      const ph = boxH + 14;
      ctx.save();
      ctx.translate(bx + boxW / 2, by + boxH / 2);
      ctx.scale(1, ph / pw);
      const g = ctx.createRadialGradient(0, 0, pw * 0.16, 0, 0, pw * 0.5);
      g.addColorStop(0, `rgba(10,7,6,${plate})`);
      g.addColorStop(0.62, `rgba(10,7,6,${plate * 0.78})`);
      g.addColorStop(1, 'rgba(10,7,6,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pw * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.textAlign = spot.align;
    ctx.font = `${W_MED} ${nameSize}px ${FONT}`;
    /* …and a knockout stroke around the letterforms themselves. A feathered
       wash cannot cover a saturated stroke without becoming a visible plate,
       and the 5px shadowBlur below is a soft halo that a 3px #ff2f43 line goes
       straight through. The stroke is what survives it: it is the exact shape
       of the glyphs, so it costs no rectangle, and it darkens only the ~1.5px
       margin the line has to cross to reach them. */
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(10,7,6,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText(name, tx, top);

    /* There is no shadowBlur here any more.
     *
     * Three mechanisms were doing one job — a feathered plate, a 5px shadow and
     * (now) a knockout stroke — and the shadow was the one that did not work:
     * a soft halo at 0.85 is exactly what a saturated 3px line goes straight
     * through, which is why names were still being read through by betrayal
     * edges with all of it switched on. It is also expensive out of all
     * proportion: a blurred mask per text run, 20–40 runs a frame, measured at
     * ~17ms of a 50ms frame with the pointer resting on a node. The plate holds
     * the field and the stroke holds the letterforms; the shadow held neither. */
    ctx.fillStyle = n.focus > 0.3 ? INK_HI : alpha(INK_HI, 0.92);
    ctx.fillText(name, tx, top);

    if (useSub) {
      ctx.font = `${W_TEXT} ${subSize}px ${FONT}`;
      ctx.lineWidth = 2.6;
      ctx.strokeText(sub, tx, top + lineH);
      ctx.fillStyle = alpha(INK_SUB, 0.72 + n.focus * 0.28);
      ctx.fillText(sub, tx, top + lineH);
    }
    ctx.restore();
  }
}

/**
 * Region captions.
 *
 * These are the only headings on the canvas and they were the least legible
 * text in the app: painted at an effective alpha of 0.61 in the region's own
 * hue, which put SEASON 1 at 2.01:1 — and with the count line *brighter* than
 * the title it subtitles. They are now set in a hue lifted toward INK_SUB at
 * full alpha (≥5.4:1 for every region colour in the palette), the hue is
 * carried at full chroma by a swatch dot instead of by the letterforms, and
 * the rank is restored: the title is larger, heavier and tracked, the count is
 * smaller and quieter.
 */
/**
 * Caps tracking follows caps, not language.
 *
 * The wide 0.18em was being applied to the caption TITLE, which in English is
 * sentence case ("No prior tie on record") — on lowercase letterforms that
 * makes the letter space equal the word space and the line stops reading as
 * words. The all-caps subtitle got 0.06em. One rule, applied to whichever line
 * is actually set in capitals; Hangul never gets it at all, because tokens.css
 * is explicit that tracking across syllable blocks reads as a ransom note.
 */
function trackingFor(str: string, lang: 'ko' | 'en'): string {
  if (lang !== 'en') return '0.02em';
  return /[A-Z]/.test(str) && str === str.toUpperCase() ? '0.16em' : '0.03em';
}

/** Where a ray from (cx,cy) first meets `b`, as a distance along (dx,dy).
 *  Slab clipping; returns the near hit, or the ray's distance to the box centre
 *  when the origin is already inside it. */
function rayBoxEntry(cx: number, cy: number, dx: number, dy: number, b: Box): number {
  let t0 = -Infinity;
  let t1 = Infinity;
  const slab = (o: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-6) return o >= lo && o <= hi;
    const a = (lo - o) / d;
    const z = (hi - o) / d;
    t0 = Math.max(t0, Math.min(a, z));
    t1 = Math.min(t1, Math.max(a, z));
    return true;
  };
  if (!slab(cx, dx, b.x, b.x + b.w) || !slab(cy, dy, b.y, b.y + b.h) || t1 < Math.max(0, t0)) {
    return Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy);
  }
  return Math.max(0, t0);
}

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  s: RenderState,
  sceneAlpha: number,
  placed: Box[],
): void {
  const { view } = s;
  const ins = s.insets;
  // Read from the shared ladder rather than restated here: coldBounds reserves
  // room for this block and has to arrive at the same number.
  const { titleSize, subSize } = captionSizes(view.k);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = sceneAlpha * s.regionAlpha;

  for (const c of s.clusters) {
    let ax: number;
    let ay: number;
    /* Which way "outboard" points for this region, in screen space — used to
       stand the caption block off along the same ray layout.ts measured its gap
       on, rather than lifting every caption 16px up regardless of which side of
       its hull it is on. Zero for a caption that is directly above or below. */
    let outX = 0;
    let outY = -1;
    /** Screen rect of the band and of the row inside it, when this cluster is
     *  one. Both are needed and neither is the other: the rails are seated off
     *  the discs, the caption has to clear the plates. See below. */
    let bandRect: {
      top: number;
      bottom: number;
      faceTop: number;
      rowBottom: number;
      capBelow: boolean;
    } | null = null;
    if (c.flat) {
      const b = coldBounds(s);
      if (!b) continue;
      /* A CONTAINER LABELS ITS OWN CONTENTS.
       *
       * This caption used to be seated 20px ABOVE the top rail — that is, in
       * the connected half of the graph, which is the half whose entire content
       * contradicts it. Measured on the default desktop frame the block's
       * bottom edge sat 20.0px clear of the rail and on a 390px phone 43.0px
       * clear, painted straight across the live mesh with an orange rivalry
       * edge struck through "NO VERIFIED TIE · 3".
       *
       * It goes inside, and it does NOT walk. Every other caption walks because
       * its region is one of several and the frame decides where there is room;
       * this one has a rectangle of its own with three discs in it and exactly
       * two places a title can go — over the row or under it. Letting it walk
       * put it on the row: measured, the block came to rest at y 815–852 against
       * a row spanning 767–841, because a connected node's PLATE hangs below the
       * rail (the rail clears the lowest connected DISC) and blocked the seat
       * above. So the seat is chosen rather than searched, in `ay` below, once
       * the block's height is known — and it is chosen against the row's FACES
       * rather than its plates, because a title grazing the top of somebody's
       * rim ticks is a container labelling its own contents and a title across
       * their eyes is not. Measured on the default desktop frame: 33.4px of
       * clearance to the plates, 51.9px to the faces, block 37.4px. */
      bandRect = {
        top: b.top * view.k + view.y,
        bottom: b.bottom * view.k + view.y,
        faceTop: b.faceTop * view.k + view.y,
        rowBottom: b.rowBottom * view.k + view.y,
        capBelow: b.capBelow,
      };
      ax = b.cx * view.k + view.x;
      ay = bandRect.top;
      outY = 0;
    } else {
      // The whole vector, not just its vertical half. layout.ts now emits the
      // point CAPTION_GAP outboard of the hull's rim along the centroid→cluster
      // ray, so season 1's caption stands down-and-left of its own circle
      // instead of being centred on it in the dead band under the figure.
      const anchorX = c.labelX ?? c.x;
      const anchorY = c.labelY ?? c.y - (c.ry ?? c.r * 0.92);
      ax = anchorX * view.k + view.x;
      ay = anchorY * view.k + view.y;
      const vx = anchorX - c.x;
      const vy = anchorY - c.y;
      const vl = Math.hypot(vx, vy);
      if (vl > 1e-3) {
        outX = vx / vl;
        outY = vy / vl;
      }
    }

    // The "no prior tie" band is UI copy rather than data, and its count moves
    // with the filters, so the renderer owns both of its lines.
    const capLabel = c.flat ? s.strings.coldLabel : c.label;
    const capSub = c.flat ? s.strings.coldSub.replace('{n}', String(coldCount(s))) : c.sublabel;
    if (!capLabel) continue;

    const titleTrack = trackingFor(capLabel, s.lang);
    const subTrack = capSub ? trackingFor(capSub, s.lang) : '0em';

    ctx.font = `${W_BOLD} ${titleSize}px ${FONT}`;
    ctx.letterSpacing = titleTrack;
    const textW = ctx.measureText(capLabel).width;
    // The subtitle was measured nowhere, so in English — where the caps sub is
    // ~40% wider than its sentence-case title — the claimed box ended inside
    // the string it was supposed to reserve and node labels were placed on top
    // of it. Both lines are measured, and the box spans both baselines.
    ctx.font = `${W_MED} ${subSize}px ${FONT}`;
    ctx.letterSpacing = subTrack;
    const subW = capSub ? ctx.measureText(capSub).width : 0;
    const dotGap = 13;
    const capW = Math.max(textW, subW) + 22 + dotGap;
    const capH = capSub ? titleSize * 0.7 + titleSize * 0.5 + subSize * 1.5 + 8 : titleSize + 8;

    /* ONE PLACEMENT RULE, and it is a distance along a ray.
     *
     * Stand the block off along the outboard ray so the world gap layout.ts
     * measured is the gap the eye actually sees: the edge of the caption box
     * that faces the hull lands on the anchor point, whichever side that is.
     * `ay` is the title's vertical centre (textBaseline is middle) while the
     * block hangs below it, so a caption anchored under its hull used to reach
     * half its own height back toward the rim and one anchored above sat a
     * whole half-height too far out.
     *
     * When the seat is blocked the block walks FURTHER OUT ALONG THE SAME RAY
     * rather than trying five directions in turn. That is the whole of the fix
     * for "captions placed with no rule": before, a blocked caption tried up ×5,
     * down ×3, then left and right ×3 each, so on by-archetype one caption ended
     * up 95px outside the left edge of its circle, one to the right of its own,
     * two floating above and one below — four placements for one kind of object.
     * Now every caption is on its region's own outbound ray and only the
     * DISTANCE varies, which is a difference the leader line below explains. */
    const halfW = capW / 2;
    /* THE BAND'S OWN SEAT, chosen rather than searched — and it may not cross
     * the face row, at any viewport, ever.
     *
     * The old rule was two seats and a clamp: under the top rail if the block
     * fitted between the rail and the faces, under the row's plates otherwise,
     * then `clampY` pulled whatever came out back inside `bandRect`. On a short
     * band that clamp had nowhere to put the block but the row itself, and it
     * put it there: measured before this, the caption sat 3.5–10.4px inside the
     * photographs of all three people it names on a 390px phone, and at
     * 1280×800 it came to rest 5px under 신승용's own name so the two read as
     * one three-line caption. coldBounds now RESERVES the room (see `capBelow`),
     * which fixes the common case; this ranks the seats so the corner case —
     * a band taller than the uncovered rect — degrades to "off the frame edge"
     * rather than to "across a face".
     *
     * Ranked, best first, on two keys: does the block cross the face row, then
     * how far it falls outside the uncovered rect. Ordered so that a tie keeps
     * the seat the band asked for.
     *
     * With outY = 0 the anchor is the block's vertical CENTRE (the seat
     * arithmetic below collapses to `ay - capH/2` for the box top), so the
     * half-height is added back here. */
    if (bandRect) {
      const band = bandRect;
      const underRail = band.top + COLD_CAP_RAIL;
      const underRow = band.rowBottom + COLD_CAP_GUTTER;
      const overFaces = band.faceTop - COLD_FACE_CLEAR - capH;
      const seats = band.capBelow
        ? [underRow, overFaces, underRail]
        : [underRail, underRow, overFaces];
      // The uncovered rect, which is where a caption has to land to be read.
      const winTop = ins.top + 10;
      const winBottom = s.height - ins.bottom - 10;
      const score = (t: number): number => {
        const crosses = t < band.rowBottom + 2 && t + capH > band.faceTop - 2 ? 1e6 : 0;
        return crosses + Math.max(0, winTop - t) + Math.max(0, t + capH - winBottom);
      };
      let boxTop = seats[0];
      let bestScore = score(seats[0]);
      for (let i = 1; i < seats.length; i++) {
        const sc = score(seats[i]);
        if (sc < bestScore) {
          bestScore = sc;
          boxTop = seats[i];
        }
      }
      ay = boxTop + capH / 2;
    }
    const seatAt = (d: number): { x: number; y: number } => ({
      x: ax + outX * (halfW + d),
      y: ay + outY * d + titleSize * 0.7 - (capH * (1 - outY)) / 2,
    });
    const boxAt = (px: number, py: number): Box => ({ x: px - halfW, y: py - titleSize * 0.7, w: capW, h: capH });
    const clear = (b: Box) => !placed.some((p) => overlaps(b, p));
    // A caption that leaves the frame explains nothing, and orbit's rings put
    // theirs off-screen at the fitted zoom, so every candidate is clamped into
    // the uncovered rect before it is tested.
    const clampX = (v: number) => Math.max(ins.left + halfW + 12, Math.min(s.width - ins.right - halfW - 12, v));
    /* THE BAND IS NOT CLAMPED. It was, and the clamp was the bug: it ran
     * against `bandRect.bottom` — a rail that on a short frame sits 24 units
     * under the photographs — so it dragged a block seated under the row back
     * up onto the row. The seat above is already solved against the faces AND
     * against the uncovered rect, which is everything the clamp was for, and a
     * second opinion could only undo it. */
    const clampY = (v: number) =>
      bandRect ? v : Math.max(ins.top + capH / 2 + 10, Math.min(s.height - ins.bottom - capH / 2 - 10, v));

    const seat0 = seatAt(0);
    let x = clampX(seat0.x);
    let y = clampY(seat0.y);
    let box = boxAt(x, y);
    // …and the band does not walk. See its seat above.
    if (!bandRect && !clear(box)) {
      /* Walk out along the ray, and if none of the seats is clear take the one
       * that is least blocked rather than the one the walk started at.
       *
       * A caption may not be dropped — every region on screen has to be named —
       * so when the walk fails the question is only which collision to pay for,
       * and the old code paid for whichever the FIRST seat happened to have.
       * On a 390px viewport that is how 시즌 1 and 시즌 3 both ended up printed
       * across 이전 시즌 없음 (measured: 49×13px and 46×5px of overlap), when a
       * seat two steps further out was clear of everything but a link. Ranked by
       * area, with a caption-on-caption hit charged categorically the way the
       * node-label solver charges text-on-text — two captions interleaved are
       * both unreadable, and no amount of a smaller overlap changes that. */
      const step = titleSize + 12;
      let bestX = x;
      let bestY = y;
      let bestBox = box;
      let bestCost = Infinity;
      for (let i = 0; i <= 6; i++) {
        const p = seatAt(i * step);
        const nx = clampX(p.x);
        const ny = clampY(p.y);
        const b = boxAt(nx, ny);
        if (clear(b)) {
          bestX = nx;
          bestY = ny;
          bestBox = b;
          bestCost = 0;
          break;
        }
        let cost = 0;
        for (const p2 of placed) {
          const area = overlapArea(b, p2);
          if (area) cost += area + CAPTION_HIT;
        }
        if (cost < bestCost) {
          bestCost = cost;
          bestX = nx;
          bestY = ny;
          bestBox = b;
        }
      }
      x = bestX;
      y = bestY;
      box = bestBox;
    }

    /* THE LEADER. A caption that is not visibly attached to the thing it names
     * is not a caption — and it is the frame clamp and the walk above that
     * detach it, so the hairline is drawn from exactly the distance at which
     * the eye stops making the connection for itself: LEADER_MIN_GAP, the same
     * number the node labels' far ring is tethered at.
     *
     * A REGION OF ONE ALWAYS GETS ONE, at any distance. What attaches every
     * other caption at short range is the enclosure: the ray runs from a drawn
     * ellipse to a caption sitting just off it, and the eye closes the gap
     * itself. A bare region draws no ellipse (see Cluster.bare) — there is
     * nothing for the caption to be just off — so on the shipped build
     * "배우 · 1명", "기타 · 1명" and "크리에이터 · 1명" sat 90–110px from the
     * only node they could possibly mean, with four other captions between them,
     * and read as a legend stacked down the left of the frame. layout.ts's note
     * on `bare` promises the leader "every other region gets"; this is where the
     * promise was not kept.
     *
     * It runs from the drawn rim — `markR` for a bare region, which is the
     * PLATE and not the space the packing reserved round it — to where the ray
     * enters the caption box, so it never crosses the thing it points at and
     * never touches the type. */
    if (!c.flat) {
      const ccx = c.x * view.k + view.x;
      const ccy = c.y * view.k + view.y;
      const rx = (c.markR ?? c.rx ?? c.r) * view.k;
      const ry = (c.markR ?? c.ry ?? c.r * 0.92) * view.k;
      let dx = x - ccx;
      let dy = y - ccy;
      const dl = Math.hypot(dx, dy);
      if (dl > 1e-3 && rx > 1 && ry > 1) {
        dx /= dl;
        dy /= dl;
        const rimT = 1 / Math.hypot(dx / rx, dy / ry);
        const enterT = rayBoxEntry(ccx, ccy, dx, dy, box);
        if (enterT - rimT > (c.bare ? 4 : LEADER_MIN_GAP)) {
          ctx.save();
          ctx.globalAlpha *= 0.5;
          ctx.beginPath();
          ctx.moveTo(ccx + dx * (rimT + 3), ccy + dy * (rimT + 3));
          ctx.lineTo(ccx + dx * (enterT - 4), ccy + dy * (enterT - 4));
          ctx.strokeStyle = alpha(c.color, 0.85);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Full chroma lives in the dot; the letterforms take a lifted mix so the
    // smallest text on the canvas is not also the lowest-contrast.
    const dotX = x - halfW + 7;
    ctx.beginPath();
    ctx.arc(dotX, y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = alpha(c.color, 0.95);
    ctx.fill();

    ctx.font = `${W_BOLD} ${titleSize}px ${FONT}`;
    ctx.letterSpacing = titleTrack;
    ctx.fillStyle = mix(c.color, INK_SUB, 0.5);
    ctx.fillText(capLabel, x + dotGap / 2, y);

    if (capSub) {
      ctx.font = `${W_MED} ${subSize}px ${FONT}`;
      ctx.letterSpacing = subTrack;
      ctx.fillStyle = alpha(mix(INK_LOW, INK_SUB, 0.25), 0.85);
      ctx.fillText(capSub, x + dotGap / 2, y + titleSize * 0.5 + subSize * 0.75);
    }
    ctx.letterSpacing = '0em';
    placed.push(box);
    paintedLabels.push({ id: `cluster:${c.key}`, kind: 'caption', ...box, a: ctx.globalAlpha });
  }
  ctx.restore();
}

/* ── empty state ─────────────────────────────────────────────────────────── */

/** Filtering everyone out used to render as an unremarkable black rectangle.
 *  The canvas says what happened and how to get back. */
function drawEmptyState(ctx: CanvasRenderingContext2D, s: RenderState, sceneAlpha: number): void {
  const ins = s.insets;
  const cx = ins.left + (s.width - ins.left - ins.right) / 2;
  const cy = ins.top + (s.height - ins.top - ins.bottom) / 2;

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.beginPath();
  ctx.arc(cx, cy - 52, 15, 0, Math.PI * 2);
  ctx.strokeStyle = alpha(INK_LOW, 0.5);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `${W_MED} 17px ${FONT}`;
  ctx.fillStyle = INK_HI;
  ctx.fillText(s.strings.emptyTitle, cx, cy);

  ctx.font = `${W_MED} 11px ${FONT}`;
  ctx.letterSpacing = '0.16em';
  ctx.fillStyle = alpha(INK_SUB, 0.85);
  ctx.fillText(s.strings.emptySub, cx, cy + 24);
  ctx.letterSpacing = '0em';

  /* The escape line is NOT painted here.
   *
   * It is the one moment in the app where the reader is definitively stuck, and
   * it used to be canvas text — the only thing on screen that did not respond
   * to a click, while the two controls that would actually help (Reset at the
   * top of the rail, "clear filters" in the status bar) were two corners away
   * from where the eye was. GraphCanvas renders it as a real <button> over the
   * uncovered rect, at this same centre plus 52, so it is clickable, focusable
   * and announced. See `EMPTY_HINT_DY`.
   *
   * There used to be a second line under it as well, hardcoded in English,
   * saying exactly what `emptyHint` already says in the reader's own language.
   * One line, one language, no duplicate. */
  ctx.restore();
}

/** Screen-space drop from the empty state's centre to its escape line. Shared
 *  with GraphCanvas, which paints that line as a real control. */
export const EMPTY_HINT_DY = 52;

