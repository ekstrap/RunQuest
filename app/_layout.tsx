import { Stack } from 'expo-router';

import { LocationProvider } from '@/src/providers/location-provider';
import { RepositoryProvider } from '@/src/providers/repository-provider';

/**
 * Root navigation shell. A single Stack for now; stats routes land in later
 * issues. The whole tree is wrapped in RepositoryProvider (the storage boundary)
 * and LocationProvider (the GPS boundary) so any screen can read through those
 * injected interfaces.
 */
export default function RootLayout() {
  return (
    <RepositoryProvider>
      <LocationProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ title: 'RunQuest' }} />
          <Stack.Screen name="run" options={{ headerShown: false }} />
        </Stack>
      </LocationProvider>
    </RepositoryProvider>
  );
}
