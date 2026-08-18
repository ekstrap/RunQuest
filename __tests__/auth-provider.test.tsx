import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { FakeAuthClient } from '@/src/auth/fake-auth-client';
import { AuthProvider, useAuth } from '@/src/providers/auth-provider';

/** A probe component that renders the auth state the provider exposes. */
function AuthProbe() {
  const { user, status, signIn, signOut } = useAuth();

  return (
    <>
      <Text>{status === 'loading' ? 'Loading' : (user?.provider ?? 'Anonymous')}</Text>
      <Pressable onPress={() => signIn('apple')}>
        <Text>Sign in</Text>
      </Pressable>
      <Pressable onPress={() => signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </>
  );
}

function renderProbe(client: FakeAuthClient) {
  return render(
    <AuthProvider client={client}>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  it('settles on anonymous when no session exists', async () => {
    renderProbe(new FakeAuthClient());

    expect(await screen.findByText('Anonymous')).toBeTruthy();
  });

  it('restores an existing session on launch', async () => {
    renderProbe(new FakeAuthClient(['apple'], { id: 'user-1', provider: 'apple' }));

    expect(await screen.findByText('apple')).toBeTruthy();
  });

  it('exposes the signed-in user after signing in, and drops it on sign-out', async () => {
    const client = new FakeAuthClient();
    renderProbe(client);
    await screen.findByText('Anonymous');

    await act(async () => {
      await client.signIn('apple');
    });
    expect(await screen.findByText('apple')).toBeTruthy();

    await act(async () => {
      await client.signOut();
    });
    await waitFor(() => expect(screen.getByText('Anonymous')).toBeTruthy());
  });
});
