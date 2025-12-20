import { Container, Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { audio } from '../../../audio/audio';
import type { Bullet } from './runTypes';
import type { DerivedRunStats } from '../../../progression/upgrades';

export class RunPlayerWeapons {
    private cooldownLeft = 0;

    public reset() {
        this.cooldownLeft = 0;
    }

    public tick(dt: number) {
        this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    }

    public tryFire(args: {
        world: Container;
        bullets: Bullet[];
        shipX: number;
        shipY: number;
        shipAimRad: number;
        runFuel: number;
        stats: Pick<
            DerivedRunStats,
            'weaponFireRatePerSec' | 'fuelDrainPerShot' | 'bulletSpeedPxPerSec' | 'bulletLifetimeSec' | 'projectilesPerShot'
        >;
        consumeFuel: (amount: number) => void;
        /** After consuming fuel, the run could end; return false to abort bullet spawning. */
        isRunStillActive: () => boolean;
    }): boolean {
        if (this.cooldownLeft > 0) return false;
        if (args.runFuel <= 0) return false;

        const fireDelay = 1 / Math.max(0.001, args.stats.weaponFireRatePerSec);
        this.cooldownLeft = fireDelay;

        args.consumeFuel(args.stats.fuelDrainPerShot);
        if (!args.isRunStillActive()) return false;

        audio.playLaser();

        const dirX = Math.cos(args.shipAimRad);
        const dirY = Math.sin(args.shipAimRad);

        const x = args.shipX + dirX * GAME_CONFIG.bulletMuzzleOffsetPx;
        const y = args.shipY + dirY * GAME_CONFIG.bulletMuzzleOffsetPx;

        // Bullet speed should be independent from ship movement direction (constant world-space bullet speed).
        const vx = dirX * args.stats.bulletSpeedPxPerSec;
        const vy = dirY * args.stats.bulletSpeedPxPerSec;

        // Multi-shot: spawn N parallel bullets, evenly spaced, centered around the ship's aim line.
        const perpX = -dirY;
        const perpY = dirX;
        const n = Math.max(1, Math.floor(args.stats.projectilesPerShot));
        const center = (n - 1) / 2;

        for (let i = 0; i < n; i++) {
            const off = (i - center) * GAME_CONFIG.bulletParallelOffsetPx;
            const g = new Graphics();
            g.circle(0, 0, GAME_CONFIG.bulletRadiusPx).fill({ color: 0xe8ecff, alpha: 1 });
            g.x = x + perpX * off;
            g.y = y + perpY * off;

            args.world.addChild(g);
            args.bullets.push({
                g,
                vx,
                vy,
                r: GAME_CONFIG.bulletRadiusPx,
                life: args.stats.bulletLifetimeSec
            });
        }

        return true;
    }
}


