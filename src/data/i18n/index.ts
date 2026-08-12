import type {
  Edge,
  ExternalShow,
  GlossaryTerm,
  Person,
  PriorElsewhere,
  SeasonMeta,
  SeasonRun,
  XBilling,
} from '../types';
import type { Lang } from './types';
import { peopleEn } from './people.en';
import { recordsEn } from './records.en';
import { edgesEn } from './edges.en';
import { franchiseEn, glossaryEn, seasonsEn } from './seasons.en';
import { pick, prose } from '../redact';
import type { WatchedSet, WorkId } from '../redact';
import { currentWatched } from '../../state/useWatched';

/**
 * One place that answers "what does this say in the current language?".
 *
 * Korean is the source of record. Where an English string exists it is used;
 * where it does not, the Korean is returned rather than a blank — a reader
 * would rather see the original than nothing. `isTranslated` lets a surface
 * say so honestly when it wants to.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AND "MAY THIS READER SEE IT?" — the second question, asked here for the same
 * reason as the first: this is where the content reads already funnel.
 *
 * Every outcome-bearing string below leaves through `pick` or `prose` in
 * `../redact.ts`, which is the one gate, so Phase 3 changes what "hidden" looks
 * like in that file rather than in fourteen components. What is at stake is
 * declared once in `OUTCOME_FIELDS` / `_EN` in `../works.ts`; the accessors
 * that read nothing on those manifests are listed at the bottom of this block
 * and take no `watched` argument at all.
 *
 * PHASE 2 IS INVISIBLE. The default is `currentWatched()`, which with no stored
 * preference is the whole registry, so every scope is satisfied, `prose`
 * returns `whole` itself and `pick` returns its argument. Measured over the
 * corpus rather than asserted: 449 accessor outputs across both languages, byte
 * for byte identical to HEAD, and 728 more from the five accessors added below,
 * likewise 0 mismatched.
 *
 * INVISIBLE IS ONLY HALF THE TEST, and it is the half that a disconnected gate
 * also passes. The other half, run against the same corpus: at `WATCHED_NONE`
 * these five produce 440 authored outputs, of which 242 go away entirely, 14 come
 * back rebuilt from their `*Parts`, and 184 are unchanged — and those 184 are
 * exactly the 184 fields whose resolved scope is `[]`, an author asserting the
 * string is a role rather than a result ('고정 출연', '진행', '창단 멤버'). Not
 * one field survives because it missed the gate.
 *
 * ── the six kinds that had NO accessor, and the nine surfaces that read them ─
 * Routing a call site is only possible if there is something to route it to.
 * `ExternalShow`, `PriorElsewhere`, `XBilling`, `SeasonMeta`'s winner and the
 * six `SeasonRun` fields `runText` does not return all carried outcome-bearing
 * entries on the `OUTCOME_FIELDS` manifest and had no function in this file at
 * all, so Dossier, Gallery and AboutSheet read the record directly and printed
 * finishes at every watched-set. `externalShowText`, `priorElsewhereText`,
 * `xBillingText`, `seasonWinner` and `runFacts` below are those call sites'
 * missing counterparts. THE CALL SITES ARE NOT THIS FILE'S TO CHANGE — the
 * components belong to other owners this phase, and an accessor nobody calls is
 * the same defect in a different file.
 *
 * ── the two rules that make routing safe here ───────────────────────────────
 *
 * 1. PICK THE LANGUAGE FIRST, THEN REDACT THE STRING YOU PICKED. The fallback
 *    chains below (`en?.x ?? ko.x`, `en?.label || e.labelEn || e.label`) run on
 *    the RAW strings exactly as they did before, and only the survivor is
 *    gated. Redacting first and falling back on the empty result would walk
 *    down the chain to the Korean sentence whenever the English one was sealed
 *    — a leak dressed as a translation fallback. It also fixes which tag
 *    applies: the scope that governs is the one belonging to the string
 *    actually being shown, so an English block answers to `peopleEn`'s scope
 *    and the Korean it falls back to answers to `people`'s. The two sides are
 *    authored separately and are allowed to differ (see ./types.ts).
 *
 * 2. PER-FIELD OVERRIDE, ELSE RECORD DEFAULT — `rec.scopes?.f ?? rec.scope`,
 *    written out at every site rather than hidden in a helper, because getting
 *    the order backwards is the difference between over- and under-redacting
 *    and it should be readable at the call. `??` and not `||`: `[]` is an
 *    author asserting nothing is at stake and must win over the record default,
 *    which is exactly what 이상민's '스튜디오 패널' placement and the three
 *    `parallel` edges depend on.
 *
 * A `prose(undefined, …)` call is a field with no authored split, so redaction
 * there is all-or-nothing. That is visible at the call site on purpose — see
 * the note on the glossary below.
 *
 * ── what is NOT routed, and why ─────────────────────────────────────────────
 * `personName`, `personOccupation`, `seasonTitle`, `franchiseText` and
 * `translationCoverage` keep their two-argument signatures. None of them reads
 * a field on either manifest: a name, a job, a season's title, the franchise's
 * premise and a count of translated records are structure, and the plan keeps
 * structure (PLAN-spoilers.md §2). Giving them a `watched` parameter they
 * ignore would be worse than not having one — a caller who narrowed the set
 * would read the signature as a promise the body does not keep — and under
 * `noUnusedParameters` it does not compile anyway.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type { Lang };
/* The string table owns its own lookup — it carries a compile-time guard that
   the two languages hold identical key sets, which is the failure mode worth
   preventing. Everything below is the content side: prose, not chrome. */
