import type { Container, Graphics } from 'pixi.js';

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
};

export type Bullet = Projectile;
export type EnemyBullet = Projectile;

export type Enemy = {
  g: Graphics;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  fireCooldownLeft: number;
  /** Stable per-enemy seed used to diversify movement/aim patterns. */
  seed: number;
};

export type PickupKind = 'minerals' | 'scrap';

export type Pickup = {
  g: Graphics;
  kind: PickupKind;
  amount: number;
  vx: number;
  vy: number;
  r: number;
};


