import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { AtlasState } from '../state/useAtlas';
import type { LayoutMode } from '../graph/types';
import { personName, t, ui } from '../data/i18n';
import type { Lang, UiKey } from '../data/i18n';
import { useLang } from '../state/useLang';
import './TopBar.css';

export interface TopBarProps {
  atlas: AtlasState;
  onOpenPalette: () => void;
  onOpenAbout: () => void;
  onOpenGallery: () => void;
  onToggleRail: () => void;
  railOpen: boolean;
  onFit: () => void;
  onModeChange: (m: LayoutMode) => void;
  /**
   * True once the cold open has left the screen.
   *
   * The bar mounts *underneath* the intro overlay, so its staggered entrance
   * has to be held until the curtain is gone or it plays where nobody can see
   * it. This used to be derived here from `document.querySelector('.intro')`
   * inside a `useState` initialiser — which runs during the first render pass,
   * before React has committed anything, so `.intro` never existed and the
   * gate was permanently open. App owns the real flag; it is passed in.
   */
  introDone: boolean;
}

export interface LayoutLabel {
  ko: string;
  en: string;
  /** The digit that switches to this layout. */
  key: string;
  /** Read it live with `t(lang, uiKey)`; `ko`/`en` are the same two strings. */
  uiKey: UiKey;
}

/**
 * One name per layout, for the whole product.
 *
 * The top bar, the command palette, the about sheet and the dossier's orbit
 * button were each carrying their own wording — `관계망` here and `연결망`
 * there for the same view — so a user who learned a mode from the nav could
 * not find it by name anywhere else. Import this instead of retyping it.
 *
 * The wording itself now lives in the string table, so the two languages of a
 * mode name cannot drift apart from the rest of the chrome either.
 */
export const LAYOUT_LABELS: Record<LayoutMode, LayoutLabel> = {
  web: { ko: ui.ko['mode.web'], en: ui.en['mode.web'], key: '1', uiKey: 'mode.web' },
  seasons: { ko: ui.ko['mode.seasons'], en: ui.en['mode.seasons'], key: '2', uiKey: 'mode.seasons' },
  archetype: {
    ko: ui.ko['mode.archetype'],
    en: ui.en['mode.archetype'],
    key: '3',
    uiKey: 'mode.archetype',
  },
  orbit: { ko: ui.ko['mode.orbit'], en: ui.en['mode.orbit'], key: '4', uiKey: 'mode.orbit' },
};

const MODE_ORDER: LayoutMode[] = ['web', 'seasons', 'archetype', 'orbit'];

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

const MOD_GLYPH = IS_MAC ? '⌘' : 'Ctrl';
const MOD_SPOKEN = IS_MAC ? 'Command' : 'Control';

const LOCK_NOTE_MS = 3200;

/**
 * A language switch names each language in its own script, never in the other
 * one: someone who can only read English has to recognise `EN`, and someone
 * who can only read Korean has to recognise `한국어`. So these two are not
 * translated strings and do not belong in the table — only the accessible
 * names (`lang.ko` / `lang.en`) are read in the current language.
 */
const LANG_CHOICES: { value: Lang; face: string; nameKey: UiKey }[] = [
  { value: 'ko', face: '한국어', nameKey: 'lang.ko' },
  { value: 'en', face: 'EN', nameKey: 'lang.en' },
];

/** Entrance: a short drop-in, staggered ~22ms per control. */
function rise(index: number, reduce: boolean, ready: boolean) {
  return {
    initial: { opacity: 0, y: -6 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 },
    transition: {
      duration: reduce ? 0 : 0.34,
      ease: EASE_OUT,
      delay: reduce || !ready ? 0 : index * 0.022,
    },
  };
}

/* ── icons: 16px, stroke 1.5, currentColor ─────────────────────────────── */

function IconSearch(): JSX.Element {
  return (
    <svg
      className="tb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10.5" cy="10.5" r="6.25" />
      <path d="M15.2 15.2 20 20" />
    </svg>
  );
}

