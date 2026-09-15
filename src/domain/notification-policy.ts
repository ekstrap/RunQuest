/**
 * Notification policy engine — decides *what is eligible*, never what is sent
 * (PRD §"Architecture & seams": OS scheduling/delivery is a separate thin
 * adapter). Pure and clock-injected: every decision is a function of
 * the user's stored state plus the `now` the caller passes in, so the whole
 * policy is testable without a device, a network, or a real timer.
 *
 * It encodes the §3.21.1 taxonomy (reminders / re-engagement) and the §3.18
 * hard rule that forbids **predatory notifications** — anything whose
 * purpose is loss aversion. That rule holds *structurally* here, not by
 * vigilance:
 *
 *  - the kinds this module can emit are a closed union, each permanently mapped
 *    to an allowed framing (invitation / warmth) in
 *    {@link NOTIFICATION_CATALOGUE};
 *  - an eligible notification has no urgency, deadline, expiry, or countdown
 *    field for a caller to render, so "your streak ends in 4 hours" is not
 *    expressible;
 *  - nothing in here reads how much of the week is left. Eligibility on Sunday
 *    night is identical to Monday morning, so the week running out can never
 *    escalate what the user is told.
 *
 * Scheduling and the exact copy live next door in `notification-schedule.ts`
 * and `notification-copy.ts`; this module answers only *what is eligible*. The §3.21.1c frequency caps hold here **structurally rather than by
 * bookkeeping**: re-engagement is eligible on exactly two quiet-week milestones
 * (2 and 4), and a milestone is a property of when the user last ran, so a cap
 * cannot be miscounted, double-spent, or lost with the device's storage. Nothing
 * has to remember what was already sent.
 */

import type {
  NotificationCategory,
  NotificationSettings,
  SessionRecord,
  WeeklyCommitment,
} from './types';
import { startOfDay, startOfWeek, weekProgress } from './week';

// Weeks are anchored via startOfWeek, so a fixed 7-day span is fine; the DST
// hour drift never reaches a whole week (same acceptable v1 edge as streak.ts).
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Weeks of silence after which a user counts as *quiet* — past this they get
 * warmth instead of invitations, the notification counterpart of the streak
 * tiers in §3.8 ('resting' → 'miss-you' → 'archived'). Quietness is measured
 * from the user's **last session**, not from missed weekly commitments: someone
 * who never quite completed a week can still go quiet, and they are exactly the
 * newcomer this product exists for.
 */
export const QUIET_WEEKS_BEFORE_CHECK_IN = 2;

/**
 * The only two moments a warm check-in may go out: **two** messages per quiet
 * period, at 2 and at 4 quiet weeks, then silence (§3.21.1c). Capped by total
 * count rather than by rate because this is the most dangerous category — the
 * superseded rule (one a week from week 2 to week 6) permitted four, and four
 * "we miss you" messages is a tug, not warmth.
 *
 * Because eligibility is a function of *which* quiet week it is, a fresh run
 * resets the period simply by moving the user's last session — there is no
 * counter to reset and none to get out of step with reality.
 */
export const RE_ENGAGEMENT_QUIET_WEEKS: readonly number[] = [2, 4];

/**
 * Everything the policy may emit. A closed union on purpose: adding a kind is a
 * deliberate act that has to declare its framing below, which is where a
 * loss-aversion idea would have to announce itself and be rejected.
 *
 * Celebration kinds ('week-complete', 'level-up', 'lifetime-milestone') were cut
 * in v1: each of them fires off a finished session, and a session is only
 * recorded with the app open, so the push would say on the lock screen what the
 * post-run summary is already saying on screen. Celebrations are in-app only.
 */
export type NotificationKind = 'session-invitation' | 'still-here';

/**
 * How a notification relates to the user — the §3.21 governing test made
 * explicit: *inviting them to a win they choose, or simply being warm*. There is
 * deliberately no framing for "tugging on a fear".
 */
export type NotificationFraming = 'invitation' | 'warmth';

