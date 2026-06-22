import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { buildSessionRecord } from '@/src/domain/session';
import { formatElapsed } from '@/src/domain/elapsed';
import type { RunType } from '@/src/domain/types';
import { useRepository } from '@/src/providers/repository-provider';
import { useLocationSource } from '@/src/providers/location-provider';
import type { LocationReading } from '@/src/run/location-source';
// Null reading used as the initial ref value before the first GPS fix.
const NULL_READING: LocationReading = { coordinate: null, distanceMeters: null };

const RUN_TYPES: RunType[] = ['interval', 'just-run', 'just-walk'];

/** Narrow a raw route-param string to a RunType, defaulting to the interval default. */
function parseRunType(raw: string | undefined): RunType {
  return RUN_TYPES.includes(raw as RunType) ? (raw as RunType) : 'interval';
}

/**
 * In-run screen. Deliberately calm (§3.9, "the app disappears"): a map area,
 * the live location, and the elapsed timer — nothing else. **No XP, level, or
 * achievement UI appears here.** Time is the completion contract: ending the run
 * builds a session record from elapsed wall-clock time and persists it through
 * the repository. GPS only feeds the map/distance and never gates completion, so
 * a run with no fix still completes (distance recorded as null).
 *
 * (Interval audio cues are a later issue; this screen is mode-agnostic for now
 * and simply records which mode was chosen.)
 */
export default function RunActiveScreen() {
  const router = useRouter();
  const repository = useRepository();
  const locationSource = useLocationSource();
  const params = useLocalSearchParams<{ mode: string }>();
  const mode = parseRunType(params.mode);

  // startedAt is fixed for the lifetime of the run; a ref keeps it stable across renders.
  const startedAtRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Latest location reading kept in a ref so "End run" reads the final distance.
  // No state mirror needed — MapView renders its own blue dot.
  const readingRef = useRef<LocationReading>(NULL_READING);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    return locationSource.subscribe((next) => {
      readingRef.current = next;
    });
  }, [locationSource]);

  async function handleEnd() {
    const record = buildSessionRecord({
      mode,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      distanceMeters: readingRef.current.distanceMeters,
    });
    await repository.saveSession(record);
    router.replace('/home');
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        testID="run-map"
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
      />

      <Text style={styles.elapsed} testID="elapsed">
        {formatElapsed(elapsedSeconds)}
      </Text>

      <Pressable style={styles.endButton} onPress={handleEnd}>
        <Text style={styles.endButtonText}>End run</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  elapsed: {
    fontSize: 56,
    fontWeight: '200',
    textAlign: 'center',
    marginVertical: 24,
    fontVariant: ['tabular-nums'],
  },
  endButton: {
    marginHorizontal: 24,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  endButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
