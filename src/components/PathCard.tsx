import type { CSSProperties, JSX } from 'react';
import { EDGE_COLOR, SEASON_INK } from '../graph/palette';
import type { PathResult } from '../state/findPath';
import { EDGE_LABEL_I18N, edgeText, personName, t, ui, type Lang } from '../data/i18n';
import { useLang } from '../state/useLang';
import './PathCard.css';

export interface PathCardProps {
  path: PathResult | null;
  /** Set when a trace was attempted but the two are not connected at all. */
  unreachable: { from: string; to: string } | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}

/**
 * "One person in between" / "한 다리 건너".
 *
 * The count and the phrase are joined the way each language joins them —
 * Korean glues the number to its counter, English does not.
 */
function degreeLine(d: number, lang: Lang): string {
  if (d === 1) return t(lang, 'path.degree1');
  if (d === 2) return t(lang, 'path.degree2');
  return `${d - 1}${lang === 'ko' ? '' : ' '}${t(lang, 'path.degreeNSuffix')}`;
}

/* The two hues on a step line are 10px. palette.ts says in as many words that
   SEASON_COLOR is "MARKS ONLY — deliberately dark" and that a hue carrying
   letterforms comes from SEASON_INK at full alpha; measured against this
   card's own background, SEASON_COLOR[1] set 3.84:1 and the raw EDGE_COLOR
   for co-season 2.97:1, on the one string that names what kind of tie the
   chain is made of. The season label now takes SEASON_INK (6.48–8.11), and
   the type label takes the dossier chip's treatment — the edge hue mixed 56%
   into --ink-hi, driven by --c so the rule lives in CSS and the colour stays
   a data value. */
function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

/* 와/과 is a bound particle: it attaches to the preceding noun with no space,
   and which of the two you get is decided by whether that noun's last syllable
   carries a final consonant. The headline used to print the machine fallback —
   '홍진호 과(와) 최연청 사이에는…' — which is the Korean equivalent of writing
   '1 item(s)', in the one string a reader sees when a trace fails, in the
   language this atlas declares as its source of record.

   The last syllable is a precomposed Hangul block iff it sits in AC00–D7A3;
   within that range (code - AC00) % 28 is the final-consonant index, 0 meaning
   none. A name that is not Hangul at all (never today: the Korean panel is
   given Korean names) falls back to 와, the vowel-final form.

   English joins with a free word and takes it from ui.ts as before — the two
   languages join names by genuinely different grammar, so they take genuinely
   different code paths rather than one string pretending to cover both. */
function josaWa(name: string): string {
  const c = name.charCodeAt(name.length - 1);
  const hangul = c >= 0xac00 && c <= 0xd7a3;
  return hangul && (c - 0xac00) % 28 !== 0 ? '과' : '와';
}

export function PathCard({ path, unreachable, onClose, onSelect }: PathCardProps): JSX.Element | null {
  const { lang } = useLang();
  const other: Lang = lang === 'ko' ? 'en' : 'ko';

  if (!path && !unreachable) return null;

  return (
    <aside className="pathcard pane scroll" role="region" aria-label={t(lang, 'path.regionLabel')}>
      <div className="pathcard__head">
        <span className="eyebrow">
          {t(lang, 'path.eyebrow')}
          <span aria-hidden="true"> · </span>
          <span lang={other}>{ui[other]['path.eyebrow']}</span>
        </span>
        <button type="button" className="pathcard__close" onClick={onClose} aria-label={t(lang, 'path.close')}>
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {unreachable ? (
        <div className="pathcard__none">
          {/* Both names arrive already set in the reader's language (App.tsx
              assembles them with personName), so neither needs a lang run. */}
          <p className="pathcard__none-ko">
            {lang === 'ko' ? (
              <>
                <b>{unreachable.from}</b>
                {josaWa(unreachable.from)} <b>{unreachable.to}</b> {t(lang, 'path.noneTail')}
              </>
            ) : (
              <>
                <b>{unreachable.from}</b> {t(lang, 'path.noneJoin')} <b>{unreachable.to}</b>{' '}
                {t(lang, 'path.noneTail')}
              </>
            )}
          </p>
          <p className="pathcard__none-en">{t(lang, 'path.noneNote')}</p>
        </div>
      ) : (
        path && (
          <>
            <p className="pathcard__degree">
              <span className="pathcard__degree-ko">{degreeLine(path.degrees, lang)}</span>
              <span className="pathcard__degree-en" lang={other}>
                {degreeLine(path.degrees, other)}
              </span>
            </p>

            <ol className="pathcard__chain">
              <li className="pathcard__person">
                <button type="button" onClick={() => onSelect(path.from.id)}>
                  <span className="pathcard__dot" style={{ background: path.from.color }} aria-hidden="true" />
                  <span className="pathcard__name">{personName(path.from.person, lang).primary}</span>
                </button>
              </li>

              {path.steps.map((step) => {
                const e = step.link.edge;
                const color = EDGE_COLOR[e.type] ?? EDGE_COLOR.collab;
                const text = edgeText(e, lang);
                return (
                  <li key={step.link.id} className="pathcard__step">
                    <span className="pathcard__rail" style={{ background: color }} aria-hidden="true" />
                    <div className="pathcard__edge">
                      <span className="pathcard__type" style={cssVars({ '--c': color })}>
                        {EDGE_LABEL_I18N[lang][e.type]}
                      </span>
                      <span
                        className="pathcard__season"
                        style={e.season ? { color: SEASON_INK[e.season] } : undefined}
                      >
                        {e.season ? `${t(lang, 'path.seasonPrefix')} ${e.season}` : t(lang, 'path.outside')}
                      </span>
                      <p className="pathcard__label">{text.label}</p>
                    </div>
                    <div className="pathcard__person pathcard__person--inline">
                      <button type="button" onClick={() => onSelect(step.to.id)}>
                        <span className="pathcard__dot" style={{ background: step.to.color }} aria-hidden="true" />
                        <span className="pathcard__name">{personName(step.to.person, lang).primary}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )
      )}

      <p className="pathcard__hint">{t(lang, 'path.hint')}</p>
    </aside>
  );
}
