export type UpgradeIcon = 'core';

export type UpgradeEffectPerLevel = {
    /** Бонус к стартовому и максимальному HP корабля. */
    maxHpBonus?: number;
    /** Бонус к стартовому и максимальному топливу корабля. */
    maxFuelBonus?: number;

    /** Бонус к урону пули (аддитивно). */
    bulletDamageBonus?: number;
    /** Бонус к времени жизни пули (сек). Увеличивает дальность. */
    bulletLifetimeBonusSec?: number;
    /** Бонус к скорости пули (px/s). */
    bulletSpeedBonusPxPerSec?: number;
    /** Множитель к скорострельности (мультипликативно). 0.1 = +10% */
    weaponFireRateMult?: number;

    /** Бонус к max speed корабля (px/s). */
    shipMaxSpeedBonusPxPerSec?: number;
    /** Множитель к ускорению корабля (мультипликативно). 0.1 = +10% */
    shipAccelMult?: number;

    /** Снижение расхода топлива за секунду (аддитивно; может быть 0). */
    fuelDrainPerSecBonus?: number;
    /** Снижение расхода топлива при тяге за секунду (аддитивно). */
    fuelDrainWhileThrustPerSecBonus?: number;
    /** Снижение расхода топлива за выстрел (аддитивно). */
    fuelDrainPerShotBonus?: number;
    /** Реген топлива (ед/сек). */
    fuelRegenPerSec?: number;

    /** Бонус к щиту (ед). Щит поглощает урон до HP. */
    maxShieldBonus?: number;
    /** Реген щита (ед/сек) после задержки. */
    shieldRegenPerSec?: number;
    /** Задержка перед регеном щита после получения урона (сек). */
    shieldRegenDelayBonusSec?: number;

    /** Бонус к минералам за астероид (аддитивно). */
    asteroidMineralYieldBonus?: number;
    /** Снижение урона от столкновений (мультипликативно). 0.1 = -10% */
    collisionDamageReduction?: number;
};

export type Requirement = { id: UpgradeId; level: number };

export type UpgradeNode = {
    id: UpgradeId;
    title: string;
    description: string;
    icon: UpgradeIcon;
    pos: { col: number; row: number };

    /** Максимальный уровень улучшения. */
    maxLevel: number;

    /** Требования по уровню: каждое требование — минимум N уровней в указанном апгрейде. */
    requires: readonly Requirement[];

    /** Цена (минералы) за 1-й уровень. */
    baseCostMinerals: number;
    /** Рост цены по уровням: cost(level)=round(baseCost*costGrowth^(level-1)). */
    costGrowth: number;

    /** Эффект, который прибавляется на каждый уровень. */
    perLevel: UpgradeEffectPerLevel;
};

