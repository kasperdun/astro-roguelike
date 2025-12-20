import type { UpgradeId } from '../ids';
import type { UpgradeNode } from '../types';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

export const BOSS_CORE_UPGRADE_DEFS: Partial<UpgradeDefs> = {
    core_overdrive: {
        title: 'Core Overdrive',
        description: 'Ядро усиливает орудия: большой буст урона и скорострельности.',
        icon: 'core',
        pos: { col: -8, row: -3 },
        maxLevel: 1,
        requires: [{ id: 'marksman_protocol', level: 1 }],
        cost: { currency: 'core', base: 1, growth: 1.0 },
        perLevel: { bulletDamageBonus: 6, weaponFireRateMult: 0.15 }
    },
    core_phase_shield: {
        title: 'Phase Shield',
        description: 'Ядро усиливает защиту: большой щит и быстрый реген.',
        icon: 'core',
        pos: { col: 10, row: 0 },
        maxLevel: 1,
        requires: [{ id: 'fortress_protocol', level: 1 }],
        cost: { currency: 'core', base: 1, growth: 1.0 },
        perLevel: { maxShieldBonus: 55, shieldRegenPerSec: 3.6 }
    }
};


