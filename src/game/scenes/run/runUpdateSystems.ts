import type { Container } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { flashAsteroid } from './runEffects';
import { applyBulletImpulseToAsteroid } from './runAsteroidImpulse';
import { circleHit, wrap } from './runMath';
import type { Asteroid, Pickup, Projectile } from './runTypes';

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
    wrap(a.g, width, height, a.r);
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
  onCollect?: (pickup: Pickup) => void;
}) {
  const { pickups, world, dt, width, height, shipX, shipY, onCollectMinerals, onCollectScrap, onCollect } = args;

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (!p) continue;
    const dx = shipX - p.g.x;
    const dy = shipY - p.g.y;
    const d = Math.hypot(dx, dy);

    if (d <= GAME_CONFIG.shipCollisionRadiusPx + p.r + 2) {
      if (p.kind === 'minerals') onCollectMinerals(p.amount);
      else onCollectScrap(p.amount);
      onCollect?.(p);
      world.removeChild(p.g);
      pickups.splice(i, 1);
      continue;
    }

    if (d > 0 && d < GAME_CONFIG.pickupMagnetRadiusPx) {
      const nx = dx / d;
      const ny = dy / d;
      p.vx += nx * GAME_CONFIG.pickupMagnetAccelPxPerSec2 * dt;
      p.vy += ny * GAME_CONFIG.pickupMagnetAccelPxPerSec2 * dt;
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

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (!b) continue;
    let hit = false;
    for (let ai = asteroids.length - 1; ai >= 0; ai--) {
      const a = asteroids[ai];
      if (!a) continue;
      if (!circleHit(b.g.x, b.g.y, b.r, a.g.x, a.g.y, a.r)) continue;

      // bullet consumed
      world.removeChild(b.g);
      bullets.splice(bi, 1);
      hit = true;

      a.hp -= bulletDamage;
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


