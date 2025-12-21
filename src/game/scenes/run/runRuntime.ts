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
import type { RunEndReason } from '../../../state/gameStore/types';

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

    /** True after the ship was destroyed in this run (used to disable targeting/ship interactions). */
    public isShipDead = false;

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
    public asteroidsKilled = 0;
    public runTimeSec = 0;
    public collected: Record<PickupKind, number> = { minerals: 0, scrap: 0, fuel: 0, health: 0, magnet: 0, core: 0 };

    public endSequence: null | {
        kind: 'victory';
        phase: 'pull_loot' | 'warp_out';
        /** Set after warp-out tween completes. */
        warpOutDone: boolean;
    } = null;

    /** Boss progress accumulated from kills before the boss spawns. */
    public bossProgress = 0;
    public bossProgressMax = GAME_CONFIG.bossProgressRequired;

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
        this.isShipDead = false;

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
        this.asteroidsKilled = 0;
        this.runTimeSec = 0;
        this.collected = { minerals: 0, scrap: 0, fuel: 0, health: 0, magnet: 0, core: 0 };
        this.endSequence = null;

        this.bossProgress = 0;
        this.bossProgressMax = GAME_CONFIG.bossProgressRequired;

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
        this.isShipDead = false;
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
        this.world.addChild(a.hpBar);
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
        this.world.addChild(e.hpBar);
        this.enemies.push(e);
    }

    public spawnBoss(args: { kind: Boss['kind']; avoidShip: boolean }) {
        // Clear combat clutter to make the encounter readable.
        for (const e of this.enemies) {
            this.world.removeChild(e.g);
            this.world.removeChild(e.hpBar);
        }
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

    public registerEnemyKilled() {
        this.enemiesKilled++;
        this.addBossProgress(GAME_CONFIG.bossProgressPerEnemyKill);
    }

    public registerAsteroidKilled() {
        this.asteroidsKilled++;
        this.addBossProgress(GAME_CONFIG.bossProgressPerAsteroidKill);
    }

    public registerPickupCollected(kind: PickupKind, amount: number) {
        if (amount <= 0) return;
        const prev = this.collected[kind] ?? 0;
        this.collected[kind] = prev + amount;
    }

    public beginVictorySequence() {
        this.bossDefeated = true;
        this.victoryTimerLeft = 0;
        // Pull all pickups to the ship and wait until they're collected.
        this.pickupVacuumLeft = Math.max(this.pickupVacuumLeft, 999999);
        // Make the ship invulnerable during the sequence.
        this.shipInvulnLeft = Math.max(this.shipInvulnLeft, 999999);
        this.endSequence = { kind: 'victory', phase: 'pull_loot', warpOutDone: false };
        // Also force-stop player input.
        this.input.w = false;
        this.input.a = false;
        this.input.s = false;
        this.input.d = false;
        this.input.firing = false;
    }

    public shouldLockControls(): boolean {
        return this.ship.isWarpingIn || this.ship.isWarpingOut || this.endSequence !== null;
    }

    public getEndReasonIfAny(runHp: number, runFuel: number): RunEndReason | null {
        if (runHp <= 0) return 'death';
        if (runFuel <= 0) return 'out_of_fuel';
        return null;
    }

    private addBossProgress(delta: number) {
        if (this.boss || this.bossDefeated) return;
        if (!Number.isFinite(delta) || delta <= 0) return;
        this.bossProgress = Math.min(this.bossProgressMax, this.bossProgress + delta);
    }

    public getBossBarState():
        | { mode: 'hidden' }
        | { mode: 'progress'; current: number; max: number; label: string; fillColor: number }
        | { mode: 'boss'; current: number; max: number; label: string; fillColor: number } {
        if (this.boss) {
            return { mode: 'boss', current: this.boss.hp, max: this.boss.maxHp, label: 'BOSS', fillColor: 0xff4ad2 };
        }
        if (this.bossDefeated) return { mode: 'hidden' };
        return { mode: 'progress', current: this.bossProgress, max: this.bossProgressMax, label: 'BOSS', fillColor: 0xffb020 };
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


