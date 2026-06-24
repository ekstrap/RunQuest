import { buildCueSchedule } from './interval-cues';
import type { Prescription } from './types';

/** A compact prescription: 3-minute session, 60s walk / 30s run cycle. */
const SHORT: Prescription = { durationMinutes: 3, walkSeconds: 60, runSeconds: 30 };

describe('buildCueSchedule', () => {
  it('starts by walking (warm-up) at second 0', () => {
    const [first] = buildCueSchedule(SHORT);
    expect(first).toEqual({ atSecond: 0, phase: 'walk', durationSeconds: 60 });
  });

  it('alternates walk and run at the prescription cadence', () => {
    // 3 min = 180s. walk 60 / run 30 cycle:
    // 0 walk, 60 run, 90 walk, 150 run, (180 would be walk but == total → dropped)
    expect(buildCueSchedule(SHORT)).toEqual([
      { atSecond: 0, phase: 'walk', durationSeconds: 60 },
      { atSecond: 60, phase: 'run', durationSeconds: 30 },
      { atSecond: 90, phase: 'walk', durationSeconds: 60 },
      { atSecond: 150, phase: 'run', durationSeconds: 30 },
    ]);
  });

  it('emits no cue for a phase that begins at or after the total duration', () => {
    const schedule = buildCueSchedule(SHORT);
    const totalSeconds = SHORT.durationMinutes * 60;
    expect(schedule.every((event) => event.atSecond < totalSeconds)).toBe(true);
  });

  it('handles the never-run starting prescription (10 min, 60/30)', () => {
    const schedule = buildCueSchedule({ durationMinutes: 10, walkSeconds: 60, runSeconds: 30 });
    expect(schedule).toHaveLength(13);
    expect(schedule[0]).toEqual({ atSecond: 0, phase: 'walk', durationSeconds: 60 });
    expect(schedule[schedule.length - 1]).toEqual({
      atSecond: 540,
      phase: 'walk',
      durationSeconds: 60,
    });
  });

  it('carries each phase own duration so a cue can name it', () => {
    const balanced: Prescription = { durationMinutes: 2, walkSeconds: 45, runSeconds: 45 };
    expect(buildCueSchedule(balanced)).toEqual([
      { atSecond: 0, phase: 'walk', durationSeconds: 45 },
      { atSecond: 45, phase: 'run', durationSeconds: 45 },
      { atSecond: 90, phase: 'walk', durationSeconds: 45 },
    ]);
  });
});
