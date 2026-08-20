# HANDOFF — Bloody Game X cast atlas

Written 2026-08-20, at the end of a long session, for a fresh chat.

`tsc`, `validate-data` and `vite build` all exit 0. The visual harness is **462
invariants**; the last local run was **462 / 436 / 0 FAILING / 26 known-open**.
The known-open count moves a few either way between runs — the caption and
disc-dimming families are sampling-sensitive — so read the list, not the total.

RE-RUN BEFORE QUOTING A FIGURE. Four handoffs in a row carried a stale one
(319 → 340 → 378 → 428 → 441), each written when it was true and then left
behind by the next commit that added checks.

```
origin/main   971ab34 -> 3d76933   ← LIVE at bloody-game-x.vercel.app
```

**Nothing is unmerged.** Every branch this session opened is in `main` and live.

**And assert the deployed site, not only the preview.** The last production run
found something no local run had: `captions.minNamePx.laptop.en.dossier` at
**8.99** against a floor of 9, where three local runs of the same state read
9.54–9.86. The laptop dossier is the smallest fit zoom this app ever chooses, so
`12.5 × captionLod(k)` lands ON the floor there rather than near it, and a
hundredth of a pixel of camera noise decided it. The painter now clamps
(`LABEL_MIN_PX` in `render.ts`) so the floor holds by construction. Nine branches
are fully
merged and can be deleted: `phase-0-stop-the-bleeding`, `phase-1-scope-spine`,
`caption-diagnosis`, `retire-dating-shows`, `caption-legibility-floor`,
`intro-open-line`, `cue-always`, `handoff-final`, `handoff-true`.

### What shipped this session, in the order a reader meets it

1. **The cold open explains itself, in both states.** The question now names its
   subject, and EVERY returning reader gets a block — 16px title, a sentence,
   one button — at the same weight whichever state they are in. Sealed: how many
   works, and why the connection count reads what it reads. Nothing sealed: that
   the atlas CAN seal endings, and that the counts above are the full record. It
   replaced an 11px chip nobody could decode, and then an 11px open-state line
   that was the same mistake a second time. `intro.scopeLine.open` now asserts
   the block is PRESENT, so do not restore the "nothing sealed, nothing to
   explain" rule it used to assert the absence of.
2. **The badge is pointed at, on every visit.** A card above it plus a ring on
   the badge itself. It took three rounds to get right and the first two were
   the same error: a one-shot. Round one retired it on ANY route into the
   picker, including the cold open's own link; round two bumped the storage key
   and still spent the whole budget on one showing, which the owner spent
   testing it. `state/badgeCue.ts` now writes NOTHING — the memory is a module
   variable, so dismissing puts it away while the page is up and a reload brings
   it back. Do not reintroduce a persistent flag; that file's docblock says what
   to persist instead if it is ever really needed.
3. **The sealed plate mark** — the sixth family, closed. A withheld rank drew
   the beaded ring, whose meaning is "present, not competing", so the atlas told
   an unanswered reader that the season 1 champion had been a panellist. Third
   arc state, both painters, the legend and the career table, in one commit.
4. **Seven works left the registry** by the owner's call — 19 down to 12.
   쇼미더머니 (five ids), then 솔로지옥3 and 환승연애4. The rows still render for
   every reader; only the sealing stopped. The rule is stated by genre in
   `works.ts` §3 and enforced by name in `validate-data.mjs` §10a-bis, which was
   checked by re-adding an id and watching the build refuse it.
5. **All/none on every filter-rail section**, and the blocs gained the pair they
   never had.

### The lesson from this session, because it is the reusable half

**Measure the anomaly before believing it, and measure the fix before keeping
it.** Three separate times a confident answer was wrong until something counted:
a "38% darker face" that was a baseline sampled mid-arrival; a caption fix that
moved 16 names to 14 until the UNCHANGED build also measured 14; and a shrink
ladder whose first rung was already under the legibility floor on the viewport
where most of the drops are. Two of those three shipped nothing. The gate is
worth what it costs only if a green run can still be disbelieved.

---

## 1. What this is

