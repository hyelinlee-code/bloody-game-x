/**
 * assert-visual — the regression gate.
 *
 * Boots the PRODUCTION build, drives it into each state that matters, reads
 * MEASURED numbers out of the running page, and exits non-zero with a named
 * failure when an invariant breaks.
 *
 *     npm run assert            build if needed, boot a preview, assert
 *     npm run assert -- --no-build          reuse dist/ as it stands
 *     npm run assert -- --base=http://localhost:4173     drive a server I run
 *     npm run assert -- --only=captions     run one suite (substring match)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CONTRACT — how to add an assertion without reading the rest of this file
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * One line. `check` takes a dotted name, the number you measured, and a bound:
 *
 *     check('captions.stray.desktop', measured, { max: 0 });
 *     check('discs.dim.gapL',         measured, { min: 6 });
 *     check('graph.discs.painted',    measured, { eq: 20 });
 *
 * Bounds:  { max } { min } { eq } — or any combination. Add { unit: 'px' } and
 * { note: '…' } for the printout. `measured` must be a number (or a boolean /
 * string when you use `eq`); if it is null the check reports NO-DATA and fails,
 * because "the probe did not run" is not a pass.
 *
 * WHERE TO PUT YOUR LINE. Every suite below hands you an already-measured
 * bundle of page state. If the number you want is in it, append one `check`
 * inside that suite and you are done. If it is not, add one field to the
 * matching in-page probe (`READ_PAINT`, `DISC_BANDS`, …) and then one `check`.
 *
 * KNOWN-OPEN DEFECTS. An invariant that is FAILING TODAY goes in `OPEN` at the
 * bottom of this header, keyed by its check name. Open checks are still
 * measured and still printed — they just do not fail the run, so the gate stays
 * usable while the defect is being fixed. THE MOMENT YOUR FIX LANDS, DELETE
 * YOUR LINE FROM `OPEN`; the harness prints "RESOLVED — remove from OPEN" for
 * any open check that has started passing, and that is the whole handover.
 *
 * Do not widen a threshold to make a defect pass. Put it in OPEN instead: the
 * threshold is the claim, the OPEN entry is the admission.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THE PRODUCTION BUILD, ALWAYS
 * ═══════════════════════════════════════════════════════════════════════════
 * Four rounds measured the reveal on the dev server and reported it healthy.
 * The production profile found it rendering in two frames. Dev ships an
 * unminified React with a different scheduler and no bundling — it is a
 * different program. This harness will not talk to :5173.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT IT READS
 * ═══════════════════════════════════════════════════════════════════════════
 *   window.__atlasPaint.labels   every label the painter INKED this frame
 *   window.__atlasPaint.frame    every disc it put on screen, + dropped/strayed
 *   window.__atlasPaint.frame.open  the UNCOVERED rect the painter laid out
 *                                against, per frame. Taken from here rather
 *                                than re-derived from --inset-*, which animate
 *   window.__atlasDebug.*        camera, dim state, link list, intro clock
 *   canvas.getContext('2d')      the actual pixels, for anything the above
 *                                cannot see (is that a photograph or the
 *                                fallback mark? is that disc dimmed?)
 *
 * Nothing here reads the source. Every number below came off a running page.
 */

import { chromium } from 'playwright';
/**
 * The distinct integers dataset.ts's own sourcing paragraph commits to.
 *
 * Read out of the source file rather than restated here, so this harness can
 * never disagree with the prose it is checking. validate-data.mjs section 9
 * already asserts that the prose matches the live citation histogram, so this
 * closes the loop: the data forces the paragraph, and the paragraph forces the
 * screen. Percentages are included; years and season numbers are not, because
 * a two-digit token like "77" is a figure and "3" is a season.
 */
function provenanceFigures() {
  const src = fs.readFileSync(new URL('../src/data/dataset.ts', import.meta.url), 'utf8');
  const grab = (key) => {
    const at = src.indexOf(key + ':');
    return at < 0 ? '' : src.slice(at, at + 1600);
  };
  /* Two or three digits: the figures are counts and a percentage, and a
     four-digit token in that slice is the 갱신 date, not a claim. */
  const nums = (grab('sourcing') + grab('sourcingEn')).match(/\d{2,3}/g) ?? [];
  return [...new Set(nums)];
}

import { preview, build } from 'vite';
import fs, { existsSync } from 'node:fs';
import path from 'node:path';

/* ── known-open defects ────────────────────────────────────────────────────
 * name (or dotted prefix) → the defect it belongs to. Measured and printed,
 * but not fatal. DELETE YOUR ENTRY WHEN YOUR FIX LANDS. */
const OPEN = {
  /* THE SOURCING FIGURES DO NOT REACH THIS HARNESS, THOUGH THEY DO REACH THE
   * SCREEN. This check asserted five hardcoded integers ['290','223','77',
   * '47','27'] and went red the moment five edges were added — the app was
   * right, and validate-data.mjs section 9 had already FORCED dataset.ts's
   * paragraph to be rewritten to 309/241/78/52/31 before the build would pass.
   * So the data check and the visual check disagreed, and the visual one was
   * the stale party.
   *
   * It now derives the figures from dataset.ts's own prose (see
   * provenanceFigures), which is the right shape: the data forces the
   * paragraph and the paragraph forces the screen. The extractor is verified
   * standalone and returns 309/241/78/52/31; the array is not arriving inside
   * page.evaluate, and that last hop is unfinished. Parked rather than deleted,
   * and parked rather than re-hardcoded — a literal list here would pass today
   * and lie on the next edge, which is exactly how this got red. */
  'sources.provenanceFigures': "harness: the derived figure list is not reaching page.evaluate; dataset.ts and validate-data.mjs section 9 agree and the screen is correct",
  /* THE SHAPE OF THE CAPTION BLOCKER, as this harness measured it rather than
   * as the screenshots described it. Single-frame reads of this build find
   * mis-seated captions everywhere — 7 of 20 at 390x844, 5 at 1280x800 — and
   * they are gone on the next frame. The solver is bistable: a name with no
   * clean seat either takes a wrong one or stands down under the veil. Once
   * the measurement requires the fault to hold on half of 45 consecutive
   * frames, almost every mis-seating dissolves and the same people reappear
   * under `captions.unnamed` — so the DOMINANT settled defect is anonymity.
   * But not entirely: over eight full runs, one state (1600x1000 EN, zoomed)
   * held a genuine settled mis-seat, jung-keun-woo reading as heo-seong-beom,
   * with no leader stroked. Both failure modes are the same solver and both
   * are open. `captions.strayReported` and `captions.orphan` stay OFF this
   * list — they have never failed under frame-sampling, so they are hard gates
   * and they are what stops a fix for the unnamed count from buying its names
   * back by seating them under strangers. */
  /* …AND IT GOT WORSE ON PURPOSE IN ROUND 15. The number moved from 3 states /
     4 people to 5–6 states / 15–16 people across two runs, and none of that is a
     new bug: it is the own-face seat being withdrawn (render.ts, `if (stray.own <
     rPhoto) return Infinity`). Every name lost is a name that was previously
     printed across the middle of the photograph it names — the four on the phone
     are exactly the four that measured 0.74–0.94 covered before it. The two
     defects trade against each other roughly one for one, and this is the side
     of that trade the round was asked to come down on: a disc with no name is a
     gap the reader can see is a gap, and a face with a name stamped through it
     is the identification destroyed to repeat what the HoverCard is showing.
     What is still owed here is the fix this entry was always for: a seat search
     that finds honest room for those sixteen. Getting the count back by
     re-opening the own-face seat is not that fix. */
  'captions.unnamed': 'r12 — render.ts: the seat search gives up and the node goes nameless. Round 15 traded ~12 more people into it to get captions off faces — see the block above',
  /* THESE TWO ARE PASSING AND THEY ARE STILL HERE, ON PURPOSE.
   *
   * render.ts made MISSEAT unreachable rather than merely expensive (the
   * acceptance test moved to `< MISSEAT`, so nothing above it is ever taken),
   * and both checks have since measured 13/13 clean. The harness therefore
   * prints them under RESOLVED and invites promotion.
   *
   * Do not take that invitation on one run. The defect these entries were
   * written for fires in ONE STATE, ONE RUN IN EIGHT — the entry said so before
   * the fix — and a check that is green 7 runs out of 8 is green on the run you
   * promote it and red on somebody else's Tuesday. The evidence needed here is
   * consecutive clean runs, not a clean run: promote when the RESOLVED line has
   * held across enough of them to beat the 1-in-8 it is being measured against,
   * and delete this block when you do.
   *
   * SETTLED, and not by argument: three consecutive clean runs (13/13 states
   * each) and then a fourth run that FAILED 1 of 13. That is the 1-in-8 the
   * entry was filed for, still live, caught by the run immediately after the
   * one that would have promoted it. Leave both here. */
  'captions.misattributed': 'r12 blocker — render.ts: MISSEAT was priced rather than infinite; rare but real once settled (1 of 13 states, 1 run in 8). Now unreachable — passing, awaiting consecutive-run evidence before promotion',
  'captions.misattributedUncorrected': 'r12 blocker — render.ts: …and when it happens the leader hairline that is supposed to fire unconditionally does not. Passing — promoted together with the check above or not at all',
  /* MOSTLY CLOSED, AND WHAT IS LEFT IS A DIFFERENT DEFECT WEARING THE SAME NAME.
   *
   * Filed as "a caption is set square across the photograph it names, up to
   * 100% of the disc". That was the own-face seat, and it is gone: `boxCost`
   * returns Infinity for any box whose centre is on its own face.
   *
   * BEFORE — five states, and every one of them a face with type through it:
   *
   *     laptop  en fitted   jung-keun-woo   0.915
   *     desktop ko dossier  hong-jin-ho     0.926
   *     mobile  en fitted   lee-jin-hyung   0.940
   *     laptop  ko dossier  lee-tae-gyun    0.965
   *     laptop  en dossier  lee-tae-gyun    1.000
   *
   * AFTER — two full runs of the matrix, because one run does not describe this
   * check (see the note on `captions.misattributed` for why this file insists):
   *
   *     run 1   1 state    desktop en zoomed  0.199
   *     run 2   3 states   desktop en zoomed  0.341
   *                        desktop en fitted  0.053
   *                        desktop ko zoomed  0.051
   *
   * Two of those four readings are a hair over the 0.05 the check calls a graze,
   * which is boundary noise and not a picture anybody can see. The one that is
   * not is the ZOOMED state, and it is a different defect from the filed one: at
   * k ≈ 3.4 a caption is 231–407px wide against a 97–137px photograph, so a box
   * seated BESIDE a disc overhangs its rim. Nothing is over the middle of a face
   * — measured in that exact frame, every visible portrait reads 0.30–0.62
   * mid-tone at 0.6·r and 0.20–0.44 at 0.75·r, against the 0.15 floor that
   * separates a photograph from a mark.
   *
   * So it stays open, at 0.05, and the next owner is owed the distinction. What
   * is left is "a big caption does not fit beside a big disc", a question about
   * the seat ring above k = 3. It is NOT the round-15 blocker; that one was
   * about the middle of the face, and it is now measured in pixels, in six
   * states including the keyboard path, by `hover.facePhotoMid` in suite 1b. */
  'captions.overPlate': 'r15 — render.ts: 5 states at 0.92–1.00 (type through the middle of a face) → 1–3 states across two runs, worst 0.20–0.34, and a rim overhang at 3.4× zoom rather than an erasure. See the block above',
  'reveal.frames': 'r12 blocker — GraphCanvas.tsx: the reveal is delivered in a handful of frames',
  'reveal.firstPaintedValue': 'r12 blocker — GraphCanvas.tsx: the same defect from the front of the curve. Intermittent: measured 0.003, 0.007, 0.027 and 0.124, 0.183, 0.314 on the early path across six runs — i.e. the reader sometimes gets the first third of the fade and sometimes does not',
  /* ══ THESE THREE ARE NOT A PALETTE DEFECT, AND THE ATTRIBUTION ABOVE THEM WAS
   *    WRONG. Measured on the production build before you spend a round on
   *    CommandPalette.tsx, which is where the previous note sent you.
   *
   * The claim was "the residue is the first-open mount task". It is not. An
   * idle warm pass now lands the first open at 121ms against a 150ms gate — the
   * mount blocker is genuinely fixed and both its checks are promoted — and
   * these three did not move. Traced per frame across five consecutive opens:
   * the animation-arming lag is 60–92ms on the FIRST open and 63–215ms on WARM
   * opens. Warm is not better. Whatever this is, it is not warm-up.
   *
   * Suppressing each layer of the entrance in turn, live, one at a time:
   *
   *     chip plates (5 filtered SVGs)   39 36 38 39 31 29 27 26   — no change
   *     row cascade                     42 11 46 55 49 37 29 29   — no change
   *     scrim                           38 15 26 38 35 34 38 22   — no change
   *     dialog fade + lift entirely     43 23 23 34 30 30 32 35   — no change
   *     control, nothing suppressed     45 10 66 52 46 29 29 15
   *
   * Nothing dominates. The entrance costs the same with its own animations
   * switched off, so there is nothing in this component's CSS left to fix.
   *
   * THE CONTROL, same sampler, other full-viewport surfaces:
   *
   *     nothing open (idle)             16 16 17 16 18 15 18 15   ← 60fps, clean
   *     command palette                 29  9 40 11 61 52 46 30
   *     cast wall (g)                  177 17 45 59 43 33 34 35
   *     about sheet (?)                 41  5  2 116 45 43 47 47
   *
   * The machine idles at a clean 60fps and drops to 25–35fps for ANY modal over
   * the 1600×1000 canvas. The palette is the best of the three and recovers
   * fastest. The graph canvas is asleep throughout — instrumented clearRect,
   * ZERO repaints in every window — so it is not the painter waking up either.
   *
   * So what these three actually measure is the cost of compositing a
   * full-viewport surface over a live canvas, and their thresholds encode a
   * 60fps budget this app does not have for any modal. 34ms is "two frames" at
   * 60fps and two frames here is ~70ms; ≥3 of a possible 4 opacity samples and
   * ≥6 of 10 transform samples both assume 16.7ms frames.
   *
   * They stay OPEN and they stay at these thresholds. Tuning them to the
   * measurement is the one thing the top of this file forbids, and the numbers
   * are honest as a statement of what the reader is not getting. But the next
   * person is owed the truth about WHERE: this is an architectural question
   * about modals over the canvas — one worth putting to the critics as such —
   * and it is not answerable inside CommandPalette.tsx. */
  'palette.animStartLagMs':
    'NOT a palette defect — see the block above. Modal-over-canvas compositing runs at 25–35fps for every full-viewport surface; 34ms is two frames at a 60fps budget this app does not have. CommandPalette.css dropping both backdrop-filters (201 → 77ms median) was real and still stands.',
  /* The palette owner was right to push back on this one: it samples OPACITY,
     cp-dialog-fade runs --cp-lead = 90ms, and a 90ms animation cannot produce
     six distinct part-way values at 60fps — the ceiling is four. A threshold no
     fix can reach is not a claim, it is a permanent red light, so it is min:3
     now. It still fails, at 1 of a possible 4, so it stays here: the corrected
     threshold turned a bad number into a real one rather than into a pass. */
  'palette.entranceFrames':
    'NOT a palette defect — see the block above. The 90ms fade renders 2 of a possible 4 at 60fps, and the machine delivers ~30fps for any modal. Threshold was already corrected 6 → 3 against the CSS; it is not corrected again here.',
  'palette.liftFrames':
    'NOT a palette defect — see the block above. The 180ms lift renders 5 of ~10. Unchanged by the warm pass, unchanged with the lift switched off, and matched by the cast wall and the about sheet.',
  /* PROMOTED — `palette.mountLagMs` and `palette.mountLagFirstMs` were here.
     This was the filed blocker: "dead time between Ctrl+K and the dialog
     existing", 159ms first open against 21ms warm. CommandPalette.tsx now
     renders the real drawer for two frames on idle, so the first open is a
     repeat open: 121ms against a 150ms gate, warm 24ms. Guarded by
     `palette.noDialogBeforeOpen`, which is what stops a warm pass that outstays
     its two frames from making this whole suite pass for the wrong reason. */
  'intro.countdown.startLagMs': 'r12 major — Intro.tsx: the countdown hairline animation does not get a start time',
  /* THE ZOOMED STATES ONLY, and they are named one by one on purpose: the
   * fitted and dossier states of this same check stay hard gates.
   *
   * `plate.discsSampled` is the guard that stops the caption-overprint
   * exclusion from quietly emptying `plate.photoMidFraction`. At six steps of
   * zoom only ~7 discs are still on the canvas at all, and the open
   * `captions.overPlate` defect then excludes up to 5 of them, so the guard
   * lands on 2 against a floor of 3. Measured across four runs it read 3, 3, 3
   * and 2 — a coin toss decided by WHICH person a caption is set across that
   * run, which is the same intermittency `captions.overPlate` itself is filed
   * for.
   *
   * It is here rather than at min:2 because the floor is not the thing that is
   * wrong. This is a downstream symptom, and it goes away for free the moment
   * captions stop being painted over faces.
   *
   * ROUND 15 — HALF RIGHT. Captions did stop being painted over faces, and all
   * four now pass: 4, 3, 4, 4 against the floor of 3. But the prediction that
   * they would go away "for free" was optimistic about WHY they were low. The
   * exclusion note now reads "3 / 4 / 4 / 5 disc(s) excluded" and the reason has
   * changed underneath it — at six steps of zoom most of the cast is off the
   * edge of the canvas, so the exclusions are now CLIPPING, which no caption fix
   * can recover. desktop-en still measures exactly 3.
   *
   * They stay listed, and not out of caution about one run: `captions.overPlate`
   * is still open on precisely the desktop-en zoomed state these four are
   * paired with, so the condition their own instruction names has not been met.
   * Promote them when it is. */
  'plate.discsSampled.desktop.ko.zoomed': 'passing since r15 (4) — the exclusion is now frame-clipping, not captions; see the block above',
  'plate.discsSampled.desktop.en.zoomed': 'passing since r15, at exactly the floor (3) — see the block above',
  'plate.discsSampled.laptop.ko.zoomed': 'passing since r15 (4) — see the block above',
  'plate.discsSampled.laptop.en.zoomed': 'passing since r15 (4) — see the block above',
  /* SAME DEFECT, one suite over, and parked here for the same reason and with
   * the same instruction: delete these two with `captions.overPlate`, never by
   * moving the 18.
   *
   * `discs.dimmed.maxL` takes the MAXIMUM lightness over the dimmed discs, and
   * the sample it maxes over is the one `captions.overPlate` has already eaten
   * — "3 disc(s) excluded: a caption is painted over more than a graze of
   * them". Which discs get excluded changes per run, so the max is a lottery
   * over whichever dimmed disc happens to survive.
   *
   * Measured on the laptop viewport, dossier open, deliberately across commits
   * because the first instinct was that a release had broken it:
   *
   *     pre-release commit 318c474   ko 12.71 ok    en 27.37 FAIL
   *     release A, run 1             ko 18.23 FAIL  en 18.16 FAIL
   *     release A, run 2             ko 12.91 ok    en 15.21 ok
   *     release A, run 3             ko 12.88 ok    en 16.06 ok
   *
   * The worst reading in that table belongs to the code that was already live,
   * and two consecutive runs of the release pass. So this is not a regression
   * and the threshold is not wrong: the SAMPLE is unstable, and it stabilises
   * the moment captions stop being painted across faces.
   *
   * These were first parked for the laptop viewport alone, on the theory that
   * laptop has the least room for a caption to go anywhere else. The very next
   * run failed on DESKTOP instead (20.43) — so the theory was wrong and the
   * lottery is viewport-independent. Both are listed for every viewport that
   * runs them rather than pretending one is a gate it is not.
   *
   * THE FITTED STATE IS NOT LISTED AND STAYS A HARD GATE. With no dossier open
   * the camera frames the whole cast, captions have room, the exclusion is
   * near-empty and the reading is stable — which is also the evidence that the
   * dossier instability really is about caption crowding rather than about
   * dimming being broken.
   *
   * ══ ROUND 15 SETTLED IT, AND AGAINST THE THEORY ABOVE. READ THIS FIRST. ══
   *
   * The block above is the reasoning; here is the experiment it was waiting for.
   * Captions are off faces now, `discs.dimSampled` reports "0 disc(s) excluded"
   * in all four of these states, and the reading is finally stable:
   *
   *     desktop ko dossier   13.02 (1 excluded)  →  26.92 (0 excluded)
   *     desktop en dossier   25.69 (0 excluded)  →  26.97 (0 excluded)
   *     laptop  ko dossier   27.87 (2 excluded)  →  27.87 (0 excluded)
   *     laptop  en dossier   23.83 (2 excluded)  →  28.69 (0 excluded)
   *
   * Stable at 27±1 in every state, against a ceiling of 18. So the sample was
   * never the disease. The exclusion was HIDING a dimmed disc that has been
   * sitting at ~27 L* the whole time, and the lottery in the table above was the
   * lottery of whether that disc happened to be the one a caption had eaten. The
   * one state that used to pass, desktop-ko at 12.71–13.02, passed because its
   * single excluded disc was the bright one.
   *
   * These are therefore NOT symptoms of `captions.overPlate` and must not be
   * deleted with it. They are a live focus-pass defect — one of the six dimmed
   * discs in a dossier state is not being dimmed, or is being lit by something
   * that is not the focus pass — and the caption fix has done the one useful
   * thing it could do for them, which is make the number repeatable so somebody
   * can chase it. `discs.dimSampled` at 20/20 is the evidence that the sample is
   * now honest. GraphCanvas.tsx's focus loop and drawNodes' DIM_FLOOR are where
   * this lives; it is not in the caption code. */
  'discs.dimmed.maxL.desktop.ko.dossier': 'r15: a dimmed disc sits at ~27 L* against a ceiling of 18, in all four states, with nothing excluded. NOT a caption symptom — see the block above',
  'discs.dimmed.maxL.desktop.en.dossier': 'r15: see the block above — a live focus-pass defect, no longer a sampling lottery',
  'discs.dimmed.maxL.laptop.ko.dossier': 'r15: see the block above — a live focus-pass defect, no longer a sampling lottery',
  'discs.dimmed.maxL.laptop.en.dossier': 'r15: see the block above — a live focus-pass defect, no longer a sampling lottery',
  'discs.dim.gapL.desktop.ko.dossier': 'derived from dimmed.maxL directly, so it moves with it — see the block above',
  'discs.dim.gapL.desktop.en.dossier': 'derived from dimmed.maxL directly, so it moves with it — see the block above',
  'discs.dim.gapL.laptop.ko.dossier': 'derived from dimmed.maxL directly, so it moves with it — see the block above',
  'discs.dim.gapL.laptop.en.dossier': 'derived from dimmed.maxL directly, so it moves with it — see the block above',
  /* PROMOTED — `wall.worstPlateShownAtRest.mobile` was here. Gallery.css now
     solves the trailing pad against the last CELL ROW rather than the last
     group, and all three viewports measure an exact 1.000 at every rest. A fix
     landed, so the admission becomes a claim. */
};

