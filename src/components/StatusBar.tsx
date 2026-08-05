import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { Dataset } from '../data/types';
import type { AtlasState } from '../state/useAtlas';
import { personName, t, ui } from '../data/i18n';
import { useLang } from '../state/useLang';
import './StatusBar.css';

export interface StatusBarProps {
  atlas: AtlasState;
  dataset: Dataset;
  onReset: () => void;
  /**
   * Whether the cold open is gone, so the ledger can wait for it.
   *
   * This bar was the one piece of chrome with no such gate, and it led the
   * entrance because of it. Computed opacity sampled every frame after ENTER on
   * the production build: `.statusbar` 1.000 from t = 8ms and never animating,
   * against `.topbar` / `.rail` at 0.000 until t = 725ms. So the reader met a
   * populated ledger — "인물 20/20 · 관계 47", the hint line, the spoiler-free
   * chip — under an empty top region and a graph at 25%, which is precisely the
   * skeleton screen FilterRail.css says it fixed. It fixed it for the rail and
   * the top bar. App owns the flag; it is passed in, like the other two.
   *
   * Optional, and read as `!== false`, for the same reason TopBar's is: an
   * unwired flag must leave the bar visible, not stranded at opacity 0.
   */
  introDone?: boolean;
}

interface Hint {
  /** Empty in the idle state. */
  name: string;
  body: string;
  tail: string;
}

interface HintLayer {
  id: number;
  hint: Hint;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function StatusBar({ atlas, dataset, onReset, introDone }: StatusBarProps): JSX.Element {
  const { graph, visible, edgeTypes, selectedId, filtersActive } = atlas;
  const ready = introDone !== false;
  const { lang } = useLang();

  const total = dataset.people?.length ?? 0;
  const shown = visible.size;

  /* A relation only counts if you can actually see it: both ends visible and
     its type not filtered out. */
  const relationCount = useMemo(() => {
    let n = 0;
    for (const l of graph.links) {
      if (!edgeTypes.has(l.type)) continue;
      if (!visible.has(l.source.id) || !visible.has(l.target.id)) continue;
      n += 1;
    }
    return n;
  }, [graph.links, edgeTypes, visible]);

  const selected = selectedId ? graph.byId.get(selectedId) ?? null : null;

  const hint = useMemo<Hint>(
    () =>
      selected
        ? {
            name: selected.person
              ? personName(selected.person, lang).primary
              : selected.label || selected.id,
            body: t(lang, 'status.hintSelected'),
            tail: t(lang, 'status.hintSelectedTail'),
          }
        : { name: '', body: t(lang, 'status.hintIdle'), tail: '' },
    [selected, lang],
  );

  /* Two stacked layers so the hint cross-fades instead of snapping. The
     outgoing layer is dropped once its animation is spent. */
  const [layers, setLayers] = useState<HintLayer[]>(() => [{ id: 0, hint }]);
  const nextId = useRef(1);

  useEffect(() => {
    const id = nextId.current++;
    setLayers((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.hint.name === hint.name && top.hint.body === hint.body && top.hint.tail === hint.tail) {
        return prev;
      }
      return [...prev.slice(-1), { id, hint }];
    });
  }, [hint]);

  useEffect(() => {
    if (layers.length < 2) return;
    const t = window.setTimeout(() => setLayers((l) => l.slice(-1)), 240);
    return () => window.clearTimeout(t);
  }, [layers]);

  const updated = dataset.meta?.lastUpdated ?? '';
  const isIso = ISO_DATE.test(updated);

  /* Screen-reader sentence. Korean glues each counter to its unit and needs a
     comma between the two figures; English counts, then says "of". Assembled
     per language rather than concatenated, so neither one reads as a machine. */
  const spoken =
    lang === 'ko'
      ? `${t(lang, 'status.srPeople')} ${shown}${t(lang, 'common.people')}, ${t(lang, 'status.srTotal')} ${total}${t(lang, 'common.people')}. ${t(lang, 'status.srRelations')} ${relationCount}${t(lang, 'common.ties')}.`
      : `${t(lang, 'status.srPeople')} ${shown} ${t(lang, 'status.srTotal')} ${total}. ${t(lang, 'status.srRelations')} ${relationCount}.`;

