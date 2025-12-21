import type { PurchasedUpgrades, PurchaseResult, UpgradeId } from '../../progression/upgrades';
import type { SaveLatest } from '../../persistence/save';

export type GameMode = 'menu' | 'run' | 'run_end';
export type MenuTabId = 'update' | 'craft' | 'quests';
export type LevelId = 1 | 2;

export type RunPickupKind = 'minerals' | 'scrap' | 'fuel' | 'health' | 'magnet' | 'core';

export type RunEndReason = 'death' | 'out_of_fuel' | 'boss_defeated' | 'quit';
export type RunEndOutcome = 'defeat' | 'victory';

export type RunEndSummary = {
    levelId: LevelId;
    outcome: RunEndOutcome;
    reason: RunEndReason;
    timeSec: number;
    asteroidsKilled: number;
    enemiesKilled: number;
    /** Pickups collected during the session (even if fuel/health were capped). */
    collected: Record<RunPickupKind, number>;
    /** Bankable run resources earned (these are moved to bank when run ends). */
    minerals: number;
    scrap: number;
    cores: number;
};

export type RunSession = {
    levelId: LevelId;
    hp: number;
    maxHp: number;
    fuel: number;
    maxFuel: number;
    shield: number;
    maxShield: number;
    stats: {
        projectilesPerShot: number;
        bulletDamage: number;
        bulletLifetimeSec: number;
        bulletSpeedPxPerSec: number;
        weaponFireRatePerSec: number;
        shipAccelPxPerSec2: number;
        shipMaxSpeedPxPerSec: number;
        fuelDrainPerSec: number;
        fuelDrainWhileThrustPerSec: number;
        fuelDrainPerShot: number;
        fuelRegenPerSec: number;
        shieldRegenPerSec: number;
        shieldRegenDelaySec: number;
        collisionDamageMultiplier: number;
        asteroidsSpawnIntervalSec: number;
        asteroidsMaxCount: number;
        asteroidExplosionDamage: number;
        asteroidExplosionRadiusBonusPx: number;
        pickupMagnetRadiusPx: number;
        magnetDropChance: number;
    };
    minerals: number;
    scrap: number;
    cores: number;
};

export type UpgradeTreeViewport = { tx: number; ty: number; scale: number } | null;

export type GameState = {
    mode: GameMode;
    activeTab: MenuTabId;
    selectedLevelId: LevelId;
    unlockedLevels: Record<LevelId, boolean>;
    run: RunSession | null;
    runEndSummary: RunEndSummary | null;

    /** True after we loaded & applied save data once. */
    hasHydrated: boolean;

    musicEnabled: boolean;
    sfxEnabled: boolean;

    escapeDialogOpen: boolean;

    /** Минералы в "банке" (meta-прогресс). Тратятся на апгрейды. */
    bankMinerals: number;
    /** Скрап в "банке" (meta-прогресс). Пока не используется (заложено под крафт). */
    bankScrap: number;
    /** Ядра в "банке" (meta-прогресс). Дропаются с боссов и тратятся на мощные апгрейды. */
    bankCores: number;
    /** Купленные апгрейды (meta-прогресс). */
    purchasedUpgrades: PurchasedUpgrades;

    /** UI состояние дерева улучшений (камера/зум). Должно переживать покупки/переключения режимов. */
    upgradeTreeViewport: UpgradeTreeViewport;

    setActiveTab: (tab: MenuTabId) => void;
    selectLevel: (levelId: LevelId) => void;
    startRun: () => void;
    startRunAtLevel: (levelId: LevelId) => void;
    endRunToMenu: () => void;
    endRunToSummary: (summary: RunEndSummary) => void;
    closeRunEndSummaryToMenu: () => void;
    hydrateFromSave: (save: SaveLatest) => void;

    setMusicEnabled: (enabled: boolean) => void;
    setSfxEnabled: (enabled: boolean) => void;

    openEscapeDialog: () => void;
    closeEscapeDialog: () => void;
    toggleEscapeDialog: () => void;

    addMinerals: (amount: number) => void;
    addScrap: (amount: number) => void;
    addCores: (amount: number) => void;

    applyDamageToShip: (amount: number) => void;
    consumeFuel: (amount: number) => void;
    addFuel: (amount: number) => void;
    addShield: (amount: number) => void;
    addHealth: (amount: number) => void;

    purchaseUpgrade: (id: UpgradeId) => PurchaseResult;
    /** Победа в ран-уровне (после убийства босса): перенос добычи в банк + unlock следующего уровня. */
    completeRunVictory: () => void;

    setUpgradeTreeViewport: (v: { tx: number; ty: number; scale: number }) => void;
};