An atlas of the twenty players announced for 피의 게임X (Wavve 2026). Nodes are
cast members with real photographs; lines are relationships that existed
**before season X**. Vite + React 19 + TS (strict), d3-force from a manual rAF
loop, Canvas 2D. Korean is the source of record; full English under
`src/data/i18n/`.

**The season X firewall is absolute.** No results, eliminations, standings or
episode events from X, in either language. The announced cast and five-team
lineup are permitted (pre-premiere public info). `validate-data.mjs` enforces it
bilingually.

### Release discipline — the owner set this and it holds

The site is live with real traffic. **Nothing reaches production unverified.**
Work commits to a branch → pushes → Vercel builds a preview → the preview is
asserted → only then merge to `main`. Never push to `main` directly; a merge is
what deploys.

Two proofs to run against every preview before merging:

```bash
curl -s -o /dev/null -w "%{http_code}\n" <preview-url>          # expect 200
# analytics isolation — the control must fire, or the check is not a check
# The bundle name is content-hashed, so read it out of index.html first: a
# literal `index-*.js` is NOT a curl glob, it 404s, and a 404 body scores 0 on
# BOTH sides — the check passes while the control silently dies with it.
bundle() { curl -s "$1/$(curl -s "$1/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)"; }
bundle <preview-url>                     | grep -c phc_          # expect 0
bundle https://bloody-game-x.vercel.app  | grep -c phc_          # expect 1
node tools/assert-visual.mjs --base=<preview-url>
```

`VITE_POSTHOG_KEY` is scoped **Production only** in the Vercel dashboard, which
is why previews come back 0. Deployment Protection is **off** for previews so
the harness can reach them.

---

## 2. Read this before doing anything else

**`tools/assert-visual.mjs` is the most important artefact in the repo.** It
boots the production build, drives 13+ states and asserts 462 measured
invariants.

```bash
npm run check     # typecheck + validator + build + assert
npm run assert    # just the harness
```

Its tail prints `FAILING` (a regression — keep at 0), `RESOLVED` (promote it) and
`KNOWN-OPEN` (the live backlog, each entry carrying its own measured rate).

Three rules this session paid for, in blood:

1. **Every fix leaves an assertion behind.** A fix the harness cannot see has a
   demonstrated ~50% chance of being next round's regression.
2. **A check that is passing today is not a check that is fixed.** Promote a
   `RESOLVED` entry only on a landed fix, never on a green run —
   `dossier.cascade.inversionFrames` measured 0/4/0 over three consecutive runs.
3. **Assign work by CONCEPT, not by file.** Five rounds each missed a family
   because we assigned the sentences that state a result and forgot the numbers,
   the geometry, or the file nobody owned. The round that finally worked told one
   owner "you own every number derived from an outcome, and the brief's list is
   probably incomplete" — they found three more.

---

## 3. The spoiler-redaction feature — where it actually stands

This is the headline work. A reader asked: *"I have only watched the genius…
I wonder if there is a way to sort of redact info based on what you have
watched."* `PLAN-spoilers.md` is the spec.

| phase | what | state |
|---|---|---|
| 0 | analytics hardening, `tie=` URL, honest copy | **done** |
| 1 | the scope spine — `WorkId`, `scope[]` on every outcome field | **done** |
| 2 | reader context + redaction-aware accessors | **done** |
| 3 | the redacted appearance | **the plate and the table are done — see §4** |
| 4 | the control, and the default flips | **done** |
| 5 | scope-keyed lazy chunks (optional) | not started |

**Phases 0–4 are all on `main` and live.** Only phase 5 is unbuilt. The per-row
marker used to say LIVE on phase 0 alone, which read as a contrast — finished
but not shipped — and that is the one thing to not conclude here.

**It works end to end.** The reporting reader's case is two clicks: 골라서
볼게요 → 더 지니어스 전체. Default is `WATCHED_NONE`, argued from asymmetry — an
over-redacted reader clicks once and has the atlas back; an under-redacted one
has seen 우승 beside a name and cannot un-see it. Three surfaces make sure nobody
meets that default unexplained: the cold open asks (**auto-advance off until
answered**), the status-bar badge says what is hidden and opens the picker, and
deep-link arrivals get a banner.

