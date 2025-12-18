export type UpgradeId =
    | 'hull_1'
    | 'hull_2'
    | 'hull_3'
    | 'tank_1'
    | 'tank_2'
    | 'tank_3'
    | 'thrusters_1'
    | 'thrusters_2'
    | 'mining_1'
    | 'mining_2';

export type UpgradeEffect = {
    /** Бонус к стартовому HP корабля (прибавляется к базовому GAME_CONFIG.shipStartHp). */
    startHpBonus?: number;
    /** Бонус к стартовому топливу корабля (прибавляется к базовому GAME_CONFIG.shipStartFuel). */
    startFuelBonus?: number;
    /** Бонус к количеству минералов, выпадающих за один разрушенный астероид (аддитивно). */
    asteroidMineralYieldBonus?: number;
};

export type UpgradeIcon = 'core' | 'hull' | 'fuel' | 'thrusters' | 'mining';

export type UpgradeNode = {
    id: UpgradeId;
    title: string;
    description: string;
    /** Цена в минералах (meta-банк). */
    costMinerals: number;
    /** Требования: все перечисленные апгрейды должны быть куплены. */
    requires: readonly UpgradeId[];
    effect: UpgradeEffect;
    /** Иконка для UI. */
    icon: UpgradeIcon;
    /**
     * Позиция для отрисовки дерева в UI.
     * Единицы — логическая "сетка"; UI сам умножает на spacing.
     * Ожидается, что 0/0 — центральный узел, а ветки расходятся в стороны.
     */
    pos: { col: number; row: number };
};

export type PurchasedUpgrades = Partial<Record<UpgradeId, true>>;

export type UpgradeAvailability =
    | { kind: 'bought' }
    | { kind: 'available' }
    | { kind: 'locked'; missing: UpgradeId[] };

export type PurchaseResult =
    | { ok: true }
    | { ok: false; reason: 'already_bought' }
    | { ok: false; reason: 'locked'; missing: UpgradeId[] }
    | { ok: false; reason: 'not_enough_minerals'; needed: number; have: number };

export const UPGRADES: readonly UpgradeNode[] = [
    {
        id: 'hull_1',
        title: 'Reinforced Hull I',
        description: '+20 HP. Базовое усиление корпуса.',
        costMinerals: 10,
        requires: [],
        effect: { startHpBonus: 20 },
        icon: 'core',
        pos: { col: 0, row: 0 }
    },
    {
        id: 'hull_2',
        title: 'Reinforced Hull II',
        description: '+35 HP. Дальше по ветке корпуса.',
        costMinerals: 25,
        requires: ['hull_1'],
        effect: { startHpBonus: 35 },
        icon: 'hull',
        pos: { col: 2, row: 0 }
    },
    {
        id: 'hull_3',
        title: 'Reinforced Hull III',
        description: '+55 HP. Максимум ветки корпуса (MVP).',
        costMinerals: 55,
        requires: ['hull_2'],
        effect: { startHpBonus: 55 },
        icon: 'hull',
        pos: { col: 4, row: 0 }
    },

    {
        id: 'tank_1',
        title: 'Fuel Tank I',
        description: '+20 Fuel. Базовый запас топлива.',
        costMinerals: 10,
        requires: ['hull_1'],
        effect: { startFuelBonus: 20 },
        icon: 'fuel',
        pos: { col: 0, row: 2 }
    },
    {
        id: 'tank_2',
        title: 'Fuel Tank II',
        description: '+35 Fuel. Дальше по ветке топлива.',
        costMinerals: 25,
        requires: ['tank_1'],
        effect: { startFuelBonus: 35 },
        icon: 'fuel',
        pos: { col: 0, row: 4 }
    },
    {
        id: 'tank_3',
        title: 'Fuel Tank III',
        description: '+55 Fuel. Максимум ветки топлива (MVP).',
        costMinerals: 55,
        requires: ['tank_2'],
        effect: { startFuelBonus: 55 },
        icon: 'fuel',
        pos: { col: 0, row: 6 }
    },

    {
        id: 'thrusters_1',
        title: 'Thrusters I (stub)',
        description: 'Заглушка под будущие статы движения. Пока без эффекта.',
        costMinerals: 15,
        requires: ['hull_1'],
        effect: {},
        icon: 'thrusters',
        pos: { col: 2, row: -2 }
    },
    {
        id: 'thrusters_2',
        title: 'Thrusters II (stub)',
        description: 'Заглушка под будущие статы движения. Пока без эффекта.',
        costMinerals: 35,
        requires: ['thrusters_1'],
        effect: {},
        icon: 'thrusters',
        pos: { col: 4, row: -2 }
    },

    {
        id: 'mining_1',
        title: 'Mining Yield I',
        description: '+1 mineral per asteroid. Упрощённая экономика (MVP).',
        costMinerals: 12,
        requires: ['hull_1'],
        effect: { asteroidMineralYieldBonus: 1 },
        icon: 'mining',
        pos: { col: -2, row: 0 }
    },
    {
        id: 'mining_2',
        title: 'Mining Yield II',
        description: '+1 mineral per asteroid. Продолжение ветки добычи (MVP).',
        costMinerals: 28,
        requires: ['mining_1'],
        effect: { asteroidMineralYieldBonus: 1 },
        icon: 'mining',
        pos: { col: -4, row: 0 }
    }
] as const;

const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeNode>> = UPGRADES.reduce(
    (acc, u) => {
        acc[u.id] = u;
        return acc;
    },
    {} as Record<UpgradeId, UpgradeNode>
);

export function getUpgrade(id: UpgradeId): UpgradeNode {
    return UPGRADE_BY_ID[id];
}

export function getUpgradeAvailability(purchased: PurchasedUpgrades, id: UpgradeId): UpgradeAvailability {
    if (purchased[id]) return { kind: 'bought' };
    const u = getUpgrade(id);
    if (!u.requires.length) return { kind: 'available' };

    const missing = u.requires.filter((req) => !purchased[req]);
    return missing.length ? { kind: 'locked', missing } : { kind: 'available' };
}

export function canPurchaseUpgrade(args: {
    purchased: PurchasedUpgrades;
    minerals: number;
    id: UpgradeId;
}): PurchaseResult {
    const { purchased, minerals, id } = args;

    if (purchased[id]) return { ok: false, reason: 'already_bought' };

    const availability = getUpgradeAvailability(purchased, id);
    if (availability.kind === 'locked') return { ok: false, reason: 'locked', missing: availability.missing };

    const u = getUpgrade(id);
    if (minerals < u.costMinerals) {
        return { ok: false, reason: 'not_enough_minerals', needed: u.costMinerals, have: minerals };
    }

    return { ok: true };
}

export type ShipStartStats = { startHp: number; startFuel: number };

export function deriveShipStartStats(base: ShipStartStats, purchased: PurchasedUpgrades): ShipStartStats {
    let hp = base.startHp;
    let fuel = base.startFuel;

    for (const u of UPGRADES) {
        if (!purchased[u.id]) continue;
        hp += u.effect.startHpBonus ?? 0;
        fuel += u.effect.startFuelBonus ?? 0;
    }

    return { startHp: hp, startFuel: fuel };
}

export type EconomyStats = {
    asteroidMineralYieldBonus: number;
};

export function deriveEconomyStats(purchased: PurchasedUpgrades): EconomyStats {
    let bonus = 0;
    for (const u of UPGRADES) {
        if (!purchased[u.id]) continue;
        bonus += u.effect.asteroidMineralYieldBonus ?? 0;
    }
    return { asteroidMineralYieldBonus: bonus };
}


