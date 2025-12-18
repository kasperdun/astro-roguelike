import { gsap } from 'gsap';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore, type LevelId } from '../../state/gameStore';
import { deriveEconomyStats } from '../../progression/upgrades';
import type { Scene } from '../core/Scene';
import { spawnAsteroidExplosion, spawnExplosion } from './run/runEffects';
import { installRunInput } from './run/runInput';
import { createRunHudView, hookRunHud, type RunHudView } from './run/runHud';
import { circleHit, clampDt } from './run/runMath';
import type { Asteroid, Bullet, Enemy, EnemyBullet, Pickup, PickupKind } from './run/runTypes';
import { applyAsteroidSpriteSize, createAsteroid, createEnemy, createPickup } from './run/runSpawn';
import { resolveBulletAsteroidCollisions, updateAsteroids, updateBullets, updatePickups } from './run/runUpdateSystems';
import { advanceShipKinematics } from './run/runShipKinematics';
import { audio } from '../../audio/audio';
import { getRunAssets, preloadRunAssets, type RunAssets } from '../runAssets';
import {
  resolveBulletEnemyCollisions,
  resolveEnemyBulletShipCollisions,
  resolveShipEnemyCollisions,
  updateEnemiesAndFire,
  updateEnemyBullets
} from './run/runEnemySystems';

type ShipDamageStage = 'full' | 'slight' | 'damaged' | 'very_damaged';

export class RunScene implements Scene {
  public readonly id = 'run' as const;

  private readonly root = new Container();
  private readonly world = new Container();
  private readonly hud = new Container();

  private readonly ship = new Sprite();
  private hudView: RunHudView | null = null;
  private runAssets: RunAssets | null = null;