export { ui, t } from './ui';
export type { UiKey } from './ui';
export {
  CATEGORY_LABEL_I18N,
  EDGE_LABEL_I18N,
  EDGE_GLOSS_I18N,
  TEAM_LABEL_I18N,
  LINEAGE_LABEL_I18N,
  LINEAGE_CHIP_I18N,
} from './ui';

/**
 * The per-entry recipe from `pick`'s docblock, written once instead of four
 * times — `beats` and `notableFor`, on both language sides.
 *
 * These two arrays are scoped ENTRY BY ENTRY, aligned by index, and the
 * validator's §10b asserts the alignment. One scope over the array would seal
 * safe bullets to protect one unsafe one: 이상민's four `notableFor` bullets are
 * a Genius title, a count of Genius seasons, a season 1 panel seat and being
 * the leader of Roo'Ra, and there is no single tag that neither seals his band
 * nor reveals his championship.
 *
 * This is not a second gate. Every entry still goes through `pick`; the only
 * thing added is the loop and the fast path below.
 *
 * ── IDENTITY IS AN OBSERVABLE OUTPUT, so nothing dropped returns the ORIGINAL
 * array rather than a copy of it. `Dossier.tsx` decides whether to stamp
 * `lang="ko"` on the credits list by asking `personNotableFor(p, 'en') ===
 * p.notableFor` — reference equality against the raw data — so rebuilding an
 * identical array here would silently switch that attribute off for every
 * person whose English record has no `notableFor`, and a value-level diff would
 * not see it. (Measured: all twenty English records carry one today, so the
 * comparison is false for everybody and the branch is latent. It is the kind of
 * latent that comes back.) It mirrors `prose`, which returns `whole` itself on
 * its own fast path, for the same reason.
 */
function visibleEntries(
  items: string[] | undefined,
  per: WorkId[][] | undefined,
  fallback: WorkId[] | undefined,
  watched: WatchedSet,
): string[] {
  if (items === undefined) return [];
  const shown: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const kept = pick(items[i], per?.[i] ?? fallback, watched);
    if (kept !== undefined) shown.push(kept);
  }
  return shown.length === items.length ? items : shown;
}

