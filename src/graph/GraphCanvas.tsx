import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceCollide,
  type ForceLink,
  type ForceManyBody,
  type ForceX,
  type ForceY,
  type Simulation,
} from 'd3-force';
import { createPortal } from 'react-dom';
import { applyLayout, membershipResidual, seatResidual, type Cluster, type LayoutStrings } from './layout';
import { CATEGORY_COLOR, SEASON_COLOR } from './palette';
import { EMPTY_HINT_DY, invalidateBackdrop, labelExtent, render, renderBackdrop } from './render';
import { plateExtent } from './plate';
import { PROBES } from '../probe';
import { onPortraitLoad, preloadPortraits } from './portraits';
import { CATEGORY_LABEL_I18N, EDGE_LABEL_I18N, edgeText, personName, t } from '../data/i18n';
import type { EdgeType } from '../data/types';
import type { GLink, GNode, LayoutMode, Viewport } from './types';
import { EdgeCard } from '../components/EdgeCard';

export interface GraphHandle {
  /** `dur` is exposed because not every fit is a move the reader can see: the
   *  one issued as the curtain starts lifting happens at reveal 0 and must land
   *  before the first visible frame rather than glide through it. `force` is
   *  for that same caller — it is the entrance's own framing, not a correction,
   *  so a camera lock taken by the mount's arrival tween must not eat it. */
  fit: (padding?: number, dur?: number, force?: boolean) => void;
  /**
   * "The reader has asked to come in — re-compile the painter first."
   *
   * Returns true if it scheduled a pass, i.e. if it is worth waiting for
   * `onWarm` before starting the curtain, and false if the curtain is already
   * moving and there is nothing left to prepare.
   *
   * It exists because a warm pass goes STALE. Measured with performance marks
   * on the production preview at 1600×1000, the first frame of the fade spent:
   *
   *     ENTER at 1300ms  (last warm pass 0.2–0.7s earlier)     6 / 15 ms
   *     ENTER at 2500ms  (0.7–1.3s earlier)                  172 / 175 ms
   *     ENTER at 4600ms  (3.0–3.6s earlier)              246 / 255 / 432 ms
   *
   * Every later frame of the same fade costs 5–15ms. So the cost is not what
   * the painter has to build once — that is what the warm pass banked — it is
   * that an idle canvas loses it again, and the patient reader, who idles
   * longest, pays the most. One fresh pass on the way in puts that cost back
   * under the curtain where nobody is looking.
   */
  armEntrance: () => boolean;
  zoomBy: (factor: number) => void;
  ping: (id: string) => void;
  screenPos: (id: string) => { x: number; y: number } | null;
}

interface Props {
  nodes: GNode[];
  links: GLink[];
  mode: LayoutMode;
  selectedId: string | null;
  hoverId: string | null;
  /** ids that survive the current filters; others fade out but stay simulated */
  visible: Set<string>;
  /** relationship types currently switched on */
  visibleEdgeTypes: Set<EdgeType>;
  /**
   * Curtain-up progress, 0..1, as a ref rather than a number. It is written
   * once per frame and read only inside this render loop; as a prop it forced
   * a full React re-render of every panel on all ~90 frames of the reveal.
   */
  reveal: { readonly current: number };
  showLabels: boolean;
  lang: 'ko' | 'en';
  /** Text the canvas has to paint itself, already in the right language. */
  canvasStrings: {
    emptyTitle: string;
    emptySub: string;
    emptyHint: string;
    coldLabel: string;
    coldSub: string;
    graphLabel: string;
  };
  /** Screen-space area covered by chrome, so fitting frames the visible part. */
  insets?: { top: number; right: number; bottom: number; left: number };
  /** Ids on the currently traced route between two people, if any. */
  pathNodeIds?: Set<string> | null;
  pathLinkIds?: Set<string> | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  /** Shift-click on a second node while one is selected. */
  onTraceTo?: (id: string) => void;
  /** Fired as the cursor crosses a relationship line. */
  onLinkHover?: (id: string | null) => void;
  /**
   * The relationship held open on the canvas, and the way to change it.
   *
   * Controlled, and lifted out of this component on purpose: a pinned line is
   * the one object in the app whose readout a reader most wants to send —
   * "look what 홍진호 did to 하승진" — so it has an address, `tie=a~b~type`, and
   * the hash is written from App. State that is in the URL cannot also be
   * private to the canvas; the writer would have nothing to read. Every gesture
   * that pins or clears one still lives here (click, Esc, E-cycle, a click on
   * empty canvas) — what moved is the value, not the behaviour.
   *
   * This replaced an `onLinkSelect` notification. Two channels for one event —
   * a private copy of the truth plus a callback announcing it — is how the copy
   * and the address drift apart, and nothing was listening to it anyway.
   */
  pinnedLinkId: string | null;
  onPinLink: (id: string | null) => void;
  onViewChange?: (v: Viewport) => void;
  /**
   * Clears every filter. The empty state's escape line is a real control now
   * rather than painted canvas text, and this is what it calls; without it the
   * line is still shown, just as prose. See the empty-state block below.
   */
  onResetFilters?: () => void;
  /**
   * Fired once, on the frame the draw-on sweep hands its last line to 1 — i.e.
   * when the entrance this component owns is genuinely over, not when a
   * stopwatch outside it says so.
   *
   * It exists because the entrance's budget turned out to be the thing worth
   * protecting: the schedule is SWEEP_AT × the master fade plus DRAW_SPAN plus
   * DRAW_DUR, none of which App can compute, and the chrome's own arrival was
   * landing inside it. App holds the chrome until this fires. Optional, and the
   * caller keeps a timer of its own as a backstop — a callback that depends on
   * frames must never be the only way something appears.
   */
  onEntranceDone?: () => void;
  /**
   * Fired once, on the frame the last warm pass runs — i.e. when the painter
   * has been compiled behind the curtain and a fade started now will actually
   * be delivered in frames rather than in two steps.
   *
   * It is the other half of `onEntranceDone`: that one says the entrance is
   * over, this one says it is safe to begin. App holds `revealArmed` on it with
   * a ceiling, because the reader's ENTER can land at any moment and the answer
   * to "not warm yet" is a few milliseconds of waiting, not a lost entrance.
   */
  onWarm?: () => void;
  handleRef?: React.Ref<GraphHandle>;
}

/** Absolute floor. Below this the labels are gone and there is no composition
 *  left, so there is nothing to be gained by zooming further out. */
const MIN_K = 0.34;
const MAX_K = 4.2;
/** …and never smaller than this fraction of the zoom that just fits, so the
 *  graph always holds at least ~60% of the frame's short side. */
const FIT_FLOOR = 0.6;

/** How much of the smaller of graph and frame a pan has to leave overlapped, per
 *  axis. 0.5 on both is a quarter of the area. See clampPan. */
const PAN_KEEP = 0.5;

/** The canvas obeys the same three speeds as the CSS, in the same units.
 *  (tokens.css: --d-fast / --d-base / --d-slow / --d-cine) */
const DUR = { fast: 140, base: 240, slow: 420, cine: 720 } as const;

/** Per-frame factor for an exponential approach that is ~95% settled after
 *  `ms` — frame-rate independent, and named after the duration token it maps to. */
function settle(dt: number, ms: number): number {
  return 1 - Math.exp((-3 * dt) / ms);
}

/** tokens.css --ease-out, evaluated exactly, so canvas moves and DOM moves have
 *  the same personality.
 *
 *  Exported because App's master curtain needs it too: `reveal` is the value
 *  every other schedule on the entrance is keyed to, and it used to run on a
 *  hand-written easeOutCubic that appears nowhere in tokens.css. One curve, one
 *  place. See EASE_REVEAL in App.tsx. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (p: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 6; i++) {
      const x = sampleX(t) - p;
      if (Math.abs(x) < 1e-5) break;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= x / d;
    }
    return sampleY(t);
  };
}
const EASE_OUT = cubicBezier(0.22, 1, 0.36, 1);
/** tokens.css --ease-in-out. Used where a value has to leave as deliberately as
 *  it arrived — see REGION_EXIT_MS. */
const EASE_IN_OUT = cubicBezier(0.65, 0, 0.35, 1);

/**
 * Entrance choreography: the mesh grows outward from the most connected person.
 *
 * It used to wait 300ms and then take 640ms per hop, so for the first ~700ms of
 * the product the canvas asserted the exact opposite of its thesis — twenty
 * people, none of them connected to anyone, under a caption claiming four of
 * them have no prior tie. The hub's own edges now start at t=0 and grow while
 * the camera is still moving; the outermost hop lands at 816ms instead of 1216.
 */
/**
 * Round 3 measured the entrance and found it could not propagate: the hop of a
 * link was `Math.min` of its two endpoints' hops, so every edge that did not
 * touch the hub was hop 1 and the histogram was {0:11, 1:22} — two waves 166ms
 * apart against a 420ms per-edge draw, i.e. 60% overlap and one undifferentiated
 * blob of lines. An edge now belongs to the frontier that *completes* it
 * (`Math.max`), and because a 20-node graph has a diameter of two the waves are
 * further separated by a within-hop stagger ordered by bearing from the hub —
 * so each wave sweeps round the mesh instead of arriving flat.
 */
/**
 * Rounds 4 and 6 measured it again and the waves still did not read, because
 * the quantity being staggered has no structure to expose. The hop histogram of
 * this graph is {1: 27, 2: 16, 3: 1} — a diameter-2 mesh does not HAVE hops,
 * it has one blob and a remainder — and capping the within-hop spin
 * (`min(DRAW_SPIN, DRAW_SPIN_MAX / (group.length - 1))` = 3.46ms) squeezed 27
 * of the 41 links into a 90ms window against a 260ms draw. On screen: two flat
 * blobs, the first of them half-drawn while the master fade was still at 72%.
 * Three re-tunings of a schedule nobody could see.
 *
 * So the stagger is no longer by hop. It is by DISTANCE from the hub — a
 * continuous quantity this graph genuinely has, measured 74 → 536 world units
 * across the 44 link midpoints — and the cap is on the SPAN rather than on the
 * per-link step, which is what actually bounds how much can happen at once.
 *
 * The order is geometric and the spacing is uniform, and that split is
 * deliberate: sorting by distance is what makes the mesh grow outward, but
 * spacing the starts *proportionally* to distance re-creates the same failure
 * one rung down — 27 of the 44 midpoints sit inside the first 29% of the range,
 * i.e. 27 starts inside 124ms. Dealt out by rank instead, the sweep runs at a
 * constant ~9.8ms per link: at most 9 lines begin in any 90ms window against 27
 * before, and there is no gap in which the eye can decide the entrance is over.
 * Bearing from the hub breaks ties so co-radial links still sweep round.
 *
 * It starts at SWEEP_AT rather than at the first frame of the fade, so the mesh
 * is drawing itself onto a scene that is already there instead of competing
 * with the curtain for the same 200ms.
 */
/**
 * How far up the master fade the mesh starts drawing itself.
 *
 * The number is set against what the reader can actually see, which is the
 * curtain and the fade multiplied together: the cold open leaves over 500ms on
 * --ease-in-out while `reveal` runs 700ms on an expo-out, so at reveal 0.6 the
 * intro is still 78.5% opaque and the effective visibility of a line is 0.13.
 * At 0.8 — 291ms in — it is 0.56 and climbing steeply, and the sweep then ends
 * at ~931ms, comfortably before the arrangement settles at ~1.25s, so the mesh
 * is still visibly growing while the camera is flying.
 */
const SWEEP_AT = 0.8;
/** Wall-clock spread of the sweep's start times, hub outward. */
const DRAW_SPAN = 420;
/** …and how long any one line takes to draw. */
const DRAW_DUR = 220;

/**
 * How long the dashed links march after the highlight changes.
 *
 * The crawl is the *arrival* of a highlight, not a property of it. Advancing it
 * for as long as something is selected forced `motion = 1` on every frame for
 * the whole time a dossier was open — measured on the production preview at
 * 43.7 full-scene paints/s with the hub selected and the cursor off the graph
 * entirely, against 0.3/s idle: 44 links, 20 plates, the label collision solve
 * and three backdrop gradients re-rasterised thirty-odd times a second, for a
 * decorative dash offset, on a diagram whose subject is a historical record.
 *
 * So it is given the lifetime of the transition it decorates. 900ms covers the
 * 260ms focus settle (99.9% at 520ms) and the DUR.slow camera glide that a
 * selection also starts, and then the picture stops changing and the loop is
 * allowed to sleep again. The dash offset simply holds where it stopped; a
 * frozen offset is a phase, and no reader can tell one phase from another.
 */
const FLOW_MS = 900;

/**
 * How long the outgoing arrangement's scaffolding takes to leave.
 *
 * It used to take no time at all: the layout effect replaced `clustersRef` and
 * zeroed `regionAlpha` in one commit, so every Season ellipse and caption was
 * gone in the frame the key was pressed while all twenty people were still
 * standing in their By-season seats, and the archetype rings then took ~1s to
 * come up (measured 0 → 0.75 at 250ms → 1 at 967ms on the production build).
 * A hard cut out against a slow fade in, with the frame the reader most needs —
 * "these circles are about to become those circles" — being the one frame with
 * no circles in it.
 *
 * 240ms out, then the arrival-driven ramp in, so the handover has an order:
 * the old rings release the nodes, the nodes fly, the new rings close on them.
 */
const REGION_EXIT_MS = 240;

/**
 * Where in that window the incoming scaffolding is allowed to start coming up,
 * as a fraction of it — and how far it may get before arrival takes over.
 *
 * The comment above says the frame the reader most needs is "these circles are
 * about to become those circles", and that the previous cut's failure was "the
 * one frame with no circles in it". Scheduling the incoming ramp to open
 * exactly where the outgoing one closes turned that one frame into about nine:
 * traced per frame across web → by-season on the production build, the outgoing
 * set read 0.925 at 22ms, 0.128 at 239ms and 0 at 339ms while the incoming set
 * was pinned at 0 until 239ms and only reached 0.052 by 339ms. For ~150ms — the
 * window in which twenty people are travelling furthest — the arrangement had
 * no scaffolding at all.
 *
 * The cap is what makes the earlier start mean anything: without it the
 * incoming set is arrival-gated, arrival is measured from a standing start, and
 * moving the clock earlier changes a number that was not binding. See the
 * crossing in the render loop.
 *
 * 0.4, not the 0.6 the report asks for, and the difference is measured rather
 * than argued. The outgoing ramp passes 0.35 at p ≈ 0.58, i.e. 140ms in; the
 * incoming ramp is EASE_OUT over DUR.cine and needs ~42ms of its own clock to
 * reach 0.35; so the start has to be at or before 98ms for the two to meet
 * there. At 0.6 (144ms) they met at 0.15 — traced live, min painted alpha
 * 0.148 on web → by-season and 0.150 on by-season → by-archetype. At 0.4 (96ms)
 * they meet where the report says they should.
 *
 * HANDOFF (render.ts): the two sets still take the slot in turn rather than
 * being painted together, because `RenderState` carries one `clusters` array
 * and one `regionAlpha` and `drawClusters` applies that alpha to the lot. The
 * remaining half is a per-cluster alpha — `Cluster.at?: number`, defaulting to
 * 1, multiplied into `ra` at the top of the `for (const c of s.clusters)` loop
 * in drawClusters and into `ctx.globalAlpha` in drawCaptions. GraphCanvas can
 * then hand over `[...exit, ...current]` with `at` set from the two ramps and
 * the reader gets the frame this constant is named for: the old rings
 * dissolving inside the new ones.
 */
const REGION_CROSS = 0.4;
/** …and the ceiling the clock-only ramp may reach before arrival owns it. A
 *  third of an ellipse reads as a promise; a full one is a claim. */
const REGION_CROSS_CAP = 0.35;

/**
 * How long an anchored mode is allowed to be physics before it becomes a
 * landing. Past this the simulation stops ticking and the residual is driven
 * straight onto the anchors, so a transition arrives once and stays arrived
 * rather than re-accelerating at 1.4s and drifting for six seconds.
 */
const ARRIVE_MS = 620;
/** …and the approach used for that landing. */
const ARRIVE_TAU = 200;
/**
 * The free web layout has no anchors to land on, so it gets braked instead:
 * past ARRIVE_MS the damping ramps up over BRAKE_MS until the mesh coasts to a
 * stop. Without it, coming back to web from an anchored mode took eight seconds
 * of visible creep — the same "keeps changing its mind" failure, minus a target
 * to snap to.
 */
const BRAKE_MS = 560;
/**
 * How long the free layout is allowed to keep re-asking for the frame's
 * proportion — longer than it is allowed to keep MOVING, and deliberately so.
 *
 * layout.ts's shapeToFrame is an iterative solver: each pass asks for
 * `(want/have)^0.65` and the mesh travels part of the way, so the proportion is
 * reached over several passes, not one. It used to be gated on
 * ARRIVE_MS + BRAKE_MS, which is the window the mesh is allowed to be in motion
 * — the solver was being switched off at the same instant its subject stopped
 * responding, and it therefore froze on whatever intermediate ask the last pass
 * happened to hold. Measured at 1600x1000 once the anchors were live at all
 * (see the dt floor in the render loop): the ask parked at 0.99 against a frame
 * of 1.44, and the desktop lost 10 points of horizontal coverage.
 *
 * Letting it run past the brake is safe because the solver is self-cancelling —
 * at `have = want` the ask is exactly 1.0 and every anchor lands on the node's
 * own position. The two live guards are what stop it: `restRef` and a mesh that
 * is still genuinely moving. This is a ceiling on a runaway, not a schedule.
 */
const RESHAPE_MS = 3600;

/** Warm-up passes behind the curtain. See fontsReadyRef for what they compile,
 *  and the `reveal:` field in the frame below for why they now run at the
 *  reader's own alpha and are erased instead of being drawn faint.
 *
 *  Three, not two, because the reveal now paints at a different device scale
 *  than the app does — see REVEAL_DPR. plate.ts's graded-disc cache is keyed on
 *  a power-of-two ladder taken from the context matrix, so the two scales want
 *  two different rungs, and warming only one of them just moves twenty plate
 *  bakes onto the frame the curtain lifts (or onto the frame it lands). The
 *  last pass runs at the reveal's scale; the earlier ones at the app's. */
const WARM_PASSES = 3;
/** How long the warm pass will wait for `document.fonts.ready` before running
 *  against whatever metrics it has. Measured on the production preview the
 *  promise resolves at 39–702ms, so this is a ceiling on a stall, not a
 *  schedule — but the entrance is armed by a keypress that can land at any
 *  moment, and an uncompiled painter costs the reader the whole 1.3s of it. */
const FONTS_WAIT_MS = 900;

/**
 * Device scale the scene canvas paints at while the curtain is coming up.
 *
 * The reveal is the only moment three full-viewport surfaces are live at once —
 * the backdrop layer, this canvas, and the intro's own overlay compositing over
 * both — and a canvas repaint is a texture re-upload of the whole backing
 * store. At dpr 2 a 1440×900 scene canvas is 10.4MB per frame. Measured on the
 * production build, the entrance was arriving in as few as two frames across
 * its 1.3s, with single frames of 850ms.
 *
 * Halving the scale is a quarter of the bytes, and it is free to look at: for
 * the whole window this buys, the scene is a partially transparent layer under
 * a curtain that is itself still opaque for the first third. The frame `reveal`
 * reaches 1 repaints once at full scale — see the sizing block in the loop.
 *
 * 1 rather than "dpr / 2" so the number is the same on every display: this is a
 * budget, not a ratio.
 */
