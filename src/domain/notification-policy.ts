/**
 * Notification policy engine — decides *what is eligible*, never what is sent
 * (PRD §"Architecture & seams": OS scheduling/delivery is a separate thin
 * adapter, issue #13). Pure and clock-injected: every decision is a function of
 * the user's stored state plus the `now` the caller passes in, so the whole
 * policy is testable without a device, a network, or a real timer.
 *
 * It encodes the §3.21.1 taxonomy (reminders / celebrations / re-engagement) and
 * the §3.18 hard rule that forbids **predatory notifications** — anything whose
 * purpose is loss aversion. That rule holds *structurally* here, not by
 * vigilance:
 *
 *  - the kinds this module can emit are a closed union, each permanently mapped
 *    to an allowed framing (invitation / shared-win / warmth) in
 *    {@link NOTIFICATION_CATALOGUE};
 *  - an eligible notification has no urgency, deadline, expiry, or countdown
 *    field for a caller to render, so "your streak ends in 4 hours" is not
 *    expressible;
 *  - nothing in here reads how much of the week is left. Eligibility on Sunday
 *    night is identical to Monday morning, so the week running out can never
 *    escalate what the user is told.
 *
 * Scheduling, per-category frequency caps, and the exact copy are still open
 * (DESIGN.md Open Question #2) and land with issue #13; the only cap encoded
 * here is the structural one re-engagement can't do without — at most one warm
 * check-in per week.
 */

import type {
  NotificationCategory,
  NotificationSettings,
  ProgressionState,
  SessionRecord,
  WeeklyCommitment,
} from './types';
import { lifetimeWeeksCompleted, startOfDay, startOfWeek, weekProgress } from './week';

// Weeks are anchored via startOfWeek, so a fixed 7-day span is fine; the DST
// hour drift never reaches a whole week (same acceptable v1 edge as streak.ts).
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Weeks of silence before a warm check-in is offered, and the point past which
 * we stop reaching out altogether — the notification counterpart of the streak
 * tiers in §3.8 ('resting' → 'miss-you' → 'archived'). Quietness is measured
 * from the user's **last session**, not from missed weekly commitments: someone
 * who never quite completed a week can still go quiet, and they are exactly the
 * newcomer this product exists for. PLACEHOLDERs pending issue #13's caps pass.
 */
const QUIET_WEEKS_BEFORE_CHECK_IN = 2;
const QUIET_WEEKS_BEFORE_LETTING_BE = 6;

/**
 * Everything the policy may emit. A closed union on purpose: adding a kind is a
 * deliberate act that has to declare its framing below, which is where a
 * loss-aversion idea would have to announce itself and be rejected.
 */
export type NotificationKind =
  | 'session-invitation'
  | 'week-complete'
  | 'level-up'
  | 'lifetime-milestone'
  | 'still-here';

/**
 * How a notification relates to the user — the §3.21 governing test made
 * explicit: *sharing their own win, or inviting them to a win they choose*.
 * There is deliberately no framing for "tugging on a fear".
 */
export type NotificationFraming = 'invitation' | 'shared-win' | 'warmth';

/**
 * The permanent category and framing of every kind, in one table so a new kind
 * cannot be added without declaring both.
 */
export const NOTIFICATION_CATALOGUE: Record<
  NotificationKind,
  { category: NotificationCategory; framing: NotificationFraming }
> = {
  'session-invitation': { category: 'reminder', framing: 'invitation' },
  'week-complete': { category: 'celebration', framing: 'shared-win' },
  'level-up': { category: 'celebration', framing: 'shared-win' },
  'lifetime-milestone': { category: 'celebration', framing: 'shared-win' },
  'still-here': { category: 're-engagement', framing: 'warmth' },
};

/** One notification the user is eligible to receive. Carries no urgency. */
export interface EligibleNotification {
  category: NotificationCategory;
  kind: NotificationKind;
  framing: NotificationFraming;
}

/**
 * What the user has already been told. Keeps celebrations from repeating and
 * holds re-engagement to one warm check-in a week. The delivery adapter (#13)
 * owns persisting these marks; the policy only reads them.
 */
