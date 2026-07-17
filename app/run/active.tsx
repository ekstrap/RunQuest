import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import {
  advanceOnWeekComplete,
  initialCalibration,
  prescriptionForCalibration,
} from '@/src/domain/calibration';
import { applyXp, awardFreeRunXp, awardSessionXp } from '@/src/domain/progression';
import { completesWeek, sessionsInWeek, startOfWeek, weekBonusXp } from '@/src/domain/week';
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
  const params = useLocalSearchParams<{ mode: string; offPlan?: string }>();
  const mode = parseRunType(params.mode);
  // Off-plan / free run (issue #10): earns small flat XP, never advances the
  // week or the week bonus, never touches calibration. Carried from the setup
  // screen as a string param ('1' when the user chose "just a free run").
  const offPlan = params.offPlan === '1';

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
    // Drive the cues from the *persisted calibration* so an advanced difficulty
    // reflects in the intervals; fall back to the bracket's starting rung when
    // calibration hasn't been seeded yet (§3.20).
    Promise.all([repository.getCalibrationState(), repository.getOnboardingState()]).then(
      ([calibration, onboarding]) => {
        if (!active) {
          return;
        }
        const state = calibration ?? initialCalibration(onboarding?.bracket ?? 'never-run');
        setCues(buildCueSchedule(prescriptionForCalibration(state)));
      },
    );
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
      offPlan,
    });
    await repository.saveSession(record);

    // Award XP for showing up, then hand the payoff to the separate summary
    // screen. No XP/level UI ever appears on the calm run screen (§3.9). A free
    // run (issue #10) earns a small flat amount and stops there — it never
    // advances the week, the week bonus, or calibration.
    const current = await repository.getProgressionState();
    let result = offPlan ? awardFreeRunXp(current) : awardSessionXp(current);

    let weekBonusAwarded = 0;
    let calibrationSteppedToMinutes: number | null = null;

    if (!offPlan) {
      // Week-completion bonus (§3.6): fires exactly when this session brings the
      // week's count to the commitment — extras beyond it award nothing further.
      // Free runs are excluded from the count by sessionsInWeek (issue #10).
      const [onboarding, sessions] = await Promise.all([
        repository.getOnboardingState(),
        repository.getSessions(),
      ]);
      const commitment = onboarding?.weeklyCommitment ?? 2;
      const weekComplete = completesWeek(
        sessionsInWeek(sessions, startOfWeek(Date.now())),
        commitment,
      );
      if (weekComplete) {
        weekBonusAwarded = weekBonusXp(commitment);
        const bonusResult = applyXp(result.progression, weekBonusAwarded);
        result = {
          ...bonusResult,
          // The summary's level-up line reflects base + bonus combined.
          xpAwarded: result.xpAwarded,
          previousLevel: result.previousLevel,
          leveledUp: bonusResult.newLevel > result.previousLevel,
        };
      }

      // Calibration auto-advance (§3.20.3–4): a completed week gently steps the
      // prescription up by one rung for subsequent sessions; an off/partial week
      // holds steady and never demotes. On a step-up, hand the new duration to
      // the summary for a gentle announcement (display-only). Seed from the
      // persisted rung, falling back to the bracket's starting rung when unseeded.
      if (weekComplete) {
        const savedCalibration = await repository.getCalibrationState();
        const currentCalibration =
          savedCalibration ?? initialCalibration(onboarding?.bracket ?? 'never-run');
        const { state: nextCalibration, steppedUp } = advanceOnWeekComplete(
          currentCalibration,
          true,
        );
        if (steppedUp) {
          await repository.saveCalibration(nextCalibration);
          calibrationSteppedToMinutes =
            prescriptionForCalibration(nextCalibration).durationMinutes;
        }
      }
    }

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
        ...(weekBonusAwarded > 0 ? { weekBonusAwarded: String(weekBonusAwarded) } : {}),
        ...(calibrationSteppedToMinutes != null
          ? { calibrationSteppedToMinutes: String(calibrationSteppedToMinutes) }
          : {}),
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
