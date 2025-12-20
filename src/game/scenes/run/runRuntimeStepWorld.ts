import { GAME_CONFIG } from '../../../config/gameConfig';
import { useGameStore } from '../../../state/gameStore';
import { audio } from '../../../audio/audio';
import type { RunRuntime } from './runRuntime';
import { updateAsteroids, updateBullets, updatePickups, resolveBulletAsteroidCollisions } from './runUpdateSystems';
import { resolveBulletBossCollisions, resolveShipBossCollision, updateBossAndFire, updateBossBullets } from './runBossSystems';
import {
    resolveBulletEnemyCollisions,
    resolveEnemyBulletShipCollisions,
    resolveShipEnemyCollisions,
    updateEnemiesAndFire,
    updateEnemyBullets
} from './runEnemySystems';
import { destroyAsteroid, destroyBoss, destroyEnemy, damageFromShipBossCollision, damageFromShipEnemyCollision } from './runDestroy';
import { resolveShipAsteroidCollisions } from './runShipAsteroidCollisions';

type StoreState = ReturnType<typeof useGameStore.getState>;
type StoreApi = Pick<StoreState, 'addMinerals' | 'addScrap' | 'addCores' | 'addFuel' | 'addHealth' | 'applyDamageToShip'>;

type RunStats = NonNullable<StoreState['run']>['stats'];

