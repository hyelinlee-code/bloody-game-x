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
  runFacts,
  runText,
  t,
  TEAM_LABEL_I18N,
  ui,
  type Lang,
  type UiKey,
} from '../data/i18n';
import { useLang } from '../state/useLang';
import { useWatched, type WatchedSet } from '../state/useWatched';
import { tieCounts, tieTypeVisible } from '../data/edges';
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

/** What `runFacts` hands back, named so it can be computed once per run and
    spent twice — on the printed placement and on the winner's brass. */
type RunFacts = ReturnType<typeof runFacts>;

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
 *
 * ── AND THE NUMBERS COME THROUGH THE GATE NOW ──────────────────────────────
 * `run.rank` and `run.fieldSize` were read straight off the record here, which
 * is why fourteen finishes printed on this wall for a reader who had watched
 * nothing. `runFacts` is the accessor for them and it hands back the pair or
 * neither — a denominator can never outlive its numerator. At the default
 * watched-set it returns exactly what the record holds, so nothing moves.
 */
function shortPlacement(
  personId: string,
  index: number,
  lang: Lang,
  run: SeasonRun,
  facts: RunFacts,
  watched: WatchedSet,
): string {
  if (played(run)) {
    /* A PLAYED RUN WHOSE RANK IS WITHHELD PRINTS NOTHING AND MUST NOT FALL
       THROUGH to the role branch below. `played` reads `run.role`, which is
       deliberately never gated — the painters have to keep knowing whether a
       run was a run at the prize — so the fall-through would hand a redacted
       contestant either the head of a sealed placement string ('') or, worse,
       'gallery.hostShort', which says in as many words that they were there
       and not competing. An absent string is an absence; '비참가' is a claim,
       and on a contestant it is a false one.

       This branch is reachable only under redaction: all fourteen contestant
       runs in records.ts carry a rank and a fieldSize (measured), so at the
       default set the early return never fires and this function returns the
       same bytes it always did. */
    if (!facts.rank) return '';
    const of = facts.fieldSize
      ? ` ${t(lang, 'record.ofField').replace('{n}', String(facts.fieldSize))}`
      : '';
    if (facts.rank === 1) return `${t(lang, 'gallery.winnerShort')}${of}`;
    if (lang === 'ko') return `${facts.rank}${t(lang, 'gallery.rankUnit')}${of}`;
    /* 11th–13th take 'th'; everything else follows the last digit. */
    const n = facts.rank;
    const tens = n % 100;
    const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
    return `${n}${suffix}${of}`;
  }
  /* A non-playing run has no number, and the roles are not interchangeable —
     Lee Sang-min sat on the season-1 studio panel and Park Ji-min dealt cards
     in season 3, so neither can be flattened to "Host". Take the head of the
     placement string, which is where the record puts the role, and drop the
     apposition that follows it. */
  const head = runText(personId, run, index, lang, watched).placement.split(/\s+[·—]\s+/)[0].trim();
  return head || t(lang, 'gallery.hostShort');
}

/**
 * The cast, as a wall of plates. The graph answers "who is connected to whom";
 * this answers "who is in this thing", which is the other half of the question
 * and the one a picture answers faster than a diagram.
 */
