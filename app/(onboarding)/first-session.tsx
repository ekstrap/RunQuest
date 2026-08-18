import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { prescriptionForBracket } from '@/src/domain/calibration';
import type { Bracket, WeeklyCommitment } from '@/src/domain/types';
import { useAuth } from '@/src/providers/auth-provider';
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
 * the two onboarding selections through the repository, then — for a user with
 * no account — shows the deferred account prompt (DESIGN.md §3.12).
 *
 * The prompt is an *offer*, not a gate: "Just run" is a first-class choice that
 * costs the user nothing, because local storage keeps their progress fully
 * working without an account. So the copy explains the one real difference (the
 * data lives only on this phone) rather than implying the run won't be saved.
 * Selections are persisted *before* the prompt, so whichever button is pressed —
 * or if the user backgrounds the app mid-decision — nothing is lost.
 *
 * Params arrive as strings over the router, so they're parsed/guarded back to
 * the typed Bracket / WeeklyCommitment here.
 */
export default function FirstSessionScreen() {
  const router = useRouter();
  const repository = useRepository();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ bracket: string; weeklyCommitment: string }>();
  const [promptVisible, setPromptVisible] = useState(false);

  const bracket = parseBracket(params.bracket);
  const weeklyCommitment = parseWeeklyCommitment(params.weeklyCommitment);
  const prescription = prescriptionForBracket(bracket);

  async function handleStart() {
    await repository.saveOnboarding({ bracket, weeklyCommitment });
    if (user) {
      router.replace('/home');
      return;
    }
    setPromptVisible(true);
  }

  function handleJustRun() {
    setPromptVisible(false);
    router.replace('/home');
  }

  function handleCreateAccount() {
    setPromptVisible(false);
    router.push('/sign-in');
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

      {/*
        An in-screen overlay rather than a <Modal>: a Modal renders through a
        portal that outlives this screen when we navigate away, leaving the
        prompt floating over the home screen. An overlay unmounts with the route
        it belongs to, which is the behaviour this flow actually wants.
      */}
      {promptVisible ? (
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetHeading}>This is your first run!</Text>
            <Text style={styles.sheetBody}>
              Your progress is saved only on this phone. Create an account and it&apos;s backed
              up, so a new phone picks up right where you left off.
            </Text>
            <Pressable style={styles.button} onPress={handleCreateAccount}>
              <Text style={styles.buttonText}>Create account</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleJustRun}>
              <Text style={styles.secondaryButtonText}>Just run</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  sheetHeading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetBody: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
  },
});
