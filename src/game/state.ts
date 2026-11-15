// Player state: creation, actions (mutations), and save/load.

import { ANIMAL_BY_ID, ANIMALS, AREA_BY_ID, DECORATION_BY_ID } from './content';
import { upgradeCost } from './economy';
import type { AnimalId, AreaId, DecorationId, GameState } from './types';

export const SAVE_KEY = 'idle-zoo-save-v1';
export const SAVE_VERSION = 1;

/** Fresh state for a brand-new player. The first animal (rabbit) starts unlocked. */
export function createInitialState(zooName = 'Kebun Binatangku'): GameState {
  const animals: GameState['animals'] = {};
  for (const def of ANIMALS) {
    const isStarter = def.id === 'rabbit';
    animals[def.id] = { unlocked: isStarter, level: isStarter ? 1 : 0 };
  }
  return {
    version: SAVE_VERSION,
    zooName,
    coins: 0,
    gems: 10,
    lifetimeCoins: 0,
    animals,
    decorations: {},
    unlockedAreas: ['savanna'],
    ownedSkins: [],
    pityCounter: 0,
    lastSeen: Date.now(),
    tutorialDone: false,
  };
}

/** Add coins and track lifetime total. */
export function addCoins(state: GameState, amount: number): void {
  if (amount <= 0) return;
  state.coins += amount;
  state.lifetimeCoins += amount;
}

export type ActionResult = { ok: true } | { ok: false; reason: string };

/** Unlock (buy) an animal. Fails if locked area, already owned, or unaffordable. */
export function unlockAnimal(state: GameState, animalId: AnimalId): ActionResult {
  const def = ANIMAL_BY_ID.get(animalId);
  if (!def) return { ok: false, reason: 'Hewan tidak dikenal.' };
  if (!state.unlockedAreas.includes(def.areaId)) {
    return { ok: false, reason: 'Area belum dibuka.' };
  }
  const a = state.animals[animalId];
  if (a?.unlocked) return { ok: false, reason: 'Hewan sudah dimiliki.' };
  if (state.coins < def.unlockCost) return { ok: false, reason: 'Koin tidak cukup.' };
  state.coins -= def.unlockCost;
  state.animals[animalId] = { unlocked: true, level: 1 };
  return { ok: true };
}

/** Upgrade an owned animal by one level. */
export function upgradeAnimal(state: GameState, animalId: AnimalId): ActionResult {
  const def = ANIMAL_BY_ID.get(animalId);
  if (!def) return { ok: false, reason: 'Hewan tidak dikenal.' };
  const a = state.animals[animalId];
  if (!a?.unlocked) return { ok: false, reason: 'Hewan belum dimiliki.' };
  const cost = upgradeCost(def, a.level);
  if (state.coins < cost) return { ok: false, reason: 'Koin tidak cukup.' };
  state.coins -= cost;
  a.level += 1;
  return { ok: true };
}

/** Buy and place one unit of a decoration. */
export function buyDecoration(state: GameState, decorationId: DecorationId): ActionResult {
  const def = DECORATION_BY_ID.get(decorationId);
  if (!def) return { ok: false, reason: 'Dekorasi tidak dikenal.' };
  if (state.coins < def.cost) return { ok: false, reason: 'Koin tidak cukup.' };
  state.coins -= def.cost;
  state.decorations[decorationId] = (state.decorations[decorationId] ?? 0) + 1;
  return { ok: true };
}

/** Unlock a new area. Requires both the lifetime-coin milestone and the coin cost. */
export function unlockArea(state: GameState, areaId: AreaId): ActionResult {
  const def = AREA_BY_ID.get(areaId);
  if (!def) return { ok: false, reason: 'Area tidak dikenal.' };
  if (state.unlockedAreas.includes(areaId)) return { ok: false, reason: 'Area sudah dibuka.' };
  if (state.lifetimeCoins < def.requiredLifetimeCoins) {
    return { ok: false, reason: 'Belum mencapai milestone pendapatan.' };
  }
  if (state.coins < def.unlockCost) return { ok: false, reason: 'Koin tidak cukup.' };
  state.coins -= def.unlockCost;
  state.unlockedAreas.push(areaId);
  return { ok: true };
}

// ---------------- Persistence ----------------

export function saveState(state: GameState): void {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); fail silently.
  }
}

/** Load and validate a saved state, migrating missing fields. Returns null if none/invalid. */
export function loadState(): GameState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return migrate(parsed);
  } catch {
    return null;
  }
}

/** Merge a (possibly partial/old) save onto a fresh state so new content fields exist. */
function migrate(parsed: Partial<GameState>): GameState {
  const base = createInitialState(parsed.zooName ?? 'Kebun Binatangku');
  const merged: GameState = {
    ...base,
    ...parsed,
    version: SAVE_VERSION,
    animals: { ...base.animals, ...(parsed.animals ?? {}) },
    decorations: { ...(parsed.decorations ?? {}) },
    unlockedAreas: parsed.unlockedAreas?.length ? parsed.unlockedAreas : base.unlockedAreas,
    ownedSkins: parsed.ownedSkins ?? [],
  };
  // Ensure every known animal has a state entry.
  for (const def of ANIMALS) {
    if (!merged.animals[def.id]) {
      merged.animals[def.id] = { unlocked: false, level: 0 };
    }
  }
  return merged;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
