# HANDOFF — Bloody Game X cast atlas

Written 2026-08-02, stopping mid-round-13 for a usage limit. The tree is clean:
`tsc`, the data validator and `vite build` all pass, and the visual harness runs
at **180 ok / 0 failing / 17 known-open**. Nothing is half-edited.

> **UPDATE — round 13 closed out later the same day, and the palette backlog
> worked.** Sections 3 and 8 below were written from the workflow's own report
> and are wrong about the tree in several places; all are corrected inline.
> Current harness state: **220 invariants / 202 ok / 0 FAILING / 18 known-open.**
> Read §3.1, §3.2 and §8 before acting on §3 or §8.
>
> One rule earned the whole session and is worth restating: **a check that is
> passing today is not a check that is fixed.** §8 told the next reader to
> promote three `RESOLVED` entries; two of them had no fix behind them and were
> failing when measured. `captions.misattributed` then passed three consecutive
> full runs and failed the fourth — the 1-in-8 its own entry predicted. Promote
> on a landed fix, never on a green run.

---

## 1. What this is

An interactive web app: the twenty players announced for 피의 게임X (Bloody Game X,
Wavve 2026) as a node-link graph. Each node is a cast member with their real
photograph; each line is a relationship that **already existed before season X
started** — alliances and betrayals from seasons 1–3 of the franchise, shared
appearances on other programmes, real-life history.

Vite + React 19 + TypeScript (strict), d3-force driven from a manual rAF loop,
Canvas 2D rendering. ~27,500 lines across 58 source files. Korean is the source
of record; full English via `src/data/i18n/`.

### The standing goal

The user's original instruction, still in force:

> Build a modern, delightful AAA quality interactive web app that shows the full
> cast and their connection node graph … Put every important piece through its
> own loop with a separate, harsh critic spanning around (but not limited to)
> visual, polish, information depth, UI/UX, and animation … **Do it until it
> passes 9/10 for every pillar.**

A session-scoped Stop hook enforces this and will block stopping until it holds.

**Scores by round** (visual / polish / depth / ux / motion):

| round | v | p | d | ux | m |
|---|---|---|---|---|---|
| 1 | 5 | 5 | 7 | 5 | 5 |
| 4 | 7 | 7 | 7 | 5 | 5 |
| 7 | 6 | 6 | 7 | 6 | 6 |
| 8 | 5 | — | 7 | 6 | 7 |
| 10 | 6 | 7 | 8 | 6 | 5 |
| **12 (current)** | **6** | **6** | **8** | **6** | **5** |

---

## 2. Read this before doing anything else

**Scores have been flat around 6 for three rounds, and the reason is diagnosed.**
Round 12 filed nine blockers. *Most of them were introduced by round 11's fixes.*

- The backdrop key that fixed pale discs left a pale halo on every silhouette.
- The label fix that stopped captions naming the wrong person started painting
  captions for off-screen nodes.
- The plate began intermittently falling back to the name mark.
- The gallery's sticky masthead — removed once for exactly this — came back.

Twelve rounds produced excellent *measurements* and nothing that *held* them.
Every number lived in report prose, so the next round's fix walked through it.

**`tools/assert-visual.mjs` is the answer to that and it is the single most
important artefact in the repo.** It boots the production build, drives 13+
states, and asserts 197 measured invariants. Landed in round 13.

```bash
npm run assert          # build + assert
npm run check           # typecheck + data validator + build + assert
```

Its output ends with three sections that should drive the work:

- `FAILING` — a regression. Currently **0**. Keep it at 0.
- `RESOLVED` — checks under a known-open entry that now all pass. **Promote
  them**: delete the entry from `OPEN` so they become a hard gate.
- `KNOWN-OPEN` — measured, pinned, not yet fatal. This is the live backlog.

> **The rule for whoever picks this up: every fix leaves an assertion behind.**
> If you fix something the harness cannot see, add the check that would have
> caught it. A fix without an assertion has a demonstrated ~50% chance of being
> the next round's regression.

---

## 3. Current state of the loop

Round 13 was launched with five owners and **stopped after two completed**.

