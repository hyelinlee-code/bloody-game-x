import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react';
import { lineageOf } from '../data/lineage';
import type { EdgeType } from '../data/types';
import type { GLink, GNode } from '../graph/types';
import { EDGE_COLOR } from '../graph/palette';
import {
  EDGE_LABEL_I18N,
  LINEAGE_LABEL_I18N,
  edgeText,
  personName,
  personOccupation,
  runFacts,
  t,
  type Lang,
} from '../data/i18n';
import { useLang } from '../state/useLang';
import { useWatched, type WatchedSet } from '../state/useWatched';
import { edges, isMeeting, tieCounts, tieTypeVisible } from '../data/edges';
import { people } from '../data/people';
import { monogram, monogramEn } from '../graph/build';
import type { SeasonNumber } from '../data/types';
import { ALL_EDGE_TYPES } from '../state/useAtlas';
import { PlateKey, Portrait, type PlateMarkKind, type PortraitConnection } from './Portrait';
import './HoverCard.css';
/* ALIASED, NOT TIDIED — the collision the header note in graph/build.ts
   predicted for this file, arriving.
   `watched(run)` from data/types answers "was this person present that season
   without competing", a fact about a RUN. The `watched` this file now holds is
   the reader's set of works, and both are live in `warmSubject`. The older,
   narrower one takes the suffix, exactly as it does in build.ts. Do not rename
   it back: `p.priorSeasons.some(watched)` beside a `WatchedSet` named `watched`
   is a type error today and a silently wrong answer the day the types line up. */
import { watched as watchedRun } from '../data/types';

export interface HoverCardProps {
  node: GNode | null;
  relations: { link: GLink; other: GNode }[];
  /** Viewport coordinates of the cursor. */
  pointer: { x: number; y: number };
  /** True while the dossier is open — the card would only be noise then. */
  suppressed: boolean;
}

type Relation = { link: GLink; other: GNode };

/* Placement constants.

   OFFSET used to be a flat 16px down-and-right of the cursor, which put the
   card's top-left corner straight onto the thing it was describing: the node's
   own disc and, worse, the name plate the canvas draws *directly beneath* the
   node. In 03-hover.png the card starts 25px right of the 홍진호 node centre
   and covers "홍진호 / 前 프로게이머 · 프로 포커 플레이어" — a tooltip hiding
   the label it is a tooltip for.

   So the card is placed in a quadrant, clear of a keep-out box around the
   pointer, and — round 3 — on the side of the node that has the FEWEST of its
   own connections on it. Hovering the hub used to throw a 290×340 card over
   상민, 경훈 and the two dashed edges running to them: four of the eleven ties
   the card was simultaneously counting. The neighbours' world coordinates are
   already on the relation records, and the camera is a similarity transform
   (uniform scale plus a translate, never a rotation), so the bearing of a
   neighbour in world space IS its bearing on screen. No projection needed. */
const CLEAR_X = 30;
const CLEAR_UP = 26;
const CLEAR_DOWN = 58;
const MARGIN = 8;
/** The chrome the card must not be thrown behind: top bar, status bar. */
const TOP_INSET = 60;
const BOTTOM_INSET = 34;
/** Half the caret's base, so it never runs off the corner radius. */
const CARET_PAD = 18;

/* ── the fast path ───────────────────────────────────────────────────────────
   Measured, dev build, from a capture-phase pointermove listener inside the
   page: `is-shown` landed at a median 264ms and full opacity at 404ms, against
   this card's own budget of 60ms dwell + 150ms fade = 210ms.

   None of the overage was the fade. A single pointermove takes a median 78ms
   (p90 94ms) to reach this element's `style` attribute, because every move
   goes up to App state — `setPointer` on window.pointermove, `onHover` on the
   canvas's pick — and comes back down through TopBar, FilterRail, StatusBar
   and Dossier. Longtasks of 50–135ms fire on the moves. React was the latency,
   and the dwell timer only started once React had finished.

   So show/hide and position are both off React now.

   POSITION is owned by this file: a capture-phase window listener writes the
   transform straight to the element on the pointermove itself, which is what
   "welded to the cursor" was supposed to mean and had not been for some time.
   React still owns the card's CONTENT, one commit behind, and the fade covers
   the swap.

   SHOW/HIDE needs one thing this file cannot know — whether the pointer is
   over a node — and the canvas resolves that synchronously in its own
   pointermove handler, before it tells React anything. `hoverProbe` is that
   report. It is optional: with nothing calling it the card falls back to the
   React path exactly as before, just without the extra commit the JS dwell
   timer used to cost. The dwell is now `transition-delay` in CSS, which is
   what it should always have been.

   `sides` is the one piece of geometry the placement rule needs and only the
   canvas has: how many of this node's ties are drawn to its left and to its
   right (see `crowding`). The canvas reports geometry; the card keeps the
   policy about what to do with it. Omit it and the card reuses the last
   person's answer, which is wrong at most for the 78ms until content lands. */
