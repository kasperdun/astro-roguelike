import type { UpgradeId } from './ids';
import { UPGRADE_IDS } from './ids';
import type { UpgradeNode } from './types';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

const UPGRADE_DEFS: UpgradeDefs = {
    // ROOT: базовый урон — 5 уровней, +5 урона за уровень.
    weapon_damage: {
        title: 'Weapon Calibration',
        description: 'Базовый урон оружия. +5 урона за уровень.',
        icon: 'core',
        pos: { col: 0, row: 0 },
        maxLevel: 5,
        requires: [],
        cost: { currency: 'minerals', base: 5, growth: 1.45 },
        perLevel: { bulletDamageBonus: 5 }
    },

    // First ring (opens after first damage level)
    bullet_range: {
        title: 'Longer Range',
        description: 'Увеличивает дальность полёта пули (время жизни).',
        icon: 'core',
        pos: { col: -2, row: -1 },
        maxLevel: 4,
        requires: [{ id: 'weapon_damage', level: 1 }],
        cost: { currency: 'minerals', base: 14, growth: 1.42 },
        perLevel: { bulletLifetimeBonusSec: 0.08 }
    },
    hull_hp: {
        title: 'Reinforced Hull',
        description: 'Дополнительное здоровье корабля.',
        icon: 'core',
        pos: { col: 2, row: -1 },
        maxLevel: 5,
        requires: [{ id: 'weapon_damage', level: 1 }],
        cost: { currency: 'minerals', base: 14, growth: 1.4 },
        perLevel: { maxHpBonus: 15 }
    },
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
    move_speed: {
        title: 'Thrusters Tune-up',
        description: 'Скорость передвижения: максимум скорости корабля.',
        icon: 'core',
        pos: { col: 0, row: -3 },
        maxLevel: 4,
        requires: [{ id: 'weapon_damage', level: 1 }],
        cost: { currency: 'minerals', base: 16, growth: 1.43 },
        perLevel: { shipMaxSpeedBonusPxPerSec: 12 }
    },

    // Range branch (medium + long)
    bullet_speed: {
        title: 'High-Velocity Rounds',
        description: 'Скорость полёта пули.',
        icon: 'core',
        pos: { col: -4, row: -2 },
        maxLevel: 4,
        requires: [{ id: 'bullet_range', level: 1 }],
        cost: { currency: 'minerals', base: 28, growth: 1.45 },
        perLevel: { bulletSpeedBonusPxPerSec: 28 }
    },
    fire_rate: {
        title: 'Faster Cycling',
        description: 'Скорострельность (мультипликативно).',
        icon: 'core',
        pos: { col: -4, row: 0 },
        maxLevel: 5,
        requires: [{ id: 'bullet_range', level: 1 }],
        cost: { currency: 'minerals', base: 26, growth: 1.47 },
        perLevel: { weaponFireRateMult: 0.06 }
    },
    projectile_plus1: {
        title: '+1 Projectile',
        description: 'Добавляет вторую пулю к каждому выстрелу. Вторая летит параллельно первой со смещением.',
        icon: 'core',
        pos: { col: -6, row: -1 },
        maxLevel: 2,
        requires: [{ id: 'fire_rate', level: 1 }],
        cost: { currency: 'scrap', base: 25, growth: 1.0 },
        perLevel: { projectilesPerShotBonus: 1 }
    },
    damage_boost: {
        title: 'Focused Damage',
        description: 'Дополнительный урон (аддитивно).',
        icon: 'core',
        pos: { col: -6, row: 1 },
        maxLevel: 6,
        requires: [{ id: 'fire_rate', level: 2 }],
        cost: { currency: 'minerals', base: 55, growth: 1.52 },
        perLevel: { bulletDamageBonus: 3 }
    },
    marksman_protocol: {
        title: 'Marksman Protocol',
        description: 'Синергия дальности и скорости пули.',
        icon: 'core',
        pos: { col: -6, row: -3 },
        maxLevel: 1,
        requires: [{ id: 'bullet_speed', level: 2 }, { id: 'bullet_range', level: 3 }],
        cost: { currency: 'minerals', base: 90, growth: 1.0 },
        perLevel: { bulletLifetimeBonusSec: 0.18, bulletSpeedBonusPxPerSec: 60 }
    },

    // Hull/defense branch (short + long)
    health_drop_chance: {
        title: 'Health Scavenging',
        description: 'Шанс выпадения здоровья с астероидов и врагов. +5% за уровень.',
        icon: 'core',
        pos: { col: 2, row: -2 },
        maxLevel: 5,
        requires: [{ id: 'hull_hp', level: 1 }],
        cost: { currency: 'minerals', base: 38, growth: 1.5 },
        perLevel: { healthDropChanceBonus: 0.05 }
    },
    collision_plating: {
        title: 'Impact Plating',
        description: 'Снижает урон от столкновений.',
        icon: 'core',
        pos: { col: 4, row: -2 },
        maxLevel: 4,
        requires: [{ id: 'hull_hp', level: 1 }],
        cost: { currency: 'minerals', base: 24, growth: 1.44 },
        perLevel: { collisionDamageReduction: 0.06 }
    },
    shield_core: {
        title: 'Shield Core',
        description: 'Даёт щит, который поглощает урон до HP.',
        icon: 'core',
        pos: { col: 4, row: 0 },
        maxLevel: 3,
        requires: [{ id: 'hull_hp', level: 2 }],
        cost: { currency: 'minerals', base: 32, growth: 1.5 },
        perLevel: { maxShieldBonus: 18 }
    },
    shield_regen: {
        title: 'Shield Regenerator',
        description: 'Реген щита (после задержки).',
        icon: 'core',
        pos: { col: 6, row: 1 },
        maxLevel: 4,
        requires: [{ id: 'shield_core', level: 1 }],
        cost: { currency: 'minerals', base: 58, growth: 1.55 },
        perLevel: { shieldRegenPerSec: 2.4 }
    },
    shield_delay: {
        title: 'Quick Reboot',
        description: 'Сокращает задержку перед регеном щита.',
        icon: 'core',
        pos: { col: 6, row: -1 },
        maxLevel: 3,
        requires: [{ id: 'shield_core', level: 1 }],
        cost: { currency: 'minerals', base: 52, growth: 1.52 },
        perLevel: { shieldRegenDelayBonusSec: -0.18 }
    },
    fortress_protocol: {
        title: 'Fortress Protocol',
        description: 'Большой, дорогой апгрейд защиты.',
        icon: 'core',
        pos: { col: 8, row: 0 },
        maxLevel: 1,
        requires: [{ id: 'shield_regen', level: 3 }, { id: 'collision_plating', level: 3 }],
        cost: { currency: 'minerals', base: 160, growth: 1.0 },
        perLevel: { maxHpBonus: 35, maxShieldBonus: 25, collisionDamageReduction: 0.08 }
    },

    // Fuel branch
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
    },

    // Movement branch
    accel_control: {
        title: 'Acceleration Control',
        description: 'Ускорение корабля (мультипликативно).',
        icon: 'core',
        pos: { col: 2, row: -5 },
        maxLevel: 4,
        requires: [{ id: 'move_speed', level: 1 }],
        cost: { currency: 'minerals', base: 26, growth: 1.46 },
        perLevel: { shipAccelMult: 0.08 }
    },
    drift_tuning: {
        title: 'Drift Tuning',
        description: 'Синергия движения и экономии топлива.',
        icon: 'core',
        pos: { col: 4, row: -5 },
        maxLevel: 1,
        requires: [{ id: 'accel_control', level: 2 }, { id: 'fuel_thrust_eff', level: 2 }],
        cost: { currency: 'minerals', base: 110, growth: 1.0 },
        perLevel: { shipMaxSpeedBonusPxPerSec: 22, fuelDrainWhileThrustPerSecBonus: -0.35 }
    },

    // Mining/economy side branch
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
        pos: { col: 0, row: 3 },
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

export const UPGRADES: readonly UpgradeNode[] = UPGRADE_IDS.map((id) => ({
    id,
    ...UPGRADE_DEFS[id]
}));

export const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeNode>> = UPGRADES.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
}, {} as Record<UpgradeId, UpgradeNode>);


