import { GAME_CONFIG } from '../../../config/gameConfig';
import { useGameStore } from '../../../state/gameStore';
import { advanceShipKinematics } from './runShipKinematics';
import { stepWorldAndCombat } from './runRuntimeStepWorld';

import type { RunRuntime } from './runRuntime';
import { clampDt } from './runMath';

export function tickRun(runtime: RunRuntime, dtRaw: number) {
    const dt = clampDt(dtRaw);

    const store = useGameStore.getState();
    if (store.escapeDialogOpen) return;
    const run = store.run;
    if (!run) return;
    const stats = run.stats;

    runtime.ship.syncTextureFromHp(run.hp, run.maxHp);

    const mp = runtime.app.renderer.events.pointer.global;

    // Timers first: ensure session time includes the tick that may end the run.
    runtime.shipInvulnLeft = Math.max(0, runtime.shipInvulnLeft - dt);
    runtime.shieldRegenBlockedLeft = Math.max(0, runtime.shieldRegenBlockedLeft - dt);
    runtime.runTimeSec += dt;
    runtime.pickupVacuumLeft = Math.max(0, runtime.pickupVacuumLeft - dt);
    runtime.weapons.tick(dt);
    runtime.victoryTimerLeft = Math.max(0, runtime.victoryTimerLeft - dt);

    const isEndOverlay = store.mode === 'run_end' && Boolean(store.runEndSummary);

    // Victory sequence: pull all loot, then warp out, then show summary.
    if (!isEndOverlay && runtime.endSequence?.kind === 'victory') {
        // Lock input during the whole sequence.
        runtime.input.w = false;
        runtime.input.a = false;
        runtime.input.s = false;
        runtime.input.d = false;
        runtime.input.firing = false;

        if (runtime.endSequence.phase === 'pull_loot') {
            // Wait until all pickups are collected (vacuum will be cleared when empty).
            if (runtime.pickups.length === 0) {
                runtime.endSequence.phase = 'warp_out';
                runtime.ship.warpOut({
                    width: runtime.width,
                    height: runtime.height,
                    durationSec: GAME_CONFIG.warpInDurationSec,
                    onComplete: () => {
                        if (runtime.endSequence?.kind !== 'victory') return;
                        runtime.endSequence.warpOutDone = true;
                    }
                });
            }
        }

        if (runtime.endSequence.phase === 'warp_out' && runtime.endSequence.warpOutDone) {
            store.endRunToSummary({
                levelId: run.levelId,
                outcome: 'victory',
                reason: 'boss_defeated',
                timeSec: runtime.runTimeSec,
                asteroidsKilled: runtime.asteroidsKilled,
                enemiesKilled: runtime.enemiesKilled,
                collected: {
                    minerals: runtime.collected.minerals,
                    scrap: runtime.collected.scrap,
                    fuel: runtime.collected.fuel,
                    health: runtime.collected.health,
                    magnet: runtime.collected.magnet,
                    core: runtime.collected.core
                },
                minerals: run.minerals,
                scrap: run.scrap,
                cores: run.cores
            });
            runtime.endSequence = null;
            return;
        }
    }

    // Defeat conditions (handled here to include runtime counters in the summary).
    const endReason = !isEndOverlay ? runtime.getEndReasonIfAny(run.hp, run.fuel) : null;
    if (!isEndOverlay && endReason) {
        if (endReason === 'death') {
            runtime.isShipDead = true;
            runtime.ship.hideNow();
        }
        store.endRunToSummary({
            levelId: run.levelId,
            outcome: 'defeat',
            reason: endReason,
            timeSec: runtime.runTimeSec,
            asteroidsKilled: runtime.asteroidsKilled,
            enemiesKilled: runtime.enemiesKilled,
            collected: {
                minerals: runtime.collected.minerals,
                scrap: runtime.collected.scrap,
                fuel: runtime.collected.fuel,
                health: runtime.collected.health,
                magnet: runtime.collected.magnet,
                core: runtime.collected.core
            },
            minerals: run.minerals,
            scrap: run.scrap,
            cores: run.cores
        });
        return;
    }

    const controlsLocked = runtime.shouldLockControls();

    // Fuel drain (disabled during scripted end sequence).
    if (!isEndOverlay && runtime.endSequence === null) {
        const isThrust = !controlsLocked && (runtime.input.w || runtime.input.a || runtime.input.s || runtime.input.d);
        const drain = (stats.fuelDrainPerSec + (isThrust ? stats.fuelDrainWhileThrustPerSec : 0)) * dt;
        const regen = stats.fuelRegenPerSec * dt;
        const net = drain - regen;
        if (net > 0) store.consumeFuel(net);
        else if (net < 0) store.addFuel(-net);
    }

    const runAfterFuel = useGameStore.getState().run;
    if (!runAfterFuel) return;
    if (!isEndOverlay && runAfterFuel.fuel <= 0) {
        // End immediately (same-tick), but include time already accumulated above.
        store.endRunToSummary({
            levelId: runAfterFuel.levelId,
            outcome: 'defeat',
            reason: 'out_of_fuel',
            timeSec: runtime.runTimeSec,
            asteroidsKilled: runtime.asteroidsKilled,
            enemiesKilled: runtime.enemiesKilled,
            collected: {
                minerals: runtime.collected.minerals,
                scrap: runtime.collected.scrap,
                fuel: runtime.collected.fuel,
                health: runtime.collected.health,
                magnet: runtime.collected.magnet,
                core: runtime.collected.core
            },
            minerals: runAfterFuel.minerals,
            scrap: runAfterFuel.scrap,
            cores: runAfterFuel.cores
        });
        return;
    }

    if (!controlsLocked) {
        const nextVel = advanceShipKinematics({
            ship: runtime.ship.sprite,
            pointer: mp,
            input: runtime.input,
            vx: runtime.shipVx,
            vy: runtime.shipVy,
            dt,
            stats: { shipAccelPxPerSec2: stats.shipAccelPxPerSec2, shipMaxSpeedPxPerSec: stats.shipMaxSpeedPxPerSec },
            bounds: { width: runtime.width, height: runtime.height }
        });
        runtime.shipVx = nextVel.vx;
        runtime.shipVy = nextVel.vy;
        runtime.shipAimRad = nextVel.aimRad;
    } else {
        runtime.shipVx = 0;
        runtime.shipVy = 0;
    }

    // Shield regen (after delay).
    if (run.maxShield > 0 && stats.shieldRegenPerSec > 0 && runtime.shieldRegenBlockedLeft <= 0) {
        store.addShield(stats.shieldRegenPerSec * dt);
    }

    // Shooting.
    if (!isEndOverlay && !controlsLocked && runtime.input.firing) {
        runtime.weapons.tryFire({
            world: runtime.world,
            bullets: runtime.bullets,
            shipX: runtime.ship.sprite.x,
            shipY: runtime.ship.sprite.y,
            shipAimRad: runtime.shipAimRad,
            runFuel: run.fuel,
            stats,
            consumeFuel: (amount) => store.consumeFuel(amount),
            isRunStillActive: () => Boolean(useGameStore.getState().run)
        });
    }

    // Spawn asteroids over time.
    if (!isEndOverlay && runtime.endSequence === null) {
        runtime.spawnTimerLeft -= dt;
        if (runtime.spawnTimerLeft <= 0) {
            runtime.spawnTimerLeft = stats.asteroidsSpawnIntervalSec;
            if (runtime.asteroids.length < stats.asteroidsMaxCount) runtime.spawnAsteroid({ avoidShip: true });
        }
    }

    // Spawn enemies over time (accelerates with kill count).
    if (!isEndOverlay && !runtime.boss && !runtime.bossDefeated && runtime.endSequence === null) {
        runtime.enemySpawnTimerLeft -= dt;
        if (runtime.enemySpawnTimerLeft <= 0) {
            if (runtime.enemies.length < GAME_CONFIG.enemiesMaxCount) {
                runtime.spawnEnemy({ avoidShip: true });
                runtime.enemySpawnTimerLeft = runtime.computeEnemySpawnIntervalSec();
            } else {
                // If capped, retry soon.
                runtime.enemySpawnTimerLeft = 0.5;
            }
        }
    }

    // Boss spawn condition: after N enemy kills.
    if (!isEndOverlay && !runtime.boss && !runtime.bossDefeated && runtime.endSequence === null && runtime.bossProgress >= runtime.bossProgressMax) {
        runtime.spawnBoss({ kind: 'dreadnought', avoidShip: true });
    }

    const shipX = runtime.ship.sprite.x;
    const shipY = runtime.ship.sprite.y;

    stepWorldAndCombat({
        runtime,
        dt,
        shipX,
        shipY,
        combatEnabled: !isEndOverlay,
        stats,
        store,
        purchasedUpgrades: store.purchasedUpgrades
    });

    const runAfterWorld = useGameStore.getState().run;
    if (!runAfterWorld) return;
    if (!isEndOverlay && runAfterWorld.hp <= 0) {
        runtime.isShipDead = true;
        runtime.ship.hideNow();
        store.endRunToSummary({
            levelId: runAfterWorld.levelId,
            outcome: 'defeat',
            reason: 'death',
            timeSec: runtime.runTimeSec,
            asteroidsKilled: runtime.asteroidsKilled,
            enemiesKilled: runtime.enemiesKilled,
            collected: {
                minerals: runtime.collected.minerals,
                scrap: runtime.collected.scrap,
                fuel: runtime.collected.fuel,
                health: runtime.collected.health,
                magnet: runtime.collected.magnet,
                core: runtime.collected.core
            },
            minerals: runAfterWorld.minerals,
            scrap: runAfterWorld.scrap,
            cores: runAfterWorld.cores
        });
        return;
    }
}