export function stepWorldAndCombat(args: {
    runtime: RunRuntime;
    dt: number;
    shipX: number;
    shipY: number;
    stats: RunStats;
    store: StoreApi;
    purchasedUpgrades: StoreState['purchasedUpgrades'];
}) {
    const { runtime, dt, shipX, shipY, stats, store, purchasedUpgrades } = args;

    updateBullets({ bullets: runtime.bullets, world: runtime.world, dt, width: runtime.width, height: runtime.height });
    updateEnemyBullets({ bullets: runtime.enemyBullets, world: runtime.world, dt, width: runtime.width, height: runtime.height });
    updateBossBullets({ bullets: runtime.bossBullets, world: runtime.world, dt, width: runtime.width, height: runtime.height });
    updateAsteroids({ asteroids: runtime.asteroids, dt, width: runtime.width, height: runtime.height });

    if (runtime.boss) {
        updateBossAndFire({
            boss: runtime.boss,
            bossBullets: runtime.bossBullets,
            world: runtime.world,
            dt,
            width: runtime.width,
            height: runtime.height,
            shipX,
            shipY,
            allowFire: !runtime.ship.isWarpingIn
        });
    }
    updateEnemiesAndFire({
        enemies: runtime.enemies,
        enemyBullets: runtime.enemyBullets,
        world: runtime.world,
        dt,
        width: runtime.width,
        height: runtime.height,
        shipX,
        shipY,
        allowFire: !runtime.ship.isWarpingIn
    });

    updatePickups({
        pickups: runtime.pickups,
        world: runtime.world,
        dt,
        width: runtime.width,
        height: runtime.height,
        shipX,
        shipY,
        onCollectMinerals: (amount) => store.addMinerals(amount),
        onCollectScrap: (amount) => store.addScrap(amount),
        onCollectCores: (amount) => store.addCores(amount),
        onCollectFuel: (amount) => store.addFuel(amount),
        onCollectHealth: (amount) => store.addHealth(amount),
        magnetRadiusPx: runtime.pickupVacuumLeft > 0 ? 999999 : stats.pickupMagnetRadiusPx,
        magnetAccelPxPerSec2: runtime.pickupVacuumLeft > 0 ? 7200 : undefined,
        onCollect: (p) => {
            audio.playPickupPop();
            if (p.kind === 'magnet') {
                // Vacuum effect: temporarily pull *all* pickups on the level to the ship.
                runtime.pickupVacuumLeft = Math.max(runtime.pickupVacuumLeft, 2.6);
            }
        }
    });
    if (runtime.pickupVacuumLeft > 0 && runtime.pickups.length === 0) runtime.pickupVacuumLeft = 0;

    if (runtime.boss) {
        resolveBulletBossCollisions({
            bullets: runtime.bullets,
            boss: runtime.boss,
            world: runtime.world,
            bulletDamage: stats.bulletDamage,
            onBulletHit: () => audio.playHit(),
            onBossDestroyed: () => {
                const boss = runtime.boss;
                if (!boss) return;
                destroyBoss({
                    boss,
                    world: runtime.world,
                    purchasedUpgrades,
                    spawnPickup: (kind, amount, x, y) => runtime.spawnPickup(kind, amount, x, y),
                    onBossKilled: () => {
                        runtime.boss = null;
                        runtime.bossDefeated = true;
                        runtime.victoryTimerLeft = GAME_CONFIG.bossVictoryDelaySec;

                        // Clear boss bullets so the end-of-run window is readable.
                        for (const bb of runtime.bossBullets) runtime.world.removeChild(bb.g);
                        runtime.bossBullets = [];
                    }
                });
            }
        });
    }

    resolveBulletEnemyCollisions({
        bullets: runtime.bullets,
        enemies: runtime.enemies,
        world: runtime.world,
        bulletDamage: stats.bulletDamage,
        onBulletHit: () => audio.playHit(),
        onEnemyDestroyed: (index) => {
            destroyEnemy({
                index,
                world: runtime.world,
                enemies: runtime.enemies,
                purchasedUpgrades,
                stats: { magnetDropChance: stats.magnetDropChance },
                spawnPickup: (kind, amount, x, y) => runtime.spawnPickup(kind, amount, x, y),
                onEnemyKilled: () => {
                    runtime.enemiesKilled++;
                    // Small feedback loop: kills speed up enemy spawns a bit (director).
                    runtime.enemySpawnTimerLeft = Math.min(runtime.enemySpawnTimerLeft, runtime.computeEnemySpawnIntervalSec());
                }
            });
        }
    });

    resolveBulletAsteroidCollisions({
        bullets: runtime.bullets,
        asteroids: runtime.asteroids,
        world: runtime.world,
        bulletDamage: stats.bulletDamage,
        onBulletHit: () => audio.playHit(),
        onAsteroidDestroyed: (index) => {
            destroyAsteroid({
                index,
                world: runtime.world,
                asteroids: runtime.asteroids,
                enemies: runtime.enemies,
                shipX,
                shipY,
                purchasedUpgrades,
                stats: {
                    asteroidExplosionDamage: stats.asteroidExplosionDamage,
                    asteroidExplosionRadiusBonusPx: stats.asteroidExplosionRadiusBonusPx,
                    collisionDamageMultiplier: stats.collisionDamageMultiplier
                },
                applyDamageToShip: (damage) => store.applyDamageToShip(damage),
                onShipHitForInvulnAndShieldDelay: () => {
                    runtime.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
                    runtime.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
                },
                onEnemyDestroyed: (ei) => {
                    destroyEnemy({
                        index: ei,
                        world: runtime.world,
                        enemies: runtime.enemies,
                        purchasedUpgrades,
                        stats: { magnetDropChance: stats.magnetDropChance },
                        spawnPickup: (kind, amount, x, y) => runtime.spawnPickup(kind, amount, x, y),
                        onEnemyKilled: () => {
                            runtime.enemiesKilled++;
                            runtime.enemySpawnTimerLeft = Math.min(runtime.enemySpawnTimerLeft, runtime.computeEnemySpawnIntervalSec());
                        }
                    });
                },
                spawnPickup: (kind, amount, x, y) => runtime.spawnPickup(kind, amount, x, y)
            });
        }
    });

    // Collision: enemy bullets → ship (with invuln).
    if (!runtime.ship.isWarpingIn && runtime.shipInvulnLeft <= 0) {
        resolveEnemyBulletShipCollisions({
            bullets: runtime.bossBullets,
            world: runtime.world,
            shipX,
            shipY,
            shipR: GAME_CONFIG.shipCollisionRadiusPx,
            onShipHit: (b) => {
                runtime.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
                runtime.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
                store.applyDamageToShip(b.damage * stats.collisionDamageMultiplier);
                audio.playHit();
            }
        });
        if (!useGameStore.getState().run) return;

        resolveEnemyBulletShipCollisions({
            bullets: runtime.enemyBullets,
            world: runtime.world,
            shipX,
            shipY,
            shipR: GAME_CONFIG.shipCollisionRadiusPx,
            onShipHit: (b) => {
                runtime.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
                runtime.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
                store.applyDamageToShip(b.damage * stats.collisionDamageMultiplier);
                audio.playHit();
            }
        });
        if (!useGameStore.getState().run) return;
    }

    // Collision: ship vs enemies (with invuln).
    if (!runtime.ship.isWarpingIn && runtime.shipInvulnLeft <= 0) {
        if (runtime.boss) {
            resolveShipBossCollision({
                boss: runtime.boss,
                shipX,
                shipY,
                shipR: GAME_CONFIG.shipCollisionRadiusPx,
                onShipHit: () => {
                    const dmg = damageFromShipBossCollision(runtime.boss!.kind);
                    runtime.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
                    runtime.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
                    store.applyDamageToShip(dmg * stats.collisionDamageMultiplier);
                    audio.playHit();
                },
                onPushOut: (nx, ny, overlap) => {
                    runtime.ship.sprite.x += nx * overlap;
                    runtime.ship.sprite.y += ny * overlap;
                    runtime.shipVx += nx * 170;
                    runtime.shipVy += ny * 170;
                }
            });
            if (!useGameStore.getState().run) return;
        }

        resolveShipEnemyCollisions({
            enemies: runtime.enemies,
            shipX,
            shipY,
            shipR: GAME_CONFIG.shipCollisionRadiusPx,
            onShipHit: (e) => {
                const dmg = damageFromShipEnemyCollision(e.kind);
                runtime.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
                runtime.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
                store.applyDamageToShip(dmg * stats.collisionDamageMultiplier);
                audio.playHit();
            },
            onPushOut: (nx, ny, overlap) => {
                runtime.ship.sprite.x += nx * overlap;
                runtime.ship.sprite.y += ny * overlap;
                runtime.shipVx += nx * 140;
                runtime.shipVy += ny * 140;
            }
        });
        if (!useGameStore.getState().run) return;
    }

    // Collision: ship vs asteroids (with invuln).
    if (!runtime.ship.isWarpingIn && runtime.shipInvulnLeft <= 0) {
        resolveShipAsteroidCollisions({
            shipX,
            shipY,
            asteroids: runtime.asteroids,
            onShipHit: () => {
                runtime.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
                runtime.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
                store.applyDamageToShip(GAME_CONFIG.asteroidCollisionDamage * stats.collisionDamageMultiplier);
            },
            onPushOut: (nx, ny, overlap) => {
                runtime.ship.sprite.x += nx * overlap;
                runtime.ship.sprite.y += ny * overlap;
                runtime.shipVx += nx * 120;
                runtime.shipVy += ny * 120;
            }
        });
        if (!useGameStore.getState().run) return;
    }
}


