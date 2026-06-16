import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProgressionState } from '@/src/domain/types';
import { useRepository } from '@/src/providers/repository-provider';

/**
 * Placeholder home screen. The real home screen (next session, week progress,
 * level + XP bar) is built in later issues; for the scaffold it reads the user's
 * progression state through the repository interface and shows the level — the
 * end-to-end tracer bullet proving the storage boundary is wired up. It now also
 * carries the entry point into the run flow.
 */
export default function HomeScreen() {
  const router = useRouter();
  const repository = useRepository();
  const [progression, setProgression] = useState<ProgressionState | null>(null);

  useEffect(() => {
    let active = true;
    repository.getProgressionState().then((state) => {
      if (active) {
        setProgression(state);
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RunQuest</Text>
      {progression && <Text style={styles.level}>Level {progression.level}</Text>}
      <Pressable style={styles.startButton} onPress={() => router.push('/run/setup')}>
        <Text style={styles.startButtonText}>Start a run</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  level: {
    fontSize: 18,
    marginTop: 8,
  },
  startButton: {
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
