/**
 * DOES THE BADGE STILL NEED POINTING AT? ALWAYS, UNTIL THIS VISIT SAYS OTHERWISE.
 *
 * WHY THIS FILE NO LONGER WRITES TO STORAGE, and it is the third round on one
 * object, so the history is the argument.
 *
 * The badge is the reader's own redaction control and it is an 11px shield in
 * the corner the eye reaches last. Round one pointed at it once per reader and
 * retired the mark on ANY route into the picker — including the cold open's own
 * link — so taking the landing page's invitation cost you the one screen that
 * says where the setting lives. Round two bumped the key to `v2` and narrowed
 * the retirement to the badge itself. That still spent the whole budget on a
 * single showing, and the owner spent theirs pressing the badge to check the
 * mark worked. From then on the atlas looked, to the person who asked for the
 * feature, exactly like the version before it existed. Twice reported, in these
 * words: "왜 자꾸 예전 버전으로 돌아가는거야?"
 *
 * The instruction is not "teach once". It is "무조건 뜨게": the mark is part of
 * what this screen SAYS, not an onboarding step to be completed and filed. A
 * reader who has watched everything is the one with no other reason to look at
 * that corner, and there is no visit on which pointing at it is wrong.
 *
 * SO THE ONLY MEMORY IS THIS TAB. Dismissing it — or opening the sheet from it —
 * puts it away for as long as the page is up, because a card that reappears
 * while you are reading under it is noise. Reload and it is back. Nothing is
 * written to localStorage, so no browser can end up permanently unable to be
 * told where its own control is, which is the state this file spent two rounds
 * creating.
 *
 * IF THIS EVER NEEDS TO BECOME PERSISTENT AGAIN, the thing to persist is not
 * "seen" — it is "this reader has used the picker from the badge at least
 * twice", which is evidence they know where it is. Do not reintroduce a
 * one-shot.
 */

/** Live for this page only. Reset by a reload, which is the point. */
let dismissedThisVisit = false;

export function hasSeenBadgeCue(): boolean {
  return dismissedThisVisit;
}

/**
 * Put the mark away for the rest of this visit. Called when the reader
 * dismisses it, and when they open the picker from the badge or from the mark
 * itself — in both cases the card has said what it had to say and is now
 * sitting over the thing it was pointing at.
 */
export function markBadgeCueSeen(): void {
  dismissedThisVisit = true;
}
