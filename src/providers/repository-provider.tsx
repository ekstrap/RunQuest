import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { InMemoryRepository } from '@/src/data/in-memory-repository';
import type { Repository } from '@/src/data/repository';

const RepositoryContext = createContext<Repository | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
  /**
   * The repository to inject. Tests pass an InMemoryRepository; production wires
   * the Supabase-backed one (later issue). Defaults to an in-memory instance so
   * the app runs offline before an account exists.
   */
  repository?: Repository;
}

/**
 * Injects a Repository into the tree — the dependency-injection seam that keeps
 * screens decoupled from the concrete storage implementation (PRD §"mock only
 * at system boundaries"; the repository is one such boundary).
 */
export function RepositoryProvider({ children, repository }: RepositoryProviderProps) {
  const value = useMemo(() => repository ?? new InMemoryRepository(), [repository]);
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

/** Read the injected Repository. Throws if used outside a RepositoryProvider. */
export function useRepository(): Repository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return repository;
}
