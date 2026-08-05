import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Dataset } from '../data/types';
import { t, ui, type UiKey } from '../data/i18n';
import { useLang } from '../state/useLang';
import './Intro.css';

export interface IntroProps {
  dataset: Dataset;
  onDone: () => void;
  /**
   * Fired the instant the cold open commits to leaving — i.e. at the top of
   * `dismiss()`, EXIT_MS before `onDone`.
   *
   * The graph's master reveal is a fade, and a fade that only starts once the
   * curtain is fully gone shows the user half a second of black between the
   * two. Arming the reveal here lets the two crossfade, which is what the
   * handoff is supposed to look like. `onDone` stays the "I am gone, mount the
   * app" signal; this is the "I am leaving" one, and they are different moments.
   */
  onDismissBegin?: () => void;
}

/* The whole choreography lands by ~2.0s. Everything after that is the user's
   time, not ours — hence the visible auto-advance and the four ways out. */
const AUTO_ADVANCE_MS = 4500;
const EXIT_MS = 500;

/* The CTA and its countdown hairline land together. The bar's fill used to
   start at mount while its container stayed at opacity 0 until 1400ms, so the
   readout appeared already ~31% full and under-reported the time remaining by
   1.4s — on the one control that tells the reader how long they have. */
const CTA_DELAY_MS = 1400;
const COUNTDOWN_MS = AUTO_ADVANCE_MS - CTA_DELAY_MS;

/** Length of a possibly-absent array. Never NaN, never throws. */
function count(arr: readonly unknown[] | null | undefined): number {
  return arr ? arr.length : 0;
}

/**
 * How long the static placeholder in index.html has been on screen.
 *
 * The crimson rule and the crimson bloom both exist before this component does
 * — that is the entire point of #preboot — and both were restarting here: the
 * line collapsed to scaleX(0) and redrew, and the bloom dropped the backdrop to
 * opacity 0, i.e. to black, at the exact instant the placeholder was removed.
 * Reading the placeholder's own clock and handing it back as a negative
 * animation-delay makes the two halves one animation. If the module graph
 * happened to be ready instantly the offset is ~0 and the entrance plays in
 * full; if it took a second, the reader sees the second half of a rule they
 * have been watching draw, which is what continuity means.
 *
 * Zero when the placeholder is not there (a deep link renders no cold open at
 * all, and the harnesses mount this component directly).
 */
function handoffAge(): number {
  if (typeof window === 'undefined') return 0;
  const at = (window as unknown as { __prebootAt?: number }).__prebootAt;
  if (typeof at !== 'number') return 0;
  return Math.max(0, performance.now() - at);
}

/** `.intro__line`'s own delay in Intro.css, which the handoff has to preserve. */
const LINE_DELAY_MS = 40;

/* ── the three headline numbers are printed, not animated ─────────────────
 *
 * There used to be an odometer here: three counters seeded at 70% of their
 * targets and eased up over 900ms, plus a 1712ms lead-in, a 40ms per-column
 * stagger, a rAF loop and a setState per frame. It had already been tuned
 * twice — seed 0 → 0.35 → 0.7 — and each tuning was an attempt to make the
 * screen less wrong for less time, which is the shape of a problem that does
 * not have a tuning answer.
 *
 * The product's entire pitch is "these are verified pre-season facts and
 * nothing else". Its hero panel opened by asserting a three-season franchise
 * had two prior seasons, and the phone build was routinely photographed
 * mid-tween reading CAST 18 · CONNECTIONS 35 · PRIOR SEASONS 2 against a truth
 * of 20 · 40 · 3. A number on this screen is not decoration, it is the claim;
 * a claim that is false for 900ms is false.
 *
 * Nothing is lost in motion terms. The three columns still arrive on a
 * staggered fade-up (Intro.css, .intro__stat and its two nth-child delays,
 * 1240 → 1292ms) — that is the entrance, and it was always the part carrying
 * the movement. The seasons column in particular never had an animation to
 * lose: 2 → 3 is one tick, which reads as the number 2 and then the number 3.
 */

/**
 * The Latin gloss under a Korean line.
 *
 * One key, read twice: `t(lang, k)` carries the line and `ui.en[k]` the gloss,
 * so the pair can never drift. In the English UI the two would be the same
 * string, so the gloss drops out rather than printing itself twice.
 */
function Gloss({ k, lang, className }: { k: UiKey; lang: 'ko' | 'en'; className: string }): JSX.Element | null {
  if (lang === 'en') return null;
  return (
    <span className={className} lang="en">
      {ui.en[k]}
    </span>
  );
}

