import type { OnboardingState, ProgressionState, SessionRecord } from '@/src/domain/types';
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
  /** Completed sessions, oldest first. */
  private sessions: SessionRecord[] = [];

  constructor(initial: ProgressionState = INITIAL_PROGRESSION) {
    this.progression = initial;
  }

  async getProgressionState(): Promise<ProgressionState> {
    return this.progression;
  }

  async getOnboardingState(): Promise<OnboardingState | null> {
    return this.onboarding;
  }

  async saveOnboarding(state: OnboardingState): Promise<void> {
    this.onboarding = state;
  }

  async saveSession(record: SessionRecord): Promise<void> {
    this.sessions.push(record);
  }

  async getSessions(): Promise<SessionRecord[]> {
    // Return a copy so callers can't mutate our internal state.
    return [...this.sessions];
  }
}
