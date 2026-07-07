import type { Bracket, CalibrationState, Prescription } from './types';

/**
 * Calibration engine — the readiness/ability track (DESIGN.md §3.20), decoupled
 * from the XP/level reward track. Calibration is a monotonic **ladder** of
 * prescriptions: as the step rises the session gets longer and the walk/run
 * ratio shifts walk-heavy → balanced → run-heavy (the §3.20.4 narrative:
 * "started at 10 min mostly walking, now 25 mostly running"). The step index is
 * invisible state — never rendered as a number (§3.20.4, anti-elitism); only the
 * resulting `Prescription` and gentle step-up announcements surface.
 *
 * Movement rules (§3.20.3–4):
 *  - a **completed week** auto-advances by at most one rung (announced),
 *  - an off/partial week **holds steady — never auto-demotes** (§3.8),
 *  - an always-available manual control nudges either way (`stepUp` / `easeOff`).
 *
 * NOTE: these numbers are PLACEHOLDERS pending the owner's real values
 * (DESIGN.md §3.14). All three columns are monotonic across the ladder so the
 * prescription only ever gets harder as the step rises.
 */
const LADDER: Prescription[] = [
  { durationMinutes: 10, walkSeconds: 60, runSeconds: 30 }, // 0 — never-run start
  { durationMinutes: 15, walkSeconds: 55, runSeconds: 35 }, // 1
  { durationMinutes: 20, walkSeconds: 45, runSeconds: 45 }, // 2 — run-occasionally start
  { durationMinutes: 25, walkSeconds: 30, runSeconds: 60 }, // 3 — getting-back start
  { durationMinutes: 30, walkSeconds: 25, runSeconds: 65 }, // 4
  { durationMinutes: 35, walkSeconds: 20, runSeconds: 75 }, // 5
  { durationMinutes: 40, walkSeconds: 15, runSeconds: 80 }, // 6
];

const TOP_STEP = LADDER.length - 1;

/** Which rung each onboarding bracket starts on. Chosen so the ladder
 * reproduces the historical `prescriptionForBracket` outputs exactly. Duration
 * climbs in even 5-minute steps across the ladder. */
const BRACKET_START: Record<Bracket, number> = {
  'never-run': 0,
  'run-occasionally': 2,
  'getting-back': 3,
};

function clampStep(step: number): number {
  return Math.max(0, Math.min(TOP_STEP, step));
}

/** Starting calibration for a self-rated activity bracket. */
export function initialCalibration(bracket: Bracket): CalibrationState {
  return { step: BRACKET_START[bracket] };
}

/** The prescription for a calibration state (clamped to the ladder's ends). */
export function prescriptionForCalibration(state: CalibrationState): Prescription {
  return LADDER[clampStep(state.step)];
}

/**
 * Advance calibration at week completion. A completed week steps up by one rung
 * (clamped at the top); anything else holds the state unchanged. Never demotes.
 * `steppedUp` is true only when the rung actually moved — so a completed week at
 * the top rung reports no step-up and shows no announcement.
 */
export function advanceOnWeekComplete(
  state: CalibrationState,
  weekComplete: boolean,
): { state: CalibrationState; steppedUp: boolean } {
  if (!weekComplete || state.step >= TOP_STEP) {
    return { state, steppedUp: false };
  }
  return { state: { step: state.step + 1 }, steppedUp: true };
}

/** Immediate manual "too hard": step down one rung, clamped at the bottom. */
export function easeOff(state: CalibrationState): CalibrationState {
  return { step: clampStep(state.step - 1) };
}

/** Immediate manual "too easy": step up one rung, clamped at the top. */
export function stepUp(state: CalibrationState): CalibrationState {
  return { step: clampStep(state.step + 1) };
}

/**
 * Starting prescription for a self-rated bracket — a thin wrapper over the
 * ladder (each bracket is just a starting rung). Kept so the onboarding
 * first-session screen and its tests are undisturbed by the calibration ladder.
 */
export function prescriptionForBracket(bracket: Bracket): Prescription {
  return prescriptionForCalibration(initialCalibration(bracket));
}
