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
import type { SaveLatest } from '../persistence/save';
import type { GameState, LevelId, MenuTabId } from './gameStore/types';
import { autosaveProgress } from './gameStore/autosave';

export type { GameMode, LevelId, MenuTabId, RunSession } from './gameStore/types';

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
    bankCores: 0,
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
                scrap: 0,
                cores: 0
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
                bankScrap: s.bankScrap + run.scrap,
                bankCores: s.bankCores + run.cores
            };
        });
        autosaveProgress(get);
    },

    hydrateFromSave: (save: SaveLatest) =>
        set((s) => {
            audio.setMusicEnabled(save.musicEnabled);
            audio.setSfxEnabled(save.sfxEnabled);
            return {
                ...s,
                hasHydrated: true,
                bankMinerals: save.bankMinerals,
                bankScrap: save.bankScrap,
                bankCores: save.bankCores,
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
    addCores: (amount) =>
        set((s) => (s.run ? { run: { ...s.run, cores: s.run.cores + amount } } : s)),

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
        const { bankMinerals, bankScrap, bankCores, purchasedUpgrades } = get();
        const check = canPurchaseUpgrade({
            id,
            minerals: bankMinerals,
            scrap: bankScrap,
            cores: bankCores,
            purchased: purchasedUpgrades
        });
        if (!check.ok) return check;

        // canPurchaseUpgrade already validated; safe to compute the next cost.
        const current = getPurchasedLevel(purchasedUpgrades, id);
        const cost = getUpgradeCostForLevel(id, current + 1);
        const currency = getUpgrade(id).cost.currency;

        set((s) => {
            const nextPurchased = { ...s.purchasedUpgrades, [id]: current + 1 };
            if (currency === 'minerals') return { bankMinerals: s.bankMinerals - cost, purchasedUpgrades: nextPurchased };
            if (currency === 'scrap') return { bankScrap: s.bankScrap - cost, purchasedUpgrades: nextPurchased };
            return { bankCores: s.bankCores - cost, purchasedUpgrades: nextPurchased };
        });

        autosaveProgress(get);
        return { ok: true };
    },

    completeRunVictory: () => {
        set((s) => {
            const run = s.run;
            if (!run) return s;
            const nextUnlocked = { ...s.unlockedLevels };
            if (run.levelId === 1) nextUnlocked[2] = true;
            return {
                mode: 'menu',
                run: null,
                escapeDialogOpen: false,
                bankMinerals: s.bankMinerals + run.minerals,
                bankScrap: s.bankScrap + run.scrap,
                bankCores: s.bankCores + run.cores,
                unlockedLevels: nextUnlocked,
                selectedLevelId: nextUnlocked[2] ? 2 : s.selectedLevelId
            };
        });
        autosaveProgress(get);
    },

    setUpgradeTreeViewport: (v) => set({ upgradeTreeViewport: v })
}));