export const UPGRADE_IDS = [
    'weapon_damage',
    'bullet_range',
    'hull_hp',
    'fuel_capacity',
    'move_speed',
    'bullet_speed',
    'fire_rate',
    'damage_boost',
    'marksman_protocol',
    'collision_plating',
    'shield_core',
    'shield_regen',
    'shield_delay',
    'fortress_protocol',
    'fuel_efficiency',
    'fuel_thrust_eff',
    'fuel_shot_eff',
    'fuel_regen',
    'accel_control',
    'drift_tuning',
    'mining_yield',
    'mining_mastery'
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

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
        baseCostMinerals: 10,
        costGrowth: 1.45,
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
        baseCostMinerals: 14,
        costGrowth: 1.42,
        perLevel: { bulletLifetimeBonusSec: 0.08 }
    },
    hull_hp: {
        title: 'Reinforced Hull',
        description: 'Дополнительное здоровье корабля.',
        icon: 'core',
        pos: { col: 2, row: -1 },
        maxLevel: 5,
        requires: [{ id: 'weapon_damage', level: 1 }],
        baseCostMinerals: 14,
        costGrowth: 1.40,
        perLevel: { maxHpBonus: 15 }
    },
    fuel_capacity: {
        title: 'Fuel Tanks',
        description: 'Дополнительное топливо (и максимум топлива).',
        icon: 'core',
        pos: { col: 0, row: 2 },
        maxLevel: 5,
        requires: [{ id: 'weapon_damage', level: 1 }],
        baseCostMinerals: 14,
        costGrowth: 1.40,
        perLevel: { maxFuelBonus: 8 }
    },
    move_speed: {
        title: 'Thrusters Tune-up',
        description: 'Скорость передвижения: максимум скорости корабля.',
        icon: 'core',
        pos: { col: 0, row: -3 },
        maxLevel: 4,
        requires: [{ id: 'weapon_damage', level: 1 }],
        baseCostMinerals: 16,
        costGrowth: 1.43,
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
        baseCostMinerals: 28,
        costGrowth: 1.45,
        perLevel: { bulletSpeedBonusPxPerSec: 28 }
    },
    fire_rate: {
        title: 'Faster Cycling',
        description: 'Скорострельность (мультипликативно).',
        icon: 'core',
        pos: { col: -4, row: 0 },
        maxLevel: 5,
        requires: [{ id: 'bullet_range', level: 1 }],
        baseCostMinerals: 26,
        costGrowth: 1.47,
        perLevel: { weaponFireRateMult: 0.06 }
    },
    damage_boost: {
        title: 'Focused Damage',
        description: 'Дополнительный урон (аддитивно).',
        icon: 'core',
        pos: { col: -6, row: 1 },
        maxLevel: 6,
        requires: [{ id: 'fire_rate', level: 2 }],
        baseCostMinerals: 55,
        costGrowth: 1.52,
        perLevel: { bulletDamageBonus: 3 }
    },
    marksman_protocol: {
        title: 'Marksman Protocol',
        description: 'Синергия дальности и скорости пули.',
        icon: 'core',
        pos: { col: -6, row: -3 },
        maxLevel: 1,
        requires: [{ id: 'bullet_speed', level: 2 }, { id: 'bullet_range', level: 3 }],
        baseCostMinerals: 90,
        costGrowth: 1.0,
        perLevel: { bulletLifetimeBonusSec: 0.18, bulletSpeedBonusPxPerSec: 60 }
    },

    // Hull/defense branch (short + long)
    collision_plating: {
        title: 'Impact Plating',
        description: 'Снижает урон от столкновений.',
        icon: 'core',
        pos: { col: 4, row: -2 },
        maxLevel: 4,
        requires: [{ id: 'hull_hp', level: 1 }],
        baseCostMinerals: 24,
        costGrowth: 1.44,
        perLevel: { collisionDamageReduction: 0.06 }
    },
    shield_core: {
        title: 'Shield Core',
        description: 'Даёт щит, который поглощает урон до HP.',
        icon: 'core',
        pos: { col: 4, row: 0 },
        maxLevel: 3,
        requires: [{ id: 'hull_hp', level: 2 }],
        baseCostMinerals: 32,
        costGrowth: 1.50,
        perLevel: { maxShieldBonus: 18 }
    },
    shield_regen: {
        title: 'Shield Regenerator',
        description: 'Реген щита (после задержки).',
        icon: 'core',
        pos: { col: 6, row: 1 },
        maxLevel: 4,
        requires: [{ id: 'shield_core', level: 1 }],
        baseCostMinerals: 58,
        costGrowth: 1.55,
        perLevel: { shieldRegenPerSec: 2.4 }
    },
    shield_delay: {
        title: 'Quick Reboot',
        description: 'Сокращает задержку перед регеном щита.',
        icon: 'core',
        pos: { col: 6, row: -1 },
        maxLevel: 3,
        requires: [{ id: 'shield_core', level: 1 }],
        baseCostMinerals: 52,
        costGrowth: 1.52,
        perLevel: { shieldRegenDelayBonusSec: -0.18 }
    },
    fortress_protocol: {
        title: 'Fortress Protocol',
        description: 'Большой, дорогой апгрейд защиты.',
        icon: 'core',
        pos: { col: 8, row: 0 },
        maxLevel: 1,
        requires: [{ id: 'shield_regen', level: 3 }, { id: 'collision_plating', level: 3 }],
        baseCostMinerals: 160,
        costGrowth: 1.0,
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
        baseCostMinerals: 24,
        costGrowth: 1.46,
        perLevel: { fuelDrainPerSecBonus: -0.10 }
    },
    fuel_thrust_eff: {
        title: 'Thrust Efficiency',
        description: 'Снижает расход топлива при тяге.',
        icon: 'core',
        pos: { col: 0, row: 5 },
        maxLevel: 4,
        requires: [{ id: 'fuel_capacity', level: 2 }],
        baseCostMinerals: 30,
        costGrowth: 1.48,
        perLevel: { fuelDrainWhileThrustPerSecBonus: -0.24 }
    },
    fuel_shot_eff: {
        title: 'Ammo Injector',
        description: 'Снижает расход топлива за выстрел.',
        icon: 'core',
        pos: { col: 2, row: 4 },
        maxLevel: 4,
        requires: [{ id: 'fuel_capacity', level: 2 }],
        baseCostMinerals: 30,
        costGrowth: 1.48,
        perLevel: { fuelDrainPerShotBonus: -0.02 }
    },
    fuel_regen: {
        title: 'Fuel Regeneration',
        description: 'Реген топлива со временем.',
        icon: 'core',
        pos: { col: 0, row: 7 },
        maxLevel: 5,
        requires: [{ id: 'fuel_efficiency', level: 2 }],
        baseCostMinerals: 62,
        costGrowth: 1.55,
        perLevel: { fuelRegenPerSec: 0.22 }
    },

    // Movement branch
    accel_control: {
        title: 'Acceleration Control',
        description: 'Ускорение корабля (мультипликативно).',
        icon: 'core',
        pos: { col: 2, row: -5 },
        maxLevel: 4,
        requires: [{ id: 'move_speed', level: 1 }],
        baseCostMinerals: 26,
        costGrowth: 1.46,
        perLevel: { shipAccelMult: 0.08 }
    },
    drift_tuning: {
        title: 'Drift Tuning',
        description: 'Синергия движения и экономии топлива.',
        icon: 'core',
        pos: { col: 4, row: -5 },
        maxLevel: 1,
        requires: [{ id: 'accel_control', level: 2 }, { id: 'fuel_thrust_eff', level: 2 }],
        baseCostMinerals: 110,
        costGrowth: 1.0,
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
        baseCostMinerals: 18,
        costGrowth: 1.43,
        perLevel: { asteroidMineralYieldBonus: 1 }
    },
    mining_mastery: {
        title: 'Mining Mastery',
        description: 'Дорогая “короткая ветка” на доход.',
        icon: 'core',
        pos: { col: -4, row: 2 },
        maxLevel: 1,
        requires: [{ id: 'mining_yield', level: 4 }],
        baseCostMinerals: 120,
        costGrowth: 1.0,
        perLevel: { asteroidMineralYieldBonus: 2 }
    }
};