/**
 * The permanent category and framing of every kind, in one table so a new kind
 * cannot be added without declaring both.
 */
export const NOTIFICATION_CATALOGUE: Record<
  NotificationKind,
  { category: NotificationCategory; framing: NotificationFraming }
> = {
  'session-invitation': { category: 'reminder', framing: 'invitation' },
  'still-here': { category: 're-engagement', framing: 'warmth' },
};

/** One notification the user is eligible to receive. Carries no urgency. */
export interface EligibleNotification {
  category: NotificationCategory;
  kind: NotificationKind;
  framing: NotificationFraming;
}

/**
 * The user state the policy reads. Note what is absent: progression (XP/level)
 * is not here, because nothing the policy can emit depends on it — that was the
 * celebration branch's input, and celebrations are in-app only now. Nor is there
 * a record of what was already sent, because the caps are structural (see
 * {@link RE_ENGAGEMENT_QUIET_WEEKS}).
 */
export interface NotificationPolicyState {
  settings: NotificationSettings;
  sessions: SessionRecord[];
  commitment: WeeklyCommitment;
}

function notification(kind: NotificationKind): EligibleNotification {
  return { ...NOTIFICATION_CATALOGUE[kind], kind };
}

/**
 * Whole weeks between the user's most recent session and `now`, or null when
 * they have never run — a user with no history yet is *new*, not quiet, and gets
 * invitations rather than a "we miss you".
 */
export function weeksSinceLastSession(sessions: SessionRecord[], now: number): number | null {
  if (sessions.length === 0) {
    return null;
  }
  const latest = Math.max(...sessions.map((session) => session.startedAt));
  // Round absorbs DST-induced hour drift between week starts.
  return Math.round((startOfWeek(now) - startOfWeek(latest)) / WEEK_MS);
}

/** True once the user has been quiet long enough to get warmth, not invitations. */
export function hasGoneQuiet(quietWeeks: number | null): boolean {
  return quietWeeks !== null && quietWeeks >= QUIET_WEEKS_BEFORE_CHECK_IN;
}

/** True on exactly the quiet weeks a warm check-in is allowed (§3.21.1c). */
export function isReEngagementWeek(quietWeeks: number): boolean {
  return RE_ENGAGEMENT_QUIET_WEEKS.includes(quietWeeks);
}

/**
 * The notifications this user is eligible for as of `now`.
 *
 * Reminders and re-engagement are mutually exclusive by construction: a user
 * who is still moving gets invitations; one who has gone quiet gets warmth
 * instead; and once they have been quiet long enough, nothing at all — we don't
 * chase people (§3.8's 'archived' tier, in notification form).
 */
export function eligibleNotifications(
  state: NotificationPolicyState,
  now: number,
): EligibleNotification[] {
  const { settings, sessions, commitment } = state;

  // No permission, no notifications. Our own pre-prompt is not consent to send —
  // only the OS's answer is (§3.21.2).
  if (settings.osPermission !== 'granted') {
    return [];
  }

  const enabled = (category: NotificationCategory) => settings.categories[category];
  const eligible: EligibleNotification[] = [];

  const week = weekProgress(sessions, commitment, now);
  const quietWeeks = weeksSinceLastSession(sessions, now);
  const goneQuiet = hasGoneQuiet(quietWeeks);

  // ---- reminders: an open week is an opportunity, never a debt ----
  const ranToday = sessions.some((s) => startOfDay(s.startedAt) === startOfDay(now));
  if (enabled('reminder') && !goneQuiet && !week.isComplete && !ranToday) {
    eligible.push(notification('session-invitation'));
  }

  // ---- re-engagement: the most dangerous category, so the tightest gates ----
  // Eligible on the two milestone weeks and nowhere else. Week 3, week 5, and
  // every week after are silence by construction: we don't chase people (§3.8's
  // 'archived' tier, in notification form).
  if (enabled('re-engagement') && quietWeeks !== null && isReEngagementWeek(quietWeeks)) {
    eligible.push(notification('still-here'));
  }

  return eligible;
}