export interface NotificationAcknowledgements {
  /** Week start (epoch ms) whose completion has been celebrated, or null. */
  celebratedWeekStart: number | null;
  /** Highest level the user has been congratulated on. */
  celebratedLevel: number;
  /** Highest lifetime-weeks milestone already celebrated. */
  celebratedLifetimeWeeks: number;
  /** When the last warm check-in went out (epoch ms), or null for never. */
  lastReEngagementAt: number | null;
}

/** Nothing acknowledged yet — a user who has never been notified. */
export const NO_ACKNOWLEDGEMENTS: NotificationAcknowledgements = {
  celebratedWeekStart: null,
  celebratedLevel: 1,
  celebratedLifetimeWeeks: 0,
  lastReEngagementAt: null,
};

/** The user state the policy reads. */
export interface NotificationPolicyState {
  settings: NotificationSettings;
  sessions: SessionRecord[];
  commitment: WeeklyCommitment;
  progression: ProgressionState;
  acknowledged: NotificationAcknowledgements;
}

/**
 * Lifetime-weeks counts worth a celebration (§3.21.1). Sparse by design — a
 * milestone every week would make none of them feel like anything. PLACEHOLDERs
 * pending the copy/caps pass in issue #13.
 */
export const LIFETIME_MILESTONES = [4, 12, 26, 52];

function notification(kind: NotificationKind): EligibleNotification {
  return { ...NOTIFICATION_CATALOGUE[kind], kind };
}

/**
 * Whole weeks between the user's most recent session and `now`, or null when
 * they have never run — a user with no history yet is *new*, not quiet, and gets
 * invitations rather than a "we miss you".
 */
function weeksSinceLastSession(sessions: SessionRecord[], now: number): number | null {
  if (sessions.length === 0) {
    return null;
  }
  const latest = Math.max(...sessions.map((session) => session.startedAt));
  // Round absorbs DST-induced hour drift between week starts.
  return Math.round((startOfWeek(now) - startOfWeek(latest)) / WEEK_MS);
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
  const { settings, sessions, commitment, progression, acknowledged } = state;

  // No permission, no notifications. Our own pre-prompt is not consent to send —
  // only the OS's answer is (§3.21.2).
  if (settings.osPermission !== 'granted') {
    return [];
  }

  const enabled = (category: NotificationCategory) => settings.categories[category];
  const eligible: EligibleNotification[] = [];

  const week = weekProgress(sessions, commitment, now);
  const quietWeeks = weeksSinceLastSession(sessions, now);
  const goneQuiet = quietWeeks !== null && quietWeeks >= QUIET_WEEKS_BEFORE_CHECK_IN;

  // ---- celebrations: always after the fact, one per win ----
  if (enabled('celebration')) {
    if (week.isComplete && acknowledged.celebratedWeekStart !== startOfWeek(now)) {
      eligible.push(notification('week-complete'));
    }
    if (progression.level > acknowledged.celebratedLevel) {
      eligible.push(notification('level-up'));
    }
    const lifetimeWeeks = lifetimeWeeksCompleted(sessions, commitment);
    if (
      LIFETIME_MILESTONES.includes(lifetimeWeeks) &&
      lifetimeWeeks > acknowledged.celebratedLifetimeWeeks
    ) {
      eligible.push(notification('lifetime-milestone'));
    }
  }

  // ---- reminders: an open week is an opportunity, never a debt ----
  const ranToday = sessions.some((s) => startOfDay(s.startedAt) === startOfDay(now));
  if (enabled('reminder') && !goneQuiet && !week.isComplete && !ranToday) {
    eligible.push(notification('session-invitation'));
  }

  // ---- re-engagement: the most dangerous category, so the tightest gates ----
  const alreadyReachedOutThisWeek =
    acknowledged.lastReEngagementAt !== null &&
    startOfWeek(acknowledged.lastReEngagementAt) === startOfWeek(now);
  const lettingThemBe = quietWeeks !== null && quietWeeks >= QUIET_WEEKS_BEFORE_LETTING_BE;
  if (enabled('re-engagement') && goneQuiet && !lettingThemBe && !alreadyReachedOutThisWeek) {
    eligible.push(notification('still-here'));
  }

  return eligible;
}
