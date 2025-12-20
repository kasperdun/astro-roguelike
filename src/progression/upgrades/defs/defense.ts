import type { UpgradeId } from '../ids';
import type { UpgradeNode } from '../types';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

export const DEFENSE_UPGRADE_DEFS: Partial<UpgradeDefs> = {
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
    }
};


