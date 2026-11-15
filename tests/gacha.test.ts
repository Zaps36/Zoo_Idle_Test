import { describe, expect, it } from 'vitest';
import {
  GACHA_ODDS,
  GACHA_PITY_THRESHOLD,
  GACHA_PULL_COST_GEMS,
} from '../src/game/content';
import { pullMany, pullOnce } from '../src/game/gacha';
import { createInitialState } from '../src/game/state';

/** Deterministic RNG from a fixed sequence, looping. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length]!;
    i++;
    return v;
  };
}

describe('odds table', () => {
  it('sums to 1.0', () => {
    const sum = Object.values(GACHA_ODDS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });
});

describe('pullOnce', () => {
  it('returns null when the player cannot afford a pull', () => {
    const s = createInitialState();
    s.gems = 0;
    expect(pullOnce(s)).toBeNull();
  });

  it('spends gems on a successful pull', () => {
    const s = createInitialState();
    s.gems = GACHA_PULL_COST_GEMS;
    const out = pullOnce(s, seqRng([0.0, 0.0]));
    expect(out).not.toBeNull();
    expect(s.gems).toBe(0);
  });

  it('grants the skin and records it in the collection', () => {
    const s = createInitialState();
    s.gems = GACHA_PULL_COST_GEMS;
    // roll 0.0 => common rarity; second roll 0 => first common skin
    const out = pullOnce(s, seqRng([0.0, 0.0]))!;
    expect(out.duplicate).toBe(false);
    expect(s.ownedSkins).toContain(out.skin.id);
  });

  it('refunds a gem on a duplicate instead of granting again', () => {
    const s = createInitialState();
    s.gems = GACHA_PULL_COST_GEMS * 2;
    const rng = seqRng([0.0, 0.0]);
    const first = pullOnce(s, rng)!;
    const gemsAfterFirst = s.gems;
    // Pull the same common skin again deterministically.
    const second = pullOnce(s, seqRng([0.0, 0.0]))!;
    expect(second.skin.id).toBe(first.skin.id);
    expect(second.duplicate).toBe(true);
    expect(second.gemsRefunded).toBeGreaterThan(0);
    expect(s.gems).toBe(gemsAfterFirst - GACHA_PULL_COST_GEMS + second.gemsRefunded);
  });
});

describe('pity system', () => {
  it('guarantees a rare+ at the pity threshold even on all-common rolls', () => {
    const s = createInitialState();
    s.gems = GACHA_PULL_COST_GEMS * GACHA_PITY_THRESHOLD;
    // Always roll 0.0 (would otherwise always be common).
    const results = pullMany(s, GACHA_PITY_THRESHOLD, seqRng([0.0]));
    const pityPull = results[GACHA_PITY_THRESHOLD - 1]!;
    expect(pityPull.pity).toBe(true);
    expect(pityPull.skin.rarity).not.toBe('common');
  });

  it('resets the pity counter after a rare+ drop', () => {
    const s = createInitialState();
    s.gems = GACHA_PULL_COST_GEMS * 5;
    // roll 0.99 => epic (resets pity immediately)
    pullOnce(s, seqRng([0.99, 0.0]));
    expect(s.pityCounter).toBe(0);
  });
});

describe('pullMany', () => {
  it('stops early when gems run out', () => {
    const s = createInitialState();
    s.gems = GACHA_PULL_COST_GEMS * 2; // only 2 pulls affordable
    const results = pullMany(s, 10, seqRng([0.0]));
    expect(results.length).toBe(2);
    // Gems spent down to the duplicate-refund floor: 2 pulls cost 2*COST;
    // the second pull duplicated the first common skin, refunding 1 gem.
    expect(results[1]!.duplicate).toBe(true);
    expect(s.gems).toBe(results[1]!.gemsRefunded);
  });
});
