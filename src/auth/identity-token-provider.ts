import { ProviderNotConfiguredError, type AuthProviderId } from './auth-client';

/**
 * A native sign-in result: the identity token (a signed JWT proving who the
 * user is) that Apple's or Google's SDK hands back, plus the raw nonce Apple
 * requires be echoed back for verification.
 */
export interface IdentityToken {
  /** The provider-issued identity token (JWT), exchanged for a Supabase session. */
  idToken: string;
  /** The unhashed nonce, when the provider's flow used one (Apple does). */
  nonce?: string;
}

/**
 * IdentityTokenProvider — the *native sign-in SDK* boundary, split out from
 * AuthClient on purpose.
 *
 * Getting an identity token is the only part of sign-in that needs real Apple /
 * Google developer credentials and a native build; exchanging that token for a
 * session, mapping it to an AuthUser, and syncing data are all ordinary code we
 * own and test. Isolating the credential-dependent step here means the rest of
 * the account flow is complete and tested today, and turning sign-in on later is
 * a one-file change plus configuration — no rework of the flow around it.
 *
 * To enable sign-in for real (tracked as issue #22):
 *  1. Add the native SDKs — `expo-apple-authentication` and
 *     `@react-native-google-signin/google-signin` — and their config plugins.
 *  2. Create the Apple Service ID / key and the Google OAuth client IDs, and
 *     enable both providers in the Supabase dashboard (Authentication →
 *     Providers) with those credentials.
 *  3. Implement this interface over those SDKs and inject it in place of
 *     `unconfiguredIdentityTokenProvider` in `src/auth/supabase-auth-client.ts`.
 * Nothing else in the app has to change: `SupabaseAuthClient` already exchanges
 * the token via `signInWithIdToken`, and the account/sync flow is already built
 * on top of it.
 */
export interface IdentityTokenProvider {
  /** Whether this build can obtain a token from the given provider. */
  isAvailable(provider: AuthProviderId): boolean;

  /** Run the provider's native sign-in sheet and return its identity token. */
  getIdentityToken(provider: AuthProviderId): Promise<IdentityToken>;
}

/**
 * The provider used until real Apple/Google credentials are wired up: it
 * reports both providers unavailable and refuses to invent a token. The app is
 * fully functional with this in place — the account prompt says sign-in isn't
 * available yet and "Just run" carries the whole experience on local storage.
 */
export const unconfiguredIdentityTokenProvider: IdentityTokenProvider = {
  isAvailable: () => false,
  getIdentityToken: (provider) => Promise.reject(new ProviderNotConfiguredError(provider)),
};
