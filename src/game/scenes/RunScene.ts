import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore, type LevelId } from '../../state/gameStore';
import { deriveEconomyStats } from '../../progression/upgrades';
import type { Scene } from '../core/Scene';
import { flashAsteroid, spawnExplosion } from './run/runEffects';
import { installRunInput } from './run/runInput';
import { hookRunHud } from './run/runHud';
import { circleHit, clampDt, lerp01, wrap } from './run/runMath';
import type { Asteroid, Bullet, Pickup, PickupKind } from './run/runTypes';
import { createAsteroid, createPickup } from './run/runSpawn';
import { resolveBulletAsteroidCollisions, updateAsteroids, updateBullets, updatePickups } from './run/runUpdateSystems';
import { advanceShipKinematics } from './run/runShipKinematics';

export class RunScene implements Scene {
  public readonly id = 'run' as const;

  private readonly root = new Container();
  private readonly world = new Container();
  private readonly hud = new Container();

  private readonly ship = new Graphics();
  private readonly hudText = new Text({
    text: '',
    style: {
      fill: 0xe8ecff,
      fontSize: 14
    }
  });

  private levelId: LevelId = 1;
  private width = 1;
  private height = 1;

  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private pickups: Pickup[] = [];

  private shipVx = 0;
  private shipVy = 0;
  private shipInvulnLeft = 0;
  private fireCooldownLeft = 0;
  private isWarpingIn = false;
  private shieldRegenBlockedLeft = 0;

  private spawnTimerLeft = 0;

  private input = {
    w: false,
    a: false,
    s: false,
    d: false,
    firing: false
  };

  private tickerFn: ((t: Ticker) => void) | null = null;
  private unsubStore: (() => void) | null = null;
  private unsubInput: (() => void) | null = null;

  public constructor(private readonly app: Application) {}

  public setLevel(levelId: LevelId) {
    this.levelId = levelId;
  }

  mount() {
    // Reset any "stuck" input state from previous run (if keyup/mouseup was missed during scene switch).
    this.input.w = false;
    this.input.a = false;
    this.input.s = false;
    this.input.d = false;
    this.input.firing = false;

    this.root.addChild(this.world);
    this.root.addChild(this.hud);
    this.app.stage.addChild(this.root);

    this.world.addChild(this.ship);
    this.hud.addChild(this.hudText);
    this.hudText.x = 16;
    this.hudText.y = 12;

    // Important: mount() can be called before GameHost triggers resizeToContainer().
    // If we start warp-in with width/height still at defaults (1x1), the "center"
    // becomes top-left-ish. Sync to current renderer size first.
    this.resize(this.app.renderer.width, this.app.renderer.height);

    this.buildShip();
    this.buildInitialAsteroids();
    this.warpIn();
    this.unsubStore = hookRunHud({ hudText: this.hudText, getLevelId: () => this.levelId });
    this.unsubInput = installRunInput({ input: this.input, onEscape: () => useGameStore.getState().endRunToMenu() });

    this.tickerFn = (t) => this.update(clampDt(t.deltaMS / 1000));
    this.app.ticker.add(this.tickerFn);
  }

