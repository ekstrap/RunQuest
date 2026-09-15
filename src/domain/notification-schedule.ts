/**
 * Notification schedule — decides *when* a notification may fire and *what it
 * says*. It owns only those two things: whether the user is eligible at all is
 * `notification-policy.ts`'s question, and this module asks it rather than
 * re-deciding it.
 *
 * That split is the point. A pre-scheduled notification is a bet that the user
 * will still be eligible at the moment it fires, so every candidate moment below
 * is put back through `eligibleNotifications(state, fireAt)` — the *same* gates
 * the policy applies, evaluated at the future instant rather than now. There is
 * no second copy of the permission check, the quiet-period rule, the
 * week-complete rule, or the ran-that-day rule, so the two cannot drift.
 *
 * The §3.21.1b **hard rule** is structural here:
 *
 *   > scheduling may read *sessions completed*, never *days remaining*.
 *
 * The two look alike and are opposites. Sessions-completed can only ever make
 * reminders **rarer**; days-remaining makes them **denser as the deadline
 * nears**, which is a predatory notification wearing a scheduling costume. So
 * the plan is built by *subtraction*: start from the week's fixed anchor days
 * and remove the ones that no longer apply. There is no branch anywhere below
 * that can add a firing, and nothing reads how much of the week is left.
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
  eligibleNotifications,
  type NotificationFraming,
  type NotificationKind,
  type NotificationPolicyState,
} from './notification-policy';
import { STILL_HERE_COPY, sessionInvitationCopy } from './notification-copy';
import type {
  NotificationCategory,
  Prescription,
  ReminderTime,
  WeeklyCommitment,
} from './types';
import { WEEK_MS, startOfDay, startOfWeek } from './week';

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
 * Everything the plan reads: exactly the policy's state plus the current
 * `prescription`, because a reminder states the duration it is inviting the user
 * to (§3.21.1d). Conspicuously absent: anything describing how much of the week
 * remains, and any record of what has already been sent.
 */
export interface NotificationPlanState extends NotificationPolicyState {
  prescription: Prescription;
}

/** Local epoch ms for `time` on the day `dayOffset` days after `dayStart`. */
function localTimeOn(dayStart: number, dayOffset: number, time: ReminderTime): number {
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
 * The week's invitation *moments* — one per anchor day, at the user's reminder
 * time. Whether each survives is the policy's call, applied below.
 */
function anchorMoments(
  state: NotificationPlanState,
  now: number,
): { fireAt: number; anchorIndex: number }[] {
  const weekStart = startOfWeek(now);
  // The index is the anchor's position in the *week*, not in what survives, so
  // a given day's wording is fixed for the whole week however many anchors have
  // already passed — replanning on Wednesday must not reword Saturday.
  return ANCHOR_DAYS[state.commitment].map((weekday, anchorIndex) => ({
    fireAt: localTimeOn(weekStart, daysFromMonday(weekday), state.settings.reminderTime),
    anchorIndex,
  }));
}

/**
 * The quiet period's two check-in moments, at 2 and 4 quiet weeks (§3.21.1c),
 * each at the user's reminder time on that week's Monday.
 *
 * The cap needs no bookkeeping. A quiet period *is* the stretch since the user's
 * last session, so its two milestones are two fixed moments in time; the user
 * running at all moves the period wholesale. Two is therefore the most that can
 * ever be delivered, with no counter to lose, double-spend, or get out of step
 * with the device's storage.
 */
function checkInMoments(state: NotificationPlanState): number[] {
  const { sessions, settings } = state;
  if (sessions.length === 0) {
    // A user with no history is *new*, not quiet — there is no period to anchor
    // on. The policy agrees, but we need a last session to do the arithmetic.
    return [];
  }
  const periodStart = startOfWeek(Math.max(...sessions.map((session) => session.startedAt)));
  return RE_ENGAGEMENT_QUIET_WEEKS.map((quietWeeks) =>
    localTimeOn(periodStart, quietWeeks * 7, settings.reminderTime),
  );
}

/**
 * Keep `fireAt` only if the policy says this kind is eligible *at that moment*,
 * and only if that moment is one we may still schedule.
 *
 * Two clocks matter here, not one. `fireAt > now` is the obvious guard. The
 * second is subtler: a firing must be dropped on the day the user changed their
 * reminder time. Otherwise moving the time later — 18:00 to 18:30, at 18:15,
 * having just been reminded — would re-arm a notification that already fired,
 * because `fireAt > now` again. That is a second reminder in one day and, on a
 * check-in milestone, a third message in a quiet period. A reminder-time change
 * therefore takes effect **tomorrow**, which is a rule that can only ever remove
 * a notification and is a sentence a user understands.
 */
function survives(
  kind: NotificationKind,
  fireAt: number,
  state: NotificationPlanState,
  now: number,
): boolean {
  if (fireAt <= now) {
    return false;
  }
  const changedAt = state.settings.reminderTimeChangedAt;
  if (changedAt !== null && startOfDay(changedAt) === startOfDay(fireAt)) {
    return false;
  }
  return eligibleNotifications(state, fireAt).some((eligible) => eligible.kind === kind);
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
 *
 * Every gate other than *when* is the policy's, asked at each candidate moment:
 * permission, the category toggles, the quiet period, the completed week, and
 * the day the user already ran all arrive from there.
 */
export function planNotifications(
  state: NotificationPlanState,
  now: number,
): PlannedNotification[] {
  const weekStart = startOfWeek(now);
  // Rotates the copy variants both within a week and from week to week, so a
  // user on a 3-session commitment never gets the same three lines twice running.
  const weekIndex = Math.round(weekStart / WEEK_MS);

  const invitations = anchorMoments(state, now)
    .filter(({ fireAt }) => survives('session-invitation', fireAt, state, now))
    .map(({ fireAt, anchorIndex }) =>
      planned(
        'session-invitation',
        fireAt,
        sessionInvitationCopy(state.prescription.durationMinutes, weekIndex + anchorIndex),
      ),
    );

  const checkIns = checkInMoments(state)
    .filter((fireAt) => survives('still-here', fireAt, state, now))
    .map((fireAt) => planned('still-here', fireAt, STILL_HERE_COPY));

  return [...invitations, ...checkIns].sort((a, b) => a.fireAt - b.fireAt);
}