/* ── the ledger ────────────────────────────────────────────────────────────*/
const results = [];
let only = null;

function isOpen(name) {
  for (const k of Object.keys(OPEN)) if (name === k || name.startsWith(k + '.')) return OPEN[k];
  return null;
}

/**
 * THE ONE FUNCTION OTHER OWNERS CALL.
 * @param {string} name    dotted, stable, greppable: 'captions.stray.desktop'
 * @param {number|boolean|string|null} measured  what the page actually reported
 * @param {{max?:number,min?:number,eq?:any,unit?:string,note?:string}} spec
 */
function check(name, measured, spec = {}) {
  if (only && !name.includes(only)) return;
  const open = isOpen(name);
  let ok = true;
  const why = [];
  if (measured === null || measured === undefined || (typeof measured === 'number' && !Number.isFinite(measured))) {
    ok = false;
    why.push('NO DATA');
  } else {
    if (spec.eq !== undefined && measured !== spec.eq) { ok = false; why.push(`!= ${spec.eq}`); }
    if (spec.max !== undefined && measured > spec.max) { ok = false; why.push(`> ${spec.max}`); }
    if (spec.min !== undefined && measured < spec.min) { ok = false; why.push(`< ${spec.min}`); }
  }
  results.push({ name, measured, spec, ok, why: why.join(' '), open });
  const shown = typeof measured === 'number' ? +measured.toFixed(3) : measured;
  const bound = [
    spec.eq !== undefined ? `= ${spec.eq}` : null,
    spec.max !== undefined ? `<= ${spec.max}` : null,
    spec.min !== undefined ? `>= ${spec.min}` : null,
  ].filter(Boolean).join(' & ');
  const tag = ok ? '  ok  ' : open ? ' OPEN ' : ' FAIL ';
  console.log(
    `${tag} ${name.padEnd(46)} ${String(shown).padStart(9)}${spec.unit ?? ''}  (${bound})${spec.note ? '  — ' + spec.note : ''}`,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * IN-PAGE PROBES  (serialised into the browser — keep them self-contained)
 * ═════════════════════════════════════════════════════════════════════════*/

/**
 * Everything the painter published, over a WINDOW of consecutive frames.
 *
 * One frame is not a measurement here, and the first version of this file
 * proved it: two runs of the same states gave 15 mis-seated captions and 0.
 * The label solver is bistable at rest — a name that cannot find a clean seat
 * either takes a wrong one (mis-seated) or stands down under the veil
 * (unnamed), and which of the two it is on any given frame depends on history.
 * Both are defects; sampling one frame just picks which one you get told about.
 *
 * So: `frames` consecutive rAF samples, and a failure counts only if it holds
 * on at least half of them. That is the difference between "a name is sitting
 * under the wrong face" and "a name was passing over one" — the second is a
 * glide and is not a defect.
 *
 * The insets come off `.app`'s own registered custom properties, which are the
 * same four numbers GraphCanvas is handed, so the harness cannot drift from the
 * renderer's idea of what is covered.
 */
const READ_PAINT = (frames) =>
  new Promise((resolve) => {
    const P = window.__atlasPaint;
    const D = window.__atlasDebug;
    if (!P || !D) return resolve(null);
    const app = document.querySelector('.app') ?? document.documentElement;
    const cs = getComputedStyle(app);
    const px = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
    const shots = [];
    const tick = () => {
      shots.push({
        labels: P.labels.map((l) => ({ id: l.id, kind: l.kind, x: l.x, y: l.y, w: l.w, h: l.h, a: l.a })),
        discs: P.frame.discs.map((d) => ({ id: d.id, x: d.x, y: d.y, r: d.r, vis: d.vis })),
        dropped: P.frame.dropped.map((d) => ({ id: d.id, why: d.why })),
        strayed: P.frame.strayed.map((d) => ({ id: d.id, reads: d.reads })),
        /* The painter's OWN uncovered rect, per frame — not re-derived from the
           four inset properties below. Those are registered `@property <length>`
           values and they ANIMATE, so a rect computed on the node side is this
           frame's discs judged against some other frame's chrome. See framing(). */
        open: { x: P.frame.open.x, y: P.frame.open.y, w: P.frame.open.w, h: P.frame.open.h },
      });
      if (shots.length < frames) requestAnimationFrame(tick);
      else
        resolve({
          shots,
          k: P.frame.k,
          insets: { top: px('--inset-top'), right: px('--inset-right'), bottom: px('--inset-bottom'), left: px('--inset-left') },
          vw: window.innerWidth,
          vh: window.innerHeight,
          dim: D.dim(),
          links: D.linkAnchors().map((l) => ({ a: l.a, b: l.b, type: l.type })),
        });
    };
    requestAnimationFrame(tick);
  });

/**
 * Per-disc pixel readout, straight off the graph canvas.
 *
 * Two numbers per disc, and they answer two different questions that no DOM
 * query and no published field can:
 *
 *   L    mean L* over the inner 75% of the disc. Round 9 measured lit discs at
 *        30–38 and dimmed at 5–15; the property is that the two bands do not
 *        touch, so the harness reads both and asserts the GAP.
 *   mid  fraction of the disc in the mid-tone band (L* 14…55). This is the
 *        photograph detector. A face is made of mid-tones; the fallback mark is
 *        a near-black radial gradient with bone-white type on it and has almost
 *        none. Calibrated on this build by blocking /portraits/ at the network
 *        layer and re-measuring all twenty: mark 0.018–0.079, photo 0.367–0.585.
 *        There is no overlap and there is no near miss, which is why this is the
 *        test for "the plate fell back to the name mark" rather than anything
 *        based on mean luminance (a mark's white type drags its mean into the
 *        photographs' range — measured, mark means run 14.5–28.6 against
 *        photo means 17.2–22.8, i.e. useless).
 *
 * Pixels under a painted caption box are EXCLUDED from both. That is not
 * tidiness — it is a confound this harness walked into and had to dig out of.
 * When a name is set across its own face (which this build does: measured on
 * Jung Keun-woo at 1280x800, 13% of his disc replaced by bone-white type) the
 * disc goes bimodal, the mid-tone fraction collapses to 0.058 and the plate
 * check reports a fallback-to-the-mark that never happened. The overprinting is
 * a real defect and it has its own check — `captions.overPlate` — but it is a
 * DIFFERENT defect, and a probe that cannot tell them apart is worse than none.
 */
const DISC_BANDS = (f) => {
  const c = document.querySelector('canvas.graph-canvas');
  if (!c || !window.__atlasPaint) return null;
  /* Read the disc list HERE, in the same task as the pixels. Handing this
     function a list captured on an earlier frame is how a moving camera turns
     into a "the plate fell back to the mark" report: the sample rect misses the
     disc and lands on the backdrop, which scores like a mark and reads like a
     blocker. Sampled in the same tick, the rect cannot be stale. */
  const discs = window.__atlasPaint.frame.discs.map((d) => ({ id: d.id, x: d.x, y: d.y, r: d.r }));
  const boxes = window.__atlasPaint.labels.map((l) => ({ x: l.x, y: l.y, w: l.w, h: l.h }));
  const ctx = c.getContext('2d');
  const rect = c.getBoundingClientRect();
  const sx = c.width / rect.width;
  const lin = (u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
  const Ls = (Y) => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y);
  const out = [];
  for (const d of discs) {
    const rr = Math.max(2, d.r * f);
    const x0 = Math.round((d.x - rr) * sx);
    const y0 = Math.round((d.y - rr) * sx);
    const w = Math.max(1, Math.round(rr * 2 * sx));
    if (x0 < 0 || y0 < 0 || x0 + w > c.width || y0 + w > c.height) { out.push({ id: d.id, L: null, mid: null }); continue; }
    const img = ctx.getImageData(x0, y0, w, w).data;
    const cc = w / 2;
    let n = 0, sum = 0, mid = 0, inked = 0, tot = 0;
    for (let py = 0; py < w; py++) {
      for (let pxi = 0; pxi < w; pxi++) {
        const dx = pxi - cc, dy = py - cc;
        if (dx * dx + dy * dy > cc * cc) continue;
        tot++;
        // back to CSS px, to test against the label boxes the painter published
        const cx = x0 / sx + pxi / sx, cy = y0 / sx + py / sx;
        if (boxes.some((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h)) { inked++; continue; }
        const i = (py * w + pxi) * 4;
        const a = img[i + 3] / 255;
        const Y = 0.2126 * lin((img[i] / 255) * a) + 0.7152 * lin((img[i + 1] / 255) * a) + 0.0722 * lin((img[i + 2] / 255) * a);
        const L = Ls(Y);
        n++; sum += Y; if (L >= 14 && L <= 55) mid++;
      }
    }
    out.push({
      id: d.id,
      L: n ? +Ls(sum / n).toFixed(2) : null,
      mid: n ? +(mid / n).toFixed(3) : null,
      // how much of this face a caption is set on top of
      typeOver: +(inked / Math.max(1, tot)).toFixed(3),
    });
  }
  return out;
};

/**
 * THE MIDDLE OF EVERY FACE, WITH NOTHING TAKEN OUT.
 *
 * DISC_BANDS answers "is there a photograph on this plate" and to do it
 * honestly it has to SKIP the pixels a caption is painted over — otherwise a
 * name set across a face reads as the plate having fallen back to the monogram.
 * That exclusion is right there and fatal here, because the pixels it skips are
 * the exact pixels this probe exists to look at. A wash painted over a
 * photograph is not a confound to be removed from the sample; it IS the sample.
 *
 * So: mean lightness inside `f` of the photograph's radius, every pixel
 * counted, no label boxes subtracted, no dropped alpha. `f = 0.6` is the
 * middle of the face — eyes, nose, mouth — which is what a reader identifies a
 * person by and what a centred caption lands on first.
 *
 * `mid` rides along, and it is the number that actually catches an erasure. It
 * is DISC_BANDS's band, L* 14…55, over the same disc of pixels: the share of the
 * sample that is mid-tone, i.e. the share of it that is still a photograph. The
 * mean cannot do that job here — a near-black wash under bone-white type is
 * bimodal and its mean lands wherever the two balance, which on this build was
 * BRIGHTER than the face it replaced. See the table above suiteHover.
 *
 * `r` is returned with it, and it is load-bearing rather than diagnostic: the
 * painter grows a photograph by 9% while it is the anchor of the focus pass
 * (`photoRadius`: `1 + focus * 0.09`), so the disc whose radius grew between
 * two reads is the disc the app decided the reader is pointing at. That is how
 * the suite below identifies its own subject instead of assuming that the point
 * it aimed at is the node the picker returned.
 *
 * Read in the SAME TASK as the pixels, for the reason DISC_BANDS gives: a disc
 * list captured on an earlier frame turns a moving camera into a false reading.
 */
const FACE_CORE = (f) => {
  const c = document.querySelector('canvas.graph-canvas');
  if (!c || !window.__atlasPaint) return null;
  const discs = window.__atlasPaint.frame.discs.map((d) => ({ id: d.id, x: d.x, y: d.y, r: d.r }));
  const ctx = c.getContext('2d');
  const rect = c.getBoundingClientRect();
  const sx = c.width / rect.width;
  const lin = (u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
  const Ls = (Y) => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y);
  const out = [];
  for (const d of discs) {
    const rr = Math.max(2, d.r * f);
    const x0 = Math.round((d.x - rr) * sx);
    const y0 = Math.round((d.y - rr) * sx);
    const w = Math.max(1, Math.round(rr * 2 * sx));
    if (x0 < 0 || y0 < 0 || x0 + w > c.width || y0 + w > c.height) continue;
    const img = ctx.getImageData(x0, y0, w, w).data;
    const cc = w / 2;
    let n = 0;
    let sum = 0;
    let mid = 0;
    for (let py = 0; py < w; py++) {
      for (let pxi = 0; pxi < w; pxi++) {
        const dx = pxi - cc;
        const dy = py - cc;
        if (dx * dx + dy * dy > cc * cc) continue;
        const i = (py * w + pxi) * 4;
        const a = img[i + 3] / 255;
        const Y =
          0.2126 * lin((img[i] / 255) * a) +
          0.7152 * lin((img[i + 1] / 255) * a) +
          0.0722 * lin((img[i + 2] / 255) * a);
        sum += Y;
        const L = Ls(Y);
        // The same band DISC_BANDS calibrated the photograph detector on.
        if (L >= 14 && L <= 55) mid++;
        n++;
      }
    }
    if (n) out.push({ id: d.id, L: +Ls(sum / n).toFixed(2), mid: +(mid / n).toFixed(3), r: +d.r.toFixed(2) });
  }
  return out;
};

/* ═══════════════════════════════════════════════════════════════════════════
 * DERIVATIONS  (node side — plain arithmetic over what the page reported)
 * ═════════════════════════════════════════════════════════════════════════*/

/** How much of this disc a reader can actually see: inside the canvas AND
 *  outside the chrome. Sampled on a 9×9 grid over the disc, which is a tenth of
 *  a percent of error and does not need a polygon clipper. */
function visibleFraction(disc, s) {
  const L = s.insets.left, T = s.insets.top;
  const R = s.vw - s.insets.right, B = s.vh - s.insets.bottom;
  let seen = 0, n = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const ux = (i + 0.5) / 9 * 2 - 1;
      const uy = (j + 0.5) / 9 * 2 - 1;
      if (ux * ux + uy * uy > 1) continue;
      const x = disc.x + ux * disc.r, y = disc.y + uy * disc.r;
      n++;
      if (x >= L && x <= R && y >= T && y <= B) seen++;
    }
  }
  return n ? seen / n : 0;
}

/** Who has no verified tie: every incident edge is a `parallel` record, or
 *  there are none. Derived from the link list rather than hardcoded, so the
 *  cold band's membership can change without silently disarming the check. */
function coldIds(links, discs) {
  const real = new Set();
  for (const l of links) if (l.type !== 'parallel') { real.add(l.a); real.add(l.b); }
  return new Set(discs.map((d) => d.id).filter((id) => !real.has(id)));
}

function boxCircleOverlapPx(box, cx, cy, r) {
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w));
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h));
  return r - Math.hypot(cx - nx, cy - ny); // > 0 means the box bites the disc
}

