import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ALL_WORK_IDS, WATCHED_NONE } from '../data/works';
import type { WatchedSet, WorkId } from '../data/works';

/**
 * What the reader has already watched, and therefore what the atlas may say.
 *
 * `works.ts` is the vocabulary — which works have an ending, and `isVisible`.
 * This is the reader's answer to it, held in one place so that every accessor
 * asks the same question of the same set.
 *
 * PHASE 4 GAVE THE READER THE CONTROL AND FLIPPED THE DEFAULT. Phases 2 and 3
 * built this whole layer with `WATCHED_ALL` as the default, deliberately, so
 * that every one of their commits was invisible and could be audited against a
 * screenshot. That was scaffolding. The one line it was scaffolding for is
 * `WATCHED_DEFAULT` below, and it now reads `WATCHED_NONE`.
 *
 * The reader's own answer, once given, is what governs; the default only
 * governs somebody who has not given one. See the argument on
 * `WATCHED_DEFAULT`, and PLAN-spoilers.md §4.
 */

/** Where the reader's own answer lives between visits. */
const KEY = 'bgx.watched';

/**
 * Everything. The state in which this whole feature is invisible: every scope
 * is satisfied, so every claim renders exactly as it did before any of this
 * existed. It was the default through phases 2 and 3; it is now what a reader
 * gets by answering "다 봤어요", and it is the profile every pre-existing
 * assertion about this app is still measured in.
 *
 * Derived from `ALL_WORK_IDS` rather than written out, so a work added to the
 * registry lands in this set automatically and a reader who has said they have
 * watched everything does not silently start losing claims to a work that did
 * not exist when they answered.
 */
export const WATCHED_ALL: WatchedSet = new Set(ALL_WORK_IDS);

/**
 * WHAT A READER WHO HAS NOT ANSWERED GETS — and this is the decision of Phase
 * 4, not a detail of it. It is `WATCHED_NONE`: nothing seen, so no ending
 * stated.
 *
 * THE ARGUMENT IS ASYMMETRY, and everything else is support. An over-redacted
 * reader clicks one button and has the whole atlas back. An under-redacted
 * reader has seen 우승 beside a name and cannot un-see it. One error costs a
 * click and the other is permanent, so the default goes to the recoverable
 * side. That is PLAN-spoilers.md §4, and the reader who asked for this feature
 * — "I have only watched the genius … there are lots of spoilers" — is
 * precisely somebody the old default had already spoiled before they could
 * find a control.
 *
 * THE OBJECTION, AND THE ANSWER. Handing a stranger a sealed atlas with no idea
 * why is a real cost, and it is why this constant could not ship on its own.
 * Three things pay it, all of them in this phase:
 *
 *   1. The cold open ASKS. `Intro.tsx` puts the question — "what have you
 *      watched?" — in front of a first-time reader with three one-click
 *      answers, and its auto-advance is switched off until one is given, so
 *      the screen can never choose an exposure on the reader's behalf. Most
 *      readers therefore never meet this constant at all.
 *   2. The badge SAYS. `StatusBar.tsx` names how many works are sealed and
 *      opens the picker, so the sealed state is legible and one click from
 *      being over.
 *   3. Somebody arriving on a shared link, who is never shown the question,
 *      gets a banner that says the same thing. `App.tsx`.
 *
 * SO THE DEFAULT ONLY GOVERNS A READER WHO DECLINED TO ANSWER, and declining is
 * itself an answer we are allowed to read conservatively.
 *
 * IT IS NOT `WATCHED_NONE` BY ALIAS — it is a named constant, because the two
 * mean different things. `WATCHED_NONE` is a fact about the vocabulary (the
 * empty set of works). This is a decision about a product, and the next person
 * to revisit the decision should have one line to change and this note to argue
 * with.
 */
export const WATCHED_DEFAULT: WatchedSet = WATCHED_NONE;

/**
 * Has this reader ever answered the question?
 *
 * Distinguishing "has not answered" from "answered, and the answer is nothing"
 * is the whole reason the default is allowed to be conservative: a stored `[]`
 * is a reader who told us they have watched nothing, and they must not be
 * asked again or shown an arrival banner, while an absent key is somebody we
 * have never met. Two states that resolve to the same SET and to different
 * SCREENS.
 *
 * Exported so `Intro.tsx` and `App.tsx` can branch on it without either of them
 * growing a second copy of `KEY`. A storage exception reads as "answered", not
 * as "never asked": in private mode nothing we write can survive, so asking
 * again on every navigation would be a question the reader can never finish
 * answering.
 */
