/**
 * The sign-in providers RunQuest supports. Apple and Google one-tap only —
 * no email/password, so the user never deals with passwords or password resets
 * (PRD user story 7, DESIGN.md §3.19).
 */
export type AuthProviderId = 'apple' | 'google';

/** Human-facing provider names, for prompt and error copy. */
export const PROVIDER_LABELS: Record<AuthProviderId, string> = {
  apple: 'Apple',
  google: 'Google',
};

/**
 * A signed-in identity. Deliberately minimal: the app needs an id to scope
 * cloud rows to, and the provider for UI copy. No name, email, or avatar — v1
 * has no profile and no social surface, and not collecting what we don't use is
 * the privacy-preserving default.
 */
export interface AuthUser {
  /** Stable account id (the Supabase auth user id). */
  id: string;
  /**
   * Which provider the account was created with, or null when the session
   * doesn't say. Used only for UI copy ("Signed in with Apple"), never for
   * behaviour — so an unknown provider degrades to a plainer sentence rather
   * than to a guess.
   */
  provider: AuthProviderId | null;
}

/**
 * Thrown when sign-in is attempted with a provider whose native credentials
 * aren't wired up in this build. This is a *configuration* state, not a user
 * error — the UI treats it as "not available yet" and keeps "Just run" fully
 * usable, never as a failure the user did something wrong to cause.
 */
export class ProviderNotConfiguredError extends Error {
  constructor(readonly provider: AuthProviderId) {
    super(`${PROVIDER_LABELS[provider]} sign-in is not configured in this build.`);
    this.name = 'ProviderNotConfiguredError';
  }
}

/**
 * AuthClient — the authentication boundary (PRD §"mock only at system
 * boundaries"). Screens depend on this interface, never on Supabase or on a
 * native sign-in SDK, so the account flow is testable with no network and no
 * device.
 *
 * Account creation is optional throughout (DESIGN.md §3.12): every method here
 * is additive, and an app where `getCurrentUser()` always returns null is a
 * complete app, not a degraded one.
 */
export interface AuthClient {
  /**
   * Whether this build can actually complete sign-in with the given provider.
   * False when the OAuth credentials aren't wired up yet — the UI uses this to
   * present the option honestly rather than dead-ending the user.
   */
  isProviderAvailable(provider: AuthProviderId): boolean;

  /** The signed-in user, or null for an anonymous ("Just run") user. */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Sign in (and, for a first-time identity, create the account) with one tap.
   * Throws ProviderNotConfiguredError when `isProviderAvailable` is false.
   */
  signIn(provider: AuthProviderId): Promise<AuthUser>;

  /** Sign out. Device-local data is untouched — the app keeps working. */
  signOut(): Promise<void>;

  /**
   * Observe sign-in state. Calls back with the new user (or null on sign-out)
   * and returns an unsubscribe function.
   */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
}