| owner | files | status |
|---|---|---|
| `fix13:harness` | `tools/assert-visual.mjs` | **landed** (file complete, 197 invariants; agent killed before reporting) |
| `fix13:photo` | `portraits.ts`, `plate.ts`, `plateGeometry.ts` | **landed** — kept the key, built `window.__plateProbe.haloAll()` to measure it |
| `fix13:labels` | `render.ts` | **landed** — added `uncovered()`, `seenFraction()`, `LABEL_SEEN_MIN = 0.4` |
| `fix13:camera` | `GraphCanvas.tsx`, `App.tsx` | **NOT RUN** — blocker still open |
| `fix13:chrome-content` | `Gallery.*`, `CommandPalette.css`, `dataset.ts`, `tokens.css`, `AboutSheet.tsx` | **NOT RUN** — blockers still open |

### 3.1 Correction — the last two owners' CODE did land

The table above is the workflow's report, not the state of the tree, and the two
"NOT RUN" rows are wrong. File mtimes settle it: this document was written at
08:44, after `GraphCanvas.tsx`/`App.tsx` at 08:19, `tokens.css` at 08:29,
`Gallery.*` at 07:10–07:15, `CommandPalette.css` at 07:08, `dataset.ts` at 07:46
and `AboutSheet.tsx` at 07:48. Somebody finished both owners by hand afterwards.

What did *not* land is the other half of the round's standing rule.
`fix13:camera`'s brief ended "leave assertions behind: after opening the dossier,
all twenty plate centres are inside the uncovered rect" — and no such check
existed. The four-round-old blocker had been fixed and nothing measured that it
stayed fixed, which is the exact 50%-regression setup §2 is about.

It is measured now. `camera.castKnown` / `camera.castOutsideRect` in
`assert-visual.mjs` (see `framing()`), across five viewport×language states in
both the fitted and dossier frames — 18 checks, all passing:

| state | uncovered rect | centres outside |
|---|---|---|
| desktop ko/en · fitted | 1272×882 | 0 |
| desktop ko/en · dossier | 832×882 | 0 |
| laptop ko/en · fitted | 952×682 | 0 |
| laptop ko/en · dossier | 512×682 | 0 |
| mobile en · fitted | 390×718 | 0 |

The rect comes from `__atlasPaint.frame.open` — the painter's own `uncovered()`,
sampled per frame — rather than being re-derived from the four `--inset-*`
properties, because those are registered `@property <length>` values and they
animate: a harness computing its own rect compares this frame's discs against
some other frame's chrome. The check is deliberately **not** applied to the
zoomed states; zooming in is the reader asking to lose the cast.

### Outstanding blockers, in priority order

1. ~~**The camera never refits when the dossier opens.**~~ **CLOSED** — the fix
   was already in `GraphCanvas.tsx` (`reframe` → `solveFrame` → `frameFor`, and
   `focusNode()` deleted rather than kept); what was missing was the measurement,
   which now exists and passes in all 9 framed states. See §3.1. Original entry
   kept below for the history.

   Filed as a *major* in
   round 8 and again as a *blocker* in round 12 — open for four rounds. The
   dossier is a fixed 530px right panel overlaying the canvas with no camera
   change, so clicking a person silently pushes four of twenty off-screen,
   including the entire cold band. `app.css` already publishes
   `--inset-top/right/bottom/left` as registered `@property <length>` custom
   properties for exactly this. Note round 4 deliberately made refits
   pan-at-constant-k with a person selected (to kill an unrequested zoom-out) —
   do not simply revert that; keep the selected person framed **and** the cast
   on screen.
2. **Captions still misattribute and overlap plates** (`captions.overPlate` is
   NEW this round — a caption set square across the photograph it names, up to
   100% of the disc). `plate.ts` refuses to draw a mark over a face for exactly
   this reason; the caption does it anyway. 4 of 13 states.
3. **The reveal renders in a handful of frames** (`reveal.frames`, 2/2 failing).
   Not JS — GPU texture upload, 165–180MB, because the scene canvas, the backdrop
   canvas and a full-viewport blend-mode overlay are all live at once. Four
   rounds tuned this entrance while measuring on the *dev server*, where it looks
   fine. **Always profile the production build for anything frame-related.**
4. ~~**Command palette entrance**~~ — **HALF CLOSED, AND THE OTHER HALF WAS
   MISATTRIBUTED.** See §3.2. The mount cost was real and is fixed; the frame
   counts are not a palette defect at all.

   Original entry: `CommandPalette.css` dropped both
   backdrop-filters (201 → 77ms median, measured A/B), but the residue is a
   first-open mount cost in `CommandPalette.tsx`. 90ms fade renders 1 of 4 frames.
