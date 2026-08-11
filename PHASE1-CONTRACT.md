# Phase 1 contract — the scope spine

Authoritative answers to the shape questions. The spine owner implements this;
the two tagging owners author against it. If your judgement differs from this
document, report it rather than diverging — three files that disagree about the
shape is worse than any one of the three shapes.

---

## 1. What earns a `WorkId`

> **A work is spoilable if it is a programme with a withheld outcome that a
> viewer watches in order.** A career, a credential, an award and a one-off
> event are biography, not spoilers.

Nobody is "part-way through" somebody's poker career. They can be three episodes
into a season.

Applying it to the two open cases:

- **`생존남녀: 갈라진 세상`** — a survival programme with a winner, and 윤비 won
  it. **It gets an id.** It is missing from `PLAN-spoilers.md` §1 because that
  list was illustrative, not exhaustive; the plan says to derive the set from
  what the data actually claims, which is what turned this up. Good catch.
- **현성주's "세계 포커 대회 우승 경력자" / "a world poker title"** — **no id.**
  A WSOP bracelet is biography. Scope it `[]`.

  But note *where* that clause sits: inside a season-2 arc that goes on to a
  death match and a 17:24 loss. So it is a **split**, not a tag — the poker
  clause is structure and the rest is `bg2`.

The same test retires most of the ~57 titles in the data: 어서와 한국은
처음이지?, MBC 뉴스투데이, 수미네 반찬, 미스코리아, and the "career" pseudo-
entries (`포커 커리어`, `NBA·KBL 커리어`, `배우 활동`) have no withheld outcome.

## 2. Field shape — a run-level default with per-field overrides

Per-field alone is unauthorable across 16 runs × 2 languages; per-run alone
cannot express a panel run whose `placement` is a role label. So both:

```ts
interface SeasonRun {
  /** The default for every outcome-bearing field on this run. A season-2 run
      is ['bg2']. Required by the validator for any run that carries a result. */
  scope?: WorkId[];
  /** Only where a field differs from `scope`. Absent means "use the default". */
  scopes?: {
    rank?: WorkId[];
    fieldSize?: WorkId[];
    placement?: WorkId[];
    eliminatedEpisode?: WorkId[];
    team?: WorkId[];
    arc?: WorkId[];
    /** ALIGNED WITH `beats`, one entry per beat. Not one scope for the array. */
    beats?: WorkId[][];
  };
}
```

**`beats` is per-beat.** Your 박지민 season-3 example settles it: `[structure,
bg3, structure]` in Korean and `[structure, bg1+bg3, structure]` in English. An
array-level scope would hide two safe bullets to protect one.

**The two languages may carry different scopes, and that is correct** — they are
different prose making different claims. The validator checks that both sides
have a scope where they need one; it must NOT require the scopes to be equal.
Say so in the validator's comment, or someone will "fix" it into a parity check.

## 3. `[]` versus absent — this is the fail-closed hinge

- `[]` — **"I read this and it is structure."** Always visible. Use it for the
  panel/crew `placement` role labels (`스튜디오 패널`, `유령 카지노 딜러 · 연옥
  집사`), for occupations, for where two people met.
- **absent** — "nobody has looked at this yet." A later phase treats it as
  hidden, and the validator reports it now.

They must never collapse into one value. The whole fail-closed guarantee is that
a forgotten field degrades to over-redaction rather than to a leak, and that only
works if "checked and safe" is a thing you have to actually write.

## 4. The split mechanism — confirmed, with the invariant you proposed

Your shape, adopted:

```ts
/** Ordered segments whose concatenation is byte-identical to `arc`. */
arcParts?: Array<{ text: string; scope: WorkId[] }>;
```

The validator asserts `parts.map(p => p.text).join('') === arc` exactly. That is
what makes Phase 1 invisible **by construction** rather than by promise — no
renderer reads `arcParts` yet, and when Phase 3 does, joining every part
reproduces today's string character for character.

Split only at sentence boundaries, and only where both halves stand alone.
Report the ones you decide not to split; a fragment is worse than a coarse tag.

## 5. The two fields outside your list — both yours, both in scope

You are right on both counts, and neither was in the brief. Take them in the
same pass.

- **`team` / `teamEn` is outcome-bearing on at least four runs.** 서출구 s3
  `피의 저택 → 지하 감옥 → 복귀` is an elimination *and* a return; 정근우 s1
  `지하팀 (8일차 지상 복귀)` names a day; 윤비 and 서출구 s2 `저택팀 → 야생팀`
  is a defection; 박지민 s2 and 홍진호 s2 name the hidden-player twist. A team
  name alone is structure — an arrow between two team names is a plot.
- **`fieldSize` takes the same scope as `rank`.** `PLAN-spoilers.md` §3 is right
  that the denominator makes the plate arc invertible: an arc drawn at
  `rank/fieldSize` with the rank hidden still tells you the rank if the
  denominator is public. Rendering that safely is Phase 3's problem, but Phase 1
  has to carry the information or Phase 3 cannot.

---

## What has NOT changed

Phase 1 renders byte-identically. No pixel, no string, no behaviour. If a change
of yours is visible, it is out of scope — revert it and report it.

Season X is not a `WorkId` and never becomes one. It is absent from the dataset,
which is a stronger guarantee than redaction and must not be weakened into one.
