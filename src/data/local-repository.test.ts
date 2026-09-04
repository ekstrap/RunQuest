import { InMemoryKeyValueStore } from './key-value-store';
import { LocalRepository } from './local-repository';

describe('LocalRepository', () => {
  it('restores progression, onboarding, calibration and sessions after a restart', async () => {
    const store = new InMemoryKeyValueStore();
    const beforeRestart = new LocalRepository(store);
    await beforeRestart.saveProgression({ xpTotal: 420, level: 5 });
    await beforeRestart.saveOnboarding({ bracket: 'run-occasionally', weeklyCommitment: 3 });
    await beforeRestart.saveCalibration({ step: 2 });
    await beforeRestart.saveSession({
      mode: 'interval',
      startedAt: 1_700_000_000_000,
      durationSeconds: 600,
      distanceMeters: 1100,
    });

    // A new repository over the same device store is what a relaunch looks like.
    const afterRestart = new LocalRepository(store);

    expect(await afterRestart.getProgressionState()).toEqual({ xpTotal: 420, level: 5 });
    expect(await afterRestart.getOnboardingState()).toEqual({
      bracket: 'run-occasionally',
      weeklyCommitment: 3,
    });
    expect(await afterRestart.getCalibrationState()).toEqual({ step: 2 });
    expect(await afterRestart.getSessions()).toHaveLength(1);
  });

  it('falls back to a fresh user rather than throwing when stored JSON is corrupt', async () => {
    const store = new InMemoryKeyValueStore();
    await store.setItem('runquest:progression', 'not json');
    await store.setItem('runquest:sessions', '{"not":"an array"}');
    const repository = new LocalRepository(store);

    expect(await repository.getProgressionState()).toEqual({ xpTotal: 0, level: 1 });
    expect(await repository.getSessions()).toEqual([]);
  });
});
