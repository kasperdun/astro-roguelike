import { GAME_CONFIG } from '../../../config/gameConfig';
import { circleHit } from './runMath';
import type { Asteroid } from './runTypes';
import { getRunAssets } from '../../runAssets';
import { alphaMaskHitCircle } from './runAlphaHit';

export function resolveShipAsteroidCollisions(args: {
    shipX: number;
    shipY: number;
    asteroids: Asteroid[];
    onShipHit: () => void;
    onPushOut: (nx: number, ny: number, overlap: number) => void;
}): boolean {
    const { shipX, shipY, asteroids, onShipHit, onPushOut } = args;
    const assets = getRunAssets();
    const asteroidMask = assets?.asteroidBaseAlphaMask ?? null;
    for (const a of asteroids) {
        if (!circleHit(shipX, shipY, GAME_CONFIG.shipCollisionRadiusPx, a.g.x, a.g.y, a.r)) continue;
        if (asteroidMask && !alphaMaskHitCircle({ target: a.g, mask: asteroidMask, worldX: shipX, worldY: shipY, worldR: GAME_CONFIG.shipCollisionRadiusPx })) continue;

        onShipHit();

        // Simple push-out.
        const dx = shipX - a.g.x;
        const dy = shipY - a.g.y;
        const d = Math.hypot(dx, dy) || 1;
        const overlap = GAME_CONFIG.shipCollisionRadiusPx + a.r - d;
        if (overlap > 0) onPushOut(dx / d, dy / d, overlap);
        return true;
    }
    return false;
}


