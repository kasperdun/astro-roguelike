import type { UpgradeId } from './ids';
import { getUpgradeAvailability } from './availability';
import { getPurchasedLevel, getUpgrade, getUpgradeCostForLevel } from './selectors';
import type { PurchasedUpgrades, PurchaseResult } from './types';

export function canPurchaseUpgrade(args: {
    purchased: PurchasedUpgrades;
    minerals: number;
    scrap: number;
    id: UpgradeId;
}): PurchaseResult {
    const { purchased, minerals, scrap, id } = args;
    const u = getUpgrade(id);
    const current = getPurchasedLevel(purchased, id);

    if (current >= u.maxLevel) return { ok: false, reason: 'maxed' };

    const availability = getUpgradeAvailability(purchased, id);
    if (availability.kind === 'locked') return { ok: false, reason: 'locked', missing: availability.missing };

    const nextLevel = current + 1;
    const cost = getUpgradeCostForLevel(id, nextLevel);
    if (u.cost.currency === 'minerals') {
        if (minerals < cost) return { ok: false, reason: 'not_enough_minerals', needed: cost, have: minerals };
    } else {
        if (scrap < cost) return { ok: false, reason: 'not_enough_scrap', needed: cost, have: scrap };
    }

    return { ok: true };
}


