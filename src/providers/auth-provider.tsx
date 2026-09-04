import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AuthClient, AuthProviderId, AuthUser } from '@/src/auth/auth-client';

/**
 * Whether the initial "is anyone signed in?" read has finished. Screens that
 * gate on account state wait for 'ready' so an anonymous flash never causes a
 * signed-in user to be shown the account prompt again.
 */
type AuthStatus = 'loading' | 'ready';

interface AuthContextValue {
  /** The signed-in user, or null for an anonymous ("Just run") user. */
  user: AuthUser | null;
  /**
   * True once the initial session read has completed. Until then `user` is not
   * yet meaningful — consumers that gate on account state must wait, or a
   * signed-in user would briefly be treated as anonymous.
   */
  isReady: boolean;
  /** Whether this build can complete sign-in with the given provider. */
  isProviderAvailable(provider: AuthProviderId): boolean;
  signIn(provider: AuthProviderId): Promise<AuthUser>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /** The auth boundary to inject. Tests pass a FakeAuthClient. */
  client: AuthClient;
}

/**
 * Holds sign-in state for the tree and keeps it in step with the AuthClient.
 *
 * Anonymous is a first-class state, never an error: the app renders and runs
 * fully with `user === null` (DESIGN.md §3.12), and nothing here gates the
 * running experience on having an account.
 */
export function AuthProvider({ children, client }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;

    client.getCurrentUser().then((current) => {
      if (active) {
        setUser(current);
        setStatus('ready');
      }
    });

    // Keeps the tree correct when the session changes underneath us — a token
    // refresh failure, or a sign-in that started on another screen.
    const unsubscribe = client.subscribe((next) => {
      if (active) {
        setUser(next);
        setStatus('ready');
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady: status === 'ready',
      isProviderAvailable: (provider) => client.isProviderAvailable(provider),
      signIn: async (provider) => {
        const signedIn = await client.signIn(provider);
        setUser(signedIn);
        return signedIn;
      },
      signOut: async () => {
        await client.signOut();
        setUser(null);
      },
    }),
    [client, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the auth state. Throws if used outside an AuthProvider. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}
