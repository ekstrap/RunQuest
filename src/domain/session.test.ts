import { buildSessionRecord } from './session';

// The completion rule: time is the contract (DESIGN.md §3.5/§3.9). These tests
// exercise only the public builder; GPS distance is optional because GPS never
// gates completion (AC: "completion works without GPS").
describe('buildSessionRecord', () => {
  it('derives duration in seconds from the start and end timestamps', () => {
    const record = buildSessionRecord({
      mode: 'just-run',
      startedAt: 1_000_000,
      endedAt: 1_000_000 + 65_000,
    });

    expect(record).toEqual({
      mode: 'just-run',
      startedAt: 1_000_000,
      durationSeconds: 65,
      distanceMeters: null,
    });
  });

  it('passes through a GPS distance when one is provided', () => {
    const record = buildSessionRecord({
      mode: 'just-walk',
      startedAt: 0,
      endedAt: 30_000,
      distanceMeters: 420,
    });

    expect(record.distanceMeters).toBe(420);
  });

  it('records null distance when GPS is unavailable (completion still works)', () => {
    const record = buildSessionRecord({
      mode: 'interval',
      startedAt: 0,
      endedAt: 30_000,
      distanceMeters: null,
    });

    expect(record.distanceMeters).toBeNull();
    expect(record.durationSeconds).toBe(30);
  });

  it('never produces a negative duration if the clock appears to go backwards', () => {
    const record = buildSessionRecord({
      mode: 'just-run',
      startedAt: 5_000,
      endedAt: 1_000,
    });

    expect(record.durationSeconds).toBe(0);
  });
});