  const spoilerTitle = t(lang, 'status.spoilerTitle');

  return (
    <footer className={`statusbar${ready ? ' is-ready' : ''}${lang === 'en' ? ' latin-run' : ''}`}>
      <hr className="rule statusbar__rule" />

      <div className="statusbar__inner">
        {/* ── counts ── */}
        <div className="sb__left">
          <p className={`sb__counts${filtersActive ? ' is-filtered' : ''}`}>
            {/* `.fig`, not `.mono`. These are counts the reader compares —
                against each other and against the rail's own headline 300px
                above — and JetBrains Mono draws a zero nobody can turn off, so
                the ledger was reading `인물 2Ø / 2Ø · 관계 4Ø` while the rail
                said 20. base.css carries the rule. */}
            <span aria-hidden="true" className="sb__counts-vis">
              <span className="eyebrow sb__k">{t(lang, 'status.people')}</span>
              <span className="fig sb__v">
                <span className="sb__n">{shown}</span>
                <span className="sb__slash">/</span>
                {total}
              </span>
              <span className="sb__mid">·</span>
              <span className="eyebrow sb__k">{t(lang, 'status.relations')}</span>
              <span className="fig sb__v sb__n">{relationCount}</span>
            </span>
            <span className="sr-only">{spoken}</span>
          </p>

          {filtersActive ? (
            <button
              type="button"
              className="sb__clear"
              onClick={onReset}
              aria-label={t(lang, 'status.clearFiltersAria')}
            >
              <span className="sb__clear-x" aria-hidden="true">
                ✕
              </span>
              <span className="sb__clear-line" aria-hidden="true">
                {t(lang, 'status.clearFilters')}
              </span>
              {/* The Latin gloss translates the Korean line; in English the
                  line is already Latin and a gloss would repeat it. */}
              {lang === 'ko' ? (
                <span className="sb__clear-gloss" aria-hidden="true" lang="en">
                  {ui.en['status.clearFilters']}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>

        {/* ── contextual hint ── */}
        <div className="sb__centre" aria-live="polite">
          {layers.map((layer, i) => {
            const isTop = i === layers.length - 1;
            return (
              <p
                key={layer.id}
                className={`sb__hint ${isTop ? 'is-in' : 'is-out'}`}
                aria-hidden={isTop ? undefined : true}
              >
                {layer.hint.name ? <span className="sb__hint-name">{layer.hint.name}</span> : null}
                <span className="sb__hint-body">{layer.hint.body}</span>
                {layer.hint.tail ? <span className="sb__hint-tail">{layer.hint.tail}</span> : null}
              </p>
            );
          })}
        </div>

        {/* ── scope badge ── */}
        <div className="sb__right">
          <span className="sb__badge" title={spoilerTitle}>
            <svg className="sb__shield" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" focusable="false">
              <path
                d="M5.5 0.7 10 2.3v3.6c0 2.6-1.8 4.4-4.5 5.4C2.8 10.3 1 8.5 1 5.9V2.3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </svg>
            {/* `Spoiler-free` is the Latin flag on a Korean line. English
                already says it in the line itself. */}
            {lang === 'ko' ? (
              <>
                <span className="eyebrow sb__badge-flag" lang="en">
                  {ui.en['topbar.spoilerBadge']}
                </span>
                <span className="sb__badge-mid" aria-hidden="true">
                  ·
                </span>
              </>
            ) : null}
            <span className="sb__badge-line">{t(lang, 'status.spoilerBadge')}</span>
            <span className="sr-only">{spoilerTitle}</span>
          </span>

          {updated ? (
            <span className="sb__updated">
              <span className="eyebrow">{t(lang, 'status.updated')}</span>
              {isIso ? (
                <time className="mono tnum sb__date" dateTime={updated}>
                  {updated.replace(/-/g, '.')}
                </time>
              ) : (
                <span className="mono tnum sb__date">{updated}</span>
              )}
            </span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