export const UPGRADES: readonly UpgradeNode[] = UPGRADE_IDS.map((id) => ({
    id,
    ...UPGRADE_DEFS[id]
}));

const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeNode>> = UPGRADES.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
}, {} as Record<UpgradeId, UpgradeNode>);

export function getUpgrade(id: UpgradeId): UpgradeNode {
    return UPGRADE_BY_ID[id];
}

export type PurchasedUpgrades = Partial<Record<UpgradeId, number>>;

export function getPurchasedLevel(purchased: PurchasedUpgrades, id: UpgradeId): number {
    return Math.max(0, purchased[id] ?? 0);
}

export function getUpgradeCostForLevel(id: UpgradeId, level: number): number {
    const u = getUpgrade(id);
    const lvl = Math.max(1, Math.min(u.maxLevel, level));
    const raw = u.baseCostMinerals * Math.pow(u.costGrowth, lvl - 1);
    return Math.max(1, Math.round(raw));
}

export type UpgradeAvailability =
    | { kind: 'maxed' }
    | { kind: 'available' }
    | { kind: 'locked'; missing: Requirement[] };

export type PurchaseResult =
    | { ok: true }
    | { ok: false; reason: 'maxed' }
    | { ok: false; reason: 'locked'; missing: Requirement[] }
    | { ok: false; reason: 'not_enough_minerals'; needed: number; have: number };

