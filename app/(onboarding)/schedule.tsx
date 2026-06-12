import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeeklyCommitment } from '@/src/domain/types';

/** The two weekly commitments a newcomer can pick (DESIGN.md §3.20). */
const COMMITMENTS: WeeklyCommitment[] = [2, 3];

/**
 * Onboarding screen 3 of 4 — weekly commitment. Sets how many sessions per week
 * count as a complete week (the reward/target scale, decoupled from difficulty;
 * DESIGN.md §3.20). Carries the bracket from the previous screen straight
 * through, adding the chosen commitment, on to the first-session card. Params
 * travel as strings over the router.
 */
export default function ScheduleScreen() {
  const router = useRouter();
  const { bracket } = useLocalSearchParams<{ bracket: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How many sessions per week feel realistic?</Text>
      {COMMITMENTS.map((sessions) => (
        <Pressable
          key={sessions}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: '/first-session',
              params: { bracket, weeklyCommitment: String(sessions) },
            })
          }
        >
          <Text style={styles.cardText}>{sessions} sessions</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 12,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '500',
  },
});
