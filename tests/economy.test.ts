import { describe, expect, it } from 'vitest';
import { ANIMAL_BY_ID, OFFLINE_CAP_SECONDS } from '../src/game/content';
import {
  animalIncome,
  beautyScore,
  offlineEarnings,
  rawIncomePerSecond,
  satisfactionMultiplier,
  totalIncomePerSecond,
  upgradeCost,
} from '../src/game/economy';
import { createInitialState } from '../src/game/state';

const rabbit = ANIMAL_BY_ID.get('rabbit')!;

describe('animalIncome', () => {
  it('returns 0 for level 0', () => {
    expect(animalIncome(rabbit, 0)).toBe(0);
  });

  it('returns base income at level 1', () => {
    expect(animalIncome(rabbit, 1)).toBe(rabbit.baseIncome);
  });

  it('adds incomePerLevel for each level above 1', () => {
    // level 3 => base * (1 + incomePerLevel * 2)
    expect(animalIncome(rabbit, 3)).toBeCloseTo(
      rabbit.baseIncome * (1 + rabbit.incomePerLevel * 2),
    );
  });
});

describe('upgradeCost', () => {
  it('equals baseUpgradeCost for first upgrade (level 1)', () => {
    expect(upgradeCost(rabbit, 1)).toBe(rabbit.baseUpgradeCost);
  });

  it('grows geometrically', () => {
    const l1 = upgradeCost(rabbit, 1);
    const l2 = upgradeCost(rabbit, 2);
    expect(l2).toBeGreaterThan(l1);
    expect(l2 / l1).toBeCloseTo(rabbit.upgradeCostGrowth, 1);
  });

  it('never produces NaN or negative values across many levels', () => {
    for (let lvl = 1; lvl <= 100; lvl++) {
      const c = upgradeCost(rabbit, lvl);
      expect(Number.isFinite(c)).toBe(true);
      expect(c).toBeGreaterThan(0);
    }
  });
});

describe('satisfaction & beauty', () => {
  it('fresh zoo has no beauty and 1.0 multiplier', () => {
    const s = createInitialState();
    expect(beautyScore(s)).toBe(0);
    expect(satisfactionMultiplier(s)).toBe(1);
  });

  it('beauty increases satisfaction with diminishing returns, capped under 2x', () => {
    const s = createInitialState();
    s.decorations['statue'] = 1000;
    const mult = satisfactionMultiplier(s);
    expect(mult).toBeGreaterThan(1);
    expect(mult).toBeLessThan(2);
  });
});

describe('income aggregation', () => {
  it('raw income counts only unlocked animals', () => {
    const s = createInitialState(); // only rabbit unlocked
    expect(rawIncomePerSecond(s)).toBe(rabbit.baseIncome);
  });

  it('total income applies satisfaction multiplier', () => {
    const s = createInitialState();
    s.decorations['fountain'] = 5;
    const expected = rawIncomePerSecond(s) * satisfactionMultiplier(s);
    expect(totalIncomePerSecond(s)).toBeCloseTo(expected);
  });
});

describe('offlineEarnings', () => {
  it('earns proportional to elapsed time when under cap', () => {
    const s = createInitialState();
    const rate = totalIncomePerSecond(s);
    const { coins, capped } = offlineEarnings(s, 100);
    expect(capped).toBe(false);
    expect(coins).toBe(Math.floor(rate * 100));
  });

  it('caps earnings at OFFLINE_CAP_SECONDS', () => {
    const s = createInitialState();
    const rate = totalIncomePerSecond(s);
    const huge = OFFLINE_CAP_SECONDS * 10;
    const { coins, cappedSeconds, capped } = offlineEarnings(s, huge);
    expect(capped).toBe(true);
    expect(cappedSeconds).toBe(OFFLINE_CAP_SECONDS);
    expect(coins).toBe(Math.floor(rate * OFFLINE_CAP_SECONDS));
  });

  it('returns 0 for a zoo with no income', () => {
    const s = createInitialState();
    s.animals['rabbit'] = { unlocked: false, level: 0 };
    expect(offlineEarnings(s, 1000).coins).toBe(0);
  });
});