export function getUpgradeAvailability(purchased: PurchasedUpgrades, id: UpgradeId): UpgradeAvailability {
    const u = getUpgrade(id);
    const current = getPurchasedLevel(purchased, id);
    if (current >= u.maxLevel) return { kind: 'maxed' };

    const missing = u.requires.filter((r) => getPurchasedLevel(purchased, r.id) < r.level);
    return missing.length ? { kind: 'locked', missing } : { kind: 'available' };
}

export function canPurchaseUpgrade(args: {
    purchased: PurchasedUpgrades;
    minerals: number;
    id: UpgradeId;
}): PurchaseResult {
    const { purchased, minerals, id } = args;
    const u = getUpgrade(id);
    const current = getPurchasedLevel(purchased, id);

    if (current >= u.maxLevel) return { ok: false, reason: 'maxed' };

    const availability = getUpgradeAvailability(purchased, id);
    if (availability.kind === 'locked') return { ok: false, reason: 'locked', missing: availability.missing };

    const nextLevel = current + 1;
    const cost = getUpgradeCostForLevel(id, nextLevel);
    if (minerals < cost) return { ok: false, reason: 'not_enough_minerals', needed: cost, have: minerals };

    return { ok: true };
}

export type ShipStartStats = { startHp: number; startFuel: number };

export type EconomyStats = {
    asteroidMineralYieldBonus: number;
};

export type CombatAndMovementStats = {
    bulletDamage: number;
    bulletLifetimeSec: number;
    bulletSpeedPxPerSec: number;
    weaponFireRatePerSec: number;

    shipAccelPxPerSec2: number;
    shipMaxSpeedPxPerSec: number;

    fuelDrainPerSec: number;
    fuelDrainWhileThrustPerSec: number;
    fuelDrainPerShot: number;
    fuelRegenPerSec: number;

    maxShield: number;
    shieldRegenPerSec: number;
    shieldRegenDelaySec: number;

    collisionDamageMultiplier: number;
};

export type DerivedRunStats = ShipStartStats & EconomyStats & CombatAndMovementStats & { maxHp: number; maxFuel: number };

function addPerLevel(target: UpgradeEffectPerLevel, perLevel: UpgradeEffectPerLevel, level: number): UpgradeEffectPerLevel {
    const out: UpgradeEffectPerLevel = { ...target };
    const keys = Object.keys(perLevel) as Array<keyof UpgradeEffectPerLevel>;
    for (const k of keys) {
        const v = perLevel[k];
        if (typeof v !== 'number') continue;
        const prev = out[k];
        out[k] = (typeof prev === 'number' ? prev : 0) + v * level;
    }
    return out;
}

