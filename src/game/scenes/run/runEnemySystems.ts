import type { Container } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { flashEnemy } from './runEffects';
import { circleHit, lerp01, rotate, wrap } from './runMath';
import { createEnemyBullet } from './runSpawn';
import type { Enemy, EnemyBullet, Projectile } from './runTypes';
import { updateProjectiles } from './runUpdateSystems';

export function updateEnemyBullets(args: {
  bullets: EnemyBullet[];
  world: Container;
  dt: number;
  width: number;
  height: number;
}) {
  updateProjectiles({ projectiles: args.bullets, world: args.world, dt: args.dt, width: args.width, height: args.height });
}

export function updateEnemiesAndFire(args: {
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  world: Container;
  dt: number;
  width: number;
  height: number;
  shipX: number;
  shipY: number;
  /** If false, enemies will move but will not shoot. */
  allowFire: boolean;
}) {
  const { enemies, enemyBullets, world, dt, width, height, shipX, shipY, allowFire } = args;

  for (const e of enemies) {
    const dx = shipX - e.g.x;
    const dy = shipY - e.g.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;

    // Steering: keep preferred range (with hysteresis) + small strafe for variety.
    const preferred = GAME_CONFIG.enemyPreferredRangePx;
    const band = GAME_CONFIG.enemyRangeHysteresisPx;

    // Move towards/away depending on distance to target.
    let desire = 0;
    if (d > preferred + band) desire = 1;
    else if (d < preferred - band) desire = -1;

    // Smooth the desire a bit based on how far we are from preferred.
    const distT = lerp01(Math.abs(d - preferred) / Math.max(1, preferred));
    const accel = GAME_CONFIG.enemyAccelPxPerSec2 * (0.35 + 0.65 * distT);

    // Per-enemy strafe: perpendicular vector with oscillating sign and magnitude.
    const px = -ny;
    const py = nx;
    const strafePhase = (performance.now() * 0.001) * (0.9 + e.seed * 0.6) + e.seed * 10;
    const strafe = Math.sin(strafePhase) * 0.65;

    const ax = nx * accel * desire + px * accel * 0.55 * strafe;
    const ay = ny * accel * desire + py * accel * 0.55 * strafe;

    e.vx += ax * dt;
    e.vy += ay * dt;

    // Damping (exponential for dt stability).
    const damp = Math.exp(-GAME_CONFIG.enemyDampingPerSec * dt);
    e.vx *= damp;
    e.vy *= damp;

    // Clamp speed.
    const sp = Math.hypot(e.vx, e.vy);
    const max = GAME_CONFIG.enemyMaxSpeedPxPerSec;
    if (sp > max) {
      const s = max / (sp || 1);
      e.vx *= s;
      e.vy *= s;
    }

    e.g.x += e.vx * dt;
    e.g.y += e.vy * dt;
    wrap(e.g, width, height, e.r);

    // Face the player (purely visual; bullets use aim vector below).
    e.g.rotation = Math.atan2(dy, dx);

    // Fire control.
    e.fireCooldownLeft = Math.max(0, e.fireCooldownLeft - dt);
    if (!allowFire) continue;
    if (e.fireCooldownLeft > 0) continue;

    // Don't shoot from very far away; keeps early combat readable.
    if (d > preferred * 2.2) continue;

    const baseDelay = 1 / Math.max(0.001, GAME_CONFIG.enemyFireRatePerSec);
    e.fireCooldownLeft = baseDelay * (0.85 + e.seed * 0.3);

    // Aim at ship with slight random-ish jitter based on seed.
    const aimJitterRad = ((Math.sin(strafePhase * 1.7) * 0.5 + 0.5) * 2 - 1) * (7 * Math.PI) / 180;
    const aim = rotate(nx, ny, aimJitterRad);
    const bvx = aim.x * GAME_CONFIG.enemyBulletSpeedPxPerSec + e.vx * 0.15;
    const bvy = aim.y * GAME_CONFIG.enemyBulletSpeedPxPerSec + e.vy * 0.15;

    const muzzle = e.r + 6;
    const bullet = createEnemyBullet({ x: e.g.x + aim.x * muzzle, y: e.g.y + aim.y * muzzle, vx: bvx, vy: bvy });
    world.addChild(bullet.g);
    enemyBullets.push(bullet);
  }
}

export function resolveBulletEnemyCollisions(args: {
  bullets: Projectile[];
  enemies: Enemy[];
  world: Container;
  bulletDamage: number;
  onBulletHit?: () => void;
  onEnemyDestroyed: (index: number) => void;
}) {
  const { bullets, enemies, world, bulletDamage, onEnemyDestroyed, onBulletHit } = args;

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (!b) continue;
    let hit = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (!e) continue;
      if (!circleHit(b.g.x, b.g.y, b.r, e.g.x, e.g.y, e.r)) continue;

      // bullet consumed
      world.removeChild(b.g);
      bullets.splice(bi, 1);
      hit = true;

      e.hp -= bulletDamage;
      flashEnemy(e.g);
      onBulletHit?.();

      if (e.hp <= 0) onEnemyDestroyed(ei);
      break;
    }
    if (hit) continue;
  }
}

export function resolveEnemyBulletShipCollisions(args: {
  bullets: EnemyBullet[];
  world: Container;
  shipX: number;
  shipY: number;
  shipR: number;
  onShipHit: () => void;
}) {
  const { bullets, world, shipX, shipY, shipR, onShipHit } = args;
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (!b) continue;
    if (!circleHit(shipX, shipY, shipR, b.g.x, b.g.y, b.r)) continue;

    world.removeChild(b.g);
    bullets.splice(bi, 1);
    onShipHit();
  }
}

export function resolveShipEnemyCollisions(args: {
  enemies: Enemy[];
  shipX: number;
  shipY: number;
  shipR: number;
  onShipHit: () => void;
  /** Apply a simple push-out response to separate ship and enemy. */
  onPushOut: (nx: number, ny: number, overlap: number) => void;
}) {
  const { enemies, shipX, shipY, shipR, onShipHit, onPushOut } = args;
  for (const e of enemies) {
    if (!circleHit(shipX, shipY, shipR, e.g.x, e.g.y, e.r)) continue;

    onShipHit();

    const dx = shipX - e.g.x;
    const dy = shipY - e.g.y;
    const d = Math.hypot(dx, dy) || 1;
    const overlap = shipR + e.r - d;
    if (overlap > 0) onPushOut(dx / d, dy / d, overlap);
    break;
  }
}