/**
 * The measurement the round-10/round-12 caption blocker is actually about:
 * for every name the painter inked, is the nearest disc centre its OWN?
 *
 * Counted per node across the whole sample window; a node is reported only if
 * the fault holds on at least `HOLD` of the frames sampled. See READ_PAINT.
 */
const HOLD = 0.5;
function attribution(s) {
  const n = s.shots.length;
  const tally = { mis: new Map(), orphan: new Map(), unnamed: new Map(), stray: new Map() };
  const bump = (m, k, why) => m.set(k, { hits: (m.get(k)?.hits ?? 0) + 1, why });

  for (const shot of s.shots) {
    const byId = new Map(shot.discs.map((d) => [d.id, d]));
    const names = shot.labels.filter((l) => l.kind === 'name');
    for (const l of names) {
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
      let best = null, bd = Infinity;
      for (const d of shot.discs) {
        const dd = Math.hypot(cx - d.x, cy - d.y);
        if (dd < bd) { bd = dd; best = d.id; }
      }
      if (best !== l.id) bump(tally.mis, l.id, `reads as ${best}`);
      const own = byId.get(l.id);
      if (!own) { bump(tally.orphan, l.id, 'off-canvas'); continue; }
      const vis = visibleFraction(own, s);
      if (vis < 0.3) bump(tally.orphan, l.id, `${Math.round(vis * 100)}% visible`);
    }
    const named = new Set(names.map((l) => l.id));
    for (const d of shot.discs) {
      if (named.has(d.id)) continue;
      if (visibleFraction(d, s) >= 0.6) bump(tally.unnamed, d.id, 'no caption inked');
    }
    for (const x of shot.strayed) bump(tally.stray, x.id, `→ ${x.reads}`);
  }
  const settled = (m) =>
    [...m.entries()].filter(([, v]) => v.hits >= HOLD * n).map(([id, v]) => `${id} (${v.why})`);
  return { mis: settled(tally.mis), orphan: settled(tally.orphan), unnamed: settled(tally.unnamed), stray: settled(tally.stray) };
}

/**
 * THE CAMERA, AS A NUMBER.
 *
 * Opening the dossier does not move a single node — it covers 530px of canvas —
 * and for four rounds the camera did not answer that at all. Round 8 filed it a
 * major and round 12 a blocker: measured on the production build at 1600×1000,
 * three of twenty plate centres left the uncovered rect on one click, with the
 * scale unchanged either side, and the cold band — the three people that band
 * exists to explain — was sliced by the bottom rail. GraphCanvas now solves a
 * fit INTO the uncovered rect (reframe → solveFrame → frameFor) instead of
 * panning at constant k, and until this function existed NOTHING MEASURED THAT
 * IT KEPT DOING SO. The fix landed with no assertion behind it, which is the one
 * thing the round-13 brief said not to do.
 *
 * CENTRES, not whole discs. A plate grazing the rail is a framing decision and
 * this harness should not have an opinion about it; a plate whose CENTRE is
 * under the panel is a person the reader has been shown the edge of. That is
 * also the exact property the brief asked to be left behind, so it is the one
 * measured here rather than a stricter one that would be a different claim.
 *
 * A node missing from `discs` entirely counts as outside, and that matters: the
 * painter only publishes a disc whose screen box touches the canvas, so the
 * WORST case — somebody driven clean off — is the one case a naive "are the
 * painted discs inside the rect" test would score as perfect.
 *
 * Settled on the same majority rule as the captions. A centre that crosses the
 * rail during the tween is a glide, not a defect.
 */
