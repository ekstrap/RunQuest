/**
 * Notification schedule — turns *what is eligible* (notification-policy.ts) into
 * *what is pre-scheduled with the OS, when, and with what words*. Pure and
 * clock-injected like the policy: a plan is a value, so the whole of §3.21.1b–d
 * is testable without a device, a timer, or a notification tray.
 *
 * The shape of this module is the §3.21.1b **hard rule** made structural:
 *
 *   > scheduling may read *sessions completed*, never *days remaining*.
 *
 * The two look alike and are opposites. Sessions-completed can only ever make
 * reminders **rarer**; days-remaining makes them **denser as the deadline
 * nears**, which is a predatory notification wearing a scheduling costume. So
 * the plan is built by *subtraction*: start from the week's fixed anchor days
 * and remove the ones that no longer apply. There is no branch anywhere below
 * that can add a firing, and nothing reads how much of the week is left — the
 * only use of `now` is to refuse to schedule something in the past.
 *
 * **Scope: the current week only.** A reminder bakes in the prescribed duration
 * (§3.21.1d rule 2), which is safe precisely because calibration changes only
 * *between* weeks — so pre-scheduling next week's anchors would be promising a
 * number we cannot yet know. The app replans on every foreground, which is what
 * carries the schedule over a week rollover. The failure mode when the user
 * never opens the app is silence, which is the safe direction to fail in.
 */

import {
  NOTIFICATION_CATALOGUE,
  RE_ENGAGEMENT_QUIET_WEEKS,
  hasGoneQuiet,
  weeksSinceLastSession,
  type NotificationFraming,
  type NotificationKind,
} from './notification-policy';
import { STILL_HERE_COPY, sessionInvitationCopy } from './notification-copy';
import type {
  NotificationCategory,
  NotificationSettings,
  Prescription,
  ReminderTime,
  SessionRecord,
  WeeklyCommitment,
} from './types';
import { startOfDay, startOfWeek, weekProgress } from './week';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Anchor days per weekly commitment, as JavaScript weekdays (0 = Sunday … 6 =
 * Saturday). Fixed at week start and never shifted (§3.21.1b): a beginner
 * benefits from a rhythm that is the same every week, and a fixed set is also
 * what makes the cap "at most your weekly commitment" fall out for free instead
 * of needing a counter.
 *
 * Both rows include Saturday on purpose — the weekend is where a newcomer has
 * unhurried time, and a plan with no weekend day quietly assumes a life that
 * most of the target audience does not have.
 *
 * Learning preferred days from run history was **rejected**: it needs weeks of
 * data the target user does not have yet, and it is unpredictable to them.
 */
export const ANCHOR_DAYS: Record<WeeklyCommitment, readonly number[]> = {
  2: [2, 6], // Tuesday, Saturday
  3: [1, 3, 6], // Monday, Wednesday, Saturday
};

/** One notification pre-scheduled with the OS: when it fires, and what it says. */
export interface PlannedNotification {
  /**
   * Stable within a plan, and stable across replans of the same state — so
   * cancel-and-reschedule is idempotent rather than a fresh roll of the dice.
   */
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  framing: NotificationFraming;
  /** Local epoch ms at which the OS should deliver it. Always in the future. */
  fireAt: number;
  title: string;
  body: string;
}

/**
 * Everything the plan reads. It is the policy's state plus the current
 * `prescription`, because a reminder states the duration it is inviting the user
 * to (§3.21.1d). Conspicuously absent: anything describing how much of the week
 * remains, and any record of what has already been sent.
 */
export interface NotificationPlanState {
  settings: NotificationSettings;
  sessions: SessionRecord[];
  commitment: WeeklyCommitment;
  prescription: Prescription;
}

/** Local epoch ms for `time` on the day `dayOffset` days after `dayStart`. */
function at(dayStart: number, dayOffset: number, time: ReminderTime): number {
  const date = new Date(dayStart);
  // Date arithmetic rather than +n*DAY_MS so a DST boundary inside the week
  // still lands the reminder at the wall-clock time the user chose.
  date.setDate(date.getDate() + dayOffset);
  date.setHours(time.hour, time.minute, 0, 0);
  return date.getTime();
}

/** Days from Monday for a JavaScript weekday (Mon = 0 … Sun = 6). */
function daysFromMonday(weekday: number): number {
  return (weekday + 6) % 7;
}

/**
 * The week's invitations. Built by removing anchors, never by adding them:
 *
 *  - the whole set goes if the week is already complete, or if the user has gone
 *    quiet (they get warmth instead — the two categories are mutually exclusive);
 *  - an individual anchor goes if the user already ran that day, or if its time
 *    has passed.
 *
 * What is left is at most one per anchor day, so "at most the weekly commitment,
 * at most one a day" is a property of the data rather than a rule to enforce.
 */
