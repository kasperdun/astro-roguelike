import type { Container } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { flashAsteroid } from './runEffects';
import { applyBulletImpulseToAsteroid } from './runAsteroidImpulse';
import { circleHit, wrap } from './runMath';
import type { Asteroid, Pickup, Projectile } from './runTypes';
import { getRunAssets } from '../../runAssets';
import { alphaMaskHitCircle } from './runAlphaHit';

function hpRatio(current: number, max: number): number {
    if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return 0;
    return Math.max(0, Math.min(1, current / max));
}

function lerpColor(a: number, b: number, t: number): number {
    const tt = Math.max(0, Math.min(1, t));
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * tt);
    const g = Math.round(ag + (bg - ag) * tt);
    const b2 = Math.round(ab + (bb - ab) * tt);
    return (r << 16) | (g << 8) | b2;
}

function renderAsteroidHpBar(a: Asteroid) {
    a.hpBar.visible = a.hpBarVisible;
    if (!a.hpBar.visible) return;

    a.hpBar.x = a.g.x;
    a.hpBar.y = a.g.y - a.r - 14;
    a.hpBar.rotation = 0;

    const w = Math.round(Math.max(30, Math.min(86, a.r * 2.2)));
    const h = 5;
    const t = hpRatio(a.hp, a.maxHp);
    const fillW = Math.round(w * t);
    const fillColor = lerpColor(0xe84a5f, 0x3ee89a, t);

    a.hpBar.clear();
    a.hpBar.rect(-w / 2, -h / 2, w, h).fill({ color: 0x0b1020, alpha: 0.75 });
    if (fillW > 0) a.hpBar.rect(-w / 2, -h / 2, fillW, h).fill({ color: fillColor, alpha: 0.95 });
    a.hpBar.rect(-w / 2, -h / 2, w, h).stroke({ color: 0x2b3566, width: 1, alpha: 0.9 });
}

export function updateProjectiles(args: {
    projectiles: Projectile[];
    world: Container;
    dt: number;
    width: number;
    height: number;
}) {
    const { projectiles, world, dt, width, height } = args;
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p) continue;
        p.life -= dt;
        if (p.life <= 0) {
            world.removeChild(p.g);
            projectiles.splice(i, 1);
            continue;
        }
        p.g.x += p.vx * dt;
        p.g.y += p.vy * dt;
        wrap(p.g, width, height, p.r);
    }
}

export function updateBullets(args: { bullets: Projectile[]; world: Container; dt: number; width: number; height: number }) {
    updateProjectiles({ projectiles: args.bullets, world: args.world, dt: args.dt, width: args.width, height: args.height });
}

export function updateAsteroids(args: { asteroids: Asteroid[]; dt: number; width: number; height: number }) {
    const { asteroids, dt, width, height } = args;
    for (const a of asteroids) {
        a.g.x += a.vx * dt;
        a.g.y += a.vy * dt;
        if (a.spinRadPerSec !== 0) a.g.rotation += a.spinRadPerSec * dt;
        wrap(a.g, width, height, a.r);
        renderAsteroidHpBar(a);
    }
}

export function updatePickups(args: {
    pickups: Pickup[];
    world: Container;
    dt: number;
    width: number;
    height: number;
    shipX: number;
    shipY: number;
    onCollectMinerals: (amount: number) => void;
    onCollectScrap: (amount: number) => void;
    onCollectCores: (amount: number) => void;
    onCollectFuel: (amount: number) => void;
    onCollectHealth: (amount: number) => void;
    onCollect?: (pickup: Pickup) => void;
    magnetRadiusPx?: number;
    magnetAccelPxPerSec2?: number;
}) {
    const { pickups, world, dt, width, height, shipX, shipY, onCollectMinerals, onCollectScrap, onCollectCores, onCollectFuel, onCollectHealth, onCollect } = args;
    const magnetRadiusPx = args.magnetRadiusPx ?? GAME_CONFIG.pickupMagnetRadiusPx;
    const magnetAccelPxPerSec2 = args.magnetAccelPxPerSec2 ?? GAME_CONFIG.pickupMagnetAccelPxPerSec2;

    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        if (!p) continue;
        const dx = shipX - p.g.x;
        const dy = shipY - p.g.y;
        const d = Math.hypot(dx, dy);

        if (d <= GAME_CONFIG.shipCollisionRadiusPx + p.r + 2) {
            switch (p.kind) {
                case 'minerals': onCollectMinerals(p.amount); break;
                case 'scrap': onCollectScrap(p.amount); break;
                case 'core': onCollectCores(p.amount); break;
                case 'fuel': onCollectFuel(p.amount); break;
                case 'health': onCollectHealth(p.amount); break;
                case 'magnet': break;
            }
            onCollect?.(p);
            world.removeChild(p.g);
            pickups.splice(i, 1);
            continue;
        }

        if (d > 0 && d < magnetRadiusPx) {
            const nx = dx / d;
            const ny = dy / d;
            p.vx += nx * magnetAccelPxPerSec2 * dt;
            p.vy += ny * magnetAccelPxPerSec2 * dt;
        }

        const pd = Math.exp(-GAME_CONFIG.pickupDampingPerSec * dt);
        p.vx *= pd;
        p.vy *= pd;

        p.g.x += p.vx * dt;
        p.g.y += p.vy * dt;
        wrap(p.g, width, height, p.r);
    }
}

export function resolveBulletAsteroidCollisions(args: {
    bullets: Projectile[];
    asteroids: Asteroid[];
    world: Container;
    bulletDamage: number;
    onBulletHit?: () => void;
    onAsteroidDestroyed: (index: number) => void;
}) {
    const { bullets, asteroids, world, bulletDamage, onAsteroidDestroyed, onBulletHit } = args;
    const assets = getRunAssets();
    const asteroidMask = assets?.asteroidBaseAlphaMask ?? null;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (!b) continue;
        let hit = false;
        for (let ai = asteroids.length - 1; ai >= 0; ai--) {
            const a = asteroids[ai];
            if (!a) continue;
            if (!circleHit(b.g.x, b.g.y, b.r, a.g.x, a.g.y, a.r)) continue;
            if (asteroidMask && !alphaMaskHitCircle({ target: a.g, mask: asteroidMask, worldX: b.g.x, worldY: b.g.y, worldR: b.r })) continue;

            // bullet consumed
            world.removeChild(b.g);
            bullets.splice(bi, 1);
            hit = true;

            a.hp -= bulletDamage;
            a.hpBarVisible = true;
            flashAsteroid(a.g);
            onBulletHit?.();

            // "Soft" kinetic response.
            applyBulletImpulseToAsteroid({ asteroid: a, bulletVx: b.vx, bulletVy: b.vy });

            if (a.hp <= 0) onAsteroidDestroyed(ai);
            break;
        }
        if (hit) continue;
    }
}


