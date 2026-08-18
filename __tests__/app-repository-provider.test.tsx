import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { InMemoryKeyValueStore } from '@/src/data/key-value-store';
import { LocalRepository } from '@/src/data/local-repository';
import { InMemoryRemoteStore } from '@/src/data/remote-store';
import { AppRepositoryProvider } from '@/src/providers/app-repository-provider';
import { AuthProvider } from '@/src/providers/auth-provider';
import { useRepository } from '@/src/providers/repository-provider';

/** Writes progression through whichever repository was injected, then shows it. */
function ProgressionProbe() {
  const repository = useRepository();
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    repository
      .saveProgression({ xpTotal: 250, level: 3 })
      .then(() => repository.getProgressionState())
      .then((state) => setXp(state.xpTotal));
  }, [repository]);

  return <Text>{xp === null ? 'Writing' : `XP ${xp}`}</Text>;
}

/** Counts mounts, to prove the tree isn't torn down and rebuilt. */
function makeMountCountingProbe() {
  const mounts = { count: 0 };
  function MountProbe() {
    useEffect(() => {
      mounts.count += 1;
    }, []);
    return <Text>Mounted</Text>;
  }
  return { mounts, MountProbe };
}

/** Only reads — used to prove what the first render already knows. */
function ReadOnlyProbe() {
  const repository = useRepository();
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    repository.getProgressionState().then((state) => setXp(state.xpTotal));
  }, [repository]);

  return <Text>{xp === null ? 'Reading' : `XP ${xp}`}</Text>;
}

function renderApp(
  client: FakeAuthClient,
  remote: InMemoryRemoteStore | null,
  Probe: () => React.JSX.Element = ProgressionProbe,
) {
  const local = new LocalRepository(new InMemoryKeyValueStore());
  render(
    <AuthProvider client={client}>
      <AppRepositoryProvider local={local} createRemote={() => remote}>
        <Probe />
      </AppRepositoryProvider>
    </AuthProvider>,
  );
  return local;
}

describe('AppRepositoryProvider', () => {
  it('keeps an anonymous user entirely on local storage', async () => {
    const remote = new InMemoryRemoteStore();
    const local = renderApp(new FakeAuthClient(), remote);

    expect(await screen.findByText('XP 250')).toBeTruthy();
    expect(await local.getProgressionState()).toEqual({ xpTotal: 250, level: 3 });
    expect(await remote.fetchProfile('fake-user-1')).toBeNull();
  });

  it('mirrors a signed-in user’s writes to the cloud', async () => {
    const remote = new InMemoryRemoteStore();
    renderApp(new FakeAuthClient(['apple'], { id: 'user-42', provider: 'apple' }), remote);

    expect(await screen.findByText('XP 250')).toBeTruthy();
    await waitFor(async () =>
      expect((await remote.fetchProfile('user-42'))?.progression).toEqual({
        xpTotal: 250,
        level: 3,
      }),
    );
  });

  it('restores cloud history before rendering, so a reinstall never shows level 1 first', async () => {
    const remote = new InMemoryRemoteStore();
    await remote.saveProfile('user-42', {
      progression: { xpTotal: 800, level: 7 },
      onboarding: null,
      calibration: null,
    });

    // A fresh install (empty local store) signed into an account with history.
    renderApp(
      new FakeAuthClient(['apple'], { id: 'user-42', provider: 'apple' }),
      remote,
      ReadOnlyProbe,
    );

    // 'XP 0' must never appear: nothing renders until hydrate() has finished.
    expect(await screen.findByText('XP 800')).toBeTruthy();
    expect(screen.queryByText('XP 0')).toBeNull();
  });

  it('carries anonymous runs into the account when the user signs in', async () => {
    const remote = new InMemoryRemoteStore();
    const client = new FakeAuthClient();
    const local = renderApp(client, remote);
    await screen.findByText('XP 250');
    await local.saveSession({
      mode: 'interval',
      startedAt: 1_700_000_000_000,
      durationSeconds: 600,
      distanceMeters: 900,
    });

    await act(async () => {
      await client.signIn('apple');
    });

    await waitFor(async () =>
      expect(await remote.fetchSessions('fake-user-1')).toHaveLength(1),
    );
  });

  it('keeps the app on screen while signing in mid-session', async () => {
    const client = new FakeAuthClient();
    const { mounts, MountProbe } = makeMountCountingProbe();
    renderApp(client, new InMemoryRemoteStore(), MountProbe);
    await screen.findByText('Mounted');
    expect(mounts.count).toBe(1);

    await act(async () => {
      await client.signIn('apple');
    });

    // Blanking the tree to re-sync would unmount and remount everything, which
    // the user sees as the app vanishing mid-tap.
    expect(screen.getByText('Mounted')).toBeTruthy();
    expect(mounts.count).toBe(1);
  });

  it('falls back to local-only when Supabase is not configured', async () => {
    const local = renderApp(
      new FakeAuthClient(['apple'], { id: 'user-42', provider: 'apple' }),
      null,
    );

    expect(await screen.findByText('XP 250')).toBeTruthy();
    expect(await local.getProgressionState()).toEqual({ xpTotal: 250, level: 3 });
  });
});