const REVEAL_DPR = 1;

/** Below this max node speed the picture has stopped changing in any way a
 *  reader can see, so we stop pretending otherwise. */
const SLOW_SPEED = 0.35;
const SLOW_HOLD_MS = 250;

/** The fraction of an unobstructed frame's scale that a fit into the UNCOVERED
 *  rect has to keep for that fit to still be a frame. See solveFrame. */
const COVER_FLOOR = 0.5;

/** How far orbit is allowed to de-emphasise somebody who is still inside one of
 *  its two named rings. 0.35 leaves a disc at 73% and a name at 69% — plainly
 *  secondary to the focus, plainly present. See the dim pass. */
const ORBIT_DIM_FLOOR = 0.35;

interface Tween {
  from: Viewport;
  to: Viewport;
  t0: number;
  dur: number;
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

function prefersReduced(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function GraphCanvas({
  nodes,
  links,
  mode,
  selectedId,
  hoverId,
  visible,
  visibleEdgeTypes,
  reveal,
  showLabels,
  lang,
  canvasStrings,
  insets,
  pathNodeIds,
  pathLinkIds,
  onHover,
  onSelect,
  onTraceTo,
  onLinkHover,
  pinnedLinkId,
  onPinLink,
  onViewChange,
  onResetFilters,
  onEntranceDone,
  onWarm,
  handleRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The static layer under the scene: gradients, bloom, vignette, grain. */
  const backRef = useRef<HTMLCanvasElement>(null);
  /**
   * Whether the backdrop layer currently holds a valid picture — see the
   * `renderBackdrop` call at the bottom of the loop for why that is now a
   * separate question from "has it gone stale".
   */
  const backdropPaintedRef = useRef(false);
  const viewRef = useRef<Viewport>({ x: 0, y: 0, k: 1 });
  const tweenRef = useRef<Tween | null>(null);
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1 });
  const simRef = useRef<Simulation<GNode, undefined> | null>(null);
  const linkForceRef = useRef<ForceLink<GNode, GLink> | null>(null);
  const chargeForceRef = useRef<ForceManyBody<GNode> | null>(null);
  const collideForceRef = useRef<ForceCollide<GNode> | null>(null);
  const xForceRef = useRef<ForceX<GNode> | null>(null);
  const yForceRef = useRef<ForceY<GNode> | null>(null);
  const clustersRef = useRef<Cluster[]>([]);
  /** Ego-ring membership by id, when the current layout publishes one. */
  const ringsRef = useRef<Map<string, number> | null>(null);
  const dragRef = useRef<{
    node: GNode | null;
    px: number;
    py: number;
    /** Where the gesture started — the tap/drag decision is measured from here. */
    ox: number;
    oy: number;
    panning: boolean;
    moved: number;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const insetsRef = useRef({ top: 0, right: 0, bottom: 0, left: 0 });
  const reducedRef = useRef(prefersReduced());
  const restRef = useRef(false);
  const lastPaintRef = useRef(0);
  const revealStartRef = useRef(0);
  /**
   * …and when the mesh started drawing itself onto it — the frame the master
   * fade first reached SWEEP_AT. Zero until then, which is also what holds
   * every line at draw 0 so the fade is never carrying half-drawn geometry.
   *
   * A ref rather than a local in the render loop, for the same reason
   * revealStartRef above it is one: if that effect were ever torn down and
   * rebuilt mid-entrance, a local would reset to 0, blank every line for a
   * frame and re-run the whole sweep from the beginning.
   */
  const sweepStartRef = useRef(0);
  /** …and whether it has finished handing every line to the exponential at 1.
   *  See the sweep clock in the render loop. */
  const sweepDoneRef = useRef(false);
  /**
   * The painter, warmed behind the curtain.
   *
   * `render()` returns at `sceneAlpha <= 0.01`, so before the reveal the scene
   * pass had never run once — not the label collision solve, not a single
   * `measureText`, not one plate. Everything it lazily builds was therefore
   * built in the frame the curtain started moving, together with the chrome's
   * entrance: a measured 102ms main-thread block on ENTER (214ms in this
   * headless build), during which the intro's compositor-driven opacity keeps
   * gliding while the canvas underneath is frozen. The graph appeared in a step
   * instead of fading up, and the draw-on sweep lost its first six frames.
   *
   * So it runs the whole pass while nobody can see it, at an alpha just above
   * the painter's own floor — 0.02 under an opaque cold open is not a pixel,
   * it is a compilation. Gated on real metrics being available: fallback fonts
   * and a 1×1 canvas warm the wrong code. HoverCard warms itself the same way.
   */
  const fontsReadyRef = useRef(typeof document === 'undefined');
  const warmRef = useRef(0);
  const modeFadeRef = useRef(0);
  const introDebugRef = useRef({
    t: -1,
    running: false,
    starts: 0,
    reveal: 0,
    warm: 0,
    sweepAt: 0,
    sweepOwns: false,
    sweepDone: false,
  });

  /** Keyboard cursor: a node the user is standing on without having selected it. */
  const [kbdId, setKbdId] = useState<string | null>(null);
  const [kbdRing, setKbdRing] = useState(false);
  const [sizeVersion, setSizeVersion] = useState(0);

  /* ── the lines, made live ──────────────────────────────────────────────
     Every line on this canvas is a specific sourced relationship, and until
     now the only way to read one was to open an endpoint's dossier and scroll
     past a bio to find the sentence the line was already pointing at. A link
     answers under the cursor, and a click holds the answer open. */
  const [hoverLinkId, setHoverLinkId] = useState<string | null>(null);
  /** Client coords the readout hangs off: the cursor, or a pinned line's midpoint. */
  const [linkPointer, setLinkPointer] = useState({ x: 0, y: 0 });
  /** Live-region text so the readout exists for a screen reader too. */
  const [announce, setAnnounce] = useState('');
  /* Held in refs so the pointer effect never has to be torn down and rebuilt
     because App handed us a new closure. */
  const onLinkHoverRef = useRef(onLinkHover);
  onLinkHoverRef.current = onLinkHover;
  const onPinLinkRef = useRef(onPinLink);
  onPinLinkRef.current = onPinLink;
  /* Held in a ref, and cleared as it fires: the render effect is rebuilt
     whenever `nodes`/`links` change identity, and the entrance announces itself
     exactly once. */
  const onEntranceDoneRef = useRef(onEntranceDone);
  onEntranceDoneRef.current = onEntranceDone;
  const onWarmRef = useRef(onWarm);
  onWarmRef.current = onWarm;
  /** When this component came up, on the same clock the render loop runs on.
   *  A ref rather than a local in that effect, because the effect is rebuilt
   *  whenever `nodes`/`links` change identity and a local would restart the
   *  warm pass's font deadline every time. */
  const mountAtRef = useRef(typeof performance === 'undefined' ? 0 : performance.now());
  /** linkAnchor(), reachable from the debug hook that is declared above it. */
  const linkAnchorRef = useRef<((l: GLink) => { x: number; y: number }) | null>(null);
  /** Whether the lit line has a POINTER behind it. The keyboard lights lines too
   *  (see cycleLink), and a highlight with no cursor under it has to be cleaned
   *  up by whoever put it there — the pointer never will. */
  const hoverFromPointerRef = useRef(false);

  /* Which highlight the scene is currently wearing, and when it last changed.
     The only consumer is the dashed crawl's lifetime (FLOW_MS) — refs rather
     than locals in the render effect for the same reason sweepStartRef is one:
     that effect is rebuilt whenever `nodes`/`links` change identity, and a
     local would restart the crawl for a graph that has not moved. */
  const focusKeyRef = useRef('|');
  const focusPathRef = useRef<Set<string> | null>(null);
  const focusAtRef = useRef(0);

  const stateRef = useRef({
    hoverId,
    selectedId,
    visible,
    visibleEdgeTypes,
    reveal,
    showLabels,
    lang,
    canvasStrings,
    mode,
    pathNodeIds,
    pathLinkIds,
    onTraceTo,
    kbdId,
    kbdRing,
    hoverLinkId,
    pinnedLinkId,
  });

  stateRef.current = {
    hoverId,
    selectedId,
    visible,
    visibleEdgeTypes,
    reveal,
    showLabels,
    lang,
    canvasStrings,
    mode,
    pathNodeIds,
    pathLinkIds,
    onTraceTo,
    kbdId,
    kbdRing,
    hoverLinkId,
    pinnedLinkId,
  };
  insetsRef.current = insets ?? { top: 0, right: 0, bottom: 0, left: 0 };

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of links) {
      if (!m.has(l.source.id)) m.set(l.source.id, new Set());
      if (!m.has(l.target.id)) m.set(l.target.id, new Set());
      m.get(l.source.id)!.add(l.target.id);
      m.get(l.target.id)!.add(l.source.id);
    }
    return m;
  }, [links]);

  /** Hops from the most connected person — drives the entrance so the mesh
   *  visibly propagates outward from the hub instead of arriving all at once. */
  const hops = useMemo(() => {
    const m = new Map<string, number>();
    if (!nodes.length) return m;
    const hub = nodes.reduce((a, b) => (b.degree > a.degree ? b : a), nodes[0]);
    const queue = [hub.id];
    m.set(hub.id, 0);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      const d = m.get(id)!;
      for (const nb of adjacency.get(id) ?? []) {
        if (m.has(nb)) continue;
        m.set(nb, d + 1);
        queue.push(nb);
      }
    }
    return m;
  }, [nodes, adjacency]);

  /* Webfont metrics gate the warm pass: a pass measured against the fallback
     face caches the wrong advances and has to be redone under the curtain it
     was supposed to get ahead of. */
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? null : document.fonts;
    if (!fonts) {
      fontsReadyRef.current = true;
      return;
    }
    let live = true;
    void fonts.ready.then(() => {
      if (live) fontsReadyRef.current = true;
    });
    return () => {
      live = false;
    };
  }, []);

  /* ── reduced motion, re-read live ────────────────────────────────────── */
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      reducedRef.current = mq.matches;
      restRef.current = false;
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* ── simulation ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const link = forceLink<GNode, GLink>(links)
      .id((d) => d.id)
      .distance((l) => {
        const base = l.edge.season === 0 ? 168 : 122;
        return base - l.edge.strength * 9 + (l.source.radius + l.target.radius) * 0.9;
      })
      .strength((l) => 0.06 + l.edge.strength * 0.035);
    const charge = forceManyBody<GNode>()
      .strength((d) => -260 - d.radius * 16)
      .distanceMax(940);
    const fx = forceX<GNode>(0).strength(0.012);
    const fy = forceY<GNode>(0).strength(0.02);
    /* Collide against the PLATE, not the disc. A node's season arcs, host
       hairline and rim ticks live out at 1.5–1.83× its radius, so a separation
       measured from the disc let two plates interleave their marks — and a rim
       tick sitting inside a neighbour's ring band is read as that neighbour's
       tick. `plateExtent` is the outermost mark; the constant is clear air on
       top of it. */
    const collide = forceCollide<GNode>()
      .radius((d) => plateExtent(d) + 14)
      .strength(0.92)
      .iterations(2);

    const sim = forceSimulation<GNode>(nodes)
      .force('link', link)
      .force('charge', charge)
      .force('collide', collide)
      .force('x', fx)
      .force('y', fy)
      // d3's default tail (0.0228) was slowed to 0.018 here, which meant every
      // arrangement kept integrating for ~5.6s past the point where anything
      // visible was still happening. The composition is unchanged; it just
      // stops claiming to still be working on it.
      .alphaDecay(0.035)
      .velocityDecay(0.36);

    // We drive ticking ourselves from the render loop, so d3's internal timer
    // is stopped immediately and never restarted — restart() here would cause
    // double-ticking and a visibly jittery layout.
    sim.stop();
    simRef.current = sim;
    linkForceRef.current = link;
    chargeForceRef.current = charge;
    collideForceRef.current = collide;
    xForceRef.current = fx;
    yForceRef.current = fy;

    // Pre-settle off-screen so the reveal starts from a composed layout
    // instead of a big bang.
    for (let i = 0; i < 190; i++) sim.tick();
    sim.alpha(0.42);
    restRef.current = false;

    /* Photographs, if `public/portraits/` holds any.
     *
     * Fetched for the whole cast at once rather than as nodes come into view:
     * twenty small images is a rounding error next to the fonts, and loading
     * them lazily means the composition visibly changes while the reader is
     * looking at it.
     *
     * The subscription is the load-bearing half. This canvas deliberately
     * sleeps at rest — 0.5 paints/s with nothing selected — so an image that
     * decodes 300ms after the graph settled lands in exactly the case the
     * motion gate exists to ignore, and the portraits would appear on the next
     * unrelated interaction. Which reads as the app having been broken until
     * you touched it. */
    preloadPortraits(nodes.map((n) => n.id));
    const offPortrait = onPortraitLoad(() => {
      restRef.current = false;
      lastPaintRef.current = 0;
    });

    return () => {
      offPortrait();
      sim.stop();
      simRef.current = null;
      linkForceRef.current = null;
      chargeForceRef.current = null;
      collideForceRef.current = null;
      xForceRef.current = null;
      yForceRef.current = null;
    };
  }, [nodes, links]);

  /* ── layout mode ─────────────────────────────────────────────────────── */
  const anchorStrengthRef = useRef(0);
  const anchorTargetRef = useRef(0);
  const anchorKRef = useRef(0);
  const anchoredRef = useRef(false);
  const relayoutTick = useRef(0);
  const lastTraceRef = useRef<string | null>(null);
  /** When the current arrangement was asked for — the arrival clock. */
  const modeStartRef = useRef(0);
  /**
   * How the regions catch up with the people they name.
   *
   * `regionAlpha` used to be a fixed 720ms clock, and the arrangement it is
   * scaffolding for is not a 720ms move: ARRIVE_MS (620) plus the ARRIVE_TAU
   * landing measurably completes at ~1.25s. So the rings and their captions
   * reached 0.95 at 480ms and asserted a finished composition for the better
   * part of a second while people were still in the air — a caption reading
   * "포커 · 2명" over an empty circle, which is a false statement about the
   * picture and the same class of error the intro's count-up was deleted for.
   *
   * The scaffolding is tied to arrival instead: the mean distance from every
   * node to its own anchor, as a fraction of what that distance was when the
   * mode was asked for. The clock stays as a ceiling so the rings can never
   * outrun the ease, and the value ratchets — the physics phase can throw the
   * mean error back up above where it started, and a ring that faded back out
   * mid-transition would read as a fault rather than as a wait.
   */
  const anchorErr0Ref = useRef(0);
  const regionAlphaRef = useRef(1);
  /** What the painter was actually handed last frame: the higher of the two
   *  ramps during a handover. Published so the crossing can be measured from
   *  outside rather than asserted — see REGION_CROSS. */
  const regionPaintedRef = useRef(1);
  /**
   * The scaffolding of the arrangement being LEFT, and when it started leaving.
   *
   * Held apart from `clustersRef` on purpose: everything else that reads the
   * clusters — bounds(), the fit, predictFreeBounds — must see the arrangement
   * the camera is flying to, not the one dissolving behind it. This pair is
   * only ever painted. See REGION_EXIT_MS.
   */
  const exitClustersRef = useRef<Cluster[]>([]);
  const exitAtRef = useRef(0);
  /**
   * When the incoming scaffolding is allowed to start coming up: the mode
   * change, plus the exit window if there was something to clear first. Without
   * the offset the two halves overlap — the new rings were already at 0.75 by
   * the time the old ones finished leaving — and the handover reads as a
   * cross-fade between two diagrams rather than as one replacing the other.
   */
  const regionInStartRef = useRef(0);
  /**
   * The last mode this component laid out.
   *
   * The layout effect also re-runs for a selection, a resize and a language
   * change, and it used to reset `regionAlpha` to 0 for all of them: measured on
   * the production build, clicking one person in By-season dropped every season
   * ellipse and caption to 0 in a single frame and ramped them back over ~1.05s
   * (0 at +14ms, 0.951 at +614ms, 1 at +1048ms). Only a mode change actually
   * replaces the scaffolding, so only a mode change gets the handover.
   */
  const lastModeRef = useRef<LayoutMode | null>(null);
  /** …and who orbit was centred on, for the one selection that is a new
   *  arrangement rather than a highlight. */
  const lastOrbitFocusRef = useRef<string | null>(null);
  /**
   * Recent frame budget, exponentially smoothed. predictFreeBounds integrates
   * the arrival schedule against it rather than against a hardcoded 16ms, so
   * the box it predicts is the box the machine it is running on will actually
   * produce. See predictFreeBounds.
   */
  const frameDtRef = useRef(16.7);
  /** Max node speed on the last integrated frame, and how long it has been low. */
  const meshSpeedRef = useRef(999);
  const slowMsRef = useRef(0);
  /** Set as soon as the reader takes the camera themselves, so an automatic
   *  re-frame never yanks a view they chose. Cleared on a mode change. */
  const userCamRef = useRef(false);
  /** Narrower than userCamRef: only a real gesture — drag, wheel, pinch, the
   *  zoom buttons. A programmatic focus is not the reader taking the camera,
   *  and treating it as one is what left the phone build with no self-heal at
   *  all, since the first thing it does is focus the hub. */
  const readerCamRef = useRef(false);
  const healRef = useRef({ at: 0, left: 4 });

  const applyAnchors = useCallback(
    (as: number, k: number): number => {
      if (as <= 0.001 || k <= 0) return 0;
      let pull = 0;
      for (const n of nodes) {
        const w = as * n.anchorW * k;
        if (w <= 0) continue;
        const dx = n.ax - n.x;
        const dy = n.ay - n.y;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d > pull) pull = d;
        n.vx += dx * w;
        n.vy += dy * w;
      }
      return pull;
    },
    [nodes],
  );

  /** The uncovered rectangle of canvas, in CSS pixels. */
  const viewRect = useCallback(() => {
    const { w, h } = sizeRef.current;
    const ins = insetsRef.current;
    const vw = Math.max(160, w - ins.left - ins.right);
    const vh = Math.max(160, h - ins.top - ins.bottom);
    return { vw, vh, cx: ins.left + vw / 2, cy: ins.top + vh / 2 };
  }, []);

  /* The layout names regions, so it needs copy. Every caption it emits comes
     from the i18n table in the reader's language — the mode used to paint
     "PROFESSIONAL" and "SEASON 1" in Latin caps on an otherwise Korean canvas. */
  const layoutStrings = useMemo<LayoutStrings>(
    () => ({
      season: t(lang, 'canvas.seasonLabel'),
      rookie: t(lang, 'canvas.rookieLabel'),
      ring1: t(lang, 'canvas.orbitRing1'),
      ring2: t(lang, 'canvas.orbitRing2'),
      category: CATEGORY_LABEL_I18N[lang],
      // Without it a region caption ends "· 7", which reads as a footnote
      // marker rather than as seven people. See LayoutStrings.count.
      count: t(lang, 'canvas.regionCount'),
      /* Singular, derived from the plural rather than authored here.
       *
       * Five of the ten archetype regions hold one person, so the English
       * build read "Creator · 1 people" five times on that mode's default
       * frame. There is no `canvas.regionCountOne` key yet, and inventing the
       * word "person" in a .tsx file is exactly the drift the i18n table
       * exists to prevent — so the counter word is swapped for its own
       * singular out of `common.person`/`common.people`, both of which are
       * already translated. In Korean the two are the same string ('명') and
       * the substitution is a no-op, which is the correct answer there. If the
       * plural word is ever absent from the template this degrades to the
       * plural, i.e. to the behaviour it replaced. */
      countOne: t(lang, 'canvas.regionCount').replace(
        t(lang, 'common.people'),
        t(lang, 'common.person'),
      ),
    }),
    [lang],
  );
  const layoutStringsRef = useRef(layoutStrings);
  layoutStringsRef.current = layoutStrings;

  useEffect(() => {
    const { vw, vh } = viewRect();
    const res = applyLayout(mode, nodes, links, {
      focusId: selectedId,
      seasonColor: SEASON_COLOR,
      catColor: CATEGORY_COLOR,
      strings: layoutStrings,
      view: { w: vw, h: vh },
    });
    /* A mode change replaces the scaffolding; every other reason this effect
       runs (a resize, a language change, a selection outside orbit) only
       re-solves the same one. Only a replacement gets a handover — see
       lastModeRef. Orbit is the exception on the selection side: its two rings
       ARE the selected person's ego network, so choosing somebody else there is
       a new arrangement, which is the same reason frameArrival keys on
       `orbitKey`. */
    const orbitFocus = mode === 'orbit' ? selectedId : null;
    const swapped = mode !== lastModeRef.current || orbitFocus !== lastOrbitFocusRef.current;
    lastModeRef.current = mode;
    lastOrbitFocusRef.current = orbitFocus;
    const now0 = performance.now();
    if (swapped && !reducedRef.current && clustersRef.current.length && regionAlphaRef.current > 0.01) {
      exitClustersRef.current = clustersRef.current;
      exitAtRef.current = now0;
    } else {
      exitClustersRef.current = [];
    }
    clustersRef.current = res.clusters;
    ringsRef.current = res.rings ?? null;
    anchorTargetRef.current = res.strength;
    anchorKRef.current = res.anchorK;
    anchoredRef.current = res.anchored;
    restRef.current = false;
    modeStartRef.current = now0;
    /* The denominator for the region ramp: how far the cast has to travel for
       this arrangement, measured once, before anybody has moved. */
    let err0 = 0;
    for (const n of nodes) err0 += Math.hypot(n.ax - n.x, n.ay - n.y);
    anchorErr0Ref.current = err0 / Math.max(1, nodes.length);
    if (swapped) {
      regionAlphaRef.current = 0;
      // Overlapped, not sequenced — see REGION_CROSS.
      regionInStartRef.current = now0 + (exitClustersRef.current.length ? REGION_EXIT_MS * REGION_CROSS : 0);
    }
    slowMsRef.current = 0;
    meshSpeedRef.current = 999;
    userCamRef.current = false;
    readerCamRef.current = false;
    /* Seeded with the clock, not with 0. The heal's guard is
       `now - healRef.at > 1200`, so an `at` of 0 meant the very first heal of an
       arrangement had no dwell requirement at all — it fired on the frame the
       simulation rested, which after a node click is ~1.4s in, with the dossier
       open and the reader mid-sentence. */
    healRef.current = { at: performance.now(), left: 4 };

    // Anchored modes get a heavier, stickier régime. The anchors used to ramp
    // in over DUR.cine while collide ran at 0.92/2 iterations against a
    // velocityDecay of only 0.36: the springs won late, seated nodes inside
    // each other's collide radii, and collide then ejected them — a second wave
    // of motion 1.4s after the eye had already read the arrangement as final.
    // The ring geometry guarantees spacing; collide is only here to break exact
    // ties, so it can afford to be gentle.
    simRef.current?.velocityDecay(res.anchored ? 0.55 : 0.36);
    collideForceRef.current?.strength(res.anchored ? 0.55 : 0.92);

    // An anchored mode is a different physical régime, not a slightly stiffer
    // web: the mesh is there to be read *against* the regions, not to hold the
    // graph together. At full strength forceLink and forceManyBody beat the
    // anchor spring outright, which is why the labelled rings used to sit empty
    // while every node piled into one blob. d3 re-initialises each force when
    // its strength is set, so this takes effect on the next tick.
    const held = res.anchored ? 1 : 0;
    linkForceRef.current?.strength((l) => (0.06 + l.edge.strength * 0.035) * (1 - 0.85 * held));
    chargeForceRef.current?.strength((d) => {
      const free = -260 - d.radius * 16;
      const bound = -70 - d.radius * 4;
      return free * (1 - held) + bound * held;
    });
    xForceRef.current?.strength(0.012 * (1 - held));
    yForceRef.current?.strength(0.02 * (1 - held));

    const sim = simRef.current;
    if (!sim) return;

    if (reducedRef.current) {
      // The biggest motion in the app is the graph itself. Under reduced-motion
      // it teleports and the scene cross-fades instead of flying.
      anchorStrengthRef.current = res.strength;
      if (res.anchored) {
        for (const n of nodes) {
          n.x = n.ax;
          n.y = n.ay;
          n.vx = 0;
          n.vy = 0;
        }
      } else {
        for (let i = 0; i < 140; i++) {
          applyAnchors(res.strength, res.anchorK);
          sim.tick();
        }
      }
      sim.alpha(0);
      modeFadeRef.current = performance.now();
      restRef.current = false;
      return;
    }

    sim.alpha(Math.max(sim.alpha(), 0.55));
  }, [mode, nodes, links, selectedId, sizeVersion, viewRect, applyAnchors, layoutStrings]);

  /* ── sizing ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = wrapRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const changed = Math.abs(r.width - sizeRef.current.w) > 1 || Math.abs(r.height - sizeRef.current.h) > 1;
      sizeRef.current = { w: r.width, h: r.height, dpr };
      for (const c of [cv, backRef.current]) {
        if (!c) continue;
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
        c.style.width = `${r.width}px`;
        c.style.height = `${r.height}px`;
      }
      // Setting a canvas's width clears it, so the backdrop layer has to be
      // told that what it is holding is gone.
      invalidateBackdrop();
      backdropPaintedRef.current = false;
      lastPaintRef.current = 0;
      // A different size is a different label solve and a different set of
      // gradients, so anything the warm pass built for the old one is not what
      // the curtain will lift on. Warm again.
      warmRef.current = 0;
      // Re-lay-out and re-frame: the ring geometry is derived from the viewport,
      // so a resize is a composition change, not just a bigger bitmap.
      if (changed) setSizeVersion((v) => v + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* The one wake-up the idle gate cannot derive for itself.
   *
   * Now that a rested scene stops repainting entirely (the `floor` in the render
   * loop), the loop has no clock left to notice that something outside it
   * discarded what is on screen. Coming back to a backgrounded tab is exactly
   * that case: the loop early-returns on `document.hidden`, and a browser is
   * free to drop the backing store of a canvas nobody is looking at. One
   * repaint on return, using the same wake the rest of this file uses. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => {
      if (document.hidden) return;
      restRef.current = false;
      lastPaintRef.current = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /* ── bounds / fit / focus helpers ────────────────────────────────────── */

  /** World-space box the camera should hold: the nodes *and* the regions that
   *  label them, including room above each caption. */
  const bounds = useCallback(
    (useAnchors: boolean) => {
      const vis = nodes.filter((n) => stateRef.current.visible.has(n.id));
      if (!vis.length) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      // Discs only. Names hang past the disc, but they are set in *screen*
      // space and their overhang is a constant number of pixels — folding it in
      // here as world units means dividing by the zoom you are still solving
      // for, which runs away. frameFor() takes it out of the viewport instead.
      for (const n of vis) {
        const x = useAnchors ? n.ax : n.x;
        const y = useAnchors ? n.ay : n.y;
        minX = Math.min(minX, x - n.radius);
        maxX = Math.max(maxX, x + n.radius);
        minY = Math.min(minY, y - n.radius);
        maxY = Math.max(maxY, y + n.radius);
      }
      for (const c of clustersRef.current) {
        if (c.flat) {
          // The band's real extent is the row of nodes it sits under, which is
          // already in the box — it only needs its caption and its lower rail.
          minY = Math.min(minY, c.y - 120);
          maxY = Math.max(maxY, c.y + 96);
          continue;
        }
        const rx = c.rx ?? c.r;
        const ry = c.ry ?? c.r * 0.92;
        minX = Math.min(minX, c.x - rx);
        maxX = Math.max(maxX, c.x + rx);
        // 40 world units of headroom for the caption block that rides above it.
        minY = Math.min(minY, (c.labelY ?? c.y - ry) - 40);
        maxY = Math.max(maxY, c.y + ry);
      }
      if (!Number.isFinite(minX)) return null;
      return { minX, minY, maxX, maxY };
    },
    [nodes],
  );

  const setTween = useCallback((to: Viewport, dur: number) => {
    tweenRef.current = {
      from: { ...viewRef.current },
      to,
      t0: performance.now(),
      dur: reducedRef.current ? 0 : dur,
    };
  }, []);

  /** Never let the graph shrink into a smudge: the floor scales with whatever
   *  is currently on screen rather than being a fixed constant. */
  const minZoom = useCallback(() => {
    const b = bounds(false);
    if (!b) return MIN_K;
    const { vw, vh } = viewRect();
    const kFit = Math.min(vw / Math.max(1, b.maxX - b.minX), vh / Math.max(1, b.maxY - b.minY));
    // A floor that sits above the zoom which just fits is not a floor, it is a
    // guaranteed overflow — on a phone the fitting k is genuinely below MIN_K.
    return Math.max(Math.min(MIN_K, kFit), Math.min(0.95, kFit * FIT_FLOOR));
  }, [bounds, viewRect]);

  /**
   * The viewport that frames `b` inside the uncovered rect. Pure — nothing
   * moves until somebody hands the result to setTween.
   *
   * `opts.focus` is the person the reader has open, and it decides the
   * TRANSLATION only — never the scale. The frame is still solved to hold the
   * whole cast; the focus is then centred as far as the slack on each axis
   * allows and clamped the moment the box would leave the rect. On the axis the
   * fit binds, the clamp is exact and the focus buys nothing; on the slack axis
   * it buys everything it can. That is the whole of "keep the selected person
   * framed AND keep the rest of the cast on screen": a fit that leans.
   *
   * `opts.k` overrides the solved scale for the one case where the reader owns
   * it (they zoomed or panned themselves). The clamp then usually has no
   * solution — the cast does not fit at their scale — and the frame degrades to
   * centring the focus, which is exactly what focusNode used to do alone.
   */
  const frameFor = useCallback(
    (
      b: { minX: number; minY: number; maxX: number; maxY: number },
      padding: number,
      opts?: { focus?: GNode | null; k?: number },
    ): Viewport => {
      const { vw, vh, cx, cy } = viewRect();
      const pad = Math.max(16, Math.min(padding, vw * 0.1, vh * 0.1));
      const bw = Math.max(1, b.maxX - b.minX);
      const bh = Math.max(1, b.maxY - b.minY);

      /* How far the *names* hang past the box of discs, per side, in screen
         pixels — measured from what the painter actually laid out last frame
         rather than guessed at a flat 72px on one side only. This is the
         allowance that decides whether 최혜선 is drawn or bisected by the frame,
         and it is spent out of the viewport rather than added to the world box:
         converting it to world units means dividing by the zoom being solved
         for, and the fit then chases itself smaller and smaller. */
      const kNow = Math.max(0.05, viewRef.current.k);
      // Capped, because a single very wide English name on the rim must not be
      // allowed to buy itself a quarter of the frame at everyone else's expense.
      const cap = Math.min(vw, vh) * 0.14;
      let mL = 0;
      let mR = 0;
      let mT = 0;
      let mB = 0;
      for (const n of nodes) {
        if (!stateRef.current.visible.has(n.id)) continue;
        const lx = labelExtent.get(n);
        if (!lx) continue;
        mL = Math.max(mL, lx.left - (n.x - b.minX) * kNow);
        mR = Math.max(mR, lx.right - (b.maxX - n.x) * kNow);
        mT = Math.max(mT, lx.up - (n.y - b.minY) * kNow);
        mB = Math.max(mB, lx.down - (b.maxY - n.y) * kNow);
      }
      mL = Math.max(0, Math.min(cap, mL));
      mR = Math.max(0, Math.min(cap, mR));
      mT = Math.max(0, Math.min(cap, mT));
      mB = Math.max(0, Math.min(cap, mB));

      const k =
        opts?.k != null
          ? Math.max(0.12, Math.min(MAX_K, opts.k))
          : Math.max(
              0.12,
              Math.min(MAX_K, Math.min((vw - pad * 2 - mL - mR) / bw, (vh - pad * 2 - mT - mB) / bh), 1.35),
            );
      let x = cx + (mL - mR) / 2 - ((b.minX + b.maxX) / 2) * k;
      let y = cy + (mT - mB) / 2 - ((b.minY + b.maxY) / 2) * k;

      const f = opts?.focus;
      if (f) {
        /* The window of translations that still hold every disc — and its
           labels — inside the uncovered rect. Empty exactly when the box does
           not fit at this k, which under the solved k it never is (the binding
           axis lands on a single point) and under a reader-chosen k it usually
           is. */
        const xLo = cx - vw / 2 + pad + mL - b.minX * k;
        const xHi = cx + vw / 2 - pad - mR - b.maxX * k;
        const yLo = cy - vh / 2 + pad + mT - b.minY * k;
        const yHi = cy + vh / 2 - pad - mB - b.maxY * k;
        const wantX = cx - f.x * k;
        const wantY = cy - f.y * k;
        /* Note the reversed clamp on the empty case. When the box does NOT fit
           at this k — a phone's 178px strip, or a scale the reader chose — the
           interval [hi, lo] is the set of translations for which the box still
           covers the whole rect, i.e. no edge of the frame falls off the graph.
           Clamping into that gives the focus as much centring as the rect can
           afford without opening a gap of empty canvas at one side, which is
           strictly better than either centring the focus outright (it drags the
           cast off one edge) or centring the box (it ignores the reader). */
        x = xLo <= xHi ? Math.min(xHi, Math.max(xLo, wantX)) : Math.min(xLo, Math.max(xHi, wantX));
        y = yLo <= yHi ? Math.min(yHi, Math.max(yLo, wantY)) : Math.min(yLo, Math.max(yHi, wantY));
      }
      return { k, x, y };
    },
    [viewRect, nodes],
  );

  /**
   * The graph may be pushed to the edge of the frame; it may not be pushed out
   * of it. Two rules, because one of them is not enough and it took a black
   * screenshot to find out which.
   *
   * (1) AREA. At least half of the smaller of graph and frame stays overlapped
   *     on each axis, i.e. a quarter of the area. It used to be 0.3 — 9% of the
   *     area — which is a rule about a rectangle rather than about a picture.
   *
   * (2) A PERSON. The bounding box is not the graph. Past k ≈ 2 the world box
   *     is several times the frame and most of its corners hold nothing, so a
   *     quarter of its area can be a quarter of empty canvas: driven live at
   *     1600×1000, thirty wheel-up ticks at MAX_K left 2 of 20 people on screen
   *     and a pan-out left the whole node box starting at the frame's right
   *     edge. So the clamp finishes on the thing a reader is looking for — if
   *     no visible disc centre is inside the uncovered rect, translate by the
   *     shortest vector that puts the nearest one there. The graph can still be
   *     driven anywhere; it can no longer be driven off.
   */
  const clampPan = useCallback(
    (v: Viewport) => {
      const b = bounds(false);
      if (!b) return;
      const { vw, vh, cx, cy } = viewRect();
      const gw = (b.maxX - b.minX) * v.k;
      const gh = (b.maxY - b.minY) * v.k;
      const wx = ((b.minX + b.maxX) / 2) * v.k;
      const wy = ((b.minY + b.maxY) / 2) * v.k;
      const offX = Math.max(0, (gw + vw) / 2 - Math.min(gw, vw) * PAN_KEEP);
      const offY = Math.max(0, (gh + vh) / 2 - Math.min(gh, vh) * PAN_KEEP);
      v.x = Math.max(cx - offX - wx, Math.min(cx + offX - wx, v.x));
      v.y = Math.max(cy - offY - wy, Math.min(cy + offY - wy, v.y));

      // Inset, so the guaranteed person is a plate the reader can read rather
      // than a sliver against the frame edge.
      const m = Math.min(64, Math.min(vw, vh) * 0.18);
      const x0 = cx - vw / 2 + m;
      const x1 = cx + vw / 2 - m;
      const y0 = cy - vh / 2 + m;
      const y1 = cy + vh / 2 - m;
      let bestX = 0;
      let bestY = 0;
      let bestD = Infinity;
      for (const n of nodes) {
        if (!stateRef.current.visible.has(n.id)) continue;
        const sx = n.x * v.k + v.x;
        const sy = n.y * v.k + v.y;
        const dx = sx < x0 ? x0 - sx : sx > x1 ? x1 - sx : 0;
        const dy = sy < y0 ? y0 - sy : sy > y1 ? y1 - sy : 0;
        if (dx === 0 && dy === 0) return; // somebody is already in frame
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          bestX = dx;
          bestY = dy;
        }
      }
      if (Number.isFinite(bestD)) {
        v.x += bestX;
        v.y += bestY;
      }
    },
    [bounds, viewRect, nodes],
  );

  /**
   * A deliberate camera move owns the camera for its whole duration.
   *
   * Clicking a person used to produce three moves: focusNode zoomed to 1.15,
   * then App's inset effect (260ms) and this component's own filter/inset
   * effect (220ms) both fired a 720ms fit, so k went 0.55 → 1.13 → 0.50 on one
   * click — in 2.0× and back out 2.3×, ending smaller than it started. Both of
   * those refits arrive through fit(), so fit() is where the lock lives.
   */
  const camLockRef = useRef(0);

  /** The person the reader has open, if they are on the canvas at all. Every
   *  camera solve leans on the same one, so a correction can never be solved
   *  against a different composition than the move it is correcting. */
  const focusNow = useCallback((): GNode | null => {
    const id = stateRef.current.selectedId;
    if (!id || !stateRef.current.visible.has(id)) return null;
    return nodes.find((n) => n.id === id) ?? null;
  }, [nodes]);

  /**
   * EVERY CAMERA SOLVE IN THIS FILE GOES THROUGH HERE.
   *
   * Two rules, and they are the two the four-round-old blocker is made of.
   *
   * (1) The frame leans on whoever is open — `focusNow` — so a move and the
   *     correction that follows it can never be solved against two different
   *     compositions. That is what made a click cost two camera moves.
   *
   * (2) A fit that costs more than half the picture's scale is not a fit.
   *     On a phone the dossier is a 68dvh sheet, not a column: the honest fit
   *     into the ~178px strip it leaves is k = 0.121, twenty three-pixel dots.
   *     Measured against the scale the same box would get with nothing covering
   *     the canvas, that is 37%; a desktop dossier costs 22% and a laptop one
   *     40%. So the ratio, not the absolute k, is what tells a panel BESIDE the
   *     graph from a panel ON it — and when it is on it, the strip goes back to
   *     doing the only thing it can at that size: showing the reader the face
   *     they just opened at the scale they were already reading at.
   */
  const solveFrame = useCallback(
    (b: { minX: number; minY: number; maxX: number; maxY: number }, padding: number, holdK?: number): Viewport => {
      const focus = focusNow();
      const to = frameFor(b, padding, { focus, k: holdK });
      if (holdK != null) return to;
      const { w, h } = sizeRef.current;
      const pad = Math.max(16, Math.min(padding, w * 0.1, h * 0.1));
      const kOpen = Math.min(
        (w - pad * 2) / Math.max(1, b.maxX - b.minX),
        (h - pad * 2) / Math.max(1, b.maxY - b.minY),
        1.35,
      );
      return to.k >= kOpen * COVER_FLOOR ? to : frameFor(b, padding, { focus, k: viewRef.current.k });
    },
    [frameFor, focusNow],
  );

  /**
   * Where a *free* layout is going to end up, before it starts going there.
   *
   * A free layout has no anchors, so a fit issued at the mode change frames the
   * arrangement the graph is leaving; the code then corrected it with a second
   * full 720ms re-frame 1.4s later, which shrank the graph ~40% under a reader
   * who had already started reading. Clone the positions, run the sim to rest
   * off-screen — the same trick the mount pre-settle uses — take the box, put
   * everything back. The fit then happens once, inside the mode transition.
   */
  const predictFreeBounds = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return null;
    const saved = nodes.map((n) => ({ x: n.x, y: n.y, vx: n.vx, vy: n.vy }));
    const alpha0 = sim.alpha();
    let aT = anchorTargetRef.current;
    let aK = anchorKRef.current;
    // Not "run it to rest" — run it through the *same arrival schedule* the
    // render loop will run it through. The free layout is braked from ARRIVE_MS
    // and cut at ARRIVE_MS + BRAKE_MS, so the arrangement that actually lands is
    // the one ~1.2s in, not the fully relaxed one. Predicting the relaxed state
    // over-states the box by ~20% and the correction pass then has to zoom back
    // in, which is the same jump measured from the other side.
    sim.alpha(0.55);
    const { vw, vh } = viewRect();
    /* …and run it on THIS machine's clock, not on an assumed 60fps.
       The schedule is wall-clock (ARRIVE_MS, BRAKE_MS) but the integration is
       per-frame: the loop sub-steps `clamp(round(dt/22), 1, 3)` ticks per frame
       and bleeds alpha once per frame, so a machine drawing at 37ms does a
       different number of ticks and a different number of bleeds than one
       drawing at 16ms, and arrives somewhere else. Predicting against a fixed
       16ms therefore guaranteed a miss — and a miss over 8% in k is what issues
       the late correction this whole path exists to avoid. Measured on the dev
       build at a 37.5ms mean frame: k moved 0.5756 → 0.8839 over the requested
       transition and then again to 0.9649 at 1283–1650ms, a second unrequested
       9% zoom-in after the reader had started reading. */
    const FRAME = Math.max(8, Math.min(64, frameDtRef.current));
    const steps = Math.max(1, Math.min(3, Math.round(FRAME / 22)));
    const frames = Math.ceil((ARRIVE_MS + BRAKE_MS + 60) / FRAME);
    for (let i = 0; i < frames; i++) {
      const over = i * FRAME - ARRIVE_MS;
      const brake = Math.max(0, Math.min(1, over / BRAKE_MS));
      sim.velocityDecay(0.36 + 0.54 * brake);
      if (brake >= 1) sim.alpha(sim.alpha() * 0.8);
      // The "no prior tie" row is seated relative to where the connected mesh
      // settles, so its anchors have to be re-derived as the mesh moves —
      // exactly what the render loop does. Predicting without this leaves the
      // four cold nodes drifting free and over-states the box by ~30%.
      if (i % 12 === 0) {
        const res = applyLayout('web', nodes, links, {
          focusId: stateRef.current.selectedId,
          seasonColor: SEASON_COLOR,
          catColor: CATEGORY_COLOR,
          strings: layoutStringsRef.current,
          view: { w: vw, h: vh },
        });
        clustersRef.current = res.clusters;
        aT = res.strength;
        aK = res.anchorK;
      }
      for (let s = 0; s < steps; s++) {
        applyAnchors(aT, aK);
        sim.tick();
      }
    }
    sim.velocityDecay(0.36);
    // bounds() knows how the regions extend past the discs; reading it here,
    // with the predicted positions and the predicted cold row in place, is what
    // makes this the same box the late correction would have computed.
    const b = bounds(false);
    nodes.forEach((n, i) => {
      n.x = saved[i].x;
      n.y = saved[i].y;
      n.vx = saved[i].vx;
      n.vy = saved[i].vy;
    });
    sim.alpha(alpha0);
    return b;
  }, [nodes, links, bounds, viewRect, applyAnchors]);

  /**
   * The box a re-frame has to hold: where the cast IS, unioned with where it is
   * going.
   *
   * A chrome change lands while the mesh may still be travelling — selecting a
   * person re-runs the layout solve against the newly narrowed viewport, so the
   * arrangement reshapes under the very camera move that is answering for it.
   * Framing the destination alone trusts a prediction: measured on the laptop
   * build, selecting a second person with the panel already open predicted a
   * box small enough to leave six of twenty outside the uncovered rect at
   * k=0.436. Framing the origin alone guarantees the same clipping one second
   * later, from the other side.
   *
   * The union is the only box that is wrong in neither direction. It costs a
   * few per cent of scale during a reshape and it cannot put anybody off
   * screen, which is the trade this whole item is about.
   */
  const reframeBounds = useCallback(() => {
    const here = bounds(false);
    const going = anchoredRef.current && anchorTargetRef.current > 0.01 ? bounds(true) : restRef.current ? null : predictFreeBounds();
    if (!here) return going;
    if (!going) return here;
    return {
      minX: Math.min(here.minX, going.minX),
      minY: Math.min(here.minY, going.minY),
      maxX: Math.max(here.maxX, going.maxX),
      maxY: Math.max(here.maxY, going.maxY),
    };
  }, [bounds, predictFreeBounds]);

  const fit = useCallback(
    // `dur` exists so a correction can read as a nudge. A heal is not a second
    // transition and must not be paced like one. `force` is for the one caller
    // that is not a correction at all — the curtain's own framing, which has to
    // land before the first visible frame whatever the mount tween is doing.
    (padding = 96, dur: number = DUR.cine, force = false) => {
      if (!force && performance.now() < camLockRef.current) return;
      /* Deliberately NOT liveBounds(): this is the one camera call that can
         land on the frame the curtain starts moving, and predictFreeBounds is
         ~70 simulated frames of main thread. An anchored mode still frames
         where it is going — those targets are already solved — but a free one
         frames what is on screen and lets the heal correct it. */
      const b = bounds(anchoredRef.current && anchorTargetRef.current > 0.01);
      if (!b) return; // nothing visible: leave the camera where the user left it
      if (force) camLockRef.current = 0;
      setTween(solveFrame(b, padding), dur);
    },
    [bounds, solveFrame, setTween],
  );

  /**
   * THE ONE CAMERA MOVE FOR "WHAT THE READER CAN SEE HAS CHANGED".
   *
   * Opening the dossier does not move the graph — it covers 530px of it. For
   * four rounds the answer to that was a pan at constant k (round 4's fix for an
   * unrequested zoom-out), which keeps the chosen person centred and pushes
   * everybody else off: measured on the production build at 1600×1000, three of
   * twenty plate centres left the uncovered rect on a single click — 곽범 under
   * the panel at x=1182 against a right edge of 1148, 강지후 and 최연청 below the
   * bottom rail at y=957/972 against 954 — with k unchanged at 0.7945 either
   * side. The cold band, which exists to explain exactly those two, was sliced.
   *
   * A pan cannot fix that, because the rectangle got SMALLER: holding k is
   * holding the one number that has to change. So the move is a fit into the new
   * uncovered rect, leaning on the open person (see frameFor) — the whole cast
   * stays on screen and the reader's choice keeps the best seat the slack
   * allows. It is not a revert of round 4: that defect was three moves fighting
   * (k 0.55 → 1.13 → 0.50 on one click), and this is one move, solved once,
   * against the rectangle the graph will actually be drawn in.
   *
   * `holdScale` is the reader's own camera. If they zoomed or panned by hand,
   * their scale is not ours to spend; the frame degrades to keeping the open
   * person inside the uncovered rect, which is the old behaviour exactly.
   */
  const reframe = useCallback(
    (dur: number, holdScale = false) => {
      const b = reframeBounds();
      if (!b) return;
      setTween(solveFrame(b, 96, holdScale ? viewRef.current.k : undefined), dur);
    },
    [reframeBounds, solveFrame, setTween],
  );
  const reframeRef = useRef(reframe);
  reframeRef.current = reframe;

  /* focusNode() USED TO LIVE HERE AND IT IS DELIBERATELY GONE.
   *
   * It framed one person by panning at constant k, App called it on every
   * selection, and it is exactly half of the four-round-old blocker: a pan
   * cannot answer a rectangle that just got 530px narrower, so the other
   * nineteen went wherever they were — three of twenty outside the uncovered
   * rect on a single measured click. The reframe above does what it did and
   * keeps the cast, and it does it against the insets the dossier has actually
   * committed rather than one commit ahead of them.
   *
   * It is not deprecated-but-kept, because a second camera entry point with
   * different behaviour is precisely how this defect survived rounds 8 through
   * 12: each round's fix went into one of the two callers. There is one now. */

  useImperativeHandle(
    handleRef,
    () => ({
      fit,
      armEntrance: () => {
        // The curtain is already up or moving: there is no hidden frame left to
        // spend, and stalling one now would be a stall the reader can see.
        if (reveal.current > 0.0001) return false;
        // `min`, not assignment: on a deep link this runs at mount, before any
        // pass has gone, and pulling the counter UP would skip the two that
        // bank the plate ladder's other rung.
        warmRef.current = Math.min(warmRef.current, WARM_PASSES - 1);
        return true;
      },
      zoomBy: (factor: number) => {
        const { cx, cy } = viewRect();
        const v = tweenRef.current?.to ?? viewRef.current;
        const k = Math.max(minZoom(), Math.min(MAX_K, v.k * factor));
        userCamRef.current = true;
        readerCamRef.current = true;
        setTween(
          {
            k,
            x: cx - ((cx - v.x) / v.k) * k,
            y: cy - ((cy - v.y) / v.k) * k,
          },
          DUR.base,
        );
      },
      ping: (id: string) => {
        const n = nodes.find((x) => x.id === id);
        if (n) n.pulse = 1;
      },
      screenPos: (id: string) => {
        const n = nodes.find((x) => x.id === id);
        if (!n) return null;
        const v = viewRef.current;
        return { x: n.x * v.k + v.x, y: n.y * v.k + v.y };
      },
    }),
    [fit, nodes, reveal, viewRect, minZoom, setTween],
  );

  // Frame the graph whenever the arrangement it should hold changes. The anchor
  // targets are already final at this point, so there is nothing to wait for.
  // Selection only changes the arrangement in orbit mode; everywhere else the
  // app is already gliding to the chosen node and a refit would fight it.
  const orbitKey = mode === 'orbit' ? selectedId : null;

  /** One move per arrangement: an anchored mode is framed on its anchors, a
   *  free one on its *predicted* rest box, and both inside the same tween as
   *  the mode change itself. */
  const frameArrival = useCallback(() => {
    camLockRef.current = 0;
    const anchored = anchoredRef.current && anchorTargetRef.current > 0.01;
    const b = anchored ? bounds(true) : predictFreeBounds() ?? bounds(false);
    if (!b) return;
    camLockRef.current = performance.now() + DUR.cine + 120;
    setTween(solveFrame(b, 96), DUR.cine);
  }, [bounds, predictFreeBounds, solveFrame, setTween]);

  useEffect(() => {
    frameArrival();
  }, [frameArrival, mode, orbitKey, sizeVersion]);

  /** The late pass is a correction, not a second transition: it only runs when
   *  the frame is genuinely wrong, and it runs at the nudge duration. */
  const correctFrame = useCallback(() => {
    const b = bounds(false);
    if (!b) return;
    /* Solved with the same lean as the move it is correcting. Without the
       focus the correction computes a *different* frame from the one reframe()
       just landed, decides it is 14% off and re-centres the graph away from the
       person the reader has open — a second camera move ~1s after the click, on
       every click. Same box, same lean, so a correct frame reads as correct. */
    const target = solveFrame(b, 96);
    const v = viewRef.current;
    const dk = Math.abs(target.k - v.k) / Math.max(0.001, v.k);
    const { vw, vh } = viewRect();
    const dpan = Math.max(Math.abs(target.x - v.x) / vw, Math.abs(target.y - v.y) / vh);
    if (dk < 0.08 && dpan < 0.14) return;
    /* Past the transition, the correction gives up its right to change scale.
     *
     * A free layout brakes to rest at ARRIVE_MS + BRAKE_MS ≈ 1.2s, which is
     * after the reveal is over and after the reader has read the arrangement;
     * a camera that re-zooms there is read as the app changing its mind, and it
     * re-flows every label mid-sentence (measured: k 0.8843 → 0.9649 at
     * 1283–1650ms on a 37ms frame budget). The frame can still be genuinely
     * wrong at that point — the cold row forms late — so the correction is not
     * refused outright, it is demoted to a pan at the k the reader already has.
     * Real clipping is the heal pass's job a few lines below, and it answers it
     * the same way.
     */
    /* …with one exception, and it is the exception this round is about.
     *
     * The ban is on the camera changing its mind about SIZE after the reader
     * has started reading, and every case it was written for was a late zoom
     * IN (measured k 0.8843 → 0.9649 at 1283–1650ms). A late zoom OUT is a
     * different animal: it only ever happens because the box no longer fits the
     * uncovered rect, which is to say somebody is being clipped right now. The
     * layout re-solves on every selection, so `modeStartRef` restarts on every
     * click and this branch is what a dossier-open correction lands in — held
     * to a pan, it can only choose which six of twenty to push off the edge.
     * So: a correction may always make the picture smaller, never larger. */
    if (performance.now() - modeStartRef.current > DUR.cine + 200 && target.k > v.k * 0.98) {
      if (dpan < 0.14) return;
      setTween(solveFrame(b, 96, v.k), DUR.base);
      return;
    }
    setTween(target, DUR.base);
  }, [bounds, solveFrame, viewRect, setTween]);
  const correctRef = useRef(correctFrame);
  correctRef.current = correctFrame;

  /* ── ONE MOVE PER CHANGE OF WHAT THE READER CAN SEE ────────────────────
   *
   * Three things change the picture without moving a single node: the reader
   * opens or closes a dossier (the uncovered rect loses 530px), toggles the
   * rail (it gains 300), or filters the cast (the box shrinks). All three
   * arrive here, and they arrive within a frame or two of each other — opening
   * the dossier changes `selectedId` on one commit and `insetKey` on the next —
   * so they are COALESCED into a single tween rather than fired as two.
   *
   * That coalescing is the whole reason this used to be two owners. App had an
   * inset effect on a 260ms timer and this file had a 220ms debounce, and the
   * two of them plus focusNode() made three camera moves out of one click.
   * App's is gone; this is the only place a change of chrome moves the camera.
   *
   * 130ms is one React commit plus a frame of slack, not a debounce for the
   * simulation's benefit — the fit is solved against the predicted rest box, so
   * a moving mesh is not a reason to wait.
   */
  const filterKey = useMemo(() => [...visible].sort().join(','), [visible]);
  const insetKey = insets ? `${insets.top}|${insets.right}|${insets.bottom}|${insets.left}` : '0';
  const refitSeen = useRef(false);
  useEffect(() => {
    if (!refitSeen.current) {
      refitSeen.current = true;
      return; // the mount fit above already framed this
    }
    const id = setTimeout(() => {
      // A mode change owns the camera for its whole DUR.cine — frameArrival has
      // already solved this exact frame against these exact insets.
      if (performance.now() < camLockRef.current) return;
      /* The reader's own camera is the one thing that outranks the fit: if they
         zoomed or panned by hand, hold their scale and only guarantee that the
         person they opened is inside the new rectangle. Everyone else's frame
         is ours to solve.
         In practice this is the RAIL and the FILTERS. Selecting a person
         re-runs the layout solve, and that clears reader ownership — which is
         the existing rule in this file, not a new one, and it is the right one:
         a click is a request for a new composition, a rail toggle is not.
         Measured: reader at k=1.64, click, k=0.68 with all twenty in the rect;
         reader at k=1.28, rail toggled, k held. */
      reframeRef.current(DUR.slow, readerCamRef.current);
      // A frame this deliberate resets the self-heal's budget: the heal exists
      // to catch what this move could not know about, not to argue with it.
      healRef.current = { at: performance.now(), left: Math.max(healRef.current.left, 2) };
    }, 130);
    return () => clearTimeout(id);
  }, [selectedId, filterKey, insetKey]);

  /* Test hook: lets the screenshot harness aim at a real node without having
     to reimplement the projection.

     Gated, because this one hands out the live link list — every tie between
     every pair — which is the exact thing the redaction feature is being built
     to withhold. `PROBES` is armed before boot by the harness and by nobody
     else; see src/probe.ts for why it is not a DEV flag, a build flag or a URL
     parameter. */
  useEffect(() => {
    if (!PROBES) return;
    const w = window as unknown as { __atlasDebug?: unknown };
    w.__atlasDebug = {
      centralNodeScreenPos: () => {
        const vis = nodes.filter((n) => stateRef.current.visible.has(n.id));
        if (!vis.length) return null;
        const best = vis.reduce((a, b) => (b.weight > a.weight ? b : a));
        const v = viewRef.current;
        return { x: best.x * v.k + v.x, y: best.y * v.k + v.y, id: best.id };
      },
      nodeScreenPos: (id: string) => {
        const n = nodes.find((x) => x.id === id);
        if (!n) return null;
        const v = viewRef.current;
        return { x: n.x * v.k + v.x, y: n.y * v.k + v.y };
      },
      /** Screen-space hull geometry plus the caption anchor, so the one
       *  constant every region caption is supposed to sit at can be measured
       *  from outside rather than asserted. See CAPTION_GAP in layout.ts. */
      clusters: () =>
        clustersRef.current.map((c) => {
          const v = viewRef.current;
          return {
            key: c.key,
            x: c.x * v.k + v.x,
            y: c.y * v.k + v.y,
            rx: (c.rx ?? c.r) * v.k,
            ry: (c.ry ?? c.r * 0.92) * v.k,
            labelX: c.labelX != null ? c.labelX * v.k + v.x : null,
            labelY: c.labelY != null ? c.labelY * v.k + v.y : null,
            k: v.k,
          };
        }),
      anchorError: () => {
        let worst = 0;
        let sum = 0;
        for (const n of nodes) {
          const d = Math.hypot(n.ax - n.x, n.ay - n.y);
          sum += d;
          worst = Math.max(worst, d);
        }
        return {
          worst,
          mean: sum / Math.max(1, nodes.length),
          anchored: anchoredRef.current,
          as: anchorStrengthRef.current,
          target: anchorTargetRef.current,
          k: anchorKRef.current,
          rest: restRef.current,
          alpha: simRef.current?.alpha() ?? -1,
          heal: healRef.current.left,
          userCam: userCamRef.current,
          tween: tweenRef.current != null,
        };
      },
      view: () => ({ ...viewRef.current }),
      counts: () => ({ nodes: nodes.length, links: links.length }),
      /** Every line's clickable point in client coords, with the pair and type
       *  that name it in an address. A relationship is a first-class object now
       *  — it has a readout and a `tie=` URL — so a harness has to be able to
       *  aim at one, and it must not do it by taking the straight midpoint of a
       *  bowed line, which is not on the line. Same reasoning as
       *  `centralNodeScreenPos`: go through the projection, do not restate it. */
      linkAnchors: () =>
        links.map((l) => ({
          id: l.id,
          a: l.source.id,
          b: l.target.id,
          type: l.type,
          ...(linkAnchorRef.current?.(l) ?? { x: 0, y: 0 }),
        })),
      /** How much of the frame the graph is actually holding, per axis.
       *  The fit is `min(scaleX, scaleY)` against a world box in a viewport of
       *  a different aspect, so one axis is always slack and which one it is
       *  flips with the orientation — a fact that is invisible in a screenshot
       *  and obvious in these two numbers. Reported as the box of node CENTRES
       *  over the uncovered rect, because that is the span the eye reads as
       *  "the graph"; the disc box is alongside it for the fit's own arithmetic. */
      fill: () => {
        const { vw, vh } = viewRect();
        const v = viewRef.current;
        const vis = nodes.filter((n) => stateRef.current.visible.has(n.id));
        if (!vis.length) return null;
        const xs = vis.map((n) => n.x * v.k + v.x);
        const ys = vis.map((n) => n.y * v.k + v.y);
        const cw = Math.max(...xs) - Math.min(...xs);
        const ch = Math.max(...ys) - Math.min(...ys);
        const b = bounds(false);
        return {
          k: +v.k.toFixed(4),
          vw: Math.round(vw),
          vh: Math.round(vh),
          centreW: Math.round(cw),
          centreH: Math.round(ch),
          hFill: +((cw / vw) * 100).toFixed(1),
          vFill: +((ch / vh) * 100).toFixed(1),
          discW: b ? Math.round((b.maxX - b.minX) * v.k) : null,
          discH: b ? Math.round((b.maxY - b.minY) * v.k) : null,
          worldAspect: b ? +((b.maxX - b.minX) / (b.maxY - b.minY)).toFixed(3) : null,
          frameAspect: +(vw / vh).toFixed(3),
          /* The proportion the layout ASKED for, next to the one it got.
             layout.ts's shapeToFrame is self-cancelling — it re-solves from the
             live extents every pass, so `askAspect` converging on `worldAspect`
             means the shaping arrived and `askAspect` sitting far from it means
             something downstream is out-pulling it. Without both numbers the
             two failures look identical from a screenshot. */
          askAspect: +(
            (Math.max(...vis.map((n) => n.ax + n.radius)) - Math.min(...vis.map((n) => n.ax - n.radius))) /
            Math.max(1, Math.max(...vis.map((n) => n.ay + n.radius)) - Math.min(...vis.map((n) => n.ay - n.radius)))
          ).toFixed(3),
          /* The connected mesh on its own. shapeToFrame is handed `tied` and
             proportions THAT, but the camera frames the mesh plus the "no prior
             tie" row seated 212 units beneath it plus that band's caption
             clearance — so the two boxes have different aspects and only one of
             them is being aimed. Reported separately because the gap between
             `tiedAspect` and `worldAspect` is the whole of the remaining error
             on a landscape frame, and it is invisible in either number alone. */
          tiedAspect: (() => {
            const t = vis.filter((n) => !n.noTies);
            if (t.length < 2) return null;
            const w = Math.max(...t.map((n) => n.x + n.radius)) - Math.min(...t.map((n) => n.x - n.radius));
            const h = Math.max(...t.map((n) => n.y + n.radius)) - Math.min(...t.map((n) => n.y - n.radius));
            return +(w / Math.max(1, h)).toFixed(3);
          })(),
          cold: vis.filter((n) => n.noTies).length,
        };
      },
      /**
       * The arrangement as it is actually drawn, in WORLD units — every node's
       * seat and plate rim, every region's ellipse — plus the two residuals
       * layout.ts publishes and nothing has ever read.
       *
       * Every geometric claim this pair of files makes ("no plate crosses a
       * boundary", "no two enclosures intersect", "the figure is centred in the
       * frame") is a statement about these numbers, and rounds 5 through 8 each
       * reported one of them fixed off a source read and were then contradicted
       * by a screenshot. A claim that cannot be sampled from outside is not a
       * claim, it is a hope; this is the sampler.
       */
      geometry: () => {
        const v = viewRef.current;
        const { vw, vh } = viewRect();
        return {
          k: v.k,
          vw,
          vh,
          nodes: nodes
            .filter((n) => stateRef.current.visible.has(n.id))
            .map((n) => ({
              id: n.id,
              x: n.x,
              y: n.y,
              ax: n.ax,
              ay: n.ay,
              r: n.radius,
              plate: plateExtent(n),
              cat: n.category,
              seasons: n.seasons.slice(),
              sx: n.x * v.k + v.x,
              sy: n.y * v.k + v.y,
            })),
          clusters: clustersRef.current.map((c) => ({
            key: c.key,
            x: c.x,
            y: c.y,
            rx: c.rx ?? c.r,
            // The renderer's own fallback for a cluster that publishes only `r`
            // (drawClusters, render.ts) — measuring against `r` on both axes
            // would miss exactly the 8% the archetype rings are short by.
            ry: c.ry ?? c.r * 0.92,
            bare: !!c.bare,
            lens: !!c.lens,
            flat: !!c.flat,
          })),
          membership: { ...membershipResidual },
          seat: { ...seatResidual },
        };
      },
      /** Entrance choreography, so the wave structure can be measured rather
       *  than asserted: the histogram of link hops and the live draw-on state. */
      linkWaves: () => {
        const hist: Record<number, number> = {};
        for (const l of links) {
          const hop = Math.max(hops.get(l.source.id) ?? 6, hops.get(l.target.id) ?? 6);
          hist[hop] = (hist[hop] ?? 0) + 1;
        }
        return hist;
      },
      /** …and the quantity the schedule actually orders on now: how far each
       *  link's midpoint sits from the hub, sorted. A degenerate spread here
       *  would mean the sweep is as flat as the hop histogram was. */
      linkSpread: () => {
        const hub = nodes.length ? nodes.reduce((a, b) => (b.degree > a.degree ? b : a), nodes[0]) : null;
        if (!hub) return [];
        return links
          .map((l) => Math.round(Math.hypot((l.source.x + l.target.x) / 2 - hub.x, (l.source.y + l.target.y) / 2 - hub.y)))
          .sort((a, b) => a - b);
      },
      linkDraw: () => links.map((l) => +l.draw.toFixed(3)),
      /** Live state of the two passes that can hold the scene wrong: how many
       *  people the focus dim is hiding, and how far the region scaffolding has
       *  come up. Both were reported as fixed once and reproduced from pixels. */
      dim: () => ({
        dimmed: nodes.filter((n) => n.dim > 0.5).length,
        lit: nodes.filter((n) => n.focus > 0.5).length,
        regionAlpha: +regionAlphaRef.current.toFixed(3),
      }),
      /** The departing arrangement's scaffolding while it is leaving, so the
       *  handover can be measured from outside instead of asserted. Empty at
       *  every other moment. See REGION_EXIT_MS. */
      regionExit: () => ({
        keys: exitClustersRef.current.map((c) => c.key),
        alpha: exitClustersRef.current.length
          ? +Math.max(0, 1 - EASE_IN_OUT(Math.min(1, (performance.now() - exitAtRef.current) / REGION_EXIT_MS))).toFixed(3)
          : 0,
        /** What the painter was handed — the higher of the two ramps. This is
         *  the number the dead beat was measured on, so it is the number the
         *  fix has to be measured on. See REGION_CROSS. */
        painted: +regionPaintedRef.current.toFixed(3),
      }),
      /** Smoothed frame budget — the number predictFreeBounds integrates on. */
      frameDt: () => +frameDtRef.current.toFixed(1),
      intro: () => ({ ...introDebugRef.current }),
    };
    return () => {
      delete w.__atlasDebug;
    };
  }, [nodes, links, hops, bounds, viewRect]);

  /* ── render loop ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const cv = canvasRef.current;
    // Transparent, because the backdrop is a layer below rather than the first
    // thing this context paints.
    const ctx = cv?.getContext('2d');
    const bctx = backRef.current?.getContext('2d', { alpha: false }) ?? null;
    if (!cv || !ctx) return;
    let raf = 0;
    let last = performance.now();

    /* Entrance schedule, built once on the frame the sweep starts — by then the
       pre-settle has run and the camera has framed, so distances and bearings
       from the hub are real positions rather than seed noise. */
    let linkStart: Map<string, number> | null = null;
    /* The entrance window. Generous until the schedule exists, then narrowed to
       the last link's actual finish so widening DRAW_SPAN never buys a second
       of full-scene repaints after the sweep is over. */
    let introEnd = 1200 + DRAW_SPAN + DRAW_DUR;
    const hubOf = (): GNode | null =>
      nodes.length ? nodes.reduce((a, b) => (b.degree > a.degree ? b : a), nodes[0]) : null;
    const midpoint = (l: GLink) => ({ x: (l.source.x + l.target.x) / 2, y: (l.source.y + l.target.y) / 2 });
    const buildLinkStart = (fromReveal: number): Map<string, number> => {
      const m = new Map<string, number>();
      const hub = hubOf();
      const key = new Map<string, { d: number; b: number }>();
      for (const l of links) {
        const mid = midpoint(l);
        const dx = mid.x - (hub?.x ?? 0);
        const dy = mid.y - (hub?.y ?? 0);
        key.set(l.id, { d: Math.hypot(dx, dy), b: Math.atan2(dy, dx) });
      }
      const order = [...links].sort((a, b) => {
        const ka = key.get(a.id)!;
        const kb = key.get(b.id)!;
        return ka.d - kb.d || ka.b - kb.b;
      });
      const step = DRAW_SPAN / Math.max(1, order.length - 1);
      order.forEach((l, i) => m.set(l.id, i * step));
      introEnd = fromReveal + DRAW_SPAN + DRAW_DUR + 60;
      return m;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      /* Clamped at BOTH ends, and the floor is the one that was load-bearing.
       *
       * `now` is the rAF timestamp — the start of the frame — and `last` is
       * seeded with a `performance.now()` taken after the effect body has run,
       * which is on the far side of the 190-tick pre-settle and the label warm.
       * The first frame therefore arrives with a timestamp that predates its own
       * seed: measured on this dev build at 390x844, dt ≈ −1370ms. (App.tsx's
       * reveal documents the same trap from the other side and already clamps
       * both ends of its own progress.)
       *
       * `settle()` is an exponential approach and it does not degrade gracefully
       * on a negative interval — it inverts and explodes: settle(−1370, 260) is
       * −7.3e6. The one consumer that could not survive that is the anchor ramp
       * below, which is a bare accumulator: one negative frame drove
       * anchorStrength to −3.66e6, and `applyAnchors` short-circuits on
       * `as <= 0.001`, so it then applied NOTHING for the 2.7s the ramp took to
       * crawl back to positive — by which point the free layout had braked and
       * parked (rest at +1.37s, anchorStrength still −108). The consequence was
       * total and silent: layout.ts's shapeToFrame, the whole mechanism that
       * gives the free mesh the frame's proportion, had never once been applied.
       * The cloud came out 1.09:1 at every viewport — measured identically at
       * 390x844, 768x1024 and 1600x1000 — against asks of 0.48, 0.88 and 1.53.
       * Anchored modes hid it, because their `landing` branch drives positions
       * straight onto ax/ay and never reads anchorStrength.
       *
       * A floor of 0 is the honest reading of a frame that claims to have taken
       * negative time: nothing advances, and the next frame carries on. */
      const dt = Math.max(0, Math.min(64, now - last));
      last = now;
      /* What this machine's frames actually cost, smoothed. predictFreeBounds
         has to integrate the arrival schedule against the same budget the
         render loop will, or its prediction is only right at 60fps. */
      frameDtRef.current += (dt - frameDtRef.current) * 0.2;
      const st = stateRef.current;
      const reduced = reducedRef.current;
      // Reduced motion collapses every DOM transition to 1ms. The canvas is the
      // largest surface in the app, so it honours the flag too rather than
      // easing hover, dimming and filter changes over 420ms behind a UI that
      // snaps.
      // One constant used to do four jobs. 420ms is right for a filter change —
      // a considered state change — and much too slow for hover, which is
      // transient and has to match the 140ms HoverCard it appears beside.
      const eBase = reduced ? 1 : settle(dt, DUR.slow);
      const eFocus = reduced ? 1 : settle(dt, st.selectedId ? 260 : 150);

      /** Largest per-frame change anywhere in the scene; drives the idle gate. */
      let motion = 0;
      const track = (d: number) => {
        const m = d < 0 ? -d : d;
        if (m > motion) motion = m;
      };

      if (revealStartRef.current === 0 && st.reveal.current > 0) revealStartRef.current = now;

      // In web mode the "no prior tie" row is positioned relative to where the
      // connected mesh actually settled, so its anchors have to be recomputed
      // as the mesh moves. That is a positional feedback loop the moment the
      // mesh stops moving on its own: the cold-row anchors get recomputed from
      // the positions those same anchors just produced, and the row keeps
      // nudging itself for seconds. Gate it on the mesh still genuinely moving,
      // so the row freezes as soon as there is nothing new to follow.
      relayoutTick.current++;
      if (
        st.mode === 'web' &&
        !restRef.current &&
        meshSpeedRef.current > 0.6 &&
        now - modeStartRef.current < RESHAPE_MS &&
        relayoutTick.current % 12 === 0
      ) {
        const { vw, vh } = viewRect();
        const res = applyLayout('web', nodes, links, {
          focusId: st.selectedId,
          seasonColor: SEASON_COLOR,
          catColor: CATEGORY_COLOR,
          strings: layoutStringsRef.current,
          view: { w: vw, h: vh },
        });
        clustersRef.current = res.clusters;
        anchorTargetRef.current = res.strength;
        anchorKRef.current = res.anchorK;
      }

      // physics
      const sim = simRef.current;
      if (sim) {
        // Ramp the anchors in fast, not slowly. Over DUR.cine the springs only
        // won after collide had already accumulated, which is what produced the
        // second wave of motion; at 260ms they win first and collide never gets
        // to eject anybody.
        const da = (anchorTargetRef.current - anchorStrengthRef.current) * settle(dt, 260);
        anchorStrengthRef.current += da;
        track(da);
        const dragging = dragRef.current?.node != null;

        // Past ARRIVE_MS an anchored mode stops being physics and becomes a
        // landing: d3 is no longer ticked and the residual is driven straight
        // onto ax/ay. Without this the alpha tail keeps nudging named people
        // past each other three seconds after the user stopped looking, which
        // reads as the layout changing its mind rather than as settling.
        const landing =
          anchoredRef.current && anchorTargetRef.current > 0.01 && !dragging && !reduced && now - modeStartRef.current > ARRIVE_MS;

        if (landing && !restRef.current) {
          const e = settle(dt, ARRIVE_TAU);
          let worst = 0;
          for (const n of nodes) {
            if (n.fx != null || n.fy != null) continue;
            const dx = n.ax - n.x;
            const dy = n.ay - n.y;
            const d = Math.hypot(dx, dy);
            if (d > worst) worst = d;
            n.x += dx * e;
            n.y += dy * e;
            n.vx = 0;
            n.vy = 0;
          }
          sim.alpha(0);
          if (worst < 1) restRef.current = true;
          else motion = 1;
        } else if (sim.alpha() > sim.alphaMin() || dragging || !restRef.current) {
          // Free layouts get a brake rather than a landing: the damping climbs
          // once the arrangement has had its arrival window, so the mesh coasts
          // to a halt instead of creeping for another six seconds. A node being
          // dragged is exempt — that motion is the user's, not the tail's.
          let braked = false;
          if (!anchoredRef.current) {
            const over = now - modeStartRef.current - ARRIVE_MS;
            const brake = dragging ? 0 : Math.max(0, Math.min(1, over / BRAKE_MS));
            sim.velocityDecay(0.36 + 0.54 * brake);
            braked = brake >= 1;
            // Damping alone only lowers the terminal speed, because d3 scales
            // every force by alpha and alpha is still high. Bleed alpha too, so
            // the forces themselves fade and the mesh coasts rather than idling
            // at a constant creep.
            if (braked && !dragging) sim.alpha(sim.alpha() * 0.8);
          }
          // Anchors add velocity, so they may only be applied on a frame that
          // actually integrates it — otherwise the impulse accumulates while the
          // graph is parked and fires all at once when it wakes.
          //
          // The simulation is stepped from the render loop, so on a slow frame
          // it would otherwise settle in slow motion. Sub-step (capped) so the
          // graph takes the same wall-clock time to arrive on any machine.
          const steps = Math.max(1, Math.min(3, Math.round(dt / 22)));
          for (let i = 0; i < steps; i++) {
            applyAnchors(anchorStrengthRef.current, anchorKRef.current);
            sim.tick();
          }
          let speed = 0;
          for (const n of nodes) {
            const s = Math.abs(n.vx) + Math.abs(n.vy);
            if (s > speed) speed = s;
          }
          meshSpeedRef.current = speed;
          // d3's alpha tail runs for ~5.6s past the point where nothing visible
          // is still happening. Once the fastest node has been under half a
          // world unit per tick for a quarter second, the picture has arrived —
          // say so instead of animating a number toward alphaMin.
          if (!dragging && speed < SLOW_SPEED) slowMsRef.current += dt;
          else slowMsRef.current = 0;
          if (slowMsRef.current > SLOW_HOLD_MS) sim.alpha(0);

          // Fully braked and creeping: the remaining motion is a few pixels a
          // second, which nobody can see and which used to run for another six.
          // Cut it rather than animate it.
          if (braked && !dragging && speed < 1.5) {
            for (const n of nodes) {
              n.vx = 0;
              n.vy = 0;
            }
            sim.alpha(0);
            restRef.current = true;
            // The mode change already framed the *predicted* rest box, so this
            // is only here to catch a prediction that missed. It is a nudge at
            // DUR.base and it only fires when the frame is genuinely wrong —
            // not a second 720ms re-frame 1.4s after the reader started reading.
            if (!userCamRef.current && now - modeStartRef.current < 4000) correctRef.current();
          } else if (!dragging && sim.alpha() <= sim.alphaMin() && speed < 0.05) restRef.current = true;
          else motion = 1;
        }
      }

      // ease per-node/link visual state
      const hover = st.hoverId;
      const sel = st.selectedId;
      // A link under the cursor (or pinned by a click) takes over the highlight:
      // it goes to full strength, its two people light, everything else dims —
      // the same vocabulary a node hover already uses, so the reader does not
      // have to learn a second one.
      const activeLinkId = st.pinnedLinkId ?? st.hoverLinkId;
      const activeLink = activeLinkId ? links.find((l) => l.id === activeLinkId) ?? null : null;
      /* `kbdRing`, not `kbdId`. The cursor may only dim the other nineteen
         people while the canvas is actually wearing its keyboard focus ring: a
         cursor with no ring belongs to nobody, and a dim state whose owner is
         invisible is one the reader has no way to undo. This is the second half
         of the Escape fix and it is deliberately redundant with the first —
         onCanvasFocus decides who gets a cursor, this decides what a cursor is
         allowed to do with the scene. */
      const anchorId = activeLink ? null : sel ?? hover ?? (st.kbdRing ? st.kbdId : null);
      const neighbours = anchorId ? adjacency.get(anchorId) : null;

      /* When the highlight last changed. Everything the focus drives is an
         exponential that settles and then stops asking for frames; the dashed
         crawl was the one thing that did not, so it needs to know how old the
         state it is decorating is. The traced path is compared by identity —
         App rebuilds the Set whenever the question changes and never mutates
         one in place. See FLOW_MS. */
      const focusKey = `${anchorId ?? ''}|${activeLinkId ?? ''}`;
      const pathIds = st.pathLinkIds ?? null;
      if (focusKey !== focusKeyRef.current || pathIds !== focusPathRef.current) {
        focusKeyRef.current = focusKey;
        focusPathRef.current = pathIds;
        focusAtRef.current = now;
      }
      const flowing = !reduced && now - focusAtRef.current < FLOW_MS;

      for (const n of nodes) {
        const isVisible = st.visible.has(n.id);
        const wantAppear = isVisible ? 1 : 0;
        const dA = (wantAppear - n.appear) * eBase;
        n.appear += dA;
        track(dA);

        let wantFocus = 0;
        let wantDim = 0;
        const path = st.pathNodeIds;
        if (activeLink) {
          if (n.id === activeLink.source.id || n.id === activeLink.target.id) wantFocus = 1;
          else wantDim = 1;
        } else if (path && path.size) {
          if (path.has(n.id)) wantFocus = n.id === st.selectedId || n.id === lastTraceRef.current ? 1 : 0.7;
          else wantDim = 1;
        } else if (anchorId) {
          if (n.id === anchorId) wantFocus = 1;
          else if (neighbours?.has(n.id)) wantFocus = 0.42;
          else wantDim = 1;
        }
        /* Orbit's dim floor.
         *
         * Orbit is the one mode that cannot be entered without a selection, so
         * the selection dim is not an edge case here — it is the mode's only
         * state. Every non-neighbour went to dim 1, which drawNodes turns into
         * appear × (1 − 0.78) and drawLabels into vis × (1 − 0.88): the ten
         * people the ring-2 caption counts were painted at roughly 8% alpha
         * with no names at all, in a 220px band of otherwise empty frame. A
         * caption that says "한 다리 건너 · 10명" over ten invisible discs is a
         * lie about the picture.
         *
         * Distance from the centre is already carrying "less relevant" in this
         * mode — that is what the rings *are* — so alpha must not carry it as
         * well. Ring membership comes from orbitLayout, which is the only place
         * that knows it (LayoutResult.rings). Ring 3 keeps the full dim: those
         * are the people this ego network genuinely has nothing to say about.
         */
        const ring = st.mode === 'orbit' ? ringsRef.current?.get(n.id) : undefined;
        if (ring !== undefined && ring <= 2 && wantDim > ORBIT_DIM_FLOOR) wantDim = ORBIT_DIM_FLOOR;
        if (!isVisible) wantDim = 1;
        const dF = (wantFocus - n.focus) * eFocus;
        const dD = (wantDim - n.dim) * eFocus;
        n.focus += dF;
        n.dim += dD;
        track(dF);
        track(dD);
        if (n.pulse > 0) {
          // A 42px ring expanding over 520ms is exactly the kind of decorative
          // motion the preference asks not to see: under reduced motion it is a
          // single frame, not a ripple.
          n.pulse = reduced ? 0 : Math.max(0, n.pulse - dt / 520);
          motion = 1;
        }
      }

      const introT = revealStartRef.current ? now - revealStartRef.current : Infinity;
      // The sweep's own clock. It starts where the scene is legible, not where
      // the fade begins — see SWEEP_AT.
      if (!reduced && sweepStartRef.current === 0 && revealStartRef.current && st.reveal.current >= SWEEP_AT) {
        sweepStartRef.current = now;
      }
      const introRunning = !reduced && introT < introEnd;
      /* THE SWEEP'S OWN CLOCK, AND ITS OWN END.
       *
       * `l.draw` used to be gated on `introRunning` — a wall-clock window —
       * while the value is only written on frames that actually execute. Any
       * frame gap during the entrance (a GC, an alt-tab, a backgrounded tab)
       * therefore closed the window with the schedule part-way through, and the
       * generic `settle(dt, DUR.slow)` exponential a few lines below took over a
       * value it had never been asked to carry: traced headed at 1440×900, the
       * window shut at introT 1067 with 6 of 47 links complete and min(draw)
       * 0.367, and the last link reached 1.0 at introT 1933 — 1567ms after the
       * sweep armed, against the 640ms this file has been tuning for three
       * rounds, on a completely different curve. The comment below documents
       * that failure as fixed; it was latent, not fixed.
       *
       * So the schedule owns the value from the frame it arms to the frame it
       * finishes, measured on its own elapsed time, and it ENDS AT 1 rather than
       * handing a partial value to a different easing. `sweepDoneRef` is a ref
       * for the same reason `sweepStartRef` is: a local would reset if this
       * effect were ever rebuilt mid-entrance and re-run the whole sweep. */
      const swept = sweepStartRef.current ? now - sweepStartRef.current : -1;
      const sweepOwns = !reduced && swept >= 0 && !sweepDoneRef.current;
      const sweepFinishing = sweepOwns && swept > DRAW_SPAN + DRAW_DUR;
      introDebugRef.current = {
        t: Math.round(introT),
        running: introRunning,
        starts: linkStart ? linkStart.size : 0,
        reveal: +st.reveal.current.toFixed(3),
        warm: warmRef.current,
        sweepAt: sweepStartRef.current ? Math.round(sweepStartRef.current - revealStartRef.current) : 0,
        /** Published so "the schedule finished the schedule" is measurable from
         *  outside rather than asserted in a comment for a fourth round. */
        sweepOwns,
        sweepDone: sweepDoneRef.current,
      };

      for (const l of links) {
        const bothVisible =
          st.visible.has(l.source.id) && st.visible.has(l.target.id) && st.visibleEdgeTypes.has(l.type);
        const want = bothVisible ? 1 : 0;
        const dDraw = (want - l.draw) * eBase;
        l.draw += dDraw;
        track(dDraw);
        // Before the sweep starts there are no lines. The eased draw above must
        // not be allowed to quietly complete them behind the curtain — the
        // schedule would then engage against links that are already finished and
        // the whole mesh would arrive in one frame — and it must not half-draw
        // them into the fade either, which is what made the first wave
        // indistinguishable from the reveal itself.
        if (!reduced && sweepStartRef.current === 0) l.draw = 0;
        else if (sweepOwns && want > 0) {
          // Explicit entrance timeline: the mesh grows outward from the hub,
          // nearest midpoint first, instead of every line easing up together
          // under the fade. It runs while the camera is still flying, so the
          // mesh is visibly growing rather than arriving after everything stops.
          if (!linkStart) linkStart = buildLinkStart(sweepStartRef.current - revealStartRef.current);
          const startAt = linkStart.get(l.id) ?? 0;
          // Past the schedule's own span every line is finished, whatever the
          // frames did in between — see the sweep clock above.
          const p = sweepFinishing ? 1 : Math.max(0, Math.min(1, (swept - startAt) / DRAW_DUR));
          /* Assign, do not cap.
             `Math.min` here let the schedule hold a line back and never let it
             go: the value itself was still the generic DUR.slow exponential
             above, which needs ~550ms to climb to 0.98 and was pushed back down
             every frame the cap bit. Measured on the production preview, the
             last link finished 1967ms after the sweep armed against the 640ms
             DRAW_SPAN + DRAW_DUR this file has been tuning for three rounds —
             so for a full second after the curtain was gone every relationship
             was still creeping its last few per cent into the disc it belongs
             to. During the sweep the schedule owns the value outright; the
             exponential is left to the filter-driven changes it was written
             for. */
          l.draw = EASE_OUT(p);
          if (p < 1) motion = 1;
        } else if (reduced && want > 0 && l.draw > 0.2) {
          l.draw = 1;
        }
        const onPath = st.pathLinkIds?.has(l.id) ?? false;
        const tracing = (st.pathLinkIds?.size ?? 0) > 0;
        const touching = anchorId != null && (l.source.id === anchorId || l.target.id === anchorId);
        const isActive = activeLink != null && l.id === activeLink.id;
        const wantFocus = activeLink ? (isActive ? 1 : 0) : tracing ? (onPath ? 1 : 0) : touching ? 1 : 0;
        const wantDim = !bothVisible
          ? 1
          : activeLink
            ? isActive
              ? 0
              : 1
            : (tracing ? !onPath : anchorId != null && !touching)
              ? 1
              : 0;
        const dLF = (wantFocus - l.focus) * eFocus;
        const dLD = (wantDim - l.dim) * eFocus;
        l.focus += dLF;
        l.dim += dLD;
        track(dLF);
        track(dLD);
        if (l.focus > 0.02 && flowing) {
          l.flow += dt * 0.028;
          if (l.dashed) motion = 1;
        }
      }
      // Latched after the pass that finished it, so the terminal frame is the
      // one that writes 1 and every frame after it belongs to the exponential
      // again. Latching before would hand the exponential a partial value,
      // which is the whole defect.
      if (sweepFinishing) {
        sweepDoneRef.current = true;
        /* …and the entrance is over. Announced once, because the chrome waits
           for it: the whole choreography — the fade, then the bearing-ordered
           sweep — is delivered on a budget the chrome's own entrance was
           collapsing. See chromeReady in App.tsx for the ablation. */
        onEntranceDoneRef.current?.();
      }

      // camera: an explicit tween on the same curve the DOM uses, so the
      // viewport has a defined start and a soft landing instead of chasing.
      const v = viewRef.current;
      const tw = tweenRef.current;
      if (tw) {
        const p = tw.dur <= 0 ? 1 : Math.min(1, (now - tw.t0) / tw.dur);
        const e = EASE_OUT(p);
        v.x = tw.from.x + (tw.to.x - tw.from.x) * e;
        v.y = tw.from.y + (tw.to.y - tw.from.y) * e;
        v.k = tw.from.k + (tw.to.k - tw.from.k) * e;
        if (p >= 1) tweenRef.current = null;
        onViewChange?.({ ...v });
        motion = 1;
      }

      // Self-heal the frame. A fit is only ever as good as the arrangement that
      // existed when it was asked for, and several things move afterwards: the
      // cold row forms, the chrome's insets change as panels open, a filter
      // drops half the cast. Rather than try to enumerate every trigger, check
      // the actual outcome once the graph is at rest — if a visible person is
      // outside the uncovered rectangle, frame it again. Twice per arrangement,
      // never once the reader has taken the camera themselves.
      if (
        !readerCamRef.current &&
        !tweenRef.current &&
        restRef.current &&
        now > camLockRef.current &&
        healRef.current.left > 0 &&
        now - healRef.current.at > 1200
      ) {
        healRef.current.at = now;
        const ins = insetsRef.current;
        const { w: sw, h: sh } = sizeRef.current;
        /* EVERYONE, dossier or no dossier.
           This used to narrow to the selected person with a panel open, because
           the only correction available was a whole-graph fit() and issuing one
           to fix a single clipped node produced a measured 30% zoom-out after
           every click. The correction is now the same focus-leaning fit the
           click itself used (see reframe), so checking all twenty cannot drag
           the camera off the open person — and NOT checking them is what let
           곽범 sit under the panel and the cold band hang off the bottom edge for
           four rounds with nothing in the loop noticing. */
        const watch = nodes;
        let outside = false;
        for (const n of watch) {
          if (!st.visible.has(n.id)) continue;
          const nx = n.x * v.k + v.x;
          const ny = n.y * v.k + v.y;
          const lx = labelExtent.get(n);
          const nr = n.radius * v.k + 6;
          const padL = Math.max(nr, lx?.left ?? 0);
          const padR = Math.max(nr, lx?.right ?? 0);
          if (nx - padL < ins.left || nx + padR > sw - ins.right || ny - nr < ins.top || ny + nr > sh - ins.bottom) {
            outside = true;
            break;
          }
        }
        if (outside) {
          const before = { ...v };
          // The same move the click made, at the nudge duration: a correction is
          // not a second transition. It leans on whoever is open, so a heal with
          // a dossier up re-frames the cast WITHOUT taking the camera off them.
          reframeRef.current(DUR.base);
          // reframe may have set a tween just now; the guard above narrowed the
          // ref to null, so re-widen it rather than read a stale narrowing.
          const to = (tweenRef.current as Tween | null)?.to;
          // Only spend a retry when the frame actually changed. A heal that
          // lands where the camera already is has not corrected anything, and
          // consuming a life for it is how the phone build ran out of retries
          // before the cold row had even formed.
          const moved =
            to != null &&
            (Math.abs(to.k - before.k) / Math.max(0.001, before.k) > 0.01 ||
              Math.abs(to.x - before.x) > 4 ||
              Math.abs(to.y - before.y) > 4);
          if (moved) healRef.current.left--;
          else tweenRef.current = null;
        }
      }

      /* …the arrangement being LEFT, on its way out. Computed before the
         incoming ramp because the incoming ramp now reads it — see
         REGION_CROSS. */
      let exitAlpha = 0;
      if (exitClustersRef.current.length) {
        const p = Math.min(1, (now - exitAtRef.current) / REGION_EXIT_MS);
        exitAlpha = 1 - EASE_IN_OUT(p);
        if (p >= 1 || reduced) {
          exitClustersRef.current = [];
          exitAlpha = 0;
        } else motion = 1;
      }

      /* The regions, on the cast's clock rather than on a stopwatch. See
         anchorErr0Ref. The clock is the ceiling, arrival is the driver, and
         `rest` closes it out so a residual millimetre cannot hold a caption at
         0.99 forever. */
      let regionAlpha = 1;
      if (anchoredRef.current && !reduced) {
        const clock = EASE_OUT(Math.min(1, (now - regionInStartRef.current) / DUR.cine));
        const e0 = anchorErr0Ref.current;
        let arrived = 1;
        if (e0 > 1 && !restRef.current) {
          let sum = 0;
          for (const n of nodes) sum += Math.hypot(n.ax - n.x, n.ay - n.y);
          arrived = 1 - sum / nodes.length / e0;
        }
        /* THE CROSSING. See REGION_CROSS.
         *
         * Arrival is the right driver for the ramp and the wrong one for the
         * handover, because arrival is measured from a standing start: traced
         * per frame across web → by-season, the incoming set was 0.052 a
         * hundred milliseconds after its ramp opened and 0.667 a hundred and
         * thirty after that. Starting that ramp earlier moves the clock and
         * does nothing to arrival, so it alone cannot put anything on screen
         * during the window the outgoing rings are leaving.
         *
         * So while — and only while — something is still leaving, the incoming
         * set is allowed up on the clock alone, to a cap. At the cap it is
         * plainly provisional: a third of an ellipse is a promise, not a claim
         * that the circle is full, which is the thing the arrival gate exists
         * to prevent. The moment the outgoing set is gone the gate resumes, and
         * the ratchet on regionAlphaRef means the provisional value can only be
         * built on, never fallen back from. */
        const provisional = exitAlpha > 0 ? Math.min(clock, REGION_CROSS_CAP) : 0;
        regionAlpha = Math.max(regionAlphaRef.current, provisional, Math.min(clock, Math.max(0, arrived)));
        track(regionAlpha - regionAlphaRef.current);
        regionAlphaRef.current = regionAlpha;
      } else if (reduced) {
        regionAlphaRef.current = 1;
      } else {
        /* A free layout has no arrival to key off — the cold band is a caption
           on the graph as it stands — so it comes up on the clock alone, once
           anything that had to leave has left. It ratchets from wherever it
           already was, which for every reason this code runs other than a mode
           change is 1: the band must not blink because somebody was selected. */
        regionAlpha = Math.max(
          regionAlphaRef.current,
          EASE_OUT(Math.max(0, Math.min(1, (now - regionInStartRef.current) / DUR.base))),
        );
        track(regionAlpha - regionAlphaRef.current);
        regionAlphaRef.current = regionAlpha;
      }

      /* Which of the two sets holds the slot this frame, and how present it is.
       *
       * The slot changes hands where the two ramps CROSS, not where the
       * outgoing one reaches zero. Under the old rule the outgoing set kept the
       * slot for its whole 240ms — including the tail where it is a hairline at
       * 2% — and the incoming set inherited it at 0, so the painted region alpha
       * traced a V straight through the floor: measured per frame on web →
       * by-season, outgoing 0.128 at 239ms and incoming 0.052 at 339ms, i.e.
       * about 150ms in which the twenty people travelling furthest had nothing
       * to be read against.
       *
       * `max` of the two is the whole of the fix on the painting side: whichever
       * set is on screen, it is on screen at the higher of the two ramps, so the
       * handover has a floor at the crossing value instead of a hole. Painting
       * BOTH sets in one pass — the outgoing rings dissolving *inside* the
       * incoming ones — needs a per-cluster alpha, which is render.ts's to give.
       * See the HANDOFF note on REGION_CROSS. */
      const regionPainted = Math.max(exitAlpha, regionAlpha);
      const exitHoldsSlot = exitAlpha > regionAlpha;
      regionPaintedRef.current = regionPainted;

      // Reduced-motion mode changes teleport, so the scene dissolves instead.
      let fade = 1;
      if (modeFadeRef.current) {
        const p = Math.min(1, (now - modeFadeRef.current) / DUR.base);
        fade = 0.35 + 0.65 * EASE_OUT(p);
        if (p >= 1) modeFadeRef.current = 0;
        motion = 1;
      }
      /* Repaint for the curtain only while the curtain is both moving AND
         visible. `reveal < 1` alone forced a full repaint every frame for the
         whole 4.5s cold open, during which the canvas sat at alpha 0 behind an
         opaque overlay: three full-viewport gradients, the entire label
         collision solve and 40+ fillText calls per frame, for nothing. Measured
         median frame time over that window was 66.6ms — 15fps — against 16.7ms
         once the intro was gone. */
      if (st.reveal.current > 0.0001 && st.reveal.current < 1) motion = 1;

      // Nothing to paint into.
      if (typeof document !== 'undefined' && document.hidden) return;

      /* …and nothing to paint. Before the curtain starts moving, the canvas is
         behind the opaque cold open: the simulation is settling, so `motion` is
         live every frame and the loop would otherwise repaint the backdrop —
         three full-viewport gradients — 30+ times for a surface nobody can see.
         One paint per wake keeps the buffer valid; the rest are refused until
         the reveal actually begins.

         The exception is the warm pass (see fontsReadyRef): WARM_PASSES full
         scene renders, once the metrics they would cache are the real ones and
         the mount's framing tween has landed, so the frame that lifts the
         curtain is not also the frame that compiles the painter. */
      let warming = false;
      if (st.reveal.current <= 0.0001) {
        /* WHAT THE WARM PASS IS ALLOWED TO WAIT FOR: real font metrics and a
         * real canvas. NOT the camera.
         *
         * `!tweenRef.current` was in this condition for three rounds and it is
         * the whole of the early-ENTER blocker. The warm pass exists to compile
         * the label solve, the measureText cache and the plate ladder, none of
         * which care where the camera is — and the mount's own frameArrival
         * issues a DUR.cine tween, every `sizeVersion` bump re-issues one, and
         * the debounced refit issues another, so the condition it was gated on
         * is false for seconds. Measured on the production preview at
         * 1600×1000: document.fonts.ready resolved at 39/49/702ms while the
         * tween was live until 2526/3196/3255ms and the third warm pass
         * therefore did not land until 3309/3562/6738ms. A reader pressing
         * ENTER at 600–1700ms — which is what the CTA at 1400ms invites —
         * started the curtain against an uncompiled painter and got the whole
         * 1.3s entrance in 2–3 frames.
         *
         * The camera is not ignored, it is READ: a warm pass paints at the
         * tween's destination (see warmView below), so the plate ladder is
         * baked at the rung the reader will actually be looking at rather than
         * at whatever rung the camera happened to be passing through.
         *
         * The fonts gate stays, because a pass measured against the fallback
         * face caches the wrong advances — but it gets a deadline. A font that
         * has not arrived in FONTS_WAIT_MS is a font the entrance cannot keep
         * waiting for; warming against fallback metrics is strictly better than
         * not warming at all. */
        const warmable =
          sizeRef.current.w > 2 && (fontsReadyRef.current || now - mountAtRef.current > FONTS_WAIT_MS);
        if (warmable && warmRef.current < WARM_PASSES) {
          warmRef.current++;
          warming = true;
          // Announced on the frame the last pass runs, so App can hold the
          // curtain until the painter is compiled rather than guess at a delay.
          if (warmRef.current >= WARM_PASSES) onWarmRef.current?.();
        } else if (lastPaintRef.current !== 0) return;
      }

      /* WHAT SCALE THIS FRAME IS PAINTED AT. See REVEAL_DPR.
       *
       * The backing store is resized here rather than in the ResizeObserver
       * because it is the reveal that decides it, and the reveal is a
       * per-frame quantity. The CSS box is untouched — only the number of
       * device pixels behind it changes — so nothing reflows and no other
       * measurement in this file moves.
       *
       * The last warm pass runs at the reveal's scale so the plate ladder has
       * both rungs baked before anybody can see either of them; the earlier
       * ones stay at the app's scale, which is the rung the frame at reveal 1
       * and every frame after it will ask for. */
      const wantDpr =
        st.reveal.current >= 1 || (warming && warmRef.current < WARM_PASSES)
          ? sizeRef.current.dpr
          : Math.min(REVEAL_DPR, sizeRef.current.dpr);
      const wantW = Math.round(sizeRef.current.w * wantDpr);
      const wantH = Math.round(sizeRef.current.h * wantDpr);
      /* The frame that changes scale MUST paint. On the frame `reveal` lands on
         exactly 1 the curtain's own `motion = 1` no longer fires (it is gated on
         `< 1`), so without this the canvas could sit at half scale until the
         next thing that happens to wake the loop — which on a cold open with the
         pointer off the graph is the 2000ms floor. */
      const rescaling = cv.width !== wantW || cv.height !== wantH;
      if (rescaling) motion = 1;

      /* A picture that is not changing does not need repainting. The floor is
         a self-heal for any state change the deltas above failed to notice, not
         an animation clock: the backdrop bloom's own period is ~90s, so 480ms
         was buying nine full-viewport repaints every four seconds to advance a
         drift nobody can see.
         ── and once the graph is at rest, the floor has no job left. ───────
         It used to be dropped only under reduced motion. Instrumented over ten
         idle seconds on the production build, everybody else was paying five
         full-canvas clears at gaps of 2016/2016/2001/2016ms — two full-viewport
         re-rasters, the whole label collision solve and 40+ fillText calls,
         indefinitely, on a page a reader is likely to leave open — to advance a
         bloom whose period is ~90s and which this same comment already argues is
         invisible at a quarter of that interval. If the drift cannot be seen at
         480ms it cannot be seen at 2000ms either.
         Every wake-up that matters is already wired: onPortraitLoad and the
         ResizeObserver clear `lastPaintRef`, every pointer and state change
         drives `motion`, and the visibilitychange listener below clears
         `lastPaintRef` when the tab comes back — a backgrounded tab is the one
         case where the buffer can be discarded under us. */
      const rested = restRef.current && st.reveal.current >= 1;
      const floor = rested ? Infinity : 2000;
      const idle = motion < 0.0008 && now - lastPaintRef.current < floor;
      if (idle && !warming) return;
      lastPaintRef.current = now;
      if (rescaling) {
        cv.width = wantW;
        cv.height = wantH;
      }

      const frame = {
        nodes,
        links,
        // The scaffolding of the arrangement being left holds the slot until the
        // incoming ramp overtakes it — see exitClustersRef and REGION_CROSS.
        // Nothing else reads this field; bounds() and the fit are on clustersRef
        // either way.
        clusters: exitHoldsSlot ? exitClustersRef.current : clustersRef.current,
        /* A warm pass paints where the camera is GOING, not where it is.
           The pass is a compilation, and what it compiles — the plate ladder's
           rung, the label solve, the measureText cache — is keyed on the scale
           and the seats the reader will actually be shown. Warming at a k the
           mount tween is merely passing through bakes the wrong rung and the
           frame that lifts the curtain pays for it anyway. Nobody sees this
           frame: it is drawn at alpha 0.02 under an opaque cold open. */
        view: warming ? tweenRef.current?.to ?? v : v,
        // Where the camera is going, so the label solver can assign slots once
        // against the destination instead of re-solving against a picture that
        // is different every frame of a mode change.
        viewTo: tweenRef.current?.to ?? v,
        width: sizeRef.current.w,
        height: sizeRef.current.h,
        dpr: wantDpr,
        insets: insetsRef.current,
        time: now,
        hoverId: st.hoverId,
        selectedId: st.selectedId,
        // Same gate as anchorId: the dotted cursor ring is the visible half of
        // the keyboard focus, so it is drawn exactly when that focus is shown.
        cursorId: st.kbdRing ? st.kbdId : null,
        /* A WARM PASS PAINTS AT FULL ALPHA — see the clear below.
         *
         * It used to paint at 0.02, just clear of render()'s own
         * `sceneAlpha <= 0.01` early-out, so that a pass under an opaque
         * curtain could not become a visible pixel. That is exactly what
         * starved it. drawLabels culls on `vis = appear × sceneAlpha × zoomFade`
         * and drops anything at or under 0.12, so at 0.02 EVERY caption was
         * dropped as `too-small` and the pass compiled the geometry solve, the
         * plate ladder and the link pass while never once shaping a glyph,
         * measuring a name or striking a caption. The type was still cold when
         * the curtain lifted.
         *
         * Measured with performance marks on the production preview at
         * 1600×1000, ENTER at 4600ms: the first frame of the fade spent
         * 172/238/386ms inside render(), and every frame after it 3–32ms. That
         * one frame IS the "reveal delivered in a handful of frames" defect —
         * the arming chain around it (startReveal → effect → forced fit) marks
         * out at under 1ms.
         *
         * So the pass runs at the alpha the reader will actually see, and the
         * frame is thrown away before anything can composite it. */
        reveal: warming ? 1 : st.reveal.current * fade,
        // The regions are the scaffolding of the arrangement the nodes are
        // flying to, so they complete as the last person seats — computed
        // above. In web there are no anchored regions and the cold band is a
        // caption on the graph as it stands, so it is on. During a handover this
        // is the higher of the two ramps, so the scaffolding never dips below
        // the value at which they cross — see regionPainted.
        regionAlpha: regionPainted,
        // The anchored modes speak two languages at once — regions and
        // relationships — so the painter attenuates the second one, and they
        // name everybody, because "who is in this set" is the whole question
        // they exist to answer.
        anchored: anchoredRef.current && anchorTargetRef.current > 0.01,
        settling: !restRef.current,
        rings: st.mode === 'orbit' ? ringsRef.current : null,
        empty: nodes.length > 0 && st.visible.size === 0,
        showLabels: st.showLabels,
        lang: st.lang,
        activeLinkId: st.pinnedLinkId ?? st.hoverLinkId,
        activeLinkPinned: st.pinnedLinkId != null,
        strings: st.canvasStrings,
        reducedMotion: reduced,
      };

      /* The static layer first, and only when it has actually gone stale — and
       * NOT AT ALL WHILE THE CURTAIN IS COMING UP.
       *
       * The reveal is the only moment in the app where three full-viewport
       * surfaces are live at once: this canvas, the scene canvas over it, and
       * the intro's own opaque overlay over both. At dpr 2 on a 1440×900 frame
       * each canvas is a 10.4MB texture, and a repaint here is a re-upload of
       * the whole thing. Measured across the reveal window on the production
       * build, that showed up as GPUTask blocks of 55–103ms and rAF gaps up to
       * 850ms, i.e. the 1.3s entrance delivered in as few as two frames.
       *
       * `renderBackdrop`'s own staleness test does not save us: the bloom is
       * anchored to the graph's centre of mass, and `massCentre` weights each
       * node by `n.appear` — which is exactly what is ramping during the
       * entrance — so the centre moves every frame of it and the layer repaints
       * every frame of it. Nothing of that is visible: the picture is a
       * gradient, a 0.085-alpha bloom and a vignette, under a scene that is
       * itself fading up under an opaque curtain.
       *
       * So it is painted once — by the warm pass, behind the curtain, where
       * this is the only pass that runs — and then held frozen until the fade
       * is over. `backdropPaintedRef` is the "held frozen" half; it is cleared
       * only when the canvas is genuinely blank (a resize sets `width`, which
       * clears it), so a resize mid-reveal still gets its one paint. */
      if (bctx && (st.reveal.current >= 1 || !backdropPaintedRef.current)) {
        renderBackdrop(bctx, frame);
        backdropPaintedRef.current = true;
      }
      render(ctx, frame);
      /* …and the warm frame is erased before it can be seen.
       *
       * Compositing happens after every rAF callback has returned, so a buffer
       * filled and cleared inside one callback is never on screen — on any
       * display, under a curtain or not. That last part is what makes this
       * safe where a low alpha was not: a deep link has no cold open at all,
       * and the three warm passes there used to be the only thing between a
       * blank canvas and the reveal. The backdrop layer is a different canvas
       * and is deliberately NOT cleared: its single paint is the one this pass
       * exists to bank. */
      if (warming) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [nodes, links, adjacency, onViewChange, applyAnchors, viewRect]);

  /* ── hit testing + pointer ───────────────────────────────────────────── */
  const toWorld = useCallback((cx: number, cy: number) => {
    const v = viewRef.current;
    return { x: (cx - v.x) / v.k, y: (cy - v.y) / v.k };
  }, []);

  const pick = useCallback(
    (cx: number, cy: number): GNode | null => {
      const p = toWorld(cx, cy);
      let best: GNode | null = null;
      let bestD = Infinity;
      for (const n of nodes) {
        if (!stateRef.current.visible.has(n.id)) continue;
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        const hit = n.radius + 9 / viewRef.current.k;
        if (d < hit && d < bestD) {
          bestD = d;
          best = n;
        }
      }
      return best;
    },
    [nodes, toWorld],
  );

  /** Perpendicular distance from a point to a segment, in screen pixels. */
  function distToSeg(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const t = len2 <= 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
  }

  /**
   * Hit-test the relationships.
   *
   * The links are quadratics, so each visible one is flattened into a handful
   * of straight runs in *screen* space — the tolerance is a pointer tolerance
   * and has to be constant in pixels, not in world units — and the nearest
   * within HIT_PX wins. Where several lines overlap, the closest one wins,
   * which is the answer the cursor is pointing at.
   */
  const HIT_PX = 8;
  const pickLink = useCallback(
    (cx: number, cy: number): GLink | null => {
      const v = viewRef.current;
      const st = stateRef.current;
      let best: GLink | null = null;
      let bestD = HIT_PX;
      for (const l of links) {
        if (l.draw < 0.5 || l.dim > 0.9) continue;
        if (!st.visible.has(l.source.id) || !st.visible.has(l.target.id)) continue;
        if (!st.visibleEdgeTypes.has(l.type)) continue;
        // Same control point the painter derives in render.ts::linkPath.
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = l.curve * Math.min(len * 0.24, 90);
        const qwx = l.source.x + dx / 2 + (-dy / len) * off;
        const qwy = l.source.y + dy / 2 + (dx / len) * off;
        const ax = l.source.x * v.k + v.x;
        const ay = l.source.y * v.k + v.y;
        const bx = l.target.x * v.k + v.x;
        const by = l.target.y * v.k + v.y;
        const qx = qwx * v.k + v.x;
        const qy = qwy * v.k + v.y;
        if (
          cx < Math.min(ax, bx, qx) - HIT_PX ||
          cx > Math.max(ax, bx, qx) + HIT_PX ||
          cy < Math.min(ay, by, qy) - HIT_PX ||
          cy > Math.max(ay, by, qy) + HIT_PX
        )
          continue;
        const N = 12;
        let px = ax;
        let py = ay;
        for (let i = 1; i <= N; i++) {
          const t = i / N;
          const u = 1 - t;
          const nx = u * u * ax + 2 * u * t * qx + t * t * bx;
          const ny = u * u * ay + 2 * u * t * qy + t * t * by;
          const d = distToSeg(cx, cy, px, py, nx, ny);
          if (d < bestD) {
            bestD = d;
            best = l;
          }
          px = nx;
          py = ny;
        }
      }
      return best;
    },
    [links],
  );

  const localPoint = (e: PointerEvent | WheelEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  /** Client coords of a link's midpoint — where a pinned readout anchors. */
  const linkAnchor = useCallback((l: GLink) => {
    const v = viewRef.current;
    const r = canvasRef.current?.getBoundingClientRect();
    const dx = l.target.x - l.source.x;
    const dy = l.target.y - l.source.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = l.curve * Math.min(len * 0.24, 90);
    const qx = l.source.x + dx / 2 + (-dy / len) * off;
    const qy = l.source.y + dy / 2 + (dx / len) * off;
    const mx = 0.25 * l.source.x + 0.5 * qx + 0.25 * l.target.x;
    const my = 0.25 * l.source.y + 0.5 * qy + 0.25 * l.target.y;
    return { x: mx * v.k + v.x + (r?.left ?? 0), y: my * v.k + v.y + (r?.top ?? 0) };
  }, []);
  linkAnchorRef.current = linkAnchor;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const pointers = pointersRef.current;

    const wake = () => {
      restRef.current = false;
      lastPaintRef.current = 0;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic or already-released pointer */
      }
      const p = localPoint(e);
      pointers.set(e.pointerId, p);
      wake();

      if (pointers.size >= 2) {
        // Second finger down: this is a pinch, not a drag.
        const d = dragRef.current;
        if (d?.node) {
          d.node.fx = null;
          d.node.fy = null;
        }
        dragRef.current = null;
        const [a, b] = [...pointers.values()];
        pinchRef.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        };
        tweenRef.current = null;
        return;
      }

      const n = pick(p.x, p.y);
      dragRef.current = { node: n, px: p.x, py: p.y, ox: p.x, oy: p.y, panning: !n, moved: 0 };
      tweenRef.current = null;
      if (n) {
        simRef.current?.alphaTarget(0.22);
        n.fx = n.x;
        n.fy = n.y;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = localPoint(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);

      const pinch = pinchRef.current;
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const v = viewRef.current;
        const k = Math.max(minZoom(), Math.min(MAX_K, v.k * (dist / pinch.dist)));
        // Keep the world point under the previous midpoint under the new one:
        // that gives pinch-zoom and two-finger pan in one expression.
        const wx = (pinch.mx - v.x) / v.k;
        const wy = (pinch.my - v.y) / v.k;
        v.k = k;
        v.x = mx - wx * k;
        v.y = my - wy * k;
        pinchRef.current = { dist, mx, my };
        userCamRef.current = true;
        readerCamRef.current = true;
        onViewChange?.({ ...v });
        wake();
        return;
      }

      const d = dragRef.current;
      if (d) {
        const dx = p.x - d.px;
        const dy = p.y - d.py;
        d.moved += Math.abs(dx) + Math.abs(dy);
        d.px = p.x;
        d.py = p.y;
        if (d.node) {
          const w = toWorld(p.x, p.y);
          d.node.fx = w.x;
          d.node.fy = w.y;
          simRef.current?.alpha(0.32);
          wake();
        } else if (d.panning) {
          viewRef.current.x += dx;
          viewRef.current.y += dy;
          clampPan(viewRef.current);
          userCamRef.current = true;
          readerCamRef.current = true;
          wake();
        }
        return;
      }
      // Nodes win ties: a pointer over a disc is a node hover, never a link
      // hover, even where an edge passes under the disc.
      const n = pick(p.x, p.y);
      const id = n?.id ?? null;
      const st = stateRef.current;
      const link = n ? null : pickLink(p.x, p.y);
      const linkId = link?.id ?? null;
      if (id !== st.hoverId) {
        onHover(id);
        wake();
      }
      if (linkId !== st.hoverLinkId) {
        setHoverLinkId(linkId);
        hoverFromPointerRef.current = linkId != null;
        onLinkHoverRef.current?.(linkId);
        wake();
      }
      if (!st.pinnedLinkId && link) setLinkPointer({ x: e.clientX, y: e.clientY });
      cv.style.cursor = id || linkId ? 'pointer' : 'grab';
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchRef.current = null;
      const d = dragRef.current;
      dragRef.current = null;
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      if (!d) return;
      const sim = simRef.current;
      sim?.alphaTarget(0);
      if (d.node) {
        d.node.fx = null;
        d.node.fy = null;
      }
      // A short press with almost no movement is a click, not a drag. The
      // measure is straight-line displacement from where the finger went down,
      // not the accumulated path length — a monotonically growing Manhattan sum
      // meant a slow deliberate tap failed more often than a fast one, and 5px
      // is inside the jitter of a real touch.
      const slop = e.pointerType === 'touch' ? 16 : 10;
      if (Math.hypot(d.px - d.ox, d.py - d.oy) < slop) {
        const p = localPoint(e);
        const n = pick(p.x, p.y);
        const st = stateRef.current;
        if (n) {
          n.pulse = 1;
          if (st.pinnedLinkId) onPinLinkRef.current(null);
          if (e.shiftKey && st.selectedId && st.selectedId !== n.id && st.onTraceTo) {
            lastTraceRef.current = n.id;
            st.onTraceTo(n.id);
          } else {
            onSelect(n.id === st.selectedId ? null : n.id);
          }
        } else {
          // A click on a line holds its readout open; a click on nothing lets
          // go of whatever was being held.
          const link = pickLink(p.x, p.y);
          if (link) {
            const next = st.pinnedLinkId === link.id ? null : link.id;
            setHoverLinkId(link.id);
            hoverFromPointerRef.current = true;
            if (next) setLinkPointer(linkAnchor(link));
            onPinLinkRef.current(next);
          } else if (st.pinnedLinkId) {
            onPinLinkRef.current(null);
          } else {
            onSelect(null);
          }
        }
      }
      cv.style.cursor = 'grab';
      wake();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = localPoint(e);
      const v = tweenRef.current?.to ?? viewRef.current;
      // trackpad pinch arrives as ctrlKey+wheel with small deltas
      const intensity = e.ctrlKey ? 0.012 : 0.0022;
      const k = Math.max(minZoom(), Math.min(MAX_K, v.k * Math.exp(-e.deltaY * intensity)));
      // A wheel is continuously retargeted, so it stays a short chase rather
      // than a tween that keeps restarting from zero velocity.
      setTween(
        {
          k,
          x: p.x - ((p.x - v.x) / v.k) * k,
          y: p.y - ((p.y - v.y) / v.k) * k,
        },
        DUR.fast,
      );
      if (tweenRef.current) clampPan(tweenRef.current.to);
      userCamRef.current = true;
      readerCamRef.current = true;
      wake();
    };

    const onLeave = () => {
      onHover(null);
      if (stateRef.current.hoverLinkId) {
        setHoverLinkId(null);
        hoverFromPointerRef.current = false;
        onLinkHoverRef.current?.(null);
      }
    };

    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);
    cv.addEventListener('pointerleave', onLeave);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.style.cursor = 'grab';
    return () => {
      cv.removeEventListener('pointerdown', onPointerDown);
      cv.removeEventListener('pointermove', onPointerMove);
      cv.removeEventListener('pointerup', onPointerUp);
      cv.removeEventListener('pointercancel', onPointerUp);
      cv.removeEventListener('pointerleave', onLeave);
      cv.removeEventListener('wheel', onWheel);
      pointers.clear();
      pinchRef.current = null;
    };
  }, [pick, pickLink, linkAnchor, clampPan, toWorld, onHover, onSelect, onViewChange, minZoom, setTween]);

  /* ── keyboard ────────────────────────────────────────────────────────────
     The graph is the content. Without this it does not exist for anyone who
     is not holding a mouse. */

  const visibleNodes = useMemo(
    () => nodes.filter((n) => visible.has(n.id)).sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, 'ko')),
    [nodes, visible],
  );

  /**
   * The sentence the cursor speaks. Deliberately the same one the sr-only <li>
   * for this node already holds — a screen-reader user who arrows across the
   * graph and one who tabs through the fallback list should not be given two
   * different descriptions of the same person.
   */
  const describeNode = useCallback(
    (n: GNode): string => {
      const primary = lang === 'en' ? n.labelEn : n.label;
      const secondary = lang === 'en' ? n.person.nameKo : n.person.nameEn;
      const role = lang === 'en' ? n.sublabelEn : n.sublabel;
      const deg = t(lang, n.degree === 1 ? 'canvas.srDegreeOne' : 'canvas.srDegree').replace(
        '{n}',
        String(n.degree),
      );
      return `${primary} ${secondary} — ${role}. ${deg}.`;
    },
    [lang],
  );

  const moveCursor = useCallback(
    (id: string | null) => {
      if (!id) return;
      setKbdId(id);
      restRef.current = false;
      lastPaintRef.current = 0;
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      /* Say where the cursor went.
       *
       * The canvas is role="application" with an sr-only node list and
       * aria-activedescendant, which is real intent — but activedescendant
       * alone announced nothing as the cursor moved, so arrowing across twenty
       * people was silent until you committed with Enter. That is navigation by
       * guesswork. The polite region below the canvas already existed for the
       * relationship readout; the cursor writes into the same one, so there is
       * one voice rather than two. */
      setAnnounce(describeNode(n));
      // Only chase if the node is outside the uncovered rectangle.
      const v = viewRef.current;
      const { vw, vh, cx, cy } = viewRect();
      const sx = n.x * v.k + v.x;
      const sy = n.y * v.k + v.y;
      const m = 48;
      if (sx < cx - vw / 2 + m || sx > cx + vw / 2 - m || sy < cy - vh / 2 + m || sy > cy + vh / 2 - m) {
        setTween({ k: v.k, x: cx - n.x * v.k, y: cy - n.y * v.k }, DUR.slow);
      }
    },
    [nodes, viewRect, setTween, describeNode],
  );

  /** Nearest visible node inside a 100° cone in the given screen direction. */
  const stepCursor = useCallback(
    (dx: number, dy: number) => {
      const from = visibleNodes.find((n) => n.id === kbdId) ?? visibleNodes[0];
      if (!from) return;
      const v = viewRef.current;
      let best: GNode | null = null;
      let bestScore = Infinity;
      for (const n of visibleNodes) {
        if (n === from) continue;
        const ox = (n.x - from.x) * v.k;
        const oy = (n.y - from.y) * v.k;
        const dist = Math.hypot(ox, oy) || 1;
        const along = (ox * dx + oy * dy) / dist;
        if (along < 0.62) continue; // outside the cone
        const score = dist / along;
        if (score < bestScore) {
          bestScore = score;
          best = n;
        }
      }
      if (best) moveCursor(best.id);
    },
    [visibleNodes, kbdId, moveCursor],
  );

  /** The relationship currently being read out, hovered or pinned. */
  const activeLinkId = pinnedLinkId ?? hoverLinkId;
  const activeLink = useMemo(
    () => (activeLinkId ? links.find((l) => l.id === activeLinkId) ?? null : null),
    [links, activeLinkId],
  );

  /** One spoken sentence for a line, in the reader's language. */
  const describeLink = useCallback(
    (l: GLink): string => {
      const txt = edgeText(l.edge, lang);
      const a = personName(l.source.person, lang).primary;
      const b = personName(l.target.person, lang).primary;
      const where =
        l.edge.season > 0
          ? `${t(lang, 'dossier.seasonPrefix')} ${l.edge.season}`
          : t(lang, 'common.outsideHouse');
      return `${a} — ${b}. ${EDGE_LABEL_I18N[lang][l.type]}, ${where}. ${txt.label}`;
    },
    [lang],
  );

  /* The active line's two ends in client coords. Read at render time from the
     live viewport, which is fine because the card re-renders on every pointer
     move anyway — and it is what lets the readout stand off its own subject. */
  const linkEnds = (() => {
    if (!activeLink) return null;
    const v = viewRef.current;
    const r = canvasRef.current?.getBoundingClientRect();
    const ox = r?.left ?? 0;
    const oy = r?.top ?? 0;
    return {
      ax: activeLink.source.x * v.k + v.x + ox,
      ay: activeLink.source.y * v.k + v.y + oy,
      bx: activeLink.target.x * v.k + v.x + ox,
      by: activeLink.target.y * v.k + v.y + oy,
    };
  })();

  const clearLink = useCallback(() => {
    onPinLinkRef.current(null);
    setHoverLinkId(null);
    hoverFromPointerRef.current = false;
    setAnnounce('');
    onLinkHoverRef.current?.(null);
    restRef.current = false;
    lastPaintRef.current = 0;
  }, []);

  /* Seat the readout on its own line, whoever pinned it.
   *
   * Every gesture in this file that pins a line also hands the card the line's
   * midpoint, because it has the link in hand. A pin that arrives as a PROP has
   * no gesture behind it — somebody opened `#tie=a~b~type` — and without this
   * the card would open against the initial {0,0} and be laid out against the
   * top-left corner of the window.
   *
   * Twice, because the first read is taken while the camera is still moving:
   * on a deep link the reveal's fit and any `p=` focus land inside the first
   * ~340ms, and the anchor is a projection through the live viewport. Both
   * writes go through a functional update that keeps the previous object when
   * the point has not actually moved, so the ordinary click path — which has
   * already set exactly this value — does not pay a re-render for it. */
  useEffect(() => {
    if (!pinnedLinkId) return;
    const l = links.find((x) => x.id === pinnedLinkId);
    if (!l) return;
    const seat = () => {
      const a = linkAnchor(l);
      setLinkPointer((p) => (Math.abs(p.x - a.x) < 0.5 && Math.abs(p.y - a.y) < 0.5 ? p : a));
    };
    seat();
    const t = window.setTimeout(seat, DUR.slow + 100);
    return () => window.clearTimeout(t);
  }, [pinnedLinkId, links, linkAnchor]);

  /* A pin let go of from outside has to take the highlight with it.
   *
   * `cycleLink` lights a line as well as pinning it, so the canvas shows what
   * the card is describing — but there is no pointer behind that highlight, and
   * `hoverLinkId` is otherwise only ever cleared by the pointer moving off. Back
   * out of a keyboard-pinned line therefore left the readout on screen, demoted
   * to an unpinned hover card for a line nobody was pointing at. Measured before
   * this: two E presses then two Backs ended on `card: hover, tie: null`.
   *
   * The test is provenance, not identity: an earlier attempt asked whether the
   * lit line was the one just unpinned, which is false as soon as the reader
   * has walked E past it — Back then landed on an older pin and left the newer
   * line still glowing. `hoverFromPointerRef` answers the question that is
   * actually being asked. */
  useEffect(() => {
    if (pinnedLinkId || hoverLinkId == null || hoverFromPointerRef.current) return;
    setHoverLinkId(null);
    onLinkHoverRef.current?.(null);
    restRef.current = false;
    lastPaintRef.current = 0;
  }, [pinnedLinkId, hoverLinkId]);

  /* Keyboard parity for the readout. With a person on the cursor or open in the
     dossier, E walks their relationships one at a time — each one lit on the
     canvas, pinned in the card and spoken into the live region — so the thing
     the mouse gets by pointing at a line is reachable without a mouse. */
  const cycleLink = useCallback(
    (dir: number) => {
      const anchor = kbdId ?? selectedId;
      const st = stateRef.current;
      const mine = links
        .filter(
          (l) =>
            (anchor == null || l.source.id === anchor || l.target.id === anchor) &&
            st.visible.has(l.source.id) &&
            st.visible.has(l.target.id) &&
            st.visibleEdgeTypes.has(l.type),
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      if (!mine.length) return;
      const at = mine.findIndex((l) => l.id === pinnedLinkId);
      const next = mine[(at + (at < 0 ? (dir > 0 ? 1 : 0) : dir) + mine.length * 2) % mine.length];
      setHoverLinkId(next.id);
      hoverFromPointerRef.current = false;
      setLinkPointer(linkAnchor(next));
      setAnnounce(describeLink(next));
      onPinLinkRef.current(next.id);
      restRef.current = false;
      lastPaintRef.current = 0;
    },
    [links, kbdId, selectedId, pinnedLinkId, linkAnchor, describeLink],
  );

  /* …and E has to work from wherever focus landed after the click that opened
     the person, which is inside the dossier. Pressing Enter on the canvas moves
     focus into the panel, so a canvas-only handler would make the shortcut
     unreachable on exactly the path a keyboard reader takes to get a selection.
     Guarded against text entry and against any open dialog, which owns its own
     keyboard. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
        return;
      // The palette, the gallery, the field guide and the cold open are modal
      // and own the keyboard while they are up — including the frame before
      // their input has taken focus, which is where a target-only guard leaks.
      if (document.querySelector('[aria-modal="true"]')) return;
      if (document.activeElement === canvasRef.current) return; // the canvas handler has it
      e.preventDefault();
      cycleLink(e.shiftKey ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycleLink]);

  /* Esc has to work whether the canvas or the dossier holds focus, so it is
     caught at the window in the capture phase and swallowed only when there is
     actually a pinned line to let go of. */
  useEffect(() => {
    if (!pinnedLinkId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      clearLink();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pinnedLinkId, clearLink]);

  const onCanvasKey = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const cur = kbdId ?? visibleNodes[0]?.id ?? null;
      /* Focus no longer plants the cursor (see onCanvasFocus), so the first
         navigation key does. It has to LAND before it steps, or the opening
         keystroke would silently skip whoever it started from — stepCursor
         measures a direction cone away from its origin and never selects it. */
      if (!kbdId && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        moveCursor(visibleNodes[0]?.id ?? null);
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        e.stopPropagation();
        cycleLink(e.shiftKey ? -1 : 1);
        return;
      }
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          stepCursor(1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepCursor(-1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          stepCursor(0, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          stepCursor(0, -1);
          break;
        case 'Home':
          e.preventDefault();
          moveCursor(visibleNodes[0]?.id ?? null);
          break;
        case 'End':
          e.preventDefault();
          moveCursor(visibleNodes[visibleNodes.length - 1]?.id ?? null);
          break;
        case 'Escape':
          if (pinnedLinkId) {
            e.preventDefault();
            e.stopPropagation();
            clearLink();
            return;
          }
          // The cursor is a dim anchor, and nothing but blur used to clear it:
          // click a node, press Escape, and the app cleared the selection and
          // the dossier while thirteen of twenty people stayed at ~12% opacity
          // around a node that was no longer selected. Clear it here, and only
          // swallow the key if there was something to clear.
          if (!kbdId) return;
          e.preventDefault();
          setKbdId(null);
          restRef.current = false;
          lastPaintRef.current = 0;
          break;
        case 'Enter':
        case ' ':
          if (!cur) return;
          e.preventDefault();
          if (e.shiftKey && selectedId && selectedId !== cur && onTraceTo) {
            lastTraceRef.current = cur;
            onTraceTo(cur);
          } else {
            const n = nodes.find((x) => x.id === cur);
            if (n) n.pulse = 1;
            /* Nothing is announced from here on purpose: Dossier.tsx owns a
             * polite region of its own that says "<name> — dossier opened ·
             * connections N" the moment it mounts, and two live regions saying
             * the same thing is worse than one. What is NOT announced — and
             * cannot be fixed from this file — is that opening it also moves
             * focus out of the canvas (Dossier.tsx:918 focuses its heading), so
             * the SHORTCUTS tab's documented "Enter, then Shift+Enter to trace"
             * fails as written. See the handoff. */
            onSelect(cur === selectedId ? null : cur);
          }
          break;
        default:
          return;
      }
    },
    [kbdId, visibleNodes, stepCursor, moveCursor, selectedId, onTraceTo, onSelect, nodes, cycleLink, pinnedLinkId, clearLink],
  );

  /**
   * Arriving is not navigating, so focus does not plant a cursor.
   *
   * It used to: `if (!kbdId) moveCursor(selectedId ?? visibleNodes[0]?.id)`.
   * The canvas carries tabIndex 0, so a mouse click on a node focuses it, and
   * Dossier's unmount cleanup focuses it back when the panel closes — neither
   * of those is the reader asking to stand on anybody. The consequence was the
   * only permanently-wrong state in the app: click a person, press Escape, and
   * the planted `kbdId` kept feeding `anchorId`, so sixteen of twenty people
   * stayed behind the focus dim with the dashed-link flow forcing a full-scene
   * repaint every frame — for the rest of the session, with no control on
   * screen that undid it. Measured on the mouse path before this change: 0.5
   * paints/s idle → 19.0 paints/s four seconds after Escape → 13.5 paints/s
   * fourteen seconds after Escape, `aria-activedescendant` still naming a node
   * the reader never navigated to.
   *
   * `:focus-visible` cannot decide it alone. Dossier.css:207-211 already
   * records the same discovery from the other side of the same handoff —
   * Chrome keeps the keyboard modality from earlier in the session, so the
   * focus a closing panel hands back after an Escape *does* match
   * `:focus-visible`, and gating on it would have fixed the click and left the
   * Escape. The cursor is planted by navigation instead (onCanvasKey), which is
   * the only signal that means what it says.
   *
   * One exception, and it costs nothing: with a person already selected, point
   * the cursor at them so `aria-activedescendant` names somebody true. That is
   * the same node `anchorId` resolves to via `sel` either way, so no pixel and
   * no repaint follows from it.
   */
  const onCanvasFocus = useCallback(
    (e: React.FocusEvent<HTMLCanvasElement>) => {
      let visibleRing = true;
      try {
        visibleRing = e.currentTarget.matches(':focus-visible');
      } catch {
        /* older engines: always show the ring */
      }
      setKbdRing(visibleRing);
      if (!kbdId && selectedId) moveCursor(selectedId);
    },
    [kbdId, moveCursor, selectedId],
  );

  const onCanvasBlur = useCallback(() => {
    setKbdRing(false);
    setKbdId(null);
    restRef.current = false;
  }, []);

  /** Everyone has been filtered out. The canvas says so; the escape line below
   *  is the only part of that message anybody can act on. */
  const isEmpty = nodes.length > 0 && visible.size === 0;

  return (
    <div ref={wrapRef} className="graph-wrap">
      {/* The static layer: base gradient, crimson bloom, vignette, film grain.
          None of it depends on the graph, and all of it is full-viewport, so
          keeping it on the scene canvas meant repainting ~6.4M pixels of
          unchanging picture on every frame a dashed edge marched its offset —
          116.7ms per frame with the pointer resting on a node. It is repainted
          only when the size, the graph's centre of mass or the bloom's own
          drift has actually moved; the compositor holds it the rest of the
          time. See renderBackdrop(). */}
      <canvas
        ref={backRef}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          display: 'block',
        }}
      />
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        tabIndex={0}
        role="application"
        aria-label={canvasStrings.graphLabel}
        aria-activedescendant={kbdId ? `gnode-${kbdId}` : undefined}
        style={{
          // Positioned so it stacks above the backdrop layer: an absolutely
          // positioned sibling would otherwise paint over a statically
          // positioned one whatever the document order says.
          position: 'relative',
          zIndex: 1,
          touchAction: 'none',
          outline: kbdRing ? '2px solid var(--brass)' : 'none',
          outlineOffset: '-3px',
        }}
        onKeyDown={onCanvasKey}
        onFocus={onCanvasFocus}
        onBlur={onCanvasBlur}
      >
        {/* Canvas fallback content: the graph, as a list, for assistive tech.
            aria-activedescendant above points into it as the cursor moves. */}
        {/* This list is the entire accessible representation of the graph, and
            it used to be Korean sentence fragments with a Hangul-first name and
            a Korean role line regardless of the UI language — so an English
            screen-reader user got twenty items of Hangul against a full English
            dataset the painter was already using. It follows `lang` now, like
            everything else the canvas emits. */}
        <ul style={SR_ONLY}>
          {visibleNodes.map((n) => (
            <li key={n.id} id={`gnode-${n.id}`}>
              {lang === 'en' ? n.labelEn : n.label} {lang === 'en' ? n.person.nameKo : n.person.nameEn} —{' '}
              {lang === 'en' ? n.sublabelEn : n.sublabel}.{' '}
              {/* Spoken, not seen, which is exactly why "1 connections" sat
                  here undisturbed. Korean does not inflect the counter, so
                  both halves of the pair hold the same template. */}
              {t(lang, n.degree === 1 ? 'canvas.srDegreeOne' : 'canvas.srDegree').replace(
                '{n}',
                String(n.degree),
              )}
              .
              {n.id === kbdId
                ? ` ${t(lang, 'canvas.srLinked')}: ${[...(adjacency.get(n.id) ?? [])]
                    .map((id) => {
                      const other = nodes.find((x) => x.id === id);
                      return other ? (lang === 'en' ? other.labelEn : other.label) : null;
                    })
                    .filter(Boolean)
                    .join(', ') || t(lang, 'canvas.srNone')}.`
                : ''}
            </li>
          ))}
        </ul>
      </canvas>

      {/* The escape hatch out of an empty graph.
          The canvas paints the empty state's mark and its two headings; this
          line is the one the reader has to be able to act on, so it is a real
          button rather than more canvas text — clickable, focusable, and
          announced. It is centred in the uncovered rect (the same rectangle
          drawEmptyState composes into) and dropped by the same offset the
          painter uses, so the block reads as one object.
          Typography mirrors the canvas: 12px, --font-sans, --ink-sub. */}
      {isEmpty ? (
        <div
          style={{
            position: 'absolute',
            left: insetsRef.current.left,
            right: insetsRef.current.right,
            top: insetsRef.current.top,
            bottom: insetsRef.current.bottom,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* A <span> rather than a disabled <button> when nothing is wired to
              it: a disabled control announces as "unavailable", which is a
              worse answer than plain prose for a reader who is already stuck. */}
          {onResetFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              style={{
                transform: `translateY(${EMPTY_HINT_DY - 6}px)`,
                pointerEvents: 'auto',
                font: '450 12px var(--font-sans)',
                color: 'var(--ink-sub)',
                background: 'transparent',
                border: '1px solid var(--glass-edge, rgba(255,255,255,0.12))',
                borderRadius: 'var(--rad-full)',
                padding: '7px 16px',
                cursor: 'pointer',
                transition: 'color var(--d-fast, 140ms) var(--ease-out)',
              }}
            >
              {canvasStrings.emptyHint.replace('{n}', String(nodes.length))}
            </button>
          ) : (
            <span
              style={{
                transform: `translateY(${EMPTY_HINT_DY}px)`,
                font: '450 12px var(--font-sans)',
                color: 'var(--ink-sub)',
              }}
            >
              {canvasStrings.emptyHint.replace('{n}', String(nodes.length))}
            </span>
          )}
        </div>
      ) : null}

      {/* The readout for a relationship. It is portalled to the body because
          .graph-wrap carries z-index: var(--z-graph) and therefore opens a
          stacking context the card could never climb out of — it would be
          painted under the rail and the dossier it is trying to spare the
          reader from opening. */}
      {typeof document !== 'undefined'
        ? createPortal(
            <EdgeCard
              link={activeLink}
              pinned={pinnedLinkId != null}
              pointer={linkPointer}
              insets={insetsRef.current}
              ends={linkEnds}
              onClear={clearLink}
            />,
            document.body,
          )
        : null}

      <p aria-live="polite" style={SR_ONLY}>
        {announce}
      </p>
    </div>
  );
}
