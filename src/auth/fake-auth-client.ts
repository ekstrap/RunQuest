import {
  ProviderNotConfiguredError,
  type AuthClient,
  type AuthProviderId,
  type AuthUser,
} from './auth-client';

/**
 * In-process AuthClient for tests and for running the account screens without a
 * network. Sign-in succeeds instantly and mints a local user id.
 *
 * `availableProviders` defaults to both, so tests exercise the *signed-in* paths
 * that the shipped build can't reach yet; pass `[]` to reproduce today's
 * unconfigured build and assert the honest "not available" copy.
 */
export class FakeAuthClient implements AuthClient {
  private user: AuthUser | null;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  /** Per-instance, so ids can't leak between tests. */
  private nextId = 0;

  constructor(
    private readonly availableProviders: AuthProviderId[] = ['apple', 'google'],
    initialUser: AuthUser | null = null,
  ) {
    this.user = initialUser;
  }

  isProviderAvailable(provider: AuthProviderId): boolean {
    return this.availableProviders.includes(provider);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signIn(provider: AuthProviderId): Promise<AuthUser> {
    if (!this.isProviderAvailable(provider)) {
      throw new ProviderNotConfiguredError(provider);
    }
    this.user = { id: `fake-user-${(this.nextId += 1)}`, provider };
    this.listeners.forEach((listener) => listener(this.user));
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
    this.listeners.forEach((listener) => listener(null));
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
