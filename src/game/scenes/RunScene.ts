import { gsap } from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useGameStore, type LevelId } from '../../state/gameStore';
import { deriveEconomyStats } from '../../progression/upgrades';
import type { Scene } from '../core/Scene';

type Asteroid = {
  g: Graphics;
  vx: number;
  vy: number;
  r: number;
  hp: number;
};

type Bullet = {
  g: Graphics;
  vx: number;
  vy: number;
  r: number;
  life: number;
};

type PickupKind = 'minerals' | 'scrap';
type Pickup = {
  g: Graphics;
  kind: PickupKind;
  amount: number;
  vx: number;
  vy: number;
  r: number;
};

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
    this.hookHud();
    this.installInput();

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

  private hookHud() {
    const renderHud = () => {
      const state = useGameStore.getState();
      const run = state.run;

      if (!run) {
        this.hudText.text = `LEVEL ${this.levelId}\n(no session)`;
        return;
      }

      this.hudText.text =
        `LEVEL ${run.levelId}\n` +
        `HP: ${Math.round(run.hp)}/${Math.round(run.maxHp)}\n` +
        `SHIELD: ${Math.round(run.shield)}/${Math.round(run.maxShield)}\n` +
        `FUEL: ${Math.round(run.fuel)}/${Math.round(run.maxFuel)}\n` +
        `MINERALS: ${run.minerals}\n` +
        `SCRAP: ${run.scrap}\n\n` +
        `WASD: thrust (inertia)\n` +
        `LMB: shoot\n` +
        `ESC: back to menu`;
    };

    renderHud();
    this.unsubStore = useGameStore.subscribe(() => renderHud());
  }

  private installInput() {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.code === 'Escape' && down) {
        useGameStore.getState().endRunToMenu();
        return;
      }

      // Use physical key codes so WASD works on any keyboard layout.
      if (e.code === 'KeyW') this.input.w = down;
      if (e.code === 'KeyA') this.input.a = down;
      if (e.code === 'KeyS') this.input.s = down;
      if (e.code === 'KeyD') this.input.d = down;
    };

    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.input.firing = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.input.firing = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      // We want right-click available for future controls; avoid browser menu.
      e.preventDefault();
    };

    const onBlur = () => {
      this.input.w = false;
      this.input.a = false;
      this.input.s = false;
      this.input.d = false;
      this.input.firing = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onBlur);

    this.unsubInput = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onBlur);
    };
  }

  private update(dt: number) {
    const store = useGameStore.getState();
    const run = store.run;
    if (!run) return;
    const stats = run.stats;

    // aim: rotate ship towards cursor
    const mp = this.app.renderer.events.pointer.global;
    const dxAim = mp.x - this.ship.x;
    const dyAim = mp.y - this.ship.y;
    this.ship.rotation = Math.atan2(dyAim, dxAim);

    // fuel drain
    const isThrust = this.input.w || this.input.a || this.input.s || this.input.d;
    const drain = (stats.fuelDrainPerSec + (isThrust ? stats.fuelDrainWhileThrustPerSec : 0)) * dt;
    const regen = stats.fuelRegenPerSec * dt;
    const net = drain - regen;
    if (net > 0) store.consumeFuel(net);
    else if (net < 0) store.addFuel(-net);
    if (!useGameStore.getState().run) return; // could end the run

    // ship movement (WASD -> acceleration with inertia)
    const axRaw = (this.input.d ? 1 : 0) - (this.input.a ? 1 : 0);
    const ayRaw = (this.input.s ? 1 : 0) - (this.input.w ? 1 : 0);
    let ax = axRaw;
    let ay = ayRaw;
    const len = Math.hypot(ax, ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
    }

    this.shipVx += ax * stats.shipAccelPxPerSec2 * dt;
    this.shipVy += ay * stats.shipAccelPxPerSec2 * dt;

    // damping (exponential)
    const damp = Math.exp(-GAME_CONFIG.shipDampingPerSec * dt);
    this.shipVx *= damp;
    this.shipVy *= damp;

    // clamp speed
    const sp = Math.hypot(this.shipVx, this.shipVy);
    if (sp > stats.shipMaxSpeedPxPerSec) {
      const k = stats.shipMaxSpeedPxPerSec / sp;
      this.shipVx *= k;
      this.shipVy *= k;
    }

    this.ship.x += this.shipVx * dt;
    this.ship.y += this.shipVy * dt;
    wrap(this.ship, this.width, this.height, GAME_CONFIG.shipCollisionRadiusPx);

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

    // update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b) continue;
      b.life -= dt;
      if (b.life <= 0) {
        this.world.removeChild(b.g);
        this.bullets.splice(i, 1);
        continue;
      }
      b.g.x += b.vx * dt;
      b.g.y += b.vy * dt;
      wrap(b.g, this.width, this.height, b.r);
    }

    // update asteroids drift
    for (const a of this.asteroids) {
      a.g.x += a.vx * dt;
      a.g.y += a.vy * dt;
      wrap(a.g, this.width, this.height, a.r);
    }

    // update pickups (magnet)
    const shipX = this.ship.x;
    const shipY = this.ship.y;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (!p) continue;
      const dx = shipX - p.g.x;
      const dy = shipY - p.g.y;
      const d = Math.hypot(dx, dy);

      if (d <= GAME_CONFIG.shipCollisionRadiusPx + p.r + 2) {
        if (p.kind === 'minerals') store.addMinerals(p.amount);
        else store.addScrap(p.amount);
        this.world.removeChild(p.g);
        this.pickups.splice(i, 1);
        continue;
      }

      if (d > 0 && d < GAME_CONFIG.pickupMagnetRadiusPx) {
        const nx = dx / d;
        const ny = dy / d;
        p.vx += nx * GAME_CONFIG.pickupMagnetAccelPxPerSec2 * dt;
        p.vy += ny * GAME_CONFIG.pickupMagnetAccelPxPerSec2 * dt;
      }

      const pd = Math.exp(-GAME_CONFIG.pickupDampingPerSec * dt);
      p.vx *= pd;
      p.vy *= pd;

      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      wrap(p.g, this.width, this.height, p.r);
    }

    // collisions: bullets vs asteroids
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (!b) continue;
      let hit = false;
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (!a) continue;
        if (!circleHit(b.g.x, b.g.y, b.r, a.g.x, a.g.y, a.r)) continue;

        // bullet consumed
        this.world.removeChild(b.g);
        this.bullets.splice(bi, 1);
        hit = true;

        a.hp -= stats.bulletDamage;
        flashAsteroid(a.g);

        // "Soft" kinetic response:
        // - add a small delta-v in bullet direction (steering, not hard reversal)
        // - reduce asteroid speed a bit on each hit
        // - preserve forward motion so one hit can't flip direction instantly
        {
          const prevVx = a.vx;
          const prevVy = a.vy;
          const prevSpeed = Math.hypot(prevVx, prevVy);

          // Forward direction is current velocity direction (or bullet direction if nearly stopped).
          let fwdX = prevVx;
          let fwdY = prevVy;
          const fwdLen = Math.hypot(fwdX, fwdY);
          if (fwdLen > 1e-6) {
            fwdX /= fwdLen;
            fwdY /= fwdLen;
          } else {
            const bLen = Math.hypot(b.vx, b.vy) || 1;
            fwdX = b.vx / bLen;
            fwdY = b.vy / bLen;
          }

          // Bullet direction (unit).
          const bLen = Math.hypot(b.vx, b.vy) || 1;
          const bDirX = b.vx / bLen;
          const bDirY = b.vy / bLen;

          // Mass proxy: larger asteroids react less.
          const massScale = Math.max(0.75, a.r / GAME_CONFIG.asteroidMinRadiusPx);

          // Delta-v magnitude scales with bullet speed and config factor, damped by mass.
          const dV = (bLen * GAME_CONFIG.bulletAsteroidImpulseFactor) / massScale;
          a.vx += bDirX * dV;
          a.vy += bDirY * dV;

          // Speed loss on hit (simulates momentum absorption / fragmentation).
          const loss = lerp01(GAME_CONFIG.bulletAsteroidHitSpeedLossFactor);
          a.vx *= 1 - loss;
          a.vy *= 1 - loss;

          // Prevent instant "direction flip": keep forward component above a fraction of previous speed.
          if (prevSpeed > 1e-3) {
            const minForward = prevSpeed * lerp01(GAME_CONFIG.bulletAsteroidMinForwardRetention);
            const forwardNow = a.vx * fwdX + a.vy * fwdY;
            if (forwardNow < minForward) {
              const add = minForward - forwardNow;
              a.vx += fwdX * add;
              a.vy += fwdY * add;
            }
          }

          // Clamp final speed.
          const sp = Math.hypot(a.vx, a.vy);
          const maxSp = GAME_CONFIG.asteroidMaxSpeedAfterHitPxPerSec;
          if (sp > maxSp) {
            const k = maxSp / sp;
            a.vx *= k;
            a.vy *= k;
          }
        }

        if (a.hp <= 0) {
          this.destroyAsteroid(ai);
        }
        break;
      }
      if (hit) continue;
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
    const r =
      GAME_CONFIG.asteroidMinRadiusPx +
      Math.random() * Math.max(0, GAME_CONFIG.asteroidMaxRadiusPx - GAME_CONFIG.asteroidMinRadiusPx);

    const g = new Graphics();
    g.circle(0, 0, r).fill({ color: 0x4e5b73, alpha: 0.92 }).stroke({ color: 0x1b2333, width: 2, alpha: 0.85 });

    // Spawn strictly outside the visible screen so asteroids "fly in" instead of popping in.
    const spawnMargin = 20;
    const side = randInt(0, 3); // 0: left, 1: right, 2: top, 3: bottom
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = -r - spawnMargin;
      y = Math.random() * Math.max(1, this.height);
    } else if (side === 1) {
      x = this.width + r + spawnMargin;
      y = Math.random() * Math.max(1, this.height);
    } else if (side === 2) {
      x = Math.random() * Math.max(1, this.width);
      y = -r - spawnMargin;
    } else {
      x = Math.random() * Math.max(1, this.width);
      y = this.height + r + spawnMargin;
    }

    // Choose a random point inside the screen to ensure it enters the view,
    // while the resulting movement direction still feels "random enough".
    let tx = Math.random() * Math.max(1, this.width);
    let ty = Math.random() * Math.max(1, this.height);
    if (args.avoidShip) {
      const minDist = 160;
      for (let i = 0; i < 24; i++) {
        const dx = tx - this.ship.x;
        const dy = ty - this.ship.y;
        if (Math.hypot(dx, dy) >= minDist) break;
        tx = Math.random() * Math.max(1, this.width);
        ty = Math.random() * Math.max(1, this.height);
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

    this.world.addChild(g);
    this.asteroids.push({ g, vx, vy, r, hp });
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
    const r = kind === 'minerals' ? 6 : 6;
    const g = new Graphics();
    g.circle(0, 0, r).fill({ color: kind === 'minerals' ? 0x7fd6ff : 0xffd37f, alpha: 0.95 });
    g.x = x + (Math.random() - 0.5) * 14;
    g.y = y + (Math.random() - 0.5) * 14;

    const ang = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 70;
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;

    this.world.addChild(g);
    this.pickups.push({ g, kind, amount, vx, vy, r });
  }
}