export interface HoverProbe {
  /** Node under the pointer, or null for "nothing". */
  id: string | null;
  /** Pointer, viewport coordinates. */
  x: number;
  y: number;
  /** Ties drawn on each side of the node, in screen space. */
  sides?: { left: number; right: number };
}

let probeImpl: ((p: HoverProbe) => void) | null = null;

/** Report what the pointer is over. Safe to call before the card mounts. */
export function hoverProbe(p: HoverProbe): void {
  probeImpl?.(p);
}

/* ── plate ───────────────────────────────────────────────────────────────────
   The same generated portrait the dossier and the gallery draw, so hovering
   reads as zooming in on the node you are pointing at rather than as opening
   a different UI: category ring, one season arc per prior season sized by how
   far they got, a rim tick per verified connection, brass for a title. */

/* THE TWO FUNCTIONS THAT USED TO LIVE HERE ARE GONE, AND THAT IS THE FIX.
 *
 * `ranksFor(node)` and `fieldsFor(node)` walked `node.person.priorSeasons` and
 * read `run.rank` and `run.fieldSize` off the record — a private, ungated copy
 * of `bestRank` / `fieldOf` in graph/build.ts. Two consequences, and the second
 * is why deleting beats gating:
 *
 *   · UNGATED. The plate draws each season arc's sweep as `rank / fieldSize` to
 *     scale, which is exactly invertible, so at the empty watched-set this card
 *     printed 이진형's 1st-of-13 as geometry: measured, the arc path was
 *     character-for-character identical with the set narrowed to nothing.
 *     Gating build.ts alone could never have reached it, because this file was
 *     not asking build.ts.
 *   · A SECOND ANSWER TO A QUESTION THAT MUST HAVE ONE. `buildGraph` already
 *     resolves this person's finishes into `node.plate`, for the disc the
 *     cursor is sitting on. The card is a magnified view of THAT disc — that is
 *     the whole conceit stated in the block above — so it now reads the same
 *     spec the canvas paints from, and the two cannot disagree about a rank, a
 *     field size or which reader they are talking to. `plate.seasons` IS
 *     `node.seasons`, so the arrays stay aligned by construction rather than by
 *     two functions happening to iterate the same list.
 *
 * Byte-identical at the default set, measured: `bestRank` skips a non-number
 * rank where `ranksFor` skipped `undefined`, and `fieldOf` tests
 * `typeof fieldSize === 'number'` where `fieldsFor` tested truthiness. The
 * corpus holds no null rank and no zero field size, so the two pairs agree
 * everywhere today; the build.ts forms are the stricter ones.
 *
 * `warmSubject` below still computes its own, because it warms a PERSON and has
 * no node to read — and it goes through `runFacts`, the accessor build.ts uses.
 */

/** Frozen so the prop identity never changes between renders of a surface that
    re-renders on every pointer move. */
const HOVER_OMIT: PlateMarkKind[] = ['ticks'];

/* ── the warm payload ────────────────────────────────────────────────────────
   Round 4 warmed this card with a shell: four strings in the card's own styles,
   painted for two frames. It moved the first hover from 589ms to the low 300s
   and was reported fixed twice; it was still 1.3–2.2x the steady state, because
   a shell does not pay for what the first hover actually builds. The card's
   payload is a PLATE — an SVG with a clip path, a radial seat, a saturate
   filter and a three-channel linear transfer, plus a decoded photograph — and
   under it a mark key and a tag row. None of that existed until somebody
   hovered.

   So the warm-up renders the real thing: a real person, their real plate with
   their real record, their occupation line, the mark key at the same limit the
   card uses. Two choices in it are deliberate.

   WHO. The longest primary name in the CURRENT language, because the metric
   being warmed is text layout and the longest string is the one that forces
   the widest line box; the language matters because Pretendard and Inter are
   two different faces at two different sizes and switching language re-does
   this work. Ties on length break toward the busiest plate — most seasons,
   then a laurel, then a host ring — so the warm pass paints as much of the
   plate's furniture as one person can.

   WHAT ELSE. The tie list is the person's own, off the edge table, so the rim
   ticks and the key rows are the ones this plate really draws. A synthetic
   payload would warm a plate the app never renders, which is how the shell
   version came to be measured as fixed while the first hover was still slow. */
