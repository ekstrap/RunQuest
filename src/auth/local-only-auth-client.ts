import {
  ProviderNotConfiguredError,
  type AuthClient,
  type AuthProviderId,
  type AuthUser,
} from './auth-client';

/**
 * The AuthClient used when the build has no Supabase project configured: there
 * is no account, and sign-in politely reports itself unavailable.
 *
 * This exists so "no backend configured" is an ordinary, fully working mode of
 * the app rather than a crash on launch — the running experience has never
 * depended on an account (DESIGN.md §3.12), and the code shouldn't pretend
 * otherwise.
 */
export const localOnlyAuthClient: AuthClient = {
  isProviderAvailable: () => false,
  getCurrentUser: async (): Promise<AuthUser | null> => null,
  signIn: (provider: AuthProviderId) => Promise.reject(new ProviderNotConfiguredError(provider)),
  signOut: async () => {},
  // Nothing can ever change, so there is nothing to unsubscribe from.
  subscribe: () => () => {},
};
