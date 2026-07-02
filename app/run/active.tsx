import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { prescriptionForBracket } from '@/src/domain/calibration';
import { awardSessionXp } from '@/src/domain/progression';
import { buildSessionRecord } from '@/src/domain/session';
import { buildCueSchedule, type CueEvent } from '@/src/domain/interval-cues';
import { formatElapsed } from '@/src/domain/elapsed';
import type { RunType } from '@/src/domain/types';
import { useRepository } from '@/src/providers/repository-provider';
import { useLocationSource } from '@/src/providers/location-provider';
import { useCuePlayer } from '@/src/providers/cue-player-provider';
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
 * In **interval** mode it also drives walk/run audio cues: it loads the user's
 * prescription, builds a deterministic cue schedule, and plays each transition
 * through the injected CuePlayer as elapsed time crosses it. The cues are the
 * only difference from "just run" / "just walk" — the calm screen is identical.
 */
export default function RunActiveScreen() {
  const router = useRouter();
  const repository = useRepository();
  const locationSource = useLocationSource();
  const cuePlayer = useCuePlayer();
  const params = useLocalSearchParams<{ mode: string }>();
  const mode = parseRunType(params.mode);

  // startedAt is fixed for the lifetime of the run; a ref keeps it stable across renders.
  const startedAtRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Latest location reading kept in a ref so "End run" reads the final distance.
  // No state mirror needed — MapView renders its own blue dot.
  const readingRef = useRef<LocationReading>(NULL_READING);

  // Walk/run cue schedule for interval mode (empty for the plain modes).
  const [cues, setCues] = useState<CueEvent[]>([]);
  // Index of the next un-played cue — advanced as elapsed time crosses each one.
  const nextCueRef = useRef(0);

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

  // Interval mode only: load the prescription and build the cue schedule once.
  // Falls back to the gentlest start if onboarding isn't recorded yet.
  useEffect(() => {
    if (mode !== 'interval') {
      return;
    }
    let active = true;
    repository.getOnboardingState().then((onboarding) => {
      if (!active) {
        return;
      }
      const prescription = prescriptionForBracket(onboarding?.bracket ?? 'never-run');
      setCues(buildCueSchedule(prescription));
    });
    return () => {
      active = false;
    };
  }, [mode, repository]);

  // Play every cue whose start time has elapsed but hasn't fired yet. Runs when
  // the schedule loads (firing the second-0 cue) and on each elapsed-time tick.
  useEffect(() => {
    while (nextCueRef.current < cues.length && cues[nextCueRef.current].atSecond <= elapsedSeconds) {
      void cuePlayer.play(cues[nextCueRef.current]);
      nextCueRef.current += 1;
    }
  }, [cues, elapsedSeconds, cuePlayer]);

  async function handleEnd() {
    const record = buildSessionRecord({
      mode,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      distanceMeters: readingRef.current.distanceMeters,
    });
    await repository.saveSession(record);

    // Award flat base XP for showing up, then hand the payoff to the separate
    // summary screen. No XP/level UI ever appears on the calm run screen (§3.9).
    const current = await repository.getProgressionState();
    const result = awardSessionXp(current);
    await repository.saveProgression(result.progression);

    router.replace({
      pathname: '/run/summary',
      params: {
        durationSeconds: String(record.durationSeconds),
        // Omit the distance param entirely when GPS was unavailable — the
        // summary shows no distance line rather than "0 km" (§3.10).
        ...(record.distanceMeters != null
          ? { distanceMeters: String(record.distanceMeters) }
          : {}),
        xpAwarded: String(result.xpAwarded),
        leveledUp: result.leveledUp ? '1' : '0',
        level: String(result.newLevel),
      },
    });
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