export function hasStoredAnswer(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true;
  }
}

/**
 * The reader's saved answer, or `WATCHED_DEFAULT` if they have not given one.
 *
 * Unknown ids are dropped rather than kept, and the drop is structural: we walk
 * `ALL_WORK_IDS` and ask the stored array, never the other way round, so a
 * `WorkId` cast is never needed and an id from a future build lands nowhere.
 *
 * ABSENT AND CORRUPT BOTH RESOLVE TO THE DEFAULT. Through phases 2 and 3 that
 * default was `WATCHED_ALL` and the note here said, in as many words, that
 * Phase 4 must revisit this line when the default flips. This is that revision:
 * both branches now resolve to `WATCHED_DEFAULT`, and a damaged stored value
 * therefore fails toward hiding rather than toward showing — which is the same
 * direction `isVisible` fails an untagged scope, for the same reason.
 *
 * A stored `[]` is not corrupt. It is a reader who has watched nothing, and it
 * survives the round trip as an empty set.
 *
 * THE FIRST PAINTED FRAME IS ALREADY REDACTED, which PLAN §4 makes a corollary
 * of the default rather than a nicety: this runs at module scope (see
 * `fallbackWatched`), before React has rendered anything, so there is no frame
 * on which an unanswered reader is exposed. No storage, private browsing and a
 * throwing `getItem` all land on the same branch.
 */
function readStored(): WatchedSet {
  if (typeof window === 'undefined') return WATCHED_DEFAULT;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode, or storage disabled by policy */
    return WATCHED_DEFAULT;
  }
  if (raw === null) return WATCHED_DEFAULT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return WATCHED_DEFAULT;
    const set = new Set<WorkId>();
    for (const id of ALL_WORK_IDS) if (parsed.includes(id)) set.add(id);
    return set;
  } catch {
    return WATCHED_DEFAULT;
  }
}

/**
 * Persist, in registry order so two identical sets store identical bytes.
 *
 * Only `setWatched` calls this. Mounting writes nothing, and that is now
 * load-bearing rather than tidy: `hasStoredAnswer()` is what tells the cold
 * open whether to ask and the link banner whether to appear, and a write on
 * mount would answer the question on the reader's behalf on the very first
 * frame — silently choosing the most conservative exposure and then never
 * offering the choice again.
 */
function writeStored(next: WatchedSet): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ALL_WORK_IDS.filter((id) => next.has(id))));
  } catch {
    /* quota, or private mode. A lost preference is not worth an exception. */
  }
}

/**
 * The mirror `currentWatched()` reads. Private, and named for what it is.
 *
 * Seeded from storage at import time rather than left as `WATCHED_ALL` and
 * corrected later: any module that computes something at import time would
 * otherwise bake in the most exposed possible answer, which is the wrong
 * direction to be wrong in.
 */
let fallbackWatched: WatchedSet = readStored();

/**
 * THE SET, FOR CODE THAT CANNOT HOLD A HOOK. A fallback, and only that.
 *
 * `headToHead.ts` and `graph/build.ts` are plain modules; their functions gain a
 * `watched` parameter this phase and need a value when a caller does not pass
 * one. That is what this is for, and it has exactly ONE sanctioned position:
 *
 *     export function ledgerFor(id: string, watched: WatchedSet = currentWatched())
 *
 * A default-parameter slot, in a module with no React in it. Written there it
 * reads as what it is — the answer used when nobody supplied a better one.
 *
 * ── WHAT BREAKS IF A COMPONENT CALLS IT ─────────────────────────────────────
 * This is a mutable module global with no subscription attached. `useContext`
 * tells React that a component depends on the set; this tells React nothing. A
 * component that calls `currentWatched()` in its body reads the right value
 * once, at first render, and then NEVER RE-RENDERS when the reader changes
 * their answer. It will keep painting the previous redaction until something
 * unrelated happens to re-render it, and it will disagree with the components
 * beside it that did use the hook.
 *
 * That staleness is not safe in one direction only. A reader who NARROWS their
 * set — the correction a person makes the moment they realise they are about to
 * be spoiled — leaves outcome text on screen in every component that read this
 * global. Stale here is a leak, not a cosmetic lag.
 *
 * So: in a component, or in anything a component calls during render, use
 * `useWatched()`. This file cannot enforce that, and no type can either, so the
 * enforcement is a grep the auditor can run and a reviewer can read:
 *
 *     grep -rn "currentWatched" src | grep -v "state/useWatched.ts"
 *
 * EVERY hit must be a `watched: WatchedSet = currentWatched()` default in a
 * module with no JSX in it — Phase 2 expects exactly three such modules:
 * `data/headToHead.ts`, `graph/build.ts` and `data/i18n/index.ts`. A hit in a
 * `.tsx` file, in a component body, or inside a hook is the bug this note is
 * about, and it will not announce itself at runtime.
 */
