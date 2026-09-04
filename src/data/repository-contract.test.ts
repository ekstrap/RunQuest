import { InMemoryKeyValueStore } from './key-value-store';
import { InMemoryRepository } from './in-memory-repository';
import { LocalRepository } from './local-repository';
import { describeRepositoryContract } from './repository-contract';

describeRepositoryContract('InMemoryRepository', () => new InMemoryRepository());

describeRepositoryContract('LocalRepository', () => new LocalRepository(new InMemoryKeyValueStore()));
