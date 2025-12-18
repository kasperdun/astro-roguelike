import { GAME_CONFIG } from '../../../config/gameConfig';
import { lerp01 } from './runMath';
import type { Asteroid } from './runTypes';

export function applyBulletImpulseToAsteroid(args: { asteroid: Asteroid; bulletVx: number; bulletVy: number }) {
  const { asteroid: a, bulletVx, bulletVy } = args;

  const prevVx = a.vx;
  const prevVy = a.vy;
  const prevSpeed = Math.hypot(prevVx, prevVy);

  // Forward direction is current velocity direction (or bullet direction if nearly stopped).
  let fwdX = prevVx;
  let fwdY = prevVy;
  const fwdLen = Math.hypot(fwdX, fwdY);
  if (fwdLen > 1e-6) {
    fwdX /= fwdLen;
    fwdY /= fwdLen;
  } else {
    const bLen = Math.hypot(bulletVx, bulletVy) || 1;
    fwdX = bulletVx / bLen;
    fwdY = bulletVy / bLen;
  }

  // Bullet direction (unit).
  const bLen = Math.hypot(bulletVx, bulletVy) || 1;
  const bDirX = bulletVx / bLen;
  const bDirY = bulletVy / bLen;

  // Mass proxy: larger asteroids react less.
  const massScale = Math.max(0.75, a.r / GAME_CONFIG.asteroidMinRadiusPx);

  // Delta-v magnitude scales with bullet speed and config factor, damped by mass.
  const dV = (bLen * GAME_CONFIG.bulletAsteroidImpulseFactor) / massScale;
  a.vx += bDirX * dV;
  a.vy += bDirY * dV;

  // Speed loss on hit (simulates momentum absorption / fragmentation).
  const loss = lerp01(GAME_CONFIG.bulletAsteroidHitSpeedLossFactor);
  a.vx *= 1 - loss;
  a.vy *= 1 - loss;

  // Prevent instant "direction flip": keep forward component above a fraction of previous speed.
  if (prevSpeed > 1e-3) {
    const minForward = prevSpeed * lerp01(GAME_CONFIG.bulletAsteroidMinForwardRetention);
    const forwardNow = a.vx * fwdX + a.vy * fwdY;
    if (forwardNow < minForward) {
      const add = minForward - forwardNow;
      a.vx += fwdX * add;
      a.vy += fwdY * add;
    }
  }

  // Clamp final speed.
  const sp = Math.hypot(a.vx, a.vy);
  const maxSp = GAME_CONFIG.asteroidMaxSpeedAfterHitPxPerSec;
  if (sp > maxSp) {
    const k = maxSp / sp;
    a.vx *= k;
    a.vy *= k;
  }
}