/**
 * Does the ENGLISH half of a bilingual-inline pair exist to be shown?
 *
 * Six of the records below keep both languages on ONE record — `result` /
 * `resultEn`, `arc` / `arcEn`, `team` / `teamEn`, `billing` / `billingEn` —
 * rather than in a separate `*.en.ts` module the way `Person` and `SeasonRun`
 * do. There is no second record to look up, so the language choice is this
 * question, and it is asked on the RAW string (header rule 1): a sealed English
 * sentence is still an English sentence, and letting a redacted `''` fall
 * through to the Korean would print the Korean sentence to a reader whose
 * English one was withheld. That is the leak-dressed-as-a-fallback the header
 * warns about, and it is the reason this returns a boolean instead of a string.
 *
 * The test is `pickRun`'s in Dossier.tsx — non-empty after a trim — so routing a
 * call site through these accessors cannot move a byte on that account. Measured
 * over the corpus rather than assumed: zero of the English siblings on all six
 * records are empty or whitespace-only, so the trim is never what decides.
 *
 * The caller gets the boolean back as `translated`, for the same reason
 * `edgeText` hands one out: `Dossier.tsx` stamps `lang="ko"` on a paragraph that
 * fell back, and it currently recovers that fact by comparing the rendered
 * string with the raw one (`arc === e.arc`). Once the string is gated that
 * comparison is wrong — a sealed English arc and a Korean fallback both stop
 * equalling `e.arc` — so the fact has to be returned rather than re-derived.
 */
function hasEn(lang: Lang, en: string | undefined): boolean {
  return lang === 'en' && en !== undefined && en.trim() !== '';
}

/**
 * A rank and the field it was taken from, gated TOGETHER.
 *
 * A rank is only a result against its denominator — 3위 of 13 and 3위 of 18 are
 * the same ordinal and not the same run — and the portrait plate draws the pair
 * as `rank / fieldSize`, which is exactly invertible. `SeasonRunScopes.fieldSize`
 * says in so many words that the denominator TAKES THE SAME SCOPE AS `rank`,
 * ALWAYS, and PLAN-spoilers.md §3 is the long version.
 *
 * That is an obligation on the authoring, and this is the interlock that makes
 * it hold at runtime as well: `fieldSize` passes its OWN gate and then `rank`'s,
 * so a denominator can never outlive the number it qualifies. It composes `pick`
 * twice rather than testing a scope itself — there is still exactly one gate.
 *
 * IT CAN ONLY EVER NARROW, never widen, so Rule 0 is safe by construction: at
 * the default set both gates pass and `fieldSize` comes back untouched. It also
 * cannot move a byte through the absent case, because a `fieldSize` with no
 * `rank` beside it does not exist in the corpus (measured: zero, across both
 * `SeasonRun` and `ExternalShow`) and every call site today already tests the
 * rank before it prints the denominator.
 */
function rankPair(
  rank: number | undefined,
  fieldSize: number | undefined,
  rankScope: WorkId[] | undefined,
  fieldScope: WorkId[] | undefined,
  watched: WatchedSet,
): { rank: number | undefined; fieldSize: number | undefined } {
  return {
    rank: pick(rank, rankScope, watched),
    fieldSize: pick(pick(fieldSize, fieldScope, watched), rankScope, watched),
  };
}

/* ── people ──────────────────────────────────────────────────────────────── */

export function personBio(p: Person, lang: Lang, watched: WatchedSet = currentWatched()): string {
  const en = lang === 'en' ? peopleEn[p.id] : undefined;
  if (en?.bio !== undefined) return prose(en.bioParts, en.bio, en.scopes?.bio ?? en.scope, watched);
  return prose(p.bioParts, p.bio, p.scopes?.bio ?? p.scope, watched);
}

/** What somebody does for a living is not how they finished. Never scoped. */
export function personOccupation(p: Person, lang: Lang): string {
  if (lang === 'en') return peopleEn[p.id]?.occupation ?? p.occupation;
  return p.occupationKo || p.occupation;
}

export function personNotableFor(p: Person, lang: Lang, watched: WatchedSet = currentWatched()): string[] {
  const en = lang === 'en' ? peopleEn[p.id] : undefined;
  if (en?.notableFor !== undefined) {
    return visibleEntries(en.notableFor, en.scopes?.notableFor, en.scope, watched);
  }
  return visibleEntries(p.notableFor, p.scopes?.notableFor, p.scope, watched);
}

/** The name shown first; the other one is the subtitle. Never scoped. */
export function personName(p: Person, lang: Lang): { primary: string; secondary: string } {
  return lang === 'en'
    ? { primary: p.nameEn, secondary: p.nameKo }
    : { primary: p.nameKo, secondary: p.nameEn };
}

/* ── season records ──────────────────────────────────────────────────────── */

