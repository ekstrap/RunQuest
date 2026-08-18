import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase connection details, read from the Expo public env vars (see
 * `.env.example`). `EXPO_PUBLIC_`-prefixed vars are inlined into the JS bundle
 * at build time — correct here, because the URL and the publishable (anon) key
 * are *designed* to ship in clients. They grant nothing on their own: every
 * table is protected by row-level security, so a request can only ever read or
 * write rows belonging to the signed-in user's own account. Never put a service
 * -role key in an `EXPO_PUBLIC_` var; it bypasses RLS entirely.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether this build has Supabase configured at all. When false the app runs
 * fully local-only — which is a supported mode (DESIGN.md §3.12), not an error
 * state, so the app must launch and run normally without these vars.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

/**
 * The shared Supabase client, created lazily on first use and reused after —
 * creating more than one per app would fight over the stored session.
 * Returns null when the project isn't configured, or when there is no runtime
 * for it to live in (see below).
 *
 * The auth session is persisted in AsyncStorage so a signed-in user stays signed
 * in across restarts. `detectSessionInUrl` is off because there's no browser URL
 * to parse in a native app.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  // Expo Router pre-renders web routes in Node, where there is no `window`.
  // The Supabase client reaches for browser storage and starts a token-refresh
  // timer as soon as it is constructed, both of which throw there. React Native
  // and real browsers both define `window`, so this only ever short-circuits the
  // server pass — which renders the app in its (perfectly valid) anonymous,
  // local-only mode.
  if (typeof window === 'undefined') {
    return null;
  }
  client ??= createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