5. **Gallery sticky masthead decapitates rows.** Read `Gallery.css`'s own
   comments first — this has a history. Do **not** re-deepen the scroll ramp;
   that was tried at 40px and 72px and correctly taken to 16px + scroll-snap.
6. **`tokens.css` colour channel is dead code holding retired values.**
   `--c-esports: #6f87cf` and `--c-poker: #c8a85b` are the exact values
   `palette.ts` spends 40 lines explaining were fatal (ΔE 2.9 from `--s2`;
   ΔE 10.3 from `--brass`), and nothing reads any of the 24 colour variables.
   Either delete them or generate them from `palette.ts`.

The full round-12 report is in **`CRITIQUE.md`** (9 blockers, 28 majors, 21
minors, 8 nits) with per-defect file, evidence, cause and proposed fix.

### 3.2 The palette backlog — two fixed, three misattributed

Five `palette.*` entries were open and the notes said they were one root cause:
a first-open mount task in `CommandPalette.tsx`. Half of that was right.

**Fixed.** `palette.mountLagMs` / `palette.mountLagFirstMs` — Ctrl+K → the
dialog existing took **159ms on the first open of a session against 21ms on the
third**. `CommandPalette.tsx` now renders the real drawer for two frames on
idle, the same warm-pass pattern `HoverCard.tsx` documents, so the first open is
a repeat open: **121ms against a 150ms gate**, warm 24ms. Both promoted to hard
gates.

The warm pass renders the *real* tree, not a shell — HoverCard's comment records
paying for that lesson once already. That means a genuine `.cp__dialog` exists in
the DOM for ~33ms with nobody having opened it, and every check in the suite is
keyed off "the first tick at which `.cp__dialog` exists". A warm pass left
mounted would report `mountLag` as 0ms and the blocker as fixed while being
untouched. **`palette.noDialogBeforeOpen` is the assertion that stops that**, and
it is the one to look at first if these numbers ever go suspiciously good.

**Misattributed.** The other three — `animStartLagMs`, `entranceFrames`,
`liftFrames` — did not move, and the mount was never their cause. Traced per
frame over five consecutive opens, arming lag is 60–92ms on the first open and
63–215ms on **warm** opens; warm is not better. Suppressing each layer of the
entrance live, one at a time — the five filtered chip SVGs, the row cascade, the
scrim, and finally the dialog's own fade and lift **switched off entirely** —
changed nothing. There is nothing left in this component to fix.

The control says why:

| surface | frame gaps during entrance (ms) |
|---|---|
| nothing open | 16 16 17 16 18 15 18 15 ← clean 60fps |
| command palette | 29 9 40 11 61 52 46 30 |
| cast wall (`g`) | 177 17 45 59 43 33 34 35 |
| about sheet (`?`) | 41 5 2 116 45 43 47 47 |

The machine idles at 60fps and drops to 25–35fps for **any** modal over the
1600×1000 canvas; the palette is the best of the three and recovers fastest. The
graph canvas is asleep throughout — `clearRect` was instrumented and there were
**zero** repaints in every window — so it is not the painter waking either.

So those thresholds encode a 60fps budget this app does not have for any modal.
They are left at their current values and **not** tuned to the measurement, per
this file's own rule, but they are re-labelled in `OPEN`: the question is
architectural — what it costs to composite a full-viewport surface over a live
canvas — and it is worth putting to the critics as such. **A round-14 fixer
pointed at `CommandPalette.tsx` would burn the round on the wrong file**, which
is exactly the failure §2 is about.

### 3.3 The caption backlog — measured, and it is one decision

`captions.unnamed` and `captions.overPlate` are not two defects. They are the
two ways the label solver can fail when it runs out of honest seats, and any
change that improves one moves the other. Measured rather than argued:

**Seat #30** — dead centre on the person's own photograph, priced `OWN_FACE`
(4e6), the last entry in `buildSpots`. render.ts justifies it as *"where an
oversized disc's caption is supposed to sit"*. It has never once been taken on
an oversized disc. Every case it fires in is the opposite:

| state | person | disc Ø | caption box | covers |
|---|---|---|---|---|
| mobile 390 | 최혜선 | 22.6px | 75×18 | **100%** |
| mobile 390 | 홍진호 | 29.9px | 69×18 | 90% |
| laptop en · dossier | 박지민 | 24.7px | 62×18 | 98% |
| desktop 1600 (discs 37–63px) | — | — | — | never taken |

