import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDistance } from '@/src/domain/distance';
import { formatElapsed } from '@/src/domain/elapsed';

/**
 * Post-run summary — the single celebratory screen that closes the core loop
 * (DESIGN.md §3.10). Pure presentational: it reads everything from router params
 * (the awarding already happened in the run screen's handleEnd), so there are no
 * persistence side-effects on render and no double-award risk.
 *
 * Shows **only** distance / time / XP / a conditional week-completion bonus /
 * a conditional level-up (§3.20: base session XP and week-completion bonus if
 * applicable). Week *progress*, streak, and lifetime deliberately live
 * elsewhere (home / stats screens) and never appear here.
 */
export default function RunSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    durationSeconds?: string;
    distanceMeters?: string;
    xpAwarded?: string;
    weekBonusAwarded?: string;
    leveledUp?: string;
    level?: string;
  }>();

  const durationSeconds = Number(params.durationSeconds ?? 0);
  const xpAwarded = Number(params.xpAwarded ?? 0);
  const weekBonusAwarded = Number(params.weekBonusAwarded ?? 0);
  const leveledUp = params.leveledUp === '1';
  const level = Number(params.level ?? 0);

  return (
    <View style={styles.container}>
      {params.distanceMeters != null && (
        <Text style={styles.distance}>
          You covered {formatDistance(Number(params.distanceMeters))}!
        </Text>
      )}

      <Text style={styles.timeLabel}>Time</Text>
      <Text style={styles.time} testID="summary-time">
        {formatElapsed(durationSeconds)}
      </Text>

      <Text style={styles.xp} testID="summary-xp">
        +{xpAwarded} XP
      </Text>

      {weekBonusAwarded > 0 && (
        <Text style={styles.weekBonus} testID="week-bonus">
          Week complete! +{weekBonusAwarded} bonus XP
        </Text>
      )}

      {leveledUp && (
        <Text style={styles.levelUp} testID="level-up">
          Level up! You&apos;re now Level {level}
        </Text>
      )}

      <Pressable style={styles.doneButton} onPress={() => router.replace('/home')}>
        <Text style={styles.doneButtonText}>Done</Text>
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
  distance: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 32,
  },
  timeLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  time: {
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  xp: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
  },
  weekBonus: {
    fontSize: 20,
    fontWeight: '600',
    color: '#16a34a',
    textAlign: 'center',
    marginTop: 12,
  },
  levelUp: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 16,
  },
  doneButton: {
    marginTop: 48,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
