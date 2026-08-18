import type { SupabaseClient } from '@supabase/supabase-js';

import type { Bracket, RunType, SessionRecord, WeeklyCommitment } from '@/src/domain/types';
import type { RemoteProfile, RemoteStore } from './remote-store';

/** The `profiles` row shape (see supabase/migrations). */
interface ProfileRow {
  bracket: Bracket | null;
  weekly_commitment: WeeklyCommitment | null;
  calibration_step: number | null;
  xp_total: number;
  level: number;
}

/** The `sessions` row shape. `started_at` is a timestamptz, not epoch ms. */
interface SessionRow {
  mode: RunType;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  off_plan: boolean;
}

function toProfile(row: ProfileRow): RemoteProfile {
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

function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    mode: row.mode,
    startedAt: Date.parse(row.started_at),
    durationSeconds: row.duration_seconds,
    distanceMeters: row.distance_meters,
    ...(row.off_plan ? { offPlan: true } : {}),
  };
}

/**
 * SupabaseRemoteStore — the production RemoteStore: a straight translation
 * between the domain's camelCase types and the database's snake_case rows.
 *
 * Kept deliberately logic-free (PRD §"thin shells get thin coverage"): the sync
 * rules, merge behaviour and offline tolerance all live in SyncingRepository,
 * which is tested in full against InMemoryRemoteStore. Everything here is
 * scoped by `userId`, and row-level security enforces that same scoping
 * server-side — a client bug cannot reach another user's rows.
 */
export class SupabaseRemoteStore implements RemoteStore {
  constructor(private readonly client: SupabaseClient) {}

  async fetchProfile(userId: string): Promise<RemoteProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('bracket, weekly_commitment, calibration_step, xp_total, level')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw new Error(error.message);
    }
    return data ? toProfile(data) : null;
  }

  async saveProfile(userId: string, profile: RemoteProfile): Promise<void> {
    const { error } = await this.client.from('profiles').upsert({
      id: userId,
      bracket: profile.onboarding?.bracket ?? null,
      weekly_commitment: profile.onboarding?.weeklyCommitment ?? null,
      calibration_step: profile.calibration?.step ?? null,
      xp_total: profile.progression.xpTotal,
      level: profile.progression.level,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async fetchSessions(userId: string): Promise<SessionRecord[]> {
    const { data, error } = await this.client
      .from('sessions')
      .select('mode, started_at, duration_seconds, distance_meters, off_plan')
      .eq('user_id', userId)
      .order('started_at', { ascending: true })
      .returns<SessionRow[]>();

    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []).map(toSessionRecord);
  }

  async saveSessions(userId: string, records: SessionRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const { error } = await this.client.from('sessions').upsert(
      records.map((record) => ({
        user_id: userId,
        mode: record.mode,
        started_at: new Date(record.startedAt).toISOString(),
        duration_seconds: record.durationSeconds,
        distance_meters: record.distanceMeters,
        off_plan: record.offPlan ?? false,
      })),
      // Re-sending a run updates it in place instead of duplicating it.
      { onConflict: 'user_id,started_at' },
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}