A fourth surface was added this session, and it is the one a reader actually
meets: **the badge is pointed at, every visit.** A card above it (`.sbcue`,
markup in `StatusBar.tsx`) plus a slow ring on the badge itself.
`state/badgeCue.ts` keeps the dismissal in a module variable and writes no
storage at all, so the mark cannot be permanently spent — see §1 item 2 for the
two rounds that proved it had to work that way. Note what the guard does NOT
cover: `cue.writesNoPermanentFlag` reads one exact key, so a future round that
reintroduces a one-shot under `bgx.cue.badge.v3` would pass it green — which is
precisely how round two slipped past round one. `cue.returnsNextVisit` reloads a
real page and fails the build if it does not come back; `cue.writesNoPermanentFlag`
fails it if anything writes `bgx.cue.badge*` again.

Seed a redacted reader in any harness:

```js
ctx.addInitScript(() => localStorage.setItem('bgx.watched', '[]'))
```

`'[]'` = has watched nothing. A **full 12-id array** = has watched everything.
In `assert-visual.mjs` do not hand-roll either: pass `watched` to `openPage`.

The coach mark is in the frame of every measurement now, and it is not that the
harness stopped seeding: `openPage` still writes the RETIRED key
`bgx.cue.badge.v2` by default (`cue: 'seen'`), and `badgeCue.ts` ignores it.
That is the point — `cue.card.seen` asserts that a browser carrying the old
permanent flag is still pointed at its own control, which is the state the
owner's browser was in. Nothing in the harness dismisses the card; the suite
that measures the mark itself passes `cue: 'fresh'` so the key is absent and
`cue.writesNoPermanentFlag` can tell a write from a seed.

---

## 4. The sixth family — closed, and what it taught

**The sixth family: fallbacks whose "invisible at the default" justification
expired when the default flipped.** Every earlier family was code that was
*always* wrong. These were **correct code, audited and approved, each carrying a
comment explaining it was safe because the default watched-set never reached that
branch.** Phase 4 changed the default and every one of them became the shipping
render — in a commit that touched none of them.

Both of its falsehoods are now fixed, in one commit with the legend, as PLAN §3
requires:

- **The plate.** A withheld rank arrived at the painters as `undefined`, which
  they drew as the **beaded ring** — "present, not competing". At seed `'[]'`,
  이태균 (season 1 CHAMPION) and 이상민 (a genuine studio panellist) came out
  identical. There is a **third arc state** now: `SeasonArc.sealed`, the full
  slot at the track's ink and the value arc's weight, no track under it, no cap,
  no laurel. `sealedRun()` in `build.ts` is the one predicate THE PAINTERS seal
  on — it reads `run.rank` raw and collapses it to a boolean, which is
  participation, not the verdict. The career table keeps its own copy of the
  same test (`AboutSheet.tsx:760`), and the two are not quite identical, so the
  rule lives in two places: move one and check the other. Measured at `'[]'` on the wall: 14 sealed bands in one length,
  이태균 `sealed` vs 이상민 `beaded`, zero brass, zero tracks.
- **The career table.** A withheld finish fell to `—`, the same glyph an unplayed
  season gets, so 이태균's row read `— — —` for a season he was in. It draws a
  constant 16px bar in the season's colour now, named for screen readers, and
  the dash means one thing again. `about.recordSealedNote` was rewritten to
  describe the mark rather than promise something the grid did not do.

**Five painters, not two.** The plan says "both painters or neither"; the real
count is five — `graph/plate.ts`, `components/Portrait.tsx`, then
`CommandPalette.plateOf` and `HoverCard`'s warm pass, which each assemble their
own spec and now ask `sealedRun` for the flag, and `EdgeCard`, which assembles
nothing and reads the built `plate` straight off the node. The first two were
still passing `undefined` after the painters were fixed, and `EdgeCard` had
never passed ranks at all, so its chips drew every season beaded **at every
watched-set**. `Portrait` now calls the shared
`seasonArcs()` instead of re-deriving the layout, which is what kept the count
at five instead of six.

### The harness measures both profiles again

