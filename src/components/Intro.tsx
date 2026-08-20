import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Dataset } from '../data/types';
import { t, ui, type UiKey } from '../data/i18n';
import { tieTypeVisible } from '../data/edges';
import { ALL_WORK_IDS, WATCHED_NONE } from '../data/works';
import { useLang } from '../state/useLang';
import { hasStoredAnswer, useWatched, WATCHED_ALL } from '../state/useWatched';
import './Intro.css';
/* The three answers are styled beside the picker they are a shorthand for —
   see the note at the foot of WatchedPicker.css. */
import './WatchedPicker.css';

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
  /**
   * The reader picked "골라서 볼게요". The set is already committed by the time
   * this fires; all the host has to do is open the sheet once the curtain has
   * gone.
   */
  onOpenPicker?: () => void;
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

export function Intro({ dataset, onDone, onDismissBegin, onOpenPicker }: IntroProps): JSX.Element | null {
  const { lang } = useLang();
  /* The cold open prints three numbers and one of them is a claim about
     outcomes. See `stats` below. And as of Phase 4 it also SETS the thing those
     numbers are computed from. */
  const { watched, setWatched } = useWatched();
  const reduced = Boolean(useReducedMotion());
  const [exiting, setExiting] = useState(false);
  const [held, setHeld] = useState(false);

  /**
   * IS THIS READER BEING ASKED?
   *
   * Only somebody who has never answered. A returning reader gets exactly the
   * cold open they have always had — one CTA, the auto-advance, the countdown
   * hairline — because re-asking a settled question on every visit is how a
   * preference turns into a nag, and because their answer is already the thing
   * governing the screen behind this one.
   *
   * Read ONCE, on the first render. `hasStoredAnswer()` flips to true the
   * moment any of the three buttons commits, and a screen that reconfigured
   * itself out from under the click that configured it would be worse than a
   * stale read by every measure. The intro is unmounting anyway.
   */
  const askingRef = useRef<boolean | null>(null);
  if (askingRef.current === null) askingRef.current = !hasStoredAnswer();
  const asking = askingRef.current;

  /* How many works this reader is currently sealing. Live rather than read
     once: the returning-reader line below reports it, and a reader who opens
     the sheet from that line and comes back should not find the curtain still
     quoting the number they just changed. (In practice the curtain is gone by
     then — `openScope` dismisses — but a figure that reports state must track
     state, or it is a caption on a screenshot.) */
  const sealedWorks = ALL_WORK_IDS.length - watched.size;

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
  /* ── AND IT IS SWITCHED OFF ENTIRELY WHILE THE QUESTION IS UNANSWERED ─────
     PLAN-spoilers.md §4 makes this a condition of the cold open carrying a
     decision at all, and the reason is one sentence: an involuntary advance
     would choose an exposure the reader never chose, which IS the harm this
     whole layer exists to prevent. A 4.5s timer that resolves to "hide
     everything" is not neutral either — it is the app answering a question it
     just put to somebody, on their behalf, while they were still reading it.

     THE SCREEN NEVER PROMISES WHAT IT WILL NOT DO. '기다리면 저절로 열립니다'
     is not printed while the question is up, and neither is the countdown
     hairline — a readout of a clock that is not running is the same defect as
     a bar that opens at 31% full, which this file has already been through
     once. What replaces them is `intro.hintKeys`, unchanged, so the four ways
     out are still named, plus `intro.askSkip`, which is the part today's cold
     open never had to say: where a reader who takes one of them lands.

     THIS IS NOT A WALL. Escape, Enter, Space and a click anywhere all still
     dismiss, and `intro.askSkip` says on the screen both that they do and
     where the reader lands if they use them: sealed, with the badge that
     changes it named. */
  const barRef = useRef<HTMLSpanElement | null>(null);
  const remainingRef = useRef(AUTO_ADVANCE_MS);

  useEffect(() => {
    if (held || reduced || asking) return;
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
  }, [held, reduced, asking]);

  /* Any pending fade-out timer dies with the component. */
  useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

  /**
   * The three answers, and each one is a complete answer — including the third.
   *
   * `setWatched` writes storage, and storage is what `hasStoredAnswer()` reads
   * on the next visit, so committing here is what stops this screen asking the
   * same person the same question forever. "골라서 볼게요" commits too, and
   * commits the SEALED set: the reader has said "not yet, let me look at the
   * list", and the honest reading of that is the conservative one until they
   * tick something. The sheet is one frame away and every close path in it
   * commits again.
   */
  const answer = useCallback(
    (choice: 'none' | 'all' | 'pick') => {
      setWatched(choice === 'all' ? WATCHED_ALL : WATCHED_NONE);
      if (choice === 'pick') onOpenPicker?.();
      dismissRef.current();
    },
    [setWatched, onOpenPicker],
  );

  /**
   * THE RETURNING READER'S ROUTE BACK TO THE SETTING — and it is deliberately
   * not `answer('pick')`.
   *
   * That one commits WATCHED_NONE before opening the sheet, which is right for
   * somebody who has just said "let me choose" to a question they had never
   * answered, and wrong for somebody who answered weeks ago and ticked six
   * works: it would wipe the six on the way to the screen that shows them. This
   * opens the sheet and touches nothing.
   */
  const openScope = useCallback(() => {
    onOpenPicker?.();
    dismissRef.current();
  }, [onOpenPicker]);

  /* Enter / Space / Esc anywhere. Capture phase so the app's global shortcut
     handler never sees these while the cold-open owns the screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Escape') return;
      /* …EXCEPT ON THE ANSWERS THEMSELVES. This listener is on `window`, in the
         capture phase, and it preventDefaults — which is exactly right when the
         only control on the screen is a CTA that does the same thing the key
         does, and exactly wrong now that there are three controls that do three
         different things. Without this bail, tabbing to "다 봤어요" and
         pressing Enter would skip the question instead of answering it: the
         capture handler would swallow the key before the button ever saw it,
         and the reader would land on the opposite of what they pressed. Escape
         is not exempted — dismissing is dismissing wherever focus is. */
      if (
        e.key !== 'Escape' &&
        e.target instanceof HTMLElement &&
        e.target.closest('.wpq-btn, .intro__scope, .intro__open')
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      dismissRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  /* Announce the overlay and give the keyboard somewhere to start.
     While the question is up, that somewhere is the FIRST ANSWER rather than
     the dialog root — so a keyboard reader's Enter lands on "아직 안 봤어요"
     (the recoverable answer, and the one the product's own default already
     is) instead of on a skip. It is the same contract the single ENTER pill
     used to have: the key under the reader's finger does the primary thing. */
  const firstAnswerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (asking && firstAnswerRef.current) firstAnswerRef.current.focus();
    else rootRef.current?.focus();
  }, [asking]);

  /* ── the middle column is the only one of the three that is a claim ───────
     CAST 20 and PRIOR SEASONS 3 are participation and the number of programmes
     that exist; the plan keeps both at every watched-set, and works.ts lists
     neither the fact of an appearance nor the existence of a season as an
     outcome field. 관계 / CONNECTIONS is different: it is a tally over `type`,
     which IS an outcome field, and it was `dataset.edges.length` — the raw
     array — so at `bgx.watched='[]'` the cold open opened by telling a reader
     who has watched nothing that there are 52 relationships here, before they
     had touched anything. First screen, largest figures on it, and the first
     number the atlas says to a redacted reader. Measured: 52 at the default,
     24 at the empty set, which is the same pair the status bar and the rail's
     인연 tile print once the curtain lifts — the three used to be one number
     three times and now they are one QUESTION three times, asked with the
     shared predicate rather than with three copies of a filter.

     The docblock above this is emphatic that a number on this screen is the
     claim and that a claim which is false for 900ms is false. A claim that is
     false for the whole session is worse, and it is the same argument. */
  const stats: { key: UiKey; value: number }[] = [
    { key: 'intro.statCast', value: count(dataset.people) },
    {
      key: 'intro.statConnections',
      value: (dataset.edges ?? []).reduce((n, e) => n + (tieTypeVisible(e, watched) ? 1 : 0), 0),
    },
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
          {asking ? (
            /* THE QUESTION. Three answers, one click each, and the wording is
               "what have you seen" rather than "how much do you want hidden" —
               the reader knows their own viewing history and does not know
               which of this app's fields are dangerous. PLAN-spoilers.md §1.

               The buttons are `stopPropagation`-free on purpose: the stage
               above forwards every click to `dismiss`, and `answer` calls the
               same idempotent dismissal itself, so the bubble is a no-op rather
               than a race. */
            <div className="wpq-row">
              <p className="wpq-lead">
                {t(lang, 'intro.askLead').replace('{n}', String(ALL_WORK_IDS.length))}
              </p>
              <p className="wpq-q">{t(lang, 'watched.question')}</p>
              <div className="wpq-btns">
                <button
                  type="button"
                  ref={firstAnswerRef}
                  className="wpq-btn wpq-btn--none"
                  onClick={() => answer('none')}
                >
                  <span className="wpq-btn-lead">{t(lang, 'intro.askNone')}</span>
                  <span className="wpq-btn-sub">{t(lang, 'intro.askNoneSub')}</span>
                </button>
                <button type="button" className="wpq-btn" onClick={() => answer('all')}>
                  <span className="wpq-btn-lead">{t(lang, 'intro.askAll')}</span>
                  <span className="wpq-btn-sub">{t(lang, 'intro.askAllSub')}</span>
                </button>
                <button type="button" className="wpq-btn" onClick={() => answer('pick')}>
                  <span className="wpq-btn-lead">{t(lang, 'intro.askPick')}</span>
                  <span className="wpq-btn-sub">
                    {t(lang, 'intro.askPickSub').replace('{n}', String(ALL_WORK_IDS.length))}
                  </span>
                </button>
              </div>
              {/* The four ways out, named exactly as they always have been —
                  and then the sentence that is new, because until this round
                  taking one of them did not choose anything. */}
              <p className="wpq-skip">
                <span className="wpq-skip-keys">{t(lang, 'intro.hintKeys')}</span>
                <span>{t(lang, 'intro.askSkip')}</span>
              </p>
            </div>
          ) : (
            <>
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
                      /* Delay and duration together mean the bar is empty on
                         its first visible frame and full at the moment the
                         screen changes — a truthful readout of the time the
                         reader has, rather than one that opens at 31%. The
                         delay is part of the animation, so pausing on hover
                         pauses both halves. */
                      animationDelay: `${CTA_DELAY_MS}ms`,
                      animationDuration: `${COUNTDOWN_MS}ms`,
                      animationPlayState: held || exiting ? 'paused' : 'running',
                    }}
                  />
                )}
              </div>
              {/* WHAT THE READER ALREADY CHOSE, ON THE SCREEN THAT SHOWS ITS
                  CONSEQUENCES — reported from the preview, and the sharpest
                  version of it is three lines above this one: the stat row
                  prints 관계 24 for a sealed reader and 관계 52 for an open one,
                  and nothing on this screen said which of those the reader was
                  looking at, or why. A returning visitor met a curtain
                  identical to the pre-redaction one, carrying a quietly
                  redacted number, and concluded the feature had gone.

                  IT DOES NOT RE-ASK. The question is answered; asking again on
                  every visit is the nag `asking` exists to prevent. It states,
                  and it offers, in one line.

                  IT BORROWS THE BADGE'S OWN WORDS (`status.watchedBadge`)
                  rather than authoring a second phrasing of one state, so the
                  reader who meets the badge at the foot of the atlas thirty
                  seconds later recognises the sentence they have already read.

                  TWO WEIGHTS, BECAUSE THERE ARE TWO JOBS. When something is
                  sealed the block EXPLAINS: the figures above it are not the
                  dataset's, and a reader owed that explanation gets a 16px
                  title and a sentence.

                  When nothing is sealed it CONFIRMS, in one quiet line, and an
                  earlier version of this comment argued it should not exist at
                  all — "chrome reporting its own default back at them". That
                  was wrong twice over. It is not the default: the default is
                  fully sealed, so a reader seeing this line chose it. And the
                  omission had a cost that turned up in practice — the owner,
                  whose own browser holds a full set, twice read the unchanged
                  screen as proof the feature had never shipped. A reader who
                  has opened everything is precisely the one with no other
                  reason to look at the badge.

                  So: same slot, same door, a tenth of the weight. */}
              {sealedWorks === 0 && (
                /* `watched.hiddenNone` and `watched.open` — the picker's own
                   words for this state and for its own door. A third phrasing
                   of "nothing is hidden" is a third thing to keep true. */
                <p className="intro__open">
                  <span className="intro__open-state">{t(lang, 'watched.hiddenNone')}</span>
                  <button type="button" className="intro__open-act" onClick={openScope}>
                    {t(lang, 'watched.open')}
                  </button>
                </p>
              )}
              {sealedWorks > 0 && (
                <div className="intro__scope">
                  <p className="intro__scope-title">
                    {/* The badge's own shield, at the size this block is set
                        in. It is the only mark the two surfaces share, and it
                        is what makes the chip in the corner of the atlas
                        recognisable thirty seconds later as the same object. */}
                    <svg
                      className="intro__scope-shield"
                      width="15"
                      height="17"
                      viewBox="0 0 11 12"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M5.5 0.7 10 2.3v3.6c0 2.6-1.8 4.4-4.5 5.4C2.8 10.3 1 8.5 1 5.9V2.3Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.5 2.05 8.75 3.2v2.7c0 1.95-1.35 3.3-3.25 4.05C3.6 9.2 2.25 7.85 2.25 5.9V3.2Z"
                        fill="currentColor"
                        fillOpacity="0.55"
                        stroke="none"
                      />
                    </svg>
                    {t(lang, 'intro.scopeTitle').replace('{n}', String(sealedWorks))}
                  </p>
                  <p className="intro__scope-body">{t(lang, 'intro.scopeBody')}</p>
                  {/* `watched.open` — the picker's own words for its own door,
                      not a fourth phrasing. The reader meets this exact string
                      on the badge's tooltip and in the coach mark. */}
                  <button type="button" className="intro__scope-cta" onClick={openScope}>
                    {t(lang, 'watched.open')}
                  </button>
                </div>
              )}
              <p className="intro__hint">
                <span>{t(lang, 'intro.hintKeys')}</span>
                <span className="intro__hint-sub">
                  {t(lang, reduced ? 'intro.hintNoAuto' : 'intro.hintAuto')}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
