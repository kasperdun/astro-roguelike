import type { Container, Graphics } from 'pixi.js';
import type { EnemyKind } from '../../enemies/enemyCatalog';

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
    /** Angular velocity (rad/s). 0 means no rotation. */
    spinRadPerSec: number;
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
    fireCooldownLeft: number;
    /** Stable per-enemy seed used to diversify movement/aim patterns. */
    seed: number;
};

export type PickupKind = 'minerals' | 'scrap' | 'fuel' | 'health' | 'magnet';

export type Pickup = {
    g: Graphics;
    kind: PickupKind;
    amount: number;
    vx: number;
    vy: number;
    r: number;
};