/* WHY THE WARM PASS IS REDACTED TOO, when it is `aria-hidden`, held at 0.008
   opacity and released after two frames.

   Because it is PAINTED, and being painted is the entire reason it exists — a
   warm-up that the compositor skips warms nothing, which is the bug round 4
   fixed by making the opacity non-zero. What it paints is a real person's real
   plate: their laurel, their season arcs at their real sweep. Two frames of a
   champion's gold ring is still the app stating a verdict it was told not to
   state, and 0.008 is a threshold argument rather than a redaction. It also
   costs nothing to be right here: same accessor, same set, and at the default
   watched-set the chosen subject and every mark on them is unchanged (measured).

   `score`'s winner term is gated for a different and smaller reason — nobody
   sees a score. It picks WHOM to warm, and the point of the pass is to paint
   what the card will really draw; scoring on a laurel this reader will never be
   shown would warm furniture that never arrives. */
function warmSubject(
  lang: Lang,
  watched: WatchedSet,
): {
  person: (typeof people)[number];
  seasons: SeasonNumber[];
  ranks: (number | undefined)[];
  fields: (number | undefined)[];
  isWinner: boolean;
  isHost: boolean;
  connections: PortraitConnection[];
} {
  /* The one predicate, spelled as build.ts and CommandPalette.tsx spell it:
     `role` raw, because it is structure and the painters must keep knowing
     whether a run was a run at the prize; `rank` through `runFacts`, because it
     is the verdict. */
  const won = (p: (typeof people)[number]): boolean =>
    p.priorSeasons.some((r) => r.role === 'contestant' && runFacts(r, 'ko', watched).rank === 1);

  const score = (p: (typeof people)[number]): number => {
    const seasons = new Set(p.priorSeasons.map((s) => s.season)).size;
    const winner = won(p) ? 2 : 0;
    const host = p.priorSeasons.some(watchedRun) ? 1 : 0;
    return seasons * 3 + winner + host;
  };
  let best = people[0];
  let bestKey = -1;
  for (const p of people) {
    const key = personName(p, lang).primary.length * 100 + score(p);
    if (key > bestKey) {
      bestKey = key;
      best = p;
    }
  }
  const seasons = [...new Set(best.priorSeasons.map((s) => s.season))].sort() as SeasonNumber[];
  const rankOf = (season: number): number | undefined => {
    let out: number | undefined;
    for (const r of best.priorSeasons) {
      if (r.season !== season) continue;
      const { rank } = runFacts(r, 'ko', watched);
      if (typeof rank !== 'number') continue;
      out = out === undefined ? rank : Math.min(out, rank);
    }
    return out;
  };
  const fieldOf = (season: number): number | undefined => {
    for (const r of best.priorSeasons) {
      if (r.season !== season) continue;
      const { fieldSize } = runFacts(r, 'ko', watched);
      if (typeof fieldSize === 'number') return fieldSize;
    }
    return undefined;
  };
  /* The tie list is filtered by the same gate the visible card uses, so the
     plate warmed is the plate drawn — including, for a narrowed reader, an
     empty rim and the no-ties hairline. */
  const mine = edges.filter(
    (e) => (e.source === best.id || e.target === best.id) && tieTypeVisible(e, watched),
  );
  return {
    person: best,
    seasons,
    ranks: seasons.map(rankOf),
    fields: seasons.map(fieldOf),
    isWinner: won(best),
    isHost: best.priorSeasons.some(watchedRun),
    connections: mine.map((e) => ({ type: e.type, strength: e.strength })),
  };
}

/** Which side of the node its own ties are on, in world space. */
function crowding(node: GNode, relations: Relation[]): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (const r of relations) {
    if (r.other.x < node.x) left += 1;
    else right += 1;
  }
  return { left, right };
}

