import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { Dataset } from '../data/types';
import type { AtlasState } from '../state/useAtlas';
import { personName, t, ui } from '../data/i18n';
import { tieTypeVisible } from '../data/edges';
import { useLang } from '../state/useLang';
import { useWatched } from '../state/useWatched';
import { Credit } from './Credit';
import './StatusBar.css';

export interface StatusBarProps {
  /** Opens the About sheet — the badge is a control now, not a label. */
  onOpenAbout: () => void;
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


export function StatusBar({ onOpenAbout, atlas, dataset, onReset, introDone }: StatusBarProps): JSX.Element {
  const { graph, visible, edgeTypes, selectedId, filtersActive } = atlas;
  const ready = introDone !== false;
  const { lang } = useLang();
  /* The hook, not `currentWatched()`: this is a component, the count below is a
     claim about outcomes, and the mirror carries no subscription. */
  const { watched } = useWatched();

  const total = dataset.people?.length ?? 0;
  const shown = visible.size;

  /* A relation only counts if you can actually see it: both ends visible, its
     type not filtered out — and its type not sealed against this reader.
     ─────────────────────────────────────────────────────────────────────────
     THE THIRD CLAUSE IS THIS ROUND'S, and the sentence this figure feeds is why
     it could not wait. The ledger reads 관계 52 and the screen-reader line reads
     표시 중인 관계 52건 / 'Ties shown 52' — "currently showing" is a claim about
     THIS reader at THIS moment, and at `bgx.watched='[]'` it was measured
     printing 52 for a reader the rest of the app would name 24 of. Every other
     surface that counts a tie had already been gated: `GNode.degree`, the
     dossier headline, the hover card, the cast wall, the palette, and, one file
     over, this rail's own legend and 인연 tile.

     `tieTypeVisible`, WITHOUT `isMeeting`, matching the rail's tile exactly.
     This bar counts lines the reader can be told the meaning of, so a parallel
     record counts here as it does there — the two figures sit 300px apart on
     one screen and readers compare them, which is the whole argument
     `.sb__counts` makes for setting them in `.fig`. Measured with no filters
     on: 52 at the default, 24 at the empty set, the same pair the rail prints.
     The two filter clauses above stay first; they are cheaper and they are what
     makes this a count of the CURRENT view rather than of the corpus. */
  const relationCount = useMemo(() => {
    let n = 0;
    for (const l of graph.links) {
      if (!edgeTypes.has(l.type)) continue;
      if (!visible.has(l.source.id) || !visible.has(l.target.id)) continue;
      if (!tieTypeVisible(l.edge, watched)) continue;
      n += 1;
    }
    return n;
  }, [graph.links, edgeTypes, visible, watched]);

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
          {/* Who made it. Sits ahead of the badge so the right-hand group
              reads maker -> promise -> freshness rather than interrupting the
              two data statements with a byline. */}
          <Credit lang={lang} />
          {/* A BUTTON, NOT A SPAN. It carried `cursor: help` and a title and
              then did nothing when clicked, which is the worst of both: it
              advertises that there is more to read and then refuses to show it.
              The badge makes the atlas's central promise, so clicking it opens
              the sheet where that promise is spelled out. */}
          <button type="button" className="sb__badge" title={spoilerTitle} onClick={onOpenAbout}>
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
          </button>

          {/* THE DATE MOVED TO THE RAIL'S FOOT. It was the third thing in this
              group, and with a byline beside it the group outgrew its track —
              the sentence had to hide below 1560px, which is most laptops, so
              the atlas stopped naming its author on the screens most people
              read it on.

              Freshness and authorship are both "about the document rather than
              the data", so either could have gone; the date went because the
              rail's foot already carries that register and because a date is
              something you look up once, while a byline is something you either
              see or do not. Cost, stated: the rail can be closed, and the date
              goes with it. See FilterRail's foot. */}
        </div>
      </div>
    </footer>
  );
}
