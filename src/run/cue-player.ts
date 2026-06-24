import type { CueEvent } from '@/src/domain/interval-cues';

/**
 * The audio-cue boundary. Per the PRD testing strategy, audio output is a system
 * boundary that is faked in tests and backed by a real implementation
 * (text-to-speech) in production. Interval mode calls {@link CuePlayer.play} at
 * each walk↔run transition; the player renders it as an audio cue that plays over
 * other audio (e.g. music). Only transition cues are ever played — no
 * encouragement or commentary (DESIGN.md §3.9). Mirrors {@link LocationSource}.
 */
export interface CuePlayer {
  /** Render a walk/run transition as an audio cue. */
  play(event: CueEvent): void | Promise<void>;
}

/**
 * Default no-op player: renders nothing. Keeps interval mode runnable with no
 * native audio module wired up (e.g. in tests that don't assert on cues, and as
 * the safe fallback when no player is injected).
 */
export const silentCuePlayer: CuePlayer = {
  play() {},
};
