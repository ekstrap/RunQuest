import type { RunType, SessionRecord } from './types';

/**
 * Inputs for completing a session. Start/end are wall-clock epoch milliseconds;
 * distance is optional because GPS is map/distance-only and never gates
 * completion (DESIGN.md §3.9) — omit it (or pass null) for a no-GPS session.
 */
export interface SessionInput {
  mode: RunType;
  /** When the session started (epoch milliseconds). */
  startedAt: number;
  /** When the user ended the session (epoch milliseconds). */
  endedAt: number;
  /** Post-run GPS distance in meters, if any. */
  distanceMeters?: number | null;
}

/**
 * Build a completed {@link SessionRecord} from a finished session. Duration is
 * derived purely from elapsed wall-clock time — time is the completion contract
 * (§3.5/§3.9), so this works with no GPS at all. Clamped to be non-negative in
 * case the clock appears to move backwards.
 */
export function buildSessionRecord(input: SessionInput): SessionRecord {
  const durationSeconds = Math.max(
    0,
    Math.round((input.endedAt - input.startedAt) / 1000),
  );
  return {
    mode: input.mode,
    startedAt: input.startedAt,
    durationSeconds,
    distanceMeters: input.distanceMeters ?? null,
  };
}
