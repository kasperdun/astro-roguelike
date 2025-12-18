import type { Graphics } from 'pixi.js';

export type Asteroid = {
  g: Graphics;
  vx: number;
  vy: number;
  r: number;
  hp: number;
};

export type Bullet = {
  g: Graphics;
  vx: number;
  vy: number;
  r: number;
  life: number;
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