`enterAndSettle` presses Enter, which — once the cold open became a question —
activated the focused *아직 안 봤어요* button, so **every suite was measuring the
redacted profile** and PLAN §8's two-profile discipline was asserted by nothing.
`openPage` now takes `watched: 'all' | 'none' | 'fresh' | string[]` and writes
it to storage before the first script runs — except `'fresh'`, which writes
nothing at all, because `hasStoredAnswer()` reads the key's PRESENCE. That is
the one profile in which the cold open still asks its question, and therefore
the one that must never be driven through `enterAndSettle`; with an answer stored the cold open is a
plain curtain again and Enter cannot choose an exposure. `workIds()` parses the
registry out of `works.ts`, and `redaction.profile.pinnedWorks` asserts that
parse against the badge's own count.

**The finding that fell out of it: the existing checks are NOT
exposure-independent**, which is what the previous handoff assumed. The redacted
profile ran 11 known-open; the two full-exposure runs since ran 21 and 15.
Nothing newly FAILING in either — every one is a pre-existing known-open defect
that is simply worse when there are more marks on screen (`captions.unnamed`
2/13 → 5–6/13, `reveal.frames` 1/2 → 2/2, and two to four `discs.dimmed` /
`discs.dim` dossier entries that were passing at the narrow set). The spread
between 21 and 15 is the bistability the file's own header warns about, so read
the list, not the total. The redacted default had been flattering the harness for
three rounds.

`suiteRedaction` is the new `redaction.*` prefix PLAN §8 asks for, plus the
`cue.*` and `rail.bulkOnEverySection` checks. It drives both profiles.

**Also fixed while in there: five checks that could never fail.**
`chrome.creditAttributed`, `chrome.creditNamed`, `chrome.footerGap`,
`chrome.footerGapLeft` and `chrome.footerOverflow` were written against a
`check(name, value, predicate, bound, note)` signature this file has never had.
The predicate landed in the `spec` slot, so `spec.eq` was undefined and all five
passed unconditionally — including the three written for the 237px footer
collision the owner had caught by eye. If you add a check, the signature is
`check(name, measured, { eq | min | max, unit, note })`.

Still unshipped: `missingFrom` in `works.ts` has zero consumers, so there is no
per-claim reveal anywhere — redaction is by omission on every surface, and the
sealed mark is the only place the app says "there is something here" out loud.
The Dossier's `faced.noResult` branch (`Dossier.tsx:1569`) still tells a sealed
reader that "nobody numbered either finish", which is the wrong reason for the
right silence.

---

## 5. Quality loop

Five independent critics, one per pillar, scored on a 1–10 rubric.

| round | visual | polish | depth | ux | motion |
|---|---|---|---|---|---|
| 1 | 5 | 5 | 7 | 5 | 5 |
| 12 | 6 | 6 | 8 | 6 | 5 |
| 15 | 6 | 7 | 8 | 6 | 6 |
| **16 (latest)** | **7** | **6** | **8** | **6** | **5** |

Goal is 9/10 on every pillar, and NOTHING ENFORCES IT. An earlier handoff said
a session Stop hook did; there is no `hooks` block in any settings file reachable
from this project — not `~/.claude/settings.json`, not `.claude/`, not a managed
policy — so the gate is a habit, and it holds only while somebody runs
`critics.mjs` by hand. `CRITIQUE.md` holds round 16 in full (66 defects, 5
blockers).

**Worth knowing about the scoring itself:** the Gauntlet Loop article the
original prompt was written from argues the bar should be a *concrete reference
for blind A/B*, not a number. Scores have moved ±1 for six rounds, which is the
predicted symptom of each critic re-deriving its own private standard. The owner
chose to keep the 9/10 gate; the observation is recorded, not acted on.

One standing UX blocker from round 16 is still open, not two. Four people in
the crowded centre render with no caption — and not only at ≤1024px, which is
what this line used to say: the harness measures drops at 1280 and at 1600 with
the dossier open as well. §8 has the full account.

