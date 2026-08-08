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
    /* The one input on this surface is the command palette's search box, and
       what a reader types into it is a person's name. Autocapture already masks
       input VALUES, but this is the setting that is easy to turn on later
       without thinking about it, so it is stated rather than left defaulted. */
    mask_all_text: false,
    autocapture: true,
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
