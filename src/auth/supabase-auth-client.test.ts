import { ProviderNotConfiguredError, type AuthUser } from './auth-client';
import type { IdentityTokenProvider } from './identity-token-provider';
import { SupabaseAuthClient, type SupabaseAuthApi } from './supabase-auth-client';

/** A stub of the narrow slice of supabase-js's auth API the client uses. */
function fakeAuthApi(overrides: Partial<SupabaseAuthApi> = {}): SupabaseAuthApi {
  return {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    signInWithIdToken: jest.fn(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    })),
    signOut: jest.fn(async () => ({ error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    ...overrides,
  };
}

/** A token provider standing in for a build with Apple/Google wired up. */
const configuredTokens: IdentityTokenProvider = {
  isAvailable: () => true,
  getIdentityToken: async () => ({ idToken: 'id-token', nonce: 'raw-nonce' }),
};

describe('SupabaseAuthClient', () => {
  describe('with no native credentials configured (the shipped default)', () => {
    it('reports both providers unavailable', () => {
      const client = new SupabaseAuthClient(fakeAuthApi());

      expect(client.isProviderAvailable('apple')).toBe(false);
      expect(client.isProviderAvailable('google')).toBe(false);
    });

    it('rejects sign-in with ProviderNotConfiguredError instead of calling Supabase', async () => {
      const auth = fakeAuthApi();
      const client = new SupabaseAuthClient(auth);

      await expect(client.signIn('apple')).rejects.toBeInstanceOf(ProviderNotConfiguredError);
      expect(auth.signInWithIdToken).not.toHaveBeenCalled();
    });

    it('still reports the user as anonymous rather than failing', async () => {
      const client = new SupabaseAuthClient(fakeAuthApi());

      expect(await client.getCurrentUser()).toBeNull();
    });
  });

  describe('offline', () => {
    it('still recognises a signed-in user from the stored session', async () => {
      // getSession reads local storage; it must not need the network. A signed-in
      // user launching with no signal must not be demoted to anonymous.
      const auth = fakeAuthApi({
        getSession: jest.fn(async () => ({
          data: { session: { user: { id: 'user-3', app_metadata: { provider: 'google' } } } },
          error: null,
        })),
      });
      const client = new SupabaseAuthClient(auth);

      expect(await client.getCurrentUser()).toEqual<AuthUser>({
        id: 'user-3',
        provider: 'google',
      });
    });
  });

  describe('with a configured identity-token provider', () => {
    it('exchanges the provider identity token for a Supabase session', async () => {
      const auth = fakeAuthApi();
      const client = new SupabaseAuthClient(auth, configuredTokens);

      const user = await client.signIn('google');

      expect(auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'id-token',
        nonce: 'raw-nonce',
      });
      expect(user).toEqual<AuthUser>({ id: 'user-1', provider: 'google' });
    });

    it('surfaces a Supabase rejection as an error', async () => {
      const auth = fakeAuthApi({
        signInWithIdToken: jest.fn(async () => ({
          data: { user: null },
          error: { message: 'bad token' },
        })),
      });
      const client = new SupabaseAuthClient(auth, configuredTokens);

      await expect(client.signIn('apple')).rejects.toThrow('bad token');
    });
  });

  it('reports the restored user when a session already exists', async () => {
    const auth = fakeAuthApi({
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: 'user-7', app_metadata: { provider: 'apple' } } } },
        error: null,
      })),
    });
    const client = new SupabaseAuthClient(auth);

    expect(await client.getCurrentUser()).toEqual<AuthUser>({ id: 'user-7', provider: 'apple' });
  });

  it('reports a null provider when the session does not name one', async () => {
    const auth = fakeAuthApi({
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: 'user-9' } } },
        error: null,
      })),
    });
    const client = new SupabaseAuthClient(auth);

    expect(await client.getCurrentUser()).toEqual<AuthUser>({ id: 'user-9', provider: null });
  });

  it('signs out through Supabase', async () => {
    const auth = fakeAuthApi();
    const client = new SupabaseAuthClient(auth);

    await client.signOut();

    expect(auth.signOut).toHaveBeenCalled();
  });

  it('notifies subscribers of sign-in and sign-out, and unsubscribes cleanly', () => {
    const unsubscribe = jest.fn();
    let emit: Parameters<SupabaseAuthApi['onAuthStateChange']>[0] = () => {};
    const auth = fakeAuthApi({
      onAuthStateChange: jest.fn((callback: Parameters<SupabaseAuthApi['onAuthStateChange']>[0]) => {
        emit = callback;
        return { data: { subscription: { unsubscribe } } };
      }),
    });
    const client = new SupabaseAuthClient(auth);
    const listener = jest.fn();

    const stop = client.subscribe(listener);
    emit('SIGNED_IN', { user: { id: 'user-2', app_metadata: { provider: 'apple' } } });
    emit('SIGNED_OUT', null);
    stop();

    expect(listener).toHaveBeenNthCalledWith(1, { id: 'user-2', provider: 'apple' });
    expect(listener).toHaveBeenNthCalledWith(2, null);
    expect(unsubscribe).toHaveBeenCalled();
  });
});