The other one SHIPPED and this document went on calling it open: the command
palette's person row calls `setQuery('')` before `onSelect`, so committing a
person is a navigation rather than a filter (`CommandPalette.tsx:569`), and the
docblock above it records the very measurement quoted here — 20/20 people and 52
ties before Enter, 1/20 and 0 after. What is left there is structural and named
in that file: one piece of state still serves both a transient search box and a
durable filter.

Workflow scripts live in
`~/.claude/projects/…/14b8bd7d-…/workflows/scripts/` — `critics.mjs` is the
review round; the `fixers*.mjs` and phase scripts are templates. Update
`critics.mjs`'s "SINCE THE LAST REVIEW" block when something material changes,
or reviewers judge a product that no longer exists.

---

## 6. Constraints that must not be broken

Settled decisions. Several were re-litigated by agents who had not read the
history and had to be reverted.

1. **The season X firewall**, above.
2. **English node labels in English.** The medallion carries the given name in
   the reading language — 진호 / "Jin-ho". A subagent once reverted this with a
   well-argued case; it is still wrong, because the owner asked for it. The size
   problem that motivated the revert is solved by the cohort clamp in
   `plateGeometry.ts`.
3. **`public/portraits/` holds the owner's only copy** of twenty supplied
   photographs. Never overwrite, re-encode or delete one.
4. **Colour law.** `--blood` crimson = brand mark and betrayal only. Brass =
   past champions. The bone/accent register = state, never a role.
   THE LAW AND THESE THREE TOKENS ARE AUTHORED IN `src/styles/tokens.css`;
   `src/graph/palette.ts` owns the per-datum channels (archetype, relationship,
   season) and MIRRORS `BLOOD` / `BRASS` / `ACCENT` for the canvas. Change a
   value in both files or in neither — changing crimson in `palette.ts` alone
   moves the canvas and leaves every DOM surface behind.
5. **One fit rule for the plate mark**, in `plateGeometry.ts`. `validate-data`
   §0b fails the build on a second copy.
6. **A `parallel` edge means "same record, never met."** Never counted as a
   verified connection, never draws a rim tick. `isMeeting` / `countsAsTie` /
   `tieCounts` in `src/data/edges.ts` are the single source — import, never
   redefine. §0c enforces this across eight named surfaces.
7. **A sealed tie is counted by nothing** — the total shrinks, it does not split.
   At `'[]'`, 52 → 24 across every surface.
8. **Three arc states, three meanings, no overlap.** A value arc is a finish, the
   beads are "present, not competing", the constant band is "played, finish
   sealed". Never reuse one for a fourth case; that reuse is what made the app
   call a champion a panellist. `seasonArcs()` in `plateGeometry.ts` is the one
   layout and reads `sealed` before it reads a rank.
9. **A show of a different genre is not a work this atlas seals.** The owner's call, on genre: this
   is a map of a brain-survival house and nobody guards a 2015 rap contest's
   preliminaries — nor a dating show's final couple. SEVEN ids are out of
   `WORKS` (쇼미더머니 as five, 솔로지옥3 and 환승연애4 as one each), the seven
   rows they carried are scoped `[]`, and `validate-data.mjs` §10a-bis fails the
   build if any of them return.
   The rule and its cost are written out in `works.ts`'s inclusion test §3.
10. **Never widen `neverFaced` to match `noTies`.** They are different facts —
    one about the world, one about the view. Widening would make the About sheet
    say 윤비 has never been in a field with anyone, and he has six meetings on
    file including a betrayal.

---

## 7. Data state

20 people · 52 edges · 3 prior seasons · 15 glossary terms · **309 citations**,
104 unique, 78.0% namu.wiki · **12 works** in the scope registry (19 before
쇼미더머니, 솔로지옥3 and 환승연애4 left it).

That percentage is pinned in the build: adding a wiki-only `high`-confidence
edge fails, and sourcing one properly *also* fails until the prose figure comes
down with it. `meta.sourcing` in `dataset.ts` states the numbers and §9 checks
the prose against the histogram.

**Three people have zero verified ties** — 강지후, 신승용, 최연청 — and that is a
researched finding, not missing data. The dead ends are recorded in `edges.ts`
so they are not re-searched. The app designs it in as a "walks in cold" band.

