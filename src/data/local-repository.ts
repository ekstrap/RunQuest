import type {
  CalibrationState,
  OnboardingState,
  ProgressionState,
  SessionRecord,
} from '@/src/domain/types';
import type { KeyValueStore } from './key-value-store';
import type { Repository } from './repository';

/** A brand-new user: level 1, no XP yet. Matches InMemoryRepository's seed. */
const INITIAL_PROGRESSION: ProgressionState = { xpTotal: 0, level: 1 };

/**
 * Storage keys. Namespaced so the app's values can never collide with another
 * library's in the same device store. Changing one of these strings orphans the
 * data already on users' phones — treat them as a persisted schema.
 */
const KEYS = {
  progression: 'runquest:progression',
  onboarding: 'runquest:onboarding',
  calibration: 'runquest:calibration',
  sessions: 'runquest:sessions',
  dataOwner: 'runquest:data-owner',
} as const;

/**
 * Device-local Repository implementation, persisted as JSON in a KeyValueStore.
 *
 * This is what makes "Just run" a real, complete offer rather than a session
 * that evaporates (DESIGN.md §3.12): an anonymous user's XP, level, calibration
 * and run history survive app restarts with no account and no network. Signing
 * in later layers cloud sync *on top* of this (SyncingRepository) — it never
 * replaces it, so the app stays fully usable offline.
 *
 * Reads tolerate absent and corrupt values by falling back to "nothing stored
 * yet": a parse failure on one key must never brick the app, and the honest
 * recovery for an unreadable local cache is to behave like a fresh install of
 * that one slice rather than crash on launch.
 */
export class LocalRepository implements Repository {
  constructor(private readonly store: KeyValueStore) {}

  /** Read and JSON-parse a key, yielding null when absent or unparseable. */
  private async read<T>(key: string): Promise<T | null> {
    const raw = await this.store.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async write(key: string, value: unknown): Promise<void> {
    await this.store.setItem(key, JSON.stringify(value));
  }

  async getProgressionState(): Promise<ProgressionState> {
    return (await this.read<ProgressionState>(KEYS.progression)) ?? INITIAL_PROGRESSION;
  }

  async saveProgression(state: ProgressionState): Promise<void> {
    await this.write(KEYS.progression, state);
  }

  async getOnboardingState(): Promise<OnboardingState | null> {
    return this.read<OnboardingState>(KEYS.onboarding);
  }

  async saveOnboarding(state: OnboardingState): Promise<void> {
    await this.write(KEYS.onboarding, state);
  }

  async getCalibrationState(): Promise<CalibrationState | null> {
    return this.read<CalibrationState>(KEYS.calibration);
  }

  async saveCalibration(state: CalibrationState): Promise<void> {
    await this.write(KEYS.calibration, state);
  }

  async saveSession(record: SessionRecord): Promise<void> {
    const sessions = await this.getSessions();
    sessions.push(record);
    await this.write(KEYS.sessions, sessions);
  }

  async replaceSessions(records: SessionRecord[]): Promise<void> {
    await this.write(KEYS.sessions, records);
  }

  async getSessions(): Promise<SessionRecord[]> {
    const sessions = await this.read<SessionRecord[]>(KEYS.sessions);
    return Array.isArray(sessions) ? sessions : [];
  }

  async getDataOwner(): Promise<string | null> {
    return this.read<string>(KEYS.dataOwner);
  }

  async setDataOwner(userId: string | null): Promise<void> {
    if (userId === null) {
      await this.store.removeItem(KEYS.dataOwner);
      return;
    }
    await this.write(KEYS.dataOwner, userId);
  }

  async clear(): Promise<void> {
    await Promise.all(Object.values(KEYS).map((key) => this.store.removeItem(key)));
  }
}
