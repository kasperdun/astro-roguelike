import type { Application, Container } from 'pixi.js';
import { Sprite } from 'pixi.js';
import { GAME_CONFIG } from '../../../config/gameConfig';
import { createAsteroid, createBossWithKind, createEnemyWithKind, createPickup, applyAsteroidSpriteSize } from './runSpawn';
import type { Asteroid, Boss, Bullet, Enemy, EnemyBullet, Pickup, PickupKind } from './runTypes';
import { RunShipView } from './runShipView';
import { RunPlayerWeapons } from './runPlayerWeapons';
import { getRunAssets, type RunAssets } from '../../runAssets';
import { pickEnemyKindForSpawn } from '../../enemies/enemyCatalog';
import type { LevelId } from '../../../state/gameStore';

export class RunRuntime {
    public width = 1;
    public height = 1;
    public levelId: LevelId = 1;

    public readonly ship = new RunShipView();
    public readonly weapons = new RunPlayerWeapons();

    public asteroids: Asteroid[] = [];
    public bullets: Bullet[] = [];
    public pickups: Pickup[] = [];
    public enemies: Enemy[] = [];
    public enemyBullets: EnemyBullet[] = [];
    public boss: Boss | null = null;
    public bossBullets: EnemyBullet[] = [];
    public bossDefeated = false;
    public victoryTimerLeft = 0;

    public shipVx = 0;
    public shipVy = 0;
    /** Aim angle in world-space (0 = right). Used for shooting, independent from sprite rotation offset. */
    public shipAimRad = 0;
    public shipInvulnLeft = 0;
    public shieldRegenBlockedLeft = 0;
    public pickupVacuumLeft = 0;

    public spawnTimerLeft = 0;
    public enemySpawnTimerLeft = 0;
    public enemiesKilled = 0;
    public runTimeSec = 0;

    public readonly input = { w: false, a: false, s: false, d: false, firing: false };

    public constructor(
        public readonly app: Application,
        public readonly world: Container
    ) { }

    public mount(args: {
        width: number;
        height: number;
        levelId: LevelId;
        asteroidsMaxCount?: number;
        asteroidsSpawnIntervalSec?: number;
    }) {
        this.width = args.width;
        this.height = args.height;
        this.levelId = args.levelId;

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
        this.boss = null;
        this.bossBullets = [];
        this.bossDefeated = false;
        this.victoryTimerLeft = 0;

        this.shipVx = 0;
        this.shipVy = 0;
        this.shipAimRad = 0;
        this.shipInvulnLeft = 0;
        this.shieldRegenBlockedLeft = 0;
        this.pickupVacuumLeft = 0;
        this.weapons.reset();

        this.spawnTimerLeft = 0;
        this.enemySpawnTimerLeft = 0;
        this.enemiesKilled = 0;
        this.runTimeSec = 0;

        this.ship.resetTweens();
        this.ship.build({ width: this.width, height: this.height, assets: getRunAssets() ?? null });
        this.world.addChild(this.ship.sprite);

        // Enemies come a bit later; reset combat director state.
        this.enemySpawnTimerLeft = GAME_CONFIG.enemiesSpawnStartAfterSec;

        this.buildInitialAsteroids({
            maxCount: args.asteroidsMaxCount ?? GAME_CONFIG.asteroidsMaxCount,
            spawnIntervalSec: args.asteroidsSpawnIntervalSec ?? GAME_CONFIG.asteroidsSpawnIntervalSec
        });
        this.warpIn();
    }

    public unmount() {
        this.ship.resetTweens();
        this.world.removeChildren();

        this.asteroids = [];
        this.bullets = [];
        this.pickups = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.boss = null;
        this.bossBullets = [];
        this.bossDefeated = false;
        this.victoryTimerLeft = 0;
    }

