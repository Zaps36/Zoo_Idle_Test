// Core type definitions for Idle Zoo Tycoon.
// These describe the shape of game content (static data) and player state (save data).

export type AnimalId = string;
export type DecorationId = string;
export type AreaId = string;
export type SkinId = string;
export type SkinRarity = 'common' | 'rare' | 'epic';

export type ConservationStatus =
  | 'Least Concern'
  | 'Near Threatened'
  | 'Vulnerable'
  | 'Endangered';

/** Static definition of an animal species. Content, not player state. */
export interface AnimalDef {
  id: AnimalId;
  name: string;
  emoji: string;
  areaId: AreaId;
  /** Coins per second at level 1 before any multipliers. */
  baseIncome: number;
  /** Cost (in coins) to unlock/buy this animal for the first time. */
  unlockCost: number;
  /** Multiplier curve: each level adds this fraction of base income. */
  incomePerLevel: number;
  /** Cost to buy level 1->2. Later levels scale by upgradeCostGrowth. */
  baseUpgradeCost: number;
  /** Geometric growth factor applied to upgrade cost per level. */
  upgradeCostGrowth: number;
  /** Educational / conservation flavour. */
  latinName: string;
  status: ConservationStatus;
  fact: string;
}

/** Static definition of a decoration item (purely aesthetic + small beauty bonus). */
export interface DecorationDef {
  id: DecorationId;
  name: string;
  emoji: string;
  cost: number;
  /** Contribution to the zoo beauty score. */
  beauty: number;
}

/** Static definition of a themed area/zone. */
export interface AreaDef {
  id: AreaId;
  name: string;
  emoji: string;
  /** Cost in coins to unlock this area. 0 means unlocked from the start. */
  unlockCost: number;
  /** Lifetime coin milestone required before the area may be unlocked. */
  requiredLifetimeCoins: number;
}

/** Static definition of a cosmetic skin obtainable via gacha. */
export interface SkinDef {
  id: SkinId;
  name: string;
  animalId: AnimalId;
  rarity: SkinRarity;
  emoji: string;
}

// ---------------- Player (save) state ----------------

export interface AnimalState {
  /** Whether the player has unlocked (bought) this animal. */
  unlocked: boolean;
  /** Current upgrade level (1+). 0 means not yet owned. */
  level: number;
}

export interface GameState {
  /** Schema version for save migrations. */
  version: number;
  zooName: string;
  coins: number;
  gems: number;
  /** Total coins ever earned, used for area unlock milestones. */
  lifetimeCoins: number;
  animals: Record<AnimalId, AnimalState>;
  /** Decoration id -> count placed. */
  decorations: Record<DecorationId, number>;
  unlockedAreas: AreaId[];
  /** Owned cosmetic skins (gacha). */
  ownedSkins: SkinId[];
  /** Pulls since last guaranteed rare (pity counter). */
  pityCounter: number;
  /** Unix ms timestamp of last save, used for offline earnings. */
  lastSeen: number;
  /** Whether the intro tutorial has been completed/dismissed. */
  tutorialDone: boolean;
}
