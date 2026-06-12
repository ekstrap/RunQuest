import { Stack } from 'expo-router';

/**
 * Onboarding navigation shell. A chromeless Stack (no header) so the four
 * welcome → bracket → schedule → first-session screens read as one clean,
 * focused flow that gets a newcomer to "ready to run" in ~60 seconds.
 */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
