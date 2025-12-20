import { Container, Point, Sprite } from 'pixi.js';
import type { AlphaMask } from '../../runAssets';

const tmpGlobal = new Point();
const tmpLocal = new Point();

function worldToLocal(obj: Container, worldX: number, worldY: number): Point {
  tmpGlobal.set(worldX, worldY);
  // `toLocal` converts from global space when `from` is omitted.
  return obj.toLocal(tmpGlobal, undefined, tmpLocal);
}

function approxWorldScale(obj: Container): number {
  // World transform columns encode scaled basis vectors.
  const wt = obj.worldTransform;
  const sx = Math.hypot(wt.a, wt.b);
  const sy = Math.hypot(wt.c, wt.d);
  // Sprites here use uniform scaling, but keep this stable if it ever changes.
  return Math.max(1e-6, (sx + sy) * 0.5);
}

/**
 * Pixel-precise hit test: does a world-space circle overlap any opaque pixel of `mask`
 * when mapped into `target`'s local sprite space?
 *
 * Notes:
 * - `mask` must be built from the sprite's texture frame dimensions.
 * - Works with rotation/scaling because we convert the test center via `toLocal`.
 */
export function alphaMaskHitCircle(args: {
  target: Container;
  mask: AlphaMask;
  worldX: number;
  worldY: number;
  worldR: number;
  alphaMustBeOpaque?: boolean;
}): boolean {
  const { target, mask, worldX, worldY, worldR } = args;
  if (mask.w <= 0 || mask.h <= 0) return false;
  if (worldR <= 0) return false;

  const local = worldToLocal(target, worldX, worldY);
  const invScale = 1 / approxWorldScale(target);
  const localR = worldR * invScale;

  // Convert local coords into mask pixel coords.
  // With Sprite anchors this keeps working even if anchor isn't 0.5.
  let ax = 0.5;
  let ay = 0.5;
  if (target instanceof Sprite) {
    ax = target.anchor.x;
    ay = target.anchor.y;
  }
  const cx = local.x + mask.w * ax;
  const cy = local.y + mask.h * ay;

  const r2 = localR * localR;
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r2)) return false;

  let minX = Math.floor(cx - localR);
  let maxX = Math.ceil(cx + localR);
  let minY = Math.floor(cy - localR);
  let maxY = Math.ceil(cy + localR);

  if (maxX < 0 || maxY < 0 || minX >= mask.w || minY >= mask.h) return false;
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(mask.w - 1, maxX);
  maxY = Math.min(mask.h - 1, maxY);

  const w = mask.w;
  const data = mask.data;

  // Scan overlapped pixels, but only those within the circle.
  for (let y = minY; y <= maxY; y++) {
    const dy = y + 0.5 - cy;
    const row = y * w;
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      if (dx * dx + dy * dy > r2) continue;
      if (data[row + x] === 1) return true;
    }
  }

  return false;
}


