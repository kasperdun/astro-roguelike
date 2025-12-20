import type { UpgradeId } from '../ids';
import type { UpgradeNode } from '../types';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

export const ECONOMY_UPGRADE_DEFS: Partial<UpgradeDefs> = {
    mining_yield: {
        title: 'Mining Yield',
        description: 'Больше минералов за разрушенный астероид.',
        icon: 'core',
        pos: { col: -2, row: 1 },
        maxLevel: 6,
        requires: [{ id: 'weapon_damage', level: 1 }],
        cost: { currency: 'minerals', base: 18, growth: 1.43 },
        perLevel: { asteroidMineralYieldBonus: 1 }
    },
    mining_mastery: {
        title: 'Mining Mastery',
        description: 'Дорогая “короткая ветка” на доход.',
        icon: 'core',
        pos: { col: -4, row: 2 },
        maxLevel: 1,
        requires: [{ id: 'mining_yield', level: 4 }],
        cost: { currency: 'minerals', base: 120, growth: 1.0 },
        perLevel: { asteroidMineralYieldBonus: 2 }
    },

    asteroid_spawn_rate: {
        title: 'Asteroid Magnet',
        description: 'Ускоряет спавн астероидов (сокращает интервал).',
        icon: 'core',
        pos: { col: -4, row: 0 },
        maxLevel: 4,
        requires: [{ id: 'mining_yield', level: 2 }],
        cost: { currency: 'minerals', base: 42, growth: 1.48 },
        perLevel: { asteroidSpawnIntervalReduction: 0.08 }
    },
    asteroid_max_count: {
        title: 'Dense Field',
        description: 'Увеличивает максимальное количество астероидов одновременно.',
        icon: 'core',
        pos: { col: -6, row: 3 },
        maxLevel: 3,
        requires: [{ id: 'asteroid_spawn_rate', level: 2 }],
        cost: { currency: 'minerals', base: 64, growth: 1.5 },
        perLevel: { asteroidsMaxCountBonus: 1 }
    },
    asteroid_explosion_damage: {
        title: 'Volatile Core',
        description: 'Астероиды начинают наносить AOE-урон при взрыве (база: 0).',
        icon: 'core',
        pos: { col: -8, row: 4 },
        maxLevel: 4,
        requires: [{ id: 'asteroid_max_count', level: 1 }],
        cost: { currency: 'minerals', base: 78, growth: 1.52 },
        perLevel: { asteroidExplosionDamageBonus: 18 }
    },
    asteroid_explosion_radius: {
        title: 'Blast Radius',
        description: 'Увеличивает радиус AOE-урона от взрыва астероида.',
        icon: 'core',
        pos: { col: -8, row: 6 },
        maxLevel: 4,
        requires: [{ id: 'asteroid_explosion_damage', level: 1 }],
        cost: { currency: 'minerals', base: 62, growth: 1.45 },
        perLevel: { asteroidExplosionRadiusBonusPx: 10 }
    },
    enemy_resource_yield: {
        title: 'Salvage Protocol',
        description: 'Больше ресурсов с вражеских кораблей (минералы).',
        icon: 'core',
        pos: { col: -2, row: 3 },
        maxLevel: 5,
        requires: [{ id: 'mining_yield', level: 2 }],
        cost: { currency: 'minerals', base: 34, growth: 1.47 },
        perLevel: { enemyMineralYieldBonus: 1 }
    },
    pickup_radius: {
        title: 'Collection Field',
        description: 'Радиус притяжения лута к кораблю. +8 px за уровень.',
        icon: 'core',
        pos: { col: -1, row: 2 },
        maxLevel: 5,
        requires: [{ id: 'mining_yield', level: 2 }],
        cost: { currency: 'minerals', base: 26, growth: 1.46 },
        perLevel: { pickupMagnetRadiusBonusPx: 8 }
    },
    magnet_drop_chance: {
        title: 'Magnet Scavenging',
        description: 'Шанс выпадения магнита при убийстве врага. +1% за уровень.',
        icon: 'core',
        pos: { col: -4, row: 4 },
        maxLevel: 5,
        requires: [{ id: 'enemy_resource_yield', level: 1 }],
        cost: { currency: 'minerals', base: 38, growth: 1.5 },
        perLevel: { magnetDropChanceBonus: 0.01 }
    }
};


