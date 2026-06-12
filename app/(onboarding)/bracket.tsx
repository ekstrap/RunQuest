import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Bracket } from '@/src/domain/types';

/** The three self-rated brackets, with newcomer-friendly labels (DESIGN.md §3.20). */
const BRACKETS: { value: Bracket; label: string }[] = [
  { value: 'never-run', label: 'Never run before' },
  { value: 'run-occasionally', label: 'Run occasionally' },
  { value: 'getting-back', label: 'Getting back into it' },
];

/**
 * Onboarding screen 2 of 4 — activity bracket. The choice sets the *starting
 * calibration* (session difficulty); it's a self-rating, not a fitness test
 * (DESIGN.md §3.20). One tap both selects and advances, carrying the bracket to
 * the schedule picker as a route param (no shared store needed yet).
 */
export default function BracketScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Which sounds most like you?</Text>
      {BRACKETS.map(({ value, label }) => (
        <Pressable
          key={value}
          style={styles.card}
          onPress={() => router.push({ pathname: '/schedule', params: { bracket: value } })}
        >
          <Text style={styles.cardText}>{label}</Text>
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
