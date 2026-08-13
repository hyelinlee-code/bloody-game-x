import type { JSX } from 'react';
import { t, type Lang } from '../data/i18n';
import './Credit.css';

/**
 * Who made this, and how to reach them.
 *
 * An atlas that argues this hard about provenance — 309 citations, a validator
 * that fails the build when the sourcing paragraph drifts from the histogram —
 * and then does not say who wrote it is missing the first citation. This is that
 * line.
 *
 * ── why it sits in the status bar and not in a banner strip ──────────────────
 * The obvious reading of "a banner at the bottom" is a full-width strip. That
 * costs the graph ~40px of height at every viewport, permanently, and the
 * camera's uncovered rect is already the tightest constraint in the app — the
 * phone build fills 40.4% of its available height as it is. A strip would take
 * that below 37% to carry a line nobody needs twice.
 *
 * So it rides the status bar, which is already the app's bottom rule and already
 * carries the "who/what/when" register: the ledger on the left, the hint in the
 * middle, the spoiler badge and the updated date on the right. A byline belongs
 * in that company. Below 900px it drops to the mark alone — see Credit.css.
 *
 * ── the links are the point, so they are real links ──────────────────────────
 * `rel="me"` is what a personal site's `rel="me"` verification wants on the
 * other end, so the three of them corroborate each other rather than being three
 * loose URLs. `noopener` is not optional on a canvas app: an opened tab with
 * `window.opener` can navigate this one, and this one holds a reader's watched
 * set and their place in a graph.
 */

export interface CreditProps {
  lang: Lang;
}

export interface Link {
  href: string;
  label: string;
  /** 16×16, drawn on a 16-unit grid to sit on the status bar's baseline. */
  path: JSX.Element;
}

/**
 * EXPORTED because the About sheet's colophon draws the same row.
 *
 * Three URLs written down twice is three URLs that drift, and the pair that
 * drifts silently is the worst one: a stale `rel` or a missing `noopener` on
 * one copy looks exactly like the other copy at a glance. The sheet imports
 * this array and reads `href`, `label` and `path` off it; it sets its own
 * icon size and its own `aria-label` suffix, because a 13px mark on a status
 * bar and an 18px mark in a modal are not the same object.
 *
 * `rel="me noopener noreferrer"` is applied at each call site rather than
 * stored here, because it is a property of the anchor and not of the
 * destination — see the note above about what an opened tab can do to this one.
 */
export const LINKS: Link[] = [
  {
    href: 'https://www.hyelin-lee.com/',
    label: 'hyelin-lee.com',
    /* A globe rather than a house: the row is three destinations and the other
       two are marks, so this one has to read as "the site" at 13px without
       borrowing either of their shapes. */
    path: (
      <>
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <ellipse cx="8" cy="8" rx="2.7" ry="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1.9 6h12.2M1.9 10h12.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: 'https://x.com/HyelinLeeHere',
    label: 'X',
    path: (
      <path
        d="M2.2 2.2h3.5l3.2 4.3 3.7-4.3h1.6l-4.6 5.3 4.9 6.3h-3.5l-3.4-4.6-4 4.6H1.9l4.9-5.6z"
        fill="currentColor"
      />
    ),
  },
  {
    href: 'https://www.linkedin.com/in/hyelinlee09/',
    label: 'LinkedIn',
    path: (
      <>
        <rect x="1.4" y="1.4" width="13.2" height="13.2" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="4.7" cy="4.9" r="1.05" fill="currentColor" />
        <path d="M4.7 7v5.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M7.6 12.1V7m0 1.5c.35-1 1.2-1.6 2.2-1.6 1.35 0 2.1.85 2.1 2.4v3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

export function Credit({ lang }: CreditProps): JSX.Element {
  return (
    <div className="credit">
      {/* The sentence is one string per language rather than a name slotted into
          a template: Korean puts the maker after the thing and English puts them
          after "by", so a shared template would have produced one natural line
          and one translated-sounding one. */}
      <span className="credit__by">{t(lang, 'credit.by')}</span>
      <span className="credit__invite">
        <span aria-hidden="true">{'·'}</span> {t(lang, 'credit.invite')}
      </span>
      <span className="credit__links">
        {LINKS.map((l) => (
          <a
            key={l.href}
            className="credit__link"
            href={l.href}
            target="_blank"
            rel="me noopener noreferrer"
            /* The visible mark is an icon, so the accessible name has to carry
               both the destination and whose it is — "X" alone tells a screen
               reader nothing about where it goes. */
            aria-label={`${t(lang, 'credit.linkPrefix')} ${l.label}`}
            title={l.label}
          >
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
              {l.path}
            </svg>
          </a>
        ))}
      </span>
    </div>
  );
}
