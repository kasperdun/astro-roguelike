import type { UpgradeId } from './ids';

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

export type PurchasedUpgrades = Partial<Record<UpgradeId, number>>;

export type UpgradeAvailability =
    | { kind: 'maxed' }
    | { kind: 'available' }
    | { kind: 'locked'; missing: Requirement[] };

export type PurchaseResult =
    | { ok: true }
    | { ok: false; reason: 'maxed' }
    | { ok: false; reason: 'locked'; missing: Requirement[] }
    | { ok: false; reason: 'not_enough_minerals'; needed: number; have: number };

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


