import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { prescriptionForBracket } from '@/src/domain/calibration';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type Bracket,
  type NotificationSettings,
  type WeeklyCommitment,
} from '@/src/domain/types';
import { useAuth } from '@/src/providers/auth-provider';
import { useNotificationPermissions } from '@/src/providers/notification-permissions-provider';
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
 * the two onboarding selections through the repository, then walks two asks in
 * order — the notification pre-prompt (§3.21.2), then, for a user with no
 * account, the deferred account prompt (§3.12) — before heading home.
 *
 * The notification ask lives here because this is the moment of commitment: the
 * user has invested three screens and is about to tap Start (§3.21.2). Our own
 * in-app pre-prompt is **mandatory and comes first**: the OS prompt is
 * irreversible, so a hesitant user must be able to decline something soft and
 * re-askable instead. "Not now" therefore never touches the OS at all.
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
  const permissions = useNotificationPermissions();
  const params = useLocalSearchParams<{ bracket: string; weeklyCommitment: string }>();
  /** Which of the two post-Start asks is on screen, if any. */
  const [prompt, setPrompt] = useState<'none' | 'notifications' | 'account'>('none');

  const bracket = parseBracket(params.bracket);
  const weeklyCommitment = parseWeeklyCommitment(params.weeklyCommitment);
  const prescription = prescriptionForBracket(bracket);

  async function handleStart() {
    await repository.saveOnboarding({ bracket, weeklyCommitment });
    // Single ask (§3.21.2): anyone who has already answered is never asked again
    // here — settings is where they change their mind.
    const notifications = await repository.getNotificationSettings();
    if (notifications === null || notifications.prePrompt === 'unasked') {
      setPrompt('notifications');
      return;
    }
    askAboutAccount();
  }

  /** The account offer only applies to a user without one; otherwise: run. */
  function askAboutAccount() {
    if (user) {
      setPrompt('none');
      router.replace('/home');
      return;
    }
    setPrompt('account');
  }

  /** Record the pre-prompt answer, then move on to the account offer. */
  async function answerPrePrompt(
    prePrompt: NotificationSettings['prePrompt'],
    osPermission: NotificationSettings['osPermission'],
  ) {
    await repository.saveNotificationSettings({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      prePrompt,
      osPermission,
    });
    askAboutAccount();
  }

  async function handleNotificationsYes() {
    await answerPrePrompt('accepted', await permissions.request());
  }

  async function handleNotificationsNotNow() {
    // Deliberately no permissions.request() — declining ours must leave the
    // one-shot OS prompt available for a later, warmer moment.
    await answerPrePrompt('not-now', await permissions.getStatus());
  }

  function handleJustRun() {
    setPrompt('none');
    router.replace('/home');
  }

  function handleCreateAccount() {
    setPrompt('none');
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
      {prompt === 'notifications' ? (
        <PromptSheet
          heading="Want a nudge now and then?"
          body="Gentle reminders when a session is waiting, and a little celebration when you finish. You're always in control — change this any time in settings."
          primaryLabel="Sounds good"
          onPrimary={handleNotificationsYes}
          secondaryLabel="Not now"
          onSecondary={handleNotificationsNotNow}
        />
      ) : null}

      {prompt === 'account' ? (
        <PromptSheet
          heading="This is your first run!"
          body="Your progress is saved only on this phone. Create an account and it's backed up, so a new phone picks up right where you left off."
          primaryLabel="Create account"
          onPrimary={handleCreateAccount}
          secondaryLabel="Just run"
          onSecondary={handleJustRun}
        />
      ) : null}
    </View>
  );
}

interface PromptSheetProps {
  heading: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}

/**
 * The shared shape of both post-Start asks: a soft heading, an honest
 * explanation, and two equally reachable choices — the second one never styled
 * as a lesser path, since declining either ask is a first-class answer.
 */
function PromptSheet({
  heading,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: PromptSheetProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.sheetHeading}>{heading}</Text>
        <Text style={styles.sheetBody}>{body}</Text>
        <Pressable style={styles.button} onPress={onPrimary}>
          <Text style={styles.buttonText}>{primaryLabel}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onSecondary}>
          <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
        </Pressable>
      </View>
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
