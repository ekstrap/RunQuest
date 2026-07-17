import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  easeOff,
  initialCalibration,
  prescriptionForCalibration,
  stepUp,
} from '@/src/domain/calibration';
import { levelProgress } from '@/src/domain/progression';
import { canChangeCommitment, weekProgress } from '@/src/domain/week';
import type {
  CalibrationState,
  OnboardingState,
  ProgressionState,
  SessionRecord,
  WeeklyCommitment,
} from '@/src/domain/types';

import { useRepository } from '@/src/providers/repository-provider';

const COMMITMENT_OPTIONS: WeeklyCommitment[] = [2, 3];

/**
 * Home screen — action-oriented (DESIGN.md §3.11): the next session with a
 * Start button, this week's progress, and the level + XP bar. Lifetime weeks,
 * streak, and run history deliberately live on the stats screen, not here.
 */
export default function HomeScreen() {
  const router = useRouter();
  const repository = useRepository();
  const [progression, setProgression] = useState<ProgressionState | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [calibration, setCalibration] = useState<CalibrationState | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.getProgressionState(),
      repository.getOnboardingState(),
      repository.getSessions(),
      repository.getCalibrationState(),
    ]).then(([progressionState, onboardingState, sessionRecords, calibrationState]) => {
      if (active) {
        setProgression(progressionState);
        setOnboarding(onboardingState);
        setSessions(sessionRecords);
        // Seed from the bracket's starting rung when calibration is unsaved
        // (§3.20) — the same fallback the run screen uses.
        setCalibration(
          calibrationState ?? initialCalibration(onboardingState?.bracket ?? 'never-run'),
        );
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  const loaded = progression != null && sessions != null && calibration != null;

  // The displayed session comes from the calibration ladder (§3.20) — the step
  // itself is never shown, only the resulting "Walk/run for N minutes".
  const prescription = prescriptionForCalibration(
    calibration ?? initialCalibration(onboarding?.bracket ?? 'never-run'),
  );
  const commitment = onboarding?.weeklyCommitment ?? 2;

  // Always-available "too easy / too hard" nudge (§3.20.4): step the ladder and
  // persist immediately so the prescription changes on the next render.
  const adjustCalibration = useCallback(
    (adjust: (state: CalibrationState) => CalibrationState) => {
      setCalibration((current) => {
        const base = current ?? initialCalibration(onboarding?.bracket ?? 'never-run');
        const next = adjust(base);
        void repository.saveCalibration(next);
        return next;
      });
    },
    [onboarding, repository],
  );
  const progress = weekProgress(sessions ?? [], commitment, Date.now());

  // Changeable between weeks only (§3.13): unlocked when the current week is
  // untouched or already complete, locked while it's in progress.
  const commitmentUnlocked = canChangeCommitment(sessions ?? [], commitment, Date.now());

  const changeCommitment = useCallback(
    (weeklyCommitment: WeeklyCommitment) => {
      if (!onboarding || !commitmentUnlocked || weeklyCommitment === commitment) {
        return;
      }
      const next = { ...onboarding, weeklyCommitment };
      setOnboarding(next);
      void repository.saveOnboarding(next);
    },
    [onboarding, commitmentUnlocked, commitment, repository],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RunQuest</Text>

      {loaded && (
        <>
          <View style={styles.sessionCard}>
            <Text style={styles.sessionLabel}>Next session</Text>
            <Text style={styles.sessionText}>
              Walk/run for {prescription.durationMinutes} minutes
            </Text>
            <Pressable style={styles.startButton} onPress={() => router.push('/run/setup')}>
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>

            {/* Off-plan / free run (issue #10): any time, no pressure — earns a
                little XP, never counts against the week. */}
            <Pressable
              testID="free-run-link"
              style={styles.freeRunLink}
              onPress={() => router.push({ pathname: '/run/setup', params: { offPlan: '1' } })}
            >
              <Text style={styles.freeRunLinkText}>Just feel like a run?</Text>
            </Pressable>

            <View style={styles.adjustRow}>
              <Pressable
                testID="calibration-too-hard"
                style={styles.adjustButton}
                onPress={() => adjustCalibration(easeOff)}
              >
                <Text style={styles.adjustButtonText}>Too hard</Text>
              </Pressable>
              <Pressable
                testID="calibration-too-easy"
                style={styles.adjustButton}
                onPress={() => adjustCalibration(stepUp)}
              >
                <Text style={styles.adjustButtonText}>Too easy</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.weekProgress}>
            {progress.completed} of {progress.target} sessions this week
          </Text>

          <Text style={styles.level}>Level {progression.level}</Text>
          <View style={styles.xpBarTrack} testID="xp-bar">
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.round(levelProgress(progression.xpTotal).ratio * 100)}%` },
              ]}
              testID="xp-bar-fill"
            />
          </View>

          <Pressable
            testID="stats-link"
            style={styles.statsLink}
            onPress={() => router.push('/stats')}
          >
            <Text style={styles.statsLinkText}>Your progress</Text>
          </Pressable>

          {onboarding && (
            <View style={styles.commitmentRow}>
              <Text style={styles.commitmentLabel}>Sessions per week</Text>
              <View style={styles.commitmentToggle}>
                {COMMITMENT_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    testID={`commitment-${option}`}
                    disabled={!commitmentUnlocked}
                    onPress={() => changeCommitment(option)}
                    style={[
                      styles.commitmentOption,
                      option === commitment && styles.commitmentOptionSelected,
                      !commitmentUnlocked && styles.commitmentOptionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.commitmentOptionText,
                        option === commitment && styles.commitmentOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!commitmentUnlocked && (
                <Text style={styles.commitmentNote}>You can change this between weeks</Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  sessionCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#eff6ff',
  },
  sessionLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  sessionText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  startButton: {
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
  freeRunLink: {
    marginTop: 12,
    alignSelf: 'center',
  },
  freeRunLinkText: {
    fontSize: 15,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  adjustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  adjustButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  adjustButtonText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  weekProgress: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  level: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
  },
  xpBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  statsLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  statsLinkText: {
    fontSize: 15,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  commitmentRow: {
    marginTop: 32,
  },
  commitmentLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  commitmentToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  commitmentOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  commitmentOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  commitmentOptionDisabled: {
    opacity: 0.5,
  },
  commitmentOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  commitmentOptionTextSelected: {
    color: '#2563eb',
  },
  commitmentNote: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
});
