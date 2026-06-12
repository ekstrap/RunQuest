import type { ProgressionState } from '@/src/domain/types';
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

  constructor(initial: ProgressionState = INITIAL_PROGRESSION) {
    this.progression = initial;
  }

  async getProgressionState(): Promise<ProgressionState> {
    return this.progression;
  }
}
