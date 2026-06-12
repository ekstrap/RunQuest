import type { Repository } from './repository';
import { InMemoryRepository } from './in-memory-repository';

describe('InMemoryRepository', () => {
  it('returns the seeded progression state (level 1, 0 XP) through the repository interface', async () => {
    const repository: Repository = new InMemoryRepository();

    const progression = await repository.getProgressionState();

    expect(progression).toEqual({ xpTotal: 0, level: 1 });
  });
});
