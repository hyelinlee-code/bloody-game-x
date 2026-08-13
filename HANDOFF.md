# HANDOFF — Bloody Game X cast atlas

Written 2026-08-13, at the end of a long session, for a fresh chat.

Tree is clean. `tsc`, `validate-data` and `vite build` all exit 0; the visual
harness runs **319 invariants / 304 ok / 0 FAILING / 15 known-open**.

```
origin/main          971ab34   ← LIVE at bloody-game-x.vercel.app
phase-1-scope-spine  92cde1f   ← 18 commits ahead. Current branch. Pushed.
```

Latest preview: https://bloody-game-lo3w80go9-hyelin-lees-projects.vercel.app

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
curl -s <preview>/assets/index-*.js | grep -c phc_               # expect 0
curl -s <prod>/assets/index-*.js    | grep -c phc_               # expect >=1
node tools/assert-visual.mjs --base=<preview-url>
```

`VITE_POSTHOG_KEY` is scoped **Production only** in the Vercel dashboard, which
is why previews come back 0. Deployment Protection is **off** for previews so
the harness can reach them.

---

## 2. Read this before doing anything else

**`tools/assert-visual.mjs` is the most important artefact in the repo.** It
boots the production build, drives 13+ states and asserts 319 measured
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
| 0 | analytics hardening, `tie=` URL, honest copy | **done, LIVE** |
| 1 | the scope spine — `WorkId`, `scope[]` on every outcome field | **done** |
| 2 | reader context + redaction-aware accessors | **done** |
| 3 | the redacted appearance | **partly — see §4** |
| 4 | the control, and the default flips | **done** |
| 5 | scope-keyed lazy chunks (optional) | not started |

**It works end to end.** The reporting reader's case is two clicks: 골라서
볼게요 → 더 지니어스 전체. Default is `WATCHED_NONE`, argued from asymmetry — an
over-redacted reader clicks once and has the atlas back; an under-redacted one
has seen 우승 beside a name and cannot un-see it. Three surfaces make sure nobody
meets that default unexplained: the cold open asks (**auto-advance off until
answered**), the status-bar badge says what is hidden and opens the picker, and
deep-link arrivals get a banner.

Seed a redacted reader in any harness:

```js
ctx.addInitScript(() => localStorage.setItem('bgx.watched', '[]'))
```

`'[]'` = has watched nothing. A **full 19-id array** = has watched everything.

---

## 4. The open blocker, and why it is subtle

The last audit returned **FAIL**, and the reason is the most interesting finding
of the session.

**The sixth family: fallbacks whose "invisible at the default" justification
expired when the default flipped.** Every earlier family was code that was
*always* wrong. These are **correct code, audited and approved, each carrying a
comment explaining it is safe because the default watched-set never reaches that
branch.** Phase 4 changed the default and every one of them became the shipping
render — in a commit that touched none of them.

Find the whole family:

```bash
grep -rn 'Phase 3 ' src --include=*.ts --include=*.tsx    # 9 hits, 4 are live branches
```

Two of them make the app **assert a falsehood**:

- **`src/graph/build.ts:384-391`** — a withheld rank goes to the painter as
  `undefined`, and both painters draw `undefined` as the **beaded ring**, whose
  established meaning is "present, not competing". Measured at seed `'[]'`:
  이태균 (season 1 CHAMPION) and 이상민 (a genuine studio panellist) produce a
  **byte-identical arc signature**. `PLAN-spoilers.md §3` forbids exactly this
  move and uses exactly this person as the example. 14 of 16 beaded rings at the
  empty set are runs that were played.
- **`src/components/AboutSheet.tsx:1726-1745`** — a withheld finish falls to
  `—`, the same glyph an unplayed season gets. 이태균's row reads `— — —`; he was
  in season 1. `PLAN §3` rule 1 forbids the em dash by name. And the caption
  directly above promises "who was in which season is still here" — three
  user-facing strings are now false of the table they sit on
  (`about.recordSealedNote`, `status.watchedTitle`, `watched.keeps`).

The real fix is **PLAN §3's third mark** — a distinct "sealed" state, landing in
both painters and the legend in one commit. Not a fourth reuse of the beads.

### The harness has stopped measuring full exposure

`enterAndSettle` presses Enter, which now activates the focused *아직 안 봤어요*
button, so **the entire suite measures the redacted profile**. It passes there —
a real finding, every existing assertion is exposure-independent — but PLAN §8's
two-profile discipline is now asserted by nothing, which is why the two blockers
above sit in a green tree. Both harnesses need to pin the profile explicitly via
`addInitScript`. This has been handed off twice and is still open.

Also unshipped: `missingFrom` in `works.ts` has zero consumers, so there is no
per-claim reveal anywhere — redaction is by omission on every surface.

---

## 5. Quality loop

Five independent critics, one per pillar, scored on a 1–10 rubric.

| round | visual | polish | depth | ux | motion |
|---|---|---|---|---|---|
| 1 | 5 | 5 | 7 | 5 | 5 |
| 12 | 6 | 6 | 8 | 6 | 5 |
| 15 | 6 | 7 | 8 | 6 | 6 |
| **16 (latest)** | **7** | **6** | **8** | **6** | **5** |

Goal is 9/10 on every pillar; a session Stop hook enforces it. `CRITIQUE.md`
holds round 16 in full (66 defects, 5 blockers).

**Worth knowing about the scoring itself:** the Gauntlet Loop article the
original prompt was written from argues the bar should be a *concrete reference
for blind A/B*, not a number. Scores have moved ±1 for six rounds, which is the
predicted symptom of each critic re-deriving its own private standard. The owner
chose to keep the 9/10 gate; the observation is recorded, not acted on.

Standing UX blockers from round 16, both re-filed and both still open: the
command palette leaves its query on as a graph filter (Enter on a person
collapses the atlas from 20 people to 1, ties to 0), and at ≤1024px the four
highest-degree people render with no caption at all.

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
   `src/graph/palette.ts` is the single source.
5. **One fit rule for the plate mark**, in `plateGeometry.ts`. `validate-data`
   §0b fails the build on a second copy.
6. **A `parallel` edge means "same record, never met."** Never counted as a
   verified connection, never draws a rim tick. `isMeeting` / `countsAsTie` /
   `tieCounts` in `src/data/edges.ts` are the single source — import, never
   redefine. §0c enforces this across eight named surfaces.
7. **A sealed tie is counted by nothing** — the total shrinks, it does not split.
   At `'[]'`, 52 → 24 across every surface.
8. **Never widen `neverFaced` to match `noTies`.** They are different facts —
   one about the world, one about the view. Widening would make the About sheet
   say 윤비 has never been in a field with anyone, and he has six meetings on
   file including a betrayal.

---

## 7. Data state

20 people · 52 edges · 3 prior seasons · 15 glossary terms · **309 citations**,
104 unique, 76.9% namu.wiki.

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
added this session after a reader found 이진형 and 홍진호 unconnected; the
season-2 cohort was five pairs short).

---

## 8. Suggested first moves

1. `npm run check` — confirm 0 failing and read the known-open list.
2. **Close the sixth family.** The two blockers in §4 are the highest-value work
   in the repo: the app currently tells an unanswered reader that the season 1
   champion was a panellist. The fix is PLAN §3's third mark in both painters and
   the legend, in one commit.
3. **Pin the harness profile** so full exposure is measured again — otherwise the
   next blocker will also sit in a green tree.
4. Then round 17 of the critic loop: `npm run shots`, then `critics.mjs`.

Merge to `main` only after a preview run comes back clean. The branch is 18
commits ahead and every one of them is verified; nothing is merged yet.
