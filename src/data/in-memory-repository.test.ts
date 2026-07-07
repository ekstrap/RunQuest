import type { Repository } from './repository';
import { InMemoryRepository } from './in-memory-repository';

describe('InMemoryRepository', () => {
  it('returns the seeded progression state (level 1, 0 XP) through the repository interface', async () => {
    const repository: Repository = new InMemoryRepository();

    const progression = await repository.getProgressionState();

    expect(progression).toEqual({ xpTotal: 0, level: 1 });
  });

  it('reflects the saved progression state after saveProgression', async () => {
    const repository: Repository = new InMemoryRepository();

    await repository.saveProgression({ xpTotal: 100, level: 2 });

    expect(await repository.getProgressionState()).toEqual({ xpTotal: 100, level: 2 });
  });

  it('has no onboarding state until onboarding is saved', async () => {
    const repository: Repository = new InMemoryRepository();

    expect(await repository.getOnboardingState()).toBeNull();
  });

  it('returns the saved onboarding selections after saveOnboarding', async () => {
    const repository: Repository = new InMemoryRepository();

    await repository.saveOnboarding({ bracket: 'never-run', weeklyCommitment: 2 });

    expect(await repository.getOnboardingState()).toEqual({
      bracket: 'never-run',
      weeklyCommitment: 2,
    });
  });

  it('has no calibration state until one is saved', async () => {
    const repository: Repository = new InMemoryRepository();

    expect(await repository.getCalibrationState()).toBeNull();
  });

  it('returns the saved calibration state after saveCalibration', async () => {
    const repository: Repository = new InMemoryRepository();

    await repository.saveCalibration({ step: 3 });

    expect(await repository.getCalibrationState()).toEqual({ step: 3 });
  });

  it('has no sessions until one is saved', async () => {
    const repository: Repository = new InMemoryRepository();

    expect(await repository.getSessions()).toEqual([]);
  });

  it('returns a saved session through the repository interface', async () => {
    const repository: Repository = new InMemoryRepository();

    await repository.saveSession({
      mode: 'just-run',
      startedAt: 1_000,
      durationSeconds: 600,
      distanceMeters: 1200,
    });

    expect(await repository.getSessions()).toEqual([
      { mode: 'just-run', startedAt: 1_000, durationSeconds: 600, distanceMeters: 1200 },
    ]);
  });

  it('preserves the order sessions were saved in (oldest first)', async () => {
    const repository: Repository = new InMemoryRepository();

    await repository.saveSession({
      mode: 'just-walk',
      startedAt: 1_000,
      durationSeconds: 300,
      distanceMeters: null,
    });
    await repository.saveSession({
      mode: 'interval',
      startedAt: 2_000,
      durationSeconds: 600,
      distanceMeters: 500,
    });

    const sessions = await repository.getSessions();
    expect(sessions.map((s) => s.startedAt)).toEqual([1_000, 2_000]);
  });

  it('round-trips a session completed without GPS (null distance)', async () => {
    const repository: Repository = new InMemoryRepository();

    await repository.saveSession({
      mode: 'just-walk',
      startedAt: 1_000,
      durationSeconds: 300,
      distanceMeters: null,
    });

    const [session] = await repository.getSessions();
    expect(session.distanceMeters).toBeNull();
  });

  it('does not expose its internal array for mutation', async () => {
    const repository: Repository = new InMemoryRepository();

    const sessions = await repository.getSessions();
    sessions.push({
      mode: 'just-run',
      startedAt: 1,
      durationSeconds: 1,
      distanceMeters: null,
    });

    expect(await repository.getSessions()).toEqual([]);
  });
});
