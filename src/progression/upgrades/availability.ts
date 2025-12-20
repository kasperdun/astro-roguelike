import type { UpgradeId } from './ids';
import { getPurchasedLevel, getUpgrade } from './selectors';
import type { PurchasedUpgrades, UpgradeAvailability } from './types';

export function getUpgradeAvailability(purchased: PurchasedUpgrades, id: UpgradeId): UpgradeAvailability {
    const u = getUpgrade(id);
    const current = getPurchasedLevel(purchased, id);
    if (current >= u.maxLevel) return { kind: 'maxed' };

    const missing = u.requires.filter((r) => getPurchasedLevel(purchased, r.id) < r.level);
    return missing.length ? { kind: 'locked', missing } : { kind: 'available' };
}





