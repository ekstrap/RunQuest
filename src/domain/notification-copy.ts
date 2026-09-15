/**
 * Notification copy — the exact strings §3.21.1d locks, in one place.
 *
 * Copy is where a predatory notification would actually enter the product: the
 * scheduling rules can be impeccable and a single word ("still haven't") turns
 * an invitation into a tug. Keeping every string here, as data, means a change
 * to what the user is told is a visible diff in one small file rather than a
 * string literal buried in an adapter.
 *
 * Three rules govern all of it:
 *  1. **Never name what the user missed** — no gap counts, no "you haven't", no
 *     "catch up". Nothing here may be parameterised by anything that measures
 *     absence, which is why the only input below is the prescribed duration.
 *  2. **The reminder states the prescribed duration.** Safe to bake into a
 *     pre-scheduled notification because calibration only changes *between*
 *     weeks and anchor days are fixed at week start, so the number is stable for
 *     the whole week a reminder is scheduled in.
 *  3. **No emoji** in v1.
 */

/** A rendered notification: what actually appears on the lock screen. */
export interface NotificationCopy {
  title: string;
  body: string;
}

/**
 * The three `session-invitation` variants, rotated (§3.21.1d). Three rather than
 * one because this is the only frequent kind, and a single fixed string becomes
 * wallpaper within a fortnight — which is how a reminder stops being read at all.
 * Each is an offer with no obligation attached.
 */
const SESSION_INVITATION_VARIANTS: ((durationMinutes: number) => NotificationCopy)[] = [
  (minutes) => ({
    title: 'Ready when you are',
    body: `Today's session is ${minutes} minutes.`,
  }),
  (minutes) => ({
    title: `A good day for ${minutes} minutes`,
    body: 'It’s here whenever it suits you.',
  }),
  (minutes) => ({
    title: `${minutes} minutes, no rush`,
    body: 'Your session is waiting.',
  }),
];

/** How many invitation variants exist — the rotation's modulus. */
export const SESSION_INVITATION_VARIANT_COUNT = SESSION_INVITATION_VARIANTS.length;

/**
 * One invitation, picked by rotation index (any integer; wrapped). The caller
 * derives the index from the week and the anchor's position in it, so the
 * rotation is deterministic — the same plan re-computed after a restart renders
 * identical text, and cancel-and-reschedule never silently rewords a pending
 * notification.
 */
export function sessionInvitationCopy(
  durationMinutes: number,
  rotation: number,
): NotificationCopy {
  const index =
    ((rotation % SESSION_INVITATION_VARIANT_COUNT) + SESSION_INVITATION_VARIANT_COUNT) %
    SESSION_INVITATION_VARIANT_COUNT;
  return SESSION_INVITATION_VARIANTS[index](durationMinutes);
}

/**
 * The `still-here` string. **One string, no variants** (§3.21.1d): variants
 * invite small edits over time and each edit is a chance to add a tug. One fixed
 * string is easier to protect. Warmth, and no ask.
 */
export const STILL_HERE_COPY: NotificationCopy = {
  title: 'Your runs are here',
  body: 'Whenever you want them. Start wherever you like.',
};