/**
 * The English runs are authored in the same order as the Korean ones, so they
 * zip by index; the season number is checked anyway so a mismatch degrades to
 * Korean instead of showing the wrong season's story.
 *
 * All three fields are outcome-bearing — a placement is the finish, an arc is
 * how it was reached, a beat is the moment people remember — so all three are
 * gated, each against the scope of the side it came from. `role` deliberately
 * is not on the manifest and is not read here: the painters have to keep
 * knowing whether a run was a run at the prize, or a redacted contestant gets
 * drawn with the mark that means "present, not competing" (PLAN-spoilers.md §3).
 *
 * `placement` has no authored split, so it is all-or-nothing; the two callers
 * that `.split()` it and the one that `||`s it are all safe on `''`.
 */
export function runText(
  personId: string,
  run: SeasonRun,
  index: number,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { placement: string; arc: string; beats: string[] } {
  if (lang === 'en') {
    const en = recordsEn[personId]?.[index];
    if (en && en.season === run.season) {
      return {
        placement: prose(undefined, en.placement, en.scopes?.placement ?? en.scope, watched),
        arc: prose(en.arcParts, en.arc, en.scopes?.arc ?? en.scope, watched),
        beats: visibleEntries(en.beats, en.scopes?.beats, en.scope, watched),
      };
    }
  }
  return {
    placement: prose(undefined, run.placement, run.scopes?.placement ?? run.scope, watched),
    arc: prose(run.arcParts, run.arc, run.scopes?.arc ?? run.scope, watched),
    beats: visibleEntries(run.beats, run.scopes?.beats, run.scope, watched),
  };
}

/**
 * THE REST OF A RUN — the four outcome fields `runText` does not return.
 *
 * `OUTCOME_FIELDS.SeasonRun` lists nine, and `runText` above covers three
 * (`placement`, `arc`, `beats`). These are the other six, in two pairs of
 * bilingual halves plus the rank pair, and until now they had no accessor at
 * all — so `Dossier.tsx` read `run.rank` straight onto a medal, `run.team`
 * through `pickRun`, and `Gallery.tsx` and `AboutSheet.tsx` rebuilt short
 * placements out of `rank` and `fieldSize` by hand. Nine surfaces printing
 * finishes to a reader who has watched nothing, because the accessor they would
 * have called did not exist.
 *
 * SEPARATE FROM `runText` RATHER THAN FOLDED INTO IT, because these six are not
 * in `SeasonRunEn` at all: the English record carries `placement`, `arc` and
 * `beats` and nothing else, so there is no per-index zip to do here and no
 * season number to re-check. `teamEn` and `eliminatedEpisodeEn` live inline on
 * the Korean record, which is why this takes a `lang` and no `personId`.
 * Folding them in would have made `runText` take two arguments it did not use
 * for half its return value.
 *
 * `role` IS NOT HERE, and is the one outcome-shaped field deliberately left
 * raw — see `OUTCOME_FIELDS.SeasonRun` and the note above `runText`. The
 * painters have to keep knowing whether a run was a run at the prize.
 *
 * A TEAM NAME IS STRUCTURE AND AN ARROW BETWEEN TWO OF THEM IS A PLOT: '저택팀'
 * is a side, '저택팀 → 야생팀' is a defection and '히든 플레이어 (저택 잠입)' is
 * the season 2 twist stated on one of the people it was a twist about. The
 * record's own per-field `scopes.team` is what tells those apart; this only
 * spends it.
 *
 * Strings come back `''` when withheld, the way every other accessor here
 * returns them, so a call site's existing `{run.team && …}` truth test keeps
 * working and the row simply does not render.
 */
export function runFacts(
  run: SeasonRun,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): {
  rank: number | undefined;
  fieldSize: number | undefined;
  team: string;
  eliminatedEpisode: string;
} {
  const teamEn = hasEn(lang, run.teamEn);
  const exitEn = hasEn(lang, run.eliminatedEpisodeEn);
  return {
    ...rankPair(
      run.rank,
      run.fieldSize,
      run.scopes?.rank ?? run.scope,
      run.scopes?.fieldSize ?? run.scope,
      watched,
    ),
    team: teamEn
      ? prose(undefined, run.teamEn, run.scopes?.teamEn ?? run.scope, watched)
      : prose(undefined, run.team, run.scopes?.team ?? run.scope, watched),
    eliminatedEpisode: exitEn
      ? prose(undefined, run.eliminatedEpisodeEn, run.scopes?.eliminatedEpisodeEn ?? run.scope, watched)
      : prose(undefined, run.eliminatedEpisode, run.scopes?.eliminatedEpisode ?? run.scope, watched),
  };
}

/* ── the record outside the franchise ────────────────────────────────────── */

/**
 * One row of the dossier's "other shows" table.
 *
 * `show`, `showKo` and `year` are NOT gated and must not be. On this record the
 * title is participation — the plain fact that somebody was on a programme —
 * and `show` is additionally `headToHead.ts`'s join key across the two i18n
 * halves of a row, so sealing it would break a lookup rather than protect a
 * claim. `OUTCOME_FIELDS.ExternalShow` lists the four that ARE at stake and this
 * returns exactly those. The caller keeps reading the title off the record.
 *
 * Two thirds of this table scopes to `[]` — 고정 출연, 진행, 게스트, 멘토, 참가
 * are roles and not results — so at any watched-set most of these rows still
 * print. The ones that do not are the four 더 지니어스 rows, which are the only
 * rows in the dataset carrying a `rank` outside the franchise, and they are also
 * exactly what the reader who wrote in has watched.
 */
export function externalShowText(
  s: ExternalShow,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { result: string; translated: boolean; rank: number | undefined; fieldSize: number | undefined } {
  const translated = hasEn(lang, s.resultEn);
  return {
    result: translated
      ? prose(undefined, s.resultEn, s.scopes?.resultEn ?? s.scope, watched)
      : prose(undefined, s.result, s.scopes?.result ?? s.scope, watched),
    translated,
    ...rankPair(s.rank, s.fieldSize, s.scopes?.rank ?? s.scope, s.scopes?.fieldSize ?? s.scope, watched),
  };
}

/**
 * A full account of a run through a programme outside the franchise.
 *
 * THIS IS WHERE A QUARTER OF PHASE 1's SPLITS FINALLY GET SPENT. Ten `arcParts`
 * and ten `arcEnParts` are authored on these blocks — 20 of the 80 in the corpus
 * — and until this function existed not one of them had a reader anywhere in the
 * app. They are also the splits that pay the most. 이상민's block is a single
 * paragraph covering 더 지니어스 seasons 1, 2 and 4, so its own scope is all
 * three ANDed and the whole account is invisible to a reader who has seen only
 * the season it is titled after; its four parts hand that reader back the
 * sentence about the season they did watch. That is the entire argument for
 * splitting rather than widening, made concrete.
 *
 * THE HEADLINE IS GATED HERE AND IS NOT ON `ExternalShow`, which looks like an
 * inconsistency and is the opposite. This `show` / `showKo` is not a programme
 * title, it is an editorial headline — 'The route, not the job', '진 경연 셋,
 * 이긴 서바이벌 하나' — and that last one states three eliminations and a win in
 * the title bar of the block. `OUTCOME_FIELDS.PriorElsewhere` lists both halves
 * for that reason, and nothing joins on either, so sealing them breaks nothing.
 *
 * ⚠ THE DEDUPE MUST KEEP READING THE RAW RECORD. `Dossier.tsx` folds an
 * `otherShows` row away when a full account already covers the same programme,
 * and it matches on `showKey(e.show)` / `showKey(e.showKo)` — a JOIN, not a
 * display. Point that at this `primary`/`secondary` and a reader whose headline
 * is sealed stops matching, the fold stops happening, and the table grows a
 * duplicate row at exactly the moment the page is supposed to be saying less.
 * Structure joins on structure; only the printed string comes through here.
 */
export function priorElsewhereText(
  e: PriorElsewhere,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): {
  primary: string;
  secondary: string;
  result: string;
  arc: string;
  resultTranslated: boolean;
  arcTranslated: boolean;
} {
  /* Both halves of the headline are resolved every time and then assigned by
     language, because each answers to its own scope and the two are allowed to
     differ — 이상민's block scopes `show` and `showKo` to `[]` while the block
     itself is three Genius seasons wide. */
  const showEn = prose(undefined, e.show, e.scopes?.show ?? e.scope, watched);
  const showKo = prose(undefined, e.showKo, e.scopes?.showKo ?? e.scope, watched);
  const resultTranslated = hasEn(lang, e.resultEn);
  const arcTranslated = hasEn(lang, e.arcEn);
  return {
    primary: lang === 'en' ? showEn : showKo,
    secondary: lang === 'en' ? showKo : showEn,
    result: resultTranslated
      ? prose(undefined, e.resultEn, e.scopes?.resultEn ?? e.scope, watched)
      : prose(undefined, e.result, e.scopes?.result ?? e.scope, watched),
    arc: arcTranslated
      ? prose(e.arcEnParts, e.arcEn, e.scopes?.arcEn ?? e.scope, watched)
      : prose(e.arcParts, e.arc, e.scopes?.arc ?? e.scope, watched),
    resultTranslated,
    arcTranslated,
  };
}

/**
 * The billing line under a bloc of the announced X lineup.
 *
 * The bloc itself and its two labels are the pre-premiere casting announcement
 * and are never scoped — `XBilling.team` is a bloc name and has nothing to do
 * with `SeasonRun.team`, which is a side of a house and is gated in `runFacts`.
 * What is at stake is the one line under it, because the thing that makes a
 * casting interesting is almost always a result: '첫 번째 우승자', '앞의 한 명은
 * 우승했다', '데스매치를 58대 12로 이기고도'. Note the second of those is a
 * result about SOMEBODY ELSE, which is why the scope is on the line rather than
 * inferred from whose card it sits on.
 *
 * No `*Parts` is authored on this record on either side, so redaction here is
 * all-or-nothing and the call is `prose(undefined, …)` — visible at the site on
 * purpose, per the header. These are single sentences with nowhere to split.
 */
export function xBillingText(
  x: XBilling,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { billing: string; translated: boolean } {
  const translated = hasEn(lang, x.billingEn);
  return {
    billing: translated
      ? prose(undefined, x.billingEn, x.scopes?.billingEn ?? x.scope, watched)
      : prose(undefined, x.billing, x.scopes?.billing ?? x.scope, watched),
    translated,
  };
}

/* ── edges ───────────────────────────────────────────────────────────────── */

/**
 * The headline and the account for one tie.
 *
 * THE TIE ITSELF IS NOT REDACTED HERE and must not be: a line between two
 * people is structure and the plan keeps it. What this gates is the two strings
 * that describe it. The `type` and the arrowhead are the other half of the
 * claim — `betrayal` is a verdict, `directed` is a verdict with a direction —
 * and they are scoped on the record but are not read through this accessor;
 * they reach the canvas through `graph/build.ts` and the legend, which is
 * another owner's file this phase.
 *
 * `translated` stays a fact about the translation and not about the reader: it
 * answers "does an English account exist", which is why `Dossier.tsx` can use
 * it to stamp `lang="ko"` on a paragraph. A sealed English account is still an
 * English account.
 */
export function edgeText(
  e: Edge,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { label: string; description: string; translated: boolean } {
  if (lang === 'en') {
    const en = edgesEn[e.id];
    /* The `en?.label || e.labelEn || e.label` chain, resolved on the raw
       strings first — see rule 1 in the header. */
    const label = en?.label
      ? prose(undefined, en.label, en.scopes?.label ?? en.scope, watched)
      : e.labelEn
        ? prose(undefined, e.labelEn, e.scopes?.labelEn ?? e.scope, watched)
        : prose(undefined, e.label, e.scopes?.label ?? e.scope, watched);
    const description = en?.description
      ? prose(en.descriptionParts, en.description, en.scopes?.description ?? en.scope, watched)
      : prose(e.descriptionParts, e.description, e.scopes?.description ?? e.scope, watched);
    return { label, description, translated: Boolean(en?.description) };
  }
  return {
    label: prose(undefined, e.label, e.scopes?.label ?? e.scope, watched),
    description: prose(e.descriptionParts, e.description, e.scopes?.description ?? e.scope, watched),
    translated: true,
  };
}

/* ── seasons and glossary ────────────────────────────────────────────────── */

/** A season's name is the season, not its ending. Never scoped. */
export function seasonTitle(s: SeasonMeta, lang: Lang): { primary: string; secondary: string } {
  return lang === 'en'
    ? { primary: s.titleEn, secondary: s.titleKo }
    : { primary: s.titleKo, secondary: s.titleEn };
}

/**
 * A glossary entry: the term, its counterpart, and what it means.
 *
 * The two terms are vocabulary and are never scoped. The definition is, for
 * three of the fifteen — 상금 (`bg1` + `bg2`), 개인 자금 (`bg2`) and, in the
 * comment that describes them if not in the data, 승자독식 — because those
 * definitions reconcile the prize against named people and their finishes.
 *
 * NO `meaningParts` IS AUTHORED ANYWHERE, on either side — measured, not
 * assumed: zero of thirty entries carry one, against 80 splits elsewhere in the
 * corpus. `GlossaryTerm.meaningParts` and `GlossaryEn.meaningParts` exist in
 * the types and their docblocks describe exactly the split that is missing ("a
 * rule, then a worked example… split at the full stop and the definition
 * survives redaction"). So today a reader who has not watched season 1 loses
 * the whole of what 상금 means rather than the example at the end of it. This
 * accessor is already wired for the split — the moment the parts are authored
 * it starts using them, with no change here — and it is Phase 1 authoring that
 * is missing, not plumbing. Named in the handoff rather than fixed: the data
 * files are closed this phase.
 */
export function glossaryTerm(
  g: GlossaryTerm,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { term: string; other: string; meaning: string } {
  if (lang === 'en') {
    const en = glossaryEn[g.termKo];
    /* No `scopes` on either side: one field here is worth scoping. */
    const meaning =
      en?.meaning !== undefined
        ? prose(en.meaningParts, en.meaning, en.scope, watched)
        : prose(g.meaningParts, g.meaning, g.scope, watched);
    return { term: g.termEn, other: g.termKo, meaning };
  }
  return {
    term: g.termKo,
    other: g.termEn,
    meaning: prose(g.meaningParts, g.meaning, g.scope, watched),
  };
}

/**
 * Season card prose: hook, rules, prize, episodes, the signature moment.
 *
 * TWO OF THE FIVE ARE GATED AND THREE ARE NOT, which is the shape works.ts
 * declares: `hook`, `format` and `episodes` are what the season WAS and are
 * kept, because a season somebody has not watched is still a season they can be
 * told the shape of. That is an obligation on those three strings rather than a
 * gap here — a format paragraph may describe the twist and may not narrate who
 * it happened to.
 *
 * `prize` is gated because season 1's line is what the winner actually took
 * home. Seasons 2 and 3 read as format to types.ts — '최대 3억 원' is the
 * maximum before a card is dealt and '우승 상금 액수 비공개' says the figure was
 * never published — and the docblock on `SeasonMetaScopes.prize` says both
 * should be `[]`; the data tags them `['bg2']` and `['bg3']`. That is
 * over-redaction, the safe direction, and it is a data question rather than an
 * accessor one. Named in the handoff.
 */
export function seasonText(
  s: SeasonMeta,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { hook: string; format: string; prize: string; episodes: string; signatureMoment: string } {
  const en = lang === 'en' ? seasonsEn[s.season] : undefined;
  return {
    hook: en?.hook ?? s.hook,
    format: en?.format ?? s.format,
    prize:
      en?.prize !== undefined
        ? prose(undefined, en.prize, en.scopes?.prize ?? en.scope, watched)
        : prose(undefined, s.prize, s.scopes?.prize ?? s.scope, watched),
    episodes: en?.episodes ?? s.episodes,
    /* Optional on both sides, and `prose` reads an absent whole as `''` — which
       is the same `''` a sealed one returns. Telling those two apart is what
       Phase 3 needs `missingFrom` for; nothing needs it yet. */
    signatureMoment:
      en?.signatureMoment !== undefined
        ? prose(undefined, en.signatureMoment, en.scopes?.signatureMoment ?? en.scope, watched)
        : prose(undefined, s.signatureMoment, s.scopes?.signatureMoment ?? s.scope, watched),
  };
}

/**
 * Who won a season, and whether they are a node in this cast.
 *
 * THE SINGLE MOST SPOILING FIELD IN THE DATASET, and it had no accessor: the
 * about sheet reads `s.winnerNameKo` / `s.winnerNameEn` straight onto a
 * brass-toned fact row, which means the one panel a reader opens to find out
 * what this franchise IS has been answering who wins it. `seasonText` beside
 * this gates the prize and the signature moment and stops there, because
 * `SeasonMetaEn` carries neither name — the winner is authored once, inline, in
 * both languages, so there is no English record to consult and the fallback is
 * within the record.
 *
 * `id` IS GATED TOO, and it carries no prose at all. It is `winnerId`, a person
 * slug, and `OUTCOME_FIELDS.SeasonMeta` lists it first for a reason: the about
 * sheet spends it on a "in this cast" pip beside the row. A pip is not a name,
 * but it is the answer to "is the winner one of these twenty", and lighting it
 * next to a sealed name narrows twenty people to one bloc. `pick`, not `prose`,
 * because a slug is a value rather than a sentence — `undefined` when withheld,
 * which is the same shape the absent case already has, so `s.winnerId &&
 * castIds.has(s.winnerId)` keeps reading the way it reads today.
 *
 * Season 3's winner is outside this cast, which is what `winnerNameKo` exists
 * for independently of `winnerId` — the atlas can name somebody it does not draw.
 * Both are sealed by the same `['bg3']`, so that asymmetry costs nothing here.
 */
export function seasonWinner(
  s: SeasonMeta,
  lang: Lang,
  watched: WatchedSet = currentWatched(),
): { id: string | undefined; primary: string; secondary: string; translated: boolean } {
  const ko = prose(undefined, s.winnerNameKo, s.scopes?.winnerNameKo ?? s.scope, watched);
  const en = prose(undefined, s.winnerNameEn, s.scopes?.winnerNameEn ?? s.scope, watched);
  const translated = hasEn(lang, s.winnerNameEn);
  return {
    id: pick(s.winnerId, s.scopes?.winnerId ?? s.scope, watched),
    /* `winnerNameEn || winnerNameKo` on the English side, resolved on the raw
       strings and only then gated — header rule 1. A season whose English name
       was sealed falls to `''`, not across to the Korean one. */
    primary: lang === 'en' ? (translated ? en : ko) : ko,
    secondary: lang === 'en' ? ko : en,
    translated,
  };
}

/**
 * The franchise's own copy. Never scoped — premise, lineage and reception
 * describe a genre and name no result, which is why `FranchiseEn` is the one
 * i18n interface with no `scope` field at all and why works.ts declares no
 * manifest for it.
 */
export function franchiseText(
  fr: { premise: string; lineage: string; reception?: string },
  lang: Lang,
): { premise: string; lineage: string; reception: string } {
  if (lang === 'en') {
    return {
      premise: franchiseEn.premise || fr.premise,
      lineage: franchiseEn.lineage || fr.lineage,
      reception: franchiseEn.reception || fr.reception || '',
    };
  }
  return { premise: fr.premise, lineage: fr.lineage, reception: fr.reception ?? '' };
}

/**
 * How much of the long-form prose exists in English, for an honest notice.
 *
 * Counts records, not visible ones, and takes no watched-set: it answers "how
 * much of this atlas is translated", a property of the corpus that does not
 * move when a reader narrows their exposure. It is also, deliberately, the
 * PINNED half of PLAN-spoilers.md §5's rule — a figure that would otherwise
 * become a counter of what is being withheld is here pinned to the full dataset
 * instead. If a surface ever prints it beside a redacted view it has to say so
 * ("52 ties in the full atlas"), and that is a copy decision for whoever writes
 * that surface, not a reason to filter the count.
 */
export function translationCoverage(): { people: number; runs: number; edges: number } {
  return {
    people: Object.keys(peopleEn).length,
    runs: Object.values(recordsEn).reduce((n, arr) => n + arr.length, 0),
    edges: Object.keys(edgesEn).length,
  };
}
