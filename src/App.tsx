import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dataset } from './data/dataset';
import { cubicBezier, GraphCanvas, type GraphHandle } from './graph/GraphCanvas';
import { relationsOf } from './graph/build';
import { ALL_CATEGORIES, ALL_EDGE_TYPES, ALL_REPRESENTS, useAtlas } from './state/useAtlas';
import { hasDeepLink, tieMatches, useDeepLink } from './state/useDeepLink';
import type { LayoutMode } from './graph/types';
import { TopBar } from './components/TopBar';
import { FilterRail } from './components/FilterRail';
import { Dossier } from './components/Dossier';
import { HoverCard } from './components/HoverCard';
import { Intro } from './components/Intro';
import { CommandPalette } from './components/CommandPalette';
import { AboutSheet } from './components/AboutSheet';
import { StatusBar } from './components/StatusBar';
import { PathCard } from './components/PathCard';
import { Gallery } from './components/Gallery';
import { findPath } from './state/findPath';
import { WatchedPicker } from './components/WatchedPicker';
import { LangContext, useLang, useLangState } from './state/useLang';
import { hasStoredAnswer, useWatched, WatchedProvider } from './state/useWatched';
import { personName, t } from './data/i18n';
import './styles/app.css';

const DEEP_LINK_OPTS = {
  allRepresents: ALL_REPRESENTS,
  allCategories: ALL_CATEGORIES,
  allEdgeTypes: ALL_EDGE_TYPES,
};

/**
 * The curtain's own curve — stated in the design system's notation, evaluated
 * by the design system's evaluator.
 *
 * `reveal` is the master alpha every other schedule on the entrance is keyed
 * to: SWEEP_AT reads it, Intro.css's handover block does arithmetic on it, and
 * GraphCanvas's sweep clock arms off it. It used to be an inline
 * `1 - Math.pow(1 - p, 3)` — an easeOutCubic that appears nowhere in
 * tokens.css, while GraphCanvas goes to the trouble of evaluating `--ease-out`
 * exactly so canvas moves and DOM moves share a personality. Every downstream
 * constant was therefore reasoned against a curve nobody had written down.
 *
 * IT IS THE SAME CURVE, TO 3.3e-16. A cubic Bézier with x1 = 1/3, x2 = 2/3 has
 * x(t) = t identically, and its y is then 3t − 3t² + t³ = 1 − (1−t)³. So this
 * is not a retune: it is the same numbers in the vocabulary the rest of the app
 * uses, checked across 1001 samples. Nothing keyed to it moves — SWEEP_AT still
 * lands at 291ms of the 700, Intro.css's 0.88 is still 0.875.
 *
 * It is NOT `--ease-out`. That token is an expo-out and it saturates: it would
 * put reveal 0.8 at 192ms instead of 291ms, with the curtain still 98.6% opaque
 * — the sweep would begin behind black, which is the exact failure SWEEP_AT was
 * tuned to avoid. A softer cubic is the right curve for a master fade that has
 * to hand off to something. HANDOFF: this wants a name in tokens.css —
 * `--ease-curtain: cubic-bezier(0.333, 1, 0.667, 1)` beside the other three,
 * with that reason — and this constant should then read it the way GraphCanvas
 * reads --ease-out. tokens.css is not this file's to edit.
 */
const EASE_REVEAL = cubicBezier(1 / 3, 1, 2 / 3, 1);

/** The hard ceiling on how long ENTER may wait for a compiled painter. See
 *  `startReveal`. */
const REVEAL_WAIT_MS = 400;

/**
 * THE ROOT, AND THE ONLY THING IT DOES IS HOLD THE READER'S CONTEXT.
 *
 * `WatchedProvider` has to sit ABOVE `Atlas`, in a component of its own, and
 * that is the whole reason this file grew a second function. A component cannot
 * consume a context it renders itself: `useAtlas` calls `useWatched()`, and if
 * the provider were mounted inside the same body that calls it, `useContext`
 * would walk past it to `null` and the hook would quietly hand back the
 * detached fallback — the right value at first render and never again. It warns
 * once in dev and does nothing else, so the failure would have looked exactly
 * like success in every screenshot.
 *
 * Nothing else moves. `LangContext` stays where it was, inside `Atlas`, because
 * nothing above it reads the language. No DOM is added; a provider renders its
 * children and nothing of its own, so Rule 0 is satisfied by construction.
 *
 * PHASE 4 GAVE IT SOMETHING TO HOLD. The provider seeds from
 * `currentWatched()`, which for a reader with no stored preference is now
 * `WATCHED_DEFAULT` — the empty set — and three surfaces under here write to
 * it: the cold open's question, the picker, and the badge that opens the
 * picker. See `WATCHED_DEFAULT` in state/useWatched.ts for why the default
 * points that way, and PLAN-spoilers.md §4.
 */
