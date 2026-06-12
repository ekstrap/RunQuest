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
