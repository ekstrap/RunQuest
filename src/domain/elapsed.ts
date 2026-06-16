/**
 * Format an elapsed duration (in whole seconds) as "MM:SS" for the calm in-run
 * timer. Minutes are not wrapped into hours — beginner sessions are short, and a
 * single minutes field keeps the display uncluttered (DESIGN.md §3.9).
 */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${pad(minutes)}:${pad(remainder)}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