    public resize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public onAssetsReady(assets: RunAssets) {
        // Update ship texture according to current HP immediately.
        // Ship view pulls textures via getRunAssets(); ensure it recomputes size.
        this.ship.applyVisualSize();

        // Update existing asteroids spawned before assets were ready.
        for (const a of this.asteroids) {
            if (!(a.g instanceof Sprite)) continue;
            a.g.texture = assets.asteroidBase;
            applyAsteroidSpriteSize(a.g, a.r, assets);
        }
    }

    private getAsteroidHpBandForSpawn(): { min: number; max: number } {
        const levelId = this.levelId;
        const lb = levelId === 1 || levelId === 2 ? GAME_CONFIG.levelBalance[levelId] : GAME_CONFIG.levelBalance[2];

        // Step-wise ramp: every N seconds, newly spawned asteroids get +X HP.
        const steps = lb.asteroidHpRampEverySec > 0 ? Math.floor(this.runTimeSec / lb.asteroidHpRampEverySec) : 0;
        const extra = Math.max(0, steps) * lb.asteroidHpRampPerStep;

        const min = Math.max(1, Math.round(lb.asteroidHpStartMin + extra));
        const max = Math.max(min, Math.round(lb.asteroidHpStartMax + extra));
        return { min, max };
    }

    public spawnAsteroid(args: { avoidShip: boolean }) {
        const hp = this.getAsteroidHpBandForSpawn();
        const a = createAsteroid({
            width: this.width,
            height: this.height,
            shipX: this.ship.sprite.x,
            shipY: this.ship.sprite.y,
            avoidShip: args.avoidShip,
            hpAtMinRadius: hp.min,
            hpAtMaxRadius: hp.max
        });
        this.world.addChild(a.g);
        this.asteroids.push(a);
    }

    public spawnEnemy(args: { avoidShip: boolean }) {
        const kind = pickEnemyKindForSpawn({ enemiesKilled: this.enemiesKilled, runTimeSec: this.runTimeSec });
        const e = createEnemyWithKind({
            kind,
            levelId: this.levelId,
            width: this.width,
            height: this.height,
            shipX: this.ship.sprite.x,
            shipY: this.ship.sprite.y,
            avoidShip: args.avoidShip
        });
        this.world.addChild(e.g);
        this.enemies.push(e);
    }

    public spawnBoss(args: { kind: Boss['kind']; avoidShip: boolean }) {
        // Clear combat clutter to make the encounter readable.
        for (const e of this.enemies) this.world.removeChild(e.g);
        this.enemies = [];
        for (const b of this.enemyBullets) this.world.removeChild(b.g);
        this.enemyBullets = [];

        const boss = createBossWithKind({
            kind: args.kind,
            levelId: this.levelId,
            width: this.width,
            height: this.height,
            shipX: this.ship.sprite.x,
            shipY: this.ship.sprite.y,
            avoidShip: args.avoidShip
        });
        this.world.addChild(boss.g);
        this.boss = boss;
    }

    public spawnPickup(kind: PickupKind, amount: number, x: number, y: number) {
        const p = createPickup(kind, amount, x, y);
        this.world.addChild(p.g);
        this.pickups.push(p);
    }

    public computeEnemySpawnIntervalSec(): number {
        const base = GAME_CONFIG.enemiesSpawnIntervalSec - this.enemiesKilled * GAME_CONFIG.enemiesSpawnIntervalReducePerKillSec;
        return Math.max(GAME_CONFIG.enemiesSpawnIntervalMinSec, base);
    }

    private buildInitialAsteroids(args: { maxCount: number; spawnIntervalSec: number }) {
        const count = Math.min(GAME_CONFIG.asteroidsInitialCount, Math.max(0, args.maxCount));
        for (let i = 0; i < count; i++) this.spawnAsteroid({ avoidShip: true });
        this.spawnTimerLeft = Math.max(0.001, args.spawnIntervalSec);
    }

    private warpIn() {
        this.shipInvulnLeft = Math.max(this.shipInvulnLeft, GAME_CONFIG.warpInDurationSec);
        this.ship.warpIn({ width: this.width, height: this.height, durationSec: GAME_CONFIG.warpInDurationSec });
    }
}


