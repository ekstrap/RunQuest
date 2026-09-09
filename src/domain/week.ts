/**
 * Week model — the atom of the whole product (DESIGN.md §3.4: "week is the
 * atom"). A week is the local calendar week starting Monday 00:00; a session
 * belongs to the week containing its `startedAt`. Completing the weekly
 * commitment (2 or 3 sessions) completes the week and earns a bonus scaled by
 * that commitment (§3.6: choosing 3 sessions/week earns more than 2).
 */

import type { SessionRecord, WeeklyCommitment } from './types';

/** Where the current week stands against the user's weekly commitment. */
export interface WeekProgress {
  /** Completed sessions in the current week (keeps counting past the target). */
  completed: number;
  /** The weekly commitment the count is measured against. */
  target: WeeklyCommitment;
  /** True once `completed` has reached the target. */
  isComplete: boolean;
}

/** Epoch ms of 00:00 local time on the day containing `timestamp`. */
export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Epoch ms of Monday 00:00 local time for the week containing `timestamp`. */
export function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  // getDay(): Sunday = 0 … Saturday = 6; shift so Monday = 0.
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Whether a session counts toward the weekly commitment. Off-plan / free runs
 * (§3.6, issue #10) are rewarded with small XP but never advance week progress,
 * so weekly-completion counters exclude them. Absent `offPlan` = on-plan.
 */
export function countsTowardWeek(session: SessionRecord): boolean {
  return !session.offPlan;
}

/**
 * Count the prescribed sessions belonging to the week starting at `weekStart`.
 * Off-plan free runs are excluded (they never advance week progress — issue #10).
 */
export function sessionsInWeek(sessions: SessionRecord[], weekStart: number): number {
  return sessions.filter(
    (session) => countsTowardWeek(session) && startOfWeek(session.startedAt) === weekStart,
  ).length;
}

/** Progress of the week containing `now` against the weekly commitment. */
export function weekProgress(
  sessions: SessionRecord[],
  commitment: WeeklyCommitment,
  now: number,
): WeekProgress {
  const completed = sessionsInWeek(sessions, startOfWeek(now));
  return { completed, target: commitment, isComplete: completed >= commitment };
}

/**
 * Distinct weeks that met the commitment — the lifetime legacy counter (§3.8).
 * Monotonic by construction: a completed week never un-completes, so this only
 * ever grows. Uses the *current* commitment as a proxy for historical weeks
 * (we don't persist per-week commitment — acceptable v1 simplification).
 */
export function lifetimeWeeksCompleted(
  sessions: SessionRecord[],
  commitment: WeeklyCommitment,
): number {
  const countsByWeek = new Map<number, number>();
  for (const session of sessions) {
    if (!countsTowardWeek(session)) continue; // free runs never complete a week
    const week = startOfWeek(session.startedAt);
    countsByWeek.set(week, (countsByWeek.get(week) ?? 0) + 1);
  }
  let completedWeeks = 0;
  for (const count of countsByWeek.values()) {
    if (count >= commitment) completedWeeks += 1;
  }
  return completedWeeks;
}

/**
 * Week-completion bonus XP per commitment (§3.6: scaled by weekly commitment —
 * committing to 3 sessions earns a larger bonus than 2). PLACEHOLDERs pending
 * tuning (DESIGN.md §3.20.5).
 */
const WEEK_BONUS_XP: Record<WeeklyCommitment, number> = { 2: 200, 3: 350 };

/** The week-completion bonus for a given weekly commitment. */
export function weekBonusXp(commitment: WeeklyCommitment): number {
  return WEEK_BONUS_XP[commitment];
}

/**
 * True exactly when this week's session count lands on the commitment — the
 * transition that awards the bonus. Idempotent by construction: only the
 * session that brings the count *to* the commitment fires it; extras don't.
 */
export function completesWeek(countThisWeek: number, commitment: WeeklyCommitment): boolean {
  return countThisWeek === commitment;
}

/**
 * Whether the weekly commitment may change right now. Changeable *between*
 * weeks, never mid-week (§3.13): allowed when the current week is untouched
 * (no sessions yet) or already complete; locked while a week is in progress.
 */
export function canChangeCommitment(
  sessions: SessionRecord[],
  commitment: WeeklyCommitment,
  now: number,
): boolean {
  const { completed, isComplete } = weekProgress(sessions, commitment, now);
  return completed === 0 || isComplete;
}
