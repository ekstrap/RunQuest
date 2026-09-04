import {
  ProviderNotConfiguredError,
  type AuthClient,
  type AuthProviderId,
  type AuthUser,
} from './auth-client';
import {
  unconfiguredIdentityTokenProvider,
  type IdentityTokenProvider,
} from './identity-token-provider';

/** Shape of an auth user as Supabase returns it (only the fields we read). */
interface SupabaseUser {
  id: string;
  app_metadata?: { provider?: string };
}

/** A Supabase result envelope: data on success, error on failure. */
interface SupabaseResult<T> {
  data: T;
  error: { message: string } | null;
}

/**
 * The slice of supabase-js's `auth` API this client uses. Declaring it as our
 * own narrow interface (rather than importing SupabaseClient['auth']) is what
 * lets the exchange logic be tested with a small stub, and documents exactly
 * how much of the SDK we depend on.
 */
export interface SupabaseAuthApi {
  /**
   * Reads the *stored* session. Deliberately not `getUser()`, which validates
   * against the server: a signed-in user launching the app with no signal must
   * still be recognised as signed in, or they'd silently drop to anonymous
   * local-only mode and be told to create an account they already have.
   */
  getSession(): Promise<SupabaseResult<{ session: { user: SupabaseUser } | null }>>;
  signInWithIdToken(credentials: {
    provider: AuthProviderId;
    token: string;
    nonce?: string;
  }): Promise<SupabaseResult<{ user: SupabaseUser | null }>>;
  signOut(): Promise<{ error: { message: string } | null }>;
  onAuthStateChange(
    callback: (event: string, session: { user: SupabaseUser } | null) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
}

/** Narrow a raw provider string from Supabase metadata to a known provider. */
function parseProvider(raw: string | undefined): AuthProviderId | null {
  return raw === 'apple' || raw === 'google' ? raw : null;
}

function toAuthUser(user: SupabaseUser, provider?: AuthProviderId): AuthUser {
  return { id: user.id, provider: provider ?? parseProvider(user.app_metadata?.provider) };
}

/**
 * The production AuthClient: Supabase auth, driven by identity tokens from
 * Apple's / Google's native sign-in sheets.
 *
 * Sign-in is a two-step exchange — the native SDK proves who the user is and
 * returns an identity token; Supabase verifies that token and issues a session.
 * Only the first step needs developer credentials, and it lives behind
 * `IdentityTokenProvider`. The shipped default is
 * `unconfiguredIdentityTokenProvider`, so today `isProviderAvailable` is false
 * for both providers and `signIn` refuses honestly rather than half-failing
 * somewhere deeper. Swapping in a real token provider turns sign-in on with no
 * other change here.
 */
export class SupabaseAuthClient implements AuthClient {
  constructor(
    private readonly auth: SupabaseAuthApi,
    private readonly tokens: IdentityTokenProvider = unconfiguredIdentityTokenProvider,
  ) {}

  isProviderAvailable(provider: AuthProviderId): boolean {
    return this.tokens.isAvailable(provider);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data, error } = await this.auth.getSession();
    // No session is the normal anonymous case, not an exceptional one: a
    // missing or unreadable session must leave the user running, never blocked.
    if (error || !data.session) {
      return null;
    }
    return toAuthUser(data.session.user);
  }

  async signIn(provider: AuthProviderId): Promise<AuthUser> {
    if (!this.isProviderAvailable(provider)) {
      throw new ProviderNotConfiguredError(provider);
    }

    const { idToken, nonce } = await this.tokens.getIdentityToken(provider);
    const { data, error } = await this.auth.signInWithIdToken({
      provider,
      token: idToken,
      nonce,
    });
    if (error) {
      throw new Error(error.message);
    }
    if (!data.user) {
      throw new Error('Sign-in returned no user.');
    }
    return toAuthUser(data.user, provider);
  }

  async signOut(): Promise<void> {
    const { error } = await this.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    const { data } = this.auth.onAuthStateChange((_event, session) => {
      listener(session ? toAuthUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }
}
