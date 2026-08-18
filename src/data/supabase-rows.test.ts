import type { SessionRecord } from '@/src/domain/types';
import type { ProfileSnapshot } from './remote-store';
import {
  toProfileRow,
  toProfileSnapshot,
  toSessionRecord,
  toSessionRow,
  type ProfileRow,
  type SessionRow,
} from './supabase-rows';

describe('profile row mapping', () => {
  const fullRow: ProfileRow = {
    bracket: 'getting-back',
    weekly_commitment: 3,
    calibration_step: 4,
    xp_total: 900,
    level: 8,
  };

  it('maps a complete row to a profile snapshot', () => {
    expect(toProfileSnapshot(fullRow)).toEqual<ProfileSnapshot>({
      progression: { xpTotal: 900, level: 8 },
      onboarding: { bracket: 'getting-back', weeklyCommitment: 3 },
      calibration: { step: 4 },
    });
  });

  it('reports onboarding as incomplete unless both selections are stored', () => {
    expect(toProfileSnapshot({ ...fullRow, weekly_commitment: null }).onboarding).toBeNull();
    expect(toProfileSnapshot({ ...fullRow, bracket: null }).onboarding).toBeNull();
  });

  it('treats an unseeded calibration step as no calibration, not step zero', () => {
    expect(toProfileSnapshot({ ...fullRow, calibration_step: null }).calibration).toBeNull();
    expect(toProfileSnapshot({ ...fullRow, calibration_step: 0 }).calibration).toEqual({ step: 0 });
  });

  it('round-trips a profile back through the row shape', () => {
    const snapshot = toProfileSnapshot(fullRow);

    const row = toProfileRow('user-1', snapshot);

    expect(row).toMatchObject({ id: 'user-1', ...fullRow });
    expect(toProfileSnapshot(row as unknown as ProfileRow)).toEqual(snapshot);
  });

  it('writes nulls for a user who has not onboarded or been calibrated', () => {
    const row = toProfileRow('user-1', {
      progression: { xpTotal: 0, level: 1 },
      onboarding: null,
      calibration: null,
    });

    expect(row).toMatchObject({
      bracket: null,
      weekly_commitment: null,
      calibration_step: null,
      xp_total: 0,
      level: 1,
    });
  });
});

describe('session row mapping', () => {
  const row: SessionRow = {
    mode: 'interval',
    started_at: '2026-08-18T09:30:00.000Z',
    duration_seconds: 600,
    distance_meters: 1100.5,
    off_plan: false,
  };

  it('converts the stored timestamp to epoch milliseconds', () => {
    expect(toSessionRecord(row).startedAt).toBe(Date.parse('2026-08-18T09:30:00.000Z'));
  });

  it('keeps a null distance null rather than turning it into zero', () => {
    // Distance is absent when GPS was unavailable; zero would read as "you
    // covered no ground", which is a different — and discouraging — claim.
    expect(toSessionRecord({ ...row, distance_meters: null }).distanceMeters).toBeNull();
  });

  it('omits offPlan for an ordinary session and sets it for a free run', () => {
    expect(toSessionRecord(row).offPlan).toBeUndefined();
    expect(toSessionRecord({ ...row, off_plan: true }).offPlan).toBe(true);
  });

  it('round-trips a record through the row shape without drift', () => {
    const record: SessionRecord = {
      mode: 'just-walk',
      startedAt: Date.parse('2026-08-18T09:30:00.000Z'),
      durationSeconds: 900,
      distanceMeters: null,
      offPlan: true,
    };

    expect(toSessionRecord(toSessionRow('user-1', record) as SessionRow)).toEqual(record);
  });

  it('scopes every written row to the signed-in user', () => {
    expect(toSessionRow('user-7', toSessionRecord(row)).user_id).toBe('user-7');
  });
});
