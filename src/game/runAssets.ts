import { Assets, Rectangle, Texture } from 'pixi.js';
import type { EnemyKind } from './enemies/enemyCatalog';

// Vite will turn these into correct runtime URLs (dev: /@fs or /assets, build: hashed).
import shipFullUrl from '../../assets/Main Ship - Bases/PNGs/Main Ship - Base - Full health.png?url';
import shipSlightUrl from '../../assets/Main Ship - Bases/PNGs/Main Ship - Base - Slight damage.png?url';
import shipDamagedUrl from '../../assets/Main Ship - Bases/PNGs/Main Ship - Base - Damaged.png?url';
import shipVeryDamagedUrl from '../../assets/Main Ship - Bases/PNGs/Main Ship - Base - Very damaged.png?url';

import asteroidBaseUrl from '../../assets/Asteroids/PNGs/Asteroid 01 - Base.png?url';
import asteroidExplodeSheetUrl from '../../assets/Asteroids/PNGs/Asteroid 01 - Explode.png?url';

import enemyScoutBaseUrl from '../../assets/Enemies/Nautolan Ship - Scout - Base.png?url';
import enemyFighterBaseUrl from '../../assets/Enemies/Nautolan Ship - Fighter - Base.png?url';
import enemyBomberBaseUrl from '../../assets/Enemies/Nautolan Ship - Bomber - Base.png?url';

import enemyScoutDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Scout.png?url';
import enemyFighterDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Fighter.png?url';
import enemyBomberDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Bomber.png?url';

export type RunAssets = {
  shipFull: Texture;
  shipSlight: Texture;
  shipDamaged: Texture;
  shipVeryDamaged: Texture;
  asteroidBase: Texture;
  /** Diameter (px) of the *opaque* (alpha>threshold) area inside asteroidBase texture. */
  asteroidBaseOpaqueDiameterPx: number;
  asteroidExplodeFrames: Texture[];
  enemy: Record<
    EnemyKind,
    {
      base: Texture;
      /** Diameter (px) of the *opaque* (alpha>threshold) area inside base texture. */
      baseOpaqueDiameterPx: number;
      destructionFrames: Texture[];
    }
  >;
};

let runAssets: RunAssets | null = null;
let runAssetsPromise: Promise<RunAssets> | null = null;

export function getRunAssets(): RunAssets | null {
  return runAssets;
}

function computeOpaqueBoundsPx(args: { texture: Texture; alphaThreshold?: number }): { w: number; h: number } {
  const { texture, alphaThreshold = 1 } = args;
  const src = texture.source;
  const res = src.resource as unknown;
  const w = src.pixelWidth || src.width;
  const h = src.pixelHeight || src.height;
  if (!w || !h) return { w: texture.width, h: texture.height };

  // If we can't read pixels, fall back to full texture size (still functional, just less accurate).
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as unknown as CanvasRenderingContext2DSettings);
    if (!ctx) return { w, h };

    // drawImage supports HTMLImageElement, HTMLCanvasElement, ImageBitmap, OffscreenCanvas (when available).
    ctx.clearRect(0, 0, w, h);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.drawImage(res as any, 0, 0, w, h);

    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    // Scan alpha channel.
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const a = data[row + x * 4 + 3] ?? 0;
        if (a < alphaThreshold) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0 || maxY < 0) return { w, h }; // fully transparent? shouldn't happen

    return { w: maxX - minX + 1, h: maxY - minY + 1 };
  } catch {
    return { w, h };
  }
}

export function preloadRunAssets(): Promise<RunAssets> {
  runAssetsPromise ??= (async () => {
    const [
      shipFull,
      shipSlight,
      shipDamaged,
      shipVeryDamaged,
      asteroidBase,
      explodeSheet,
      enemyScoutBase,
      enemyFighterBase,
      enemyBomberBase,
      enemyScoutDestroySheet,
      enemyFighterDestroySheet,
      enemyBomberDestroySheet
    ] = await Promise.all([
      Assets.load<Texture>(shipFullUrl),
      Assets.load<Texture>(shipSlightUrl),
      Assets.load<Texture>(shipDamagedUrl),
      Assets.load<Texture>(shipVeryDamagedUrl),
      Assets.load<Texture>(asteroidBaseUrl),
      Assets.load<Texture>(asteroidExplodeSheetUrl),
      Assets.load<Texture>(enemyScoutBaseUrl),
      Assets.load<Texture>(enemyFighterBaseUrl),
      Assets.load<Texture>(enemyBomberBaseUrl),
      Assets.load<Texture>(enemyScoutDestroySheetUrl),
      Assets.load<Texture>(enemyFighterDestroySheetUrl),
      Assets.load<Texture>(enemyBomberDestroySheetUrl)
    ]);

    const opaque = computeOpaqueBoundsPx({ texture: asteroidBase, alphaThreshold: 8 });
    const asteroidBaseOpaqueDiameterPx = Math.max(1, Math.max(opaque.w, opaque.h));

    const w = explodeSheet.source.width;
    const h = explodeSheet.source.height;
    const framesCount = 8;
    const frameW = Math.max(1, Math.floor(w / framesCount));
    const asteroidExplodeFrames: Texture[] = [];
    for (let i = 0; i < framesCount; i++) {
      asteroidExplodeFrames.push(
        new Texture({
          source: explodeSheet.source,
          frame: new Rectangle(i * frameW, 0, frameW, h)
        })
      );
    }

    function buildSheetFrames(args: { sheet: Texture; frameW: number }): Texture[] {
      const sw = args.sheet.source.width;
      const sh = args.sheet.source.height;
      const fw = Math.max(1, Math.floor(args.frameW));
      const count = Math.max(1, Math.floor(sw / fw));
      const frames: Texture[] = [];
      for (let i = 0; i < count; i++) {
        frames.push(
          new Texture({
            source: args.sheet.source,
            frame: new Rectangle(i * fw, 0, fw, sh)
          })
        );
      }
      return frames;
    }

    function baseOpaqueDiameterPx(base: Texture): number {
      const opaque = computeOpaqueBoundsPx({ texture: base, alphaThreshold: 8 });
      return Math.max(1, Math.max(opaque.w, opaque.h));
    }

    const enemy = {
      scout: {
        base: enemyScoutBase,
        baseOpaqueDiameterPx: baseOpaqueDiameterPx(enemyScoutBase),
        destructionFrames: buildSheetFrames({ sheet: enemyScoutDestroySheet, frameW: enemyScoutBase.source.width })
      },
      fighter: {
        base: enemyFighterBase,
        baseOpaqueDiameterPx: baseOpaqueDiameterPx(enemyFighterBase),
        destructionFrames: buildSheetFrames({ sheet: enemyFighterDestroySheet, frameW: enemyFighterBase.source.width })
      },
      bomber: {
        base: enemyBomberBase,
        baseOpaqueDiameterPx: baseOpaqueDiameterPx(enemyBomberBase),
        destructionFrames: buildSheetFrames({ sheet: enemyBomberDestroySheet, frameW: enemyBomberBase.source.width })
      }
    } as const satisfies RunAssets['enemy'];

    runAssets = {
      shipFull,
      shipSlight,
      shipDamaged,
      shipVeryDamaged,
      asteroidBase,
      asteroidBaseOpaqueDiameterPx,
      asteroidExplodeFrames,
      enemy
    };
    return runAssets;
  })();

  return runAssetsPromise;
}


