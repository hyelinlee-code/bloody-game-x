import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, UIEvent } from 'react';
import { createPortal } from 'react-dom';
import { ALL_WORK_IDS, WATCHED_NONE, WORKS } from '../data/works';
import type { WorkId } from '../data/works';
import { t, ui } from '../data/i18n';
import type { Lang, UiKey } from '../data/i18n';
import { useLang } from '../state/useLang';
import { useWatched, WATCHED_ALL } from '../state/useWatched';
import './WatchedPicker.css';

/**
 * THE CONTROL. One question — "what have you watched?" — and fourteen answers.
 *
 * WHY THE QUESTION IS SHAPED THIS WAY. It is never "how spoiled do you want to
 * be", because the reader knows their own viewing history and does not know
 * which of this app's fields are dangerous. Ranks, field sizes, elimination
 * episodes, prize reconciliation, arrowhead direction, disc radius, arc length
 * — the danger mapping is ours, and `works.ts` plus the scope tags are where we
 * did it. The control takes the input the reader actually has.
 * PLAN-spoilers.md §1.
 *
 * WHAT IT IS NOT. It is not a filter. Every other control in this app narrows
 * what is on the canvas; this one narrows what the app is willing to SAY about
 * what is on the canvas. Nobody leaves the graph when a work is unticked —
 * twenty people, five blocs and every line stay exactly where they were. That
 * distinction is why the picker is its own sheet rather than a section of the
 * filter rail, and why the copy in the footer states both halves: a control
 * that only says what it takes away reads as a punishment.
 *
 * REUSE, NOT A SECOND REGISTRY. The rows are `WORKS` and the order is
 * `ALL_WORK_IDS`; the sections below are a presentation of that registry and
 * are built so a work cannot fall out of them (see `SECTIONS`). Nothing here
 * decides what a work is or what it protects — `works.ts` owns the first and
 * the scope tags own the second.
 */

export interface WatchedPickerProps {
  open: boolean;
  /** Every close path commits first — see `close()`. */
  onClose: () => void;
  /**
   * The field guide. The badge that used to open it is now this sheet's own
   * entry point, so the route to the long-form scope note has to continue from
   * here or it is a destination the product stopped naming.
   */
  onOpenAbout: () => void;
}

/** One heading and the ids under it. */
interface Section {
  key: UiKey;
  footKey?: UiKey;
  ids: WorkId[];
}

/**
 * The registry, grouped the way the registry groups itself.
 *
 * THE LAST SECTION IS A COMPLEMENT, NOT A LIST, and that is the whole safety
 * property: `rest` is every id the three named sections did not claim, so a
 * work added to `WORKS` tomorrow appears in this sheet tomorrow. Written as a
 * fourth hand-kept array it would instead go missing — and a work that is in
 * the registry, carries scopes, seals claims, and cannot be ticked is a claim
 * sealed permanently against every reader. works.ts calls that a hole rather
 * than a protection, and it is the failure mode this shape rules out.
 *
 * The franchise section is `kind === 'franchise'` rather than
 * `group === 'bloody-game'` because `kind` is the axis works.ts declares — the
 * ladder is ordinal and everything else is a checklist — while `group` is a
 * presentation slug that works.ts explicitly warns is not a scope.
 */
const SECTIONS: Section[] = (() => {
  const franchise = ALL_WORK_IDS.filter((id) => WORKS[id].kind === 'franchise');
  const inGroup = (g: string) => ALL_WORK_IDS.filter((id) => (WORKS[id] as { group?: string }).group === g);
  const genius = inGroup('genius');
  const claimed = new Set<WorkId>([...franchise, ...genius]);
  const rest = ALL_WORK_IDS.filter((id) => !claimed.has(id));
  const all: Section[] = [
    { key: 'watched.groupFranchise', footKey: 'watched.groupFranchiseFoot', ids: [...franchise] },
    { key: 'watched.groupGenius', ids: [...genius] },
    { key: 'watched.groupRest', footKey: 'watched.groupRestFoot', ids: [...rest] },
  ];
  return all.filter((s) => s.ids.length > 0);
})();

/** `{n}` substitution, the table's own idiom. */
function say(lang: Lang, key: UiKey, n: number): string {
  return t(lang, key).replace('{n}', String(n));
}

/**
 * A Korean line with its Latin gloss, one key read twice so the pair cannot
 * drift. In the English UI the gloss would print the same words again, so it
 * drops out. The house pattern — Gallery, FilterRail, StatusBar all carry it.
 */
function Gloss({ k, lang, className }: { k: UiKey; lang: Lang; className: string }): JSX.Element | null {
  if (lang === 'en') return null;
  return (
    <span className={className} lang="en">
      {ui.en[k]}
    </span>
  );
}