export function currentWatched(): WatchedSet {
  return fallbackWatched;
}

export interface WatchedState {
  watched: WatchedSet;
  /**
   * Replace the set. The SET IDENTITY IS PRESERVED exactly as given: the ledger
   * and the graph memoise on it, so copying the set here would turn every
   * update into a total cache miss and, worse, make two calls with the "same"
   * set miss each other.
   */
  setWatched: (next: WatchedSet) => void;
}

const WatchedContext = createContext<WatchedState | null>(null);

/**
 * Holds the reader's answer for the React tree.
 *
 * Mounted at the root of App.tsx, above `Atlas`, because a component cannot
 * consume a context it renders itself — see the note on `App`. Phase 4's
 * `WatchedPicker` is the first thing in the product to call `setWatched`.
 *
 * Written with `createElement` because the contract names this file `.ts`; that
 * is the only reason, and a later owner may rename it `.tsx` and use JSX
 * without changing anything else here.
 */
export function WatchedProvider({ children }: { children?: ReactNode }): ReactElement {
  /* Seeded from the module mirror, not from a second readStored() call: two
     calls would produce two sets with identical contents and different
     identities, and identity is what the ledger memoises on. */
  const [watched, setWatchedState] = useState<WatchedSet>(currentWatched);

  const setWatched = useCallback((next: WatchedSet) => {
    /* The mirror moves FIRST and synchronously. A non-React module called
       between this line and React's re-render must not answer with the old
       set. */
    fallbackWatched = next;
    writeStored(next);
    setWatchedState(next);
  }, []);

  /* And again during render, which is the belt to that braces: the provider
     renders before its children do, so a child calling into a plain module
     during render sees the value this render is about to paint with. The
     assignment is idempotent — StrictMode's double render writes the same set
     twice — and is a mirror of state rather than a second source of it. */
  fallbackWatched = watched;

  const value = useMemo<WatchedState>(() => ({ watched, setWatched }), [watched, setWatched]);
  return createElement(WatchedContext.Provider, { value }, children);
}

/** Warn once, in dev, about a consumer that is not under the provider. */
let warnedDetached = false;

/**
 * The reader's set, for a component. This is the one that re-renders.
 *
 * A consumer outside the provider gets the fallback set and a `setWatched` that
 * does nothing, rather than an exception: this is a wiring bug in our tree, and
 * throwing it into a reader's face turns our bug into their blank page. In dev
 * it says so on the console once, because "the picker does nothing" is
 * otherwise a silent and very confusing failure.
 */
export function useWatched(): WatchedState {
  const ctx = useContext(WatchedContext);
  if (ctx) return ctx;
  if (import.meta.env?.DEV && !warnedDetached) {
    warnedDetached = true;
    console.warn(
      '[bgx] useWatched() was called outside <WatchedProvider>. It is reading the ' +
        'fallback set and setWatched does nothing. Mount the provider above this component.',
    );
  }
  /* Read fresh rather than caching an object: a cached one would go stale if a
     provider exists elsewhere in the tree, and stale is the leak direction. The
     churn costs nothing downstream, because consumers memoise on the SET, whose
     identity is stable. */
  return { watched: currentWatched(), setWatched: () => {} };
}

export type { WatchedSet, WorkId };