export function Gallery({ open, graph, visible, onClose, onSelect }: GalleryProps): JSX.Element | null {
  const { lang } = useLang();
  /* THE HOOK, NOT `currentWatched()`. This is a subscription: when the reader
     narrows their answer the context changes identity, this component
     re-renders, and every accessor below is called again with the new set.
     Read through the module global instead and the wall would keep painting
     the finishes the reader has just said they have not seen — see the note on
     `currentWatched` in state/useWatched.ts. `watched` is threaded EXPLICITLY
     into every accessor on this surface for the same reason: an accessor left
     on its default parameter reads the global and is invisible to React. */
  const { watched } = useWatched();
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
                     under its own name.

                     AND THE READER'S SET IS PART OF THE RULE, passed explicitly
                     rather than left to the module mirror `tieCounts` defaults
                     to: this whole wall is twenty cards rendered from one hook,
                     and the mirror carries no subscription, so leaning on the
                     default would freeze all twenty numbers at whatever the set
                     was when the wall first mounted. `watched` comes from
                     `useWatched()` at the top of this component. */
                  const ties = tieCounts(rel, watched);
                  /* One tick per verified connection, and a tick is coloured by
                     TYPE — so an ungated rim does not merely over-count, it
                     prints the sealed verdict as a census: 홍진호's plate set
                     five alliance ticks, four prior-show, three betrayal and
                     one rivalry to a reader who had watched nothing, measured
                     off the stroke colours. Portrait applies `isMeeting`
                     itself, deliberately, and cannot apply this half — it is
                     handed `{ type, strength }` and never sees a scope. Same
                     filter, same predicate, as `connectionsFor` in
                     Dossier.tsx. */
                  const seen = rel.filter((l) => tieTypeVisible(l.edge, watched));
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
                            /* THE NODE ALREADY CARRIES THE GATED PAIR. Read it.
                               These two used to be rebuilt here — `runs.find(…)
                               ?.run.rank` and `?.run.fieldSize`, straight off
                               `p.priorSeasons` — while `n.plate.ranks` sat on
                               the very node being rendered, solved by
                               `buildGraph` through `runFacts` with the reader's
                               set. So the one surface that shows all twenty
                               plates at once was the one surface still drawing
                               the raw record.

                               ARC LENGTH IS THE PLACEMENT, which is why a
                               second read of the same field is not a style
                               question here: `plateGeometry.rankFrac` maps rank
                               and field to a sweep and the map is invertible,
                               so the wall PRINTS the finish it refuses to set
                               in type. Measured on the running app at
                               `bgx.watched='[]'`, 이진형's single S2 slot drew
                               a 59.30 track under a 59.16 value arc at weight
                               3.2 with the winner's terminal cap on it — a full
                               rank-1 sweep, byte-identical to the default,
                               beside a run row reading 'S2' and nothing else.
                               Twelve of the twenty cards were doing it — all
                               fourteen played runs in the cast, swept to
                               thirteen distinct lengths — which is the
                               placement table drawn in vector. Measured after,
                               every one of them is the slot's own room and the
                               wall carries no length a rank can be read off.

                               `n.plate.ranks` is aligned with `n.seasons` by
                               construction — buildGraph maps both off the same
                               `seasons` array — and `fieldSizes` is the
                               denominator without which an arc is drawn against
                               `FIELD_DEFAULT` (season 1 seated 10 and season 3
                               seated 18, so a 4th of 10 would come out shorter
                               than a 4th of 13). `runFacts` composes the two
                               through one gate so a field size can never
                               outlive the rank it qualifies; splitting them
                               across two reads here is exactly the failure that
                               interlock exists to stop.

                               A WITHHELD RANK ARRIVES AS `undefined` AND DRAWS
                               THE BEADED RING — 'present all season, no finish
                               to record'. That is the shipped interim, not the
                               destination: the canvas node, the hover card, the
                               dossier crest and the dossier's relation chips all
                               already draw it, so until this line the two
                               painters of one object disagreed about the same
                               person on two surfaces, which is the single thing
                               plateGeometry.ts's docblock forbids. Sealed and
                               never-competed are still different states and the
                               third mark that tells them apart is
                               PLAN-spoilers.md §3, in the same commit as the
                               legend row that glosses it; build.ts says the same
                               thing over `plate.ranks`. Saying less than the
                               truth on twelve cards is the side to be wrong on,
                               and it is the side the rest of the app is already
                               on. */
                            ranks={n.plate.ranks}
                            fieldSizes={n.plate.fieldSizes}
                            isWinner={n.isWinner}
                            isHost={n.isHost}
                            noTies={n.noTies}
                            connections={seen.map((l) => ({ type: l.type, strength: l.edge.strength }))}
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
                              {runs.map(({ run, i }) => {
                                /* Computed once and spent twice — the printed
                                   placement and the brass that says "this one
                                   was a win". The class used to read
                                   `run.rank === 1` straight off the record,
                                   which lit the winner's ink on a card whose
                                   text was about to be sealed. */
                                const facts = runFacts(run, lang, watched);
                                const place = shortPlacement(p.id, i, lang, run, facts, watched);
                                return (
                                  <span
                                    key={`${run.season}-${i}`}
                                    className={`gallery__run${facts.rank === 1 && played(run) ? ' gallery__run--win' : ''}`}
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
                                    {/* The season chip stays whatever happens —
                                        being in a season is participation and is
                                        never redacted. Only the finish beside it
                                        goes, and it goes by not rendering rather
                                        than by rendering empty: an empty
                                        `.gallery__run-p` still carries the row's
                                        gap and reads as a figure that failed to
                                        load. At the default this is never '' —
                                        all fourteen contestant runs are ranked
                                        and both role runs name their role — so
                                        the wall is byte-identical. */}
                                    {place && <span className="gallery__run-p">{place}</span>}
                                  </span>
                                );
                              })}
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
