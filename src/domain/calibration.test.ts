import { prescriptionForBracket } from './calibration';

// AC5 — the calibration engine maps a bracket to its starting prescription.
// Exercised only through the public function; the numbers are placeholders the
// owner replaces later (DESIGN.md §3.14), so these expectations pin the current
// table, not a permanent contract.
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
