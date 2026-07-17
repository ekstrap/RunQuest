import type { SessionRecord } from './types';
import {
  canChangeCommitment,
  completesWeek,
  lifetimeWeeksCompleted,
  sessionsInWeek,
  startOfWeek,
  weekBonusXp,
  weekProgress,
} from './week';

/** A minimal completed session started at the given time. */
function sessionAt(startedAt: number): SessionRecord {
  return { mode: 'interval', startedAt, durationSeconds: 600, distanceMeters: null };
}

/** A minimal off-plan / free run started at the given time (issue #10). */
function freeRunAt(startedAt: number): SessionRecord {
  return { ...sessionAt(startedAt), offPlan: true };
}

describe('startOfWeek', () => {
  it('returns Monday 00:00 local for a mid-week timestamp', () => {
    // Wed 2026-06-17 14:30 local → Mon 2026-06-15 00:00 local.
    const wednesday = new Date(2026, 5, 17, 14, 30).getTime();
    expect(startOfWeek(wednesday)).toBe(new Date(2026, 5, 15, 0, 0, 0, 0).getTime());
  });

  it('buckets Sunday into the week of the previous Monday, and Monday into its own', () => {
    const monday = new Date(2026, 5, 15, 0, 0).getTime();
    // Sunday 2026-06-21 23:59 still belongs to the week started Mon 06-15.
    const sundayNight = new Date(2026, 5, 21, 23, 59).getTime();
    expect(startOfWeek(sundayNight)).toBe(monday);
    // Monday 00:00 starts a fresh week — it is its own week start.
    expect(startOfWeek(monday)).toBe(monday);
    // One minute later, next Monday has begun a new week.
    const nextMonday = new Date(2026, 5, 22, 0, 0).getTime();
    expect(startOfWeek(nextMonday)).toBe(nextMonday);
  });
});

describe('sessionsInWeek', () => {
  it('counts only sessions whose startedAt falls inside the given week', () => {
    const weekStart = new Date(2026, 5, 15, 0, 0).getTime(); // Mon 06-15
    const sessions = [
      sessionAt(new Date(2026, 5, 14, 23, 59).getTime()), // Sunday before — previous week
      sessionAt(new Date(2026, 5, 15, 7, 0).getTime()), // Monday morning — in week
      sessionAt(new Date(2026, 5, 21, 23, 59).getTime()), // Sunday night — in week
      sessionAt(new Date(2026, 5, 22, 0, 0).getTime()), // next Monday — next week
    ];

    expect(sessionsInWeek(sessions, weekStart)).toBe(2);
  });

  it('does not count off-plan free runs toward the week (issue #10)', () => {
    const weekStart = new Date(2026, 5, 15, 0, 0).getTime(); // Mon 06-15
    const sessions = [
      sessionAt(new Date(2026, 5, 15, 7, 0).getTime()), // prescribed — counts
      freeRunAt(new Date(2026, 5, 16, 7, 0).getTime()), // free run — does not count
      freeRunAt(new Date(2026, 5, 17, 7, 0).getTime()), // free run — does not count
    ];

    expect(sessionsInWeek(sessions, weekStart)).toBe(1);
  });
});

describe('weekProgress', () => {
  const monday = new Date(2026, 5, 15, 0, 0).getTime();
  const wednesday = new Date(2026, 5, 17, 12, 0).getTime();

  it('reports below-target progress as incomplete', () => {
    const sessions = [sessionAt(monday + 1_000)];

    expect(weekProgress(sessions, 2, wednesday)).toEqual({
      completed: 1,
      target: 2,
      isComplete: false,
    });
  });

  it('reports the week complete exactly at the commitment', () => {
    const sessions = [sessionAt(monday + 1_000), sessionAt(monday + 2_000)];

    expect(weekProgress(sessions, 2, wednesday)).toEqual({
      completed: 2,
      target: 2,
      isComplete: true,
    });
  });

  it('stays complete (and keeps counting) past the commitment', () => {
    const sessions = [
      sessionAt(monday + 1_000),
      sessionAt(monday + 2_000),
      sessionAt(monday + 3_000),
    ];

    expect(weekProgress(sessions, 2, wednesday)).toEqual({
      completed: 3,
      target: 2,
      isComplete: true,
    });
  });
});

describe('weekBonusXp', () => {
  it('scales the bonus with the commitment — a 3-session week earns more than 2', () => {
    expect(weekBonusXp(3)).toBeGreaterThan(weekBonusXp(2));
    expect(weekBonusXp(2)).toBeGreaterThan(0);
  });
});

describe('completesWeek', () => {
  it('is true only when the count lands exactly on the commitment', () => {
    expect(completesWeek(1, 2)).toBe(false);
    expect(completesWeek(2, 2)).toBe(true);
    // The bonus fires once: extra sessions beyond the commitment award nothing.
    expect(completesWeek(3, 2)).toBe(false);
    expect(completesWeek(3, 3)).toBe(true);
  });
});

describe('lifetimeWeeksCompleted', () => {
  const week1 = new Date(2026, 5, 1, 0, 0).getTime(); // Mon 06-01
  const week2 = new Date(2026, 5, 8, 0, 0).getTime(); // Mon 06-08

  it('is 0 with no sessions', () => {
    expect(lifetimeWeeksCompleted([], 2)).toBe(0);
  });

  it('counts a week that met the commitment', () => {
    const sessions = [sessionAt(week1 + 1_000), sessionAt(week1 + 2_000)];
    expect(lifetimeWeeksCompleted(sessions, 2)).toBe(1);
  });

  it('does not count a partial week', () => {
    const sessions = [sessionAt(week1 + 1_000)];
    expect(lifetimeWeeksCompleted(sessions, 2)).toBe(0);
  });

  it('ignores off-plan free runs — they never complete a week (issue #10)', () => {
    // One prescribed + two free runs in a 2-commitment week is still incomplete.
    const sessions = [
      sessionAt(week1 + 1_000),
      freeRunAt(week1 + 2_000),
      freeRunAt(week1 + 3_000),
    ];
    expect(lifetimeWeeksCompleted(sessions, 2)).toBe(0);
  });

  it('only ever grows as sessions accrue across weeks', () => {
    const sessions = [sessionAt(week1 + 1_000), sessionAt(week1 + 2_000)];
    const before = lifetimeWeeksCompleted(sessions, 2);

    sessions.push(sessionAt(week2 + 1_000)); // partial second week — no change
    expect(lifetimeWeeksCompleted(sessions, 2)).toBe(before);

    sessions.push(sessionAt(week2 + 2_000)); // second week completes
    expect(lifetimeWeeksCompleted(sessions, 2)).toBe(before + 1);
  });
});

describe('canChangeCommitment', () => {
  const monday = new Date(2026, 5, 15, 0, 0).getTime();
  const wednesday = new Date(2026, 5, 17, 12, 0).getTime();

  it('allows a change when the current week has no sessions yet', () => {
    const lastWeek = [sessionAt(new Date(2026, 5, 12, 8, 0).getTime())];
    expect(canChangeCommitment(lastWeek, 2, wednesday)).toBe(true);
  });

  it('locks the commitment mid-week (started but not complete)', () => {
    const sessions = [sessionAt(monday + 1_000)];
    expect(canChangeCommitment(sessions, 2, wednesday)).toBe(false);
  });

  it('allows a change again once the week is complete', () => {
    const sessions = [sessionAt(monday + 1_000), sessionAt(monday + 2_000)];
    expect(canChangeCommitment(sessions, 2, wednesday)).toBe(true);
  });
});
