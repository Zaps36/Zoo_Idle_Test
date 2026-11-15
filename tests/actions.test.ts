import { describe, expect, it } from 'vitest';
import { ANIMAL_BY_ID } from '../src/game/content';
import {
  addCoins,
  buyDecoration,
  createInitialState,
  unlockAnimal,
  unlockArea,
  upgradeAnimal,
} from '../src/game/state';
import { upgradeCost } from '../src/game/economy';

describe('addCoins', () => {
  it('tracks lifetime coins separately from spendable coins', () => {
    const s = createInitialState();
    addCoins(s, 500);
    expect(s.coins).toBe(500);
    expect(s.lifetimeCoins).toBe(500);
  });

  it('ignores non-positive amounts', () => {
    const s = createInitialState();
    addCoins(s, -10);
    expect(s.coins).toBe(0);
  });
});

describe('unlockAnimal', () => {
  it('fails when coins are insufficient', () => {
    const s = createInitialState();
    const r = unlockAnimal(s, 'zebra');
    expect(r.ok).toBe(false);
  });

  it('succeeds and deducts coins when affordable', () => {
    const s = createInitialState();
    const zebra = ANIMAL_BY_ID.get('zebra')!;
    addCoins(s, zebra.unlockCost);
    const r = unlockAnimal(s, 'zebra');
    expect(r.ok).toBe(true);
    expect(s.animals['zebra']!.unlocked).toBe(true);
    expect(s.coins).toBe(0);
  });

  it('fails for an animal in a locked area', () => {
    const s = createInitialState();
    addCoins(s, 1_000_000);
    const r = unlockAnimal(s, 'redpanda'); // forest, locked
    expect(r.ok).toBe(false);
  });
});

describe('upgradeAnimal', () => {
  it('raises level and deducts the correct cost', () => {
    const s = createInitialState();
    const rabbit = ANIMAL_BY_ID.get('rabbit')!;
    const cost = upgradeCost(rabbit, 1);
    addCoins(s, cost);
    const r = upgradeAnimal(s, 'rabbit');
    expect(r.ok).toBe(true);
    expect(s.animals['rabbit']!.level).toBe(2);
    expect(s.coins).toBe(0);
  });

  it('fails on an unowned animal', () => {
    const s = createInitialState();
    addCoins(s, 1_000_000);
    const r = upgradeAnimal(s, 'zebra');
    expect(r.ok).toBe(false);
  });
});

describe('buyDecoration', () => {
  it('increments placed count', () => {
    const s = createInitialState();
    addCoins(s, 1000);
    buyDecoration(s, 'tree');
    buyDecoration(s, 'tree');
    expect(s.decorations['tree']).toBe(2);
  });
});

describe('unlockArea', () => {
  it('requires the lifetime-coin milestone', () => {
    const s = createInitialState();
    // Give spendable coins but not enough lifetime history.
    s.coins = 100_000;
    s.lifetimeCoins = 0;
    const r = unlockArea(s, 'forest');
    expect(r.ok).toBe(false);
  });

  it('unlocks when milestone and cost are met', () => {
    const s = createInitialState();
    addCoins(s, 100_000); // lifetime also 100k
    const r = unlockArea(s, 'forest');
    expect(r.ok).toBe(true);
    expect(s.unlockedAreas).toContain('forest');
  });
});