export function deriveRunStats(args: {
    base: {
        startHp: number;
        startFuel: number;
        bulletDamage: number;
        bulletLifetimeSec: number;
        bulletSpeedPxPerSec: number;
        weaponFireRatePerSec: number;
        shipAccelPxPerSec2: number;
        shipMaxSpeedPxPerSec: number;
        fuelDrainPerSec: number;
        fuelDrainWhileThrustPerSec: number;
        fuelDrainPerShot: number;
        shieldRegenDelaySec: number;
    };
    purchased: PurchasedUpgrades;
}): DerivedRunStats {
    const { base, purchased } = args;

    // Accumulate all per-level effects.
    let eff: UpgradeEffectPerLevel = {};
    for (const u of UPGRADES) {
        const lvl = getPurchasedLevel(purchased, u.id);
        if (lvl <= 0) continue;
        eff = addPerLevel(eff, u.perLevel, lvl);
    }

    const maxHp = base.startHp + (eff.maxHpBonus ?? 0);
    const maxFuel = base.startFuel + (eff.maxFuelBonus ?? 0);

    const bulletDamage = base.bulletDamage + (eff.bulletDamageBonus ?? 0);
    const bulletLifetimeSec = Math.max(0.1, base.bulletLifetimeSec + (eff.bulletLifetimeBonusSec ?? 0));
    const bulletSpeedPxPerSec = Math.max(60, base.bulletSpeedPxPerSec + (eff.bulletSpeedBonusPxPerSec ?? 0));
    const weaponFireRatePerSec = Math.max(
        0.2,
        base.weaponFireRatePerSec * (1 + (eff.weaponFireRateMult ?? 0))
    );

    const shipAccelPxPerSec2 = Math.max(1, base.shipAccelPxPerSec2 * (1 + (eff.shipAccelMult ?? 0)));
    const shipMaxSpeedPxPerSec = Math.max(20, base.shipMaxSpeedPxPerSec + (eff.shipMaxSpeedBonusPxPerSec ?? 0));

    const fuelDrainPerSec = Math.max(0, base.fuelDrainPerSec + (eff.fuelDrainPerSecBonus ?? 0));
    const fuelDrainWhileThrustPerSec = Math.max(0, base.fuelDrainWhileThrustPerSec + (eff.fuelDrainWhileThrustPerSecBonus ?? 0));
    const fuelDrainPerShot = Math.max(0, base.fuelDrainPerShot + (eff.fuelDrainPerShotBonus ?? 0));
    const fuelRegenPerSec = Math.max(0, eff.fuelRegenPerSec ?? 0);

    const maxShield = Math.max(0, eff.maxShieldBonus ?? 0);
    const shieldRegenPerSec = Math.max(0, eff.shieldRegenPerSec ?? 0);
    const shieldRegenDelaySec = Math.max(0, base.shieldRegenDelaySec + (eff.shieldRegenDelayBonusSec ?? 0));

    const asteroidMineralYieldBonus = Math.max(0, eff.asteroidMineralYieldBonus ?? 0);

    const collisionDamageReduction = Math.max(0, Math.min(0.9, eff.collisionDamageReduction ?? 0));
    const collisionDamageMultiplier = 1 - collisionDamageReduction;

    return {
        startHp: maxHp,
        startFuel: maxFuel,
        maxHp,
        maxFuel,

        bulletDamage,
        bulletLifetimeSec,
        bulletSpeedPxPerSec,
        weaponFireRatePerSec,
        shipAccelPxPerSec2,
        shipMaxSpeedPxPerSec,

        fuelDrainPerSec,
        fuelDrainWhileThrustPerSec,
        fuelDrainPerShot,
        fuelRegenPerSec,

        maxShield,
        shieldRegenPerSec,
        shieldRegenDelaySec,

        asteroidMineralYieldBonus,
        collisionDamageMultiplier
    };
}

// Legacy helpers kept for existing imports (implemented via deriveRunStats)
export function deriveShipStartStats(base: ShipStartStats, purchased: PurchasedUpgrades): ShipStartStats {
    const stats = deriveRunStats({
        base: {
            startHp: base.startHp,
            startFuel: base.startFuel,
            bulletDamage: 0,
            bulletLifetimeSec: 1,
            bulletSpeedPxPerSec: 1,
            weaponFireRatePerSec: 1,
            shipAccelPxPerSec2: 1,
            shipMaxSpeedPxPerSec: 1,
            fuelDrainPerSec: 0,
            fuelDrainWhileThrustPerSec: 0,
            fuelDrainPerShot: 0,
            shieldRegenDelaySec: 0
        },
        purchased
    });
    return { startHp: stats.startHp, startFuel: stats.startFuel };
}

export function deriveEconomyStats(purchased: PurchasedUpgrades): EconomyStats {
    // Economy only depends on upgrades; base values are irrelevant here.
    const stats = deriveRunStats({
        base: {
            startHp: 0,
            startFuel: 0,
            bulletDamage: 0,
            bulletLifetimeSec: 1,
            bulletSpeedPxPerSec: 1,
            weaponFireRatePerSec: 1,
            shipAccelPxPerSec2: 1,
            shipMaxSpeedPxPerSec: 1,
            fuelDrainPerSec: 0,
            fuelDrainWhileThrustPerSec: 0,
            fuelDrainPerShot: 0,
            shieldRegenDelaySec: 0
        },
        purchased
    });
    return { asteroidMineralYieldBonus: stats.asteroidMineralYieldBonus };
}