function IconFit(): JSX.Element {
  return (
    <svg
      className="tb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 8.5V5.4A1.4 1.4 0 0 1 5.4 4H8.5" />
      <path d="M15.5 4h3.1A1.4 1.4 0 0 1 20 5.4v3.1" />
      <path d="M20 15.5v3.1a1.4 1.4 0 0 1-1.4 1.4h-3.1" />
      <path d="M8.5 20H5.4A1.4 1.4 0 0 1 4 18.6v-3.1" />
      <circle cx="12" cy="12" r="2.1" />
    </svg>
  );
}

function IconRail({ open }: { open: boolean }): JSX.Element {
  return (
    <svg
      className="tb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
      <path d="M9.75 4.5v15" />
      {open ? (
        <path d="M3.5 4.5h6.25v15H3.5z" fill="currentColor" stroke="none" opacity="0.55" />
      ) : (
        <>
          <path d="M5.6 9.2h2.2" opacity="0.75" />
          <path d="M5.6 12h2.2" opacity="0.75" />
        </>
      )}
    </svg>
  );
}

/** Four portrait plates on a wall — the cast gallery. */
function IconGallery(): JSX.Element {
  return (
    <svg
      className="tb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3.7" y="3.7" width="7.3" height="7.3" rx="2.2" />
      <rect x="13" y="3.7" width="7.3" height="7.3" rx="2.2" />
      <rect x="3.7" y="13" width="7.3" height="7.3" rx="2.2" />
      <rect x="13" y="13" width="7.3" height="7.3" rx="2.2" />
    </svg>
  );
}

function IconHelp(): JSX.Element {
  return (
    <svg
      className="tb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M9.7 9.5a2.35 2.35 0 1 1 3.2 2.2c-.6.25-.95.8-.95 1.45v.45" />
      <path d="M12 16.7h.01" strokeWidth="2" />
    </svg>
  );
}

/* ── mode glyphs ────────────────────────────────────────────────────────────
   Each one is a picture of the arrangement its mode produces, so the strip
   reads as four views rather than four anonymous buttons.

   They paint only below 640px, where the bar wraps to two rows and the mode
   strip gets a full-width line of its own (see TopBar.css). An earlier round
   used them as a REPLACEMENT for the names, because a single-row bar could not
   hold four labelled pills — and the note that shipped with it conceded that
   the fourth mark then had to be swiped to. The strip is no longer squeezed:
   at 390px each tab is 90px, so the mark and the name are both on it and the
   mark is what makes the name skimmable rather than what stands in for it. */
function ModeGlyph({ mode }: { mode: LayoutMode }): JSX.Element {
  const common = {
    className: 'tb-seg-glyph',
    viewBox: '0 0 24 24',
    width: 17,
    height: 17,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: 'false' as const,
  };
  if (mode === 'web') {
    /* a mesh: one hub, three ties */
    return (
      <svg {...common}>
        <path d="M12 12 6 6.6M12 12l6.2-3.4M12 12l-2.6 6.6" />
        <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="5.2" cy="5.6" r="2.1" />
        <circle cx="19.2" cy="8.1" r="2.1" />
        <circle cx="8.6" cy="19.4" r="2.1" />
      </svg>
    );
  }
  if (mode === 'seasons') {
    /* three blocs side by side, tallest first — the season columns */
    return (
      <svg {...common}>
        <rect x="3.2" y="6.4" width="4.6" height="12.4" rx="1.6" />
        <rect x="9.7" y="9.2" width="4.6" height="9.6" rx="1.6" />
        <rect x="16.2" y="4.2" width="4.6" height="14.6" rx="1.6" />
      </svg>
    );
  }
  if (mode === 'archetype') {
    /* grouped rings — people sorted into pens */
    return (
      <svg {...common}>
        <circle cx="7.6" cy="7.6" r="4.1" />
        <circle cx="16.6" cy="7.6" r="3.1" />
        <circle cx="7.6" cy="16.8" r="3.1" />
        <circle cx="16.6" cy="16.8" r="4.1" />
      </svg>
    );
  }
  /* orbit: one person at the centre, two rings of distance */
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5.6" />
      <circle cx="12" cy="12" r="9.4" strokeDasharray="2.6 3" />
    </svg>
  );
}

function IconGlobe(): JSX.Element {
  return (
    <svg
      className="tb-lang-globe"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.9" ry="8.5" />
      <path d="M3.9 9.2h16.2M3.9 14.8h16.2" />
    </svg>
  );
}

