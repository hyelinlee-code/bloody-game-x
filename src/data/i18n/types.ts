import type { ProsePart, WorkId } from '../works';

/**
 * English content lives in its own modules, keyed by the same ids as the Korean
 * source. Nothing here overwrites the Korean — the app carries both and the
 * reader picks. Keeping the translations in separate files means the Korean
 * data files stay the single source of truth for facts, and a translation can
 * never silently change one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `scope` ON THIS SIDE TOO, AND IT IS NOT A COPY OF THE OTHER SIDE'S
 *
 * Every scope field below mirrors the one on the same interface in
 * `../types.ts`, and the semantics are identical — see the header there, and
 * `isVisible` / `ProsePart` in `../works.ts`. What is NOT identical is the
 * value.
 *
 * THE TWO LANGUAGES MAY CARRY DIFFERENT SCOPES, AND THAT IS CORRECT. These
 * blocks are authored, not translated, and the English side has repeatedly said
 * more than the Korean and occasionally less. 박지민's season 3 beats need
 * `[structure, bg3, structure]` in Korean and `[structure, bg1+bg3, structure]`
 * in English, because the English bullet reaches back to season 1 and the
 * Korean one does not.
 *
 * SO NOTHING MAY TURN THIS INTO A PARITY CHECK. The validator's job is to
 * assert that each side carries a scope wherever that side needs one, never
 * that the two sides agree. A parity check would look like rigour and would
 * force one of the two prose layers to lie about what it says — and the
 * direction it would force is toward the coarser tag, which is the leak.
 *
 * `redaction.text.leaks` in tools/assert-visual.mjs walks BOTH string tables
 * independently for the same reason.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Lang = 'ko' | 'en';

export interface PersonEn {
  /** Romanised/English occupation line. */
  occupation?: string;
  bio: string;
  notableFor?: string[];
  /**
   * The identity line — 'Known as …' and 'Real name …' — was the last field in
   * the dossier rendering raw Hangul to an English reader. 홍진호's card read
   * "Known as 콩 · 폭풍저그" while his English bio twenty words below romanised
   * one of them as Storm Zerg; 서출구 meanwhile showed XITSUH / Mr.Note, so the
   * same field rendered Latin for some people and unreadable glyphs for others.
   * 폭풍저그 and 콩 are the two names an English-speaking esports fan actually
   * knows him by, and they were the one form that reader could not read.
   *
   * Keep the Hangul in parentheses, the way the rest of the English copy does —
   * the point is to add a reading, not to hide the original.
   */
  aka?: string[];
  realName?: string;
  /** Default for `bio` and `notableFor` on THIS side. See the header. */
  scope?: WorkId[];
  scopes?: {
    bio?: WorkId[];
    /** Aligned with `notableFor`, one scope per bullet. Not one for the array. */
    notableFor?: WorkId[][];
  };
  /** `bio` split at its scope changes; joins back to `bio` byte for byte. */
  bioParts?: ProsePart[];
}

export interface SeasonRunEn {
  season: number;
  placement: string;
  arc: string;
  beats?: string[];
  /**
   * Default for this run's outcome-bearing fields — the one franchise season it
   * belongs to. `[]` for the two runs whose `placement` is a role label rather
   * than a finish.
   */
  scope?: WorkId[];
  scopes?: {
    placement?: WorkId[];
    arc?: WorkId[];
    /** Aligned with `beats`, one scope per bullet. */
    beats?: WorkId[][];
  };
  /** `arc` split at its scope changes; joins back to `arc` byte for byte. */
  arcParts?: ProsePart[];
}

export interface EdgeEn {
  label?: string;
  description: string;
  /**
   * Default for the headline and the account on this side. The tie's TYPE and
   * its direction are language-independent and are scoped once, on `Edge` in
   * ../types.ts — an arrowhead is not translated.
   */
  scope?: WorkId[];
  scopes?: {
    label?: WorkId[];
    description?: WorkId[];
  };
  /** `description` split at its scope changes; joins back byte for byte. */
  descriptionParts?: ProsePart[];
}

export interface SeasonMetaEn {
  season: number;
  hook: string;
  format: string;
  prize?: string;
  episodes?: string;
  signatureMoment?: string;
  /**
   * Default for `prize` and `signatureMoment` — this season's own id. `hook`,
   * `format` and `episodes` are the shape of the season rather than its ending
   * and are never scoped, which obliges them to describe a twist without
   * narrating who it happened to.
   */
  scope?: WorkId[];
  scopes?: {
    prize?: WorkId[];
    signatureMoment?: WorkId[];
  };
}

export interface GlossaryEn {
  termKo: string;
  meaning: string;
  /**
   * `[]` for most of the glossary, which is format vocabulary. Not for 상금,
   * 개인 자금 and 승자독식, whose English definitions reconcile the prize against
   * named people and their finishes exactly as the Korean ones do.
   */
  scope?: WorkId[];
  /**
   * `meaning` split at its scope changes; joins back byte for byte. No `scopes`
   * object, because there is one field here to scope.
   *
   * Those three entries all have the same shape in both languages — a rule,
   * then a worked example naming people and finishes. Split at the full stop
   * and the definition survives redaction; scope the whole string and a reader
   * who has watched nothing cannot find out what 승자독식 means.
   */
  meaningParts?: ProsePart[];
}

export interface FranchiseEn {
  premise: string;
  lineage: string;
  reception?: string;
}
