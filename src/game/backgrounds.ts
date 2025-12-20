import { Assets } from 'pixi.js';
import type { Texture, TilingSprite } from 'pixi.js';
import { assetUrl } from './assetUrl';

type BackgroundUrl = string;

const BACKGROUND_URLS: readonly BackgroundUrl[] = Object.freeze([
    assetUrl('Backgrounds/Blue_Nebula_01-1024x1024.png'),
    assetUrl('Backgrounds/Blue_Nebula_02-1024x1024.png'),
    assetUrl('Backgrounds/Blue_Nebula_03-1024x1024.png'),
    assetUrl('Backgrounds/Blue_Nebula_05-1024x1024.png'),
    assetUrl('Backgrounds/Green_Nebula_02-1024x1024.png'),
    assetUrl('Backgrounds/Green_Nebula_05-1024x1024.png'),
    assetUrl('Backgrounds/Purple_Nebula_01-1024x1024.png'),
    assetUrl('Backgrounds/Purple_Nebula_05-1024x1024.png')
]);

export function pickRandomBackgroundUrl(rng: () => number = Math.random): BackgroundUrl | null {
    if (BACKGROUND_URLS.length === 0) return null;
    const i = Math.floor(rng() * BACKGROUND_URLS.length);
    return BACKGROUND_URLS[i] ?? null;
}

const backgroundTexturePromiseByUrl = new Map<BackgroundUrl, Promise<Texture>>();

export function loadBackgroundTexture(url: BackgroundUrl): Promise<Texture> {
    const existing = backgroundTexturePromiseByUrl.get(url);
    if (existing) return existing;

    const p = Assets.load<Texture>(url);
    backgroundTexturePromiseByUrl.set(url, p);
    return p;
}

export function pickRandomBackgroundTexture(rng: () => number = Math.random): Promise<Texture | null> {
    const url = pickRandomBackgroundUrl(rng);
    if (!url) return Promise.resolve(null);
    return loadBackgroundTexture(url);
}

/**
 * Fills the target rect by repeating the texture (no stretching). Background images are expected to be seamless.
 */
export function layoutTilingBackground(bg: TilingSprite, width: number, height: number) {
    bg.x = 0;
    bg.y = 0;
    bg.width = width;
    bg.height = height;
}


