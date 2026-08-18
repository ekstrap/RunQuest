import type {
  CalibrationState,
  OnboardingState,
  ProgressionState,
  SessionRecord,
} from '@/src/domain/types';

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

  /** Persist the user's progression state after awarding session XP. */
  saveProgression(state: ProgressionState): Promise<void>;

  /** Read persisted onboarding selections, or null if onboarding isn't complete. */
  getOnboardingState(): Promise<OnboardingState | null>;

  /** Persist the user's onboarding selections (bracket + weekly commitment). */
  saveOnboarding(state: OnboardingState): Promise<void>;

  /**
   * Read persisted calibration state, or null when none has been written yet.
   * Null means "fall back to the bracket's starting rung" (§3.20) — the first
   * auto-advance or manual adjust seeds it.
   */
  getCalibrationState(): Promise<CalibrationState | null>;

  /** Persist the user's calibration state (the invisible ability step). */
  saveCalibration(state: CalibrationState): Promise<void>;

  /** Persist a completed session record (time, mode, post-run distance). */
  saveSession(record: SessionRecord): Promise<void>;

  /** Read all completed session records, oldest first. */
  getSessions(): Promise<SessionRecord[]>;

  /**
   * Replace the whole session history with the given records, oldest first.
   * Used by cloud sync to write back the reconciled union of device and cloud
   * history; ordinary app flow only ever appends via `saveSession`.
   */
  replaceSessions(records: SessionRecord[]): Promise<void>;
}
