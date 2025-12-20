import type { UpgradeId } from '../ids';
import type { UpgradeNode } from '../types';

export type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

export const WEAPON_UPGRADE_DEFS: Partial<UpgradeDefs> = {
    // ROOT: базовый урон — под новый “микро-масштаб” (стартовый урон игрока = 1).
    weapon_damage: {
        title: 'Weapon Calibration',
        description: 'Базовый урон оружия. +1 урон за уровень.',
        icon: 'core',
        pos: { col: 0, row: 0 },
        maxLevel: 8,
        requires: [],
        cost: { currency: 'minerals', base: 4, growth: 1.32 },
        perLevel: { bulletDamageBonus: 1 }
    },

    // First ring (opens after first damage level)
    bullet_range: {
        title: 'Longer Range',
        description: 'Увеличивает дальность полёта пули (время жизни).',
        icon: 'core',
        pos: { col: -2, row: -1 },
        maxLevel: 4,
        requires: [{ id: 'weapon_damage', level: 1 }],
        cost: { currency: 'minerals', base: 6, growth: 1.34 },
        perLevel: { bulletLifetimeBonusSec: 0.08 }
    },
    bullet_speed: {
        title: 'High-Velocity Rounds',
        description: 'Скорость полёта пули.',
        icon: 'core',
        pos: { col: -4, row: -2 },
        maxLevel: 4,
        requires: [{ id: 'bullet_range', level: 1 }],
        cost: { currency: 'minerals', base: 10, growth: 1.36 },
        perLevel: { bulletSpeedBonusPxPerSec: 28 }
    },
    fire_rate: {
        title: 'Faster Cycling',
        description: 'Скорострельность (мультипликативно).',
        icon: 'core',
        pos: { col: -5, row: -1 },
        maxLevel: 5,
        requires: [{ id: 'bullet_range', level: 1 }],
        cost: { currency: 'minerals', base: 10, growth: 1.37 },
        perLevel: { weaponFireRateMult: 0.05 }
    },
    projectile_plus1: {
        title: '+1 Projectile',
        description: 'Добавляет вторую пулю к каждому выстрелу. Вторая летит параллельно первой со смещением.',
        icon: 'core',
        pos: { col: -6, row: -1 },
        maxLevel: 2,
        requires: [{ id: 'fire_rate', level: 1 }],
        cost: { currency: 'scrap', base: 10, growth: 1.0 },
        perLevel: { projectilesPerShotBonus: 1 }
    },
    damage_boost: {
        title: 'Focused Damage',
        description: 'Дополнительный урон (аддитивно).',
        icon: 'core',
        pos: { col: -6, row: 1 },
        maxLevel: 6,
        requires: [{ id: 'fire_rate', level: 2 }],
        cost: { currency: 'minerals', base: 18, growth: 1.40 },
        perLevel: { bulletDamageBonus: 1 }
    },
    marksman_protocol: {
        title: 'Marksman Protocol',
        description: 'Синергия дальности и скорости пули.',
        icon: 'core',
        pos: { col: -6, row: -3 },
        maxLevel: 1,
        requires: [{ id: 'bullet_speed', level: 2 }, { id: 'bullet_range', level: 3 }],
        cost: { currency: 'minerals', base: 28, growth: 1.0 },
        perLevel: { bulletLifetimeBonusSec: 0.18, bulletSpeedBonusPxPerSec: 60 }
    }
};


