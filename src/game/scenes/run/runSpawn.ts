import { Graphics } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { lerp, lerp01, randInt, rotate } from './runMath';
import type { Asteroid, Pickup, PickupKind } from './runTypes';

export function createAsteroid(args: {
  width: number;
  height: number;
  shipX: number;
  shipY: number;
  avoidShip: boolean;
}): Asteroid {
  const { width, height, shipX, shipY, avoidShip } = args;

  const r =
    GAME_CONFIG.asteroidMinRadiusPx +
    Math.random() * Math.max(0, GAME_CONFIG.asteroidMaxRadiusPx - GAME_CONFIG.asteroidMinRadiusPx);

  const g = new Graphics();
  g.circle(0, 0, r).fill({ color: 0x4e5b73, alpha: 0.92 }).stroke({ color: 0x1b2333, width: 2, alpha: 0.85 });

  // Spawn strictly outside the visible screen so asteroids "fly in" instead of popping in.
  const spawnMargin = 20;
  const side = randInt(0, 3); // 0: left, 1: right, 2: top, 3: bottom
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = -r - spawnMargin;
    y = Math.random() * Math.max(1, height);
  } else if (side === 1) {
    x = width + r + spawnMargin;
    y = Math.random() * Math.max(1, height);
  } else if (side === 2) {
    x = Math.random() * Math.max(1, width);
    y = -r - spawnMargin;
  } else {
    x = Math.random() * Math.max(1, width);
    y = height + r + spawnMargin;
  }

  // Choose a random point inside the screen to ensure it enters the view,
  // while the resulting movement direction still feels "random enough".
  let tx = Math.random() * Math.max(1, width);
  let ty = Math.random() * Math.max(1, height);
  if (avoidShip) {
    const minDist = 160;
    for (let i = 0; i < 24; i++) {
      const dx = tx - shipX;
      const dy = ty - shipY;
      if (Math.hypot(dx, dy) >= minDist) break;
      tx = Math.random() * Math.max(1, width);
      ty = Math.random() * Math.max(1, height);
    }
  }

  let dirX = tx - x;
  let dirY = ty - y;
  const dirLen = Math.hypot(dirX, dirY) || 1;
  dirX /= dirLen;
  dirY /= dirLen;

  // Add a small random angular jitter so trajectories vary more.
  const jitterRad = ((Math.random() * 2 - 1) * 35 * Math.PI) / 180;
  const j = rotate(dirX, dirY, jitterRad);
  dirX = j.x;
  dirY = j.y;

  const speed =
    GAME_CONFIG.asteroidMinSpeedPxPerSec +
    Math.random() * Math.max(0, GAME_CONFIG.asteroidMaxSpeedPxPerSec - GAME_CONFIG.asteroidMinSpeedPxPerSec);
  const vx = dirX * speed;
  const vy = dirY * speed;

  g.x = x;
  g.y = y;

  const t = lerp01((r - GAME_CONFIG.asteroidMinRadiusPx) / (GAME_CONFIG.asteroidMaxRadiusPx - GAME_CONFIG.asteroidMinRadiusPx));
  const hp = Math.round(lerp(GAME_CONFIG.asteroidHpAtMinRadius, GAME_CONFIG.asteroidHpAtMaxRadius, t));

  return { g, vx, vy, r, hp };
}

export function createPickup(kind: PickupKind, amount: number, x: number, y: number): Pickup {
  const r = kind === 'minerals' ? 6 : 6;
  const g = new Graphics();
  g.circle(0, 0, r).fill({ color: kind === 'minerals' ? 0x7fd6ff : 0xffd37f, alpha: 0.95 });
  g.x = x + (Math.random() - 0.5) * 14;
  g.y = y + (Math.random() - 0.5) * 14;

  const ang = Math.random() * Math.PI * 2;
  const speed = 40 + Math.random() * 70;
  const vx = Math.cos(ang) * speed;
  const vy = Math.sin(ang) * speed;

  return { g, kind, amount, vx, vy, r };
}


