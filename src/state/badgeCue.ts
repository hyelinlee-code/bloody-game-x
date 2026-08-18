/**
 * HAS THIS READER BEEN SHOWN WHERE THE SPOILER CONTROL IS?
 *
 * WHY THIS EXISTS. The cold open asks the question, and the status bar's shield
 * badge is the answer's home — it reports what is sealed and it opens the
 * picker. But a reader who has answered once meets the badge only as an 11px
 * shield and eight characters of text, 34px tall, in the corner the eye reaches
 * last. It was reported as exactly that: a thing that looks like a stamp on the
 * page rather than a switch on it. Two earlier rounds fixed the same object by
 * making it honest — a span that looked clickable became a button, a button that
 * opened the field guide started opening the setting instead — and neither round
 * fixed the part that matters here, which is that nobody looks at it.
 *
 * So the badge gets pointed at, ONCE, and this flag is the once.
 *
 * IT IS A SEPARATE KEY FROM `bgx.watched` ON PURPOSE. The watched-set is the
 * reader's answer and the cue is our teaching, and folding them together would
 * mean a reader who clears the setting has to be taught again, or worse, that
 * dismissing a coach mark writes an exposure decision. Two facts, two keys.
 *
 * A STORAGE EXCEPTION READS AS "ALREADY SEEN", which is the same direction
 * `hasStoredAnswer` fails and for the same reason: in private mode nothing we
 * write survives, so the alternative is a coach mark on every navigation
 * forever. Over-teaching is annoying in a way that compounds; under-teaching
 * costs a reader one hover over a badge that carries a tooltip anyway.
 */
/**
 * VERSIONED, AND THE SUFFIX IS LOAD-BEARING. A reader who dismissed the first
 * cue dismissed a different object: it was retired by ANY route into the
 * picker, including the cold open's own link, so half the people carrying this
 * key were marked as taught by a screen that never taught them. `v2` is the
 * cue that is retired only by the badge itself. Bump it again if what the mark
 * claims changes; do not bump it to re-nag about the same claim.
 */
const KEY = 'bgx.cue.badge.v2';

export function hasSeenBadgeCue(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true;
  }
}

/**
 * Called when the cue has done its job — and its job is narrower than "the
 * reader has seen the picker".
 *
 * THE CLAIM IS A LOCATION: the setting lives in the badge, bottom right. So it
 * is retired by the routes that TEACH that location — pressing the badge, or
 * pressing the cue's own button — and not by the cold open's link, which opens
 * the same sheet from a screen the badge is not on. The first version retired
 * on any open at all, which meant a reader who took the landing page's own
 * invitation was marked as taught and never saw the mark. That is the bug the
 * `v2` key above exists to undo.
 */
export function markBadgeCueSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* nothing to do: `hasSeenBadgeCue` fails the same way and reads as seen. */
  }
}
