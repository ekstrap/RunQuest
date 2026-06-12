import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { prescriptionForBracket } from '@/src/domain/calibration';
import type { Bracket, WeeklyCommitment } from '@/src/domain/types';
import { useRepository } from '@/src/providers/repository-provider';

const BRACKETS: Bracket[] = ['never-run', 'run-occasionally', 'getting-back'];

/** Narrow a raw route-param string to a Bracket, defaulting to the gentlest start. */
function parseBracket(raw: string | undefined): Bracket {
  return BRACKETS.includes(raw as Bracket) ? (raw as Bracket) : 'never-run';
}

/** Narrow a raw route-param string to a WeeklyCommitment (2 or 3). */
function parseWeeklyCommitment(raw: string | undefined): WeeklyCommitment {
  return raw === '3' ? 3 : 2;
}

/**
 * Onboarding screen 4 of 4 — first session. Shows the calibrated prescription
 * for the chosen bracket and a prominent Start button. Tapping Start persists
 * the two onboarding selections through the repository (local-only; account
 * creation is deferred, DESIGN.md §3.12) and drops the user on the home screen.
 * Params arrive as strings over the router, so they're parsed/guarded back to
 * the typed Bracket / WeeklyCommitment here.
 */
export default function FirstSessionScreen() {
  const router = useRouter();
  const repository = useRepository();
  const params = useLocalSearchParams<{ bracket: string; weeklyCommitment: string }>();

  const bracket = parseBracket(params.bracket);
  const weeklyCommitment = parseWeeklyCommitment(params.weeklyCommitment);
  const prescription = prescriptionForBracket(bracket);

  async function handleStart() {
    await repository.saveOnboarding({ bracket, weeklyCommitment });
    router.replace('/home');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Here&apos;s your first session</Text>
      <Text style={styles.prescription}>
        Walk/run for {prescription.durationMinutes} minutes
      </Text>
      <Text style={styles.subtitle}>Ready when you are.</Text>
      <Pressable style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>Start</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
  },
  prescription: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
  },
  button: {
    marginTop: 40,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
