/**
 * Whether this page publishes its test probes.
 *
 * `__atlasDebug` and `__atlasPaint` exist so the harness can measure the real
 * painter instead of doing OCR on a screenshot. They were published
 * unconditionally, which on a live site is a leak: `__atlasDebug` hands out the
 * live link list, and the whole redaction feature is about not handing out the
 * link list. `PLAN-spoilers.md` §7 files gating them as the one unfinished item
 * of Phase 0.
 *
 * ── why not `import.meta.env.DEV` ───────────────────────────────────────────
 * Because `tools/assert-visual.mjs` says "asserting the PRODUCTION build" and
 * means it — it builds, serves the real bundle, and refuses to run against the
 * dev server at all. Gating on DEV would blind the harness against precisely
 * the artefact it exists to check.
 *
 * ── why not a build-time flag ───────────────────────────────────────────────
 * `VITE_ATLAS_PROBES=1` would produce TWO BUNDLES. Dead-code elimination
 * differs, chunk hashes differ, and "the harness asserted the production build"
 * quietly becomes "the harness asserted a build that resembles it". The entire
 * release plan exists to preserve the property that the verified artefact and
 * the shipped artefact are the same bytes.
 *
 * ── why not a URL parameter ─────────────────────────────────────────────────
 * `?probe=1` would be shareable, and `PLAN-spoilers.md` §4 sets the rule that a
 * link may never raise the recipient's exposure. A URL switch turns an
 * accidental leak into a distributable one.
 *
 * ── so: armed at runtime, before boot ───────────────────────────────────────
 * One bundle. The probes compile in; whether they PUBLISH is decided here, once,
 * at module init. Playwright's `addInitScript` runs in every frame before any
 * page script, so the harness sets `__atlasProbe` and everything downstream sees
 * it. Nothing in `src/` reads these globals — they are pure publishers — so
 * arming changes exactly two window properties and no code path, no rendering
 * and no measurement.
 *
 * The `sessionStorage` clause is the human escape hatch: open devtools on
 * production, set it, reload, and the probes live for that tab only. Not
 * linkable, survives a reload, dies with the tab. Without it, diagnosing a
 * production-only rendering bug means shipping a build in order to look at it.
 */

declare global {
  interface Window {
    __atlasProbe?: boolean;
  }
}

function armed(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  if (window.__atlasProbe === true) return true;
  try {
    return window.sessionStorage.getItem('atlas.probe') === '1';
  } catch {
    /* Private mode, or storage disabled by policy. Not armed is the safe read. */
    return false;
  }
}

/** Evaluated once, at module init — after `addInitScript`, before the app. */
export const PROBES: boolean = armed();