function plannedReminders(state: NotificationPlanState, now: number): PlannedNotification[] {
  const { settings, sessions, commitment, prescription } = state;
  if (!settings.categories.reminder) {
    return [];
  }
  if (hasGoneQuiet(weeksSinceLastSession(sessions, now))) {
    return [];
  }
  if (weekProgress(sessions, commitment, now).isComplete) {
    return [];
  }

  const weekStart = startOfWeek(now);
  const ranOn = new Set(sessions.map((session) => startOfDay(session.startedAt)));
  // Rotates the copy variants both within a week and from week to week, so a
  // user on a 3-session commitment never gets the same three lines twice running.
  const weekIndex = Math.round(weekStart / WEEK_MS);

  return ANCHOR_DAYS[commitment].flatMap((weekday, anchorIndex) => {
    const fireAt = at(weekStart, daysFromMonday(weekday), settings.reminderTime);
    if (fireAt <= now || ranOn.has(startOfDay(fireAt))) {
      return [];
    }
    // weekIndex shifts the rotation week to week; anchorIndex separates the
    // anchors within one week. With three variants and at most three anchors,
    // a user never sees the same line twice in a week.
    const copy = sessionInvitationCopy(prescription.durationMinutes, weekIndex + anchorIndex);
    return [planned('session-invitation', fireAt, copy)];
  });
}

/**
 * The quiet period's two check-ins, at 2 and 4 quiet weeks (§3.21.1c), each at
 * the user's reminder time on that week's Monday.
 *
 * The cap needs no bookkeeping. A quiet period *is* the stretch since the user's
 * last session, so its two milestones are two fixed moments in time; replanning
 * drops the ones that have passed and the user running at all moves the period
 * wholesale. Two is therefore the most that can ever be delivered, with no
 * counter to lose, double-spend, or get out of step with the device's storage.
 */
function plannedCheckIns(state: NotificationPlanState, now: number): PlannedNotification[] {
  const { settings, sessions } = state;
  if (!settings.categories['re-engagement'] || sessions.length === 0) {
    return [];
  }
  // A user with no history is *new*, not quiet — the guard above — and the
  // period is anchored on the last session, never on a missed commitment.
  const latest = Math.max(...sessions.map((session) => session.startedAt));
  const periodStart = startOfWeek(latest);

  return RE_ENGAGEMENT_QUIET_WEEKS.flatMap((quietWeeks) => {
    const fireAt = at(periodStart, quietWeeks * 7, settings.reminderTime);
    return fireAt <= now ? [] : [planned('still-here', fireAt, STILL_HERE_COPY)];
  });
}

function planned(
  kind: NotificationKind,
  fireAt: number,
  copy: { title: string; body: string },
): PlannedNotification {
  return {
    id: `${kind}:${fireAt}`,
    kind,
    ...NOTIFICATION_CATALOGUE[kind],
    fireAt,
    ...copy,
  };
}

/**
 * Everything this user should have pending with the OS as of `now`, oldest
 * firing first. The caller's job is simply to make the OS's pending set equal
 * this list — so a plan that shrinks is a set of cancellations, and the user is
 * never notified about a session they have already done.
 */
export function planNotifications(
  state: NotificationPlanState,
  now: number,
): PlannedNotification[] {
  // No permission, no notifications. Our own pre-prompt is not consent to send —
  // only the OS's answer is (§3.21.2).
  if (state.settings.osPermission !== 'granted') {
    return [];
  }
  return [...plannedReminders(state, now), ...plannedCheckIns(state, now)].sort(
    (a, b) => a.fireAt - b.fireAt,
  );
}

/** How far one nudge of the settings control moves the reminder time. */
export const REMINDER_TIME_STEP_MINUTES = 30;

/**
 * The window a reminder may sit in. Not a preference — a floor under the
 * feature: a 03:00 invitation is a notification nobody can act on, and one that
 * wakes a user is the fastest way to have notifications switched off for good.
 * 05:00–22:00 is wide enough for early risers and night owls both.
 */
const EARLIEST_REMINDER_MINUTES = 5 * 60;
const LATEST_REMINDER_MINUTES = 22 * 60;

/** Minutes since local midnight. */
function minutesOfDay(time: ReminderTime): number {
  return time.hour * 60 + time.minute;
}

/**
 * Move the reminder time by `deltaMinutes`, clamped to the allowed window. The
 * control that calls this steps rather than free-types, so the user cannot land
 * on a time the product would not stand behind.
 */
export function shiftReminderTime(time: ReminderTime, deltaMinutes: number): ReminderTime {
  const minutes = Math.min(
    LATEST_REMINDER_MINUTES,
    Math.max(EARLIEST_REMINDER_MINUTES, minutesOfDay(time) + deltaMinutes),
  );
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/** True when the time is already at the earliest / latest allowed. */
export function isEarliestReminderTime(time: ReminderTime): boolean {
  return minutesOfDay(time) <= EARLIEST_REMINDER_MINUTES;
}

export function isLatestReminderTime(time: ReminderTime): boolean {
  return minutesOfDay(time) >= LATEST_REMINDER_MINUTES;
}

/** 24-hour clock text, e.g. "18:00" — what the settings screen shows. */
export function formatReminderTime(time: ReminderTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}
