import { BASE_SESSION_XP, awardSessionXp, levelForXp } from './progression';

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