/** All / none for one section, on the filter rail's own two words. */
function SectionBulk(props: {
  lang: Lang;
  allOn: boolean;
  allOff: boolean;
  heading: string;
  onAll: () => void;
  onNone: () => void;
}): JSX.Element {
  const { lang, heading } = props;
  /* Korean puts the object before the verb, English after it — the rail's
     `Bulk` makes the same join for the same reason. The heading is in the
     label so twelve identical "All" buttons are twelve distinct announcements. */
  const phrase = (verb: string) => (lang === 'ko' ? `${heading} ${verb}` : `${verb} — ${heading}`);
  return (
    <span className="wpick__bulk">
      <button
        type="button"
        className="wpick__mini"
        onClick={props.onAll}
        disabled={props.allOn}
        aria-label={phrase(t(lang, 'rail.bulkAllAria'))}
      >
        {t(lang, 'rail.bulkAll')}
      </button>
      <span className="wpick__mini-sep" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className="wpick__mini"
        onClick={props.onNone}
        disabled={props.allOff}
        aria-label={phrase(t(lang, 'rail.bulkNoneAria'))}
      >
        {t(lang, 'rail.bulkNone')}
      </button>
    </span>
  );
}

export function WatchedPicker({ open, onClose, onOpenAbout }: WatchedPickerProps): JSX.Element | null {
  const { lang } = useLang();
  /* The hook, never `currentWatched()`. This component both reads and writes
     the set; the module mirror carries no subscription, so a picker built on it
     would tick a box and not repaint. */
  const { watched, setWatched } = useWatched();
  const sheetRef = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop > 4;
    setScrolled((was) => (was === top ? was : top));
  }, []);

  const chosen = watched.size;
  const hidden = ALL_WORK_IDS.length - chosen;

  /**
   * CLOSING IS ANSWERING.
   *
   * `setWatched` is what writes storage, and storage is what
   * `hasStoredAnswer()` reads to decide whether this reader still needs to be
   * asked. A reader who opens this sheet, decides the sealed state is fine and
   * presses Escape has answered — re-asking them on the next visit would make
   * the cold open a question they cannot finish answering. Committing the
   * CURRENT set is a no-op for the set itself (identity is preserved, React
   * bails out of the re-render) and turns "never asked" into "asked, and this
   * is the answer".
   */
  const commit = useRef<() => void>(() => {});
  /* Synced in an effect rather than assigned during render: the value it
     closes over is state, the only caller is an event handler, and effects
     have all flushed by the time an event fires. `close` therefore keeps a
     stable identity, which is what stops the Escape listener below being torn
     down and re-registered on every keystroke. */
  useEffect(() => {
    commit.current = () => setWatched(watched);
  });
  const close = useCallback(() => {
    commit.current();
    onClose();
  }, [onClose]);

  /* Focus trap, Escape, and focus restored to whatever opened the sheet — the
     Gallery's pattern, because two modals in one product should not have two
     keyboard contracts. */
  useEffect(() => {
    if (!open) return;
    setScrolled(false);
    restore.current = document.activeElement as HTMLElement | null;
    const el = sheetRef.current;
    el?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
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
  }, [open, close]);

  /* A fresh Set on every write. `setWatched` documents that it keeps the
     identity it is given, because the graph and the ledger memoise on it — so
     mutating the reader's current set in place would leave every one of those
     caches holding a set whose contents had changed underneath them. */
  const toggle = useCallback(
    (id: WorkId) => {
      const next = new Set(watched);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setWatched(next);
    },
    [watched, setWatched],
  );

  const setMany = useCallback(
    (ids: readonly WorkId[], on: boolean) => {
      const next = new Set(watched);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      setWatched(next);
    },
    [watched, setWatched],
  );

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        on: s.ids.reduce((n, id) => n + (watched.has(id) ? 1 : 0), 0),
      })),
    [watched],
  );

  if (!open) return null;

  /* Whichever language the reader is in leads; the other script is the row's
     subtitle and is tagged so it keeps its own font and tracking. */
  const subLang: Lang = lang === 'en' ? 'ko' : 'en';

  return createPortal(
    <div className="wpick" role="dialog" aria-modal="true" aria-labelledby="wpick-title">
      <button
        type="button"
        className="wpick__scrim"
        aria-label={t(lang, 'watched.close')}
        onClick={close}
      />

      <div className="wpick__sheet pane" ref={sheetRef} tabIndex={-1}>
        <header className="wpick__head">
          <div className="wpick__head-l">
            <span className="eyebrow wpick__eyebrow">
              {t(lang, 'watched.eyebrow')}
              {lang === 'ko' ? (
                <>
                  {' · '}
                  <span lang="en">{ui.en['watched.eyebrow']}</span>
                </>
              ) : null}
            </span>
            <h2 id="wpick-title" className="wpick__title">
              {t(lang, 'watched.question')}
            </h2>
            <p className="wpick__lede">{t(lang, 'watched.lede')}</p>
          </div>
          <button
            type="button"
            className="wpick__close"
            onClick={close}
            aria-label={t(lang, 'watched.close')}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="wpick__ledger">
          <div className="wpick__global">
            <button
              type="button"
              className="wpick__bulk-btn"
              onClick={() => setWatched(WATCHED_ALL)}
              disabled={chosen === ALL_WORK_IDS.length}
            >
              {t(lang, 'watched.selectAll')}
            </button>
            <button
              type="button"
              className="wpick__bulk-btn"
              onClick={() => setWatched(WATCHED_NONE)}
              disabled={chosen === 0}
            >
              {t(lang, 'watched.selectNone')}
            </button>
          </div>
          {/* The live readout. Empty of any wording at rest is not an option
              here — it is also the resting label — so it is `role="status"`
              and re-announces on every tick. It states BOTH figures: what is
              open and what is sealed, in that order. */}
          <p className="wpick__count" role="status">
            <span className="wpick__count-n fig">{say(lang, 'watched.countLabel', chosen)}</span>
            <span className="wpick__count-sep" aria-hidden="true">
              ·
            </span>
            <span className={`wpick__count-hid${hidden === 0 ? ' is-clear' : ''}`}>
              {hidden === 0 ? t(lang, 'watched.hiddenNone') : say(lang, 'watched.hiddenSome', hidden)}
            </span>
          </p>
        </div>

        <div
          className="wpick__scroll scroll scroll--faded"
          data-scrolled={scrolled ? 'true' : 'false'}
          onScroll={onScroll}
        >
          {sections.map((sec) => {
            const heading = t(lang, sec.key);
            const headId = `wpick-sec-${sec.key.replace(/\./g, '-')}`;
            return (
              <section
                className="wpick__sec"
                key={sec.key}
                role="group"
                aria-labelledby={headId}
                aria-describedby={sec.footKey ? `${headId}-foot` : undefined}
              >
                <div className="wpick__sec-head">
                  <h3 className="wpick__sec-title" id={headId}>
                    {heading}
                    <span className="wpick__sec-n fig">
                      {sec.on}
                      <span className="wpick__sec-slash" aria-hidden="true">
                        /
                      </span>
                      {sec.ids.length}
                    </span>
                  </h3>
                  <SectionBulk
                    lang={lang}
                    heading={heading}
                    allOn={sec.on === sec.ids.length}
                    allOff={sec.on === 0}
                    onAll={() => setMany(sec.ids, true)}
                    onNone={() => setMany(sec.ids, false)}
                  />
                </div>

                <ul className="wpick__list">
                  {sec.ids.map((id) => {
                    const work = WORKS[id];
                    const on = watched.has(id);
                    const lead = lang === 'en' ? work.titleEn : work.titleKo;
                    const sub = lang === 'en' ? work.titleKo : work.titleEn;
                    const year = (work as { year?: string }).year;
                    return (
                      <li key={id}>
                        {/* A real checkbox inside a real label: the state is
                            announced, Space toggles it, and the accessible name
                            is the title, the other script and the year without
                            a single aria-* attribute to keep in step. The box
                            is drawn from scratch in CSS on the input itself
                            (appearance: none), not by hiding it behind a span —
                            a hidden input is how a control loses its focus ring
                            and its Windows high-contrast rendering at once. */}
                        <label className={`wpick__row${on ? ' is-on' : ''}`}>
                          <input
                            type="checkbox"
                            className="wpick__box"
                            checked={on}
                            onChange={() => toggle(id)}
                          />
                          <span className="wpick__row-text">
                            <span className="wpick__row-lead">{lead}</span>
                            <span className="wpick__row-sub" lang={subLang}>
                              {sub}
                            </span>
                          </span>
                          {year ? (
                            <span className="wpick__row-yr fig" lang="en">
                              {year}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {sec.footKey ? (
                  <p className="wpick__sec-foot" id={`${headId}-foot`}>
                    {t(lang, sec.footKey)}
                  </p>
                ) : null}
              </section>
            );
          })}

          {/* WHAT SURVIVES, AND WHAT DOES NOT — stated where the decision is
              made rather than in a field guide two clicks away. The reader is
              about to seal something and has no way of knowing what "sealed"
              costs them; this is the answer, and the `keeps` line comes first
              on purpose. */}
          <div className="wpick__legend">
            <p className="wpick__note wpick__note--keep">{t(lang, 'watched.keeps')}</p>
            <p className="wpick__note wpick__note--hide">{t(lang, 'watched.hides')}</p>
          </div>
        </div>

        <footer className="wpick__foot">
          {/* THE HONEST LIMIT, in the same breath as the control — not in a
              footnote, because the reader is deciding right here how much to
              trust it. A display layer is not deletion: every outcome in this
              app shipped to the browser as a plaintext literal and survives
              minification, and no amount of sealing on this screen touches
              that. Season X is the one hard guarantee and it is a different
              mechanism — exclusion from the dataset, asserted by the validator
              — so it is stated separately and NOT folded into the same
              sentence. PLAN-spoilers.md §6. */}
          <p className="wpick__fine">{t(lang, 'watched.limit')}</p>
          <p className="wpick__fine">{t(lang, 'watched.seasonX')}</p>
          <div className="wpick__actions">
            <button type="button" className="wpick__about" onClick={onOpenAbout}>
              {t(lang, 'topbar.about')}
              <Gloss k="topbar.about" lang={lang} className="wpick__about-sub" />
            </button>
            <button type="button" className="wpick__done" onClick={close}>
              {t(lang, 'watched.done')}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