  private levelId: LevelId = 1;
  private width = 1;
  private height = 1;

  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private pickups: Pickup[] = [];
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];

  private shipVx = 0;
  private shipVy = 0;
  /** Aim angle in world-space (0 = right). Used for shooting, independent from sprite rotation offset. */
  private shipAimRad = 0;
  private shipInvulnLeft = 0;
  private fireCooldownLeft = 0;
  private isWarpingIn = false;
  private shieldRegenBlockedLeft = 0;
  private shipStage: ShipDamageStage = 'full';

  private spawnTimerLeft = 0;
  private enemySpawnTimerLeft = 0;
  private enemiesKilled = 0;
  private runTimeSec = 0;

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

    this.hudView = createRunHudView();
    this.hud.addChild(this.hudView.root);
    this.hudView.setScreenSize(this.width, this.height);

    // Important: mount() can be called before GameHost triggers resizeToContainer().
    // If we start warp-in with width/height still at defaults (1x1), the "center"
    // becomes top-left-ish. Sync to current renderer size first.
    this.resize(this.app.renderer.width, this.app.renderer.height);

    // Kick off asset loading; once ready, we'll swap textures on the already-created sprites.
    void preloadRunAssets().then((assets) => {
      this.runAssets = assets;

      // Update ship texture according to current HP immediately.
      const run = useGameStore.getState().run;
      if (run) this.syncShipTextureFromHp(run.hp, run.maxHp, true);

      // Update existing asteroids spawned before assets were ready.
      for (const a of this.asteroids) {
        if (a.g instanceof Sprite) {
          a.g.texture = assets.asteroidBase;
          applyAsteroidSpriteSize(a.g, a.r, assets);
        }
      }
    });

    this.buildShip();
    this.buildInitialAsteroids();
    this.warpIn();
    this.unsubStore = hookRunHud({ hud: this.hudView, getLevelId: () => this.levelId });
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
    this.enemies = [];
    this.enemyBullets = [];
    this.shipVx = 0;
    this.shipVy = 0;
    this.shipInvulnLeft = 0;
    this.fireCooldownLeft = 0;
    this.isWarpingIn = false;
    this.spawnTimerLeft = 0;
    this.enemySpawnTimerLeft = 0;
    this.enemiesKilled = 0;
    this.runTimeSec = 0;
    this.world.removeChildren();
    this.hud.removeChildren();
    this.hudView?.destroy();
    this.hudView = null;
    this.root.removeChildren();
    this.app.stage.removeChild(this.root);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.hudView?.setScreenSize(width, height);
  }

  private buildShip() {
    this.ship.anchor.set(0.5);
    this.ship.rotation = 0;
    this.shipStage = 'full';
    this.ship.texture = this.runAssets?.shipFull ?? getRunAssets()?.shipFull ?? Texture.EMPTY;
    this.applyShipVisualSize();

    this.ship.x = this.width / 2;
    this.ship.y = this.height / 2;
    this.ship.alpha = 1;
  }

  private applyShipVisualSize() {
    // Make the sprite readable while keeping collisions governed by GAME_CONFIG.shipCollisionRadiusPx.
    const base = GAME_CONFIG.shipCollisionRadiusPx * 3.2;
    const tex = this.ship.texture;
    const tw = tex.width;
    const th = tex.height;
    if (tw > 1 && th > 1) {
      this.ship.width = base;
      this.ship.height = (base * th) / tw;
    } else {
      // Texture not ready yet; apply a reasonable square placeholder size.
      this.ship.width = base;
      this.ship.height = base;
    }
  }

  private syncShipTextureFromHp(hp: number, maxHp: number, force = false) {
    const assets = this.runAssets ?? getRunAssets();
    if (!assets) return;

    const max = Math.max(0.0001, maxHp);
    const ratio = hp / max;
    const next: ShipDamageStage =
      ratio < 0.25 ? 'very_damaged' : ratio < 0.5 ? 'damaged' : ratio < 0.8 ? 'slight' : 'full';

    if (!force && next === this.shipStage) return;
    this.shipStage = next;

    this.ship.texture =
      next === 'full'
        ? assets.shipFull
        : next === 'slight'
          ? assets.shipSlight
          : next === 'damaged'
            ? assets.shipDamaged
            : assets.shipVeryDamaged;
    this.applyShipVisualSize();
  }

  private buildInitialAsteroids() {
    // clear previous
    this.asteroids.forEach((a) => this.world.removeChild(a.g));
    this.asteroids = [];

    const count = GAME_CONFIG.asteroidsInitialCount;
    for (let i = 0; i < count; i++) this.spawnAsteroid({ avoidShip: true });

    this.spawnTimerLeft = GAME_CONFIG.asteroidsSpawnIntervalSec;

    // Enemies come a bit later; reset combat director state.
    this.enemies.forEach((e) => this.world.removeChild(e.g));
    this.enemies = [];
    this.enemyBullets.forEach((b) => this.world.removeChild(b.g));
    this.enemyBullets = [];
    this.enemiesKilled = 0;
    this.runTimeSec = 0;
    this.enemySpawnTimerLeft = GAME_CONFIG.enemiesSpawnStartAfterSec;
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

    this.syncShipTextureFromHp(run.hp, run.maxHp);

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
    this.shipAimRad = nextVel.aimRad;

    // timers
    this.shipInvulnLeft = Math.max(0, this.shipInvulnLeft - dt);
    this.fireCooldownLeft = Math.max(0, this.fireCooldownLeft - dt);
    this.shieldRegenBlockedLeft = Math.max(0, this.shieldRegenBlockedLeft - dt);
    this.runTimeSec += dt;

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

    // spawn enemies over time (accelerates with kill count)
    this.enemySpawnTimerLeft -= dt;
    if (this.enemySpawnTimerLeft <= 0) {
      if (this.enemies.length < GAME_CONFIG.enemiesMaxCount) {
        this.spawnEnemy({ avoidShip: true });
        this.enemySpawnTimerLeft = this.computeEnemySpawnIntervalSec();
      } else {
        // If capped, retry soon.
        this.enemySpawnTimerLeft = 0.5;
      }
    }

    const shipX = this.ship.x;
    const shipY = this.ship.y;
    updateBullets({ bullets: this.bullets, world: this.world, dt, width: this.width, height: this.height });
    updateEnemyBullets({ bullets: this.enemyBullets, world: this.world, dt, width: this.width, height: this.height });
    updateAsteroids({ asteroids: this.asteroids, dt, width: this.width, height: this.height });
    updateEnemiesAndFire({
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      world: this.world,
      dt,
      width: this.width,
      height: this.height,
      shipX,
      shipY,
      allowFire: !this.isWarpingIn
    });
    updatePickups({
      pickups: this.pickups,
      world: this.world,
      dt,
      width: this.width,
      height: this.height,
      shipX,
      shipY,
      onCollectMinerals: (amount) => store.addMinerals(amount),
      onCollectScrap: (amount) => store.addScrap(amount),
      onCollect: () => audio.playPickupPop()
    });

    resolveBulletEnemyCollisions({
      bullets: this.bullets,
      enemies: this.enemies,
      world: this.world,
      bulletDamage: stats.bulletDamage,
      onBulletHit: () => audio.playHit(),
      onEnemyDestroyed: (index) => this.destroyEnemy(index)
    });
    resolveBulletAsteroidCollisions({
      bullets: this.bullets,
      asteroids: this.asteroids,
      world: this.world,
      bulletDamage: stats.bulletDamage,
      onBulletHit: () => audio.playHit(),
      onAsteroidDestroyed: (index) => this.destroyAsteroid(index)
    });

    // collision: enemy bullets → ship (with invuln)
    if (!this.isWarpingIn && this.shipInvulnLeft <= 0) {
      resolveEnemyBulletShipCollisions({
        bullets: this.enemyBullets,
        world: this.world,
        shipX,
        shipY,
        shipR: GAME_CONFIG.shipCollisionRadiusPx,
        onShipHit: () => {
          this.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
          this.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
          store.applyDamageToShip(GAME_CONFIG.enemyBulletDamage * stats.collisionDamageMultiplier);
          audio.playHit();
        }
      });
      if (!useGameStore.getState().run) return;
    }

    // collision: ship vs enemies (with invuln)
    if (!this.isWarpingIn && this.shipInvulnLeft <= 0) {
      resolveShipEnemyCollisions({
        enemies: this.enemies,
        shipX,
        shipY,
        shipR: GAME_CONFIG.shipCollisionRadiusPx,
        onShipHit: () => {
          this.shipInvulnLeft = GAME_CONFIG.shipInvulnAfterHitSec;
          this.shieldRegenBlockedLeft = stats.shieldRegenDelaySec;
          store.applyDamageToShip(GAME_CONFIG.enemyCollisionDamage * stats.collisionDamageMultiplier);
          audio.playHit();
        },
        onPushOut: (nx, ny, overlap) => {
          this.ship.x += nx * overlap;
          this.ship.y += ny * overlap;
          this.shipVx += nx * 140;
          this.shipVy += ny * 140;
        }
      });
      if (!useGameStore.getState().run) return;
    }

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

    audio.playLaser();

    const dirX = Math.cos(this.shipAimRad);
    const dirY = Math.sin(this.shipAimRad);

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

  private spawnEnemy(args: { avoidShip: boolean }) {
    const e = createEnemy({
      width: this.width,
      height: this.height,
      shipX: this.ship.x,
      shipY: this.ship.y,
      avoidShip: args.avoidShip
    });
    this.world.addChild(e.g);
    this.enemies.push(e);
  }

  private computeEnemySpawnIntervalSec(): number {
    const base =
      GAME_CONFIG.enemiesSpawnIntervalSec - this.enemiesKilled * GAME_CONFIG.enemiesSpawnIntervalReducePerKillSec;
    return Math.max(GAME_CONFIG.enemiesSpawnIntervalMinSec, base);
  }

  private destroyAsteroid(index: number) {
    const a = this.asteroids[index];
    if (!a) return;

    this.asteroids.splice(index, 1);
    this.world.removeChild(a.g);

    audio.playAsteroidDead();
    spawnAsteroidExplosion(this.world, a.g.x, a.g.y, a.r);

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

  private destroyEnemy(index: number) {
    const e = this.enemies[index];
    if (!e) return;

    this.enemies.splice(index, 1);
    this.world.removeChild(e.g);
    this.enemiesKilled++;

    // Small feedback loop: kills speed up enemy spawns a bit (director).
    this.enemySpawnTimerLeft = Math.min(this.enemySpawnTimerLeft, this.computeEnemySpawnIntervalSec());

    audio.playHit();
    spawnExplosion(this.world, e.g.x, e.g.y, e.r);

    const purchased = useGameStore.getState().purchasedUpgrades;
    const economy = deriveEconomyStats(purchased);
    const count = Math.max(0, GAME_CONFIG.enemyDropMineralsPerEnemy + economy.asteroidMineralYieldBonus);
    for (let i = 0; i < count; i++) {
      this.spawnPickup('minerals', 1, e.g.x, e.g.y);
    }

    if (Math.random() < GAME_CONFIG.enemyDropScrapChance) {
      this.spawnPickup('scrap', GAME_CONFIG.enemyDropScrapAmount, e.g.x, e.g.y);
    }
  }

  private spawnPickup(kind: PickupKind, amount: number, x: number, y: number) {
    const p = createPickup(kind, amount, x, y);
    this.world.addChild(p.g);
    this.pickups.push(p);
  }
}
