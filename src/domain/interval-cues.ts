import type { Prescription } from './types';

/** The two movement phases of a walk/run interval session. */
export type Phase = 'walk' | 'run';

/**
 * One walk↔run transition: the elapsed second at which the phase begins, the
 * phase to switch to, and how long that phase lasts (so an audio cue can say
 * "start running for X minutes"). These are the only events interval mode emits
 * — there is no encouragement or completion cue (DESIGN.md §3.9).
 */
export interface CueEvent {
  /** Elapsed seconds since the run started, at which this phase begins. */
  atSecond: number;
  /** The phase that begins at {@link atSecond}. */
  phase: Phase;
  /** How long this phase lasts, in seconds. */
  durationSeconds: number;
}

/**
 * Turn a {@link Prescription} into the ordered list of walk/run transitions for
 * one interval session. Pure and deterministic — "time" is an input, so this
 * needs no clock and is trivially testable (PRD module 5). The session **starts
 * walking** (a gentle warm-up) and alternates walk → run → walk … A cue is
 * emitted at the start of every phase that begins *before* the prescribed total
 * duration; a phase landing exactly at (or past) the total is dropped, and no
 * "you're done" cue is emitted — the run keeps going until the user ends it
 * (time is the completion contract, §3.9).
 */
export function buildCueSchedule(prescription: Prescription): CueEvent[] {
  const totalSeconds = prescription.durationMinutes * 60;
  const durationFor = (phase: Phase): number =>
    phase === 'walk' ? prescription.walkSeconds : prescription.runSeconds;

  const schedule: CueEvent[] = [];
  let atSecond = 0;
  let phase: Phase = 'walk';

  while (atSecond < totalSeconds) {
    const durationSeconds = durationFor(phase);
    schedule.push({ atSecond, phase, durationSeconds });
    atSecond += durationSeconds;
    phase = phase === 'walk' ? 'run' : 'walk';
  }

  return schedule;
}
