import {
  BASE_SESSION_XP,
  FREE_RUN_XP,
  applyXp,
  awardFreeRunXp,
  awardSessionXp,
  levelForXp,
  levelProgress,
} from './progression';

describe('levelForXp', () => {
  it('derives the front-loaded early levels', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(249)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });

  it('climbs linearly past the front-loaded table', () => {
    expect(levelForXp(499)).toBe(3);
    expect(levelForXp(500)).toBe(4);
  });

  it('keeps climbing with no cap', () => {
    // 250 (level 3) + 39 linear steps of 250 = level 42 at 10_000 XP.
    expect(levelForXp(10_000)).toBe(3 + Math.floor((10_000 - 250) / 250));
    expect(levelForXp(10_000)).toBeGreaterThan(40);
  });
});

describe('awardSessionXp', () => {
  it('lands the first level-up within one session (100 XP → level 2)', () => {
    const result = awardSessionXp({ xpTotal: 0, level: 1 });

    expect(result).toEqual({
      xpAwarded: 100,
      progression: { xpTotal: 100, level: 2 },
      leveledUp: true,
      previousLevel: 1,
      newLevel: 2,
    });
  });

  it('awards a flat amount regardless of the starting state', () => {
    const starts = [
      { xpTotal: 0, level: 1 },
      { xpTotal: 100, level: 2 },
      { xpTotal: 1_337, level: 8 },
    ];

    for (const start of starts) {
      expect(awardSessionXp(start).xpAwarded).toBe(BASE_SESSION_XP);
    }
  });

  it('does not level up when the award stays within the current level', () => {
    const result = awardSessionXp({ xpTotal: 100, level: 2 });

    expect(result.progression).toEqual({ xpTotal: 200, level: 2 });
    expect(result.leveledUp).toBe(false);
  });
});

describe('awardFreeRunXp', () => {
  it('awards a small flat amount, smaller than a prescribed session (issue #10)', () => {
    expect(FREE_RUN_XP).toBeGreaterThan(0);
    expect(FREE_RUN_XP).toBeLessThan(BASE_SESSION_XP);
  });

  it('grants the same flat amount regardless of the starting state', () => {
    const starts = [
      { xpTotal: 0, level: 1 },
      { xpTotal: 100, level: 2 },
      { xpTotal: 1_337, level: 8 },
    ];

    for (const start of starts) {
      const result = awardFreeRunXp(start);
      expect(result.xpAwarded).toBe(FREE_RUN_XP);
      expect(result.progression.xpTotal).toBe(start.xpTotal + FREE_RUN_XP);
    }
  });

  it('still crosses a level threshold when the small award happens to reach it', () => {
    // Level 2 sits at 100; FREE_RUN_XP (25) from 90 clears it.
    const result = awardFreeRunXp({ xpTotal: 90, level: 1 });
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });
});

describe('applyXp', () => {
  it('awards an arbitrary amount and reports the level transition', () => {
    // 200 bonus XP from 100/level 2 → 300 total crosses the 250 threshold.
    const result = applyXp({ xpTotal: 100, level: 2 }, 200);

    expect(result).toEqual({
      xpAwarded: 200,
      progression: { xpTotal: 300, level: 3 },
      leveledUp: true,
      previousLevel: 2,
      newLevel: 3,
    });
  });

  it('reports no level-up when the amount stays within the level', () => {
    const result = applyXp({ xpTotal: 250, level: 3 }, 50);

    expect(result.progression).toEqual({ xpTotal: 300, level: 3 });
    expect(result.leveledUp).toBe(false);
  });
});

describe('levelProgress', () => {
  it('is empty exactly at a level threshold', () => {
    // 100 XP = level 2 exactly; next level (3) needs 150 more (threshold 250).
    expect(levelProgress(100)).toEqual({
      level: 2,
      xpIntoLevel: 0,
      xpForLevel: 150,
      ratio: 0,
    });
  });

  it('reports partial progress mid-level', () => {
    // 175 XP: level 2, 75 into the 150-wide band toward level 3.
    expect(levelProgress(175)).toEqual({
      level: 2,
      xpIntoLevel: 75,
      xpForLevel: 150,
      ratio: 0.5,
    });
  });

  it('uses the constant step in the linear region past the table', () => {
    // 375 XP: level 3 starts at 250, level 4 at 500 → 125 into a 250 band.
    expect(levelProgress(375)).toEqual({
      level: 3,
      xpIntoLevel: 125,
      xpForLevel: 250,
      ratio: 0.5,
    });
  });
});
