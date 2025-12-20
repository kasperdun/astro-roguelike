import { create } from 'zustand';
import {
    canPurchaseUpgrade,
    deriveRunStats,
    getPurchasedLevel,
    getUpgrade,
    getUpgradeCostForLevel,
    type PurchaseResult,
    type PurchasedUpgrades,
    type UpgradeId
} from '../progression/upgrades';
import { getRunBaseStats } from './runBaseStats';
import { audio } from '../audio/audio';
import { buildSaveFromState, saveGame, type SaveV1 } from '../persistence/save';

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

type GameState = {
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
    upgradeTreeViewport: { tx: number; ty: number; scale: number } | null;

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

function autosaveProgress(get: () => GameState) {
    const s = get();
    const save = buildSaveFromState({
        bankMinerals: s.bankMinerals,
        bankScrap: s.bankScrap,
        musicEnabled: s.musicEnabled,
        sfxEnabled: s.sfxEnabled,
        purchasedUpgrades: s.purchasedUpgrades,
        unlockedLevels: s.unlockedLevels,
        selectedLevelId: s.selectedLevelId,
        upgradeTreeViewport: s.upgradeTreeViewport
    });
    void saveGame(save).catch(() => {
        // Ignore storage errors (private mode / quota). The game remains playable.
    });
}

export const useGameStore = create<GameState>((set, get) => ({
    mode: 'menu',
    activeTab: 'update',
    selectedLevelId: 1,
    unlockedLevels: { 1: true, 2: false },
    run: null,
    hasHydrated: false,

    musicEnabled: true,
    sfxEnabled: true,

    escapeDialogOpen: false,

    bankMinerals: 0,
    bankScrap: 0,
    purchasedUpgrades: {},
    upgradeTreeViewport: null,

    setActiveTab: (tab: MenuTabId) => set({ activeTab: tab }),
    selectLevel: (levelId: LevelId) =>
        set((s) => (s.unlockedLevels[levelId] ? { selectedLevelId: levelId } : s)),
    startRun: () => {
        const { selectedLevelId, purchasedUpgrades } = get();
        const derived = deriveRunStats({
            base: getRunBaseStats(),
            purchased: purchasedUpgrades
        });
        set({
            mode: 'run',
            escapeDialogOpen: false,
            run: {
                levelId: selectedLevelId,
                hp: derived.startHp,
                maxHp: derived.maxHp,
                fuel: derived.startFuel,
                maxFuel: derived.maxFuel,
                shield: derived.maxShield,
                maxShield: derived.maxShield,
                stats: {
                    projectilesPerShot: derived.projectilesPerShot,
                    bulletDamage: derived.bulletDamage,
                    bulletLifetimeSec: derived.bulletLifetimeSec,
                    bulletSpeedPxPerSec: derived.bulletSpeedPxPerSec,
                    weaponFireRatePerSec: derived.weaponFireRatePerSec,
                    shipAccelPxPerSec2: derived.shipAccelPxPerSec2,
                    shipMaxSpeedPxPerSec: derived.shipMaxSpeedPxPerSec,
                    fuelDrainPerSec: derived.fuelDrainPerSec,
                    fuelDrainWhileThrustPerSec: derived.fuelDrainWhileThrustPerSec,
                    fuelDrainPerShot: derived.fuelDrainPerShot,
                    fuelRegenPerSec: derived.fuelRegenPerSec,
                    shieldRegenPerSec: derived.shieldRegenPerSec,
                    shieldRegenDelaySec: derived.shieldRegenDelaySec,
                    collisionDamageMultiplier: derived.collisionDamageMultiplier,
                    asteroidsSpawnIntervalSec: derived.asteroidsSpawnIntervalSec,
                    asteroidsMaxCount: derived.asteroidsMaxCount,
                    asteroidExplosionDamage: derived.asteroidExplosionDamage,
                    asteroidExplosionRadiusBonusPx: derived.asteroidExplosionRadiusBonusPx,
                    pickupMagnetRadiusPx: derived.pickupMagnetRadiusPx,
                    magnetDropChance: derived.magnetDropChance
                },
                minerals: 0,
                scrap: 0
            }
        });
    },
    endRunToMenu: () => {
        set((s) => {
            const run = s.run;
            if (!run) return { mode: 'menu', run: null, escapeDialogOpen: false };
            return {
                mode: 'menu',
                run: null,
                escapeDialogOpen: false,
                bankMinerals: s.bankMinerals + run.minerals,
                bankScrap: s.bankScrap + run.scrap
            };
        });
        autosaveProgress(get);
    },

    hydrateFromSave: (save: SaveV1) =>
        set((s) => {
            audio.setMusicEnabled(save.musicEnabled);
            audio.setSfxEnabled(save.sfxEnabled);
            return {
                ...s,
                hasHydrated: true,
                bankMinerals: save.bankMinerals,
                bankScrap: save.bankScrap,
                musicEnabled: save.musicEnabled,
                sfxEnabled: save.sfxEnabled,
                purchasedUpgrades: save.purchasedUpgrades,
                unlockedLevels: { 1: save.unlockedLevels['1'], 2: save.unlockedLevels['2'] },
                selectedLevelId: save.selectedLevelId,
                upgradeTreeViewport: save.upgradeTreeViewport
            };
        }),

    setMusicEnabled: (enabled) => {
        set({ musicEnabled: enabled });
        audio.setMusicEnabled(enabled);
        autosaveProgress(get);
    },
    setSfxEnabled: (enabled) => {
        set({ sfxEnabled: enabled });
        audio.setSfxEnabled(enabled);
        autosaveProgress(get);
    },

    openEscapeDialog: () => set({ escapeDialogOpen: true }),
    closeEscapeDialog: () => set({ escapeDialogOpen: false }),
    toggleEscapeDialog: () => set((s) => ({ escapeDialogOpen: !s.escapeDialogOpen })),

    addMinerals: (amount) =>
        set((s) => (s.run ? { run: { ...s.run, minerals: s.run.minerals + amount } } : s)),
    addScrap: (amount) =>
        set((s) => (s.run ? { run: { ...s.run, scrap: s.run.scrap + amount } } : s)),

    applyDamageToShip: (amount) => {
        if (amount <= 0) return;
        set((s) => {
            if (!s.run) return s;
            const maxShield = s.run.maxShield ?? 0;
            const shield = Math.max(0, Math.min(maxShield, s.run.shield ?? 0));

            const usedFromShield = Math.min(shield, amount);
            const shieldAfter = shield - usedFromShield;
            const hpAfter = Math.max(0, s.run.hp - (amount - usedFromShield));

            return { run: { ...s.run, shield: shieldAfter, hp: hpAfter } };
        });
        const run = get().run;
        if (run && run.hp <= 0) {
            audio.playShipDead();
            get().endRunToMenu();
        }
    },

    consumeFuel: (amount) => {
        if (amount <= 0) return;
        set((s) => {
            if (!s.run) return s;
            const fuel = Math.max(0, s.run.fuel - amount);
            return { run: { ...s.run, fuel } };
        });
        const run = get().run;
        if (run && run.fuel <= 0) get().endRunToMenu();
    },

    addFuel: (amount) => {
        if (amount <= 0) return;
        set((s) => {
            if (!s.run) return s;
            const max = s.run.maxFuel ?? s.run.fuel;
            const fuel = Math.max(0, Math.min(max, s.run.fuel + amount));
            return { run: { ...s.run, fuel } };
        });
    },

    addHealth: (amount) => {
        if (amount <= 0) return;
        set((s) => {
            if (!s.run) return s;
            const health = Math.max(0, Math.min(s.run.maxHp, s.run.hp + amount));
            return { run: { ...s.run, hp: health } };
        });
    },

    addShield: (amount) => {
        if (amount <= 0) return;
        set((s) => {
            if (!s.run) return s;
            const max = s.run.maxShield ?? 0;
            if (max <= 0) return s;
            const shield = Math.max(0, Math.min(max, (s.run.shield ?? 0) + amount));
            return { run: { ...s.run, shield } };
        });
    },

    purchaseUpgrade: (id: UpgradeId) => {
        const { bankMinerals, bankScrap, purchasedUpgrades } = get();
        const check = canPurchaseUpgrade({ id, minerals: bankMinerals, scrap: bankScrap, purchased: purchasedUpgrades });
        if (!check.ok) return check;

        // canPurchaseUpgrade already validated; safe to compute the next cost.
        const current = getPurchasedLevel(purchasedUpgrades, id);
        const cost = getUpgradeCostForLevel(id, current + 1);
        const currency = getUpgrade(id).cost.currency;

        set((s) => {
            const nextPurchased = { ...s.purchasedUpgrades, [id]: current + 1 };
            return currency === 'minerals'
                ? { bankMinerals: s.bankMinerals - cost, purchasedUpgrades: nextPurchased }
                : { bankScrap: s.bankScrap - cost, purchasedUpgrades: nextPurchased };
        });

        autosaveProgress(get);
        return { ok: true };
    },

    setUpgradeTreeViewport: (v) => set({ upgradeTreeViewport: v })
}));


