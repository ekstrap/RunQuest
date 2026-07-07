import type { ProgressionState } from './types';

/**
 * XP / level engine — the reward track (DESIGN.md §3.6, §3.20.5). Showing-up is
 * the only input: completing a session awards a flat base amount, identical
 * whether the user stopped at the prescribed time or ran further. **The award
 * function takes no session metrics at all** — it cannot read pace, distance, or
 * PRs, so "flat within a session" and "never for pace/distance/PRs" hold by
 * construction, not just by test.
 *
 * NOTE: these numbers are PLACEHOLDERS pending tuning during prototyping
 * (DESIGN.md §3.20.5 locks only the *shape*: front-loaded then linear, no cap,
 * ~one level per completed week). BASE_SESSION_XP awards 100 per session; the
 * first session reaches level 2, so the first level-up lands within one session.
 */
export const BASE_SESSION_XP = 100;

/**
 * Cumulative XP required to *reach* each level, front-loaded (small early steps)
 * then linear. Index i holds the threshold for level i+1: level 1 at 0, level 2
 * at 100, level 3 at 250. Beyond the table, every further level costs a constant
 * LINEAR_STEP — no cap. PLACEHOLDERs (DESIGN.md §3.20.5).
 */
const LEVEL_THRESHOLDS = [0, 100, 250];
const LINEAR_STEP = 250;

export interface SessionXpResult {
  /** XP granted by this session — always BASE_SESSION_XP (flat). */
  xpAwarded: number;
  /** The new progression state after applying the award. */
  progression: ProgressionState;
  /** True when the award crossed a level threshold. */
  leveledUp: boolean;
  /** Level before the award. */
  previousLevel: number;
  /** Level after the award. */
  newLevel: number;
}

/** Derive level from lifetime XP: front-loaded then linear, no cap. */
export function levelForXp(xpTotal: number): number {
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (xpTotal >= last) {
    // 3 + steps past the final table entry.
    return LEVEL_THRESHOLDS.length + Math.floor((xpTotal - last) / LINEAR_STEP);
  }
  // Highest table level whose threshold we've reached.
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (xpTotal >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return level;
}

/**
 * Apply an XP award of any amount (base session XP, week-completion bonus) and
 * report the resulting state and level transition.
 */
export function applyXp(current: ProgressionState, amount: number): SessionXpResult {
  const xpTotal = current.xpTotal + amount;
  const previousLevel = current.level;
  const newLevel = levelForXp(xpTotal);
  return {
    xpAwarded: amount,
    progression: { xpTotal, level: newLevel },
    leveledUp: newLevel > previousLevel,
    previousLevel,
    newLevel,
  };
}

/**
 * Award flat base XP for completing a session. Ignores all session metrics by
 * design (flat within a session; never pace/distance/PRs — DESIGN.md §3.6).
 */
export function awardSessionXp(current: ProgressionState): SessionXpResult {
  return applyXp(current, BASE_SESSION_XP);
}

/** Cumulative XP required to reach a given level (table, then linear). */
function xpToReachLevel(level: number): number {
  if (level <= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1];
  }
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return last + (level - LEVEL_THRESHOLDS.length) * LINEAR_STEP;
}

/**
 * Position within the current level for the home screen's XP bar: how far
 * `xpTotal` has climbed from this level's threshold toward the next one.
 */
export function levelProgress(xpTotal: number): {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  ratio: number;
} {
  const level = levelForXp(xpTotal);
  const currentThreshold = xpToReachLevel(level);
  const xpForLevel = xpToReachLevel(level + 1) - currentThreshold;
  const xpIntoLevel = xpTotal - currentThreshold;
  return { level, xpIntoLevel, xpForLevel, ratio: xpIntoLevel / xpForLevel };
}
