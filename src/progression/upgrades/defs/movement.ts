import type { UpgradeId } from '../ids';
import type { UpgradeNode } from '../types';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

export const MOVEMENT_UPGRADE_DEFS: Partial<UpgradeDefs> = {
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
    }
};


