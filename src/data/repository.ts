import type { OnboardingState, ProgressionState } from '@/src/domain/types';

/**
 * Repository — the storage boundary. A small interface that the product-rule
 * modules (XP/level, calibration, week/streak, etc.) depend on, decoupling all
 * logic from the network/DB (PRD §"Architecture & seams", DESIGN §3.19).
 *
 * Two implementations: an in-memory one for tests (and offline "just run"), and
 * a Supabase-backed one for production (added in a later issue). Both satisfy
 * this same contract — that contract, not the concrete class, is what logic and
 * tests bind to.
 *
 * Methods are async because the production implementation talks to the network;
 * the in-memory implementation resolves immediately. Kept deliberately minimal
 * for the scaffold — it grows (sessions, weeks, streak, lifetime) as the
 * features that need those reads/writes land.
 */
export interface Repository {
  /** Read the user's current progression state (XP total + level). */
  getProgressionState(): Promise<ProgressionState>;

  /** Read persisted onboarding selections, or null if onboarding isn't complete. */
  getOnboardingState(): Promise<OnboardingState | null>;

  /** Persist the user's onboarding selections (bracket + weekly commitment). */
  saveOnboarding(state: OnboardingState): Promise<void>;
}
