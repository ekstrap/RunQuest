import type { Repository } from './repository';
import { InMemoryRepository } from './in-memory-repository';

describe('InMemoryRepository', () => {
  it('returns the seeded progression state (level 1, 0 XP) through the repository interface', async () => {
    const repository: Repository = new InMemoryRepository();

    const progression = await repository.getProgressionState();

    expect(progression).toEqual({ xpTotal: 0, level: 1 });
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
});
