import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PROVIDER_LABELS } from '@/src/auth/auth-client';
import { useAuth } from '@/src/providers/auth-provider';

import { initialCalibration } from '@/src/domain/calibration';
import { formatDistance } from '@/src/domain/distance';
import { formatElapsed } from '@/src/domain/elapsed';
import { abilityNarrative } from '@/src/domain/narrative';
import { streakStatus, type StreakStatus } from '@/src/domain/streak';
import { lifetimeWeeksCompleted } from '@/src/domain/week';
import type { CalibrationState, OnboardingState, SessionRecord } from '@/src/domain/types';

import { useRepository } from '@/src/providers/repository-provider';

/**
 * Stats/profile screen — the reflection surface (DESIGN.md §3.8, §3.11).
 * Lifetime weeks (the legacy anchor), the soft secondary streak, run history,
 * and the ability narrative live here, deliberately off the action-oriented
 * home screen. Nothing on this screen may read as failure, loss, or a score.
 */
export default function StatsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const repository = useRepository();
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [calibration, setCalibration] = useState<CalibrationState | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.getSessions(),
      repository.getOnboardingState(),
      repository.getCalibrationState(),
    ]).then(([sessionRecords, onboardingState, calibrationState]) => {
      if (active) {
        setSessions(sessionRecords);
        setOnboarding(onboardingState);
        // Seed from the bracket's starting rung when calibration is unsaved
        // (§3.20) — the same fallback the home screen uses.
        setCalibration(
          calibrationState ?? initialCalibration(onboardingState?.bracket ?? 'never-run'),
        );
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  if (sessions == null || calibration == null) {
    return <View style={styles.container} />;
  }

  const commitment = onboarding?.weeklyCommitment ?? 2;
  const bracket = onboarding?.bracket ?? 'never-run';
  const lifetimeWeeks = lifetimeWeeksCompleted(sessions, commitment);
  const streak = streakStatus(sessions, commitment, Date.now());
  const narrative = abilityNarrative(bracket, calibration);
  const history = [...sessions].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section} testID="lifetime-weeks">
        <Text style={styles.sectionLabel}>Lifetime</Text>
        <Text style={styles.bigStat}>
          {lifetimeWeeks} {lifetimeWeeks === 1 ? 'week' : 'weeks'} completed
        </Text>
      </View>

      <View style={styles.section} testID="streak">
        <Text style={styles.sectionLabel}>Streak</Text>
        <Text style={styles.bigStat}>
          {streak.weeks}-week {streak.archived ? 'best' : 'streak'}
        </Text>
        <Text style={styles.streakNote}>{streakCopy(streak)}</Text>
      </View>

      <View style={styles.section} testID="ability-narrative">
        <Text style={styles.sectionLabel}>Your journey</Text>
        <Text style={styles.narrativeText}>{narrative.text}</Text>
      </View>

      <View style={styles.section} testID="account">
        <Text style={styles.sectionLabel}>Account</Text>
        {user ? (
          <>
            <Text style={styles.accountText}>
              {user.provider
                ? `Signed in with ${PROVIDER_LABELS[user.provider]}. Your progress is backed up.`
                : 'Signed in. Your progress is backed up.'}
            </Text>
            <Pressable onPress={() => signOut()}>
              <Text style={styles.accountAction}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.accountText}>
              Your progress is saved on this phone. An account backs it up, so a new phone picks
              up where you left off.
            </Text>
            <Pressable onPress={() => router.push('/sign-in')}>
              <Text style={styles.accountAction}>Create account</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.section} testID="run-history">
        <Text style={styles.sectionLabel}>Run history</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>Your runs will show up here.</Text>
        ) : (
          history.map((session) => (
            <View key={session.startedAt} style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {new Date(session.startedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.historyDetail}>
                {formatElapsed(session.durationSeconds)}
                {session.distanceMeters != null
                  ? ` · ${formatDistance(session.distanceMeters)}`
                  : ''}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

/**
 * Warm per-tier framing (§3.8). The streak soft-breaks — never any loss or
 * failure wording, at any tier.
 */
function streakCopy(streak: StreakStatus): string {
  switch (streak.tier) {
    case 'active':
      return 'Consecutive completed weeks.';
    case 'resting':
      return 'Taking a breather — your streak is waiting for you.';
    case 'miss-you':
      return 'Your runs are here whenever you are.';
    case 'archived':
      return 'Look how far you got — ready to start fresh?';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#eff6ff',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  bigStat: {
    fontSize: 22,
    fontWeight: '600',
  },
  streakNote: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  narrativeText: {
    fontSize: 16,
    lineHeight: 24,
  },
  accountText: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  accountAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 12,
  },
  emptyHistory: {
    fontSize: 15,
    color: '#6b7280',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d5db',
  },
  historyDate: {
    fontSize: 15,
  },
  historyDetail: {
    fontSize: 15,
    color: '#6b7280',
  },
});