/**
 * The language switch.
 *
 * Two states, both named, neither hidden behind a menu: a reader who landed on
 * the wrong language has to find this without being able to read the label of
 * the thing that would open it. It is the one text control in a row of icon
 * buttons, which is what makes it findable at a glance.
 */
function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }): JSX.Element {
  const refs = useRef<Partial<Record<Lang, HTMLButtonElement | null>>>({});

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const { key } = e;
    const move =
      key === 'ArrowRight' || key === 'ArrowDown'
        ? 1
        : key === 'ArrowLeft' || key === 'ArrowUp'
          ? -1
          : key === 'Home'
            ? 0
            : key === 'End'
              ? 1
              : null;
    if (move === null) return;
    e.preventDefault();
    const at = LANG_CHOICES.findIndex((c) => c.value === lang);
    const next =
      key === 'Home'
        ? LANG_CHOICES[0]
        : key === 'End'
          ? LANG_CHOICES[LANG_CHOICES.length - 1]
          : LANG_CHOICES[(at + move + LANG_CHOICES.length) % LANG_CHOICES.length];
    setLang(next.value);
    refs.current[next.value]?.focus();
  };

  return (
    <div
      className="tb-lang"
      role="radiogroup"
      aria-label={t(lang, 'lang.toggle')}
      onKeyDown={onKeyDown}
    >
      <IconGlobe />
      {LANG_CHOICES.map((choice) => {
        const active = choice.value === lang;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            ref={(el) => {
              refs.current[choice.value] = el;
            }}
            className={`tb-lang-btn${active ? ' is-active' : ''}`}
            /* The face is always in its own script, so it always needs its own
               metrics — the parent's tracking would be wrong for one of them. */
            lang={choice.value}
            aria-label={t(lang, choice.nameKey)}
            onClick={() => setLang(choice.value)}
          >
            {choice.face}
          </button>
        );
      })}
    </div>
  );
}

/** The brand seal: a drop held inside a diamond. */
function BrandGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d="M12 1.9 22.1 12 12 22.1 1.9 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeOpacity="0.42"
      />
      <path
        d="M12 6.2c2.55 3.05 3.95 5.08 3.95 6.78a3.95 3.95 0 0 1-7.9 0c0-1.7 1.4-3.73 3.95-6.78z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ── component ─────────────────────────────────────────────────────────── */

