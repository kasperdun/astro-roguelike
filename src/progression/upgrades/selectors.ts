import type { UpgradeId } from './ids';
import { UPGRADE_BY_ID } from './defs';
import type { PurchasedUpgrades, UpgradeNode } from './types';

export function getUpgrade(id: UpgradeId): UpgradeNode {
    return UPGRADE_BY_ID[id];
}

export function getPurchasedLevel(purchased: PurchasedUpgrades, id: UpgradeId): number {
    return Math.max(0, purchased[id] ?? 0);
}

export function getUpgradeCostForLevel(id: UpgradeId, level: number): number {
    const u = getUpgrade(id);
    const lvl = Math.max(1, Math.min(u.maxLevel, level));
    const raw = u.cost.base * Math.pow(u.cost.growth, lvl - 1);
    return Math.max(1, Math.round(raw));
}


