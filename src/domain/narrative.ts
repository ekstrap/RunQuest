/**
 * Ability narrative — the stats screen's story of progress (DESIGN.md §3.20.4):
 * "started at 10 min mostly walking, now 25 mostly running". Always a *story*,
 * never a score (anti-elitism): the only numbers allowed are minutes. Derived
 * from the two prescription points we persist — the bracket's starting rung and
 * the current calibration — rather than a stored prescription history.
 */

import { prescriptionForBracket, prescriptionForCalibration } from './calibration';
import type { Bracket, CalibrationState, Prescription } from './types';

export interface AbilityNarrative {
  startMinutes: number;
  startBalance: string;
  nowMinutes: number;
  nowBalance: string;
  hasProgressed: boolean;
  /** The ready-to-render story sentence. */
  text: string;
}

function balanceOf(prescription: Prescription): string {
  if (prescription.walkSeconds > prescription.runSeconds) return 'mostly walking';
  if (prescription.walkSeconds < prescription.runSeconds) return 'mostly running';
  return 'an even walk/run mix';
}

export function abilityNarrative(
  bracket: Bracket,
  calibration: CalibrationState,
): AbilityNarrative {
  const start = prescriptionForBracket(bracket);
  const now = prescriptionForCalibration(calibration);
  const startBalance = balanceOf(start);
  const nowBalance = balanceOf(now);
  const hasProgressed =
    now.durationMinutes > start.durationMinutes || nowBalance !== startBalance;

  const text = hasProgressed
    ? `Started at ${start.durationMinutes} minutes, ${startBalance} — now ${now.durationMinutes} minutes, ${nowBalance}.`
    : `You’re just getting started — ${now.durationMinutes} minutes, ${nowBalance}. Every session builds from here.`;

  return {
    startMinutes: start.durationMinutes,
    startBalance,
    nowMinutes: now.durationMinutes,
    nowBalance,
    hasProgressed,
    text,
  };
}