function clampDt(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return Math.min(dt, 0.05);
}

function wrap(obj: { x: number; y: number }, w: number, h: number, r: number) {
  if (obj.x < -r) obj.x = w + r;
  if (obj.x > w + r) obj.x = -r;
  if (obj.y < -r) obj.y = h + r;
  if (obj.y > h + r) obj.y = -r;
}

function circleHit(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}

function flashAsteroid(g: Graphics) {
  gsap.killTweensOf(g);
  const base = g.alpha;
  gsap.to(g, {
    duration: 0.06,
    alpha: 0.45,
    yoyo: true,
    repeat: 1,
    ease: 'power1.out',
    onComplete: () => {
      g.alpha = base;
    }
  });
}

function spawnExplosion(parent: Container, x: number, y: number, r: number) {
  const g = new Graphics();
  g.x = x;
  g.y = y;
  parent.addChild(g);

  const start = r * 0.25;
  const end = r * 1.25;

  const state = { t: 0 };
  gsap.to(state, {
    duration: 0.22,
    t: 1,
    ease: 'power2.out',
    onUpdate: () => {
      const rr = lerp(start, end, state.t);
      const a = lerp(0.55, 0, state.t);
      g.clear();
      g.circle(0, 0, rr).stroke({ color: 0xe8ecff, alpha: a, width: 2 });
    },
    onComplete: () => {
      parent.removeChild(g);
    }
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(1, t));
}

function randInt(min: number, max: number): number {
  const a = Math.ceil(Math.min(min, max));
  const b = Math.floor(Math.max(min, max));
  return Math.floor(a + Math.random() * (b - a + 1));
}

function rotate(x: number, y: number, rad: number): { x: number; y: number } {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - y * s, y: x * s + y * c };
}