A disc with room to spare has honest room *beside* it, and an outer seat is
always cheaper — so the seat is only ever reached where the box is 2.5–3.3×
wider than the face. It does not sit in the plate; it erases it and overhangs
both sides, and the photograph is the only identification this cast has.

**The fix is one line** in `boxCost` — `if (b.w > 2 * rPhoto) return Infinity;`
beside the `OWN_FACE` charge, where a comment now holds its place. Measured
consequence across the full 13-state matrix:

- `captions.overPlate` **5/13 states failing → 1/13**
- `captions.unnamed` mobile default view **3 → 7 of 20 people anonymous**

**There is no middle setting.** Every own-face seat observed covers 90–100% of
its disc, so at phone zoom the choice is binary: erase the face or drop the
name. A coverage threshold has nothing to sit between.

It is left UNAPPLIED because it is a product judgment, not a correctness one,
and it contradicts a decision this file made in writing ("the first is ugly; the
second is anonymous") — §5 is explicit that those get re-litigated by people who
have not read the history. The measurement is what that decision was made
without. **The owner's call**, and the three routes are: apply it and accept the
anonymity; keep today's behaviour and close `captions.overPlate` as won't-fix so
round 14 stops refiling it; or apply it and win the names back by setting the
caption to the GIVEN NAME ONLY at low zoom (~30px against 75px), which is what
the medallion mark already does and would fit honestly.

One more thing came out of the experiment and is worth keeping: with those
captions gone, `discs.dimmed.maxL.laptop.en.dossier` measured **19.58 L\***
against a ≤18 ceiling — a disc the focus pass is not taking far enough down,
which had been **hidden underneath one of the erasing captions** the whole time.
It is invisible while seat #30 stays as it is. Whoever applies the gate inherits
it.

### One harness defect found while closing the round

`discs.dim.gapL.laptop.ko.dossier` failed once at 5.68 against a floor of 6, on
a scene whose focus pass had done nothing wrong. `DISC_BANDS` skips pixels under
a painted label box, so a disc with a caption set across it is sampled on what
the caption left — the **rim**, which is the brightest part of the plate — and
its mean L\* lifts. The `typeOver <= 0.35` filter is correct for the mid-tone
plate test it was written for and far too loose for a luminance comparison.

Measured: eight samples of `discs.dimmed.maxL` read 12.99–13.22 seven times and
17.80 once, and the outlier was the one state carrying a caption at 0.958 over a
face — victim `park-ji-min` on one run, `lee-jin-hyung` on the next, which is
why it moved. The dim comparison now takes only discs a caption has at most
*grazed* (0.05, the same number `captions.overPlate` uses), guarded by a new
`discs.dimSampled` so the stricter filter cannot quietly empty the check.

This is a confound removed, **not** a threshold widened: `captions.overPlate` is
still open and still failing on that state. Worth knowing because it is the
second time this harness has had the same class of bug — see `DISC_BANDS`'s own
docstring — and any future check that reads pixels inside a disc will have it too.

---

## 4. How to run everything

```bash
npm run dev             # dev server on :5173
npm run build           # tsc -b && vite build
npm run validate        # dataset invariants (tsx tools/validate-data.mjs)
npm run assert          # visual/behavioural invariants, production build
npm run check           # all of the above
npm run shots           # 31 Playwright screenshots → shots/
npm run portraits       # who has a portrait, who doesn't, near-miss filenames
```

`npm run shots` regenerates the screenshot set the critics read. Run it before
launching a critic round or they review a stale build.

### The multi-agent loop

Workflow scripts live in
`C:\Users\hyeli\.claude\projects\C--Users-hyeli-CodingProject-Bloody-game-x\14b8bd7d-20a5-49c1-be47-119b4d146af9\workflows\scripts\`.

- **`critics.mjs`** — five independent adversarial reviewers, one per pillar,
  each returning a structured score + defect list. Update its
  "SINCE THE LAST REVIEW" block when something material changes, or reviewers
  judge a product that no longer exists.
- **`fixers13.mjs`** — the most recent fix round; copy it as the template. Note
  its structure: strict per-owner file ownership (disjoint sets), explicit
  "measure it, don't assert it" rule, and gates every owner must pass.

The cycle that works: `shots` → `critics` → write `CRITIQUE.md` → `fixers` with
disjoint file ownership → wire handoffs → `assert` → repeat.

**Ownership must be disjoint.** Two agents editing one file produces lost edits;
this happened in earlier rounds and cost a full round each time.

---

## 5. Constraints that must not be broken

These are settled decisions. Several were re-litigated by agents who hadn't read
the history and had to be reverted.

1. **The spoiler firewall is absolute.** Nothing from *inside* season X — no
   results, eliminations, standings, alliances formed in X, mission outcomes or
   episode events — may appear anywhere in the app or the data, in either
   language. Season X's announced cast list and five-team lineup **are**
   permitted (pre-premiere public information). `tools/validate-data.mjs`
   enforces a bilingual firewall; keep it.
2. **English node labels in English.** The medallion mark carries the given name
   in the reading language — 진호 in Korean, "Jin-ho" in English. A subagent once
   reverted this to Hangul-only with a well-argued case; it is still wrong,
   because the user asked for it directly. The size problem that motivated the
   revert is solved by the cohort clamp in `plateGeometry.ts` (`markSet`), which
   solves all twenty marks together at the 15th centile so they set at one
   optical size.
3. **`public/portraits/` holds the product owner's only copy** of twenty
   supplied photographs. Never overwrite, re-encode or delete one. Derived
   images get new names; originals stay byte-identical.
4. **Colour law.** `--blood` crimson = the brand mark and betrayal edges, nothing
   else. Brass = past champions only. The bone/accent register = state (focus,
   selection, the orbit ego ring) — never a role. `src/graph/palette.ts` is the
   single source; it documents measured ΔE separations and its own open failures.
5. **One fit rule for the plate mark**, in `plateGeometry.ts`. `Portrait.tsx`
   silently re-implemented it inline for three rounds, which is how the cast wall
   and the canvas drew the same mark at two sizes. `validate-data.mjs` section 0b
   now fails the build on a second copy — it is self-tested both ways.
6. **A `parallel` edge means "same record, never met."** It must not be counted
   in any total the UI calls a verified connection, must not draw a rim tick, and
   must not be routed through by the path finder as if it were a meeting.
   `isMeeting` / `NON_MEETING_TYPES` / `tieCounts` in `src/data/edges.ts` are the
   single source — import, never redefine. `validate-data.mjs` section 0c
   enforces this across eight named counting surfaces, in both directions.

---

## 6. Data state

- **20 people**, **47 edges**, 3 prior seasons, 15 glossary terms.
- **290 citations**, 96 unique sources, 76.9% namu.wiki. That percentage is
  pinned in the build: adding a wiki-only `high`-confidence edge fails, and
  sourcing one properly *also* fails until you write the smaller number down.
  `meta.sourcing` in `dataset.ts` states these figures in prose and the validator
  checks the prose against the histogram.
- **Nobody is an orphan** (`no edge at all: 0`), but **three people have zero
  verified ties** — 강지후, 신승용, 최연청. Their only line is a `parallel` record.
  This is a researched finding, not missing data: multiple rounds searched
  agencies, filmographies, university records and shared-programme rosters, and
  the dead ends are recorded in comments in `edges.ts` so they are not re-searched
  a fifth time. The app designs this in as a "walks in cold" band rather than
  hiding it.
- `validate-data.mjs` has ~10 sections including referential integrity, no
  duplicate pairs, no two people at the same rank in a season, no leaked research
  notes, bare-URL sources, ko/en key parity, the bilingual spoiler firewall, the
  fit-rule interlock, the counting-rule interlock, and a shared-cast seam check
  that fails when two people share a programme + year with no edge and no
  recorded dead end.

---

## 7. Open questions for the user

1. **600×600 portraits.** At maximum zoom a disc reaches ~608 device px from the
   supplied 300×300 sources — a 2.03× upscale, so skin goes waxy and WebP
   blocking shows while the vector rings beside it stay razor-sharp. Round 13's
   photo owner was asked to ship a diameter clamp that reads the *source's* real
   size, so 600px files would automatically earn a bigger cap the day they land.
   Worth asking for the larger sources.
2. **Portrait provenance.** All twenty files are bare `VP8` chunks — no EXIF, no
   XMP, no ICC. So there is no photographer, no source URL and no licence
   statement anywhere, and the schema has no field for one. In a product whose
   pitch is that it counts its citations to one decimal place, this is the single
   uncited thing in it. The field guide's SOURCES tab currently prints an honest
   blanket disclosure ("origin unrecorded"). If the user can supply provenance,
   wire per-image credits instead — `AboutSheet.tsx` carries a HANDOFF comment
   naming the exact `dataset.meta.portraits` shape it is waiting for.

---

## 8. Suggested first moves

1. ~~`npm run check`~~ — done. 0 failing.
2. ~~Promote the three `RESOLVED` entries~~ — **two of the three were wrong and
   must not be promoted.** Measured: `reveal.firstPaintedValue` is 1/2 failing
   (early path 0.231 against a ≤0.15 ceiling) and `palette.liftFrames` is 1/1
   failing (5 against ≥6). Neither has a fix behind it; promoting them would
   have red-lit the gate on defects that are still open. Only
   `wall.worstPlateShownAtRest.mobile` was genuinely resolved, and it is
   promoted. The real `RESOLVED` set is now `captions.misattributed` and
   `captions.misattributedUncorrected` — both left in `OPEN` on purpose, with
   the reason written above them: the defect they were filed for fires *one run
   in eight*, and three clean runs is not yet evidence against that.
3. ~~Re-run the two round-13 owners~~ — their code had already landed; see §3.1.
   The missing camera assertion is written and passing.
4. `npm run shots`, then `critics.mjs` for round 14. **This is the actual next
   move.** Round 13 is now closed: 0 failing, and every landed fix in it has an
   assertion behind it.

The camera refit is the highest-value single fix available: it is a blocker, it
has been open four rounds, it degrades the app's primary interaction, and three
separate reviewers have now filed it.

---

## UPDATE — the season-2 cohort gap, and the `Role` bug behind it

A reader review caught that 홍진호 and 이진형 had no line between them. They were
right, and it was not one pair.

**Seven of this lineup played season 2, all as contestants in one field of
thirteen** — so all twenty-one pairs met by construction. Five had no edge:
이진형–홍진호 (the season's winner and its third place), 박지민–현성주,
박지민–윤비, 박지민–서출구, 현성주–윤비. All five are now drawn from namu's
per-day episode pages, each carrying a dated, named-game fact, and each put
through an adversarial refutation pass first. That pass corrected four things
the per-person pages had wrong — the item is 히든 찬스 not 시크릿 찬스
(시크릿 다이스 is a different day-4 game), 넘버 체인지 uses 숫자 블록 not cards,
홍진호 spent his own side's hidden chance in the same exchange, and the 서출구
quote is from the official 일문일답, not his elimination interview.

47 → 52 edges. All three seasons are now internally complete (6/6, 21/21, 10/10).

**The check that should have caught it now exists.** Section 0d asked "were these
two on the same OTHER programme" and never asked it about this franchise's own
seasons — the stronger claim by far. `validate-data.mjs` section 0e now fails the
build on any same-season pair with no edge, with an empty allowlist and the
reasoning that a dead end is not a possible answer here. Verified to bite by
deleting an edge and watching the build go red.

### The `Role` union was lying about two real people

Chasing this surfaced a second bug the reader also half-spotted (they doubted
박지민 was in season 3 at all). She was — namu's 여담 section: "시즌 1, 2 …
에서는 플레이어로, **시즌 3에서는 보조 출연자로 출연**" as the 유령 카지노 dealer
and 연옥 집사, and production hid her appearance as a twist until episode 6,
which is exactly why a viewer would not remember it.

But `Role` was `'contestant' | 'host'`, so **anyone not competing became a host**
— and neither of the two people it applied to hosted anything. 이상민 sat on
season 1's studio panel and never entered the house; 박지민 dealt cards. The
plate drew both with the ring the field guide calls "진행을 맡았던 사람 / has
hosted", so the app asserted something untrue about two named real people.

Now `'contestant' | 'panel' | 'crew'`, with `played()` / `watched()` exported
from `types.ts` — eight surfaces had been testing `role === 'host'` inline, which
is how a two-value union quietly became that assertion. The ring's copy changed
in both languages too. The distinction is load-bearing, not cosmetic: it decides
whether someone could have MET the cast. A panellist watched on a monitor from
another building; a dealer sat at a table players were sent to.

### Note for the next round

`meta.sourcing` in `dataset.ts` states the citation counts as prose and section 9
asserts the prose against the live histogram — so adding edges fails the build
until the paragraph is updated. That is working as intended; it is now
309 citations, 241 namu (78%), 52 lines, 31 wiki-only, 15 of those `high`.
The `high`+wiki-only ratchet is why all five new edges are `medium`.
