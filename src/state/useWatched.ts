import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ALL_WORK_IDS } from '../data/works';
import type { WatchedSet, WorkId } from '../data/works';

/**
 * What the reader has already watched, and therefore what the atlas may say.
 *
 * `works.ts` is the vocabulary — which works have an ending, and `isVisible`.
 * This is the reader's answer to it, held in one place so that every accessor
 * asks the same question of the same set.
 *
 * PHASE 2 IS PLUMBING, NOT BEHAVIOUR. The default here is `WATCHED_ALL`, which
 * is the whole registry, so `isVisible` returns true for every tagged claim and
 * nothing on screen moves. `setWatched` works and nothing in the UI calls it:
 * the auditor drives it directly to prove the wiring is real rather than
 * decorative. Phase 4 owns the control and owns flipping this default; see
 * PLAN-spoilers.md §4 and §7.
 *
 * THE PROVIDER IS NOT MOUNTED THIS PHASE either — App.tsx belongs to nobody in
 * Phase 2 — so in the shipped bundle the only live path is `currentWatched()`,
 * which returns `WATCHED_ALL`. Read the note on that function before using it.
 */

/** Where the reader's own answer lives between visits. */
const KEY = 'bgx.watched';

/**
 * Everything. The Phase 2 default, and the state in which this whole feature is
 * invisible: every scope is satisfied, so every claim renders exactly as it did
 * before any of this existed.
 *
 * Derived from `ALL_WORK_IDS` rather than written out, so a work added to the
 * registry is watched by default and cannot silently start hiding a claim from
 * readers who never chose to hide anything. It is the counterpart of
 * `WATCHED_NONE` in works.ts and deliberately lives here instead: `WATCHED_NONE`
 * is a fact about the vocabulary, this is a decision about a phase.
 */
export const WATCHED_ALL: WatchedSet = new Set(ALL_WORK_IDS);

/**
 * The reader's saved answer, or `WATCHED_ALL` if they have not given one.
 *
 * Unknown ids are dropped rather than kept, and the drop is structural: we walk
 * `ALL_WORK_IDS` and ask the stored array, never the other way round, so a
 * `WorkId` cast is never needed and an id from a future build lands nowhere.
 *
 * ABSENT AND CORRUPT BOTH RESOLVE TO THE PHASE DEFAULT, not to `WATCHED_NONE`.
 * Fail-closed governs a CLAIM whose tag nobody wrote; it does not govern the
 * reader's own setting, where resolving a damaged value to "hide everything"
 * would be a silent, unrequested behaviour change — the one thing this phase
 * may not do. PHASE 4 MUST REVISIT THIS LINE when the default flips: corrupt
 * must then resolve to the new default, and the constant below is the only
 * place that has to change.
 *
 * A stored `[]` is not corrupt. It is a reader who has watched nothing, and it
 * survives the round trip as an empty set.
 */
function readStored(): WatchedSet {
  if (typeof window === 'undefined') return WATCHED_ALL;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode, or storage disabled by policy */
    return WATCHED_ALL;
  }
  if (raw === null) return WATCHED_ALL;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return WATCHED_ALL;
    const set = new Set<WorkId>();
    for (const id of ALL_WORK_IDS) if (parsed.includes(id)) set.add(id);
    return set;
  } catch {
    return WATCHED_ALL;
  }
}

/**
 * Persist, in registry order so two identical sets store identical bytes.
 *
 * Only `setWatched` calls this. Mounting writes nothing: a reader who never
 * touched the control should not acquire a stored preference just by loading
 * the page, because the stored value is what Phase 4's flipped default will
 * have to distinguish itself from.
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
 * NOT MOUNTED IN PHASE 2. Wiring it into App.tsx is Phase 4's job, in the same
 * commit as the control that gives a reader something to change — a provider
 * with no control and no consumer would only make the diff look bigger than the
 * behaviour.
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
