import type {
  CalibrationState,
  OnboardingState,
  ProgressionState,
  SessionRecord,
} from '@/src/domain/types';
import type { Repository } from './repository';

/** A brand-new user: level 1, no XP yet. */
const INITIAL_PROGRESSION: ProgressionState = { xpTotal: 0, level: 1 };

/**
 * In-memory Repository implementation. Holds state in process — used by tests
 * and as the offline store for "just run" sessions before an account exists.
 * Seeds a fresh user so reads work before anything has been written.
 */
export class InMemoryRepository implements Repository {
  private progression: ProgressionState;
  /** null until onboarding is completed (DESIGN.md §3.20). */
  private onboarding: OnboardingState | null = null;
  /** null until the first auto-advance or manual adjust seeds it (§3.20). */
  private calibration: CalibrationState | null = null;
  /** Completed sessions, oldest first. */
  private sessions: SessionRecord[] = [];
  /** null while the data is anonymous, i.e. claimed by no account. */
  private dataOwner: string | null = null;

  constructor(initial: ProgressionState = INITIAL_PROGRESSION) {
    this.progression = initial;
  }

  async getProgressionState(): Promise<ProgressionState> {
    return this.progression;
  }

  async saveProgression(state: ProgressionState): Promise<void> {
    this.progression = state;
  }

  async getOnboardingState(): Promise<OnboardingState | null> {
    return this.onboarding;
  }

  async saveOnboarding(state: OnboardingState): Promise<void> {
    this.onboarding = state;
  }

  async getCalibrationState(): Promise<CalibrationState | null> {
    return this.calibration;
  }

  async saveCalibration(state: CalibrationState): Promise<void> {
    this.calibration = state;
  }

  async saveSession(record: SessionRecord): Promise<void> {
    this.sessions.push(record);
  }

  async getSessions(): Promise<SessionRecord[]> {
    // Return a copy so callers can't mutate our internal state.
    return [...this.sessions];
  }

  async replaceSessions(records: SessionRecord[]): Promise<void> {
    this.sessions = [...records];
  }

  async getDataOwner(): Promise<string | null> {
    return this.dataOwner;
  }

  async setDataOwner(userId: string | null): Promise<void> {
    this.dataOwner = userId;
  }

  async clear(): Promise<void> {
    this.progression = INITIAL_PROGRESSION;
    this.onboarding = null;
    this.calibration = null;
    this.sessions = [];
    this.dataOwner = null;
  }
}
