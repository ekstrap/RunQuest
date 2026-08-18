import type { SupabaseClient } from '@supabase/supabase-js';

import type { SessionRecord } from '@/src/domain/types';
import type { ProfileSnapshot, RemoteStore } from './remote-store';
import {
  toProfileRow,
  toProfileSnapshot,
  toSessionRecord,
  toSessionRow,
  type ProfileRow,
  type SessionRow,
} from './supabase-rows';

/**
 * SupabaseRemoteStore — the production RemoteStore: query plumbing only.
 *
 * The domain↔row translation lives in `supabase-rows.ts` (tested directly) and
 * the sync rules, merge behaviour and offline tolerance live in
 * SyncingRepository (tested against InMemoryRemoteStore). What's left here is
 * the SDK calls themselves, which is what the PRD's "thin shells get thin
 * coverage" is about.
 *
 * Everything is scoped by `userId`, and row-level security enforces the same
 * scoping server-side — a client bug cannot reach another user's rows.
 */
export class SupabaseRemoteStore implements RemoteStore {
  constructor(private readonly client: SupabaseClient) {}

  async fetchProfile(userId: string): Promise<ProfileSnapshot | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('bracket, weekly_commitment, calibration_step, xp_total, level')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw new Error(error.message);
    }
    return data ? toProfileSnapshot(data) : null;
  }

  async saveProfile(userId: string, profile: ProfileSnapshot): Promise<void> {
    const { error } = await this.client.from('profiles').upsert(toProfileRow(userId, profile));

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
      records.map((record) => toSessionRow(userId, record)),
      // Re-sending a run updates it in place instead of duplicating it.
      { onConflict: 'user_id,started_at' },
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}
