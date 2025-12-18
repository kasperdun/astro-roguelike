import { GAME_CONFIG } from '../../../config/gameConfig';
import type { RunInputState } from './runInput';
import { wrap } from './runMath';

export function advanceShipKinematics(args: {
  ship: { x: number; y: number; rotation: number };
  pointer: { x: number; y: number };
  input: RunInputState;
  vx: number;
  vy: number;
  dt: number;
  stats: { shipAccelPxPerSec2: number; shipMaxSpeedPxPerSec: number };
  bounds: { width: number; height: number };
}): { vx: number; vy: number } {
  const { ship, pointer, input, dt, stats, bounds } = args;

  // aim: rotate ship towards cursor
  const dxAim = pointer.x - ship.x;
  const dyAim = pointer.y - ship.y;
  ship.rotation = Math.atan2(dyAim, dxAim);

  // ship movement (WASD -> acceleration with inertia)
  const axRaw = (input.d ? 1 : 0) - (input.a ? 1 : 0);
  const ayRaw = (input.s ? 1 : 0) - (input.w ? 1 : 0);
  let ax = axRaw;
  let ay = ayRaw;
  const len = Math.hypot(ax, ay);
  if (len > 0) {
    ax /= len;
    ay /= len;
  }

  let vx = args.vx + ax * stats.shipAccelPxPerSec2 * dt;
  let vy = args.vy + ay * stats.shipAccelPxPerSec2 * dt;

  // damping (exponential)
  const damp = Math.exp(-GAME_CONFIG.shipDampingPerSec * dt);
  vx *= damp;
  vy *= damp;

  // clamp speed
  const sp = Math.hypot(vx, vy);
  if (sp > stats.shipMaxSpeedPxPerSec) {
    const k = stats.shipMaxSpeedPxPerSec / sp;
    vx *= k;
    vy *= k;
  }

  ship.x += vx * dt;
  ship.y += vy * dt;
  wrap(ship, bounds.width, bounds.height, GAME_CONFIG.shipCollisionRadiusPx);

  return { vx, vy };
}


