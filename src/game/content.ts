// Static game content: areas, animals, decorations, and gacha skins.
// All balancing numbers live here so they are easy to tune in one place.

import type { AnimalDef, AreaDef, DecorationDef, SkinDef } from './types';

export const OFFLINE_CAP_HOURS = 8;
export const OFFLINE_CAP_SECONDS = OFFLINE_CAP_HOURS * 3600;

export const AREAS: AreaDef[] = [
  {
    id: 'savanna',
    name: 'Savana',
    emoji: '\u{1F33E}',
    unlockCost: 0,
    requiredLifetimeCoins: 0,
  },
  {
    id: 'forest',
    name: 'Hutan',
    emoji: '\u{1F332}',
    unlockCost: 5000,
    requiredLifetimeCoins: 8000,
  },
];

export const ANIMALS: AnimalDef[] = [
  {
    id: 'rabbit',
    name: 'Kelinci',
    emoji: '\u{1F430}',
    areaId: 'savanna',
    baseIncome: 1,
    unlockCost: 0, // first animal is free (tutorial)
    incomePerLevel: 0.25,
    baseUpgradeCost: 50,
    upgradeCostGrowth: 1.18,
    latinName: 'Oryctolagus cuniculus',
    status: 'Least Concern',
    fact: 'Kelinci dapat melompat hingga 3 meter dalam sekali lompatan.',
  },
  {
    id: 'zebra',
    name: 'Zebra',
    emoji: '\u{1F993}',
    areaId: 'savanna',
    baseIncome: 5,
    unlockCost: 250,
    incomePerLevel: 0.2,
    baseUpgradeCost: 180,
    upgradeCostGrowth: 1.2,
    latinName: 'Equus quagga',
    status: 'Near Threatened',
    fact: 'Setiap zebra memiliki pola garis yang unik, seperti sidik jari.',
  },
  {
    id: 'giraffe',
    name: 'Jerapah',
    emoji: '\u{1F992}',
    areaId: 'savanna',
    baseIncome: 22,
    unlockCost: 1500,
    incomePerLevel: 0.18,
    baseUpgradeCost: 900,
    upgradeCostGrowth: 1.22,
    latinName: 'Giraffa camelopardalis',
    status: 'Vulnerable',
    fact: 'Jerapah hanya tidur sekitar 30 menit sehari.',
  },
  {
    id: 'redpanda',
    name: 'Panda Merah',
    emoji: '\u{1F43C}',
    areaId: 'forest',
    baseIncome: 70,
    unlockCost: 6000,
    incomePerLevel: 0.16,
    baseUpgradeCost: 3200,
    upgradeCostGrowth: 1.24,
    latinName: 'Ailurus fulgens',
    status: 'Endangered',
    fact: 'Panda merah menggunakan ekornya yang tebal sebagai selimut saat tidur.',
  },
  {
    id: 'lemur',
    name: 'Lemur',
    emoji: '\u{1F435}',
    areaId: 'forest',
    baseIncome: 160,
    unlockCost: 18000,
    incomePerLevel: 0.15,
    baseUpgradeCost: 9000,
    upgradeCostGrowth: 1.25,
    latinName: 'Lemur catta',
    status: 'Endangered',
    fact: 'Lemur ekor cincin berjemur di pagi hari dengan pose seperti meditasi.',
  },
];

export const DECORATIONS: DecorationDef[] = [
  { id: 'tree', name: 'Pohon', emoji: '\u{1F333}', cost: 120, beauty: 2 },
  { id: 'flowers', name: 'Bunga', emoji: '\u{1F337}', cost: 80, beauty: 1 },
  { id: 'bench', name: 'Bangku Taman', emoji: '\u{1FA91}', cost: 200, beauty: 3 },
  { id: 'fountain', name: 'Air Mancur', emoji: '\u{26F2}', cost: 650, beauty: 8 },
  { id: 'statue', name: 'Patung', emoji: '\u{1F5FF}', cost: 1200, beauty: 14 },
];

// Cosmetic-only gacha skins. No gameplay advantage.
export const SKINS: SkinDef[] = [
  { id: 'rabbit_gold', name: 'Kelinci Emas', animalId: 'rabbit', rarity: 'rare', emoji: '\u{1F430}' },
  { id: 'rabbit_blue', name: 'Kelinci Biru', animalId: 'rabbit', rarity: 'common', emoji: '\u{1F430}' },
  { id: 'zebra_neon', name: 'Zebra Neon', animalId: 'zebra', rarity: 'epic', emoji: '\u{1F993}' },
  { id: 'zebra_pastel', name: 'Zebra Pastel', animalId: 'zebra', rarity: 'common', emoji: '\u{1F993}' },
  { id: 'giraffe_spot', name: 'Jerapah Bintang', animalId: 'giraffe', rarity: 'rare', emoji: '\u{1F992}' },
  { id: 'redpanda_frost', name: 'Panda Salju', animalId: 'redpanda', rarity: 'epic', emoji: '\u{1F43C}' },
  { id: 'lemur_rainbow', name: 'Lemur Pelangi', animalId: 'lemur', rarity: 'epic', emoji: '\u{1F435}' },
];

// Transparent gacha odds (sum to 1.0). Shown to the player in the UI.
export const GACHA_ODDS: Record<string, number> = {
  common: 0.7,
  rare: 0.25,
  epic: 0.05,
};

export const GACHA_PULL_COST_GEMS = 5;
export const GACHA_PITY_THRESHOLD = 20; // guaranteed rare+ every 20 pulls
export const DUPLICATE_GEM_REFUND = 1;

// Lookup helpers.
export const ANIMAL_BY_ID = new Map(ANIMALS.map((a) => [a.id, a]));
export const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]));
export const DECORATION_BY_ID = new Map(DECORATIONS.map((d) => [d.id, d]));
export const SKIN_BY_ID = new Map(SKINS.map((s) => [s.id, s]));
