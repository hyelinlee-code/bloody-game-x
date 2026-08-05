import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '../data/i18n/types';

/**
 * Which language the reader is in.
 *
 * The Korean content is the source of record and the English is authored
 * alongside it, so this is a genuine switch between two written versions — not
 * a fallback chain. Where an English string is genuinely missing the accessors
 * fall back to Korean rather than showing a blank, and the UI says so.
 */

const KEY = 'bgx.lang';

export interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Pick the right side of a Korean/English pair. */
  pick: <T>(ko: T, en: T | undefined) => T;
}

export const LangContext = createContext<LangState | null>(null);

/**
 * Boot language, in precedence order: the link, then the reader's own saved
 * choice, then their browser.
 *
 * The URL half of this is now two-way — useDeepLink serialises `lang` on every
 * write and applies it on every history navigation, so a link carries the
 * language it was read in. This function is the arrival half of that contract
 * and the two have to keep agreeing about the parameter name.
 */
function detect(): Lang {
  if (typeof window === 'undefined') return 'ko';
  const fromUrl = new URLSearchParams(location.hash.replace(/^#/, '')).get('lang');
  if (fromUrl === 'ko' || fromUrl === 'en') return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    /* private mode — fall through to the navigator */
  }
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function useLangState(): LangState {
  const [lang, setLangRaw] = useState<Lang>(detect);

  const setLang = useCallback((l: Lang) => {
    setLangRaw(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* not fatal */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return useMemo(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === 'ko' ? 'en' : 'ko'),
      pick: <T,>(ko: T, en: T | undefined): T => (lang === 'en' && en !== undefined ? en : ko),
    }),
    [lang, setLang],
  );
}

export function useLang(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // A component rendered outside the provider still has to render something
    // sensible rather than throwing in a user's face.
    return {
      lang: 'ko',
      setLang: () => {},
      toggle: () => {},
      pick: (ko) => ko,
    };
  }
  return ctx;
}

export type { Lang };
