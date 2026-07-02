/**
 * Format a post-run GPS distance (in meters) as kilometers with one decimal for
 * the post-run celebration — e.g. 1600 → "1.6 km" (DESIGN.md §3.10). Distance is
 * shown only as celebration and never feeds XP or calibration (§3.6).
 */
export function formatDistance(meters: number): string {
  // Round to the nearest tenth of a km explicitly — toFixed alone mis-rounds
  // halves that land just below their float value (e.g. 1.65 → "1.6").
  const km = Math.round(meters / 100) / 10;
  return `${km.toFixed(1)} km`;
}
