import type { Container } from 'pixi.js';
import { getBossDef } from '../../boss/bossCatalog';
import { spawnExplosion } from './runEffects';
import { circleHit, lerp01, rotate, wrap } from './runMath';
import { createBossBullet } from './runSpawn';
import type { Boss, EnemyBullet, Projectile } from './runTypes';
import { updateProjectiles } from './runUpdateSystems';
import { getRunAssets } from '../../runAssets';
import { alphaMaskHitCircle } from './runAlphaHit';

export function updateBossBullets(args: {
  bullets: EnemyBullet[];
  world: Container;
  dt: number;
  width: number;
  height: number;
}) {
  updateProjectiles({ projectiles: args.bullets, world: args.world, dt: args.dt, width: args.width, height: args.height });
}

function phaseFromHp(hp: number, maxHp: number): 1 | 2 | 3 {
  const t = maxHp > 0 ? hp / maxHp : 0;
  if (t > 0.66) return 1;
  if (t > 0.33) return 2;
  return 3;
}

export function updateBossAndFire(args: {
  boss: Boss;
  bossBullets: EnemyBullet[];
  world: Container;
  dt: number;
  width: number;
  height: number;
  shipX: number;
  shipY: number;
  allowFire: boolean;
}) {
  const { boss: b, bossBullets, world, dt, width, height, shipX, shipY, allowFire } = args;
  const def = getBossDef(b.kind);
  const s = def.stats;
  const phase = phaseFromHp(b.hp, b.maxHp);

  const dx = shipX - b.g.x;
  const dy = shipY - b.g.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;

  // Movement: keep preferred range + strafe.
  const preferred = s.preferredRangePx;
  const band = s.rangeHysteresisPx;
  let desire = 0;
  if (d > preferred + band) desire = 1;
  else if (d < preferred - band) desire = -1;

  const distT = lerp01(Math.abs(d - preferred) / Math.max(1, preferred));
  const accel = s.accelPxPerSec2 * (0.35 + 0.65 * distT);

  const px = -ny;
  const py = nx;
  const strafePhase = (performance.now() * 0.001) * (0.55 + b.seed * 0.35) + b.seed * 11;
  const strafe = Math.sin(strafePhase) * (phase === 1 ? 0.35 : phase === 2 ? 0.45 : 0.55);

  const ax = nx * accel * desire + px * accel * 0.55 * strafe;
  const ay = ny * accel * desire + py * accel * 0.55 * strafe;

  b.vx += ax * dt;
  b.vy += ay * dt;

  const damp = Math.exp(-s.dampingPerSec * dt);
  b.vx *= damp;
  b.vy *= damp;

  const sp = Math.hypot(b.vx, b.vy);
  const max = s.maxSpeedPxPerSec;
  if (sp > max) {
    const k = max / (sp || 1);
    b.vx *= k;
    b.vy *= k;
  }

  b.g.x += b.vx * dt;
  b.g.y += b.vy * dt;
  wrap(b.g, width, height, b.r);

  // Face the player (visual).
  b.g.rotation = Math.atan2(dy, dx) + Math.PI / 2;

  // Attack director.
  b.modeTimeLeft = Math.max(0, b.modeTimeLeft - dt);
  b.aimedCooldownLeft = Math.max(0, b.aimedCooldownLeft - dt);
  b.burstShotTimerLeft = Math.max(0, b.burstShotTimerLeft - dt);
  b.ringTelegraphLeft = Math.max(0, b.ringTelegraphLeft - dt);

  if (!allowFire) return;

  // If current mode finished, pick a new one.
  if (b.modeTimeLeft <= 0) {
    const r = (Math.sin(strafePhase * 1.9) * 0.5 + 0.5);
    if (phase === 1) b.mode = r < 0.7 ? 'aimed' : 'fan';
    else if (phase === 2) b.mode = r < 0.35 ? 'aimed' : r < 0.75 ? 'fan' : 'ring';
    else b.mode = r < 0.22 ? 'aimed' : r < 0.62 ? 'fan' : 'ring';

    b.modeTimeLeft = b.mode === 'aimed' ? 2.4 : b.mode === 'fan' ? 2.0 : 1.6;
    if (b.mode === 'fan') {
      b.burstShotsLeft = s.fanBurstCount + (phase >= 3 ? 1 : 0);
      b.burstShotTimerLeft = 0.12;
    }
    if (b.mode === 'ring') {
      b.ringTelegraphLeft = s.ringTelegraphSec;
      spawnExplosion(world, b.g.x, b.g.y, b.r * 1.05);
    }
  }

  // Helpers.
  const muzzle = b.r + 10;
  const aim = { x: nx, y: ny };

  const spawnBullet = (args: { dirX: number; dirY: number; speed: number; life: number; r: number; damage: number }) => {
    const bvx = args.dirX * args.speed + b.vx * 0.15;
    const bvy = args.dirY * args.speed + b.vy * 0.15;
    const bullet = createBossBullet({
      x: b.g.x + args.dirX * muzzle,
      y: b.g.y + args.dirY * muzzle,
      vx: bvx,
      vy: bvy,
      r: args.r,
      life: args.life,
      damage: args.damage
    });
    world.addChild(bullet.g);
    bossBullets.push(bullet);
  };

  // Modes.
  if (b.mode === 'aimed') {
    if (b.aimedCooldownLeft > 0) return;
    const baseDelay = 1 / Math.max(0.001, s.aimedFireRatePerSec * (phase === 3 ? 1.2 : phase === 2 ? 1.1 : 1.0));
    b.aimedCooldownLeft = baseDelay * (0.9 + b.seed * 0.25);

    // Small aim jitter.
    const jitterRad = ((Math.sin(strafePhase * 1.4) * 0.5 + 0.5) * 2 - 1) * (4.5 * Math.PI) / 180;
    const dir = rotate(aim.x, aim.y, jitterRad);
    spawnBullet({
      dirX: dir.x,
      dirY: dir.y,
      speed: s.aimedBulletSpeedPxPerSec,
      life: s.aimedBulletLifetimeSec,
      r: s.aimedBulletRadiusPx,
      damage: s.aimedBulletDamage
    });
    return;
  }

  if (b.mode === 'fan') {
    if (b.burstShotsLeft <= 0) return;
    if (b.burstShotTimerLeft > 0) return;
    b.burstShotTimerLeft = s.fanBurstIntervalSec * (phase === 3 ? 0.9 : 1.0);
    b.burstShotsLeft--;

    spawnExplosion(world, b.g.x, b.g.y, b.r * 0.55);

    const n = Math.max(3, Math.floor(s.fanBullets + (phase === 3 ? 2 : 0)));
    const half = (s.fanHalfAngleDeg + (phase === 3 ? 6 : phase === 2 ? 3 : 0)) * (Math.PI / 180);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const ang = -half + (2 * half) * t;
      const dir = rotate(aim.x, aim.y, ang);
      spawnBullet({
        dirX: dir.x,
        dirY: dir.y,
        speed: s.fanBulletSpeedPxPerSec,
        life: s.fanBulletLifetimeSec,
        r: s.fanBulletRadiusPx,
        damage: s.fanBulletDamage
      });
    }
    return;
  }

  // ring
  if (b.mode === 'ring') {
    // Telegraph -> fire once.
    if (b.ringTelegraphLeft > 0) return;
    // Ensure single trigger per mode.
    b.modeTimeLeft = 0;

    const n = Math.max(8, Math.floor(s.ringBullets + (phase === 3 ? 6 : phase === 2 ? 2 : 0)));
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const dirX = Math.cos(ang);
      const dirY = Math.sin(ang);
      spawnBullet({
        dirX,
        dirY,
        speed: s.ringBulletSpeedPxPerSec,
        life: s.ringBulletLifetimeSec,
        r: s.ringBulletRadiusPx,
        damage: s.ringBulletDamage
      });
    }
  }
}

