export type BossKind = 'dreadnought';

export type BossStats = {
    /** Collision radius used by gameplay/collisions (px). */
    radiusPx: number;
    hp: number;
    accelPxPerSec2: number;
    maxSpeedPxPerSec: number;
    dampingPerSec: number;
    preferredRangePx: number;
    rangeHysteresisPx: number;
    collisionDamage: number;

    /** Base aimed-shot fire rate (shots per second). */
    aimedFireRatePerSec: number;
    aimedBulletSpeedPxPerSec: number;
    aimedBulletLifetimeSec: number;
    aimedBulletRadiusPx: number;
    aimedBulletDamage: number;

    /** Fan burst. */
    fanBullets: number;
    fanHalfAngleDeg: number;
    fanBurstCount: number;
    fanBurstIntervalSec: number;
    fanBulletSpeedPxPerSec: number;
    fanBulletLifetimeSec: number;
    fanBulletRadiusPx: number;
    fanBulletDamage: number;

    /** Ring burst. */
    ringBullets: number;
    ringTelegraphSec: number;
    ringBulletSpeedPxPerSec: number;
    ringBulletLifetimeSec: number;
    ringBulletRadiusPx: number;
    ringBulletDamage: number;
};

export type BossDef = {
    kind: BossKind;
    displayName: string;
    /**
     * Visual size multiplier.
     * 1.0 means "use the base sprite's opaque bounds as-is".
     */
    spriteScale: number;
    stats: BossStats;
};

export const BOSS_DEFS: Record<BossKind, BossDef> = {
    dreadnought: {
        kind: 'dreadnought',
        displayName: 'Dreadnought',
        spriteScale: 1.0,
        stats: {
            radiusPx: 46,
            hp: 1800,
            accelPxPerSec2: 220,
            maxSpeedPxPerSec: 68,
            dampingPerSec: 1.8,
            preferredRangePx: 260,
            rangeHysteresisPx: 55,
            collisionDamage: 220,

            aimedFireRatePerSec: 0.75,
            aimedBulletSpeedPxPerSec: 260,
            aimedBulletLifetimeSec: 2.2,
            aimedBulletRadiusPx: 4,
            aimedBulletDamage: 82,

            fanBullets: 9,
            fanHalfAngleDeg: 26,
            fanBurstCount: 3,
            fanBurstIntervalSec: 0.42,
            fanBulletSpeedPxPerSec: 235,
            fanBulletLifetimeSec: 2.0,
            fanBulletRadiusPx: 3.5,
            fanBulletDamage: 58,

            ringBullets: 18,
            ringTelegraphSec: 0.55,
            ringBulletSpeedPxPerSec: 210,
            ringBulletLifetimeSec: 2.4,
            ringBulletRadiusPx: 3.5,
            ringBulletDamage: 44
        }
    }
};

export function getBossDef(kind: BossKind): BossDef {
    return BOSS_DEFS[kind];
}


