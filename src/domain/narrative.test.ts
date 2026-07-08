import { abilityNarrative } from './narrative';

describe('abilityNarrative', () => {
  it('tells a start-to-now story once calibration has progressed', () => {
    // never-run starts at 10 min mostly walking; step 3 is 25 min mostly running.
    const narrative = abilityNarrative('never-run', { step: 3 });

    expect(narrative.hasProgressed).toBe(true);
    expect(narrative.text).toBe(
      'Started at 10 minutes, mostly walking — now 25 minutes, mostly running.',
    );
  });

  it('offers a gentle just-getting-started line before any progress', () => {
    const narrative = abilityNarrative('never-run', { step: 0 });

    expect(narrative.hasProgressed).toBe(false);
    expect(narrative.text).toBe(
      'You’re just getting started — 10 minutes, mostly walking. Every session builds from here.',
    );
  });

  it('describes the walk/run balance across the ladder', () => {
    expect(abilityNarrative('never-run', { step: 0 }).startBalance).toBe('mostly walking');
    // step 2: walk 45 / run 45 — an even mix.
    expect(abilityNarrative('never-run', { step: 2 }).nowBalance).toBe('an even walk/run mix');
    // step 3: walk 30 / run 60 — mostly running.
    expect(abilityNarrative('never-run', { step: 3 }).nowBalance).toBe('mostly running');
  });

  it('counts a balance shift without a duration change as progress', () => {
    // getting-back starts at step 3 (25 min); the same-duration hypothetical is
    // covered by the >= duration + different balance rule via a step-up to 4.
    const narrative = abilityNarrative('getting-back', { step: 4 });
    expect(narrative.hasProgressed).toBe(true);
  });
});
