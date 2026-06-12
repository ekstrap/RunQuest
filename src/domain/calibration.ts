import type { Bracket, Prescription } from './types';

/**
 * Calibration engine. Maps the onboarding activity bracket to the *starting*
 * prescription (session difficulty) — the readiness-driven calibration track,
 * kept separate from the XP/level reward track (DESIGN.md §3.20). This issue
 * only sets the starting point; the auto-advance / nudge machinery (§3.20.3)
 * lands later and self-corrects from here.
 *
 * NOTE: these numbers are PLACEHOLDERS pending the owner's real values
 * (DESIGN.md §3.14). The walk/run ratio shifts from walk-heavy → balanced →
 * run-heavy as the bracket gets more experienced. `never-run` = 10 min matches
 * the DESIGN.md §3.12 example "Walk/run for 10 minutes".
 */
const PRESCRIPTIONS: Record<Bracket, Prescription> = {
  'never-run': { durationMinutes: 10, walkSeconds: 60, runSeconds: 30 },
  'run-occasionally': { durationMinutes: 20, walkSeconds: 45, runSeconds: 45 },
  'getting-back': { durationMinutes: 25, walkSeconds: 30, runSeconds: 60 },
};

/** Return the starting prescription for a self-rated activity bracket. */
export function prescriptionForBracket(bracket: Bracket): Prescription {
  return PRESCRIPTIONS[bracket];
}
