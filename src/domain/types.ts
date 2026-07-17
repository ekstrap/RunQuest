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
 * Run type — the movement pattern chosen before a session starts (DESIGN.md
 * §3.9). Walk/run interval is the beginner-friendly default; "just run" / "just
 * walk" turn the app into a plain timer + map. Only interval mode emits walk/run
 * audio cues; the three modes otherwise share the same calm in-run screen.
 */
export type RunType = 'interval' | 'just-run' | 'just-walk';

/**
 * A completed session record. Time is the completion contract (§3.5, §3.9): a
 * session counts because the user spent the time, not because of any GPS reading.
 * GPS feeds the live map and the post-run distance celebration only and is never
 * a completion gate — so distance is nullable (absent when GPS is unavailable).
 * Distance is never an input to XP or calibration.
 */
export interface SessionRecord {
  /** Which movement pattern the session used. */
  mode: RunType;
  /** When the session started (epoch milliseconds). */
  startedAt: number;
  /** Completed elapsed time in seconds. */
  durationSeconds: number;
  /** Post-run GPS distance in meters, or null when GPS was unavailable. */
  distanceMeters: number | null;
  /**
   * True for an off-plan / free run — one the user chose to do outside the
   * week's prescribed sessions (DESIGN.md §3.6, issue #10). A free run earns a
   * small flat XP amount, never advances week progress or grants the week bonus,
   * and is never penalized in any counter. Absent/false means an ordinary
   * on-plan (prescribed) session. Weekly-completion counters (week/streak/
   * lifetime) exclude off-plan sessions; run history still shows them.
   */
  offPlan?: boolean;
}

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
 * Calibration state — the readiness/ability track (DESIGN.md §3.20), decoupled
 * from the XP/level reward track. It is a single invisible `step` index into a
 * monotonic ladder of prescriptions (walk-heavy/short → run-heavy/longer). The
 * step is **never rendered as a number** — surfacing an ability score would
 * invite self-ranking (§3.20.4, anti-elitism); calibration is expressed only
 * through the current prescription and gentle step-up announcements.
 */
export interface CalibrationState {
  /** Rung on the calibration ladder. Higher = harder session. Never shown. */
  step: number;
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
