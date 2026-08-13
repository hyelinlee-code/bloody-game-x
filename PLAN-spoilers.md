# Plan — redaction by what you have watched

Prompted by a reader:

> "I have only watched the genius. And would look to peruse through this but
> there are lots of spoilers? I wonder if there is a way to sort of redact info
> based on what you have watched."

They are right, and the problem is bigger than it looks. A four-way audit found
**168 places** where a season outcome reaches a reader — 71 of them total
give-aways. This document is the plan. Work happens on branch
`spoiler-redaction`; **nothing is pushed, so nothing is deployed.**

---

## 0. The thing to understand first

The app already has an absolute firewall — against season X, the unaired season
— and it works by **excluding the data**. `tools/validate-data.mjs` fails the
build if season X material appears anywhere.

That strategy cannot be reused here. Seasons 1–3 must stay in the file, because
the readers who *have* watched them are the ones the atlas is for. So the second
firewall has to be a **redaction layer at display time**, and a display layer is
a fundamentally weaker guarantee than exclusion. Saying that difference out loud
is part of the work (see §6).

**And the current copy already over-promises.** Five panels plus `index.html`'s
meta description say "spoiler-free" in absolute language while meaning "no
season X". The reader who wrote in read that badge, trusted it, and got hurt.
Fixing the sentence is Phase 0 and does not wait for the feature.

---

## 1. The control

**One question, asked as "what have you seen?" — never "how spoiled do you want
to be?"** The reader knows their viewing history. They do not know which of this
app's fields are dangerous. The control takes the input they have and does the
danger mapping itself.

Two axes, because the reporting user watched **a different show**:

- **A — the franchise ladder.** Ordinal, because seasons air in order and people
  watch in order: *none → S1 → S2 → S3*. One slider, four stops.
- **B — outside works.** A checklist: 더 지니어스, 대학전쟁, 환승연애4,
  프로젝트 지니어스, poker tournaments, sports careers. The atlas states outcomes
  for all of them.

Three presets on top: **아직 안 봤어요 / 다 봤어요 / 골라서 볼게요**.

---

## 2. What is hidden, and what is not

The line: **participation is not a spoiler; outcome is.**

| Kept | Hidden |
|---|---|
| Who is in the cast | Any rank, placement, field size |
| That a person was in season N | How they finished it |
| That a tie exists between two people | What the tie *is*, when the type is a verdict |
| Occupation, archetype, bloc, non-result bio | Elimination day, episode, scoreline |
| Season premise, format, air dates | Winner names, signature moments, prize reconciliation |
| Where two people met | Who betrayed whom, who outlasted whom |

A line between two people is structure. `betrayal` is a verdict, and the
arrowhead is a verdict with a direction — both degrade to a neutral tie.

---

## 3. What a hidden thing looks like

Three rules, then the hard case.

1. **Never a false value.** Not a zero, not an em dash, not a blank cell, and
   never the existing "first time in the house" empty state — that would make
   the app lie to the exact reader it is protecting.
2. **Never a hole.** Same footprint, same card height, same section order. If a
   redacted dossier is shorter, height itself becomes a channel and the wall
   tells you who has history before you read a word.
3. **Always named, always reversible in place.** Every sealed block is a button
   carrying its own scope — `시즌 2 기록 · 가려짐 · 보기`. Naming the scope is
   the whole design: it teaches why this is hidden, says it is a setting rather
   than a bug, and offers the one-click override. A grey blob reads as broken.

### The plate is the hard case

The portrait plate encodes the finish **geometrically**: arc length is
`rankFrac(rank, field) × SPAN_MAX`, which is exactly invertible. Measure the
arc, read the season off its colour, look up that season's field size — which
the app prints on its own season pages — and you recover the placement. The
brass laurel means champion outright.

Two fixes look right and are wrong:

- **Withhold `ranks` only** → `fieldOf` falls back to `FIELD_DEFAULT = 13` and
  the arc still encodes a rank, now against the wrong denominator. A false value
  drawn in vector.
