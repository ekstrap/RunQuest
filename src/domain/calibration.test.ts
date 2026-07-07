import {
  advanceOnWeekComplete,
  easeOff,
  initialCalibration,
  prescriptionForBracket,
  prescriptionForCalibration,
  stepUp,
} from './calibration';

// The calibration engine is exercised only through its public functions; the
// numbers are placeholders the owner replaces later (DESIGN.md §3.14), so these
// expectations pin the current ladder, not a permanent contract.

// AC5 — the calibration engine maps a bracket to its starting prescription.
// Kept green from before the ladder existed: brackets are just starting rungs.
describe('prescriptionForBracket', () => {
  it('prescribes a gentle short walk-heavy session for "never-run"', () => {
    expect(prescriptionForBracket('never-run')).toEqual({
      durationMinutes: 10,
      walkSeconds: 60,
      runSeconds: 30,
    });
  });

  it('prescribes a balanced session for "run-occasionally"', () => {
    expect(prescriptionForBracket('run-occasionally')).toEqual({
      durationMinutes: 20,
      walkSeconds: 45,
      runSeconds: 45,
    });
  });

  it('prescribes a longer run-heavy session for "getting-back"', () => {
    expect(prescriptionForBracket('getting-back')).toEqual({
      durationMinutes: 25,
      walkSeconds: 30,
      runSeconds: 60,
    });
  });
});

describe('initialCalibration', () => {
  it('starts "never-run" at the bottom rung (step 0)', () => {
    expect(initialCalibration('never-run')).toEqual({ step: 0 });
  });

  it('starts more-experienced brackets on higher rungs', () => {
    expect(initialCalibration('run-occasionally').step).toBeGreaterThan(
      initialCalibration('never-run').step,
    );
    expect(initialCalibration('getting-back').step).toBeGreaterThan(
      initialCalibration('run-occasionally').step,
    );
  });

  it('reproduces each bracket’s prescription from its starting rung', () => {
    for (const bracket of ['never-run', 'run-occasionally', 'getting-back'] as const) {
      expect(prescriptionForCalibration(initialCalibration(bracket))).toEqual(
        prescriptionForBracket(bracket),
      );
    }
  });
});

describe('prescriptionForCalibration', () => {
  it('grows the session as the step rises (longer, more running)', () => {
    const low = prescriptionForCalibration({ step: 0 });
    const high = prescriptionForCalibration({ step: 4 });

    expect(high.durationMinutes).toBeGreaterThan(low.durationMinutes);
    expect(high.runSeconds).toBeGreaterThan(low.runSeconds);
    expect(high.walkSeconds).toBeLessThan(low.walkSeconds);
  });

  it('clamps a step below the ladder to the bottom rung', () => {
    expect(prescriptionForCalibration({ step: -5 })).toEqual(
      prescriptionForCalibration({ step: 0 }),
    );
  });

  it('clamps a step above the ladder to the top rung', () => {
    expect(prescriptionForCalibration({ step: 999 })).toEqual(
      prescriptionForCalibration({ step: 999 - 1 }),
    );
    // Idempotent at the top: 999 and 1000 both land on the same top rung.
    expect(prescriptionForCalibration({ step: 1000 })).toEqual(
      prescriptionForCalibration({ step: 999 }),
    );
  });
});

describe('advanceOnWeekComplete', () => {
  it('steps up by exactly one rung when the week completed', () => {
    const { state, steppedUp } = advanceOnWeekComplete({ step: 1 }, true);

    expect(state).toEqual({ step: 2 });
    expect(steppedUp).toBe(true);
  });

  it('holds steady and never demotes when the week did not complete', () => {
    const { state, steppedUp } = advanceOnWeekComplete({ step: 3 }, false);

    expect(state).toEqual({ step: 3 });
    expect(steppedUp).toBe(false);
  });

  it('clamps at the top rung so it can’t run off the ladder', () => {
    // Walk to the top, then a completed week can advance no further.
    const top = stepUp({ step: 1000 });
    const { state, steppedUp } = advanceOnWeekComplete(top, true);

    expect(state).toEqual(top);
    expect(steppedUp).toBe(false);
  });
});

describe('easeOff', () => {
  it('steps down by one rung (immediate "too hard")', () => {
    expect(easeOff({ step: 3 })).toEqual({ step: 2 });
  });

  it('clamps at the bottom rung — never below step 0', () => {
    expect(easeOff({ step: 0 })).toEqual({ step: 0 });
  });
});

describe('stepUp', () => {
  it('steps up by one rung (immediate "too easy")', () => {
    expect(stepUp({ step: 1 })).toEqual({ step: 2 });
  });

  it('clamps at the top rung', () => {
    const top = stepUp({ step: 1000 });
    expect(stepUp(top)).toEqual(top);
  });
});
