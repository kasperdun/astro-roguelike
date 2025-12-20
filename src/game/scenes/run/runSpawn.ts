import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { getEnemyDef, type EnemyKind } from '../../enemies/enemyCatalog';
import { getRunAssets, preloadRunAssets, type RunAssets } from '../../runAssets';
import { lerp, lerp01, randInt, rotate } from './runMath';
import type { Asteroid, Enemy, EnemyBullet, Pickup, PickupKind } from './runTypes';
import { audio } from '../../../audio/audio';

// Kick off asset loading as early as possible (safe to call multiple times).
void preloadRunAssets();

export function applyAsteroidSpriteSize(sprite: Sprite, r: number, assets: RunAssets) {
    // We want the collision radius `r` to match the *opaque* (non-transparent) part of the PNG,
    // not the full texture size including padding/transparent background.
    const desiredDiameter = r * 2;
    const baseDiameter = Math.max(1, assets.asteroidBaseOpaqueDiameterPx);
    const s = desiredDiameter / baseDiameter;
    sprite.scale.set(s);
}

function enemyRadiusFromTexture(args: { assets: RunAssets; kind: EnemyKind; spriteScale: number }): number {
    const baseDiameter = Math.max(1, args.assets.enemy[args.kind].baseOpaqueDiameterPx);
    const scaledDiameter = baseDiameter * Math.max(0.001, args.spriteScale);
    return scaledDiameter / 2;
}

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

    const assets = getRunAssets();
    const baseTex = assets?.asteroidBase ?? Texture.EMPTY;
    const g = new Sprite(baseTex);
    g.anchor.set(0.5);
    if (assets) {
        applyAsteroidSpriteSize(g, r, assets);
    } else {
        // Assets not ready yet; apply a reasonable fallback so something is visible once texture arrives.
        g.width = r * 2;
        g.height = r * 2;
    }

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
    const r = 6;
    const g = new Graphics();
    let color;
    switch (kind) {
        case 'minerals':
            color = 0x7fd6ff;
            break;
        case 'scrap':
            color = 0xffd37f;
            break;
        case 'health':
            color = 0x7cff7c;
            break;
        case 'magnet':
            color = 0xb68cff;
            break;
        default:
            color = 0x9b6b33;
    }
    g.circle(0, 0, r).fill({ color, alpha: 0.95 });
    g.x = x + (Math.random() - 0.5) * 14;
    g.y = y + (Math.random() - 0.5) * 14;

    const ang = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 70;
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;

    return { g, kind, amount, vx, vy, r };
}

export function createEnemy(args: { width: number; height: number; shipX: number; shipY: number; avoidShip: boolean }): Enemy {
    // Back-compat overload: default to fighter if caller hasn't been updated yet.
    return createEnemyWithKind({ ...args, kind: 'fighter' });
}

export function createEnemyWithKind(args: {
    kind: EnemyKind;
    width: number;
    height: number;
    shipX: number;
    shipY: number;
    avoidShip: boolean;
}): Enemy {
    const { kind, width, height, shipX, shipY, avoidShip } = args;

    const def = getEnemyDef(kind);
    const assets = getRunAssets();
    // Collision size should be based on the sprite's opaque bounds (ignore transparent padding), like asteroids.
    // When assets aren't ready yet, fall back to a config-driven radius so gameplay still works.
    const r = assets ? enemyRadiusFromTexture({ assets, kind, spriteScale: def.spriteScale }) : def.stats.radiusPx;

    let g: Container;
    if (assets) {
        const sprite = new Sprite(assets.enemy[kind].base);
        sprite.anchor.set(0.5);
        sprite.scale.set(def.spriteScale);
        g = sprite;
    } else {
        // Assets not ready yet; show a simple placeholder.
        const ph = new Graphics();
        ph.moveTo(0, -r)
            .lineTo(r * 0.8, r * 0.9)
            .lineTo(0, r * 0.45)
            .lineTo(-r * 0.8, r * 0.9)
            .closePath()
            .fill({ color: 0xff7c7c, alpha: 0.95 })
            .stroke({ color: 0x3a0f18, width: 2, alpha: 0.9 });
        g = ph;
    }

    // Spawn strictly outside the visible screen so enemies "fly in" instead of popping in.
    const spawnMargin = 24;
    const side = randInt(0, 3);
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

    // Choose a random point inside the screen to ensure it enters the view.
    let tx = Math.random() * Math.max(1, width);
    let ty = Math.random() * Math.max(1, height);
    if (avoidShip) {
        const minDist = 170;
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

    // Small random angular jitter so paths vary.
    const jitterRad = ((Math.random() * 2 - 1) * 22 * Math.PI) / 180;
    const j = rotate(dirX, dirY, jitterRad);
    dirX = j.x;
    dirY = j.y;

    const speed = Math.min(def.stats.maxSpeedPxPerSec, def.stats.maxSpeedPxPerSec * (0.55 + Math.random() * 0.35));
    const vx = dirX * speed;
    const vy = dirY * speed;

    g.x = x;
    g.y = y;

    const seed = Math.random();
    const fireCooldownLeft = 0.6 + seed * 0.6;

    return { g, kind, vx, vy, r, hp: def.stats.hp, fireCooldownLeft, seed };
}

export function createEnemyBullet(args: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    life: number;
    damage: number;
}): EnemyBullet {
    const g = new Graphics();
    g.circle(0, 0, args.r).fill({ color: 0xffc0c0, alpha: 0.98 });
    g.x = args.x;
    g.y = args.y;
    audio.playEnemyShoot();
    return {
        g,
        vx: args.vx,
        vy: args.vy,
        r: args.r,
        life: args.life,
        damage: args.damage
    };
}


