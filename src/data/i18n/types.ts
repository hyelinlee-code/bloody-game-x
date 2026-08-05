/**
 * English content lives in its own modules, keyed by the same ids as the Korean
 * source. Nothing here overwrites the Korean — the app carries both and the
 * reader picks. Keeping the translations in separate files means the Korean
 * data files stay the single source of truth for facts, and a translation can
 * never silently change one.
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
}

export interface SeasonRunEn {
  season: number;
  placement: string;
  arc: string;
  beats?: string[];
}

export interface EdgeEn {
  label?: string;
  description: string;
}

export interface SeasonMetaEn {
  season: number;
  hook: string;
  format: string;
  prize?: string;
  episodes?: string;
  signatureMoment?: string;
}

export interface GlossaryEn {
  termKo: string;
  meaning: string;
}

export interface FranchiseEn {
  premise: string;
  lineage: string;
  reception?: string;
}