export function TopBar({
  atlas,
  onOpenPalette,
  onOpenAbout,
  onOpenGallery,
  onToggleRail,
  railOpen,
  onFit,
  onModeChange,
  introDone,
}: TopBarProps): JSX.Element {
  const reduce = useReducedMotion() === true;
  /* `!== false` rather than a bare read: if the flag is ever not wired up, the
     chrome must appear, not hang at opacity 0 forever. */
  const ready = introDone !== false;
  const { lang, setLang } = useLang();
  const btnRefs = useRef<Partial<Record<LayoutMode, HTMLButtonElement | null>>>({});
  const segRef = useRef<HTMLDivElement | null>(null);
  /* Where the sliding indicator has to be. Measured, because the indicator is
     a sibling of the buttons rather than a child of the active one — as a
     child it painted *over* the labels it flew past and blanked them
     mid-word for the whole 280ms.

     Stored as two EDGES rather than as an origin and a width. Driving `x` and
     `width` together makes the pill a single object that is translating and
     resizing at once, which is why it mis-centres: 207ms into a Web → By
     archetype switch the pill's own midpoint sat under 'By season'. As two
     independently animated edges the leading one reaches for the destination
     first and the trailing one follows, so the pill reads as stretching to
     the tab you picked. `lead` is which edge that is. */
  const [ind, setInd] = useState<{ l: number; r: number; lead: 'left' | 'right' } | null>(null);

  const orbitReady = Boolean(atlas.selectedId);
  const selectedNode = atlas.selectedId ? atlas.graph.byId.get(atlas.selectedId) ?? null : null;
  const selectedName = selectedNode
    ? personName(selectedNode.person, lang).primary || selectedNode.label
    : null;

  /* `title` never surfaces on keyboard focus and never surfaces on touch, so
     a locked Orbit chip used to refuse silently on two of three input paths.
     Say why, in the bar, in a live region. */
  const [lockNote, setLockNote] = useState(false);

  useEffect(() => {
    if (!lockNote) return;
    const t = window.setTimeout(() => setLockNote(false), LOCK_NOTE_MS);
    return () => window.clearTimeout(t);
  }, [lockNote]);

  useEffect(() => {
    if (orbitReady) setLockNote(false);
  }, [orbitReady]);

  /* Remeasure whenever the geometry can change: the active mode, the language
     (the pills are a different width in each), and any resize — including the
     640px collapse to glyphs, which changes every button's width at once. */
  useLayoutEffect(() => {
    const seg = segRef.current;
    if (!seg) return;
    const measure = () => {
      const btn = btnRefs.current[atlas.mode];
      if (!btn) return;
      /* Rect maths rather than offsetLeft: the indicator's containing block is
         the strip's padding box, and offsetLeft's relationship to the border
         is not worth relying on for a 1px seam. */
      const segBox = seg.getBoundingClientRect();
      const style = getComputedStyle(seg);
      const bl = Number.parseFloat(style.borderLeftWidth) || 0;
      const br = Number.parseFloat(style.borderRightWidth) || 0;
      const box = btn.getBoundingClientRect();
      const l = box.left - segBox.left - bl;
      const r = segBox.right - box.right - br;
      setInd((prev) => {
        if (prev && Math.abs(prev.l - l) < 0.5 && Math.abs(prev.r - r) < 0.5) return prev;
        const lead: 'left' | 'right' = !prev || l > prev.l + 0.5 ? 'right' : l < prev.l - 0.5 ? 'left' : prev.lead;
        return { l, r, lead };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(seg);
    for (const m of MODE_ORDER) {
      const btn = btnRefs.current[m];
      if (btn) observer.observe(btn);
    }
    return () => observer.disconnect();
  }, [atlas.mode, lang, orbitReady]);

  const query = atlas.query.trim();
  const matchCount = atlas.matches.length;

  const isLocked = useCallback((m: LayoutMode) => m === 'orbit' && !orbitReady, [orbitReady]);

  const onSegKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const { key } = e;
      const step =
        key === 'ArrowRight' || key === 'ArrowDown'
          ? 1
          : key === 'ArrowLeft' || key === 'ArrowUp'
            ? -1
            : 0;
      if (step === 0 && key !== 'Home' && key !== 'End') return;

      /* Arrow keys walk the options that are actually available. */
      const reachable = MODE_ORDER.filter((m) => !isLocked(m));
      if (reachable.length === 0) return;
      e.preventDefault();

      const at = reachable.indexOf(atlas.mode);
      const from = at < 0 ? 0 : at;
      const next =
        key === 'Home'
          ? reachable[0]
          : key === 'End'
            ? reachable[reachable.length - 1]
            : reachable[(from + step + reachable.length) % reachable.length];

      onModeChange(next);
      btnRefs.current[next]?.focus();
    },
    [atlas.mode, isLocked, onModeChange],
  );

  const orbitLock = t(lang, 'topbar.orbitLocked');

  /* Korean glues a counter to its unit (일치 3명); English counts first and
     spaces (3 matches). Same two keys, assembled per language.

     Both halves read a singular/plural pair rather than the plural alone. The
     Korean counter does not inflect, so 명 is 명 either way; English is why the
     pair exists, and reading only the plural half spoke "1 matches" — on a
     label that is never seen, only heard. */
  const matchWord = t(lang, matchCount === 1 ? 'topbar.searchAriaMatch' : 'topbar.searchAriaMatches');
  const matchUnit = t(lang, matchCount === 1 ? 'common.person' : 'common.people');
  const matchPhrase =
    lang === 'ko'
      ? `${t(lang, 'topbar.searchAriaQuery')} ${query}, ${matchWord} ${matchCount}${matchUnit}`
      : `${t(lang, 'topbar.searchAriaQuery')} ${query}, ${matchCount} ${matchWord}`;

  const searchLabel = `${query ? `${matchPhrase} — ` : ''}${t(lang, 'topbar.searchAria')} (${MOD_SPOKEN}+K)`;

  /* The wordmark ends on an X in both languages and that X is the mark, so it
     is split off and coloured rather than typed twice. */
  const title = t(lang, 'app.title');
  const titleStem = title.endsWith('X') ? title.slice(0, -1) : title;
  const titleX = title.endsWith('X') ? 'X' : '';

  return (
    <header className={`topbar${ready ? ' is-ready' : ''}${lang === 'en' ? ' latin-run' : ''}`}>
      <div className="tb-scrim" aria-hidden="true" />

      {/* ── left: wordmark ──────────────────────────────────────────────
          The spoiler-free promise is stated once, quietly, in the status
          bar. It used to be stated twice — a filled crimson pill here and
          an outlined brass one down there — and the two of them were the
          loudest objects in a frame whose subject is the graph. */}
      <motion.div className="tb-brand" {...rise(0, reduce, ready)}>
        <span className="tb-glyph" aria-hidden="true">
          <BrandGlyph />
        </span>

        <div className="tb-lockup">
          <h1 className="tb-title">
            {titleStem}
            {titleX ? <span className="tb-x latin">{titleX}</span> : null}
          </h1>
          <span className="eyebrow tb-eyebrow" lang="en">
            {t(lang, 'app.subtitle')}
          </span>
        </div>
      </motion.div>

      {/* ── centre: layout mode ─────────────────────────────────────── */}
      <motion.div className="tb-modes" {...rise(1, reduce, ready)}>
        {/* The scroller is its own box so that the lock note — which hangs
            below the strip — is not a child of an `overflow-x: auto` element
            and clipped away on the one form factor that cannot show a
            `title`. */}
        <div className="tb-seg-scroll">
        <div
          className="tb-seg"
          ref={segRef}
          role="radiogroup"
          aria-label={t(lang, 'topbar.modeGroupLabel')}
          onKeyDown={onSegKeyDown}
        >
          {/* One indicator for the whole strip, a sibling of the buttons and
              painted beneath them. It used to be rendered inside the active
              button, so during its flight it was an opaque pill drawn on top
              of every label it crossed — "By season" read as "…son" for a
              quarter of a second on every switch. */}
          {ind ? (
            <motion.span
              className="tb-seg-ind"
              aria-hidden="true"
              initial={false}
              animate={{ left: ind.l, right: ind.r }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      /* The edge travelling into the destination arrives
                         first; the other one closes up behind it.

                         Both on --ease-out, and deliberately NOT on the
                         overshoot curve even though this is the app's most
                         obvious "something was actuated" movement. These are
                         `left`/`right` insets measured against the strip's
                         padding box: a 1.56 overshoot on a ~90px hop is ~9px
                         PAST the destination, and on the outermost tab that
                         is 9px of pill hanging outside a glass strip that
                         cannot clip it (`overflow: hidden` here would eat the
                         buttons' focus rings, which sit at outline-offset 2).
                         The spring is spent on the button's own press instead,
                         where the transform is bounded — see .tb-seg-btn in
                         TopBar.css. */
                      left: { duration: ind.lead === 'left' ? 0.22 : 0.32, ease: EASE_OUT },
                      right: { duration: ind.lead === 'right' ? 0.22 : 0.32, ease: EASE_OUT },
                    }
              }
            />
          ) : null}

          {MODE_ORDER.map((mode) => {
            const m = LAYOUT_LABELS[mode];
            const label = t(lang, m.uiKey);
            const active = atlas.mode === mode;
            const locked = isLocked(mode);
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                aria-disabled={locked}
                tabIndex={active ? 0 : -1}
                ref={(el) => {
                  btnRefs.current[mode] = el;
                }}
                className={`tb-seg-btn${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
                title={
                  locked
                    ? orbitLock
                    : `${label}${
                        mode === 'orbit' && selectedName ? ` — ${selectedName}` : ''
                      } (${m.key})`
                }
                aria-label={
                  locked
                    ? `${label}, ${t(lang, 'topbar.orbitLockedAria')}`
                    : `${label} ${t(lang, 'topbar.layoutShortcutAria')} ${m.key}`
                }
                onClick={() => {
                  if (locked) setLockNote(true);
                  else onModeChange(mode);
                }}
              >
                {/* The glyph only paints below 640px, where the names do not
                    fit; above it the names are the control. */}
                <ModeGlyph mode={mode} />
                {/* The Latin gloss exists to translate the Korean line. In
                    English the line is already the Latin, so a gloss there
                    would just print the same word twice. */}
                <span className="tb-seg-label">
                  <span className="tb-seg-line">{label}</span>
                  {lang === 'ko' ? (
                    <span className="tb-seg-gloss" lang="en">
                      {ui.en[m.uiKey]}
                    </span>
                  ) : null}
                </span>
                {/* One fixed box, one glyph, both states.

                    Orbit's unavailable state used to be a padlock. A padlock in
                    a top navigation is the near-universal idiom for gated
                    content — "not for you" — where the actual condition is
                    "pick a person first", and nothing in the mark said so. It
                    is the same keycap as every other mode now, stepped back and
                    outlined in a dashed rule: the app's own "not yet" language,
                    the one it already draws around a franchise newcomer's node.
                    Clicking it says why, in the bar, in a live region. */}
                <span className="tb-seg-slot" aria-hidden="true">
                  <span className="tb-seg-key mono tnum">{m.key}</span>
                </span>
              </button>
            );
          })}
        </div>
        </div>

        {/* Live region: empty at rest, so writing into it is what announces. */}
        <p className={`tb-lock-note${lockNote ? ' is-on' : ''}`} role="status">
          {lockNote ? (
            <>
              <span className="tb-lock-note-line">{orbitLock}</span>
              {lang === 'ko' ? (
                <span className="tb-lock-note-gloss" lang="en">
                  {ui.en['topbar.orbitLocked']}
                </span>
              ) : null}
            </>
          ) : null}
        </p>
      </motion.div>

      {/* ── right: search + view controls ───────────────────────────── */}
      <div className="tb-actions">
        <motion.button
          type="button"
          className={`tb-search${query ? ' is-active' : ''}`}
          onClick={onOpenPalette}
          title={`${t(lang, 'topbar.searchTitle')} (${MOD_GLYPH}${IS_MAC ? '' : ' '}K)`}
          aria-label={searchLabel}
          {...rise(2, reduce, ready)}
        >
          <IconSearch />
          <span className="tb-search-text">{query || t(lang, 'topbar.searchPlaceholder')}</span>
          {query ? (
            <span className="tb-search-count fig" aria-hidden="true">
              {matchCount}
            </span>
          ) : null}
          <kbd className="tb-kbd mono" aria-hidden="true">
            {MOD_GLYPH}
            {IS_MAC ? '' : ' '}K
          </kbd>
        </motion.button>

        <span className="tb-divider" aria-hidden="true" />

        {/* The language switch sits at the head of the control group, ahead of
            the icons: it is the one control a reader in the wrong language has
            to find before they can use anything else. */}
        <motion.div className="tb-lang-wrap" {...rise(3, reduce, ready)}>
          <LangSwitch lang={lang} setLang={setLang} />
        </motion.div>

        <span className="tb-divider" aria-hidden="true" />

        <motion.button
          type="button"
          className="tb-btn"
          onClick={onFit}
          title={`${t(lang, 'topbar.fit')} (F)`}
          aria-label={t(lang, 'topbar.fitAria')}
          {...rise(4, reduce, ready)}
        >
          <IconFit />
        </motion.button>

        <motion.button
          type="button"
          className="tb-btn"
          onClick={onToggleRail}
          aria-pressed={railOpen}
          title={`${t(lang, 'topbar.filters')} ([)`}
          aria-label={t(lang, 'topbar.filtersAria')}
          {...rise(5, reduce, ready)}
        >
          <IconRail open={railOpen} />
        </motion.button>

        <motion.button
          type="button"
          className="tb-btn"
          onClick={onOpenGallery}
          title={`${t(lang, 'topbar.gallery')} (G)`}
          aria-label={t(lang, 'topbar.galleryAria')}
          {...rise(6, reduce, ready)}
        >
          <IconGallery />
        </motion.button>

        <motion.button
          type="button"
          className="tb-btn"
          onClick={onOpenAbout}
          title={`${t(lang, 'topbar.about')} (?)`}
          aria-label={t(lang, 'topbar.aboutAria')}
          {...rise(7, reduce, ready)}
        >
          <IconHelp />
        </motion.button>
      </div>
    </header>
  );
}
