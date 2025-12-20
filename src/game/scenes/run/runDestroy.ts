import type { Container } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { deriveEconomyStats, type DerivedRunStats, type PurchasedUpgrades } from '../../../progression/upgrades';
import { getEnemyDef } from '../../enemies/enemyCatalog';
import { getBossDef } from '../../boss/bossCatalog';
import { spawnAsteroidExplosion, spawnBossDestruction, spawnEnemyDestruction } from './runEffects';
import { circleHit } from './runMath';
import type { Asteroid, Boss, Enemy, PickupKind } from './runTypes';
import { audio } from '../../../audio/audio';

export function destroyAsteroid(args: {
    index: number;
    world: Container;
    asteroids: Asteroid[];
    enemies: Enemy[];
    shipX: number;
    shipY: number;
    purchasedUpgrades: PurchasedUpgrades;
    stats: Pick<DerivedRunStats, 'asteroidExplosionDamage' | 'asteroidExplosionRadiusBonusPx' | 'collisionDamageMultiplier'>;
    applyDamageToShip: (damage: number) => void;
    onShipHitForInvulnAndShieldDelay: () => void;
    onEnemyDestroyed: (index: number) => void;
    spawnPickup: (kind: PickupKind, amount: number, x: number, y: number) => void;
}) {
    const a = args.asteroids[args.index];
    if (!a) return;

    args.asteroids.splice(args.index, 1);
    args.world.removeChild(a.g);

    audio.playAsteroidDead();
    spawnAsteroidExplosion(args.world, a.g.x, a.g.y, a.r);

    // AOE damage on explosion (ship + enemies).
    const explosionDamage = args.stats.asteroidExplosionDamage;
    const explosionR = a.r * GAME_CONFIG.asteroidExplosionRadiusFromAsteroidMult + args.stats.asteroidExplosionRadiusBonusPx;
    if (explosionDamage > 0 && explosionR > 0) {
        if (circleHit(args.shipX, args.shipY, GAME_CONFIG.shipCollisionRadiusPx, a.g.x, a.g.y, explosionR)) {
            args.onShipHitForInvulnAndShieldDelay();
            args.applyDamageToShip(explosionDamage * args.stats.collisionDamageMultiplier);
        }

        for (let ei = args.enemies.length - 1; ei >= 0; ei--) {
            const e = args.enemies[ei];
            if (!e) continue;
            if (!circleHit(e.g.x, e.g.y, e.r, a.g.x, a.g.y, explosionR)) continue;
            e.hp -= explosionDamage;
            if (e.hp <= 0) args.onEnemyDestroyed(ei);
        }
    }

    // Drops.
    const economy = deriveEconomyStats(args.purchasedUpgrades);
    const mineralCount = Math.max(0, GAME_CONFIG.asteroidDropMineralsPerAsteroid + economy.asteroidMineralYieldBonus);
    for (let i = 0; i < mineralCount; i++) args.spawnPickup('minerals', 1, a.g.x, a.g.y);

    if (Math.random() < GAME_CONFIG.asteroidDropScrapChance) {
        args.spawnPickup('scrap', GAME_CONFIG.asteroidDropScrapAmount, a.g.x, a.g.y);
    }

    if (economy.fuelDropChance > 0 && Math.random() < economy.fuelDropChance) {
        args.spawnPickup('fuel', GAME_CONFIG.fuelPickupAmount, a.g.x, a.g.y);
    }
}

export function destroyEnemy(args: {
    index: number;
    world: Container;
    enemies: Enemy[];
    purchasedUpgrades: PurchasedUpgrades;
    stats: Pick<DerivedRunStats, 'magnetDropChance'>;
    spawnPickup: (kind: PickupKind, amount: number, x: number, y: number) => void;
    onEnemyKilled: () => void;
}) {
    const e = args.enemies[args.index];
    if (!e) return;

    args.enemies.splice(args.index, 1);
    args.world.removeChild(e.g);
    args.onEnemyKilled();

    audio.playHit();
    spawnEnemyDestruction(args.world, { x: e.g.x, y: e.g.y, r: e.r, kind: e.kind, rotationRad: e.g.rotation });

    const economy = deriveEconomyStats(args.purchasedUpgrades);
    const mineralCount = Math.max(0, GAME_CONFIG.enemyDropMineralsPerEnemy + economy.enemyMineralYieldBonus);
    for (let i = 0; i < mineralCount; i++) args.spawnPickup('minerals', 1, e.g.x, e.g.y);

    if (Math.random() < GAME_CONFIG.enemyDropScrapChance) {
        args.spawnPickup('scrap', GAME_CONFIG.enemyDropScrapAmount, e.g.x, e.g.y);
    }

    if (economy.fuelDropChance > 0 && Math.random() < economy.fuelDropChance) {
        args.spawnPickup('fuel', GAME_CONFIG.fuelPickupAmount, e.g.x, e.g.y);
    }

    if (economy.healthDropChance > 0 && Math.random() < economy.healthDropChance) {
        args.spawnPickup('health', GAME_CONFIG.healthPickupAmount, e.g.x, e.g.y);
    }

    // Magnet pickup (upgrade-driven).
    if (args.stats.magnetDropChance > 0 && Math.random() < args.stats.magnetDropChance) {
        args.spawnPickup('magnet', 1, e.g.x, e.g.y);
    }
}

export function destroyBoss(args: {
    boss: Boss;
    world: Container;
    purchasedUpgrades: PurchasedUpgrades;
    spawnPickup: (kind: PickupKind, amount: number, x: number, y: number) => void;
    onBossKilled: () => void;
}) {
    const b = args.boss;
    args.world.removeChild(b.g);
    args.onBossKilled();

    audio.playHit();
    spawnBossDestruction(args.world, { x: b.g.x, y: b.g.y, r: b.r, kind: b.kind, rotationRad: b.g.rotation });

    const economy = deriveEconomyStats(args.purchasedUpgrades);
    const minerals = Math.max(0, GAME_CONFIG.bossDropMinerals + economy.enemyMineralYieldBonus * 3);
    for (let i = 0; i < minerals; i++) args.spawnPickup('minerals', 1, b.g.x, b.g.y);

    for (let i = 0; i < Math.max(0, GAME_CONFIG.bossDropScrap); i++) args.spawnPickup('scrap', 1, b.g.x, b.g.y);

    for (let i = 0; i < Math.max(0, GAME_CONFIG.bossDropCores); i++) args.spawnPickup('core', 1, b.g.x, b.g.y);
}

export function damageFromShipEnemyCollision(enemyKind: Enemy['kind']): number {
    return getEnemyDef(enemyKind).stats.collisionDamage;
}

export function damageFromShipBossCollision(bossKind: Boss['kind']): number {
    return getBossDef(bossKind).stats.collisionDamage;
}


