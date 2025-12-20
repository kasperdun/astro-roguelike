import type { UpgradeId } from '../ids';
import type { UpgradeNode } from '../types';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

export const FUEL_UPGRADE_DEFS: Partial<UpgradeDefs> = {
    fuel_capacity: {
        title: 'Fuel Tanks',
        description: 'Дополнительное топливо (и максимум топлива).',
        icon: 'core',
        pos: { col: 0, row: 2 },
        maxLevel: 5,
        requires: [{ id: 'weapon_damage', level: 1 }],
        cost: { currency: 'minerals', base: 14, growth: 1.4 },
        perLevel: { maxFuelBonus: 8 }
    },
    fuel_efficiency: {
        title: 'Fuel Efficiency',
        description: 'Снижает базовый расход топлива.',
        icon: 'core',
        pos: { col: -2, row: 4 },
        maxLevel: 4,
        requires: [{ id: 'fuel_capacity', level: 1 }],
        cost: { currency: 'minerals', base: 24, growth: 1.46 },
        perLevel: { fuelDrainPerSecBonus: -0.10 }
    },
    fuel_thrust_eff: {
        title: 'Thrust Efficiency',
        description: 'Снижает расход топлива при тяге.',
        icon: 'core',
        pos: { col: 0, row: 5 },
        maxLevel: 4,
        requires: [{ id: 'fuel_capacity', level: 2 }],
        cost: { currency: 'minerals', base: 30, growth: 1.48 },
        perLevel: { fuelDrainWhileThrustPerSecBonus: -0.24 }
    },
    fuel_shot_eff: {
        title: 'Ammo Injector',
        description: 'Снижает расход топлива за выстрел.',
        icon: 'core',
        pos: { col: 2, row: 4 },
        maxLevel: 4,
        requires: [{ id: 'fuel_capacity', level: 2 }],
        cost: { currency: 'minerals', base: 30, growth: 1.48 },
        perLevel: { fuelDrainPerShotBonus: -0.02 }
    },
    fuel_regen: {
        title: 'Fuel Regeneration',
        description: 'Реген топлива со временем.',
        icon: 'core',
        pos: { col: 0, row: 7 },
        maxLevel: 5,
        requires: [{ id: 'fuel_efficiency', level: 2 }],
        cost: { currency: 'minerals', base: 62, growth: 1.55 },
        perLevel: { fuelRegenPerSec: 0.22 }
    },
    fuel_drop_chance: {
        title: 'Fuel Scavenging',
        description: 'Шанс выпадения топлива с астероидов и врагов. +5% за уровень.',
        icon: 'core',
        pos: { col: -1, row: 4 },
        maxLevel: 5,
        requires: [{ id: 'fuel_capacity', level: 2 }],
        cost: { currency: 'minerals', base: 38, growth: 1.5 },
        perLevel: { fuelDropChanceBonus: 0.05 }
    }
};


