import type { UpgradeId } from './ids';
import { UPGRADE_IDS } from './ids';
import type { UpgradeNode } from './types';
import { DEFENSE_UPGRADE_DEFS } from './defs/defense';
import { ECONOMY_UPGRADE_DEFS } from './defs/economy';
import { FUEL_UPGRADE_DEFS } from './defs/fuel';
import { MOVEMENT_UPGRADE_DEFS } from './defs/movement';
import { WEAPON_UPGRADE_DEFS } from './defs/weapon';
import { BOSS_CORE_UPGRADE_DEFS } from './defs/bossCore';

type UpgradeDefs = Record<UpgradeId, Omit<UpgradeNode, 'id'>>;

const UPGRADE_DEFS = {
    ...WEAPON_UPGRADE_DEFS,
    ...DEFENSE_UPGRADE_DEFS,
    ...FUEL_UPGRADE_DEFS,
    ...MOVEMENT_UPGRADE_DEFS,
    ...ECONOMY_UPGRADE_DEFS,
    ...BOSS_CORE_UPGRADE_DEFS
} satisfies Partial<UpgradeDefs>;

function getUpgradeDef(id: UpgradeId): Omit<UpgradeNode, 'id'> {
    const def = UPGRADE_DEFS[id];
    if (!def) throw new Error(`Missing upgrade def for id: ${id}`);
    return def;
}

export const UPGRADES: readonly UpgradeNode[] = UPGRADE_IDS.map((id) => ({
    id,
    ...getUpgradeDef(id)
}));

export const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeNode>> = UPGRADES.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
}, {} as Record<UpgradeId, UpgradeNode>);