- **Fall through to the beaded arc** → that mark already means "present, not
  competing". Reusing it makes the app assert 이태균 was a panellist.

**Correct: a third arc state, used for nothing else.** Full slot, constant
length, season colour kept (colour is participation, which the plate is allowed
to state), drawn as a single hairline at the track's own ~12% ink. Three states,
three meanings, no overlap. Deleted in redacted mode: the laurel (all three
variants), the terminal cap dot, the winner's heavier stroke, and the track —
the track is the calibration that turns "an arc of some length" into a placing.

> **As built — one departure, and the rule above is the reason for it.** The ink
> is the track's, as specified. The WEIGHT is the value arc's, not the track's
> (`SEALED_ARC_INK` / `SEALED_ARC_W` in `plateGeometry.ts`). At the track's ink
> *and* the track's weight a sealed slot is pixel-for-pixel an empty track, and
> an empty track is not neutral — it is the calibration with nothing on it, so a
> plate carrying one sealed and one unsealed run reads the sealed one as a value
> of zero, i.e. the bottom of the field. That is rule 1's false value, drawn in
> vector. Same ink, double the weight: no quantity, and not the empty half of a
> scale either.

**The legend moves in the same commit as the geometry**, or a constant-length
ring becomes a claim about a finish.

**Both painters or neither.** Every mark exists twice — `components/Portrait.tsx`
and `graph/plate.ts` — and this repo has already shipped three divergences
between them.

**And upstream of both:** `isWinner` rides into node `radius` and into
`plateExtent`, which is a two-valued function of it (1.8296 vs 1.7185). A
redaction that only touches painters still leaks the championship through disc
size. `buildGraph` takes the watched-set as an input.

---

## 4. Where it is set, and the default

Three places, all required:

1. **The cold open becomes a gate for this one question.** Today it is a curtain
   with a 4.5s auto-advance and four ways out — a screen you tap through in
   400ms, so it cannot currently carry a decision. The ENTER pill becomes three
   buttons and **the auto-advance is disabled until answered**: an involuntary
   advance would choose an exposure the reader never chose, which is the harm.
2. **The status bar's shield badge becomes a readout *and* the control.** That
   badge is the object the reporting reader trusted. Status and control as one.
3. **Per-claim reveal**, everywhere a sealed strip renders.

Persistence: `localStorage`, on the `useLang.ts` idiom.

**Deep links deliberately do not carry the setting.** `useDeepLink.ts` argues
that language *is* written to the URL because "the default is not a property of
the sender's machine" — language belongs to the document. Spoiler tolerance
belongs to the **reader**, so the same argument runs the other way and the
conclusion flips. The rule: **a link may never raise the recipient's exposure.**

### The default for a first-time visitor: fully redacted

The argument is asymmetry, and the rest is support. An over-redacted reader
clicks one button and has everything back. An under-redacted reader has seen
우승 and cannot un-see it. When one error costs a click and the other is
permanent, the default goes to the recoverable side.