export function resolveBulletBossCollisions(args: {
  bullets: Projectile[];
  boss: Boss;
  world: Container;
  bulletDamage: number;
  onBulletHit?: () => void;
  onBossDestroyed: () => void;
}) {
  const { bullets, boss, world, bulletDamage, onBossDestroyed, onBulletHit } = args;
  const assets = getRunAssets();
  const mask = assets?.boss[boss.kind]?.baseAlphaMask;

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (!b) continue;
    if (!circleHit(b.g.x, b.g.y, b.r, boss.g.x, boss.g.y, boss.r)) continue;
    if (mask && !alphaMaskHitCircle({ target: boss.g, mask, worldX: b.g.x, worldY: b.g.y, worldR: b.r })) continue;

    world.removeChild(b.g);
    bullets.splice(bi, 1);
    onBulletHit?.();

    boss.hp -= bulletDamage;
    if (boss.hp <= 0) onBossDestroyed();
  }
}

export function resolveShipBossCollision(args: {
  boss: Boss;
  shipX: number;
  shipY: number;
  shipR: number;
  onShipHit: () => void;
  onPushOut: (nx: number, ny: number, overlap: number) => void;
}) {
  const { boss, shipX, shipY, shipR, onShipHit, onPushOut } = args;
  const assets = getRunAssets();
  const mask = assets?.boss[boss.kind]?.baseAlphaMask;
  if (!circleHit(shipX, shipY, shipR, boss.g.x, boss.g.y, boss.r)) return;
  if (mask && !alphaMaskHitCircle({ target: boss.g, mask, worldX: shipX, worldY: shipY, worldR: shipR })) return;

  onShipHit();
  const dx = shipX - boss.g.x;
  const dy = shipY - boss.g.y;
  const d = Math.hypot(dx, dy) || 1;
  const overlap = shipR + boss.r - d;
  if (overlap > 0) onPushOut(dx / d, dy / d, overlap);
}


