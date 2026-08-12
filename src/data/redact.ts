import { isVisible } from './works';
import type { ProsePart, WatchedSet, WorkId } from './works';

/**
 * The gate. Every outcome-bearing read passes through here or through nowhere.
 *
 * works.ts holds the vocabulary and the predicate; useWatched.ts holds the
 * reader's answer. This file is the two functions that spend them, and it is
 * two rather than twenty so that Phase 3 — when "hidden" stops meaning ABSENT
 * and starts meaning SEALED, with a strip that names its own scope — has one
 * place to change instead of a search across every accessor.
 *
 * PHASE 2 CHANGES NOTHING ON SCREEN. With the default watched-set every scope
 * is satisfied, `pick` returns its argument and `prose` returns `whole` byte for
 * byte. If a screenshot moves, this file is wrong.
 *
 * ── what does NOT belong here ───────────────────────────────────────────────
 * Structure. Names, occupations, categories, blocs, air dates, formats,
 * premises, hooks, episode counts, `Edge.source`/`target`/`season`, and the
 * plain fact that somebody appeared in a season. `OUTCOME_FIELDS` in works.ts
 * is the list of what IS at stake, and it is deliberately short. Routing a
 * structural field through `pick` does not make the app safer; it makes it fail
 * closed on a field nobody ever tagged, and blank a name.
 */

/* One import for a consumer: the predicate, the scope-namer, and the two types
   they are written in. Re-exported, never re-implemented — a second copy of
   `isVisible` would be a second place for the fail-closed rule to be got
   wrong. */
export { isVisible, missingFrom } from './works';
export type { ProsePart, WatchedSet, WorkId } from './works';

/**
 * Show `value`, or withhold it.
 *
 * FAIL CLOSED, END TO END. `isVisible` answers false for an `undefined` scope,
 * and this function does nothing to soften that: an untagged field comes back
 * `undefined` here, exactly as a tagged-but-unwatched one does. The validator's
 * §10c sweep is what keeps that branch theoretical for real data — fail closed
 * at runtime, fail loud in CI — and the day somebody adds an outcome field
 * without a scope, the field goes blank rather than the ending going public.
 *
 * `T | undefined` MEANS "NOT SHOWN", AND SO FAR ALSO "NOT THERE". A caller
 * cannot tell an absent field from a withheld one from this return value alone,
 * and Phase 3 needs to, because a sealed strip has to name what would unlock
 * it. That is what the re-exported `isVisible` / `missingFrom` are for: ask
 * them about the same scope and you get the reason, not just the verdict.
 *
 * ARRAY-VALUED PROSE IS SCOPED PER ENTRY — `beats` and `notableFor` carry a
 * `WorkId[][]`, aligned by index (types.ts, and the validator's §10b asserts
 * the alignment). Filter through this same gate rather than writing a second
 * one:
 *
 *     const shown = beats
 *       .map((b, i) => pick(b, run.scopes?.beats?.[i] ?? run.scope, watched))
 *       .filter((b) => b !== undefined);
 *
 * NAME CLASH, ON PURPOSE NOT AVOIDED. `useLang()` also hands out a `pick`, for
 * choosing the Korean or the English side of a pair. They compose — you pick a
 * language, then you pick whether the reader may see it — but a file that wants
 * both should alias one of them at the import.
 */
export function pick<T>(value: T, scope: readonly WorkId[] | undefined, watched: WatchedSet): T | undefined {
  return isVisible(scope, watched) ? value : undefined;
}

