import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react';
import type { GLink } from '../graph/types';
import { EDGE_LABEL_I18N, edgeText, personName, t } from '../data/i18n';
import { fill } from '../data/i18n/ui';
import { tieTypeScope } from '../data/edges';
import { haveFaced, meetingsFor } from '../data/headToHead';
import { isVisible, pick } from '../data/redact';
import { useLang } from '../state/useLang';
import { useWatched } from '../state/useWatched';
import { Portrait } from './Portrait';
import './EdgeCard.css';

/**
 * EdgeCard — the readout for a relationship.
 *
 * The relationships are the product, and until this existed the lines were the
 * one thing on the canvas that could not be asked a question. A reader who
 * wanted to know what a line meant had to click one of its endpoints, wait for
 * a 460px dossier to cover a third of the graph, and scroll past a bio and a
 * franchise record to reach the sentence the line was already pointing at.
 *
 * So this is deliberately the same family as HoverCard — cursor-tethered
 * glass, quadrant placement, position welded to transform with only opacity
 * eased — but its subject is the edge rather than the node: both people, the
 * type in its own hue, where it happened, the headline and the description as
 * written, and a marker when the record is not fully cross-checked.
 *
 * Placement follows HoverCard's rule with one addition: it is also kept out of
 * the chrome insets, because the card exists precisely so the dossier does not
 * have to be opened, and landing underneath it would be self-defeating.
 */

export interface EdgeCardProps {
  link: GLink | null;
  /** Held open by a click rather than following the cursor. */
  pinned: boolean;
  /** Client coords: the cursor, or a pinned line's midpoint. */
  pointer: { x: number; y: number };
  /** Screen-space area the chrome is covering. */
  insets: { top: number; right: number; bottom: number; left: number };
  /** The line's two ends in client coords, so the card can stand off it. */
  ends: { ax: number; ay: number; bx: number; by: number } | null;
  onClear: () => void;
}

/* Is this a pointer with no keys behind it? Read once and kept live, because
   the hint below is a different SENTENCE on touch, not a different style — CSS
   can hide a lie but it cannot rewrite one, and hiding it left the pinned card
   on a phone with no instruction at all.

   `(hover: none)` and not `(pointer: coarse)`: the stylesheet suppresses the
   unpinned card on exactly that query, so the copy and the visibility have to
   agree about what a touch device is. A hybrid laptop with a touchscreen has a
   hover-capable primary pointer, keeps its keyboard, and keeps the key hint. */
function useTouchOnly(): boolean {
  const [touch, setTouch] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(hover: none)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)');
    const on = (): void => setTouch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return touch;
}

/* Same keep-out geometry as HoverCard: clear of the line horizontally, and a
   preference for going up, because node name plates are drawn below discs. */
const CLEAR_X = 26;
const CLEAR_UP = 22;
const CLEAR_DOWN = 40;
const MARGIN = 10;

/** Distance from an axis-aligned box to a segment — how far a candidate
 *  placement stands off the line it is describing. */
function boxToSegment(bx: number, by: number, bw: number, bh: number, s: EdgeCardProps['ends']): number {
  if (!s) return Infinity;
  const STEPS = 10;
  let best = Infinity;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const px = s.ax + (s.bx - s.ax) * t;
    const py = s.ay + (s.by - s.ay) * t;
    const dx = Math.max(bx - px, 0, px - (bx + bw));
    const dy = Math.max(by - py, 0, py - (by + bh));
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
}