  unmount() {
    if (this.tickerFn) this.app.ticker.remove(this.tickerFn);
    this.tickerFn = null;

    this.unsubStore?.();
    this.unsubStore = null;

    this.unsubInput?.();
    this.unsubInput = null;

    // Clear input state so next mount can't inherit "held" buttons.
    this.input.w = false;
    this.input.a = false;
    this.input.s = false;
    this.input.d = false;
    this.input.firing = false;

    this.asteroids = [];
    this.bullets = [];
    this.pickups = [];
    this.shipVx = 0;
    this.shipVy = 0;
    this.shipInvulnLeft = 0;
    this.fireCooldownLeft = 0;
    this.isWarpingIn = false;
    this.spawnTimerLeft = 0;
    this.world.removeChildren();
    this.hud.removeChildren();
    this.root.removeChildren();
    this.app.stage.removeChild(this.root);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private buildShip() {
    // simple triangle ship placeholder
    this.ship.clear();
    this.ship
      .moveTo(16, 0)
      .lineTo(-12, 10)
      .lineTo(-8, 0)
      .lineTo(-12, -10)
      .closePath()
      .fill({ color: 0x9cc0ff, alpha: 1 })
      .stroke({ color: 0x203060, width: 2, alpha: 0.9 });

    this.ship.x = this.width / 2;
    this.ship.y = this.height / 2;
    this.ship.rotation = 0;
  }

  private buildInitialAsteroids() {
    // clear previous
    this.asteroids.forEach((a) => this.world.removeChild(a.g));
    this.asteroids = [];

    const count = GAME_CONFIG.asteroidsInitialCount;
    for (let i = 0; i < count; i++) this.spawnAsteroid({ avoidShip: true });

    this.spawnTimerLeft = GAME_CONFIG.asteroidsSpawnIntervalSec;
  }

  private warpIn() {
    // warp-like: start off-screen left, overshoot slightly, settle at center
    const targetX = this.width / 2;
    const targetY = this.height / 2;

    this.isWarpingIn = true;
    // While warping in, ship should not take collision damage.
    this.shipInvulnLeft = Math.max(this.shipInvulnLeft, GAME_CONFIG.warpInDurationSec);
    this.ship.x = -80;
    this.ship.y = targetY;
    this.ship.alpha = 0;

    gsap.killTweensOf(this.ship);
    gsap.to(this.ship, {
      duration: GAME_CONFIG.warpInDurationSec,
      x: targetX,
      y: targetY,
      alpha: 1,
      ease: 'power3.out',
      onComplete: () => {
        this.isWarpingIn = false;
      }
    });
  }

  private update(dt: number) {
    const store = useGameStore.getState();
    const run = store.run;
    if (!run) return;
    const stats = run.stats;

    const mp = this.app.renderer.events.pointer.global;

    // fuel drain
    const isThrust = this.input.w || this.input.a || this.input.s || this.input.d;
    const drain = (stats.fuelDrainPerSec + (isThrust ? stats.fuelDrainWhileThrustPerSec : 0)) * dt;
    const regen = stats.fuelRegenPerSec * dt;
    const net = drain - regen;
    if (net > 0) store.consumeFuel(net);
    else if (net < 0) store.addFuel(-net);
    if (!useGameStore.getState().run) return; // could end the run

    const nextVel = advanceShipKinematics({
      ship: this.ship,
      pointer: mp,
      input: this.input,
      vx: this.shipVx,
      vy: this.shipVy,
      dt,
      stats: { shipAccelPxPerSec2: stats.shipAccelPxPerSec2, shipMaxSpeedPxPerSec: stats.shipMaxSpeedPxPerSec },
      bounds: { width: this.width, height: this.height }
    });
    this.shipVx = nextVel.vx;
    this.shipVy = nextVel.vy;

    // timers
    this.shipInvulnLeft = Math.max(0, this.shipInvulnLeft - dt);
    this.fireCooldownLeft = Math.max(0, this.fireCooldownLeft - dt);
    this.shieldRegenBlockedLeft = Math.max(0, this.shieldRegenBlockedLeft - dt);

    // shield regen (after delay)
    if (run.maxShield > 0 && stats.shieldRegenPerSec > 0 && this.shieldRegenBlockedLeft <= 0) {
      store.addShield(stats.shieldRegenPerSec * dt);
    }

    // shooting
    if (this.input.firing) this.tryFire();

    // spawn asteroids over time
    this.spawnTimerLeft -= dt;
    if (this.spawnTimerLeft <= 0) {
      this.spawnTimerLeft = GAME_CONFIG.asteroidsSpawnIntervalSec;
      if (this.asteroids.length < GAME_CONFIG.asteroidsMaxCount) this.spawnAsteroid({ avoidShip: true });
    }

    const shipX = this.ship.x;
    const shipY = this.ship.y;
    updateBullets({ bullets: this.bullets, world: this.world, dt, width: this.width, height: this.height });
    updateAsteroids({ asteroids: this.asteroids, dt, width: this.width, height: this.height });
    updatePickups({
      pickups: this.pickups,
      world: this.world,
      dt,
      width: this.width,
      height: this.height,
      shipX,
      shipY,
      onCollectMinerals: (amount) => store.addMinerals(amount),
      onCollectScrap: (amount) => store.addScrap(amount)
    });
    resolveBulletAsteroidCollisions({
      bullets: this.bullets,
      asteroids: this.asteroids,
      world: this.world,
      bulletDamage: stats.bulletDamage,
      onAsteroidDestroyed: (index) => this.destroyAsteroid(index)
    });

    // collision: ship vs asteroids (with invuln)
    if (!this.isWarpingIn && this.shipInvulnLeft <= 0) {
      for (const a of this.asteroids) {
        if (!circleHit(shipX, shipY, GAME_CONFIG.shipCollisionRadiusPx, a.g.x, a.g.y, a.r)) continue;

        this.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
        this.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
        store.applyDamageToShip(GAME_CONFIG.asteroidCollisionDamage * stats.collisionDamageMultiplier);

        // simple push-out
        const dx = shipX - a.g.x;
        const dy = shipY - a.g.y;
        const d = Math.hypot(dx, dy) || 1;
        const overlap = GAME_CONFIG.shipCollisionRadiusPx + a.r - d;
        if (overlap > 0) {
          const nx = dx / d;
          const ny = dy / d;
          this.ship.x += nx * overlap;
          this.ship.y += ny * overlap;
          this.shipVx += nx * 120;
          this.shipVy += ny * 120;
        }
        break;
      }
    }
  }

  private tryFire() {
    const store = useGameStore.getState();
    const run = store.run;
    if (!run) return;
    const stats = run.stats;

    if (this.fireCooldownLeft > 0) return;
    if (run.fuel <= 0) return;

    const fireDelay = 1 / Math.max(0.001, stats.weaponFireRatePerSec);
    this.fireCooldownLeft = fireDelay;

    store.consumeFuel(stats.fuelDrainPerShot);
    if (!useGameStore.getState().run) return;

    const dirX = Math.cos(this.ship.rotation);
    const dirY = Math.sin(this.ship.rotation);

    const x = this.ship.x + dirX * GAME_CONFIG.bulletMuzzleOffsetPx;
    const y = this.ship.y + dirY * GAME_CONFIG.bulletMuzzleOffsetPx;

    const g = new Graphics();
    g.circle(0, 0, GAME_CONFIG.bulletRadiusPx).fill({ color: 0xe8ecff, alpha: 1 });
    g.x = x;
    g.y = y;

    const vx = dirX * stats.bulletSpeedPxPerSec + this.shipVx;
    const vy = dirY * stats.bulletSpeedPxPerSec + this.shipVy;

    this.world.addChild(g);
    this.bullets.push({
      g,
      vx,
      vy,
      r: GAME_CONFIG.bulletRadiusPx,
      life: stats.bulletLifetimeSec
    });
  }

  private spawnAsteroid(args: { avoidShip: boolean }) {
    const a = createAsteroid({
      width: this.width,
      height: this.height,
      shipX: this.ship.x,
      shipY: this.ship.y,
      avoidShip: args.avoidShip
    });
    this.world.addChild(a.g);
    this.asteroids.push(a);
  }

  private destroyAsteroid(index: number) {
    const a = this.asteroids[index];
    if (!a) return;

    this.asteroids.splice(index, 1);
    this.world.removeChild(a.g);

    spawnExplosion(this.world, a.g.x, a.g.y, a.r);

    // drop minerals (fixed for easier economy balancing) + upgrade bonuses
    const purchased = useGameStore.getState().purchasedUpgrades;
    const economy = deriveEconomyStats(purchased);
    const count = Math.max(0, GAME_CONFIG.asteroidDropMineralsPerAsteroid + economy.asteroidMineralYieldBonus);
    for (let i = 0; i < count; i++) {
      this.spawnPickup('minerals', 1, a.g.x, a.g.y);
    }

    // drop scrap
    if (Math.random() < GAME_CONFIG.asteroidDropScrapChance) {
      this.spawnPickup('scrap', GAME_CONFIG.asteroidDropScrapAmount, a.g.x, a.g.y);
    }
  }

  private spawnPickup(kind: PickupKind, amount: number, x: number, y: number) {
    const p = createPickup(kind, amount, x, y);
    this.world.addChild(p.g);
    this.pickups.push(p);
  }
}
