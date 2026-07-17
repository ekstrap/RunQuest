/**
 * Secondary streak — consecutive completed weeks, deliberately soft (DESIGN.md
 * §3.8). Missing a week never "breaks" anything abruptly: the streak degrades
 * through warm tiers (resting → miss-you → archived) and the UI must never
 * frame any tier as failure or loss. Lifetime weeks (week.ts) is the primary
 * anchor; this is the secondary, gracefully-soft counter.
 */

import type { SessionRecord, WeeklyCommitment } from './types';
import { countsTowardWeek, startOfWeek } from './week';

// Weeks are anchored via startOfWeek, so a fixed 7-day span is fine; the DST
// hour drift never reaches a whole week (acceptable v1 edge).
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type StreakTier = 'active' | 'resting' | 'miss-you' | 'archived';

export interface StreakStatus {
  /** Consecutive completed weeks ending at the last completed week. */
  weeks: number;
  /** Full missed weeks since the last completion (the current in-progress week is not a miss). */
  missedWeeks: number;
  tier: StreakTier;
  /** True when the streak has gently moved to the archive (tier 'archived'). */
  archived: boolean;
}

function tierFor(missedWeeks: number): StreakTier {
  if (missedWeeks === 0) return 'active';
  if (missedWeeks === 1) return 'resting';
  if (missedWeeks <= 3) return 'miss-you';
  return 'archived';
}

/**
 * The streak as of `now`. Uses the current commitment as a proxy for historical
 * weeks (per-week commitment isn't persisted — acceptable v1 simplification).
 */
export function streakStatus(
  sessions: SessionRecord[],
  commitment: WeeklyCommitment,
  now: number,
): StreakStatus {
  const countsByWeek = new Map<number, number>();
  for (const session of sessions) {
    if (!countsTowardWeek(session)) continue; // free runs never complete a week (issue #10)
    const week = startOfWeek(session.startedAt);
    countsByWeek.set(week, (countsByWeek.get(week) ?? 0) + 1);
  }
  const completedWeekStarts = [...countsByWeek.entries()]
    .filter(([, count]) => count >= commitment)
    .map(([weekStart]) => weekStart);

  if (completedWeekStarts.length === 0) {
    return { weeks: 0, missedWeeks: 0, tier: 'active', archived: false };
  }

  const completed = new Set(completedWeekStarts);
  const lastCompleted = Math.max(...completedWeekStarts);

  // Round absorbs DST-induced hour drift between week starts.
  const weeksBetween = Math.round((startOfWeek(now) - lastCompleted) / WEEK_MS);
  const missedWeeks = Math.max(0, weeksBetween - 1);

  let weeks = 1;
  let cursor = lastCompleted;
  for (;;) {
    const prior = startOfWeek(cursor - WEEK_MS / 2); // land mid-prior-week, then anchor
    if (!completed.has(prior)) break;
    weeks += 1;
    cursor = prior;
  }

  const tier = tierFor(missedWeeks);
  return { weeks, missedWeeks, tier, archived: tier === 'archived' };
}