export default function App() {
  return (
    <WatchedProvider>
      <Atlas />
    </WatchedProvider>
  );
}

/**
 * SOMEBODY WHO FOLLOWED A SHARED LINK, AND HAS NEVER BEEN ASKED THE QUESTION.
 *
 * A deep link skips the cold open outright — `introDone` is initialised to
 * `hasDeepLink()`, because making a person watch a five-second curtain to reach
 * a view they were sent is a toll on the link. So this is the one arrival where
 * the question cannot be put in front of the reader, and the decision it forces
 * has been made twice over already:
 *
 *   A LINK MAY NEVER RAISE THE RECIPIENT'S EXPOSURE (PLAN-spoilers.md §4).
 *   `useDeepLink` writes the LANGUAGE into the hash and argues that language is
 *   a property of the document rather than of the sender's machine. Spoiler
 *   tolerance is the opposite: it is a fact about a person, and the person it
 *   is a fact about is not the one who wrote the URL. So the same argument runs
 *   the other way and the conclusion flips — the setting is not in the link,
 *   and the recipient arrives on their own default, which is sealed.
 *
 * WHICH LEAVES THE HONESTY PROBLEM, AND THIS BANNER IS IT. A stranger who lands
 * on a sealed atlas with no explanation concludes the atlas is thin, not that
 * it is holding something back for them — and that is worse than the spoiler,
 * because they leave. The banner says three things in two lines: that a link
 * does not carry a viewing history, that this is why the endings are sealed,
 * and where the control is.
 *
 * IT IS NOT SHOWN TO A READER WHO HAS ANSWERED, whatever they answered. The
 * condition is the ABSENCE of a stored answer, not the emptiness of the set: a
 * reader who deliberately chose "I have watched nothing" has already had this
 * conversation, and repeating it on every shared link they open would be the
 * app arguing with a decision it asked them to make.
 */
function ArrivalBanner({
  onOpenPicker,
  onDismiss,
}: {
  onOpenPicker: () => void;
  onDismiss: () => void;
}) {
  const { lang } = useLang();
  return (
    <div className="wparr" role="region" aria-label={t(lang, 'arrive.title')}>
      <div className="wparr__text">
        <p className="wparr__title">{t(lang, 'arrive.title')}</p>
        <p className="wparr__body">{t(lang, 'arrive.body')}</p>
      </div>
      <div className="wparr__acts">
        <button type="button" className="wparr__cta" onClick={onOpenPicker}>
          {t(lang, 'watched.open')}
        </button>
        <button type="button" className="wparr__dismiss" onClick={onDismiss}>
          {t(lang, 'arrive.dismiss')}
        </button>
      </div>
    </div>
  );
}

