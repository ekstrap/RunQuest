import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RunType } from '@/src/domain/types';

/** The three run types, with newcomer-friendly labels. Order puts the default first. */
const RUN_TYPES: { value: RunType; label: string; hint: string }[] = [
  { value: 'interval', label: 'Walk/run intervals', hint: 'The beginner-friendly default' },
  { value: 'just-run', label: 'Just run', hint: 'A plain run, no cues' },
  { value: 'just-walk', label: 'Just walk', hint: 'A plain walk, no cues' },
];

/**
 * Run-type picker — shown before a session starts (DESIGN.md §3.9). Walk/run
 * interval is the default selection; the user can switch to a plain "just run"
 * or "just walk". Tapping Start carries the chosen mode to the in-run screen,
 * where interval mode plays walk/run audio cues and the plain modes do not.
 */
export default function RunSetupScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<RunType>('interval');

  function handleStart() {
    router.push({ pathname: '/run/active', params: { mode } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How do you want to move?</Text>
      {RUN_TYPES.map(({ value, label, hint }) => {
        const selected = value === mode;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => setMode(value)}
          >
            <Text style={[styles.cardText, selected && styles.cardTextSelected]}>{label}</Text>
            <Text style={[styles.hint, selected && styles.hintSelected]}>{hint}</Text>
          </Pressable>
        );
      })}
      <Pressable style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>Start</Text>
      </Pressable>
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
  cardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '500',
  },
  cardTextSelected: {
    color: '#2563eb',
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  hintSelected: {
    color: '#2563eb',
  },
  startButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