`validate-data.mjs` has ~12 sections including referential integrity, the
bilingual firewall, the fit-rule interlock, the counting-rule interlock, §0d
(shared external programme with no edge) and §0e (**same season with no edge** —
added in an earlier round after a reader found 이진형 and 홍진호 unconnected;
the season-2 cohort was five pairs short).

---

## 8. Suggested first moves

1. `npm run check` — confirm 0 failing and read the known-open list.
2. **Nothing is owed on the cold open — it is settled, and here is the shape.**
   One block, two states, one weight: a 16px title, a sentence, one button,
   whether or not anything is sealed. The sealed state EXPLAINS (its figures are
   not the dataset's); the open state OFFERS ('결과를 가려 둘 수 있습니다' —
   naming the feature, because that reader is the one who will otherwise never
   look at the badge). An earlier round made the open case an 11px line and
   pinned it there with `max: 13`; the owner read it on the live site and could
   not tell what it meant. `intro.openBlockPx >= 15` is the floor that replaced
   that ceiling. Do not make either state quieter than the other.
3. **Per-claim reveal.** `missingFrom` still has no consumers, so nothing in the
   app names its own scope (PLAN §3 rule 3) except the sealed table cell's
   accessible name. The Dossier's `faced.noResult` branch is the sharpest case:
   for a reader whose set sealed a result, "nobody numbered either finish" is
   the wrong reason for the right silence.
4. Then round 17 of the critic loop: `npm run shots`, then `critics.mjs`. Tell it
   what changed — the third arc state, the coach mark, the seven works that
   left the registry, the cold open's lead and its returning-reader block — or
   it will review a product that no longer exists.

### `captions.unnamed` — do not start here, and read this before you do

Four people in the dense middle go unnamed — 홍진호, 이진형, 박지민, 정근우 —
and this session spent itself proving which fixes do NOT work. The count is now
split into the two failures it had been conflating, per state:

    captions.dropReason.stray    13 of 16 — seats FOUND, every one refused
    captions.dropReason.noSeat    3 of 16 — nowhere legal for the box at all

**Tried and reverted, with numbers, so nobody repeats them:**

- *A 61-seat probe grid* (16 bearings, two radii, closed-form corner standoff,
  honesty tested against discs behind panels too). Worked as designed — probes
  taken up to 9 times a state, every one honest. Moved `unnamed` 16 → 14. Then
  the UNCHANGED build measured 14 as well. The gain was run-to-run noise.
- *Taxing the probes* so the fixed inventory wins ties: worse (16 → 15). The
  movement is redistribution, not churn — a label taking a probe VACATES a fixed
  seat a cramped neighbour then takes.
- *A per-node shrink ladder.* Cannot start: on the phone `nameSize` is already
  10.2px, so rung one is 9.18px, under the floor. Forcing a 7px floor recovers
  two of the four at 7.2px — i.e. the lever works only by making names
  unreadable, and `captions.unnamed` counts labels rather than legible ones, so
  it would have scored as a win.

**What that leaves.** These four sit in a cluster interior whose Voronoi cell is
narrower than the caption box. Honest, legible, and off other faces — pick two.
The untried lever is re-opening the own-face seat round 15 withdrew, which
recovers them at the price of `captions.overPlate`. That is a product decision,
not a solver one, and it is the owner's.

### Still owed, and named so it is not rediscovered

- **The cold open is the only surface that reports the setting on arrival.** The
  badge does it at rest and the picker does it in full. If a third surface ever
  needs to, take the words from `status.watchedBadge` rather than writing a
  fourth phrasing of one state.
- **`.intro` overflows its own viewport at 720px** — `scrollHeight` 816 against a
  720 client — PRE-EXISTING and unrelated to the lead (measured: identical with
  the lead hidden). It does not clip on a fresh load, but a focus scroll can
  shift the masthead off the top. Written down so the next person measures
  before blaming the lead.
- **The dossier's `faced.noResult` branch**, above — the last place a sealed
  reader is given a wrong reason rather than a named silence.

The release discipline in §1 still holds and still earns its keep: branch, push,
let Vercel build, run the three proofs against the preview, and only then merge.
The merge is the deploy, so the merge is the owner's call.