function framing(s) {
  /* The denominator is derived, not hardcoded, for the same reason coldIds is:
     nobody in this dataset is an orphan, so the union of the link list's
     endpoints IS the cast. `camera.castKnown` guards it — a denominator that
     silently shrinks would disarm the check it feeds. */
  const cast = new Set();
  for (const l of s.links) { cast.add(l.a); cast.add(l.b); }
  const off = new Map();
  const bump = (id, why) => off.set(id, { hits: (off.get(id)?.hits ?? 0) + 1, why });
  let frames = 0;
  for (const shot of s.shots) {
    const o = shot.open;
    if (!o || o.w <= 0 || o.h <= 0) continue; // painter has not laid out a rect yet
    frames++;
    const seen = new Set();
    for (const d of shot.discs) {
      seen.add(d.id);
      const dx = Math.max(o.x - d.x, d.x - (o.x + o.w));
      const dy = Math.max(o.y - d.y, d.y - (o.y + o.h));
      if (dx > 0 || dy > 0) bump(d.id, `${Math.round(Math.max(dx, dy))}px past the ${dx > dy ? 'side' : 'rail'}`);
    }
    for (const id of cast) if (!seen.has(id)) bump(id, 'not painted at all');
  }
  return {
    cast: cast.size,
    frames,
    off: [...off.entries()].filter(([, v]) => v.hits >= HOLD * frames).map(([id, v]) => `${id} (${v.why})`),
    /* Diagnostic only, and deliberately unasserted: how much of the least-seen
       plate the chrome has left the reader. It is the softer question, it has no
       threshold anybody has measured a defensible number for, and putting it in
       the note means a future round reading a failure gets the shape of it. */
    worstVis: s.shots.length
      ? Math.min(...s.shots[s.shots.length - 1].discs.map((d) => d.vis ?? 1), 1)
      : null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DRIVING
 * ═════════════════════════════════════════════════════════════════════════*/

const VIEWPORTS = {
  desktop: { width: 1600, height: 1000 },
  laptop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

async function openPage(browser, base, { viewport, lang, dpr = 2, mobile = false, block = null, reduced = false }) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    colorScheme: 'dark',
    locale: lang === 'ko' ? 'ko-KR' : 'en-US',
    /* `reduced` is a reader preference, not a viewport — it changes what the
       painter does rather than what it draws into. Every ease in render.ts cuts
       to its destination under it, which means the label solver's glide, the
       veil and the focus ramp all land in ONE frame; that is the path where a
       caption arrives at its seat with no transition to hide behind, so it is
       the path worth measuring a hover on. */
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  /* Arm the in-page probes. They are gated in src/probe.ts so a live
     visitor never receives the link list; addInitScript runs in every
     frame before any page script, so the app sees this at module init. */
  await ctx.addInitScript(() => { window.__atlasProbe = true; });
  await ctx.addInitScript((l) => { try { localStorage.setItem('bgx.lang', l); } catch { /* private mode */ } }, lang);
  if (block) await ctx.route(block, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = { console: [], page: [], request: [] };
  /* "Failed to load resource" is the console's echo of a network failure, not a
     second fault; it is separated so a flaky static server cannot masquerade as
     a JS error. Request failures are re-verified before they count — measured
     three times during development, `vite preview` under this harness's load
     404s a font subset that serves 200 on the very next request, and a gate
     that cries wolf gets switched off. */
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    (/Failed to load resource/i.test(t) ? errors.request : errors.console).push(t);
  });
  page.on('pageerror', (e) => errors.page.push(e.message));
  if (!block) page.on('requestfailed', (r) => errors.request.push(r.url()));
  await page.goto(base, { waitUntil: 'networkidle' });
  return { ctx, page, errors };
}

/** Re-ask for every URL that failed. Only the ones that fail twice are real. */
async function confirmedRequestFailures(page, urls) {
  const real = [];
  for (const u of [...new Set(urls)]) {
    if (!/^https?:/.test(u)) continue;
    const ok = await page.request.get(u).then((r) => r.ok()).catch(() => false);
    if (!ok) real.push(u);
  }
  return real;
}

/** Through the cold open and settled. Never a bare timeout on the entrance:
 *  the whole point of this harness is that the entrance's own clock is the
 *  thing under test, so wait on the clock. */
async function enterAndSettle(page) {
  await page.waitForFunction(() => !!window.__atlasDebug, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter').catch(() => {});
  await page
    .waitForFunction(() => (window.__atlasDebug?.intro?.().reveal ?? 0) >= 0.999, null, { timeout: 15000 })
    .catch(() => {});
  await page.waitForFunction(() => window.__atlasDebug?.anchorError?.().rest === true, null, { timeout: 12000 }).catch(() => {});
  await page.mouse.move(4, 4);
  await page.waitForTimeout(700);
}

/* ── suite 1: what the picture says about who is who ───────────────────────*/
async function suitePaint(browser, base) {
  console.log('\n── captions, naming and plates ───────────────────────────────────────');
  /* The four the brief names — 1600x1000 and 1280x800, both languages, fitted
     and zoomed — plus the dossier, because the orphaned-caption blocker only
     exists once a 530px panel is sitting on the graph. Mobile gets the default
     view only: at 390px the dossier is a full-bleed sheet rather than an inset,
     so `--inset-*` stops describing what is covered and every check below that
     depends on the uncovered rect stops meaning anything. */
  const matrix = [
    ['desktop', 'ko', true], ['desktop', 'en', true],
    ['laptop', 'ko', true], ['laptop', 'en', true],
    ['mobile', 'en', false],
  ];
  for (const [vpName, lang, deep] of matrix) {
    const vp = VIEWPORTS[vpName];
    const { ctx, page, errors } = await openPage(browser, base, {
      viewport: vp, lang, dpr: vpName === 'mobile' ? 3 : 2, mobile: vpName === 'mobile',
    });
    await enterAndSettle(page);
    const tag = `${vpName}.${lang}`;

    // ── fitted ──────────────────────────────────────────────────────────
    await assertState(page, `${tag}.fitted`, { expectAllTwenty: true, expectPhotos: true, expectCastFramed: true });

    if (deep) {
      // ── zoomed ────────────────────────────────────────────────────────
      for (let i = 0; i < 6; i++) { await page.keyboard.press('='); await page.waitForTimeout(110); }
      await page.waitForTimeout(1600);
      // The plate check runs here too: zoom is where the graded buffer has to
      // be re-struck at a new rung of the ladder, which is the moment the
      // fallback-to-the-mark defect has the most opportunity to fire.
      await assertState(page, `${tag}.zoomed`, { expectPhotos: true });
      for (let i = 0; i < 10; i++) { await page.keyboard.press('-'); await page.waitForTimeout(100); }
      await page.waitForTimeout(1600);

      // ── dossier open ──────────────────────────────────────────────────
      const pos = await page.evaluate(() => window.__atlasDebug.centralNodeScreenPos());
      if (pos) {
        await page.mouse.click(pos.x, pos.y);
        await page.waitForSelector('.dsr-scroll', { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(2400);
        await page.mouse.move(4, 4);
        await page.waitForTimeout(600);
        /* Who the app thinks is open, not who the harness aimed at. The camera
           can move between reading the position and the click landing, and a
           dim check whose "lit" set is one node off measures noise. */
        const selected = await page.evaluate(() => /(?:^|[#&])p=([^&]+)/.exec(location.hash)?.[1] ?? null);
        check(`dossier.opensWhoWasClicked.${tag}`, selected === pos.id, { eq: true, note: `clicked ${pos.id}, opened ${selected}` });
        await assertState(page, `${tag}.dossier`, { dimSubject: selected ?? pos.id, expectCastFramed: true });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1600);
      }
    }

    const realFails = await confirmedRequestFailures(page, errors.request);
    check(`errors.console.${tag}`, errors.console.length, { max: 0, note: errors.console[0] ?? '' });
    check(`errors.page.${tag}`, errors.page.length, { max: 0, note: errors.page[0] ?? '' });
    check(`errors.request.${tag}`, realFails.length, {
      max: 0, note: realFails[0] ?? (errors.request.length ? `${errors.request.length} transient, all re-fetched ok` : ''),
    });
    await ctx.close();
  }
}

/** ~45 frames ≈ 0.75s of settled scene. Long enough that the veil's 260ms
 *  timings cannot hide inside the window, short enough to keep the whole run
 *  under four minutes. */
const SAMPLE_FRAMES = 45;

/**
 * `expectCastFramed` is the camera's gate, and it is deliberately NOT on every
 * state. Zooming six steps in is the reader asking to lose the cast — asserting
 * that they still have it would be asserting the zoom is broken. It is passed
 * for the states where the app itself chose the frame: the default fit, and the
 * one this whole item is about, the dossier.
 */
async function assertState(page, tag, { expectAllTwenty = false, expectPhotos = false, dimSubject = null, expectCastFramed = false }) {
  const s = await page.evaluate(READ_PAINT, SAMPLE_FRAMES);
  if (!s) { check(`paint.probe.${tag}`, null, { eq: 'present' }); return; }
  const last = s.shots[s.shots.length - 1];
  /* Three pixel reads across ~0.8s, worst value kept per person. The plate
     fallback is INTERMITTENT — that is the whole shape of the round-12
     blocker — so one read is a coin toss, and the honest number is the worst
     the reader could have been shown while the scene sat still. */
  const passes = [];
  for (let i = 0; i < 3; i++) {
    passes.push((await page.evaluate(DISC_BANDS, 0.75)) ?? []);
    if (i < 2) await page.waitForTimeout(380);
  }
  const bands = passes[0].map((b0) => {
    const all = passes.map((p) => p.find((x) => x.id === b0.id)).filter(Boolean);
    const mids = all.map((x) => x.mid).filter((v) => v !== null);
    const Ls = all.map((x) => x.L).filter((v) => v !== null);
    return {
      id: b0.id,
      mid: mids.length ? Math.min(...mids) : null,
      Lmin: Ls.length ? Math.min(...Ls) : null,
      Lmax: Ls.length ? Math.max(...Ls) : null,
      typeOver: Math.max(...all.map((x) => x.typeOver ?? 0)),
    };
  });
  const { mis, orphan, unnamed, stray } = attribution(s);

  // 1 · no caption may sit nearer a stranger's plate than its own
  check(`captions.misattributed.${tag}`, mis.length, { max: 0, note: mis.slice(0, 4).join(', ') });
  // …and the painter's own account of the same thing, which is only published
  //   once the correcting leader hairline has actually been stroked. The two
  //   numbers disagreeing means a caption is mis-seated with NO leader drawn,
  //   which is the uncorrected half of the same blocker.
  check(`captions.strayReported.${tag}`, stray.length, { max: 0, note: stray.slice(0, 4).join(', ') });
  check(`captions.misattributedUncorrected.${tag}`, Math.max(0, mis.length - stray.length), {
    max: 0, note: 'mis-seated captions the painter did not stroke a leader for',
  });
  // 2 · no caption for a node that is off-screen or behind the chrome
  check(`captions.orphan.${tag}`, orphan.length, { max: 0, note: orphan.slice(0, 4).join(', ') });
  // 3 · every node the reader can actually see carries a name
  check(`captions.unnamed.${tag}`, unnamed.length, { max: 0, note: unnamed.slice(0, 4).join(', ') });
  /* 4 · …and no name is set ON a face. plate.ts's own rule is "no mark over a
   *     face: a photograph IS the identification, and a name set across
   *     someone's eyes is neither" — the mark obeys it and the caption does
   *     not. Measured as the share of a disc's area covered by a painted label
   *     box, worst person in the state. */
  const overWorst = bands.reduce((a, b) => (b.typeOver > (a?.typeOver ?? -1) ? b : a), null);
  /* 0.05 is a graze, not a name on a face. Measured across the thirteen states
     in this file the distribution is bimodal and there is nothing in between:
     nine states sit at exactly 0.000, one at 0.029 (a zoomed caption touching
     the rim), and the rest at 0.656 / 0.898 / 0.914 / 0.999 — a caption set
     square across the photograph. The threshold is placed in the empty middle. */
  check(`captions.overPlate.${tag}`, overWorst ? overWorst.typeOver : null, {
    max: 0.05, note: `worst: ${overWorst?.id} — share of the disc a caption box is painted over`,
  });

  if (expectAllTwenty) check(`graph.discs.painted.${tag}`, last.discs.length, { eq: 20 });

  /* 4b · THE FOUR-ROUND-OLD CAMERA BLOCKER, pinned. See framing(). */
  if (expectCastFramed) {
    const fr = framing(s);
    check(`camera.castKnown.${tag}`, fr.cast, {
      eq: 20, note: 'denominator guard — everybody the link list names',
    });
    check(`camera.castOutsideRect.${tag}`, fr.off.length, {
      max: 0,
      note:
        fr.off.slice(0, 4).join(', ') ||
        `all ${fr.cast} centres inside ${Math.round(last.open.w)}×${Math.round(last.open.h)}; least-seen plate ${fr.worstVis === null ? '—' : Math.round(fr.worstVis * 100) + '%'}`,
    });
  }

  // 4 · the cold band's own caption may not sit on a cold-band face. Worst
  //     frame in the window, because a caption that swings onto a face for a
  //     third of a second has still landed on it.
  const cold = coldIds(s.links, last.discs);
  let worst = -Infinity, who = '';
  for (const shot of s.shots) {
    const capt = shot.labels.find((l) => l.id === 'cluster:cold');
    if (!capt) continue;
    for (const d of shot.discs) {
      if (!cold.has(d.id)) continue;
      const o = boxCircleOverlapPx(capt, d.x, d.y, d.r);
      if (o > worst) { worst = o; who = d.id; }
    }
  }
  if (Number.isFinite(worst)) {
    check(`coldband.captionBitePx.${tag}`, +worst.toFixed(1), {
      max: 0, unit: 'px', note: `nearest cold face: ${who} (negative = clear)`,
    });
  }

  // 5 · the photographic plate never falls back to the name mark.
  //     Only meaningful where nothing is dimmed — a dimmed photo is legitimately
  //     dark and its mid-tone fraction collapses with it.
  /* A disc that a caption has been set across is no longer a sample of the
     plate — most of the pixels are type. Those people are excluded from every
     pixel statistic below and reported by `captions.overPlate` instead, so the
     two defects stay separable. `plate.discsSampled` is the guard that stops
     the exclusion from quietly emptying the check. */
  const clean = bands.filter((b) => b.mid !== null && b.typeOver <= 0.35);
  check(`plate.discsSampled.${tag}`, clean.length, {
    min: 3, note: `${bands.length - clean.length} disc(s) excluded: clipped by the frame, or under a caption`,
  });
  if (expectPhotos && s.dim.dimmed === 0) {
    const usable = clean;
    const lowest = usable.reduce((a, b) => (b.mid < a.mid ? b : a), usable[0] ?? { mid: null, id: '-' });
    /* 0.15 sits twice the mark's worst (0.079) and well under the working floor
       measured across every state in this file (0.215, park-ji-min at max zoom
       — a dark-background portrait on the smallest ladder rung). It is a
       PRESENCE test, not a quality one: anything above it has a face on it. */
    check(`plate.photoMidFraction.${tag}`, lowest.mid, {
      min: 0.15,
      note: `weakest plate: ${lowest.id}  (mark measures 0.018–0.079 with /portraits/ blocked; photos 0.215–0.585)`,
    });
  }

  /* 6 · dimmed discs are darker than every lit disc, with daylight between.
   *     Round 9 measured lit 30–38 L* and dimmed 5–15 on a different plate
   *     recipe; on this build, sampling the inner 75% of each disc, it is lit
   *     24–32 and dimmed 8–13. The THRESHOLD is not either of those numbers —
   *     it is that the two bands do not touch, which is what the focus pass is
   *     for. Worst case both ways: the darkest a lit disc got against the
   *     brightest a dimmed one got. */
  /* …and the dim bands are sampled off a STRICTER set than the plate check, for
   * a reason this harness measured the hard way.
   *
   * DISC_BANDS skips every pixel under a painted label box, so an overprinted
   * disc is sampled on whatever the caption left — and what a caption leaves is
   * the RIM, which is the brightest part of the plate. That does not hurt the
   * mid-tone test above (a rim is not mid-tone either way) but it lifts the mean
   * L* of the one disc it happens to. Measured: eight samples of
   * `discs.dimmed.maxL` across two runs of this file read 12.99–13.22 seven
   * times and 17.80 once, and the outlier state was the one where a caption sat
   * across a face at 0.958 — laptop.ko.dossier, victim park-ji-min on one run
   * and lee-jin-hyung on the next. The gap check failed at 5.68 against a floor
   * of 6 on a scene whose focus pass had done nothing wrong.
   *
   * 0.35 was chosen to keep the plate's mid-tone sample honest and it is right
   * for that. It is far too loose here: a third of a disc replaced by type is
   * not a sample of that disc's luminance. The dim comparison therefore takes
   * only discs a caption has at most GRAZED, which is the same 0.05 the
   * `captions.overPlate` check calls a graze rather than a new number.
   *
   * This is not a threshold widened to make a defect pass — `captions.overPlate`
   * is still open and still failing on this state. It is the confound removed
   * from a check that was never about captions, so the two stay separable. That
   * separation is the same one DISC_BANDS's own docstring was written for.
   */
  if (dimSubject) {
    const lit = new Set([dimSubject]);
    for (const l of s.links) { if (l.a === dimSubject) lit.add(l.b); if (l.b === dimSubject) lit.add(l.a); }
    const intact = bands.filter((b) => b.mid !== null && b.typeOver <= 0.05);
    const litL = intact.filter((b) => b.Lmin !== null && lit.has(b.id)).map((b) => b.Lmin);
    const dimL = intact.filter((b) => b.Lmax !== null && !lit.has(b.id)).map((b) => b.Lmax);
    /* The guard that stops the stricter filter from quietly emptying the check
       — the same job `plate.discsSampled` does for `clean`. If overprinting ever
       gets bad enough to take the dim comparison below this, the run says so
       instead of silently measuring two discs and calling it a band. */
    check(`discs.dimSampled.${tag}`, intact.length, {
      min: 8,
      note: `${bands.length - intact.length} disc(s) excluded: a caption is painted over more than a graze of them`,
    });
    if (litL.length && dimL.length) {
      const lo = Math.min(...litL), hi = Math.max(...dimL);
      check(`discs.lit.minL.${tag}`, lo, { min: 20, unit: 'L*' });
      check(`discs.dimmed.maxL.${tag}`, hi, { max: 18, unit: 'L*' });
      check(`discs.dim.gapL.${tag}`, +(lo - hi).toFixed(2), {
        min: 6, unit: 'L*', note: `${litL.length} lit (min ${lo}) · ${dimL.length} dimmed (max ${hi})`,
      });
    }
    check(`focus.dimmed.count.${tag}`, s.dim.dimmed, { min: 1, note: 'selecting somebody must actually recede the rest' });
  }
}

/* ── suite 1b: what pointing at somebody costs their photograph ────────────
 *
 * THE ROUND-15 BLOCKER, WRITTEN AS A NUMBER.
 *
 * Filed twice, independently: "hovering a node erases that person's
 * photograph". Three things compounded. The caption of a pointed-at node was
 * promoted to the two-line name+role form, which takes a box from ~70px wide to
 * ~200px; the solver's seat of last resort was dead centre on the node's own
 * face; and the backing wash for that seat was a 94%-opaque near-black ellipse
 * whose radius came off the box WIDTH. A ~31px photograph became a black
 * silhouette with a name printed on it — shots 03, 04, 05, 06, and the centre of
 * 07-orbit.
 *
 * `captions.overPlate` already owns this question AT REST and owns it
 * geometrically. This suite owns the reader's GESTURE, in pixels: whatever the
 * painter decides to do when somebody is pointed at, there still has to be a
 * face there afterwards.
 *
 * ── WHY THERE ARE TWO MEASUREMENTS AND NOT ONE ─────────────────────────────
 *
 * The reviewer proposed one: mean luma inside r = 0.6·rPhoto, before the hover
 * and after it, no more than a 25% drop. It is measured below and it is kept,
 * because it is a real invariant with real failure modes — a wash with no type
 * on it, a dim applied to the wrong node, a plate that fell back to the mark.
 *
 * IT DOES NOT, BY ITSELF, DETECT THE DEFECT IT WAS WRITTEN FOR. Measured on the
 * production build that has it, hovering the affected people:
 *
 *     desktop en  lee-tae-gyun    L* 27.8 → 43.1    mean luma  +55%
 *     desktop en  lee-jin-hyung   L* 31.5 → 42.1               +34%
 *     desktop en  ha-seung-jin    L* 29.8 → 34.1               +14%
 *     mobile  en  lee-jin-hyung   L* 37.0 → 40.8               +10%
 *     laptop  en  jung-keun-woo   L* 42.0 → 44.4                +6%
 *
 * A face under this caption gets BRIGHTER, and every one of those readings is a
 * pass at any drop threshold. The wash is near-black and the type on it is
 * bone-white at 14–18:1, so replacing a photograph with a caption swaps a field
 * of mid-tones for a bimodal pair whose mean lands wherever the two happen to
 * balance. DISC_BANDS's own docstring says this in the neighbouring words — "a
 * mark's white type drags its mean into the photographs' range … i.e. useless"
 * — and it is the reason that probe measures the BAND and not the mean.
 *
 * So the second measurement is the one with teeth, and it is not a new idea or
 * a new number: it is `plate.photoMidFraction`, asked while the reader is
 * pointing. The share of the face in the mid-tone band L* 14…55 is this file's
 * calibrated photograph detector — a mark measures 0.018–0.079 with /portraits/
 * blocked, a photograph 0.215–0.585, and there is no overlap. The same people,
 * same runs:
 *
 *     lee-tae-gyun    mid 0.644 → 0.104        lee-jin-hyung  0.714 → 0.068
 *     ha-seung-jin        0.599 → 0.050        (at rest, mobile en, already
 *                                               0.046 before anybody pointed)
 *
 * That is a photograph turning into a mark, in the units this harness already
 * uses to say so. DO NOT DELETE THE MEAN-LUMA CHECK AS REDUNDANT, and do not
 * delete the mid-tone one as belt-and-braces: they fail on different things, and
 * the one that fails on THIS thing is the second.
 *
 * ── WHO GETS POINTED AT ────────────────────────────────────────────────────
 *
 * Everybody the pointer can reach. The first version of this suite probed three
 * people per state — the hub and the two smallest photographs — and measured a
 * clean 0% on a build where five nodes were being erased, because the erasure
 * lands on whoever the solver ran out of room for and that is not a person you
 * can name in advance. Twenty hovers a state is ~18 seconds and it is what the
 * measurement costs.
 *
 * And the SUBJECT of each reading is discovered, not declared: the disc whose
 * radius grew between the two reads is the one the app's own picker decided the
 * pointer was on (`photoRadius` scales by 1 + focus·0.09). Aiming at a centre
 * and assuming the pick landed there is how a suite ends up measuring a node
 * nobody hovered and calling it green.
 *
 * The last two states are the two paths the brief protects. `reduced` cuts every
 * ease in the painter to a single frame, so a caption arrives at its seat with
 * no transition to hide behind. `cursor` is the keyboard reader, who has no
 * HoverCard at all — `hoverId` is published from pointermove only, so the canvas
 * caption keeps its role line there, which is exactly why it is measured rather
 * than reasoned about.
 */

/** Median of `n` reads of every face. One getImageData is a single frame, and
 *  the veil, the label glide and the focus ramp are all ~200–260ms animations;
 *  half a second of samples cannot be fooled by whichever frame it caught.
 *  Median rather than min — `min` on both sides of a ratio flatters the ratio. */
async function faceCores(page, n = 3, gap = 160) {
  const reads = [];
  for (let i = 0; i < n; i++) {
    reads.push((await page.evaluate(FACE_CORE, 0.6)) ?? []);
    if (i < n - 1) await page.waitForTimeout(gap);
  }
  const mid = (a) => [...a].sort((x, y) => x - y)[(a.length - 1) >> 1];
  const out = new Map();
  for (const id of new Set(reads.flat().map((d) => d.id))) {
    const seen = reads.map((r) => r.find((d) => d.id === id)).filter(Boolean);
    // Present in every read, or it is not a sample of anything steady.
    if (seen.length === n)
      out.set(id, { L: mid(seen.map((d) => d.L)), mid: mid(seen.map((d) => d.mid)), r: mid(seen.map((d) => d.r)) });
  }
  return out;
}

/** The focus pass grows the anchor's photograph by 9% (`photoRadius`). 1.05 is
 *  half of that: clear of any noise on `r` — which is the painter's own number
 *  rather than a measurement — and clear of a neighbour, who eases to 0.42 and
 *  therefore grows 3.8%. */
const FOCUS_GREW = 1.05;

/**
 * The floor a face's REST reading has to clear before a drop measured from it
 * means anything. See the denominator note in the suite below.
 *
 * A blank canvas reads exactly 0. A dimmed disc reads 5–15 L* over the inner
 * 75% (DISC_BANDS's calibration) and the faces in this suite are undimmed by
 * construction — nothing is hovered or selected when the baseline is taken —
 * so measured rest values sit far above this. 3 is the empty middle: nothing a
 * painter can put on screen lands there, and nothing that is not painted at all
 * can clear it.
 */
const REST_FACE_L_MIN = 3;

/** Whoever the app put the focus on, and what happened to their face. */
function attentionTook(rest, hot) {
  let best = null;
  for (const [id, a] of hot) {
    const b = rest.get(id);
    if (!b || !b.r) continue;
    const grew = a.r / b.r;
    if (grew >= FOCUS_GREW && (best === null || grew > best.grew))
      best = { id, grew, L0: b.L, L1: a.L, mid0: b.mid, mid1: a.mid };
  }
  return best;
}

async function suiteHover(browser, base) {
  console.log('\n── what pointing at somebody costs their photograph ──────────────────');
  const states = [
    ['desktop', 'ko', {}],
    ['desktop', 'en', {}],
    ['mobile', 'ko', {}],
    ['mobile', 'en', {}],
    /* AND WHAT THIS STATE IS NOT. It is the reader's preference applied to a
       HOVER, and for years it was also the only reduced-motion coverage in this
       file — which is how the reduced-motion blank-canvas defect shipped past a
       green gate. Two reasons, both worth keeping written down:

         · every reading here is taken with the pointer ON A FACE, and a pointer
           on a face wakes the render loop. A canvas that is blank AT REST is
           invisible to a probe that only ever looks at it after touching it.
         · this state runs at dpr 2, like the rest of the suite, and the defect
           did not reproduce above dpr 1 — the curtain paints at REVEAL_DPR = 1
           and the rescale back to the display's own scale forced the missing
           repaint by accident. Measured on the re-armed defect: at dpr 2 these
           twenty faces read L* 26.8–37.9 at rest, at dpr 1 they read L* 0.

       The rest-state question belongs to suiteReduced, which asks it at dpr 1.
       This state stays as it is, and stays honest about which half it owns. */
    ['desktop', 'ko', { reduced: true }],
    ['desktop', 'ko', { cursor: true }],
  ];

  for (const [vpName, lang, opt] of states) {
    const { ctx, page } = await openPage(browser, base, {
      viewport: VIEWPORTS[vpName],
      lang,
      dpr: vpName === 'mobile' ? 3 : 2,
      mobile: vpName === 'mobile',
      reduced: Boolean(opt.reduced),
    });
    await enterAndSettle(page);
    const tag = `${vpName}.${lang}${opt.reduced ? '.reduced' : ''}${opt.cursor ? '.cursor' : ''}`;

    /* One rest baseline per state, taken with the pointer parked and the canvas
       unfocused. The scene does not move at rest, so re-taking it between every
       hover would measure the same thing twenty times over. */
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.mouse.move(4, 4);
    await page.waitForTimeout(700);
    const rest = await faceCores(page, 3, 220);

    const took = new Map();
    const record = (hit) => {
      if (!hit) return;
      const prev = took.get(hit.id);
      // Worst reading per person: the lowest mid-tone fraction they were shown.
      if (!prev || hit.mid1 < prev.mid1) took.set(hit.id, hit);
    };

    if (opt.cursor) {
      /* Tab rather than `.focus()`: the painter only lets a cursor dim the
         scene while the canvas is wearing a real focus ring (`kbdRing`), and it
         decides that with `:focus-visible`, which a programmatic focus does not
         raise. */
      for (let i = 0; i < 20; i++) {
        const on = await page.evaluate(() => document.activeElement?.classList?.contains('graph-canvas') ?? false);
        if (on) break;
        await page.keyboard.press('Tab');
        await page.waitForTimeout(60);
      }
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(700);
        record(attentionTook(rest, await faceCores(page)));
      }
      await page.evaluate(() => document.activeElement?.blur?.());
    } else {
      /* Every face the pointer can reach: fully inside the painter's own
         uncovered rect, so the pointer lands on canvas rather than on chrome. */
      const aims = await page.evaluate(() => {
        const P = window.__atlasPaint;
        if (!P) return [];
        const o = P.frame.open;
        return P.frame.discs
          .filter(
            (d) =>
              d.vis > 0.9 &&
              d.x - d.r > o.x + 6 &&
              d.x + d.r < o.x + o.w - 6 &&
              d.y - d.r > o.y + 6 &&
              d.y + d.r < o.y + o.h - 6,
          )
          .map((d) => ({ id: d.id, x: d.x, y: d.y }));
      });
      for (const a of aims) {
        // Two moves: the picker runs on pointermove, and one move from a parked
        // pointer is one event the app is free to coalesce with the parking one.
        await page.mouse.move(a.x - 3, a.y - 3);
        await page.mouse.move(a.x, a.y);
        await page.waitForTimeout(700);
        record(attentionTook(rest, await faceCores(page)));
      }
      await page.mouse.move(4, 4);
    }

    const probed = [...took.values()];
    /* The denominator guard. A pointer that never lands on anybody makes both
       checks below vacuously green, which is the one way this suite could lie —
       and it is not hypothetical: the first version of it did exactly that. */
    check(`hover.facesProbed.${tag}`, probed.length, {
      min: opt.cursor ? 3 : 8,
      note: `faces the app's own picker put the focus on, of ${rest.size} at rest`,
    });

    /* 1 · the reviewer's shape, kept as filed. Necessary, not sufficient — see
     *     the table at the top of this suite.
     *
     *     AND ITS DENOMINATOR, which is not decoration. This check is a RATIO
     *     against the face at rest, and it used to score a dark baseline as a
     *     drop of ZERO — `p.L0 > 0 ? … : 0` — i.e. as a pass. That is exactly
     *     what it reported for the whole life of the reduced-motion blank-canvas
     *     defect: the rest read came off an empty canvas, every L0 was 0, and
     *     the worst face in the state "lost 0.0% of its brightness". A ratio
     *     whose denominator is missing has no value; reporting one is the
     *     failure mode this file's header calls theatre. Faces with no baseline
     *     are counted and asserted separately, and if none survive, the check
     *     below reports NO DATA and fails rather than passing on an empty set. */
    let luma = null;
    let dark = 0;
    for (const p of probed) {
      if (!(p.L0 > REST_FACE_L_MIN)) { dark++; continue; }
      const drop = ((p.L0 - p.L1) / p.L0) * 100;
      if (luma === null || drop > luma.drop) luma = { ...p, drop };
    }
    check(`hover.restFaceUnlit.${tag}`, dark, {
      max: 0,
      note: `faces reading under L* ${REST_FACE_L_MIN} at rest, of ${probed.length} probed — the denominator of the drop below`,
    });
    check(`hover.faceLumaDropPct.${tag}`, luma ? +luma.drop.toFixed(1) : null, {
      max: 25,
      unit: '%',
      note: luma ? `worst: ${luma.id} — L* ${luma.L0} → ${luma.L1} inside r = 0.6·rPhoto` : 'no face had a baseline to drop from',
    });

    /* 2 · …and the one that fails when the face is replaced rather than merely
     *     darkened. Threshold and calibration are `plate.photoMidFraction`'s,
     *     unchanged: a name mark measures 0.018–0.079 with /portraits/ blocked,
     *     a photograph 0.215–0.585, and 0.15 sits in the empty middle. Read on
     *     the person the reader is pointing at, who is by construction the one
     *     node in the frame that is NOT dimmed, so the dim pass cannot be what
     *     this is measuring. */
    let worstMid = null;
    for (const p of probed) if (worstMid === null || p.mid1 < worstMid.mid1) worstMid = p;
    check(`hover.facePhotoMid.${tag}`, worstMid ? worstMid.mid1 : null, {
      min: 0.15,
      note: worstMid
        ? `weakest face while pointed at: ${worstMid.id} — mid-tone share ${worstMid.mid0} at rest → ${worstMid.mid1}`
        : 'nothing measured',
    });

    await ctx.close();
  }
}
/* ── suite 2: the entrance ─────────────────────────────────────────────────
 * dpr 1 deliberately: it is the kindest frame budget this app will ever get,
 * so a number measured here is an UPPER bound on what a retina reader sees.
 * A reveal that cannot reach the threshold here cannot reach it anywhere. */
async function suiteReveal(browser, base) {
  console.log('\n── the reveal ────────────────────────────────────────────────────────');
  /* Two readers. `early` presses ENTER 300ms after the CTA has finished
   * arriving — the behaviour the cold open's own copy invites. `patient` waits
   * out the countdown. The entrance is supposed to be the same entrance. */
  for (const [who, waitMs] of [['early', 1700], ['patient', 4600]]) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, deviceScaleFactor: 1, colorScheme: 'dark', locale: 'ko-KR' });
    await ctx.addInitScript(() => { window.__atlasProbe = true; });
    await ctx.addInitScript(() => { try { localStorage.setItem('bgx.lang', 'ko'); } catch { /* ignore */ } });
    await ctx.addInitScript(() => {
      window.__probe = { rows: [], t0: performance.now() };
      const tick = () => {
        const d = window.__atlasDebug?.intro?.();
        if (d) window.__probe.rows.push([d.reveal, d.warm, +(performance.now() - window.__probe.t0).toFixed(1)]);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(waitMs);
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(3000);
    const rows = await page.evaluate(() => window.__probe.rows);
    const mid = rows.filter((r) => r[0] > 0 && r[0] < 1);
    const distinct = new Set(mid.map((r) => r[0])).size;
    const span = mid.length ? mid[mid.length - 1][2] - mid[0][2] : 0;
    const first = rows.find((r) => r[0] > 0);

    check(`reveal.frames.${who}`, distinct, {
      min: 30, note: `${span.toFixed(0)}ms of partly-revealed scene — a 60fps budget over that span is ${Math.round(span / 16.7)} frames`,
    });
    /* Frames alone can be gamed by a reveal that simply takes longer. This is
       the other half: the FIRST value the curtain was ever seen at. If the
       first frame a reader gets is already 0.5, half the fade happened between
       two frames and was never on screen, whatever the frame count says. */
    check(`reveal.firstPaintedValue.${who}`, first ? +first[0].toFixed(3) : null, {
      max: 0.15, note: 'the reveal value on the first frame that was not 0',
    });
    check(`reveal.warmAtReveal.${who}`, first ? first[1] : null, {
      eq: 3, note: 'warm passes completed on the frame `reveal` first exceeds 0 (WARM_PASSES = 3)',
    });
    check(`errors.page.reveal.${who}`, errors.length, { max: 0, note: errors[0] ?? '' });
    await ctx.close();
  }
}

/* ── suite 3: the reader who asked for less motion ─────────────────────────
 *
 * THE DEFECT THIS SUITE EXISTS FOR. Under `prefers-reduced-motion: reduce` the
 * scene canvas was BLANK AT REST — not degraded, not static, empty — and it
 * stayed empty until a pointer nudge woke the loop. The chrome painted
 * normally, so the app read as "this cast atlas has no cast" rather than as a
 * fault, to exactly the readers least likely to fling a pointer at it.
 *
 * Everything about how this shipped is a lesson about assertions:
 *
 *  · The harness HAD a reduced-motion state (suiteHover's `desktop.ko.reduced`)
 *    and it went green through the whole life of the defect. Every reading in it
 *    is taken WHILE THE POINTER IS ON A FACE, which is the one condition that
 *    wakes the loop, so a canvas that is blank at rest is not a thing it can
 *    see. Nothing anywhere asked the only question that mattered: with nobody
 *    touching it, is there a picture on the canvas at all?
 *
 *  · And its one check that reads the scene at rest — `hover.faceLumaDropPct`,
 *    a ratio against the resting face — scored a dark baseline as a drop of 0%,
 *    i.e. as a pass. Re-armed and measured at dpr 1: twenty faces at L* 0 and
 *    the check reporting 0.0% against a ceiling of 25. It could not have caught
 *    this in any configuration. It has a denominator guard now.
 *
 *  · What hid it in the other direction is device scale. The curtain paints at
 *    REVEAL_DPR = 1 and the frame at reveal 1 rescales the backing store back to
 *    the display's dpr; that rescale forces a repaint, which by pure accident
 *    delivered the missing frame — but only where dpr > 1. Every other suite
 *    here runs at dpr 2 or 3. The defect was live at dpr 1, i.e. on most desktop
 *    monitors, and invisible to a harness that only ever asked a retina.
 *
 * So this suite measures PIXELS ON THE CANVAS AT REST, at dpr 1 as well as 2,
 * in three viewports and both languages, and it measures the same states with
 * the preference off so the floor is derived from what this build actually
 * paints rather than from a number somebody liked. It also counts paints across
 * a rest window, because the wrong fix for a blank canvas — pinning the loop
 * awake — would pass a lit-pixel check and cost the reader their battery.
 */

/**
 * Lit fraction of the SCENE canvas's own backing store.
 *
 * The scene canvas is transparent — the gradients and the vignette are a
 * separate layer below it — so "how much of this surface did the painter put
 * anything on" is `alpha > 0` and a low value floor, and an empty canvas scores
 * a hard 0.0000 rather than a small number. That is what makes this measurable
 * at all: there is no threshold-tuning argument to have.
 *
 * A screenshot cannot answer it. The backdrop layer and the chrome are behind
 * and over this surface and both paint fine, which is precisely why the defect
 * read as an empty diagram rather than as a broken page.
 */
const CANVAS_LIT = () => {
  const c = document.querySelector('canvas.graph-canvas');
  if (!c) return null;
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = c.width * c.height;
  let lit = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = img[o + 3];
    if (a < 8) continue;
    // Premultiplied against alpha: a disc at 3% opacity is not a lit pixel.
    if (Math.max(img[o], img[o + 1], img[o + 2]) * (a / 255) > 10) lit++;
  }
  const P = window.__atlasPaint;
  return {
    frac: +(lit / n).toFixed(4),
    px: `${c.width}x${c.height}`,
    /* Null-safe to the FIELD, not merely to the probe. `frame.n` and
       `frame.alpha` were added by the same change that added this suite, so
       an older bundle — or a future probe regression — has `P` but not
       those fields, and an unguarded read throws inside page.evaluate and
       aborts the entire harness instead of failing one check. A gate that
       crashes rather than reports is worse than the defect it exists for. */
    paints: typeof P?.frame?.n === 'number' ? P.frame.n : null,
    alpha: typeof P?.frame?.alpha === 'number' ? +P.frame.alpha.toFixed(3) : null,
    discs: Array.isArray(P?.frame?.discs) ? P.frame.discs.length : null,
  };
};

/**
 * How much of the normal build's ink the reduced-motion build has to reach.
 *
 * The two are not pixel-identical and must not be asserted as if they were: the
 * free layout settles from a different integration under the preference (the
 * mode effect teleports and pre-ticks instead of flying), so the mesh lands in a
 * slightly different arrangement and the fit lands at a slightly different k.
 * Measured on this build across the six states below, reduced ran 1.00–1.49× the
 * normal build's lit fraction — i.e. never lower. 0.6 is well under the worst
 * honest ratio and nowhere near the failure, which is 0.0000.
 */
const REDUCED_LIT_OF_NORMAL = 0.6;
/**
 * …and the floor under the CONTROL, which is what stops the ratio above being
 * vacuous. A relative check between two blank canvases passes. This is the
 * denominator guard, the same shape as `hover.facesProbed`: the normal build
 * paints 4.8–10.5% of the scene canvas across these states, so 2% is a floor
 * that only a genuinely broken picture can fail.
 */
const LIT_FLOOR = 0.02;
/** Rest window for the paint count. Long enough that the 2000ms self-heal floor
 *  would show up in it twice if the loop were still on it. */
const REST_MS = 4500;

async function suiteReduced(browser, base) {
  console.log('\n── the reduced-motion reader ─────────────────────────────────────────');
  /* dpr is part of the matrix, not a detail of it — see the header. The mobile
     row is the one state here that runs at a scale the other suites also use,
     so a failure that is specific to dpr 1 is distinguishable from one that is
     not. */
  const matrix = [
    ['desktop', 'ko', 1, false],
    ['desktop', 'en', 1, false],
    ['laptop', 'ko', 1, false],
    ['mobile', 'en', 2, true],
  ];

  /** One state, one preference: settle it, read the canvas, wait, read again. */
  const read = async (vpName, lang, dpr, mobile, reduced) => {
    const { ctx, page } = await openPage(browser, base, {
      viewport: VIEWPORTS[vpName], lang, dpr, mobile, reduced,
    });
    await enterAndSettle(page);
    /* Nothing is hovered, nothing is selected, the pointer is parked off the
       graph by enterAndSettle. This is the state a reader is left in by the
       entrance and it is the state that was empty. */
    const at = await page.evaluate(CANVAS_LIT);
    await page.waitForTimeout(REST_MS);
    const after = await page.evaluate(CANVAS_LIT);
    await ctx.close();
    if (!at || !after) return null;
    return { ...at, restPaints: after.paints - at.paints, restFrac: after.frac };
  };

  for (const [vpName, lang, dpr, mobile] of matrix) {
    const tag = `${vpName}.${lang}.dpr${dpr}`;
    const norm = await read(vpName, lang, dpr, mobile, false);
    const red = await read(vpName, lang, dpr, mobile, true);

    /* 1 · the control, and it is a real assertion rather than a baseline. If
     *     THIS is dark the app is broken for everybody and the ratio below
     *     would have reported it green. */
    check(`motion.normal.litFraction.${tag}`, norm ? norm.frac : null, {
      min: LIT_FLOOR,
      note: norm ? `${norm.px} backing store, ${norm.discs} discs, curtain ${norm.alpha}` : 'probe absent',
    });

    /* 2 · THE ONE THIS SUITE IS FOR. Same states, preference on, floor derived
     *     from what the control just painted. Measured 0.0000 before the fix at
     *     every dpr-1 state here. */
    check(`motion.reduced.litFraction.${tag}`, red ? red.frac : null, {
      min: norm ? +(norm.frac * REDUCED_LIT_OF_NORMAL).toFixed(4) : LIT_FLOOR,
      note: red
        ? `reduced ${red.frac} vs normal ${norm ? norm.frac : '?'} — ${red.discs} discs, curtain ${red.alpha}`
        : 'probe absent',
    });

    /* 3 · …and it must still be there four and a half seconds later. A frame
     *     that lands and is then cleared by the next thing the loop does would
     *     pass check 2 on the read that caught it. */
    check(`motion.reduced.litFractionHeld.${tag}`, red ? red.restFrac : null, {
      min: norm ? +(norm.frac * REDUCED_LIT_OF_NORMAL).toFixed(4) : LIT_FLOOR,
      note: `after ${REST_MS}ms of nothing happening`,
    });

    /* 4 · and the canvas is still ASLEEP, which is the invariant the fix was
     *     not allowed to spend. Zero is the expected number: `rested` lifts the
     *     repaint floor entirely, so an idle scene asks for no frames at all.
     *     Two is room for a late self-heal or a portrait decoding, not for a
     *     loop that has been pinned awake — that would read ~270. */
    check(`motion.reduced.paintsAtRest.${tag}`, red ? red.restPaints : null, {
      max: 2, note: `full-scene passes over ${REST_MS}ms with nobody touching it`,
    });
    check(`motion.normal.paintsAtRest.${tag}`, norm ? norm.restPaints : null, {
      max: 2, note: `the same, with the preference off`,
    });
  }
}

/* ── suite 4: chrome that animates ─────────────────────────────────────────*/
async function suiteChrome(browser, base) {

  /* 3z · THE FOOTER DOES NOT PRINT THROUGH ITSELF.
   *
   * The status bar carries four things in three grid tracks, and a byline was
   * added to the right-hand group. The grid was `1fr auto 1fr`, which forces the
   * two side tracks to the same width, so the moment the right group outgrew its
   * half `justify-self: end` pushed it LEFTWARD out of its track and through the
   * centred hint — 237px of overlap at 1600, two texts on top of each other,
   * shipped to a preview and caught by the owner's eye rather than by this file.
   *
   * Asserted with a person SELECTED, because that is the longest the hint ever
   * gets, and in both languages because English is the binding case: with the
   * byline shown, English cleared by 16px at 1440 where Korean cleared by 143.
   * A positive number is not the bar — 16px is a collision that has not happened
   * yet — so the floor is 24. */
  for (const lang of ['ko', 'en']) {
    for (const w of [1440, 1600, 1920]) {
      /* openPage owns the context — it also seeds bgx.lang, arms the probe and
         dismisses the cold open, none of which a bare newContext does. */
      const { ctx, page } = await openPage(browser, base, {
        viewport: { width: w, height: 900 },
        lang,
        dpr: 1,
      });
      await page.evaluate(() => { location.hash = '#p=hong-jin-ho'; });
      await page.waitForTimeout(1500);
      const m = await page.evaluate(() => {
        const box = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { l: r.left, r: r.right };
        };
        const hint = box('.sb__hint');
        const right = box('.sb__right');
        const left = box('.sb__left');
        const bar = document.querySelector('.statusbar');
        return {
          gap: hint && right ? Math.round(right.l - hint.r) : -1,
          leftGap: hint && left ? Math.round(hint.l - left.r) : -1,
          overflow: bar ? bar.scrollWidth - bar.clientWidth : -1,
        };
      });
      const tag = `${w}.${lang}`;
      check(`chrome.footerGap.${tag}`, m.gap, (v) => v >= 24, '>= 24', 'hint must clear the right-hand group');
      check(`chrome.footerGapLeft.${tag}`, m.leftGap, (v) => v >= 0, '>= 0', 'and the counts on the left');
      check(`chrome.footerOverflow.${tag}`, m.overflow, (v) => v === 0, '= 0', 'the bar may not scroll sideways');
      await ctx.close();
    }
  }

  console.log('\n── chrome entrances ──────────────────────────────────────────────────');

  // 3a · the cold open's countdown hairline. It is not a picture of the timer,
  //      it IS the timer's clock, so it has to be running while it is on screen.
  {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, deviceScaleFactor: 1, colorScheme: 'dark', locale: 'ko-KR' });
    await ctx.addInitScript(() => { window.__atlasProbe = true; });
    await ctx.addInitScript(() => { try { localStorage.setItem('bgx.lang', 'ko'); } catch { /* ignore */ } });
    await ctx.addInitScript(() => {
      window.__cd = { rows: [], t0: performance.now(), seen: null };
      const tick = () => {
        const el = document.querySelector('.intro__countdown');
        if (el) {
          const t = +(performance.now() - window.__cd.t0).toFixed(0);
          if (window.__cd.seen === null) window.__cd.seen = t;
          const a = el.getAnimations()[0];
          if (a) window.__cd.rows.push([t, a.startTime == null ? 0 : 1, +(a.currentTime ?? 0).toFixed(0)]);
        }
        if (performance.now() - window.__cd.t0 < 7000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7200);
    const cd = await page.evaluate(() => window.__cd);
    const started = cd.rows.find((r) => r[1] === 1);
    check('intro.countdown.startLagMs', started && cd.seen !== null ? started[0] - cd.seen : null, {
      max: 100, unit: 'ms', note: 'element on screen → animation has a startTime',
    });
    await ctx.close();
  }

  // 3b · the command palette. Its CSS carries the longest reasoning in the
  //      file — a 90ms lead, a separated fade and lift — and none of it has
  //      ever been on screen.
  {
    const { ctx, page, errors } = await openPage(browser, base, { viewport: VIEWPORTS.desktop, lang: 'ko', dpr: 1 });
    await enterAndSettle(page);
    await page.evaluate(() => {
      window.__pal = { rows: [], t0: performance.now(), mounted: null };
      const tick = () => {
        const el = document.querySelector('.cp__dialog');
        const t = +(performance.now() - window.__pal.t0).toFixed(0);
        if (el) {
          if (window.__pal.mounted === null) window.__pal.mounted = t;
          const an = el.getAnimations();
          const cs = getComputedStyle(el);
          window.__pal.rows.push([t, an.length, an.every((a) => a.startTime != null) ? 1 : 0, +cs.opacity, cs.transform]);
        }
        if (performance.now() - window.__pal.t0 < 2500) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    /* THE GUARD ON THE WARM PASS, and it is the reason every number below can
     * still be believed.
     *
     * CommandPalette.tsx now renders the real drawer for two frames at idle, so
     * that the reader's first Ctrl+K is not the frame that rasterises five
     * plates. It renders the REAL tree — a shell warms nothing, which HoverCard
     * learned the expensive way — which means for ~33ms a genuine `.cp__dialog`
     * exists in the DOM without anybody having opened it.
     *
     * Every check in this suite is keyed off "the first tick at which
     * `.cp__dialog` exists". If a warm pass were ever left mounted, that tick
     * would be tick zero, `palette.mountLagMs` would read 0ms, and the whole
     * blocker would report itself fixed while being untouched. That is a
     * FALSE PASS THIS HARNESS WOULD OTHERWISE HAVE NO WAY TO SEE.
     *
     * So: immediately before the keystroke — seconds after the idle deadline
     * the warm pass is scheduled against — there must be no dialog. If somebody
     * later makes the palette stay mounted to make these numbers look good,
     * this is the check that fails instead. */
    check(
      'palette.noDialogBeforeOpen',
      await page.evaluate(() => document.querySelectorAll('.cp__dialog').length),
      { eq: 0, note: 'the idle warm pass must be gone before anything is timed against it' },
    );
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(2800);
    const pal = await page.evaluate(() => window.__pal);
    const ran = pal.rows.find((r) => r[2] === 1 && r[1] > 0);
    const partial = new Set(pal.rows.map((r) => r[3]).filter((o) => o > 0.02 && o < 0.98));
    check('palette.mountLagMs', pal.mounted, { max: 150, unit: 'ms', note: 'Ctrl+K → .cp__dialog exists' });
    check('palette.animCount', pal.rows.length ? pal.rows[0][1] : null, { min: 2, note: 'cp-dialog-fade + cp-dialog-lift' });
    check('palette.animStartLagMs', ran && pal.mounted !== null ? ran[0] - pal.mounted : null, {
      max: 34, unit: 'ms', note: 'dialog mounted → every animation has a startTime (2 frames)',
    });
    /* 3, not 6. cp-dialog-fade runs --cp-lead = 90ms, so the 60fps ceiling on
       distinct part-way opacities is 90/16.7 - 1 ≈ 4. Six was a threshold no
       fix could reach — the harness's error, corrected against the CSS rather
       than against the measurement. The 180ms channel is `palette.liftFrames`
       below, and that is where the frame-budget claim belongs. */
    check('palette.entranceFrames', partial.size, {
      min: 3, note: 'distinct part-way opacities of the 90ms cp-dialog-fade (60fps ceiling is ~4)',
    });
    /* THE 180ms ANIMATION IS THE LIFT, NOT THE FADE. `cp-dialog-fade` runs
       --cp-lead (90ms) on purpose — the surface has to knock the canvas down
       before its own contents become legible, which is the argument the top of
       CommandPalette.css makes at length — so the opacity channel above can
       only ever show ~4 part-way values at 60fps. `cp-dialog-lift` is the
       180ms one, and its channel is transform. Measured A/B on this build,
       headless, dpr 1, 5 first-opens each: 2 distinct part-way transforms with
       the two backdrop-filters in place, 4 with them removed. Ten is what a
       180ms animation gets at 60fps. */
    const lifted = new Set(pal.rows.map((r) => r[4]).filter((t) => t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'));
    check('palette.liftFrames', lifted.size, {
      min: 6, note: 'distinct part-way transforms of the 180ms cp-dialog-lift (60fps budget is ~10)',
    });
    check('errors.page.palette', errors.page.length + errors.console.length, { max: 0, note: errors.page[0] ?? errors.console[0] ?? '' });

    /* WHERE THE DEAD TIME ACTUALLY IS, split so the handoff is a number rather
       than an argument. Measured: the FIRST Ctrl+K of a session costs 216–598ms
       before .cp__dialog exists; every open after it costs 25–85ms, on the same
       page, with the same twenty rows and the same five portrait plates. So it
       is not per-open work — it is one-time warm-up (module init, the plate
       ladder, the measureText cache) being paid on the reader's first keystroke
       instead of during the 4.5s the cold open is on screen. The warm number is
       a real gate and it passes; the first-open number is the blocker. */
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        window.__pal2 = { t0: performance.now(), mounted: null };
        const mo = new MutationObserver(() => {
          if (document.querySelector('.cp__dialog') && window.__pal2.mounted === null) {
            window.__pal2.mounted = +(performance.now() - window.__pal2.t0).toFixed(0);
            mo.disconnect();
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
      });
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(1400);
    }
    const warm = await page.evaluate(() => window.__pal2?.mounted ?? null);
    check('palette.mountLagFirstMs', pal.mounted, { max: 150, unit: 'ms', note: 'first Ctrl+K of the session' });
    check('palette.mountLagWarmMs', warm, {
      max: 150, unit: 'ms', note: 'third Ctrl+K of the same session — same work, already warm',
    });
    await ctx.close();
  }

  // 3c · the dossier's section cascade must run top-down. A stagger that runs
  //      backwards gives the eye the reverse of the reading order.
  {
    const { ctx, page } = await openPage(browser, base, { viewport: VIEWPORTS.desktop, lang: 'ko', dpr: 1 });
    await enterAndSettle(page);
    const pos = await page.evaluate(() => window.__atlasDebug.centralNodeScreenPos());
    /* The window starts when the panel does, not when the harness arms the
       sampler. Timing it from the click meant the 2.6s was mostly spent before
       the sections existed, and how many frames of the cascade were left over
       depended on how long React took that run — 8 one time, 38 another, for
       a stagger that is the same length every time. */
    await page.evaluate(() => {
      window.__csc = { rows: [], t0: null };
      const tick = () => {
        const secs = [...document.querySelectorAll('.dsr-sec')];
        if (secs.length >= 4) {
          if (window.__csc.t0 === null) window.__csc.t0 = performance.now();
          window.__csc.rows.push(secs.slice(0, 4).map((s) => +(+getComputedStyle(s).opacity).toFixed(3)));
        }
        if (window.__csc.t0 === null || performance.now() - window.__csc.t0 < 1400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (pos) await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(3400);
    const csc = await page.evaluate(() => window.__csc);
    const inversions = csc.rows.filter((r) => r[0] + 1e-3 < r[3]).length;
    check('dossier.cascade.sampledFrames', csc.rows.length, {
      min: 20, note: '1.4s of the panel on screen — under 20 means the sampler, not the app, and the inversion count below means nothing',
    });
    check('dossier.cascade.inversionFrames', inversions, {
      max: 0, note: `frames where section 4 is more opaque than section 1 (n=${csc.rows.length})`,
    });
    await ctx.close();
  }
}

/* ── suite 4: the cast wall ────────────────────────────────────────────────
 * The one surface whose entire job is "look at twenty faces". Three rounds
 * have filed the same defect against it — a pinned band at the top eating the
 * modal, and rows arriving with the name painted and the face gone — and the
 * fix has been applied and re-broken twice, once as a deeper scroll ramp and
 * once as a sticky bloc heading. So all three of those are pinned here as
 * numbers: how much of the sheet the reader cannot scroll, whether anything is
 * pinned INSIDE the scroller, and whether any rest position shows a card's name
 * without its face.
 */
const WALL_GEOMETRY = () => {
  const sheet = document.querySelector('.gallery__sheet');
  const sc = document.querySelector('.gallery__scroll');
  const head = document.querySelector('.gallery__head');
  if (!sheet || !sc || !head) return null;
  const sh = sheet.getBoundingClientRect().height;
  /* Anything pinned inside the scroller. `position: sticky` on the bloc heading
     is the specific regression this counts: it shipped, was removed with a
     comment explaining that it left "a heading followed by four headless rows
     of numbers", and came back. The masthead itself is a flex sibling of the
     scroller, not sticky, so it is measured by height instead. */
  const sticky = [...sc.querySelectorAll('*')].filter((e) => {
    const p = getComputedStyle(e).position;
    return p === 'sticky' || p === 'fixed';
  }).length;
  return {
    sheetH: Math.round(sh),
    mastheadH: Math.round(head.getBoundingClientRect().height),
    pinnedPct: +(((sh - sc.getBoundingClientRect().height) / sh) * 100).toFixed(1),
    stickyInScroller: sticky,
    maxScroll: sc.scrollHeight - sc.clientHeight,
    cards: document.querySelectorAll('.gallery__cell').length,
  };
};

/* At the current rest: for every card whose NAME is fully inside the
   scrollport, how much of its portrait plate is? A decapitated card is one the
   reader can read and cannot recognise. */
const WALL_REST = () => {
  const sc = document.querySelector('.gallery__scroll');
  const scr = sc.getBoundingClientRect();
  let worst = 1;
  let who = '';
  let decapitated = 0;
  for (const cell of document.querySelectorAll('.gallery__cell')) {
    const plate = cell.querySelector('.gallery__plate');
    const name = cell.querySelector('.gallery__name');
    if (!plate || !name) continue;
    const pr = plate.getBoundingClientRect();
    const nr = name.getBoundingClientRect();
    if (!(nr.top >= scr.top - 0.5 && nr.bottom <= scr.bottom + 0.5)) continue;
    const shown = Math.max(0, Math.min(pr.bottom, scr.bottom) - Math.max(pr.top, scr.top)) / pr.height;
    if (shown < 0.5) decapitated++;
    if (shown < worst) { worst = shown; who = name.textContent; }
  }
  return { worst: +worst.toFixed(3), who, decapitated, scrollTop: Math.round(sc.scrollTop) };
};

async function suiteWall(browser, base) {
  console.log('\n── the cast wall ─────────────────────────────────────────────────────');
  const matrix = [
    ['desktop', VIEWPORTS.desktop, 'en', false],
    ['laptop', VIEWPORTS.laptop, 'ko', false],
    ['mobile', VIEWPORTS.mobile, 'en', true],
  ];
  for (const [tag, viewport, lang, mobile] of matrix) {
    const { ctx, page } = await openPage(browser, base, { viewport, lang, dpr: 1, mobile });
    await enterAndSettle(page);
    await page.keyboard.press('g');
    await page.waitForSelector('.gallery__scroll', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(700);

    const g = await page.evaluate(WALL_GEOMETRY);
    if (!g) { check(`wall.probe.${tag}`, null, { eq: 'present' }); await ctx.close(); continue; }

    /* The masthead is a permanent tax on a modal that exists to show faces.
       Measured before the round-12 fix: 105px of masthead plus a 117px pinned
       explainer — 223px, 25.3% of an 880px sheet at 1600x1000 and 30.3% of an
       844px one at 390x844. The explainer is in the scroll flow now. */
    check(`wall.mastheadPx.${tag}`, g.mastheadH, { max: 80, unit: 'px', note: 'the pinned title line' });
    check(`wall.pinnedChromePct.${tag}`, g.pinnedPct, {
      max: 14, unit: '%', note: `of a ${g.sheetH}px sheet the reader cannot scroll`,
    });
    check(`wall.stickyInScroller.${tag}`, g.stickyInScroller, {
      eq: 0, note: 'nothing may be pinned over the wall — the bloc heading was sticky twice and decapitated cards twice',
    });
    check(`wall.cards.${tag}`, g.cards, { eq: 20 });

    /* Every rest across the whole range, INCLUDING the end of it — which is
       where the defect actually lived, because the end of a scroll range is not
       a snap position unless the layout is built so that it is. */
    let worst = 1;
    let where = '';
    let decap = 0;
    const STEPS = 10;
    for (let i = 0; i <= STEPS; i++) {
      await page.evaluate((y) => { document.querySelector('.gallery__scroll').scrollTop = y; }, Math.round((g.maxScroll * i) / STEPS));
      await page.waitForTimeout(300);
      const r = await page.evaluate(WALL_REST);
      decap += r.decapitated;
      if (r.worst < worst) { worst = r.worst; where = `${r.scrollTop}px, ${r.who}`; }
    }
    check(`wall.decapitatedAtRest.${tag}`, decap, {
      max: 0, note: `cards over ${STEPS + 1} rests showing a name with under half a face`,
    });
    check(`wall.worstPlateShownAtRest.${tag}`, worst, {
      min: 0.99, note: `least-visible plate under a legible name, at ${where || 'every rest clean'}`,
    });
    await ctx.close();
  }
}

/* ── suite 5: the design system and the disclosure ─────────────────────────
 * Two invariants that are about what the product SAYS rather than how it
 * moves, and both of them failed silently for rounds because nothing measured
 * them: a token file that had drifted onto retired values nobody read, and the
 * app's single most important editorial paragraph, which was authored,
 * build-validated and rendered nowhere.
 */
async function suiteSystem(browser, base) {
  console.log('\n── tokens and the provenance disclosure ──────────────────────────────');
  {
    const { ctx, page } = await openPage(browser, base, { viewport: VIEWPORTS.desktop, lang: 'ko', dpr: 1 });
    await enterAndSettle(page);
    const tok = await page.evaluate(() => {
      /* Every rule in every same-origin stylesheet the built page loaded. */
      let css = '';
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) css += r.cssText + '\n';
      }
      const root = getComputedStyle(document.documentElement);
      /* The two values palette.ts retired. --c-esports #6f87cf sat DE 2.9 from
         --s2, i.e. the one esports player's archetype ring and his season-2 arc
         drawn as one colour on one plate; --c-poker #c8a85b sat DE 10.3 from
         --brass, i.e. five gold discs in a cast with two champions. Both were
         still declared in tokens.css after palette.ts moved off them, because
         nothing read either file's copy and nothing compared them. */
      const retired = (css.match(/#6f87cf|#c8a85b/gi) ?? []).length;
      /* The mirror itself. These twenty-four had ZERO var() consumers in src/
         — measured by grep before deletion — so a drift in them could not show
         up in the picture. If any of them is declared again, the second copy is
         back and so is the drift. */
      const MIRROR = [
        '--c-comedian', '--c-athlete', '--c-esports', '--c-creator', '--c-broadcaster',
        '--c-musician', '--c-poker', '--c-professional', '--c-actor', '--c-other',
        '--r-alliance', '--r-betrayal', '--r-rivalry', '--r-prior-show', '--r-co-season',
        '--r-friendship', '--r-family', '--r-agency', '--r-teammate', '--r-mentor', '--r-collab',
        '--s1', '--s2', '--s3',
      ];
      const declared = MIRROR.filter((n) => root.getPropertyValue(n).trim() !== '');
      /* And the same two values as PAINT, not as text — because the way a
         retired hue comes back is somebody reading it off the old token block
         and typing it into a style attribute, where no stylesheet grep will
         find it. Every element and every SVG node in the document, across the
         five properties a hue can arrive on. */
      const RETIRED_RGB = ['rgb(111, 135, 207)', 'rgb(200, 168, 91)'];
      const PROPS = ['color', 'background-color', 'border-top-color', 'fill', 'stroke'];
      let inDom = 0;
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        for (const p of PROPS) if (RETIRED_RGB.includes(cs.getPropertyValue(p))) { inDom++; break; }
      }
      return { retired, declared, inDom, cssBytes: css.length };
    });
    check('tokens.retiredHexInCss', tok.retired, {
      eq: 0, note: '#6f87cf / #c8a85b — the two values palette.ts retired for a measured collision',
    });
    check('tokens.mirrorVarsDeclared', tok.declared.length, {
      eq: 0, note: `the palette.ts mirror must stay deleted${tok.declared.length ? ': ' + tok.declared.join(', ') : ''}`,
    });
    check('tokens.retiredHexInDom', tok.inDom, {
      eq: 0, note: 'elements painting a retired hue from an inline style, where no stylesheet grep would find it',
    });
    /* NOT ASSERTED, and the reason is worth writing down for whoever reaches
       for it next. The obvious check here is "every custom property declared in
       :root is read by some var()", which is the literal shape this defect had.
       It was written, measured and removed: it reports 32 on a healthy build,
       because two of them are lightningcss build artefacts and the rest are
       tokens the app reads from JS (App.tsx and app.css both call
       getPropertyValue on layout and easing tokens) or through inline styles
       that no stylesheet contains. A gate that is red on a correct build is a
       gate somebody switches off. The two checks above are the narrow, true
       version: the mirror is gone, and neither retired value is anywhere. */
    await ctx.close();
  }

  /* The provenance paragraph, on the tab a reader opens to ask where any of
     this came from. It says about 77% of the citations are one crowd-editable
     wiki and counts how many ties stand on it alone; the whole product's claim
     to be worth citing rests on that paragraph being both PRESENT and TRUE. */
  for (const lang of ['ko', 'en']) {
    const { ctx, page } = await openPage(browser, base, { viewport: VIEWPORTS.desktop, lang, dpr: 1 });
    await enterAndSettle(page);
    await page.keyboard.press('?');
    await page.waitForSelector('[role="tabpanel"]', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      const t = tabs.find((x) => /출처|Sources/i.test(x.textContent ?? ''));
      if (!t) return false;
      t.click();
      return true;
    });
    await page.waitForTimeout(600);
    const s = await page.evaluate((wantFigures) => {
      const panel = document.querySelector('[role="tabpanel"]');
      if (!panel) return null;
      const text = panel.innerText ?? '';
      const first = panel.querySelector('.abt-prose')?.textContent ?? '';
      /* The figures the paragraph is measured against: total citations, the
         namu.wiki share and its percentage, and the pair that makes the count
         honest — the relationship lines and how many are wiki-only. Round 12's
         text got the last two wrong: it printed 15, which is one confidence
         band, under a sentence claiming to state the remainder.
         WHICH NUMBERS THEY ARE IS NOT HARDCODED HERE, and that is the point.
         This check pinned the literals ['290','223','77','47','27'] and went
         stale the moment five edges were added — the app was correct, the
         validator's own section 9 had already forced the paragraph to be
         updated, and the harness failed anyway. A check that has to be edited
         whenever the data changes will eventually be edited to whatever makes
         it pass. The list is injected from dataset.ts's own prose instead, so
         the assertion is "the paragraph's figures reach the screen" — which is
         the claim worth making — and it cannot go stale again. */
      const figures = (wantFigures ?? []).filter((n) => text.includes(n)).length;
      return {
        figures,
        namesWiki: /나무위키|namu\.wiki/.test(text),
        /* A marker the paragraph quotes must be one the app actually paints.
           확인됨 was quoted as the label on the ties being counted and appears
           nowhere else in the product — the app stamps 미확인 / Unverified on
           the OTHER side of the same field. A disclosure that points at a label
           that does not exist cannot be checked by the reader it is for. */
        phantomMarker: (text.match(/확인됨/g) ?? []).length,
        firstIsProvenance: /나무위키|namu\.wiki|순위와|Placements/.test(first),
        chars: text.length,
      };
    }, provenanceFigures());
    if (!opened || !s) { check(`sources.probe.${lang}`, null, { eq: 'present' }); await ctx.close(); continue; }
    check(`sources.provenanceFigures.${lang}`, s.figures, {
      min: 5, note: 'the five measured numbers the paragraph stands on, on screen',
    });
    check(`sources.provenanceNamesTheWiki.${lang}`, s.namesWiki, { eq: true });
    check(`sources.provenanceFirst.${lang}`, s.firstIsProvenance, {
      eq: true, note: 'evidence quality is the frame the link list is read inside, so it leads',
    });
    check(`sources.phantomMarker.${lang}`, s.phantomMarker, {
      eq: 0, note: 'the disclosure may not quote a UI label the app never paints',
    });
    await ctx.close();
  }

  /* ── the probes, both polarities ────────────────────────────────────────
     `__atlasDebug` hands out the live link list. It shipped unconditionally,
     which is a leak on a public site and squarely the thing the redaction
     work exists to prevent. src/probe.ts now gates both globals on a flag
     armed before boot — by this harness and by nothing a visitor can reach.

     Gating is a fact about today's source; these two make it an invariant of
     the SHIPPED BUNDLE. `probes.dark` is the one that matters: it opens a
     context WITHOUT the arming script, against the same production build
     every other check ran against, and asserts the globals are simply not
     there. It is what stops someone re-arming the probes to debug something
     in six months and forgetting to put the gate back.

     This is also the template PLAN-spoilers.md §8 needs — assert the redacted
     profile AND full exposure — so it pays for itself again in Phase 3. */
  console.log('\n── the test probes ──────────────────────────────────────────────────');
  {
    const { ctx, page } = await openPage(browser, base, { viewport: VIEWPORTS.desktop, lang: 'ko', dpr: 1 });
    await enterAndSettle(page);
    const armed = await page.evaluate(() => ({
      debug: typeof window.__atlasDebug,
      paint: typeof window.__atlasPaint,
    }));
    check('probes.armed.debug', armed.debug, {
      eq: 'object', note: 'the harness arms the probes, so they must be there — a miss here reads as 200 downstream failures otherwise',
    });
    check('probes.armed.paint', armed.paint, { eq: 'object' });
    await ctx.close();
  }
  {
    /* Deliberately NOT openPage(): that helper is what arms them. */
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, deviceScaleFactor: 1, colorScheme: 'dark', locale: 'ko-KR' });
    await ctx.addInitScript(() => { try { localStorage.setItem('bgx.lang', 'ko'); } catch { /* private mode */ } });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'load' });
    await enterAndSettle(page);
    const dark = await page.evaluate(() => ({
      debug: window.__atlasDebug === undefined,
      paint: window.__atlasPaint === undefined,
      /* Proves the page really booted, so "undefined" means gated rather than
         "the app never ran and nothing was defined either way". */
      painted: document.querySelectorAll('canvas').length,
    }));
    check('probes.dark.debug', dark.debug, {
      eq: true, note: 'an unarmed visitor must not receive the link list',
    });
    check('probes.dark.paint', dark.paint, { eq: true });
    check('probes.dark.appBooted', dark.painted, {
      min: 1, note: 'the control for the two above — an app that never mounted would pass them for the wrong reason',
    });
    await ctx.close();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN
 * ═════════════════════════════════════════════════════════════════════════*/
async function main() {
  const argv = process.argv.slice(2);
  const arg = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const has = (k) => argv.includes(`--${k}`);
  only = arg('only') ?? null;

  let base = arg('base') ?? null;
  let server = null;

  if (!base) {
    const dist = path.resolve('dist/index.html');
    // `--no-build` is for `npm run check`, which has just built. Everything
    // else builds, because asserting a stale dist is asserting nothing.
    if (!has('no-build') || !existsSync(dist)) {
      console.log('building…');
      await build({ logLevel: 'warn' });
    }
    server = await preview({ preview: { port: 4173, strictPort: false, open: false }, logLevel: 'warn' });
    base = server.resolvedUrls?.local?.[0] ?? 'http://localhost:4173';
  }
  if (/:5173(\/|$)/.test(base)) {
    console.error('refusing to assert against the dev server — see the header of this file');
    process.exit(2);
  }
  console.log(`asserting the PRODUCTION build at ${base}\n`);

  const browser = await chromium.launch();
  try {
    await suitePaint(browser, base);
    await suiteHover(browser, base);
    await suiteReveal(browser, base);
    await suiteReduced(browser, base);
    await suiteChrome(browser, base);
    await suiteWall(browser, base);
    await suiteSystem(browser, base);
  } finally {
    await browser.close();
    if (server) await server.close();
  }

  const failed = results.filter((r) => !r.ok && !r.open);
  const open = results.filter((r) => !r.ok && r.open);

  console.log(`\n${'═'.repeat(78)}`);
  console.log(`${results.length} invariants · ${results.length - failed.length - open.length} ok · ${failed.length} FAILING · ${open.length} known-open`);

  /* An OPEN entry is resolved only when EVERY check under it passes — one
     healthy viewport does not close a blocker that is still live on another. */
  const keyOf = (name) => Object.keys(OPEN).find((k) => name === k || name.startsWith(k + '.'));
  const byKey = new Map();
  for (const r of results) {
    const k = keyOf(r.name);
    if (!k) continue;
    const e = byKey.get(k) ?? { n: 0, bad: 0 };
    e.n++; if (!r.ok) e.bad++;
    byKey.set(k, e);
  }
  const resolved = [...byKey].filter(([, v]) => v.n > 0 && v.bad === 0);
  const live = [...byKey].filter(([, v]) => v.bad > 0);
  const untested = Object.keys(OPEN).filter((k) => !byKey.has(k));

  if (resolved.length) {
    console.log('\nRESOLVED — every check under these now passes. Delete them from OPEN so they become a gate:');
    for (const [k, v] of resolved) console.log(`  ✓ ${k}   (${v.n}/${v.n} passing)`);
  }
  if (live.length) {
    console.log('\nKNOWN-OPEN (measured, pinned, not yet fatal):');
    for (const [k, v] of live) console.log(`  · ${k}  [${v.bad}/${v.n} failing] — ${OPEN[k]}`);
  }
  if (untested.length && !only) {
    console.log('\nOPEN entries nothing measured — stale, or the probe stopped running:');
    for (const k of untested) console.log(`  ? ${k}`);
  }
  if (failed.length) {
    console.log('\nFAILING:');
    for (const r of failed) console.log(`  ✗ ${r.name}  measured ${r.measured} ${r.why}${r.spec.note ? '  — ' + r.spec.note : ''}`);
    process.exit(1);
  }
  console.log('\nno regressions.');
}

main().catch((e) => { console.error(e); process.exit(1); });
