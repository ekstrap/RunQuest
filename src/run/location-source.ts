/** A geographic point — the live position drawn on the in-run map. */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * One reading from the location source: the latest position and accumulated
 * distance. Both are nullable because GPS is not a completion gate (DESIGN.md
 * §3.9) — a session runs perfectly well with no fix at all.
 */
export interface LocationReading {
  /** Latest position, or null when there's no fix yet / GPS is unavailable. */
  coordinate: Coordinate | null;
  /** Accumulated distance in meters, or null when GPS is unavailable. */
  distanceMeters: number | null;
}

/**
 * The GPS/map boundary. Per the PRD testing strategy, location is a system
 * boundary that is faked in tests and backed by a real implementation
 * (expo-location) in production. The real implementation is deferred to a
 * follow-up; until then the app uses {@link unavailableLocationSource}, which is
 * also why "completion works without GPS" is the live default path today.
 */
export interface LocationSource {
  /**
   * Subscribe to location readings. Returns an unsubscribe function the caller
   * must invoke when the run ends.
   */
  subscribe(listener: (reading: LocationReading) => void): () => void;
}

/**
 * Default no-GPS source: emits a single null reading and never updates. Keeps
 * the in-run screen runnable with no native location module wired up.
 */
export const unavailableLocationSource: LocationSource = {
  subscribe(listener) {
    listener({ coordinate: null, distanceMeters: null });
    return () => {};
  },
};