/**
 * A paragraph, assembled from as much of itself as this reader may read.
 *
 * This is what Phase 1's eighty splits were authored for. A field whose scope
 * is satisfied returns `whole` untouched. A field whose scope is not satisfied
 * still has parts, each tagged by whoever decided where the claim changes, and
 * the visible ones are joined — so 윤비's season-2 account survives for a reader
 * who has not seen 생존남녀, instead of the whole paragraph vanishing to protect
 * one clause about a different programme.
 *
 * ── the byte-identity fast path ─────────────────────────────────────────────
 * `isVisible(scope, watched)` is asked FIRST and returns `whole` itself, not a
 * reconstruction of it. At the default watched-set that is the only branch
 * anything reaches, so this function cannot alter a single character of what
 * ships today even if a split is wrong. (A wrong split fails the build anyway:
 * validate-data.mjs §10a asserts `parts.map(p => p.text).join('') === whole`.)
 *
 * ── THE SEPARATOR: NONE ─────────────────────────────────────────────────────
 * The parts were authored to concatenate with nothing between them, so nothing
 * is what goes between them. Inserting `' '` would be the more forgiving thing
 * to read and it is not available: with a separator, a field whose every part
 * is visible would render DIFFERENTLY from that same field's `whole`, and the
 * one property this phase must not lose is that joining everything reproduces
 * today's page exactly. A separator buys prettier redactions by making the
 * unredacted case a lie.
 *
 * What that costs, measured over all 80 split fields rather than assumed:
 *
 *   · WHITESPACE — nothing, after the tidy below. No part in the corpus begins
 *     with a space (the separating space always sits at the END of the
 *     preceding part), so dropping any subset can only ever leave a TRAILING
 *     space, never a doubled one. `trim()` removes it.
 *   · GRAMMAR — this is the real cost and no join can fix it. 33 of the 80
 *     fields open with a scoped part, and the survivor then begins on the
 *     connective that referred to it. 이상민's 더 지니어스 arc, read by someone
 *     who has not seen 「게임의 법칙」 (`genius-1`), now opens "이듬해 시즌2 「룰
 *     브레이커」에서는…" / "The following year he took season 2…" — the following
 *     year after WHAT. It is a sentence that reads as if a line went missing,
 *     because one did.
 *
 *     That is a display problem and it has a display answer, which is Phase 3's:
 *     a sealed strip printed where the part was, naming the season that would
 *     unlock it. This function must not paper over the gap by rewriting prose it
 *     did not author — a silently smoothed paragraph is one the reader trusts as
 *     complete, and PLAN-spoilers.md §5 is about exactly that: subtraction has to
 *     stay legible. Until Phase 3 lands, a caller that needs to know whether
 *     anything was withheld compares the result with `whole`.
 *
 * ── the other returns ───────────────────────────────────────────────────────
 * No parts and a hidden scope ⇒ `''`. Every part hidden ⇒ `''`. `whole` may be
 * `undefined` for the optional fields (`arcEn`, `signatureMoment`) and is read
 * as `''`.
 *
 * AN UNTAGGED FIELD IS HIDDEN — same as `pick`, no softening — AND THEN ITS
 * PARTS STILL GET THEIR SAY, which is not a hole in fail-closed. A part's
 * `scope` is REQUIRED, so parts are never the untagged case: `[]` on a part is
 * an author asserting that segment is structure, a different value from nobody
 * having looked. So a field whose tagging lives entirely in its parts still
 * redacts correctly, part by part, and at the default set every part is visible
 * — which is what makes rule 0 hold UNCONDITIONALLY here rather than only for
 * tagged fields. Blanking such a field instead would trade a leak we do not
 * have for a visible regression we would ship. No field in the corpus is in
 * this state today (measured: 80 of 80 carry a field-level scope); the branch
 * exists so the answer is decided rather than discovered.
 */
export function prose(
  parts: readonly ProsePart[] | undefined,
  whole: string | undefined,
  scope: readonly WorkId[] | undefined,
  watched: WatchedSet,
): string {
  if (isVisible(scope, watched)) return whole ?? '';
  if (!parts || parts.length === 0) return '';
  const kept = parts.filter((part) => isVisible(part.scope, watched));
  const joined = kept.map((part) => part.text).join('');
  /* Nothing dropped ⇒ nothing to tidy, and the join already equals `whole` by
     the invariant. Reachable only if a field's own scope is wider than the
     union of its parts' — no such field exists today (measured), but the branch
     is free and keeps byte identity true by construction rather than by census. */
  return kept.length === parts.length ? joined : tidy(joined);
}

/**
 * The seam left by a removed segment, closed — whitespace only.
 *
 * `trim()` is the one that does work today: drop a paragraph's last scoped part
 * and its predecessor's trailing space is left dangling. The space collapse is
 * defensive and is currently a no-op on every one of the 80 fields — no whole
 * contains a double space and no part starts with one, so a drop cannot
 * manufacture one. It is here because that is a property of today's authoring,
 * not of the format, and the day somebody writes a part that opens with a space
 * the redacted paragraph should not get a visible dent.
 *
 * IT TOUCHES NOTHING BUT SPACES. Not punctuation, not capitalisation, not a
 * dangling comma — see the note above on why smoothing is Phase 3's business
 * and not a join's. `trim()` would also eat newlines and tabs; no split string
 * in the corpus contains either.
 */
function tidy(text: string): string {
  return text.replace(/ {2,}/g, ' ').trim();
}
