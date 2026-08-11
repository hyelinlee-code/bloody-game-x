import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type UIEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Portrait } from './Portrait';
import { TEAM_COLOR } from '../data/lineage';
import {
  CATEGORY_LABEL_I18N,
  personName,
  personOccupation,
  runText,
  t,
  TEAM_LABEL_I18N,
  ui,
  type Lang,
  type UiKey,
} from '../data/i18n';
import { useLang } from '../state/useLang';
import { tieCounts } from '../data/edges';
import { SEASON_COLOR, SEASON_INK } from '../graph/palette';
import { HAS_PORTRAITS } from '../graph/portraits';
import type { BuiltGraph } from '../graph/build';
import type { SeasonRun, XTeam } from '../data/types';
import './Gallery.css';
import { played } from '../data/types';

export interface GalleryProps {
  open: boolean;
  graph: BuiltGraph;
  visible: Set<string>;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const TEAM_ORDER: XTeam[] = ['season1', 'season2', 'season3', 'challenger', 'rookie'];

/**
 * '출연진 · THE CAST' in Korean; just 'THE CAST' in English, where the Latin
 * half of the pair would be the same words printed twice. One key, read twice,
 * so the two halves can never drift apart.
 *
 * The two halves are separate elements now, and the Latin one carries
 * `lang="en"`, which is the house pattern everywhere else (FilterRail,
 * StatusBar, PathCard). It matters typographically as of this round: base.css
 * steps a Hangul eyebrow down from 0.16em caps tracking to --tr-caps-ko, and
 * the gloss beside it has to be excluded from that step-down by being tagged
 * rather than by being lucky. Printed as one undifferentiated string, '출연진'
 * either kept the ransom-note tracking or dragged 'THE CAST' out of caps.
 */
function EyebrowPair({ lang, k }: { lang: Lang; k: UiKey }): JSX.Element {
  const line = t(lang, k);
  if (lang !== 'ko') return <span className="eyebrow">{line}</span>;
  return (
    <span className="eyebrow">
      {line}
      {' · '}
      <span lang="en">{ui.en[k]}</span>
    </span>
  );
}

/**
 * The counter for `n` of something, read off a singular/plural key pair.
 *
 * The spacing between numeral and counter is CSS's job here (`.gallery__title`
 * has a `:lang(en)` gap, `.gallery__line-n-l` a margin), so this returns the
 * word alone. Korean counters do not inflect and both halves hold the same
 * string; English is why the pair exists — reading only the plural half is
 * what printed "1 players" and "1 ties" on a one-season, one-tie card.
 */
function unit(lang: Lang, n: number, one: UiKey, many: UiKey): string {
  return t(lang, n === 1 ? one : many);
}

/**
 * A finish, in one notation.
 *
 * The placement strings in records.ts carry both scripts at once — '4위 · 4th',
 * '우승 · Winner' — which on an 11px card line prints the same integer twice and
 * still leaves the host cell with no gloss at all. The card is 190px wide and
 * now carries every season a person played, so it takes the short form and
 * takes it in whichever language the reader is in.
 *
 * Rebuilding the rank here rather than reading `placement` is also why this
 * surface used to drop the denominator that records.ts writes into every
 * placement string. A rank without its field size is a number, not a result:
 * 박지민's S2 13위 is last of thirteen and sat on the wall next to 정근우's
 * S1 7위, which is mid-table of ten, reading as the better run of the two.
 * `record.ofField` is the string for it in both languages, and the run has
 * `fieldSize` on it already. Non-playing runs have no field to be out of.
 */
function shortPlacement(personId: string, index: number, lang: Lang, run: SeasonRun): string {
  if (played(run) && run.rank) {
    const of = run.fieldSize ? ` ${t(lang, 'record.ofField').replace('{n}', String(run.fieldSize))}` : '';
    if (run.rank === 1) return `${t(lang, 'gallery.winnerShort')}${of}`;
    if (lang === 'ko') return `${run.rank}${t(lang, 'gallery.rankUnit')}${of}`;
    /* 11th–13th take 'th'; everything else follows the last digit. */
    const n = run.rank;
    const tens = n % 100;
    const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
    return `${n}${suffix}${of}`;
  }
  /* A non-playing run has no number, and the roles are not interchangeable —
     Lee Sang-min sat on the season-1 studio panel and Park Ji-min dealt cards
     in season 3, so neither can be flattened to "Host". Take the head of the
     placement string, which is where the record puts the role, and drop the
     apposition that follows it. */
  const head = runText(personId, run, index, lang).placement.split(/\s+[·—]\s+/)[0].trim();
  return head || t(lang, 'gallery.hostShort');
}

/**
 * The cast, as a wall of plates. The graph answers "who is connected to whom";
 * this answers "who is in this thing", which is the other half of the question
 * and the one a picture answers faster than a diagram.
 */
export function Gallery({ open, graph, visible, onClose, onSelect }: GalleryProps): JSX.Element | null {
  const { lang } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  /* Build-time constant — `public/portraits/` is read by a Vite plugin, so
     this is not state and never changes within a session. */
  const noteKey: UiKey = HAS_PORTRAITS ? 'gallery.notePhotos' : 'gallery.note';

  /* The top fade of .scroll--faded is driven by data-scrolled, and this surface
     declared the class without ever setting the attribute — so --scroll-fade-t
     stayed 0px however far you scrolled and the wall cut the top row of plates
     with a razor-straight line through the medallion equator: 진호 rendered as
     "신오", 출구 as "둘구". The utility's own usage note is
     `<div class="scroll scroll--faded" data-scrolled={top > 4}>`; this is that,
     with the same 4px threshold the rail and the dossier use so the ramp cannot
     chatter on a sub-pixel scroll. */
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop > 4;
    setScrolled((was) => (was === top ? was : top));
  }, []);

  const groups = useMemo(() => {
    const byTeam = new Map<XTeam, typeof graph.nodes>();
    for (const team of TEAM_ORDER) byTeam.set(team, []);
    for (const n of graph.nodes) {
      byTeam.get(n.person.x?.team ?? 'rookie')?.push(n);
    }
    return TEAM_ORDER.map((team) => ({ team, nodes: byTeam.get(team) ?? [] })).filter((g) => g.nodes.length);
  }, [graph.nodes]);

  useEffect(() => {
    if (!open) return;
    // The wall reopens at scrollTop 0, so the top ramp has to reopen at 0 too;
    // without this the fade is inherited from the previous visit and blurs a
    // group heading that is sitting flush against the top edge.
    setScrolled(false);
    restore.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const focusables = el.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restore.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  /* Which script leads a name flips with the UI language; the other script is
     the subtitle and is tagged so it keeps its own font and tracking. */
  const leadLang: Lang = lang;
  const subLang: Lang = lang === 'en' ? 'ko' : 'en';

  return createPortal(
    <div className="gallery" role="dialog" aria-modal="true" aria-label={t(lang, 'gallery.dialogLabel')}>
      <button type="button" className="gallery__scrim" aria-label={t(lang, 'gallery.close')} onClick={onClose} />

      <div className="gallery__sheet pane" ref={ref} tabIndex={-1}>
        {/* THE PINNED PART IS ONE LINE, and the seven-line explainer is not in
            it. Measured before: the head plus the note held 223 CSS px at
            1600×1000 (25.3% of an 880px sheet) and 256px at 390×844 (30.3%),
            none of it scrollable, leaving a 657px / 588px scrollport for a wall
            whose row pitch is ~390px — one row and a bit, on the one surface in
            the product whose entire job is to show twenty faces.

            The explainer moved into the scroll flow rather than into a
            disclosure: it is the thing that tells a reader what the rim ticks
            and the dashed rings mean, so it should be the first thing they read
            and then never again. It is read once and scrolled away, which is
            what a lede is for.

            NOTHING HERE IS `position: sticky` AND NOTHING BELOW IT IS EITHER.
            The bloc heading was sticky once and was removed for exactly the
            failure this blocker re-files — see the note above
            .gallery__group-head. Pinning a second band to fix a band that is
            too tall is the move that produced the defect the first time. */}
        <header className="gallery__head">
          <div className="gallery__head-l">
            <EyebrowPair lang={lang} k="gallery.eyebrow" />
            <h2 className="gallery__title">
              <span className="gallery__title-n">{graph.nodes.length}</span>
              <span className="gallery__title-unit">
                {unit(lang, graph.nodes.length, 'gallery.countUnitOne', 'gallery.countUnit')}
              </span>
            </h2>
          </div>
          <button type="button" className="gallery__close" onClick={onClose} aria-label={t(lang, 'common.close')}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* `.scroll--snap` is what lets the top ramp be 20px instead of 72.
            The wall's unit is a 118px plate, not a line of text, so no mask
            depth can dissolve it — the scroller has to stop somewhere the mask
            is not over a disc instead. See the ramp note in Gallery.css. */}
        <div
          className="gallery__scroll scroll scroll--faded scroll--snap"
          data-scrolled={scrolled ? 'true' : 'false'}
          onScroll={onScroll}
        >
          {/* "Nobody here was photographed" is only true while nobody is. The
              drop-in folder can make it false at any moment, so the note asks
              rather than asserts — a wall of faces under a line saying they are
              not photographs is the kind of error that costs a reference work
              its credit on everything else it says. */}
          <p className="gallery__note">
            {t(lang, noteKey)}
            {lang === 'ko' && (
              <span className="gallery__note-sub" lang="en">
                {ui.en[noteKey]}
              </span>
            )}
          </p>

          {groups.map((g) => (
            <section key={g.team} className="gallery__group">
              <h3 className="gallery__group-head">
                <span
                  className="gallery__group-dot"
                  style={{ background: TEAM_COLOR[g.team] }}
                  aria-hidden="true"
                />
                <span className="gallery__group-lead">{TEAM_LABEL_I18N[lang][g.team]}</span>
                {lang === 'ko' && (
                  <span className="gallery__group-sub" lang="en">
                    {TEAM_LABEL_I18N.en[g.team]}
                  </span>
                )}
                <span className="gallery__group-n mono tnum">{g.nodes.length}</span>
              </h3>

              <ul className="gallery__grid">
                {g.nodes.map((n) => {
                  const p = n.person;
                  const rel = graph.edgesOf.get(n.id) ?? [];
                  /* The card's number and the plate's rim ticks are the same
                     claim — 확인된 인연 — and the note at the top of this wall
                     says so out loud. `tieCounts` is the rule that decides it,
                     read from data/edges.ts rather than counted off `rel.length`
                     here: a `parallel` edge records that two people have
                     demonstrably never shared a room, and 강지후, 신승용 and
                     최연청 each carry exactly one and nothing else. The
                     remainder is not dropped — it is printed beside the count
                     under its own name. */
                  const ties = tieCounts(rel);
                  const dim = !visible.has(n.id);
                  const name = personName(p, lang);
                  /* Chronological, not "best": Park Ji-min is S1 4위 · S2 13위 ·
                     S3 진행, and printing only the best run hid the two facts
                     that make her interesting.
                     The original index rides along because the English records
                     zip to the Korean ones positionally. */
                  const runs = (p.priorSeasons ?? [])
                    .map((run, i) => ({ run, i }))
                    .sort((a, b) => a.run.season - b.run.season);
                  return (
                    <li key={n.id} className={`gallery__cell${dim ? ' is-dim' : ''}`}>
                      <button
                        type="button"
                        onClick={() => onSelect(n.id)}
                        /* Dimmed cards stay open-able — the filters govern what
                           the graph draws, not who exists — but the reason they
                           are grey is now stated rather than left to opacity. */
                        title={dim ? t(lang, 'gallery.filteredOut') : undefined}
                      >
                        <span className="gallery__plate">
                          <Portrait
                            id={n.id}
                            initials={lang === 'en' ? n.initialsEn : n.initials}
                            category={n.category}
                            seasons={n.seasons}
                            ranks={n.seasons.map((s) => runs.find((r) => r.run.season === s)?.run.rank)}
                            /* Season 1 seated 10, season 3 seated 18, and the
                               plate normalises arc length against the field —
                               but nothing had ever passed the field, so every
                               arc on the wall was drawn against the constant
                               13 and a 4th of 10 came out shorter than a 4th
                               of 13. The value is on the run. */
                            fieldSizes={n.seasons.map((s) => runs.find((r) => r.run.season === s)?.run.fieldSize)}
                            isWinner={n.isWinner}
                            isHost={n.isHost}
                            noTies={n.noTies}
                            connections={rel.map((l) => ({ type: l.type, strength: l.edge.strength }))}
                            variant="card"
                            imageUrl={p.portraitUrl}
                          />
                        </span>

                        <span className="gallery__name" lang={leadLang}>
                          {name.primary}
                        </span>
                        <span className="gallery__name-sub" lang={subLang}>
                          {name.secondary}
                        </span>
                        <span className="gallery__occ">{personOccupation(p, lang)}</span>

                        <span className="gallery__meta">
                          <span className="gallery__cat" style={{ color: n.color }}>
                            {CATEGORY_LABEL_I18N[lang][n.category]}
                            {lang === 'ko' && (
                              <span className="gallery__cat-sub" lang="en">
                                {' '}
                                {CATEGORY_LABEL_I18N.en[n.category]}
                              </span>
                            )}
                          </span>
                          {n.seasons.length > 0 && (
                            <span className="gallery__seasons">
                              {n.seasons.map((s) => {
                                const label = `${t(lang, 'common.season')} ${s}`;
                                return (
                                  <span
                                    key={s}
                                    className="gallery__season-pip"
                                    style={{ background: SEASON_COLOR[s] }}
                                    title={label}
                                  >
                                    <span className="sr-only">{label}</span>
                                  </span>
                                );
                              })}
                            </span>
                          )}
                        </span>

                        <span className="gallery__line">
                          {runs.length > 0 ? (
                            <span className="gallery__runs">
                              {runs.map(({ run, i }) => (
                                <span
                                  key={`${run.season}-${i}`}
                                  className={`gallery__run${run.rank === 1 && played(run) ? ' gallery__run--win' : ''}`}
                                  /* The lettering ramp, not the mark ramp.
                                     'S1' at 10px in SEASON_COLOR[1] (#367f45)
                                     measured 3.74:1 on the card — below the
                                     4.5:1 floor for text this small, and
                                     palette.ts says in as many words that
                                     SEASON_COLOR is MARKS ONLY. SEASON_INK
                                     is the same three hues lifted for
                                     letterforms; the season pip above the row
                                     keeps the mark colour. */
                                  style={{ '--run': SEASON_INK[run.season] } as CSSProperties}
                                >
                                  <span className="gallery__run-s">S{run.season}</span>
                                  <span className="gallery__run-p">{shortPlacement(p.id, i, lang, run)}</span>
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="gallery__line-what">{t(lang, 'dossier.emptyRecord')}</span>
                          )}
                          <span className="gallery__line-n mono tnum">
                            {ties.met}
                            <span className="gallery__line-n-l">
                              {unit(lang, ties.met, 'common.tie', 'common.ties')}
                            </span>
                            {/* The second half of the split, in the same slot
                                and in the same ink. Not tinted with
                                EDGE_COLOR.parallel: palette.ts's contrast table
                                says that ramp is for marks and not for 11px
                                type, and the phrase names itself without a hue.
                                Measured at 1600px: the cell is 283px and the
                                row 257px, of which this adds 54px in Korean and
                                84px in English — the record side of the row
                                keeps 145px, and its longest string, "First time
                                in the house", sets in 119px. */}
                            {ties.parallel > 0 && (
                              <span className="gallery__line-n-l" title={t(lang, 'tie.parallelNote')}>
                                {' · '}
                                {t(lang, 'tie.parallel')} {ties.parallel}
                              </span>
                            )}
                          </span>
                        </span>
                        {dim && <span className="sr-only">{t(lang, 'gallery.filteredOut')}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
