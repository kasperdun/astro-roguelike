import type { Container, Graphics } from 'pixi.js';
import type { EnemyKind } from '../../enemies/enemyCatalog';
import type { BossKind } from '../../boss/bossCatalog';

export type Projectile = {
    g: Graphics;
    vx: number;
    vy: number;
    r: number;
    life: number;
};

export type Asteroid = {
    g: Container;
    vx: number;
    vy: number;
    r: number;
    hp: number;
    maxHp: number;
    /** Angular velocity (rad/s). 0 means no rotation. */
    spinRadPerSec: number;

    /** World-space HP bar (separate Graphics so it doesn't inherit asteroid rotation). */
    hpBar: Graphics;
    /** HP bar is hidden until the asteroid receives damage at least once. */
    hpBarVisible: boolean;
};

export type Bullet = Projectile;
export type EnemyBullet = Projectile & {
    damage: number;
};

export type Enemy = {
    g: Container;
    kind: EnemyKind;
    vx: number;
    vy: number;
    r: number;
    hp: number;
    maxHp: number;
    fireCooldownLeft: number;
    /** Stable per-enemy seed used to diversify movement/aim patterns. */
    seed: number;

    /** World-space HP bar (separate Graphics so it doesn't inherit enemy rotation). */
    hpBar: Graphics;
    /** HP bar is hidden until the enemy receives damage at least once. */
    hpBarVisible: boolean;
};

export type Boss = {
    g: Container;
    kind: BossKind;
    vx: number;
    vy: number;
    r: number;
    hp: number;
    maxHp: number;
    mode: 'aimed' | 'fan' | 'ring';
    modeTimeLeft: number;
    burstShotsLeft: number;
    burstShotTimerLeft: number;
    aimedCooldownLeft: number;
    ringTelegraphLeft: number;
    seed: number;
};

export type PickupKind = 'minerals' | 'scrap' | 'fuel' | 'health' | 'magnet' | 'core';

export type Pickup = {
    g: Graphics;
    kind: PickupKind;
    amount: number;
    vx: number;
    vy: number;
    r: number;
};


