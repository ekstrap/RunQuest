import { Stack } from 'expo-router';

import { RepositoryProvider } from '@/src/providers/repository-provider';

/**
 * Root navigation shell. A single Stack for now; onboarding and stats routes
 * land in later issues. The whole tree is wrapped in RepositoryProvider so any
 * screen can read through the repository interface (the storage boundary).
 */
export default function RootLayout() {
  return (
    <RepositoryProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'RunQuest' }} />
      </Stack>
    </RepositoryProvider>
  );
}
