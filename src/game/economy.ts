// Pure economy functions. No side effects, no DOM — easy to unit test.
// All income/cost formulas live here so balancing stays in one place.

import {
  ANIMAL_BY_ID,
  ANIMALS,
  DECORATION_BY_ID,
  DECORATIONS,
  OFFLINE_CAP_SECONDS,
} from './content';
import type { AnimalDef, GameState } from './types';

/** Income (coins/sec) a single animal produces at a given level, before global multipliers. */
export function animalIncome(def: AnimalDef, level: number): number {
  if (level <= 0) return 0;
  return def.baseIncome * (1 + def.incomePerLevel * (level - 1));
}

/** Cost in coins to upgrade an animal from its current level to the next. */
export function upgradeCost(def: AnimalDef, currentLevel: number): number {
  return Math.floor(
    def.baseUpgradeCost * Math.pow(def.upgradeCostGrowth, Math.max(0, currentLevel - 1)),
  );
}

/** Total beauty score from all placed decorations. */
export function beautyScore(state: GameState): number {
  let total = 0;
  for (const def of DECORATIONS) {
    const count = state.decorations[def.id] ?? 0;
    total += def.beauty * count;
  }
  return total;
}

/**
 * Visitor satisfaction multiplier applied to all income.
 * Beauty increases satisfaction with diminishing returns, capped at +100%.
 * Returns a value in [1.0, 2.0].
 */
export function satisfactionMultiplier(state: GameState): number {
  const beauty = beautyScore(state);
  // Smooth diminishing curve: approaches +1.0 (i.e. x2) as beauty grows.
  const bonus = beauty / (beauty + 120);
  return 1 + bonus;
}

/** Sum of raw per-second income from all owned animals (before satisfaction multiplier). */
export function rawIncomePerSecond(state: GameState): number {
  let total = 0;
  for (const def of ANIMALS) {
    const a = state.animals[def.id];
    if (a?.unlocked) {
      total += animalIncome(def, a.level);
    }
  }
  return total;
}

/** Final coins-per-second including the visitor satisfaction multiplier. */
export function totalIncomePerSecond(state: GameState): number {
  return rawIncomePerSecond(state) * satisfactionMultiplier(state);
}

/**
 * Coins earned while offline, capped at OFFLINE_CAP_SECONDS.
 * `elapsedSeconds` is the real time since the player was last seen.
 */
export function offlineEarnings(
  state: GameState,
  elapsedSeconds: number,
): { coins: number; cappedSeconds: number; capped: boolean } {
  const capped = elapsedSeconds >= OFFLINE_CAP_SECONDS;
  const seconds = Math.max(0, Math.min(elapsedSeconds, OFFLINE_CAP_SECONDS));
  const coins = Math.floor(totalIncomePerSecond(state) * seconds);
  return { coins, cappedSeconds: seconds, capped };
}

/** Whether the player can afford to unlock/buy an animal. */
export function canAffordAnimal(state: GameState, animalId: string): boolean {
  const def = ANIMAL_BY_ID.get(animalId);
  if (!def) return false;
  return state.coins >= def.unlockCost;
}

/** Whether the player can afford to buy one unit of a decoration. */
export function canAffordDecoration(state: GameState, decorationId: string): boolean {
  const def = DECORATION_BY_ID.get(decorationId);
  if (!def) return false;
  return state.coins >= def.cost;
}
