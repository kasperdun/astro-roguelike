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

    // Fuel drain.
    const isThrust = runtime.input.w || runtime.input.a || runtime.input.s || runtime.input.d;
    const drain = (stats.fuelDrainPerSec + (isThrust ? stats.fuelDrainWhileThrustPerSec : 0)) * dt;
    const regen = stats.fuelRegenPerSec * dt;
    const net = drain - regen;
    if (net > 0) store.consumeFuel(net);
    else if (net < 0) store.addFuel(-net);
    if (!useGameStore.getState().run) return; // could end the run

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

    // Timers.
    runtime.shipInvulnLeft = Math.max(0, runtime.shipInvulnLeft - dt);
    runtime.shieldRegenBlockedLeft = Math.max(0, runtime.shieldRegenBlockedLeft - dt);
    runtime.runTimeSec += dt;
    runtime.pickupVacuumLeft = Math.max(0, runtime.pickupVacuumLeft - dt);
    runtime.weapons.tick(dt);

    // Shield regen (after delay).
    if (run.maxShield > 0 && stats.shieldRegenPerSec > 0 && runtime.shieldRegenBlockedLeft <= 0) {
        store.addShield(stats.shieldRegenPerSec * dt);
    }

    // Shooting.
    if (runtime.input.firing) {
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
    runtime.spawnTimerLeft -= dt;
    if (runtime.spawnTimerLeft <= 0) {
        runtime.spawnTimerLeft = stats.asteroidsSpawnIntervalSec;
        if (runtime.asteroids.length < stats.asteroidsMaxCount) runtime.spawnAsteroid({ avoidShip: true });
    }

    // Spawn enemies over time (accelerates with kill count).
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

    const shipX = runtime.ship.sprite.x;
    const shipY = runtime.ship.sprite.y;

    stepWorldAndCombat({
        runtime,
        dt,
        shipX,
        shipY,
        stats,
        store,
        purchasedUpgrades: store.purchasedUpgrades
    });
}