export function Intro({ dataset, onDone, onDismissBegin }: IntroProps): JSX.Element | null {
  const { lang } = useLang();
  const reduced = Boolean(useReducedMotion());
  const [exiting, setExiting] = useState(false);
  const [held, setHeld] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);
  const exitTimerRef = useRef(0);
  /** Read once, on the first render — the age is of the mount, not of a later
   *  re-render, and a re-render must not shift a running animation. */
  const handoffRef = useRef(-1);
  if (handoffRef.current < 0) handoffRef.current = handoffAge();
  const handoff = handoffRef.current;

  /* App passes a fresh closure every render; keep it in a ref so none of the
     timers below ever restart just because the parent re-rendered. */
  const onDoneRef = useRef(onDone);
  const onBeginRef = useRef(onDismissBegin);

  const exitMs = reduced ? 1 : EXIT_MS;

  const dismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    /* Before setExiting, so the reveal is armed in the same frame the curtain
       starts moving rather than one commit behind it. */
    onBeginRef.current?.();
    setExiting(true);
    exitTimerRef.current = window.setTimeout(() => onDoneRef.current(), exitMs);
  }, [exitMs]);

  const dismissRef = useRef(dismiss);

  useEffect(() => {
    onDoneRef.current = onDone;
    onBeginRef.current = onDismissBegin;
    dismissRef.current = dismiss;
  });

  /* Auto-advance. It is carried by a visible hairline under the ENTER pill, and
     it pauses while the pointer is over the stage — an involuntary transition
     with no progress signal reads as a crash, and reading the thesis line
     should never be interrupted by the screen changing underneath it. The
     remaining time survives the pause, so hovering delays but never cancels.

     Under prefers-reduced-motion there is no countdown ring to carry it and no
     entrance for the reader to have watched, so the timer is switched off
     rather than left running invisibly — WCAG 2.2.1, and the hint line below
     changes with it so the screen never promises an advance it will not make.

     The bar is not a picture of the timer, it IS the timer's clock. The two
     used to be separate: this effect started a 4500ms setTimeout at mount while
     the CSS animation started on the element's first rendered frame, one or two
     commits later, so the bar was 4333/4500 — 94.6%, about 9px short on a 178px
     rule — at the moment the screen changed. Reading `currentTime` off the
     animation itself removes the offset by construction rather than by
     compensating for a number that was measured once. It also removes the
     hand-rolled pause accounting: `animationPlayState` already stops that clock
     while the pointer is on the stage, so the remaining time survives a hover
     because it is the same quantity, not a copy of it. */
  const barRef = useRef<HTMLSpanElement | null>(null);
  const remainingRef = useRef(AUTO_ADVANCE_MS);

  useEffect(() => {
    if (held || reduced) return;
    let auto = 0;
    let live = true;
    const arm = (played: number) => {
      if (!live) return;
      remainingRef.current = Math.max(0, AUTO_ADVANCE_MS - played);
      auto = window.setTimeout(() => dismissRef.current(), remainingRef.current);
    };
    const anim = barRef.current?.getAnimations?.()[0];
    if (!anim) {
      // No bar (or an engine without the Web Animations API): fall back to the
      // remaining time this component has been tracking itself.
      arm(AUTO_ADVANCE_MS - remainingRef.current);
    } else {
      /* `ready` resolves in the frame the animation actually has a start time,
         which is the frame the bar first draws — before that, `currentTime` is
         the pending value and reading it is what produced the 170ms offset.
         If it somehow never resolved, no timer is armed and the cold open waits
         for the reader, which is the safe direction to fail in. */
      void anim.ready.then(() => {
        const ct = anim.currentTime;
        arm(typeof ct === 'number' ? ct : 0);
      });
    }
    return () => {
      live = false;
      window.clearTimeout(auto);
    };
  }, [held, reduced]);

  /* Any pending fade-out timer dies with the component. */
  useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

  /* Enter / Space / Esc anywhere. Capture phase so the app's global shortcut
     handler never sees these while the cold-open owns the screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      dismissRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  /* Announce the overlay and give the keyboard somewhere to start. */
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const stats: { key: UiKey; value: number }[] = [
    { key: 'intro.statCast', value: count(dataset.people) },
    { key: 'intro.statConnections', value: count(dataset.edges) },
    { key: 'intro.statSeasons', value: count(dataset.seasons) },
  ];

  /* The wordmark is one string in the table — 피의 게임X / Bloody Game X — but
     the trailing X is set in crimson and tracks as Latin, so it is split off
     here rather than duplicated as a second key. */
  const wordmark = t(lang, 'app.title');
  const hasX = wordmark.endsWith('X');
  /* The separator becomes non-breaking: "Bloody Game" must never leave the
     crimson X stranded alone on the second line. */
  const wordmarkHead = hasX ? wordmark.slice(0, -1).replace(/\s$/, ' ') : wordmark;

  return (
    <div
      ref={rootRef}
      className={`intro${exiting ? ' intro--out' : ''}${reduced ? ' intro--static' : ''}`}
      style={{ transitionDuration: `${exitMs}ms` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      aria-describedby="intro-thesis"
      tabIndex={-1}
    >
      {/* Both of these are already on screen when this mounts — see
          handoffAge(). The negative delay is the whole handoff: it says "you
          are not starting, you are continuing", and it is what stops the
          backdrop dropping to black and the rule redrawing itself from zero. */}
      <div className="intro__bloom" aria-hidden="true" style={{ animationDelay: `${-handoff}ms` }} />
      <div className="intro__grain" aria-hidden="true" />

      {/* Click anywhere to proceed. Presentational: the button below and the
          keyboard listener carry the same action accessibly. */}
      <div className="intro__scrim" role="presentation" onClick={dismiss} />

      {/* The stage takes its own pointer events (the countdown needs to know
          when someone is reading it) and forwards clicks to the same dismissal
          the scrim runs, so "click anywhere" still means anywhere. */}
      <div
        className="intro__stage"
        role="presentation"
        onClick={dismiss}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
      >
        <span
          className="intro__line"
          aria-hidden="true"
          style={{ animationDelay: `${LINE_DELAY_MS - handoff}ms` }}
        />

        <h1 id="intro-title" className="intro__title">
          <span className="intro__mask">
            <span className="intro__title-in">
              {/* The Hangul run and the Latin X track separately: negative
                  display tracking is a Latin convention and crowds syllable
                  blocks, which already carry their own sidebearings. */}
              <span className="intro__wordmark">{wordmarkHead}</span>
              {hasX && <span className="intro__x">X</span>}
            </span>
          </span>
        </h1>

        <p className="intro__kicker-row">
          <span className="intro__kicker">{t(lang, 'intro.kicker')}</span>
        </p>

        <p id="intro-thesis" className="intro__thesis">
          {/* The thesis carries non-breaking spaces around 'X' in the string
              table itself — this line is the product's entire premise, and a
              wrap that leaves line one ending on '시즌 X' asserts the one thing
              the app promises not to contain. keep-all only stops breaks
              inside a word, so the spaces have to stop being spaces. */}
          <span className="intro__thesis-lead">{t(lang, 'intro.thesis')}</span>
          <Gloss k="intro.thesis" lang={lang} className="intro__thesis-sub" />
        </p>

        <hr className="rule intro__rule" />

        <dl className="intro__stats">
          {stats.map((s) => (
            <div className="intro__stat" key={s.key}>
              <dt className="intro__stat-label">
                <span className="intro__stat-lead">{t(lang, s.key)}</span>
                <Gloss k={s.key} lang={lang} className="intro__stat-sub eyebrow" />
              </dt>
              <dd className="intro__stat-value fig">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="intro__actions">
          <div className="intro__enter-wrap">
            <button
              type="button"
              className="intro__enter"
              onClick={dismiss}
              aria-label={t(lang, 'intro.enterAria')}
            >
              <span className="intro__enter-lead">{t(lang, 'intro.enter')}</span>
              <Gloss k="intro.enter" lang={lang} className="intro__enter-sub" />
            </button>
            {!reduced && (
              <span
                ref={barRef}
                className="intro__countdown"
                aria-hidden="true"
                style={{
                  /* Delay and duration together mean the bar is empty on its
                     first visible frame and full at the moment the screen
                     changes — a truthful readout of the time the reader has,
                     rather than one that opens at 31%. The delay is part of the
                     animation, so pausing on hover pauses both halves. */
                  animationDelay: `${CTA_DELAY_MS}ms`,
                  animationDuration: `${COUNTDOWN_MS}ms`,
                  animationPlayState: held || exiting ? 'paused' : 'running',
                }}
              />
            )}
          </div>
          <p className="intro__hint">
            <span>{t(lang, 'intro.hintKeys')}</span>
            <span className="intro__hint-sub">{t(lang, reduced ? 'intro.hintNoAuto' : 'intro.hintAuto')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
