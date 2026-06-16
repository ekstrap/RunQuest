import { Stack } from 'expo-router';

/**
 * Run navigation shell. Chromeless (no header) so the run-type picker and the
 * in-run screen read as one focused, immersive flow — in line with §3.9 ("the
 * app disappears" while running).
 */
export default function RunLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