function Atlas() {
  const lang = useLangState();
  const atlas = useAtlas(dataset);
  const graphRef = useRef<GraphHandle>(null);
  const appRef = useRef<HTMLDivElement>(null);

  /* Someone arriving on a shared link asked for a specific view; making them
     watch the cold open first is a five-second toll on a deep link. */
  const [introDone, setIntroDone] = useState(() => hasDeepLink());
  const revealRef = useRef(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /* Read once, at mount, and for the same reason Intro reads it once: the flag
     flips the moment anything commits an answer, and a banner that vanished
     mid-sentence because the reader opened the sheet it points at would be
     removing its own explanation. Dismissal below is explicit. */
  const [arrival, setArrival] = useState(() => hasDeepLink() && !hasStoredAnswer());
  /* This component does not read the set; it only needs the writer, so that
     dismissing the arrival banner counts as an answer and the banner does not
     come back on every shared link the same person opens. */
  const { setWatched, watched } = useWatched();
  // On a phone the rail is a bottom sheet covering most of the screen; opening
  // it by default would hide the thing the app is about.
  const [railOpen, setRailOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900);
  const [viewport, setViewport] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  /* What is held is the QUESTION — two ids — not the answer.
     `findPath` is pure in (graph, from, to, edgeTypes), so the chain is a
     derived value below rather than a second copy of state. Two things fall
     out of that. The URL can carry a trace at all, because two ids are
     addressable and a PathResult is not. And a trace can no longer go stale:
     the card used to keep printing a chain through a relationship type the
     reader had since switched off, i.e. through a line that was no longer on
     the canvas. */
  const [tracePair, setTracePair] = useState<{ from: string; to: string } | null>(null);
  /* The relationship held open on the canvas.
   *
   * It lives here for the same reason `tracePair` does: it is in the address.
   * GraphCanvas still owns every gesture that pins or clears a line — this is
   * only where the value is kept, because a value the URL has to be able to
   * write cannot also be private to the component that changes it. */
  const [pinnedLinkId, setPinnedLinkId] = useState<string | null>(null);

  const { graph, selectedId, hoverId, visible, edgeTypes, mode } = atlas;

  const selected = selectedId ? graph.byId.get(selectedId) ?? null : null;
  const hovered = hoverId ? graph.byId.get(hoverId) ?? null : null;

  const relations = useMemo(
    () => (selectedId ? relationsOf(graph, selectedId).filter((r) => edgeTypes.has(r.link.type)) : []),
    [graph, selectedId, edgeTypes, lang.lang],
  );

  const hoverRelations = useMemo(
    () => (hoverId ? relationsOf(graph, hoverId).filter((r) => edgeTypes.has(r.link.type)) : []),
    [graph, hoverId, edgeTypes],
  );

  /* Curtain-up.
   *
   * 1500ms was 2.5× the choreography it carried: the painter saturated at
   * reveal ≈ 0.45 (`sceneAlpha = min(1, reveal * 2.2)`), i.e. at 290ms, and the
   * remaining 1.2s kept forcing a full-viewport repaint every frame while
   * changing no pixel. The multiplier is gone — `sceneAlpha` is now `reveal`
   * itself — so the number and the fade are the same thing end to end, and 700ms
   * lets the draw-on sweep (~880ms) finish just after the fade rather than a
   * second before it.
   *
   * `p` is clamped at BOTH ends. The rAF timestamp is the *start of the frame*
   * and is routinely earlier than the `performance.now()` captured here, so an
   * unclamped `(t - start) / dur` goes negative on the first frame; `reveal`
   * then goes negative, `sceneAlpha` goes negative, and assigning an
   * out-of-range value to `globalAlpha` is silently ignored per spec — leaving
   * the previous value of 1 in place and flashing the whole node layer at full
   * brightness for exactly one frame. */
  /* Armed by whichever signal arrives first (the intro starting to leave, or
     `introDone`). It is a state flag rather than a ref-guarded imperative
     start so that the rAF's owner and its canceller are the same effect: a
     latch held in a ref survives StrictMode's mount/unmount/remount, the
     cleanup cancels the frame, and the remount then refuses to restart it —
     which leaves `reveal` pinned at 0 and the graph permanently invisible. */
  const [revealArmed, setRevealArmed] = useState(false);

  /**
   * …AND NOT BEFORE THE PAINTER IS COMPILED.
   *
   * The curtain is armed by a keypress, and the keypress the cold open invites
   * is an early one — the CTA lands at 1400ms and the copy offers four ways
   * out. GraphCanvas warms its painter behind that curtain (WARM_PASSES full
   * scene renders at alpha 0.02: the label collision solve, every measureText,
   * the whole plate ladder), and a `reveal` that starts against an uncompiled
   * painter is not a fade, it is two steps. Measured on the production preview
   * at 1600×1000, ENTER at 600/1200/1700ms: warm was 0 on every run and the
   * 700ms fade was delivered in 2–3 frames at a median gap of 283–633ms; the
   * same build left alone for 4500ms gave warm 3 and 9–14 frames at a 50ms
   * median.
   *
   * So the arming is a QUESTION, not an order: `startReveal` records that the
   * reader wants in, and the curtain goes up on whichever comes first — the
   * warm signal, or a ceiling. The ceiling matters more than the signal: a
   * reader who presses ENTER must never be held on a callback that a stalled
   * font or a backgrounded tab can withhold. REVEAL_WAIT_MS is the longest wait
   * that still reads as the app responding to the key rather than ignoring it.
   */
  const warmedRef = useRef(false);
  const revealWantedRef = useRef(false);
  const revealWaitRef = useRef(0);
  const startReveal = useCallback(() => {
    if (revealWantedRef.current) return;
    revealWantedRef.current = true;
    /* Ask for a fresh compile pass on the way in.
     *
     * A warm pass goes stale — see GraphHandle.armEntrance for the numbers.
     * The reader who waits out the whole 4.5s countdown is the one whose
     * painter has been idle longest, so "already warmed once" is not a reason
     * to skip: `warmedRef` is put back down and the curtain waits for the new
     * signal, or for the ceiling, whichever lands first. */
    warmedRef.current = false;
    if (graphRef.current?.armEntrance() !== true) {
      setRevealArmed(true);
      return;
    }
    revealWaitRef.current = window.setTimeout(() => setRevealArmed(true), REVEAL_WAIT_MS);
  }, []);
  const onWarm = useCallback(() => {
    warmedRef.current = true;
    if (!revealWantedRef.current) return;
    window.clearTimeout(revealWaitRef.current);
    setRevealArmed(true);
  }, []);
  useEffect(() => () => window.clearTimeout(revealWaitRef.current), []);

  /**
   * When the chrome is allowed to arrive: after the curtain, not during it.
   *
   * WHY THIS IS NOT `introDone`. The reveal was the only interaction in the app
   * missing 60fps — four production runs delivered its 700ms window in 12/20/10/25
   * frames with single frames of 133/217/817/650ms — and the cause turned out not
   * to be the canvases. Ablated on the production build at 1440×900, four runs
   * each, counting frames delivered between reveal 0 and reveal 1:
   *
   *     control (everything on)                12, 20, 10, 25   max 817ms
   *     .rail hidden                           33, 26, 29, 22   max 433ms
   *     .topbar hidden                         29, 18, 25, 16   max 2617ms
   *     rail's 15 stagger animations off        1, 20, 19, 23   max 533ms
   *     .pane/.topbar backdrop-filter off      21,  9,  3, 26   max 499ms
   *     .topbar + .rail + .statusbar hidden    40, 36, 34, 28   max 67ms
   *
   * Only the last one is clean, and it is clean at a flat 16.7ms median. No
   * single piece of the chrome is the cost and no single property is: the cost
   * is three large glass panes going from opacity 0 to opacity 1 over a canvas
   * that is repainting every frame, and it lands at `introDone` — 500ms into a
   * 700ms fade, i.e. exactly on top of it.
   *
   * So the chrome is armed off the end of the curtain instead. Nothing about
   * the chrome's own animation changes; it simply no longer competes with the
   * one animation this codebase has spent four rounds tuning.
   *
   * It waits for the WHOLE entrance, not just the fade — `onEntranceDone`, the
   * frame the bearing-ordered sweep hands its last line to 1. The sweep is half
   * of the choreography, and arming on the fade alone only moved the stall onto
   * it: traced with the chrome armed at reveal 1, the reveal window came back
   * clean at a 16.7ms median while the entrance window still carried single
   * frames of 250–683ms. Armed at entrance-done, the same window's worst frame
   * is 50–103ms.
   *
   * The chrome therefore lands at ~931ms (SWEEP_AT at 291ms + DRAW_SPAN 420 +
   * DRAW_DUR 220) against ~725ms before, and is complete ~300ms later. That is
   * about 170ms of extra wait, spent buying the 1.3s of choreography this file,
   * Intro.css and GraphCanvas have re-tuned across four rounds — and the three
   * pieces now arrive as one ordered move rather than as a ledger that led by
   * 640ms and a masthead that followed.
   */
  const [chromeReady, setChromeReady] = useState(false);
  const armChrome = useCallback(() => setChromeReady(true), []);

  useEffect(() => {
    if (!revealArmed) return;
    let raf = 0;
    const start = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 1 : 700;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / dur));
      revealRef.current = p < 1 ? EASE_REVEAL(p) : 1;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    /* THE CEILING on the chrome's wait.
       The normal trigger is GraphCanvas's `onEntranceDone` at ~931ms; this is
       the hard stop 1100ms after the curtain starts, and it does two jobs. A
       tab backgrounded across the whole entrance runs no frames at all, and
       chrome that waits on a frame that will not arrive is chrome that never
       arrives. And on a machine slow enough that the sweep runs long, the
       reader gets the chrome on a bounded schedule rather than on the graph's.

       Zero under reduced motion, and that is not a nicety — it is the only
       thing arming the chrome at all. The sweep is disabled outright when the
       preference is set (`sweepOwns` is gated on `!reduced`), so
       `onEntranceDone` never fires, and a 401ms timer would have been 401ms of
       missing chrome for exactly the reader who asked for less motion, not
       more waiting. Cleared with the effect. */
    const armed = window.setTimeout(() => setChromeReady(true), reduced ? 0 : dur + 400);
    /* Framed instantly, not over 720ms.
     *
     * This runs on the commit where the curtain starts leaving, so `reveal` is
     * still 0 and the canvas is painting at alpha 0 behind an opaque overlay —
     * there is nothing on screen for a tween to smooth. Tweened, it spent the
     * whole reveal correcting itself in full view: measured on the production
     * preview, k ran 0.6076 at the first frame of the fade to 0.5721 well after
     * it ended, so the cold open resolved by retreating from its subject
     * instead of arriving at it. The graph is at rest by ~31ms after mount and
     * the label metrics are warm by now, so the arrival frame is fully
     * computable here; setting it makes the reveal a pure cross-fade.
     *
     * Forced, because it is the entrance's own framing and not a correction.
     * GraphCanvas's mount arrival takes a camera lock for DUR.cine + 120ms and
     * an unforced fit is refused inside it — so a reader who pressed ENTER
     * early got exactly the failure this call exists to prevent: the curtain
     * lifting on a camera still gliding to its first frame. */
    graphRef.current?.fit(96, 0, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(armed);
    };
    // Deliberately only `revealArmed`. The old effect also keyed on `graph`,
    // which restarts the fade from zero mid-flight if that identity changes —
    // the curtain then drops back to black partway up. Framing on a graph
    // change is frameArrival()'s job inside GraphCanvas, not this effect's.
  }, [revealArmed]);

  /* The curtain has to start going up when the cold open starts LEAVING, not
     when it has left. Sequencing them cost ~540ms of black immediately after
     the user pressed ENTER — well past the point a transition stops reading as
     a transition. Intro fires `onDismissBegin` at the top of its own dismiss,
     EXIT_MS before `onDone`, so the two fades overlap. (This replaced a
     MutationObserver watching for `.intro--out`, which worked but made a CSS
     class name into an API between two components.)

     `startReveal` is idempotent — it only sets a flag — so the `introDone`
     path below is a safe backstop for any exit that skips the callback. */

  /* Belt and braces: however the intro left, the graph is coming up. */
  useEffect(() => {
    if (introDone) startReveal();
  }, [introDone, startReveal]);

  /* The shortest chain of real relationships between the two ends, recomputed
     whenever the question or the graph it is asked of changes. This is the
     question a relationship graph exists to answer, so it gets a first-class
     interaction rather than a menu. */
  const trace = useMemo(() => {
    if (!tracePair) return null;
    const a = graph.byId.get(tracePair.from);
    const b = graph.byId.get(tracePair.to);
    if (!a || !b) return null;
    const path = findPath(graph, tracePair.from, tracePair.to, edgeTypes);
    return {
      path,
      // Names, not node labels — GNode.label is always the Hangul.
      unreachable: path
        ? null
        : {
            from: personName(a.person, lang.lang).primary,
            to: personName(b.person, lang.lang).primary,
          },
    };
  }, [tracePair, graph, edgeTypes, lang.lang]);

  /* Asking is separate from answering, because a link restores a trace by
     naming its two ends and that restore must not depend on anything the
     pointer happened to be doing — in particular not on `selectedId`, which on
     a cold load is being set by the same hash in the same commit. Ids are
     checked here so the URL can never carry a pair the graph does not have. */
  const traceBetween = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId || !graph.byId.has(fromId) || !graph.byId.has(toId)) return;
      setTracePair({ from: fromId, to: toId });
    },
    [graph],
  );

  /* Shift-click a second node. */
  const traceTo = useCallback(
    (toId: string) => {
      if (!selectedId) return;
      traceBetween(selectedId, toId);
    },
    [selectedId, traceBetween],
  );

  const clearTrace = useCallback(() => setTracePair(null), []);

  /* What the address carries for a pinned line: the pair and the type, never the
     edge id — see TieRequest for why a serial number makes a brittle link.
     Resolves to null when the id no longer names a line in the current graph,
     so a stale pin drops out of the hash rather than writing an address that
     resolves to nothing on the other end. */
  const pinnedTie = useMemo(() => {
    if (!pinnedLinkId) return null;
    const l = graph.links.find((x) => x.id === pinnedLinkId);
    return l ? { a: l.source.id, b: l.target.id, type: l.type } : null;
  }, [pinnedLinkId, graph]);

  /* No camera call here either — only the ping.
   *
   * `focusNode` used to fire on every selection: a pan at constant k that
   * centred the chosen person and left the other nineteen wherever they were,
   * which with a 530px dossier arriving one commit later meant four of twenty
   * ended up under it or off the bottom edge. GraphCanvas now owns the move,
   * because it is the only place that can see BOTH halves of the change — the
   * new selection and the new uncovered rectangle — and can therefore coalesce
   * them into one tween instead of racing a second one against them. */
  const selectAndFrame = useCallback(
    (id: string | null) => {
      setTracePair(null);
      atlas.select(id);
      if (id) graphRef.current?.ping(id);
    },
    [atlas],
  );

  /* No camera call here. GraphCanvas's frameArrival() effect runs on the same
     commit and owns framing on a mode change; the `setTimeout(fit, 30)` that
     used to sit here was always rejected by the camera lock frameArrival had
     just taken, so it was a no-op that read like a second camera move — and it
     would have become a real 720ms double re-frame the day that lock changed. */
  const setMode = useCallback(
    (m: LayoutMode) => {
      atlas.setMode(m);
    },
    [atlas],
  );

  /* ── keyboard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === '/' && !typing && !paletteOpen) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing) return;

      /* Hard gate. The palette is a modal search box; while it is up, every key
         that is not Escape belongs to it. This used to lean entirely on focus
         being inside the input, so the one round where focus missed, typing a
         name behind the modal silently switched layout modes, opened the cast
         wall and cycled the selected person's ties. A focus miss must never be
         able to mutate the app. */
      if (paletteOpen) {
        if (e.key === 'Escape') setPaletteOpen(false);
        return;
      }

      /* The same hard gate for the picker, and it is the same argument. The
         sheet traps focus, but focus inside it lands on BUTTONS as often as on
         inputs — and `typing` above only exempts inputs — so without this,
         Tab-ing to "전체 해제" and then pressing `g` would open the cast wall
         underneath the modal that is covering it. The picker owns Escape
         itself (capture phase, stopPropagation, and it commits on the way out),
         so this branch only has to refuse everything else. */
      if (pickerOpen) return;

      switch (e.key) {
        case 'Escape':
          // The palette is handled by the gate above, before this switch.
          if (galleryOpen) setGalleryOpen(false);
          else if (aboutOpen) setAboutOpen(false);
          else if (tracePair) setTracePair(null);
          else if (atlas.selectedId) atlas.select(null);
          break;
        case '1':
          setMode('web');
          break;
        case '2':
          setMode('seasons');
          break;
        case '3':
          setMode('archetype');
          break;
        case '4':
          if (atlas.selectedId) setMode('orbit');
          break;
        case 'f':
          graphRef.current?.fit();
          break;
        case '=':
        case '+':
          graphRef.current?.zoomBy(1.28);
          break;
        case '-':
        case '_':
          graphRef.current?.zoomBy(1 / 1.28);
          break;
        case '[':
          setRailOpen((v) => !v);
          break;
        case 'g':
        case 'G':
          setGalleryOpen((v) => !v);
          break;
        case '?':
          setAboutOpen((v) => !v);
          break;
        case 'Backspace':
          atlas.back();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atlas, setMode, paletteOpen, aboutOpen, galleryOpen, pickerOpen, tracePair]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => setPointer({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    const onResize = () => setViewport(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* How much of the canvas the chrome is sitting on top of. Below 640px the
     panels are bottom sheets, so they eat height rather than width. */
  /* The canvas paints its own text, so it needs the strings handed to it. */
  const canvasStrings = useMemo(
    () => ({
      graphLabel: t(lang.lang, 'canvas.label'),
      emptyTitle: t(lang.lang, 'canvas.emptyTitle'),
      emptySub: t(lang.lang, 'canvas.emptySub'),
      emptyHint: t(lang.lang, 'canvas.emptyHint'),
      coldLabel: t(lang.lang, 'canvas.coldLabel'),
      coldSub: t(lang.lang, 'canvas.coldSub'),
    }),
    [lang.lang],
  );

  const compact = viewport <= 640;

  /* How much canvas the chrome is standing on.
     This used to be arithmetic duplicated from app.css, and it drifted twice —
     once at 641–900px where the dossier was 40px wider than the number here,
     and once on phones where `vh` does not shrink for the browser toolbar but
     window.innerHeight does. The stylesheet now publishes the box as four
     registered custom properties on `.app`, derived from the same tokens the
     panels are laid out from, so the two cannot disagree again. */
  const [insets, setInsets] = useState({ top: 72, right: 12, bottom: 46, left: 12 });

  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    const read = () => {
      const cs = getComputedStyle(el);
      const px = (k: string) => parseFloat(cs.getPropertyValue(k)) || 0;
      const next = {
        top: px('--inset-top'),
        right: px('--inset-right'),
        bottom: px('--inset-bottom'),
        left: px('--inset-left'),
      };
      setInsets((prev) =>
        prev.top === next.top && prev.right === next.right && prev.bottom === next.bottom && prev.left === next.left
          ? prev
          : next,
      );
    };
    // The panels transition, so read once now and once after they have moved.
    read();
    const t = window.setTimeout(read, 460);
    return () => window.clearTimeout(t);
  }, [railOpen, selected, viewport, compact]);

  /* ONE OWNER FOR THE CAMERA, AND IT IS NOT THIS FILE.
   *
   * There used to be a second re-frame here, on a 260ms timer keyed on the
   * inset box, alongside GraphCanvas's own 220ms debounce on the same box and
   * `focusNode` firing on the same click. Three timers, one event: measured k
   * ran 0.55 → 1.13 → 0.50 on a single node click. Round 4 answered that by
   * making all of them hold k — which stopped the oscillation and guaranteed
   * the other defect, since a dossier makes the visible rectangle SMALLER and
   * holding k is holding the one number that has to change.
   *
   * The camera now moves in exactly one place: the coalescing effect in
   * GraphCanvas keyed on (selection, filters, insets). This file's whole
   * contribution is to publish the inset box as a prop, which is above.
   * Nothing else here should ever call fit() or focusNode() on a state change;
   * a second owner is how this got to four rounds open. */

  /* Any view the user reaches is a link they can send to someone — which means
     the language it was read in and the chain that was traced in it, not just
     the person and the filters. See useDeepLink for what each parameter is. */
  useDeepLink(
    {
      personId: selectedId,
      mode,
      query: atlas.query,
      lang: lang.lang,
      path: tracePair,
      tie: pinnedTie,
      represents: atlas.represents,
      categories: atlas.categories,
      edgeTypes: atlas.edgeTypes,
      onlyReturning: atlas.onlyReturning,
    },
    useCallback(
      (s) => {
        /* Language first: everything below it that reads a string — the
           unreachable-trace names in particular — should be assembled in the
           language the link asked for, not in the one being left behind.
           Guarded on a real change so that merely opening a shared link does
           not overwrite the recipient's own saved preference. */
        if (s.lang && s.lang !== lang.lang) lang.setLang(s.lang);
        if (s.mode) atlas.setMode(s.mode);
        if (s.query !== undefined) atlas.setQuery(s.query);
        if (s.represents) atlas.setRepresents(s.represents);
        if (s.categories) atlas.setCategories(s.categories);
        if (s.edgeTypes) atlas.setEdgeTypes(s.edgeTypes);
        if (s.onlyReturning !== undefined) atlas.setOnlyReturning(s.onlyReturning);
        if (s.personId !== undefined) {
          const exists = s.personId ? graph.byId.has(s.personId) : false;
          // No focusNode() here: the selection change is itself what re-frames,
          // and it does it against the dossier's inset instead of one commit
          // ahead of it. See selectAndFrame.
          atlas.select(exists ? s.personId : null);
        }
        /* `undefined` means the hash did not mention a path and the current
           one stands; `null` means it explicitly does not have one, which is
           what a Back out of a trace looks like. */
        if (s.path !== undefined) {
          if (s.path) traceBetween(s.path.from, s.path.to);
          else setTracePair(null);
        }
        /* Same three readings as `path`: absent leaves the pin alone, null takes
           it down — which is what Back out of an open card looks like — and a
           request is resolved against the live edge list. `tieMatches` is what
           makes the resolution order-insensitive, so a hand-written `tie=b~a`
           finds the same line. A pair that names nothing degrades to no pinned
           line, exactly as an unknown `p=` degrades to no selection.

           The address is the pair plus an ordinal, never the relationship type
           — see TieRequest. So the ordinal has to be counted here, against the
           links this pair actually carries, in edge-file order: `graph.links`
           preserves that order because buildGraph maps over `data.edges`. */
        if (s.tie !== undefined) {
          const want = s.tie;
          let seen = 0;
          const hit = want
            ? graph.links.find((l) => {
                const samePair =
                  (want.a === l.source.id && want.b === l.target.id) ||
                  (want.a === l.target.id && want.b === l.source.id);
                return samePair && tieMatches(want, l.source.id, l.target.id, seen++);
              })
            : null;
          setPinnedLinkId(hit?.id ?? null);
        }
      },
      [atlas, graph, lang, traceBetween],
    ),
    graph.nodes.length > 0,
    DEEP_LINK_OPTS,
  );

  return (
    <LangContext.Provider value={lang}>
    <div ref={appRef} className={`app${railOpen ? '' : ' app--rail-closed'}${selected ? ' app--dossier' : ''}`}>
      <GraphCanvas
        nodes={graph.nodes}
        links={graph.links}
        mode={mode}
        selectedId={selectedId}
        hoverId={hoverId}
        visible={visible}
        visibleEdgeTypes={edgeTypes}
        reveal={revealRef}
        showLabels
        lang={lang.lang}
        canvasStrings={canvasStrings}
        insets={insets}
        pathNodeIds={trace?.path?.nodeIds ?? null}
        pathLinkIds={trace?.path?.linkIds ?? null}
        onEntranceDone={armChrome}
        onWarm={onWarm}
        onHover={atlas.setHover}
        onSelect={selectAndFrame}
        onTraceTo={traceTo}
        pinnedLinkId={pinnedLinkId}
        onPinLink={setPinnedLinkId}
        handleRef={graphRef}
      />

      <TopBar
        atlas={atlas}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onToggleRail={() => setRailOpen((v) => !v)}
        railOpen={railOpen}
        onFit={() => graphRef.current?.fit()}
        onModeChange={setMode}
        onOpenGallery={() => setGalleryOpen(true)}
        introDone={chromeReady}
      />

      <FilterRail atlas={atlas} open={railOpen} onClose={() => setRailOpen(false)} introDone={chromeReady} />

      <Dossier
        node={selected}
        relations={relations}
        dataset={dataset}
        onSelect={selectAndFrame}
        onClose={() => atlas.select(null)}
        onOrbit={() => setMode('orbit')}
        mode={mode}
        canGoBack={atlas.history.length > 0}
        onBack={atlas.back}
      />

      <HoverCard node={hovered} relations={hoverRelations} pointer={pointer} suppressed={Boolean(selected)} />

      <PathCard
        path={trace?.path ?? null}
        unreachable={trace?.unreachable ?? null}
        onClose={clearTrace}
        onSelect={selectAndFrame}
      />

      <StatusBar
        atlas={atlas}
        dataset={dataset}
        onReset={atlas.resetFilters}
        introDone={chromeReady}
        onOpenWatched={() => setPickerOpen(true)}
      />

      <CommandPalette
        open={paletteOpen}
        atlas={atlas}
        dataset={dataset}
        onClose={() => setPaletteOpen(false)}
        onSelect={(id) => {
          selectAndFrame(id);
          setPaletteOpen(false);
        }}
        onModeChange={(m) => {
          setMode(m);
          setPaletteOpen(false);
        }}
        onOpenAbout={() => {
          setAboutOpen(true);
          setPaletteOpen(false);
        }}
        onOpenGallery={() => {
          setGalleryOpen(true);
          setPaletteOpen(false);
        }}
      />

      <Gallery
        open={galleryOpen}
        graph={graph}
        visible={visible}
        onClose={() => setGalleryOpen(false)}
        onSelect={(id) => {
          setGalleryOpen(false);
          selectAndFrame(id);
        }}
      />

      <AboutSheet open={aboutOpen} dataset={dataset} onClose={() => setAboutOpen(false)} />

      <WatchedPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        /* The badge that used to open the field guide now opens this sheet, so
           the route to the long-form scope note continues from inside it rather
           than being dropped. Closing the picker first keeps one modal on
           screen at a time. */
        onOpenAbout={() => {
          setPickerOpen(false);
          setAboutOpen(true);
        }}
      />

      {/* Held until the chrome has arrived, so it does not compete with the
          entrance — the same gate the top bar, the rail and the ledger take.
          It sits above the status bar, beside the badge it is pointing at. */}
      {arrival && chromeReady && !pickerOpen && (
        <ArrivalBanner
          onOpenPicker={() => {
            setArrival(false);
            setPickerOpen(true);
          }}
          onDismiss={() => {
            /* Dismissing IS answering — the same rule the picker's close path
               follows. The reader has been told why the atlas is sealed and has
               chosen to leave it that way; committing the current set means
               they are not asked again on the next link somebody sends them.
               `setWatched` preserves identity, so this is a storage write and
               not a re-render. */
            setWatched(watched);
            setArrival(false);
          }}
        />
      )}

      {!introDone && (
        <Intro
          dataset={dataset}
          onDismissBegin={startReveal}
          onDone={() => setIntroDone(true)}
          onOpenPicker={() => setPickerOpen(true)}
        />
      )}
    </div>
    </LangContext.Provider>
  );
}
