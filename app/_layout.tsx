import { Stack } from 'expo-router';

import { localOnlyAuthClient } from '@/src/auth/local-only-auth-client';
import { SupabaseAuthClient } from '@/src/auth/supabase-auth-client';
import { asyncStorageStore } from '@/src/data/async-storage-store';
import { LocalRepository } from '@/src/data/local-repository';
import { getSupabaseClient } from '@/src/data/supabase-client';
import { SupabaseRemoteStore } from '@/src/data/supabase-remote-store';
import { AppRepositoryProvider } from '@/src/providers/app-repository-provider';
import { AuthProvider } from '@/src/providers/auth-provider';
import { CuePlayerProvider } from '@/src/providers/cue-player-provider';
import { LocationProvider } from '@/src/providers/location-provider';
import { expoCuePlayer } from '@/src/run/expo-cue-player';
import { expoLocationSource } from '@/src/run/expo-location-source';

/** Device storage — the source of truth for reads, with or without an account. */
const localRepository = new LocalRepository(asyncStorageStore);

/**
 * The auth boundary. Falls back to the local-only client when the build has no
 * Supabase project configured, so the app still runs (anonymously) either way.
 */
const supabase = getSupabaseClient();
const authClient = supabase ? new SupabaseAuthClient(supabase.auth) : localOnlyAuthClient;

/** The cloud store, or null when Supabase isn't configured in this build. */
function createRemoteStore() {
  return supabase ? new SupabaseRemoteStore(supabase) : null;
}

/**
 * Root navigation shell. A single Stack. The whole tree is wrapped in
 * AuthProvider (the sign-in boundary), AppRepositoryProvider (which picks
 * local-only or cloud-syncing storage based on whether anyone is signed in),
 * LocationProvider (the GPS boundary), and CuePlayerProvider (the audio
 * boundary) so any screen can read through those injected interfaces.
 */
export default function RootLayout() {
  return (
    <AuthProvider client={authClient}>
      <AppRepositoryProvider local={localRepository} createRemote={createRemoteStore}>
        <LocationProvider source={expoLocationSource}>
          <CuePlayerProvider player={expoCuePlayer}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
              <Stack.Screen name="home" options={{ title: 'RunQuest' }} />
              <Stack.Screen name="run" options={{ headerShown: false }} />
              <Stack.Screen name="stats" options={{ title: 'Your progress' }} />
              <Stack.Screen name="sign-in" options={{ title: 'Create account' }} />
            </Stack>
          </CuePlayerProvider>
        </LocationProvider>
      </AppRepositoryProvider>
    </AuthProvider>
  );
}