export function EdgeCard({ link, pinned, pointer, insets, ends, onClear }: EdgeCardProps): JSX.Element | null {
  const { lang } = useLang();
  /* Through the hook, never `currentWatched()`. This card is the surface most
     likely to be on screen when a reader changes their mind — it follows the
     cursor — and a module global carries no subscription, so it would keep
     printing the verdict it was first rendered with. See state/useWatched.ts. */
  const { watched } = useWatched();
  const touch = useTouchOnly();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 210 });

  const measureKey = link ? `${link.id}:${lang}` : '';

  /* Measured once per relationship rather than once per mouse move: the
     content only changes when the line under the cursor does. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSize((s) =>
      Math.abs(r.width - s.w) > 0.5 || Math.abs(r.height - s.h) > 0.5 ? { w: r.width, h: r.height } : s,
    );
  }, [measureKey]);

  const vw = typeof document === 'undefined' ? 1440 : document.documentElement.clientWidth;
  const vh = typeof document === 'undefined' ? 900 : document.documentElement.clientHeight;
  const left = MARGIN + Math.max(0, insets.left - 8);
  const right = vw - MARGIN - Math.max(0, insets.right - 8);
  const top = MARGIN + Math.max(0, insets.top - 12);
  const bottom = vh - MARGIN - Math.max(0, insets.bottom - 8);

  const candidates = [
    { x: pointer.x + CLEAR_X, y: pointer.y - CLEAR_UP - size.h },
    { x: pointer.x - CLEAR_X - size.w, y: pointer.y - CLEAR_UP - size.h },
    { x: pointer.x + CLEAR_X, y: pointer.y + CLEAR_DOWN },
    { x: pointer.x - CLEAR_X - size.w, y: pointer.y + CLEAR_DOWN },
  ];
  const fits = (c: { x: number; y: number }) =>
    c.x >= left && c.x + size.w <= right && c.y >= top && c.y + size.h <= bottom;
  /* Among the placements that fit, take the one that stands furthest off the
     line. A readout that covers its own subject answers the question and hides
     the evidence — which is the failure the node hover card was already filed
     for. The quadrant order still decides ties, so the card keeps its habit of
     going up and to the right. */
  const usable = candidates.filter(fits);
  const spot =
    usable.length > 0
      ? usable.reduce((best, c) =>
          boxToSegment(c.x, c.y, size.w, size.h, ends) > boxToSegment(best.x, best.y, size.w, size.h, ends) + 8
            ? c
            : best,
        )
      : candidates[candidates.length - 1];

  const x = Math.round(Math.min(Math.max(spot.x, left), Math.max(left, right - size.w)));
  const y = Math.round(Math.min(Math.max(spot.y, top), Math.max(top, bottom - size.h)));

  if (!link) return null;

  const e = link.edge;
  const text = edgeText(e, lang, watched);
  /* ── THE CARD'S ACCENT IS THE STROKE'S OWN INK ────────────────────────────
     `link.color`, not `EDGE_COLOR[link.type]`. Everything else on this card had
     already learned the rule — the chip goes through `pick` below, the arrowhead
     through `isVisible` — and then `--e` handed the sealed verdict straight back
     as paint: at `bgx.watched='[]'` all 28 sealed cards carried their type hue,
     spent by EdgeCard.css as the 2px accent gradient, the pinned border and the
     '—' between the two names. A card with no word on it, bled in #ff2f43, is a
     betrayal named in a second channel.

     graph/build.ts already resolved this once, for the line the card is
     describing: the type hue when `tieTypeVisible`, `SEALED_LINK_INK` when not.
     Reading it off the link means the readout and the stroke it is tethered to
     cannot disagree, and the neutral is decided in the file that argued for it
     rather than a second time here. At the default set nothing moves —
     EDGE_COLOR is a total `Record<EdgeType, string>` and `link.color` is that
     same lookup — which is why the chip's own gate stays exactly as it was. */
  const color = link.color;
  const a = personName(link.source.person, lang);
  const b = personName(link.target.person, lang);
  /* ── the word, and the arrowhead ─────────────────────────────────────────
     THE TIE IS STRUCTURE AND STAYS ON THE CARD. What it is CALLED is not:
     works.ts lists `type` and `directed` on `OUTCOME_FIELDS.Edge` because
     '배신' is a verdict about a named person and '→' is that verdict with a
     direction, and both degrade to a neutral tie rather than to no tie.

     `edgeText` gates the headline and the account and deliberately returns
     neither of these — the docblock there says they reach the canvas through
     graph/build.ts instead. So this was the state the round was called for:
     the graph had already stopped COUNTING a betrayal whose scope is sealed
     while this card went on printing the word for it. The graph stopped
     counting the betrayal and the card still named it.

     `pick`, not a second predicate — one gate, in data/redact.ts. And
     `tieTypeScope` from data/edges.ts, not `e.scopes?.type ?? e.scope` spelled
     out again: this card and the tie count are asking one question of one
     field, and the resolution they ask it with is authored beside the data. */
  const typeScope = tieTypeScope(e);
  const typeLabel = pick(EDGE_LABEL_I18N[lang][link.type], typeScope, watched);
  /* `link.directed` is `Boolean(e.directed) || e.type === 'betrayal'`, resolved
     in build.ts off the raw record, so the two halves are unpicked here and
     each asked about the field it actually came from. Where neither survives
     the pair reads '—', which is what an undirected tie has always looked
     like. */
  const directed =
    (e.directed === true && isVisible(e.scopes?.directed ?? e.scope, watched)) ||
    (link.type === 'betrayal' && isVisible(typeScope, watched));
  /* ── what this pair has already settled ──────────────────────────────────
     The card describes the tie; the ledger says how it came out. Those are
     different facts and until now only the first reached a screen: the
     김경훈–이상민 line carried a paragraph about a betrayal and never printed
     22:0, which is the one number in that story no table can reconstruct.

     `haveFaced` is the gate rather than `results.length > 0` because the two
     answer different questions — a pair can have met with nothing numbered —
     and the predicate is already decided once, per pair, in headToHead.ts.
     Capped at three: this is a cursor-tethered card, not a document, and the
     dossier's ledger holds the full record. */
  const results = haveFaced(link.source.id, link.target.id, watched)
    ? meetingsFor(link.source.id, watched)
        .filter((m) => m.winner === link.target.id || m.loser === link.target.id)
        .slice(0, 3)
    : [];
  const unsure = e.confidence !== 'high';
  const where =
    e.season > 0 ? `${t(lang, 'dossier.seasonPrefix')} ${e.season}` : t(lang, 'common.outsideHouse');

  return (
    <div
      ref={ref}
      id="atlas-edgecard"
      role="tooltip"
      aria-label={t(lang, 'edge.readoutLabel')}
      className={`edgecard is-shown${pinned ? ' is-pinned' : ''}`}
      style={{ transform: `translate3d(${x}px, ${y}px, 0)`, ['--e' as string]: color }}
    >
      <div className="edgecard__card">
        <div className="edgecard__accent" aria-hidden="true" />

        <div className="edgecard__pair">
          <span className="edgecard__who">
            <span className="edgecard__mark">
              <Portrait
                id={link.source.id}
                initials={lang === 'en' ? link.source.initialsEn : link.source.initials}
                category={link.source.category}
                seasons={link.source.seasons}
                /* THE SAME PLATE AS EVERY OTHER SURFACE. These two chips passed
                   no ranks at all, so `seasonArcs` fell to its no-rank branch
                   and drew EVERY season as the beaded ring — the mark for
                   "present, not competing" — on both ends of every tie, at
                   every watched-set, including a reader who has seen
                   everything. Read off `plate`, like the dossier's relation
                   chips: the gate has already run there, and a chip suppresses
                   its own track anyway. */
                ranks={link.source.plate.ranks}
                fieldSizes={link.source.plate.fieldSizes}
                sealed={link.source.plate.sealed}
                isWinner={link.source.isWinner}
                isHost={link.source.isHost}
                noTies={link.source.noTies}
                variant="chip"
                imageUrl={link.source.person.portraitUrl}
              />
            </span>
            <span className="edgecard__name">{a.primary}</span>
          </span>

          <span className="edgecard__join" aria-hidden="true">
            {directed ? '→' : '—'}
          </span>

          <span className="edgecard__who">
            <span className="edgecard__mark">
              <Portrait
                id={link.target.id}
                initials={lang === 'en' ? link.target.initialsEn : link.target.initials}
                category={link.target.category}
                seasons={link.target.seasons}
                ranks={link.target.plate.ranks}
                fieldSizes={link.target.plate.fieldSizes}
                sealed={link.target.plate.sealed}
                isWinner={link.target.isWinner}
                isHost={link.target.isHost}
                noTies={link.target.noTies}
                variant="chip"
                imageUrl={link.target.person.portraitUrl}
              />
            </span>
            <span className="edgecard__name">{b.primary}</span>
          </span>
        </div>

        <ul className="edgecard__tags">
          {typeLabel ? <li className="edgecard__chip">{typeLabel}</li> : null}
          <li className="edgecard__tag">{where}</li>
          {unsure ? (
            <li className="edgecard__tag edgecard__tag--unsure" title={t(lang, 'dossier.unverifiedTie')}>
              {t(lang, 'dossier.unverified')}
            </li>
          ) : null}
        </ul>

        {text.label ? <p className="edgecard__head">{text.label}</p> : null}
        {text.description ? <p className="edgecard__body">{text.description}</p> : null}

        {results.length > 0 ? (
          <div className="edgecard__h2h">
            <p className="eyebrow edgecard__h2hk">{t(lang, 'faced.eyebrow')}</p>
            <ul className="edgecard__ms">
              {results.map((m, i) => {
                const winner = m.winner === link.source.id ? a.primary : b.primary;
                const loser = m.loser === link.source.id ? a.primary : b.primary;
                return (
                  <li className={`edgecard__m${m.kind === 'duel' ? ' is-duel' : ''}`} key={`${m.where}-${i}`}>
                    {/* The kind leads, because without it a duel and a same-field
                        finish between the same two people print the identical
                        sentence twice — 홍진호 × 김경훈 has both, and 'one of them
                        finished higher in that field' is not 'he knocked him
                        out'. The ledger counts them apart; so does the copy. */}
                    <span className="edgecard__mkind">
                      {t(lang, m.kind === 'duel' ? 'faced.duel' : 'faced.field')}
                    </span>
                    {/* fill(), not .replace(): '{w}이/가 {l}을/를 이겼다' picks
                        each particle off the batchim of the name in front of
                        it — 이진형이 / 홍진호가, 윤비를 / 서출구를. */}
                    <span className="edgecard__mbeat">
                      {fill(t(lang, 'faced.beat'), { w: winner, l: loser })}
                    </span>
                    {m.score ? (
                      <span className="edgecard__mscore mono tnum">
                        <span className="sr-only">{t(lang, 'faced.scoreLabel')} </span>
                        {m.score}
                      </span>
                    ) : null}
                    <span className="edgecard__mwhere">{lang === 'en' ? m.whereEn : m.where}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* The hint changes with the state so the card teaches its own
            interaction: point at a line to read it, click to hold it.

            It also changes with the INPUT. The pinned string names two keys —
            'Esc 해제 · E 다음 인연' — and a pinned card is the only one that
            survives on touch, where the unpinned one is suppressed outright.
            So on a 390px phone that line was a card over half the screen
            instructing the reader to press keys the device does not have.

            The stylesheet used to answer that by hiding the line, which turned
            a wrong instruction into no instruction: a held-open card covering
            half the viewport, dimming the graph behind it, with nothing on it
            saying how to leave or that tapping another line moves it. A tap has
            its own two gestures and they are worth naming, so it gets its own
            sentence and the ✕ in the corner stays as the target. */}
        <p className="edgecard__hint">
          {pinned ? t(lang, touch ? 'edge.pinnedHintTouch' : 'edge.pinnedHint') : t(lang, 'edge.pinHint')}
        </p>
        {pinned ? (
          <>
            {/* The tap target. 32px, top-right, matching .gallery__close — the
                one place in the app a reader already knows to look for a way
                out of something held open. Hidden on a pointer that has Esc. */}
            <button
              type="button"
              className="edgecard__x"
              onClick={onClear}
              aria-label={t(lang, 'edge.clear')}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="edgecard__close" onClick={onClear}>
              {t(lang, 'edge.clear')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
