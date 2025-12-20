export type EnemyKind = 'scout' | 'fighter' | 'bomber';

export type EnemyStats = {
    /** Collision radius used by gameplay/collisions (px). */
    radiusPx: number;
    hp: number;
    accelPxPerSec2: number;
    maxSpeedPxPerSec: number;
    dampingPerSec: number;
    preferredRangePx: number;
    rangeHysteresisPx: number;
    fireRatePerSec: number;
    bulletSpeedPxPerSec: number;
    bulletLifetimeSec: number;
    bulletRadiusPx: number;
    bulletDamage: number;
    collisionDamage: number;
};

export type EnemyDef = {
    kind: EnemyKind;
    displayName: string;
    /**
     * Visual size multiplier (also affects collision size when assets are loaded).
     * 1.0 means "use the base sprite's opaque bounds as-is".
     */
    spriteScale: number;
    stats: EnemyStats;
};

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
    scout: {
        kind: 'scout',
        displayName: 'Scout',
        spriteScale: 2.0,
        stats: {
            radiusPx: 14,
            hp: 36,
            accelPxPerSec2: 700,
            maxSpeedPxPerSec: 155,
            dampingPerSec: 2.3,
            preferredRangePx: 190,
            rangeHysteresisPx: 35,
            fireRatePerSec: 1.2,
            bulletSpeedPxPerSec: 290,
            bulletLifetimeSec: 1.35,
            bulletRadiusPx: 3,
            bulletDamage: 36,
            collisionDamage: 47
        }
    },
    fighter: {
        kind: 'fighter',
        displayName: 'Fighter',
        spriteScale: 1.0,
        stats: {
            radiusPx: 14,
            hp: 60,
            accelPxPerSec2: 520,
            maxSpeedPxPerSec: 120,
            dampingPerSec: 2.2,
            preferredRangePx: 210,
            rangeHysteresisPx: 35,
            fireRatePerSec: 1.05,
            bulletSpeedPxPerSec: 260,
            bulletLifetimeSec: 1.45,
            bulletRadiusPx: 3,
            bulletDamage: 52,
            collisionDamage: 62
        }
    },
    bomber: {
        kind: 'bomber',
        displayName: 'Bomber',
        spriteScale: 1.0,
        stats: {
            radiusPx: 15,
            hp: 102,
            accelPxPerSec2: 440,
            maxSpeedPxPerSec: 86,
            dampingPerSec: 2.1,
            preferredRangePx: 227,
            rangeHysteresisPx: 35,
            fireRatePerSec: 0.9,
            bulletSpeedPxPerSec: 220,
            bulletLifetimeSec: 1.65,
            bulletRadiusPx: 4,
            bulletDamage: 83,
            collisionDamage: 99
        }
    }
};

export function getEnemyDef(kind: EnemyKind): EnemyDef {
    return ENEMY_DEFS[kind];
}

type Weighted<T extends string> = { item: T; weight: number };

function pickWeighted<T extends string>(items: readonly Weighted<T>[], r01: number): T {
    let sum = 0;
    for (const it of items) sum += Math.max(0, it.weight);
    if (sum <= 0) return items[0]!.item;

    let t = r01 * sum;
    for (const it of items) {
        const w = Math.max(0, it.weight);
        if (t <= w) return it.item;
        t -= w;
    }
    return items[items.length - 1]!.item;
}

/**
 * Simple enemy spawn director.
 *
 * Requirements:
 * - early: only Scout
 * - mid: introduce Fighter
 * - late: introduce Bomber
 *
 * This is intentionally data-driven to make adding more enemies later trivial.
 */
export function pickEnemyKindForSpawn(args: { enemiesKilled: number; runTimeSec: number; rng?: () => number }): EnemyKind {
    const { enemiesKilled, runTimeSec } = args;
    const rng = args.rng ?? Math.random;

    // Stage 0: first ~30s OR until a few kills -> only Scout
    if (runTimeSec < 30 || enemiesKilled < 6) return 'scout';

    // Stage 1: next ~60s OR moderate kills -> mix Scout/Fighter
    if (runTimeSec < 95 || enemiesKilled < 18) {
        return pickWeighted<EnemyKind>(
            [
                { item: 'scout', weight: 0.65 },
                { item: 'fighter', weight: 0.35 }
            ] as const,
            rng()
        );
    }

    // Stage 2+: mix all three, with Bomber appearing but not dominating.
    return pickWeighted<EnemyKind>(
        [
            { item: 'scout', weight: 0.30 },
            { item: 'fighter', weight: 0.48 },
            { item: 'bomber', weight: 0.22 }
        ] as const,
        rng()
    );
}


