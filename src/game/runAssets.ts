import { Assets, Rectangle, Texture } from 'pixi.js';
import type { EnemyKind } from './enemies/enemyCatalog';
import type { BossKind } from './boss/bossCatalog';

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
import bossDreadnoughtBaseUrl from '../../assets/Enemies/Nautolan Ship - Dreadnought - Base.png?url';

import enemyScoutDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Scout.png?url';
import enemyFighterDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Fighter.png?url';
import enemyBomberDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Bomber.png?url';
import bossDreadnoughtDestroySheetUrl from '../../assets/Enemies/Destruction/Nautolan Ship - Dreadnought.png?url';

export type RunAssets = {
    shipFull: Texture;
    shipSlight: Texture;
    shipDamaged: Texture;
    shipVeryDamaged: Texture;
    asteroidBase: Texture;
    /** Diameter (px) of the *opaque* (alpha>threshold) area inside asteroidBase texture. */
    asteroidBaseOpaqueDiameterPx: number;
    /** Alpha mask (1 byte per pixel, 1 = opaque) for asteroidBase (frame-sized). */
    asteroidBaseAlphaMask: AlphaMask;
    asteroidExplodeFrames: Texture[];
    enemy: Record<
        EnemyKind,
        {
            base: Texture;
            /** Diameter (px) of the *opaque* (alpha>threshold) area inside base texture. */
            baseOpaqueDiameterPx: number;
            /** Alpha mask (1 byte per pixel, 1 = opaque) for base (frame-sized). */
            baseAlphaMask: AlphaMask;
            destructionFrames: Texture[];
        }
    >;
    boss: Record<
        BossKind,
        {
            base: Texture;
            /** Diameter (px) of the *opaque* (alpha>threshold) area inside base texture. */
            baseOpaqueDiameterPx: number;
            /** Alpha mask (1 byte per pixel, 1 = opaque) for base (frame-sized). */
            baseAlphaMask: AlphaMask;
            destructionFrames: Texture[];
        }
    >;
};

export type AlphaMask = {
    w: number;
    h: number;
    /** Row-major, length = w*h. Each cell is 0 (transparent) or 1 (opaque). */
    data: Uint8Array;
};

let runAssets: RunAssets | null = null;
let runAssetsPromise: Promise<RunAssets> | null = null;

export function getRunAssets(): RunAssets | null {
    return runAssets;
}

