import type { PurchasedUpgrades, PurchaseResult, UpgradeId } from '../../progression/upgrades';
import type { SaveV1 } from '../../persistence/save';

export type GameMode = 'menu' | 'run';
export type MenuTabId = 'update' | 'craft' | 'quests';
export type LevelId = 1 | 2;

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
};

export type UpgradeTreeViewport = { tx: number; ty: number; scale: number } | null;

export type GameState = {
    mode: GameMode;
    activeTab: MenuTabId;
    selectedLevelId: LevelId;
    unlockedLevels: Record<LevelId, boolean>;
    run: RunSession | null;

    /** True after we loaded & applied save data once. */
    hasHydrated: boolean;

    musicEnabled: boolean;
    sfxEnabled: boolean;

    escapeDialogOpen: boolean;

    /** Минералы в "банке" (meta-прогресс). Тратятся на апгрейды. */
    bankMinerals: number;
    /** Скрап в "банке" (meta-прогресс). Пока не используется (заложено под крафт). */
    bankScrap: number;
    /** Купленные апгрейды (meta-прогресс). */
    purchasedUpgrades: PurchasedUpgrades;

    /** UI состояние дерева улучшений (камера/зум). Должно переживать покупки/переключения режимов. */
    upgradeTreeViewport: UpgradeTreeViewport;

    setActiveTab: (tab: MenuTabId) => void;
    selectLevel: (levelId: LevelId) => void;
    startRun: () => void;
    endRunToMenu: () => void;
    hydrateFromSave: (save: SaveV1) => void;

    setMusicEnabled: (enabled: boolean) => void;
    setSfxEnabled: (enabled: boolean) => void;

    openEscapeDialog: () => void;
    closeEscapeDialog: () => void;
    toggleEscapeDialog: () => void;

    addMinerals: (amount: number) => void;
    addScrap: (amount: number) => void;

    applyDamageToShip: (amount: number) => void;
    consumeFuel: (amount: number) => void;
    addFuel: (amount: number) => void;
    addShield: (amount: number) => void;
    addHealth: (amount: number) => void;

    purchaseUpgrade: (id: UpgradeId) => PurchaseResult;

    setUpgradeTreeViewport: (v: { tx: number; ty: number; scale: number }) => void;
};