export function HoverCard({ node, relations, pointer, suppressed }: HoverCardProps): JSX.Element {
  const { lang } = useLang();
  /* THE SUBSCRIPTION THIS FILE DID NOT HAVE.
   *
   * It has to be the hook and not `currentWatched()`: the module mirror answers
   * once, at first render, and then tells React nothing, so a reader who
   * NARROWS their set — the correction somebody makes the instant they realise
   * they are about to be spoiled — would keep this card's finishes, laurel and
   * tie census on screen until an unrelated commit happened to knock it. Stale
   * here is a leak, not a lag.
   *
   * It is also what keeps the card and the disc under it telling one story. The
   * `node` prop is built by `useAtlas`'s `useMemo`, which already depends on
   * `useWatched().watched`, so both surfaces re-render off the same context on
   * the same commit; a card reading a different set from the graph would
   * magnify a plate that is no longer on the canvas. */
  const { watched } = useWatched();
  const ref = useRef<HTMLDivElement>(null);
  /* Size, pointer and side preference are refs and not state because nothing
     renders from them — the placement runs on a pointermove, outside React. */
  const sizeRef = useRef({ w: 300, h: 190 });
  const ptrRef = useRef(pointer);
  const preferRightRef = useRef(true);
  const activeRef = useRef(false);
  const suppressedRef = useRef(suppressed);
  suppressedRef.current = suppressed;

  const active = node !== null && !suppressed;

  /* ── warm-up ───────────────────────────────────────────────────────────
     The card is never unmounted, and round 3's comment claimed that was
     enough: "the blur layer is built once at startup". It was not. Round 4
     measured 589ms from pointermove to computed opacity ≥ 0.98 on the FIRST
     hover of a session against 3ms on every hover after it — because a
     `visibility: hidden` element at opacity 0 is never painted, so nothing
     about it exists yet: no backdrop-filter snapshot, no font metrics for
     Pretendard at four sizes and three weights, no composited layer. All of
     that was still being paid on first use; staying mounted only moved the
     cost from element creation to first paint.

     So the card is genuinely warmed: for two frames after mount it is made
     visible at 0.008 opacity — non-zero, because Chromium skips painting at
     exactly zero, and far below the threshold of visibility on this backdrop
     — which forces the real paint. Two rAFs rather than one: the first fires
     before the paint the mount scheduled, so releasing there would warm
     nothing. The strings in the warm block are the card's own labels at the
     card's own sizes, so the metrics measured are the metrics used.

     The `is-warming` CLASS is applied to the element directly rather than
     through className, because everything else about this element's class list
     is now written imperatively (see the fast-path note) and a React-owned
     className string would clobber it on the commit that ends the warm-up. The
     state below survives only to carry the warm block's children.

     Round 10: the payload is real now (see `warmSubject`), which costs a plate
     at startup — and startup is the app's worst-measured moment, a curtain-up
     that already drops frames. So the warm pass waits for the browser to say
     it is idle rather than starting on the mount commit, with a 1.2s deadline
     so it cannot be starved out. Nothing is racing it: the cold open alone
     runs longer than that, and the earliest a pointer can reach a disc is
     after it. Where requestIdleCallback does not exist the timeout is the
     whole schedule. */
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    let idle = 0;
    let t = 0;
    const go = (): void => {
      window.clearTimeout(t);
      setWarming(true);
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) idle = ric(go, { timeout: 1200 });
    else t = window.setTimeout(go, 900);
    return () => {
      const cancel = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (idle && cancel) cancel(idle);
      window.clearTimeout(t);
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !warming) return;
    el.style.transform = `translate3d(0px, ${MARGIN + TOP_INSET}px, 0)`;
    el.classList.add('is-warming');
    el.setAttribute('aria-hidden', 'true');
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        el.classList.remove('is-warming');
        setWarming(false);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [warming]);

  /* The last person hovered stays rendered until the next one replaces them,
     so the content survives the fade-out rather than blanking mid-exit. */
  const keep = useRef<{ node: GNode; relations: Relation[] } | null>(null);
  if (node && !suppressed) keep.current = { node, relations };
  const content = keep.current;

  /* The card is remeasured when its content changes — which is when the hovered
     person changes, and also when the language does: English runs longer. */
  const measureKey = content ? `${content.node.id}:${lang}` : '';

  /**
   * The relationships this card may DESCRIBE, which is not the same list as the
   * relationships the canvas DRAWS.
   *
   * `relations` arrives unfiltered from the graph's `edgesOf`, and everything
   * below counted it: the headline total, the pip census, the strongest-tie
   * line, and the rim ticks on the plate. `Edge.type` is on
   * `OUTCOME_FIELDS.Edge` because `betrayal` is a verdict about a named person,
   * so an ungated census prints sealed verdicts as a tally — measured at the
   * empty set, this card said `배신 2 · Betrayal 2` for 이진형 while the plate
   * beside it drew the fine grey no-ties rim, because `node.noTies` comes from
   * `degree` and `degree` has been gated since Phase 2. One object, two answers,
   * eleven pixels apart.
   *
   * So the same predicate `buildGraph` ticks the rim with, imported rather than
   * restated: `tieTypeVisible` from data/edges.ts, which is where
   * `scopes.type ?? scope` is resolved for the whole app.
   *
   * WITHOUT `isMeeting`, deliberately. `countsAsTie` is the graph's question and
   * it drops non-meetings, because a `parallel` record is not connectedness and
   * must not reach `degree`. This card's question is different: it keeps the
   * parallel record and prints it under its own name (see `topIsParallel`
   * below), which for the three cold plates is the one fact they have. Gating
   * visibility and gating meeting-ness are two filters and this is only the
   * first; the second is still where it was.
   *
   * The original array is returned when nothing was dropped — at the default set
   * that is always, and it keeps the memos below off a fresh identity per frame
   * on a surface that re-renders on pointer moves.
   */
  const shown = useMemo(() => {
    const all = content?.relations ?? [];
    const kept = all.filter((r) => tieTypeVisible(r.link.edge, watched));
    return kept.length === all.length ? all : kept;
  }, [content, watched]);

  /* The headline number counts MEETINGS; the pip row keeps every type.
     Those are two different jobs and they used to be one. `총 1건` beside the
     관계 eyebrow, for a person whose only line says in its own headline that
     the two have never been in the same room, is the claim `parallel` was
     invented to make impossible — so the total is `ties.met` and the remainder
     is printed next to it under its own name (`tie.parallel`).
     The pips are untouched: each one is already labelled with its own type and
     its own count, so the parallel chip states exactly what it is rather than
     disappearing into a total. Keeping it there is also what stops the split
     reading as a subtraction — the row and the headline now agree because the
     headline says what it is counting. */
  const summary = useMemo(() => {
    const rels = shown;
    const counts = new Map<EdgeType, number>();
    for (const r of rels) counts.set(r.link.type, (counts.get(r.link.type) ?? 0) + 1);
    /* `relations` arrives strongest-first, so the payload line is rels[0] —
       which for the three cold plates is their parallel record, printed under
       an eyebrow reading 가장 강한 인연 / 'Strongest tie'. The strongest tie of
       somebody with none. So the line takes the strongest MEETING when there is
       one and falls back to the parallel record under its own name; the fact is
       still the one fact those three have, and it is no longer filed as a tie. */
    const met = rels.filter((r) => isMeeting(r.link.type));
    return {
      pips: ALL_EDGE_TYPES.filter((ty) => counts.has(ty)).map((ty) => ({ type: ty, n: counts.get(ty) ?? 0 })),
      /* PASSED, not defaulted, even though `rels` is already gated and the
         second filter inside `tieCounts` is therefore a no-op. `tieCounts`
         falls back to `currentWatched()`, the module mirror, which carries no
         subscription — and a component that leans on it renders the right
         total once and then keeps printing it after the reader narrows. The
         redundancy is the cheap half of a belt and braces; the leak the belt
         prevents is a headline number surviving its own redaction. */
      ties: tieCounts(
        rels.map((r) => r.link),
        watched,
      ),
      top: met[0] ?? rels[0] ?? null,
      topIsParallel: met.length === 0 && rels.length > 0,
    };
  }, [shown, watched]);

  const connections = useMemo<PortraitConnection[]>(
    () => shown.map((r) => ({ type: r.link.type, strength: r.link.edge.strength })),
    [shown],
  );

  /* Smart placement. Position is written straight to the element's transform
     with no transition, so the card is welded to the cursor; only opacity
     eases. It runs on the pointermove and NOT in a React render — see the
     fast-path note at the top of this file for the 78ms that bought.

     Four candidate quadrants, tried in order, first one that fits inside the
     frame wins. The horizontal preference is the emptier side of the node (see
     crowding above); the vertical preference is UP, because the canvas draws a
     node's name plate below the disc and nothing above it. If none of the four
     fits — a very short window — the last candidate is clamped, which is still
     better than covering the subject. */
  const place = useCallback((px: number, py: number) => {
    const el = ref.current;
    if (!el) return;
    const { w, h } = sizeRef.current;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const frameTop = MARGIN + TOP_INSET;
    const frameBottom = vh - MARGIN - BOTTOM_INSET;
    const preferRight = preferRightRef.current;

    const near = { x: preferRight ? px + CLEAR_X : px - CLEAR_X - w, right: preferRight };
    const far = { x: preferRight ? px - CLEAR_X - w : px + CLEAR_X, right: !preferRight };
    const candidates = [
      { ...near, y: py - CLEAR_UP - h },
      { ...far, y: py - CLEAR_UP - h },
      { ...near, y: py + CLEAR_DOWN },
      { ...far, y: py + CLEAR_DOWN },
    ];
    const spot =
      candidates.find(
        (c) => c.x >= MARGIN && c.x + w <= vw - MARGIN && c.y >= frameTop && c.y + h <= frameBottom,
      ) ?? candidates[candidates.length - 1];

    const x = Math.round(Math.min(Math.max(spot.x, MARGIN), Math.max(MARGIN, vw - MARGIN - w)));
    const y = Math.round(Math.min(Math.max(spot.y, frameTop), Math.max(frameTop, frameBottom - h)));
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    /* The caret sits on the edge that faces the node, level with the cursor,
       so the card is tied to the disc it describes instead of floating. */
    el.style.setProperty(
      '--caret-y',
      `${Math.round(Math.min(Math.max(py - y, CARET_PAD), Math.max(CARET_PAD, h - CARET_PAD)))}px`,
    );
    el.classList.toggle('hovercard--right', spot.right);
    el.classList.toggle('hovercard--left', !spot.right);
  }, []);

  /** The class flip, and with it the CSS dwell. */
  const reveal = useCallback((on: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.classList.toggle('is-shown', on);
    if (on) el.removeAttribute('aria-hidden');
    else el.setAttribute('aria-hidden', 'true');
  }, []);

  /* Measure once per person, not once per mouse move — the content only
     changes when the hovered node does. Measuring here and re-placing in the
     same layout effect means the corrected size lands before the browser
     paints the commit that changed the content.

     `crowding` is resolved here too. When the canvas is reporting (see
     `hoverProbe`) it has already supplied the same answer a commit earlier and
     this is a no-op; when it is not, this is where the answer comes from. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(r.width - sizeRef.current.w) > 0.5 || Math.abs(r.height - sizeRef.current.h) > 0.5) {
      sizeRef.current = { w: r.width, h: r.height };
    }
    if (content) {
      /* THE FULL LIST ON PURPOSE, not `shown`. This asks a question about
         PIXELS — which side of the disc has more of its lines drawn on it, so
         the card lands on the emptier side — and the canvas draws every edge at
         every watched-set. Placing against the redacted list would throw the
         card over lines that are on screen. Geometry is reported by what is
         painted; only the claims are gated. */
      const crowd = crowding(content.node, content.relations);
      /* Ties go right: the label plate is centred under the disc, so a card on
         the right hides marginally less of it than one on the left. */
      preferRightRef.current = crowd.right <= crowd.left;
    }
    if (activeRef.current) place(ptrRef.current.x, ptrRef.current.y);
  }, [measureKey, content, place]);

  /* The React path, which is also the fallback when nothing is calling
     `hoverProbe`. It cannot beat the probe — it is a commit behind by
     definition — but it is what keeps show/hide correct for every route into
     the hover state that does not come through a pointermove: the dossier
     opening (`suppressed`), a filter removing the hovered node, a deep link. */
  useEffect(() => {
    activeRef.current = active;
    if (active) place(ptrRef.current.x, ptrRef.current.y);
    reveal(active);
  }, [active, place, reveal]);

  /* The card must never chase a cursor that is no longer pointing at anything:
     while it fades out it stays where it was. */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ptrRef.current = { x: e.clientX, y: e.clientY };
      if (activeRef.current) place(e.clientX, e.clientY);
    };
    window.addEventListener('pointermove', onMove, true);
    return () => window.removeEventListener('pointermove', onMove, true);
  }, [place]);

  /* The canvas's report, if it is wired. Registered in a layout effect so a
     probe fired on the very first pointermove of a session is not dropped. */
  useLayoutEffect(() => {
    probeImpl = (p) => {
      ptrRef.current = { x: p.x, y: p.y };
      if (p.sides) preferRightRef.current = p.sides.right <= p.sides.left;
      const on = p.id !== null && !suppressedRef.current;
      activeRef.current = on;
      if (on) place(p.x, p.y);
      reveal(on);
    };
    return () => {
      probeImpl = null;
    };
  }, [place, reveal]);

  /* Built only while the warm pass is up, and re-built when the language
     changes because the longest name changes with it — or when the reader's set
     does, because that changes which marks the subject carries and therefore
     what the pass is warming. */
  const warm = useMemo(() => (warming ? warmSubject(lang, watched) : null), [warming, lang, watched]);

  const name = content
    ? content.node.person
      ? personName(content.node.person, lang)
      : { primary: content.node.label || content.node.id, secondary: '' }
    : null;
  const other = lang === 'ko' ? 'en' : 'ko';
  const occupation = content
    ? content.node.person
      ? personOccupation(content.node.person, lang)
      : content.node.sublabel
    : '';
  const top = summary.top;

  return (
    /* className, aria-hidden, transform and --caret-y are all written by hand
       above and deliberately not rendered here: React must not own an
       attribute the pointermove path is writing between commits, or the next
       commit puts the card back where the cursor was three frames ago. */
    <div ref={ref} id="atlas-hovercard" role="tooltip" className="hovercard hovercard--right">
      {/* Outside the card, because the card clips its own corners: an anchor
          drawn inside it would be sheared flat against the edge. */}
      <span className="hovercard__caret" aria-hidden="true" />

      <div className="hovercard__card">
        {/* Two frames of the REAL card — a real person's plate, their real
            name at the card's own size, the mark key at the card's own limit —
            so the first hover pays for none of it. See `warmSubject`. */}
        {warm && !content ? (
          <div className="hovercard__warm" aria-hidden="true">
            <div className="hovercard__head">
              <span className="hovercard__mark">
                <Portrait
                  id={warm.person.id}
                  initials={
                    lang === 'en'
                      ? monogramEn(warm.person.nameKo, warm.person.nameEn)
                      : monogram(warm.person.nameKo, warm.person.nameEn)
                  }
                  category={warm.person.category}
                  seasons={warm.seasons}
                  ranks={warm.ranks}
                  fieldSizes={warm.fields}
                  isWinner={warm.isWinner}
                  isHost={warm.isHost}
                  connections={warm.connections}
                  variant="mark"
                />
              </span>
              <div className="hovercard__names">
                <p className="hovercard__ko">{personName(warm.person, lang).primary}</p>
                <p className="hovercard__en" lang={other}>
                  {personName(warm.person, lang).secondary}
                </p>
              </div>
            </div>
            <p className="hovercard__occ">{personOccupation(warm.person, lang)}</p>
            <span className="eyebrow">{t(lang, 'hover.relations')}</span>
            <PlateKey
              className="hovercard__key"
              lang={lang}
              category={warm.person.category}
              seasons={warm.seasons}
              isWinner={warm.isWinner}
              isHost={warm.isHost}
              connections={warm.connections}
              limit={3}
              omit={HOVER_OMIT}
            />
            <p className="hovercard__hint">{t(lang, 'hover.hint')}</p>
          </div>
        ) : null}

        {content && name ? (
          <>
            <div
              className="hovercard__accent"
              aria-hidden="true"
              style={{ background: `linear-gradient(90deg, ${content.node.color}, transparent 76%)` }}
            />

            <div className="hovercard__head">
              <span className="hovercard__mark">
                <Portrait
                  id={content.node.id}
                  initials={lang === 'en' ? content.node.initialsEn : content.node.initials}
                  category={content.node.category}
                  seasons={content.node.seasons}
                  ranks={content.node.plate.ranks}
                  fieldSizes={content.node.plate.fieldSizes}
                  isWinner={content.node.isWinner}
                  isHost={content.node.isHost}
                  noTies={content.node.noTies}
                  connections={connections}
                  variant="mark"
                  imageUrl={content.node.person?.portraitUrl}
                />
              </span>
              <div className="hovercard__names">
                <p className="hovercard__ko">{name.primary}</p>
                {name.secondary ? (
                  <p className="hovercard__en" lang={other}>
                    {name.secondary}
                  </p>
                ) : null}
              </div>
            </div>

            {occupation ? <p className="hovercard__occ">{occupation}</p> : null}

            <ul className="hovercard__tags">
              <li className="hovercard__tag">
                {LINEAGE_LABEL_I18N[lang][lineageOf(content.node.person).team]}
              </li>
              {content.node.isWinner ? (
                <li className="hovercard__tag hovercard__tag--brass">
                  <span className="hovercard__tag-mark" aria-hidden="true">
                    ◆
                  </span>
                  {t(lang, 'hover.pastWinner')}
                </li>
              ) : null}
              {content.node.isHost ? <li className="hovercard__tag">{t(lang, 'hover.host')}</li> : null}
            </ul>

            <hr className="rule hovercard__rule" />

            <div className="hovercard__relhead">
              <span className="eyebrow">{t(lang, 'hover.relations')}</span>
              {/* Korean glues the counter to the numeral (12건) and does not
                  inflect it; English needs the space and the singular, which
                  is the half this line used to skip on the way to "1 ties". */}
              <span className="mono tnum hovercard__total">
                {summary.ties.met}
                {lang === 'ko' ? '' : ' '}
                {t(lang, summary.ties.met === 1 ? 'common.tie' : 'common.ties')}
                {/* The remainder, in the same slot so the flex row keeps its
                    two ends. Measured at the card's own size: 73px in Korean,
                    114px in English against a 300px card, so the eyebrow and
                    this still sit on one line. No EDGE_COLOR tint — palette.ts
                    rules that ramp out for type this small. */}
                {summary.ties.parallel > 0 ? (
                  <span className="hovercard__par" title={t(lang, 'tie.parallelNote')}>
                    {' · '}
                    {t(lang, 'tie.parallel')} {summary.ties.parallel}
                  </span>
                ) : null}
              </span>
            </div>

            {summary.pips.length > 0 ? (
              <ul className="hovercard__pips" aria-label={t(lang, 'hover.pipsAria')}>
                {summary.pips.map((p) => (
                  <li className="hovercard__pip" key={p.type}>
                    <span className="hovercard__pipdot" style={{ background: EDGE_COLOR[p.type] }} aria-hidden="true" />
                    <span className="mono tnum hovercard__pipn" aria-hidden="true">
                      {p.n}
                    </span>
                    {/* Colour alone never carries the type — the label is always there for AT. */}
                    <span className="sr-only">
                      {EDGE_LABEL_I18N[lang][p.type]} {p.n}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hovercard__empty">{t(lang, 'hover.noTies')}</p>
            )}

            {/* The strongest tie is the card's payload. The key drops to its own
                eyebrow line so the name and the headline each get the full width
                instead of fighting over 200px — a two-syllable name truncated to
                one answers nothing. */}
            {top ? (
              <div className="hovercard__strongest">
                <span className="eyebrow hovercard__strongkey">
                  {t(lang, summary.topIsParallel ? 'tie.parallel' : 'hover.strongest')}
                </span>
                <span className="hovercard__strongline">
                  <span
                    className="hovercard__strongdot"
                    style={{ background: EDGE_COLOR[top.link.type] }}
                    aria-hidden="true"
                  />
                  <span className="hovercard__strongname">
                    {top.other.person ? personName(top.other.person, lang).primary : top.other.label}
                  </span>
                  <span className="hovercard__strongdash" aria-hidden="true">
                    —
                  </span>
                  {/* PASSED, not defaulted. `edgeText` falls back to
                      `currentWatched()`, which is the module mirror and carries
                      no subscription — right once, then silently stale in the
                      direction that leaves an authored headline on screen after
                      the reader has narrowed away from it. The set this
                      component re-renders on is the set its strings are gated
                      against. The `||` fallback to the type's generic label is
                      safe now that `shown` has already dropped any edge whose
                      TYPE is sealed: what remains is a line the reader may be
                      told the kind of, printed generically because its authored
                      sentence leans on something further. */}
                  <span className="hovercard__strongval">
                    {edgeText(top.link.edge, lang, watched).label || EDGE_LABEL_I18N[lang][top.link.type]}
                  </span>
                </span>
              </div>
            ) : null}

            {/* The node grammar, on the graph, on the node it belongs to.

                Eight encodings are live in the default frame — disc size, ring
                hue, season arcs, laurel, host hairline, newcomer dash, rim
                ticks, bloom — and the only place that said what any of them
                meant was the field guide's second tab, i.e. a modal that covers
                the graph it is describing. This card is already the surface a
                reader points a decorated disc at, and it is already showing
                that person's plate at 40px, so it names the marks that plate
                carries and nothing else: 곽범 teaches the dashed newcomer ring,
                이태균 teaches the laurel, and four hovers cover the grammar
                without ever leaving the canvas. Three rows, rarest first — a
                fourth costs more of the card than the grammar is worth on any
                one hover, and the dossier prints the full set.

                The rim ticks are the one mark left out here, and only here: the
                pip row two blocks up is that mark restated in the DOM — one
                chip per relationship type, in the same hues, with the count on
                it — so a sentence saying "one tick per relationship, coloured
                by type" would be the longest row on the card explaining the
                thing directly above it. The dossier, which has no pip row,
                keeps it. */}
            <PlateKey
              className="hovercard__key"
              lang={lang}
              category={content.node.category}
              seasons={content.node.seasons}
              isWinner={content.node.isWinner}
              isHost={content.node.isHost}
              noTies={content.node.noTies}
              connections={connections}
              limit={3}
              omit={HOVER_OMIT}
            />

            <p className="hovercard__hint">{t(lang, 'hover.hint')}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
