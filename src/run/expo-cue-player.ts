import type { CueEvent, Phase } from '@/src/domain/interval-cues';
import type { CuePlayer } from './cue-player';

/** Phrase a phase duration as friendly speech ("2 minutes", "30 seconds"). */
function phraseDuration(seconds: number): string {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return `${seconds} seconds`;
}

/** Build the spoken transition cue, e.g. "Start running for 30 seconds." */
function cueText({ phase, durationSeconds }: { phase: Phase; durationSeconds: number }): string {
  const verb = phase === 'walk' ? 'walking' : 'running';
  return `Start ${verb} for ${phraseDuration(durationSeconds)}.`;
}

let warnedUnavailable = false;

/** Warn once if the native speech module is missing (e.g. dev client not rebuilt). */
function warnUnavailable(error: unknown): void {
  if (warnedUnavailable) {
    return;
  }
  warnedUnavailable = true;
  console.warn(
    'expo-speech is unavailable, so walk/run cues are silent. Rebuild the dev ' +
      'client (e.g. `npx expo run:ios` / `run:android`) to include the native module.',
    error,
  );
}

/**
 * Production CuePlayer backed by expo-speech (text-to-speech). Speaking a short
 * cue lets the platform TTS duck/mix over background music (e.g. the user's
 * playlist), satisfying "cues play over other audio" with no bundled audio
 * assets. Only the transition cue is spoken — no encouragement (DESIGN.md §3.9).
 *
 * expo-speech is loaded lazily and guarded: if the native module isn't present
 * (e.g. the dev client predates it being added), the run continues silently
 * rather than crashing — audio is a boundary, never a completion gate.
 */
export const expoCuePlayer: CuePlayer = {
  play(event: CueEvent) {
    try {
      // Lazy require (not dynamic import) so a missing native module degrades to
      // silence instead of crashing app load — and so the named exports are on
      // the returned object directly, matching `import * as Speech from ...`.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Speech = require('expo-speech') as typeof import('expo-speech');
      Speech.stop();
      Speech.speak(cueText(event));
    } catch (error) {
      warnUnavailable(error);
    }
  },
};
