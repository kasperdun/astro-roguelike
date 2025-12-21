import { GAME_CONFIG } from '../../../config/gameConfig';
import { useGameStore } from '../../../state/gameStore';
import { audio } from '../../../audio/audio';
import type { RunRuntime } from './runRuntime';
import { updateAsteroids, updateBullets, updatePickups, resolveBulletAsteroidCollisions } from './runUpdateSystems';
import { resolveBulletBossCollisions, resolveShipBossCollision, updateBossAndFire, updateBossBullets, updateBossPassive } from './runBossSystems';
import {
    resolveBulletEnemyCollisions,
    resolveEnemyBulletShipCollisions,
    resolveShipEnemyCollisions,
    updateEnemiesAndFire,
    updateEnemiesPassive,
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
    /** If false, only movement updates run (no firing, no collisions, no pickup collection). */
    combatEnabled: boolean;
    stats: RunStats;
    store: StoreApi;
    purchasedUpgrades: StoreState['purchasedUpgrades'];
}) {
    const { runtime, dt, shipX, shipY, stats, store, purchasedUpgrades } = args;
    const controlsLocked = runtime.shouldLockControls();
    const combatEnabled = args.combatEnabled && !runtime.isShipDead;

    const handleBossDestroyed = () => {
        const boss = runtime.boss;
        if (!boss) return;
        destroyBoss({
            boss,
            world: runtime.world,
            purchasedUpgrades,
            spawnPickup: (kind, amount, x, y) => runtime.spawnPickup(kind, amount, x, y),
            onBossKilled: () => {
                runtime.boss = null;
                runtime.beginVictorySequence();

                // Clear boss bullets so the end-of-run window is readable.
                for (const bb of runtime.bossBullets) runtime.world.removeChild(bb.g);
                runtime.bossBullets = [];
            }
        });
    };

    updateBullets({ bullets: runtime.bullets, world: runtime.world, dt, width: runtime.width, height: runtime.height });
    updateEnemyBullets({ bullets: runtime.enemyBullets, world: runtime.world, dt, width: runtime.width, height: runtime.height });
    updateBossBullets({ bullets: runtime.bossBullets, world: runtime.world, dt, width: runtime.width, height: runtime.height });
    updateAsteroids({ asteroids: runtime.asteroids, dt, width: runtime.width, height: runtime.height });

    if (runtime.boss) {
        if (combatEnabled) {
            updateBossAndFire({
                boss: runtime.boss,
                bossBullets: runtime.bossBullets,
                world: runtime.world,
                dt,
                width: runtime.width,
                height: runtime.height,
                shipX,
                shipY,
                levelId: runtime.levelId,
                allowFire: !controlsLocked
            });
        } else {
            updateBossPassive({ boss: runtime.boss, dt, width: runtime.width, height: runtime.height, levelId: runtime.levelId });
        }
    }
    if (combatEnabled) {
        updateEnemiesAndFire({
            enemies: runtime.enemies,
            enemyBullets: runtime.enemyBullets,
            world: runtime.world,
            dt,
            width: runtime.width,
            height: runtime.height,
            shipX,
            shipY,
            levelId: runtime.levelId,
            allowFire: !controlsLocked
        });
    } else {
        updateEnemiesPassive({ enemies: runtime.enemies, dt, width: runtime.width, height: runtime.height, levelId: runtime.levelId });
    }

    const pickupsShipX = combatEnabled ? shipX : Number.POSITIVE_INFINITY;
    const pickupsShipY = combatEnabled ? shipY : Number.POSITIVE_INFINITY;
    updatePickups({
        pickups: runtime.pickups,
        world: runtime.world,
        dt,
        width: runtime.width,
        height: runtime.height,
        shipX: pickupsShipX,
        shipY: pickupsShipY,
        onCollectMinerals: combatEnabled ? (amount) => store.addMinerals(amount) : () => { },
        onCollectScrap: combatEnabled ? (amount) => store.addScrap(amount) : () => { },
        onCollectCores: combatEnabled ? (amount) => store.addCores(amount) : () => { },
        onCollectFuel: combatEnabled ? (amount) => store.addFuel(amount) : () => { },
        onCollectHealth: combatEnabled ? (amount) => store.addHealth(amount) : () => { },
        magnetRadiusPx: combatEnabled ? (runtime.pickupVacuumLeft > 0 ? 999999 : stats.pickupMagnetRadiusPx) : 0,
        magnetAccelPxPerSec2: combatEnabled ? (runtime.pickupVacuumLeft > 0 ? 7200 : undefined) : 0,
        onCollect: combatEnabled
            ? (p) => {
                audio.playPickupPop();
                runtime.registerPickupCollected(p.kind, p.amount);
                if (p.kind === 'magnet') {
                    // Vacuum effect: temporarily pull *all* pickups on the level to the ship.
                    runtime.pickupVacuumLeft = Math.max(runtime.pickupVacuumLeft, 2.6);
                }
            }
            : undefined
    });
    if (runtime.pickupVacuumLeft > 0 && runtime.pickups.length === 0) runtime.pickupVacuumLeft = 0;

    if (!combatEnabled) return;

    if (runtime.boss) {
        resolveBulletBossCollisions({
            bullets: runtime.bullets,
            boss: runtime.boss,
            world: runtime.world,
            bulletDamage: stats.bulletDamage,
            onBulletHit: () => audio.playHit(),
            onBossDestroyed: handleBossDestroyed
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
                    runtime.registerEnemyKilled();
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
            runtime.registerAsteroidKilled();
            destroyAsteroid({
                index,
                world: runtime.world,
                asteroids: runtime.asteroids,
                enemies: runtime.enemies,
                boss: runtime.boss,
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
                            runtime.registerEnemyKilled();
                            runtime.enemySpawnTimerLeft = Math.min(runtime.enemySpawnTimerLeft, runtime.computeEnemySpawnIntervalSec());
                        }
                    });
                },
                onBossDestroyed: handleBossDestroyed,
                spawnPickup: (kind, amount, x, y) => runtime.spawnPickup(kind, amount, x, y)
            });
        }
    });

    // Collision: enemy bullets → ship (with invuln).
    if (!runtime.ship.isWarpingIn && !runtime.ship.isWarpingOut && runtime.shipInvulnLeft <= 0) {
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
    if (!runtime.ship.isWarpingIn && !runtime.ship.isWarpingOut && runtime.shipInvulnLeft <= 0) {
        if (runtime.boss) {
            resolveShipBossCollision({
                boss: runtime.boss,
                shipX,
                shipY,
                shipR: GAME_CONFIG.shipCollisionRadiusPx,
                onShipHit: () => {
                    const dmg = damageFromShipBossCollision(runtime.boss!.kind, runtime.levelId);
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
                const dmg = damageFromShipEnemyCollision(e.kind, runtime.levelId);
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
    if (!runtime.ship.isWarpingIn && !runtime.ship.isWarpingOut && runtime.shipInvulnLeft <= 0) {
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


