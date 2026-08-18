import type {
  CalibrationState,
  OnboardingState,
  ProgressionState,
  SessionRecord,
} from '@/src/domain/types';

/**
 * A user's profile: everything about them that isn't a session — progression,
 * onboarding selections, calibration rung. Used on both sides of sync (it is
 * what the device holds as much as what the cloud stores), which is why it is
 * a snapshot rather than a "remote" type.
 * Progression is always present (a fresh account starts at level 1); onboarding
 * and calibration are null until the user has been through onboarding / had a
 * rung written.
 */
export interface ProfileSnapshot {
  progression: ProgressionState;
  onboarding: OnboardingState | null;
  calibration: CalibrationState | null;
}

/**
 * RemoteStore — the cloud-storage boundary, one SDK-style method per operation
 * (PRD §"boundary interfaces should be SDK-style, not a single generic
 * fetcher"). `SupabaseRemoteStore` is the production adapter; tests use
 * `InMemoryRemoteStore`.
 *
 * Splitting this out from `Repository` is deliberate: `Repository` is what the
 * app's screens and engines speak, and it must never be *only* remote (that
 * would make every read a network round-trip and break offline running). This
 * interface is the narrower thing `SyncingRepository` mirrors to.
 */
export interface RemoteStore {
  /** Read a user's profile row, or null when the account has no row yet. */
  fetchProfile(userId: string): Promise<ProfileSnapshot | null>;

  /** Create or update the user's profile row with the given fields. */
  saveProfile(userId: string, profile: ProfileSnapshot): Promise<void>;

  /** Read all of a user's session records, oldest first. */
  fetchSessions(userId: string): Promise<SessionRecord[]>;

  /**
   * Append session records. Must be idempotent per (user, startedAt): sync
   * re-sends records it isn't sure landed, and a session must never be
   * duplicated in the user's history because of a retry.
   */
  saveSessions(userId: string, records: SessionRecord[]): Promise<void>;
}

/** A brand-new account: level 1, no XP, nothing onboarded yet. */
export const EMPTY_PROFILE: ProfileSnapshot = {
  progression: { xpTotal: 0, level: 1 },
  onboarding: null,
  calibration: null,
};

/** In-process RemoteStore for tests — the cloud, without the cloud. */
export class InMemoryRemoteStore implements RemoteStore {
  private readonly profiles = new Map<string, ProfileSnapshot>();
  private readonly sessions = new Map<string, SessionRecord[]>();

  async fetchProfile(userId: string): Promise<ProfileSnapshot | null> {
    return this.profiles.get(userId) ?? null;
  }

  async saveProfile(userId: string, profile: ProfileSnapshot): Promise<void> {
    this.profiles.set(userId, profile);
  }

  async fetchSessions(userId: string): Promise<SessionRecord[]> {
    return [...(this.sessions.get(userId) ?? [])];
  }

  async saveSessions(userId: string, records: SessionRecord[]): Promise<void> {
    const existing = this.sessions.get(userId) ?? [];
    // Mirrors the real store's (user_id, started_at) uniqueness.
    const merged = [...existing];
    for (const record of records) {
      const index = merged.findIndex((s) => s.startedAt === record.startedAt);
      if (index >= 0) {
        merged[index] = record;
      } else {
        merged.push(record);
      }
    }
    merged.sort((a, b) => a.startedAt - b.startedAt);
    this.sessions.set(userId, merged);
  }
}