Supporting: it is the only default that makes the existing "spoiler-free" copy
true; the arriving population for a pre-premiere atlas is disproportionately
unspoiled; and the redacted product is **still the product** — twenty nodes,
fifty-two ties, who knows whom, where they met, five blocs, archetypes, the
non-result half of every bio. The stated pitch ("who already knows whom before
they walk in") survives redaction intact.

Two corollaries that are part of the decision:

- **The first painted frame must already be redacted.** No storage, private
  browsing, pre-hydration — all resolve hidden. A layer that redacts on frame
  two is theatre.
- **Fail closed on missing scope.** An untagged claim is *always hidden*. A
  forgotten tag then degrades to over-redaction, which someone reports as
  annoying, rather than to a leak, which nobody reports until another reader
  writes in.

---

## 5. The biggest risk: subtraction is legible

Every derived figure in this app reconciles against a total. `careerTable` is
the twelve people with a rankable career — hide season 2, watch someone vanish
from it, and you have learned they were in season 2. `unadjudicated` is
`sharedAppearances − meetings`, so it *inflates* as meetings are hidden and
becomes a precise counter of what is being withheld. `meta.sourcing` hard-codes
52 ties and 309 citations, so the paragraph tells you how many lines you are not
being shown.

So the failure mode is not "we missed a string". It is that a careful reader can
diff a partial view against the shape of the whole and recover exactly what was
withheld — and that reader is, by construction, the one who set the control.

**The rule that prevents it, held through every phase:** every derived figure is
**recomputed from the reader's visible set**, never filtered from a constant — or
it is pinned to the full dataset and *explicitly labelled as such* ("52 ties in
the full atlas"). Never the middle.

---

## 6. What a display layer cannot fix

Three, each needing a different kind of honesty.

1. **The bundle.** Every outcome ships as a plaintext literal and survives
   minification. No display layer touches it. **The honest thing is to say so**,
   in the field guide, in the same breath as the control: this hides records
   from the page; it does not remove them from the file your browser downloaded.
   The one hard guarantee is different and still holds — season X is not in this
   app at all. Phase 5 can make the stronger claim true; do not claim it early.
2. **Analytics.** See below — this one is not disclosure, it is deletion.
3. **The URL.** `#tie=a~b~betrayal` is a sentence, in the address bar, in
   history, in link previews and in every `$current_url`. Drop the type from the
   address; a pair plus an ordinal is enough, since the validator already caps a
   pair at two ties.

---

## 7. Phases

Each ships green on its own.

- **Phase 0 — stop the bleeding.** No model, no control, independently correct.
  Analytics hardening; drop the edge type from the URL; rewrite the five
  over-promising "spoiler-free" strings *before* any control exists; gate the
  debug probes; fix two standalone defects the audit turned up.
- **Phase 1 — the scope spine.** Data only, zero visible change. A closed
  `WorkId` enum and `scope: WorkId[]` on every outcome-bearing field. Split the
  multi-scope prose blobs. Validator section 10 asserts every outcome field
  carries a scope. Largest authoring job; everything depends on it.
- **Phase 2 — reader context and accessors, still showing everything.** Route
  every read through redaction-aware accessors. Convert `headToHead.ts`'s
  module-scope constants into functions of a watched-set. `buildGraph` takes the
  watched-set. Strip placements from **both** search corpora. Default unchanged,
  so nothing moves for anyone.
- **Phase 3 — the redacted appearance.** Sealed strips, the third plate state in
  both painters, the legend in the same commit, neutral orderings, recomputed
  counts. Harness drives it; still no user control.
- **Phase 4 — the control, and the default flips.** Cold-open question,
  badge-as-control, persistence, link-arrival banner. Ships last, so the risky
  change is one line and everything under it is already asserted.
- **Phase 5 — the honest guarantee (optional).** Scope-keyed lazy chunks so an
  unrevealed scope is never downloaded. Only then may the copy upgrade from
  "hidden from this page" to "not in what your browser downloaded".

---

## 8. The invariant

One prefix, `redaction.*`, in `tools/assert-visual.mjs`, measured off the
production build in the default profile.

**Headline: `redaction.text.leaks` = 0.** Walk a redacted session through every
panel and assert zero outcome needles in rendered text, in any `title` /
`aria-label` / `alt`, in any `.sr-only` node, or in any live region.

**The property that makes it the right check: the needle corpus is generated
from the dataset, not hand-maintained.** Every placement, elimination, arc,
beat, result, signature moment, winner name and duel scoreline — in *both*
string tables independently, because the English side sometimes says more than
the Korean. Adding a new spoiler to the data automatically adds it to the
assertion. A hand-written word list would go stale on the first new edge.

Four more: `redaction.plate.rankArcs` (swept angles collapse to one distinct
value; zero brass; `plate/r` single-valued), `redaction.search.oracle` (우승
returns the same count as a nonsense control, in both corpora),
`redaction.url.verdictFree`, `redaction.firstPaint.clean`.

Plus the two-profile discipline: **every existing assertion must still pass at
full exposure**, so this work cannot quietly degrade the app for readers who
have watched everything.
