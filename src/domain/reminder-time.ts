/**
 * The reminder-time setting and the control that edits it (§3.21.1b: "one
 * reminder time for all days, default 18:00, changeable in settings"). Split
 * from notification-schedule.ts because it changes for a different reason — this
 * is about what the user may choose, not about when a plan fires.
 */

import type { ReminderTime } from './types';

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
