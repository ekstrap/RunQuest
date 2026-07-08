import type { SessionRecord } from './types';
import { streakStatus } from './streak';

/** A minimal completed session started at the given time. */
function sessionAt(startedAt: number): SessionRecord {
  return { mode: 'interval', startedAt, durationSeconds: 600, distanceMeters: null };
}

/** Two sessions in the week starting at `weekStart` — completes a 2-commitment week. */
function completedWeek(weekStart: number): SessionRecord[] {
  return [sessionAt(weekStart + 1_000), sessionAt(weekStart + 2_000)];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const monday = new Date(2026, 5, 1, 0, 0).getTime(); // Mon 2026-06-01

describe('streakStatus', () => {
  it('reports a fresh zero streak for an empty history', () => {
    expect(streakStatus([], 2, monday)).toEqual({
      weeks: 0,
      missedWeeks: 0,
      tier: 'active',
      archived: false,
    });
  });

  it('counts consecutive completed weeks ending at the last completed week', () => {
    const sessions = [
      ...completedWeek(monday),
      ...completedWeek(monday + WEEK_MS),
      ...completedWeek(monday + 2 * WEEK_MS),
    ];
    const now = monday + 3 * WEEK_MS + 1_000;

    expect(streakStatus(sessions, 2, now).weeks).toBe(3);
  });

  it('restarts the consecutive count after a gap week', () => {
    const sessions = [
      ...completedWeek(monday), // then a gap at monday + 1 week
      ...completedWeek(monday + 2 * WEEK_MS),
      ...completedWeek(monday + 3 * WEEK_MS),
    ];
    const now = monday + 4 * WEEK_MS + 1_000;

    expect(streakStatus(sessions, 2, now).weeks).toBe(2);
  });

  it('ignores partial weeks when building the streak', () => {
    const sessions = [
      ...completedWeek(monday),
      sessionAt(monday + WEEK_MS + 1_000), // only 1 of 2 — not complete
    ];
    const now = monday + WEEK_MS + 2_000;

    expect(streakStatus(sessions, 2, now).weeks).toBe(1);
  });

  it.each([
    [0, 'active'],
    [1, 'resting'],
    [2, 'miss-you'],
    [3, 'miss-you'],
    [4, 'archived'],
  ] as const)('maps %i missed weeks to the %s tier', (missed, tier) => {
    // Completed week, then `missed` empty weeks, then `now` in the next week.
    const now = monday + (missed + 1) * WEEK_MS + 1_000;
    const status = streakStatus(completedWeek(monday), 2, now);

    expect(status.missedWeeks).toBe(missed);
    expect(status.tier).toBe(tier);
    expect(status.archived).toBe(tier === 'archived');
  });

  it('counts a single completed week as an active 1-week streak', () => {
    const now = monday + WEEK_MS + 1_000; // early in the following week
    expect(streakStatus(completedWeek(monday), 2, now)).toEqual({
      weeks: 1,
      missedWeeks: 0,
      tier: 'active',
      archived: false,
    });
  });
});
