/**
 * Core domain types. Vocabulary follows the glossary in docs/DESIGN.md §6.
 */

/**
 * Progression state — the reward track (XP / level). Showing-up-driven; never
 * influenced by pace, distance, PRs, or calibration (see PRD §3.20). XP/level
 * is the only progression number surfaced in the UI.
 */
export interface ProgressionState {
  /** Total XP earned across the user's lifetime. */
  xpTotal: number;
  /** Current level, derived from xpTotal. Starts at 1. */
  level: number;
}

/**
 * Activity bracket — the user's self-rated starting point, captured in
 * onboarding. Sets the *starting calibration* (session difficulty), decoupled
 * from the XP/level reward track (DESIGN.md §3.20). Not a fitness test; the
 * self-correcting machinery in §3.20.3 absorbs an imperfect first guess.
 */
export type Bracket = 'never-run' | 'run-occasionally' | 'getting-back';

/** Weekly commitment — sessions per week that count as a complete week (§3.20). */
export type WeeklyCommitment = 2 | 3;

/**
 * Prescription — what a single session asks of the user: a duration and a
 * walk/run interval. The walk/run *ratio* (DESIGN.md §3.14: more-walking →
 * balanced → more-running) emerges from the walk/run seconds. These are the
 * concrete numbers the future in-run audio cues consume.
 */
export interface Prescription {
  /** Total session length in minutes. */
  durationMinutes: number;
  /** Seconds spent walking in each walk/run cycle. */
  walkSeconds: number;
  /** Seconds spent running in each walk/run cycle. */
  runSeconds: number;
}

/**
 * Onboarding state — the two decoupled selections captured before the first run
 * (DESIGN.md §3.20): the activity bracket (sets starting calibration) and the
 * weekly commitment (sets the reward/target scale). Persisted via the
 * repository; its absence (null) means onboarding isn't complete.
 */
export interface OnboardingState {
  bracket: Bracket;
  weeklyCommitment: WeeklyCommitment;
}
