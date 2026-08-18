import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Repository } from '@/src/data/repository';
import type { RemoteStore } from '@/src/data/remote-store';
import { SyncingRepository } from '@/src/data/syncing-repository';
import { useAuth } from './auth-provider';
import { RepositoryProvider } from './repository-provider';

interface AppRepositoryProviderProps {
  children: ReactNode;
  /** The device-local store. Always the source of truth for reads. */
  local: Repository;
  /**
   * Builds the cloud store, or returns null when Supabase isn't configured in
   * this build. Called only when a user is signed in.
   */
  createRemote: () => RemoteStore | null;
}

/**
 * Chooses which Repository the app runs on, based on whether anyone is signed
 * in, and injects it.
 *
 * - Anonymous ("Just run"): the local repository, unchanged. Complete and fully
 *   functional — no account, no network, nothing withheld (DESIGN.md §3.12).
 * - Signed in: the same local repository wrapped in SyncingRepository, so reads
 *   stay instant and offline-safe while writes mirror to the cloud.
 *
 * Signing in swaps the repository *around* the same local store rather than
 * replacing it, which is what lets a user's anonymous history come with them:
 * `hydrate()` then pushes those runs up into the new account.
 */
export function AppRepositoryProvider({
  children,
  local,
  createRemote,
}: AppRepositoryProviderProps) {
  const { user, isReady } = useAuth();

  const repository = useMemo<Repository>(() => {
    if (!user) {
      return local;
    }
    const remote = createRemote();
    return remote ? new SyncingRepository(local, remote, user.id) : local;
    // createRemote is a stable factory from the caller; re-running on identity
    // change is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, user]);

  // Gate rendering until the first sync has been attempted, so a signed-in user
  // on a reinstalled phone never sees "level 1, no runs" before their real
  // history arrives. hydrate() resolves even offline, so this can't hang.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    if (!(repository instanceof SyncingRepository)) {
      setHydrated(true);
      return;
    }
    setHydrated(false);
    repository.hydrate().then(() => {
      if (active) {
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  if (!isReady || !hydrated) {
    return null;
  }

  return <RepositoryProvider repository={repository}>{children}</RepositoryProvider>;
}
