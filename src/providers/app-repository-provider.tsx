import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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

  // createRemote is an injection point, not reactive state: only *who is signed
  // in* should rebuild the repository. Holding it in a ref means a parent that
  // re-renders with an inline factory can't retrigger a whole re-sync.
  const createRemoteRef = useRef(createRemote);
  createRemoteRef.current = createRemote;

  // Built together so the component never has to downcast to reach hydrate():
  // it stays bound to the Repository interface, and `sync` is a plain callback
  // that is simply a no-op when there's no cloud to sync with.
  const { repository, sync } = useMemo<{ repository: Repository; sync: () => Promise<void> }>(() => {
    const remote = user ? createRemoteRef.current() : null;
    if (!user || !remote) {
      return { repository: local, sync: async () => {} };
    }
    const syncing = new SyncingRepository(local, remote, user.id);
    return { repository: syncing, sync: () => syncing.hydrate() };
  }, [local, user]);

  // Gate the *first* render until the initial sync has been attempted, so a
  // signed-in user on a reinstalled phone never sees "level 1, no runs" before
  // their real history arrives. hydrate() resolves even offline, so this can't
  // hang. Later re-syncs (e.g. signing in mid-session) keep the current screen
  // on-screen instead of blanking the app while they run.
  const [ready, setReady] = useState(false);
  const hasRendered = useRef(false);
  useEffect(() => {
    // Wait for auth to settle first. Syncing before we know who is signed in
    // would run against the anonymous local repository and then count as a
    // completed first sync, letting the app render local-only data to a user
    // whose real history is still on its way.
    if (!isReady) {
      return;
    }
    let active = true;
    sync().then(() => {
      if (active) {
        hasRendered.current = true;
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [isReady, sync]);

  if (!(ready || hasRendered.current)) {
    return null;
  }

  return <RepositoryProvider repository={repository}>{children}</RepositoryProvider>;
}
