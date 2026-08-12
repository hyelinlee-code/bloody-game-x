# Phase 2 contract — reader context and accessors

Phase 1 tagged what every claim gives away. Phase 2 builds the machinery that
*could* act on those tags, and **deliberately does not act on them yet**. The
default watched-set is "everything", so this phase must be invisible.

Read this before writing a line. It exists because two agents collided in Phase
1 by inferring a shape instead of asking for one.

---

## 0. The rule that outranks everything

**With the default watched-set, every rendered byte is identical to `HEAD`.**

Phase 2 ships plumbing, not behaviour. If a screenshot changes, the phase is
wrong — no matter how good the change looks. The auditor will prove this two
ways: byte-identity at the default, *and* that flipping the set actually
redacts. Plumbing that is invisible because it is disconnected fails the second
test.

## 1. Reuse — do not rebuild

Phase 1 already shipped these in `src/data/works.ts`. Import them. Writing a
second copy of any of them is a defect:

| symbol | what it is |
|---|---|
| `WorkId` | the 19 work ids |
| `WatchedSet` = `ReadonlySet<WorkId>` | the reader's context |
| `WATCHED_NONE` | empty set |
| `ALL_WORK_IDS` | every id |
| `isVisible(scope, watched)` | **`undefined` scope ⇒ false.** Fails closed. |
| `missingFrom(scope, watched)` | which works you still need |
| `OUTCOME_FIELDS` / `_EN` | which fields a scope protects |

`isVisible` already implements AND-semantics and the fail-closed rule. Do not
re-derive them.

## 2. The two new files (owner A, lands first)

### `src/state/useWatched.ts`

```ts
export const WATCHED_ALL: WatchedSet;          // every ALL_WORK_IDS member
export function WatchedProvider(p: {children}): JSX.Element;
export function useWatched(): { watched: WatchedSet; setWatched(s: WatchedSet): void };
```

- **Default is `WATCHED_ALL`.** Not `WATCHED_NONE`. Phase 4 flips the default;
  Phase 2 must not.
- Persist to `localStorage['bgx.watched']` as a JSON id array, reading it back
  through `ALL_WORK_IDS` so an unknown id from a future build is dropped rather
  than crashing. Absent key ⇒ `WATCHED_ALL`.
- `setWatched` exists and works, but **nothing in the UI calls it this phase.**
  That is intentional: the auditor drives it directly to prove the plumbing.
- Expose the current set to non-React modules via a module-level snapshot the
  provider keeps in sync, because `headToHead.ts` and `build.ts` are plain
  modules. Name it `currentWatched()` and document that React code must use the
  hook so it re-renders.

### `src/data/redact.ts`

```ts
export function pick<T>(v: T, scope, watched): T | undefined;
export function prose(parts, whole, scope, watched): string;
```

- `pick` is the single gate. One function, so Phase 3 has one place to change
  when hidden stops meaning "absent" and starts meaning "sealed".
- `prose` assembles from `*Parts` when the whole is hidden but some parts are
  visible — that is the entire reason Phase 1 authored 80 splits. Joining
  visible parts must reproduce the original exactly when everything is visible.
- Re-export `isVisible` / `missingFrom` so consumers have one import.

## 3. Owner B files, strictly disjoint

| owner | files — **touch nothing else** |
|---|---|
| `p2:ledger` | `src/data/headToHead.ts` |
| `p2:graph` | `src/graph/build.ts` |
| `p2:accessors` | `src/data/i18n/index.ts` |
| `p2:search` | `src/components/CommandPalette.tsx` |

**Before you finish, run `git diff --name-only` and report every path.** If a
path outside your list appears, say so loudly rather than reverting it — it
means another owner is in your tree and the lead needs to know. Phase 1 lost a
run to exactly this and the collision was only caught by luck.

### `p2:ledger`
Module-scope constants become functions of a watched-set: `career`,
`careerTable`, `ledgerFor`, `meetingsFor`, `haveFaced`, `neverFaced`,
`noComparableResult`. Memoise on set identity — these are called per render.
A result whose scope is hidden must not be counted, which changes `faced`,
`outlasted` and `share`, so the denominators move too. Keep the existing
`NON_MEETING` rule; import `isMeeting` from `data/edges.ts` rather than the
private copy at line 327 (a Phase 1 handoff already asked for this).

### `p2:graph`
`buildGraph(data, watched)`. `degree` and `strengthSum` already skip
non-meetings; they must now also skip edges whose scope is hidden. `noTies`
follows. Do **not** change node radius weighting logic — only what feeds it.

### `p2:accessors`
`src/data/i18n/index.ts` is where every content read already funnels
(`personBio`, `personNotableFor`, `runText`, edge label/description…). Route
each through `pick`/`prose`. Signatures gain a `watched` parameter with a
default of `currentWatched()` so no call site breaks this phase.

### `p2:search`
Both corpora — the Korean and the English haystacks — must stop carrying
placements and ranks. Today typing `우승` surfaces the winner, which is a leak
through search even when every panel is sealed. Strip the placement/rank text
from the indexed string; keep names, occupations, categories and show titles.
The scored `reason` line must not print a placement either.

## 4. What Phase 2 must NOT do

- No UI. No picker, no badge, no cold-open question — that is Phase 4.
- No sealed strips, no third plate state — Phase 3.
- No change to any default. No change to `PLAN-spoilers.md` phase order.
- No touching `src/data/*.ts` content files. Phase 1 finished those.

## 5. Gates, all three, before you report

```
npx tsc -p tsconfig.app.json --noEmit
npx tsx tools/validate-data.mjs
npm run build
```

Plus the phase's own proof, which you run yourself and quote:

```
git diff --numstat <your files>     # deletions must be ~0 for content files
```
