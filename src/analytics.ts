/**
 * PostHog, wired for the way this app actually navigates.
 *
 * Two decisions here are not the defaults, and both would silently produce
 * wrong numbers if they were left alone.
 *
 * 1 · PAGEVIEWS ARE HASH CHANGES. This is a single page whose entire navigation
 *     lives in the fragment — `#p=hong-jin-ho` opens a dossier, `#tie=a~b~type`
 *     pins a relationship (see useDeepLink.ts). PostHog's `capture_pageview`
 *     fires on load and on history pushes, neither of which happens here, so
 *     the default configuration reports one pageview per session no matter how
 *     much of the cast somebody reads. It is turned off and re-issued manually
 *     on `hashchange`, which is the event this app treats as a navigation.
 *
 * 2 · NO KEY IS A NO-OP, NOT A CRASH. The key arrives through the environment,
 *     so a clone with no `.env.local` — and every `npm run dev`, `npm run
 *     assert` and Playwright run — simply does not initialise. That matters
 *     beyond tidiness: tools/assert-visual.mjs asserts zero console errors and
 *     zero failed requests in thirteen states, so an analytics call firing into
 *     a dead endpoint under the harness would fail the build. It also keeps the
 *     screenshot and assertion runs out of the production funnel.
 */
import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
/** US cloud by default; EU projects need https://eu.i.posthog.com. */
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export function initAnalytics(): void {
  if (!KEY) return;

  posthog.init(KEY, {
    api_host: HOST,
    defaults: '2025-05-24',
    // See (1). The manual call is below.
    capture_pageview: false,
    /* …and this has to be said out loud BECAUSE of the line above it.
     *
     * posthog-js 1.414 defaults `capture_pageleave` to the string
     * "if_capture_pageview" — verified in node_modules/posthog-js/dist, not
     * assumed — so turning manual pageviews on silently turns page-LEAVE off.
     * PostHog's Web Analytics product computes bounce rate and session duration
     * from $pageleave, so the dashboard this project was created for would have
     * come up with those two columns quietly empty and no error anywhere. */
    capture_pageleave: true,

    /* ── everything below is about not exporting the reader's spoilers ──────
     *
     * This app is an atlas of a survival show, so almost every string on screen
     * is a result somebody may not want to know. A reader who sets the spoiler
     * control is telling us what they have not seen; shipping their screen to
     * an analytics vendor turns that setting into a lie in three ways at once.
     *
     * SESSION REPLAY transports the DOM, so it defeats a display-time redaction
     * completely — the layer renders, the frames are recorded, and the recording
     * is replayable. It also captured every text node with masking off. Off.
     *
     * AUTOCAPTURE carries up to ~1KB of a clicked element's text plus every
     * ancestor's `title` and `aria-label`. One click on a dossier relation row
     * exported two seasons of placements. Off — and note `track()` below has no
     * call sites, so the funnel loses nothing that exists today: manual
     * `$pageview` and `$pageleave` are the whole of what this project measures.
     *
     * mask_all_text stays declared and is now TRUE, kept as belt-and-braces for
     * whoever turns replay back on in the PostHog project UI, which is a
     * setting this file cannot see or override. */
    disable_session_recording: true,
    mask_all_text: true,
    autocapture: false,

    /* The fragment IS the navigation here — `#p=hong-jin-ho`, `#tie=a~b`, and
       `#q=` carries whatever was typed into the search box. Sent as
       `$current_url` it becomes a per-event log of which people a reader
       opened, which is the same disclosure by another route. The path is what
       the funnel needs; the fragment is not. */
    sanitize_properties: (props) => {
      const strip = (v: unknown): unknown =>
        typeof v === 'string' && v.includes('#') ? v.slice(0, v.indexOf('#')) : v;
      return { ...props, $current_url: strip(props.$current_url), $referrer: strip(props.$referrer) };
    },
  });

  const page = () => posthog.capture('$pageview');
  page();
  window.addEventListener('hashchange', page);
}

/** Named events, so the funnel is about the atlas rather than about clicks.
 *  Deliberately thin — anything richer belongs in the component that knows it. */
export const track = (event: string, props?: Record<string, unknown>): void => {
  if (!KEY) return;
  posthog.capture(event, props);
};
