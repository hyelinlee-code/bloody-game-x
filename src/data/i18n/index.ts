import type { Edge, GlossaryTerm, Person, SeasonMeta, SeasonRun } from '../types';
import type { Lang } from './types';
import { peopleEn } from './people.en';
import { recordsEn } from './records.en';
import { edgesEn } from './edges.en';
import { franchiseEn, glossaryEn, seasonsEn } from './seasons.en';

/**
 * One place that answers "what does this say in the current language?".
 *
 * Korean is the source of record. Where an English string exists it is used;
 * where it does not, the Korean is returned rather than a blank — a reader
 * would rather see the original than nothing. `isTranslated` lets a surface
 * say so honestly when it wants to.
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

/* ── people ──────────────────────────────────────────────────────────────── */

export function personBio(p: Person, lang: Lang): string {
  if (lang === 'en') return peopleEn[p.id]?.bio ?? p.bio;
  return p.bio;
}

export function personOccupation(p: Person, lang: Lang): string {
  if (lang === 'en') return peopleEn[p.id]?.occupation ?? p.occupation;
  return p.occupationKo || p.occupation;
}

export function personNotableFor(p: Person, lang: Lang): string[] {
  if (lang === 'en') return peopleEn[p.id]?.notableFor ?? p.notableFor ?? [];
  return p.notableFor ?? [];
}

/** The name shown first; the other one is the subtitle. */
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
 */
export function runText(
  personId: string,
  run: SeasonRun,
  index: number,
  lang: Lang,
): { placement: string; arc: string; beats: string[] } {
  if (lang === 'en') {
    const en = recordsEn[personId]?.[index];
    if (en && en.season === run.season) {
      return { placement: en.placement, arc: en.arc, beats: en.beats ?? [] };
    }
  }
  return { placement: run.placement, arc: run.arc, beats: run.beats ?? [] };
}

/* ── edges ───────────────────────────────────────────────────────────────── */

export function edgeText(e: Edge, lang: Lang): { label: string; description: string; translated: boolean } {
  if (lang === 'en') {
    const en = edgesEn[e.id];
    return {
      label: en?.label || e.labelEn || e.label,
      description: en?.description || e.description,
      translated: Boolean(en?.description),
    };
  }
  return { label: e.label, description: e.description, translated: true };
}

/* ── seasons and glossary ────────────────────────────────────────────────── */

export function seasonTitle(s: SeasonMeta, lang: Lang): { primary: string; secondary: string } {
  return lang === 'en'
    ? { primary: s.titleEn, secondary: s.titleKo }
    : { primary: s.titleKo, secondary: s.titleEn };
}

export function glossaryTerm(g: GlossaryTerm, lang: Lang): { term: string; other: string; meaning: string } {
  if (lang === 'en') {
    return { term: g.termEn, other: g.termKo, meaning: glossaryEn[g.termKo]?.meaning ?? g.meaning };
  }
  return { term: g.termKo, other: g.termEn, meaning: g.meaning };
}

/** Season card prose: hook, rules, prize, episodes, the signature moment. */
export function seasonText(
  s: SeasonMeta,
  lang: Lang,
): { hook: string; format: string; prize: string; episodes: string; signatureMoment: string } {
  const en = lang === 'en' ? seasonsEn[s.season] : undefined;
  return {
    hook: en?.hook ?? s.hook,
    format: en?.format ?? s.format,
    prize: en?.prize ?? s.prize,
    episodes: en?.episodes ?? s.episodes,
    signatureMoment: en?.signatureMoment ?? s.signatureMoment ?? '',
  };
}

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

/** How much of the long-form prose exists in English, for an honest notice. */
export function translationCoverage(): { people: number; runs: number; edges: number } {
  return {
    people: Object.keys(peopleEn).length,
    runs: Object.values(recordsEn).reduce((n, arr) => n + arr.length, 0),
    edges: Object.keys(edgesEn).length,
  };
}
