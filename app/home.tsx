import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProgressionState } from '@/src/domain/types';
import { useRepository } from '@/src/providers/repository-provider';

/**
 * Placeholder home screen. The real home screen (next session, week progress,
 * level + XP bar) is built in later issues; for the scaffold it reads the user's
 * progression state through the repository interface and shows the level — the
 * end-to-end tracer bullet proving the storage boundary is wired up.
 */
export default function HomeScreen() {
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
});
