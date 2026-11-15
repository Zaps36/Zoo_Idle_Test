// Cosmetic-only gacha. Transparent odds + pity system, no gameplay advantage.

import {
  DUPLICATE_GEM_REFUND,
  GACHA_ODDS,
  GACHA_PITY_THRESHOLD,
  GACHA_PULL_COST_GEMS,
  SKINS,
} from './content';
import type { GameState, SkinDef, SkinRarity } from './types';

export interface PullOutcome {
  skin: SkinDef;
  duplicate: boolean;
  /** Gems refunded if this was a duplicate. */
  gemsRefunded: number;
  /** True if this pull was forced to rare+ by the pity system. */
  pity: boolean;
}

/** Pick a rarity from the odds table using a [0,1) roll. */
function rollRarity(roll: number): SkinRarity {
  let acc = 0;
  for (const rarity of ['common', 'rare', 'epic'] as SkinRarity[]) {
    acc += GACHA_ODDS[rarity] ?? 0;
    if (roll < acc) return rarity;
  }
  return 'common';
}

function skinsOfRarity(rarity: SkinRarity): SkinDef[] {
  return SKINS.filter((s) => s.rarity === rarity);
}

/**
 * Perform a single pull. Mutates `state` (spends gems, updates pity, grants skin or refund).
 * `rng` defaults to Math.random but is injectable for deterministic tests.
 * Returns null if the player cannot afford the pull.
 */
export function pullOnce(state: GameState, rng: () => number = Math.random): PullOutcome | null {
  if (state.gems < GACHA_PULL_COST_GEMS) return null;
  state.gems -= GACHA_PULL_COST_GEMS;

  // Pity: when the counter reaches the threshold, force at least a rare.
  const pityTriggered = state.pityCounter + 1 >= GACHA_PITY_THRESHOLD;
  let rarity: SkinRarity = rollRarity(rng());
  if (pityTriggered && rarity === 'common') {
    rarity = rng() < (GACHA_ODDS.epic ?? 0) / ((GACHA_ODDS.rare ?? 0) + (GACHA_ODDS.epic ?? 0))
      ? 'epic'
      : 'rare';
  }

  if (rarity === 'common') {
    state.pityCounter += 1;
  } else {
    state.pityCounter = 0; // rare+ resets pity
  }

  const pool = skinsOfRarity(rarity);
  const skin = pool[Math.floor(rng() * pool.length)] ?? pool[0]!;

  const duplicate = state.ownedSkins.includes(skin.id);
  if (duplicate) {
    state.gems += DUPLICATE_GEM_REFUND;
    return { skin, duplicate: true, gemsRefunded: DUPLICATE_GEM_REFUND, pity: pityTriggered };
  }
  state.ownedSkins.push(skin.id);
  return { skin, duplicate: false, gemsRefunded: 0, pity: pityTriggered };
}

/** Perform up to `count` pulls, stopping early if the player runs out of gems. */
export function pullMany(
  state: GameState,
  count: number,
  rng: () => number = Math.random,
): PullOutcome[] {
  const results: PullOutcome[] = [];
  for (let i = 0; i < count; i++) {
    const outcome = pullOnce(state, rng);
    if (!outcome) break;
    results.push(outcome);
  }
  return results;
}

export { GACHA_PULL_COST_GEMS, GACHA_PITY_THRESHOLD, GACHA_ODDS };
