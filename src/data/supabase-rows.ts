import type { Bracket, RunType, SessionRecord, WeeklyCommitment } from '@/src/domain/types';
import type { ProfileSnapshot } from './remote-store';

/**
 * Translation between the domain's types and the database's rows — the only
 * part of the Supabase adapter with any logic in it, split out so it can be
 * tested directly rather than through faked query builders.
 *
 * Two mappings are easy to get quietly wrong, so both are pinned by tests:
 * snake_case ↔ camelCase, and `started_at` as a timestamptz string ↔ the
 * domain's epoch milliseconds.
 */

/** The `profiles` row shape (see supabase/migrations). */
export interface ProfileRow {
  bracket: Bracket | null;
  weekly_commitment: WeeklyCommitment | null;
  calibration_step: number | null;
  xp_total: number;
  level: number;
}

/** The `sessions` row shape. `started_at` is a timestamptz, not epoch ms. */
export interface SessionRow {
  mode: RunType;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  off_plan: boolean;
}

export function toProfileSnapshot(row: ProfileRow): ProfileSnapshot {
  return {
    progression: { xpTotal: row.xp_total, level: row.level },
    // Onboarding only counts as done when both selections are present.
    onboarding:
      row.bracket && row.weekly_commitment
        ? { bracket: row.bracket, weeklyCommitment: row.weekly_commitment }
        : null,
    calibration: row.calibration_step === null ? null : { step: row.calibration_step },
  };
}

export function toProfileRow(userId: string, profile: ProfileSnapshot) {
  return {
    id: userId,
    bracket: profile.onboarding?.bracket ?? null,
    weekly_commitment: profile.onboarding?.weeklyCommitment ?? null,
    calibration_step: profile.calibration?.step ?? null,
    xp_total: profile.progression.xpTotal,
    level: profile.progression.level,
    updated_at: new Date().toISOString(),
  };
}

export function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    mode: row.mode,
    startedAt: Date.parse(row.started_at),
    durationSeconds: row.duration_seconds,
    distanceMeters: row.distance_meters,
    // Omitted rather than set false, so records round-trip equal to the
    // on-plan sessions the rest of the app creates.
    ...(row.off_plan ? { offPlan: true } : {}),
  };
}

export function toSessionRow(userId: string, record: SessionRecord) {
  return {
    user_id: userId,
    mode: record.mode,
    started_at: new Date(record.startedAt).toISOString(),
    duration_seconds: record.durationSeconds,
    distance_meters: record.distanceMeters,
    off_plan: record.offPlan ?? false,
  };
}
