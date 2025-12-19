import { UPGRADES } from './defs';
import { getPurchasedLevel } from './selectors';
import type { DerivedRunStats, PurchasedUpgrades, UpgradeEffectPerLevel, ShipStartStats, EconomyStats } from './types';

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
        asteroidsSpawnIntervalSec: number;
        asteroidsMaxCount: number;
        asteroidExplosionDamage: number;
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

    const projectilesPerShot = Math.max(1, 1 + Math.floor(Math.max(0, eff.projectilesPerShotBonus ?? 0)));

    const bulletDamage = base.bulletDamage + (eff.bulletDamageBonus ?? 0);
    const bulletLifetimeSec = Math.max(0.1, base.bulletLifetimeSec + (eff.bulletLifetimeBonusSec ?? 0));
    const bulletSpeedPxPerSec = Math.max(60, base.bulletSpeedPxPerSec + (eff.bulletSpeedBonusPxPerSec ?? 0));
    const weaponFireRatePerSec = Math.max(0.2, base.weaponFireRatePerSec * (1 + (eff.weaponFireRateMult ?? 0)));

    const shipAccelPxPerSec2 = Math.max(1, base.shipAccelPxPerSec2 * (1 + (eff.shipAccelMult ?? 0)));
    const shipMaxSpeedPxPerSec = Math.max(20, base.shipMaxSpeedPxPerSec + (eff.shipMaxSpeedBonusPxPerSec ?? 0));

    const fuelDrainPerSec = Math.max(0, base.fuelDrainPerSec + (eff.fuelDrainPerSecBonus ?? 0));
    const fuelDrainWhileThrustPerSec = Math.max(0, base.fuelDrainWhileThrustPerSec + (eff.fuelDrainWhileThrustPerSecBonus ?? 0));
    const fuelDrainPerShot = Math.max(0, base.fuelDrainPerShot + (eff.fuelDrainPerShotBonus ?? 0));
    const fuelRegenPerSec = Math.max(0, eff.fuelRegenPerSec ?? 0);

    const fuelDropChance = Math.max(0, Math.min(0.95, eff.fuelDropChanceBonus ?? 0));

    const healthDropChance = Math.max(0, Math.min(0.95, eff.healthDropChanceBonus ?? 0));

    const maxShield = Math.max(0, eff.maxShieldBonus ?? 0);
    const shieldRegenPerSec = Math.max(0, eff.shieldRegenPerSec ?? 0);
    const shieldRegenDelaySec = Math.max(0, base.shieldRegenDelaySec + (eff.shieldRegenDelayBonusSec ?? 0));

    const asteroidMineralYieldBonus = Math.max(0, eff.asteroidMineralYieldBonus ?? 0);
    const enemyMineralYieldBonus = Math.max(0, eff.enemyMineralYieldBonus ?? 0);

    const collisionDamageReduction = Math.max(0, Math.min(0.9, eff.collisionDamageReduction ?? 0));
    const collisionDamageMultiplier = 1 - collisionDamageReduction;

    const spawnReduction = Math.max(0, Math.min(0.85, eff.asteroidSpawnIntervalReduction ?? 0));
    const asteroidsSpawnIntervalSec = Math.max(0.45, base.asteroidsSpawnIntervalSec * (1 - spawnReduction));
    const asteroidsMaxCount = Math.max(1, base.asteroidsMaxCount + Math.floor(Math.max(0, eff.asteroidsMaxCountBonus ?? 0)));

    const asteroidExplosionDamage = Math.max(0, base.asteroidExplosionDamage + (eff.asteroidExplosionDamageBonus ?? 0));
    const asteroidExplosionRadiusBonusPx = Math.max(0, eff.asteroidExplosionRadiusBonusPx ?? 0);

    return {
        startHp: maxHp,
        startFuel: maxFuel,
        maxHp,
        maxFuel,

        projectilesPerShot,
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
        enemyMineralYieldBonus,
        fuelDropChance,
        healthDropChance,
        collisionDamageMultiplier,
        asteroidsSpawnIntervalSec,
        asteroidsMaxCount,
        asteroidExplosionDamage,
        asteroidExplosionRadiusBonusPx
    };
}

// Legacy helpers kept for existing imports (implemented via deriveRunStats)
export function deriveShipStartStats(base: ShipStartStats, purchased: PurchasedUpgrades): ShipStartStats {
    const stats = deriveRunStats({
        base: {
            startHp: base.startHp,
            startFuel: base.startFuel,
            asteroidsSpawnIntervalSec: 1,
            asteroidsMaxCount: 1,
            asteroidExplosionDamage: 0,
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
            asteroidsSpawnIntervalSec: 1,
            asteroidsMaxCount: 1,
            asteroidExplosionDamage: 0,
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
    return {
        asteroidMineralYieldBonus: stats.asteroidMineralYieldBonus,
        enemyMineralYieldBonus: stats.enemyMineralYieldBonus,
        fuelDropChance: stats.fuelDropChance,
        healthDropChance: stats.healthDropChance
    };
}