function buildAlphaMaskAndOpaqueBounds(args: { texture: Texture; alphaThreshold?: number }): { mask: AlphaMask; opaque: { w: number; h: number } } {
    const { texture, alphaThreshold = 8 } = args;

    const src = texture.source;
    const res = src.resource as unknown as CanvasImageSource;
    const frame = texture.frame;

    const fw = Math.max(1, Math.round(frame.width));
    const fh = Math.max(1, Math.round(frame.height));
    const fx = Math.round(frame.x);
    const fy = Math.round(frame.y);

    const mask: AlphaMask = { w: fw, h: fh, data: new Uint8Array(fw * fh) };

    // If we can't read pixels, fall back to "fully opaque" mask so gameplay remains stable.
    // (This still avoids early hits from transparent padding only if we can actually read pixels.)
    try {
        const canvas = document.createElement('canvas');
        canvas.width = fw;
        canvas.height = fh;
        const ctx = canvas.getContext('2d', { willReadFrequently: true } as unknown as CanvasRenderingContext2DSettings);
        if (!ctx) throw new Error('no 2d context');

        ctx.clearRect(0, 0, fw, fh);
        ctx.drawImage(res, fx, fy, fw, fh, 0, 0, fw, fh);

        const img = ctx.getImageData(0, 0, fw, fh);
        const data = img.data;

        let minX = fw;
        let minY = fh;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < fh; y++) {
            const row = y * fw * 4;
            const outRow = y * fw;
            for (let x = 0; x < fw; x++) {
                const a = data[row + x * 4 + 3] ?? 0;
                if (a < alphaThreshold) continue;
                mask.data[outRow + x] = 1;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }

        if (maxX < 0 || maxY < 0) {
            return { mask, opaque: { w: fw, h: fh } };
        }

        return { mask, opaque: { w: maxX - minX + 1, h: maxY - minY + 1 } };
    } catch {
        // Mark everything as opaque so collisions remain consistent even if pixel reads fail.
        mask.data.fill(1);
        return { mask, opaque: { w: fw, h: fh } };
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
            bossDreadnoughtBase,
            enemyScoutDestroySheet,
            enemyFighterDestroySheet,
            enemyBomberDestroySheet,
            bossDreadnoughtDestroySheet
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
            Assets.load<Texture>(bossDreadnoughtBaseUrl),
            Assets.load<Texture>(enemyScoutDestroySheetUrl),
            Assets.load<Texture>(enemyFighterDestroySheetUrl),
            Assets.load<Texture>(enemyBomberDestroySheetUrl),
            Assets.load<Texture>(bossDreadnoughtDestroySheetUrl)
        ]);

        const asteroidMask = buildAlphaMaskAndOpaqueBounds({ texture: asteroidBase, alphaThreshold: 8 });
        const asteroidBaseOpaqueDiameterPx = Math.max(1, Math.max(asteroidMask.opaque.w, asteroidMask.opaque.h));

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

        function baseMaskAndOpaqueDiameter(base: Texture): { mask: AlphaMask; diameterPx: number } {
            const built = buildAlphaMaskAndOpaqueBounds({ texture: base, alphaThreshold: 8 });
            return { mask: built.mask, diameterPx: Math.max(1, Math.max(built.opaque.w, built.opaque.h)) };
        }

        const scoutMask = baseMaskAndOpaqueDiameter(enemyScoutBase);
        const fighterMask = baseMaskAndOpaqueDiameter(enemyFighterBase);
        const bomberMask = baseMaskAndOpaqueDiameter(enemyBomberBase);
        const dreadnoughtMask = baseMaskAndOpaqueDiameter(bossDreadnoughtBase);

        const enemy = {
            scout: {
                base: enemyScoutBase,
                baseOpaqueDiameterPx: scoutMask.diameterPx,
                baseAlphaMask: scoutMask.mask,
                destructionFrames: buildSheetFrames({ sheet: enemyScoutDestroySheet, frameW: enemyScoutBase.source.width })
            },
            fighter: {
                base: enemyFighterBase,
                baseOpaqueDiameterPx: fighterMask.diameterPx,
                baseAlphaMask: fighterMask.mask,
                destructionFrames: buildSheetFrames({ sheet: enemyFighterDestroySheet, frameW: enemyFighterBase.source.width })
            },
            bomber: {
                base: enemyBomberBase,
                baseOpaqueDiameterPx: bomberMask.diameterPx,
                baseAlphaMask: bomberMask.mask,
                destructionFrames: buildSheetFrames({ sheet: enemyBomberDestroySheet, frameW: enemyBomberBase.source.width })
            }
        } as const satisfies RunAssets['enemy'];

        const boss = {
            dreadnought: {
                base: bossDreadnoughtBase,
                baseOpaqueDiameterPx: dreadnoughtMask.diameterPx,
                baseAlphaMask: dreadnoughtMask.mask,
                destructionFrames: buildSheetFrames({ sheet: bossDreadnoughtDestroySheet, frameW: bossDreadnoughtBase.source.width })
            }
        } as const satisfies RunAssets['boss'];

        runAssets = {
            shipFull,
            shipSlight,
            shipDamaged,
            shipVeryDamaged,
            asteroidBase,
            asteroidBaseOpaqueDiameterPx,
            asteroidBaseAlphaMask: asteroidMask.mask,
            asteroidExplodeFrames,
            enemy,
            boss
        };
        return runAssets;
    })();

    return runAssetsPromise;
}


