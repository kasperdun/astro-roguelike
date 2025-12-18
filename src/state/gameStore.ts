import { create } from 'zustand';
import { GAME_CONFIG } from '../config/gameConfig';
import {
    canPurchaseUpgrade,
    deriveRunStats,
    getPurchasedLevel,
    getUpgradeCostForLevel,
    type PurchaseResult,
    type PurchasedUpgrades,
    type UpgradeId
} from '../progression/upgrades';

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

    addMinerals: (amount: number) => void;
    addScrap: (amount: number) => void;

    applyDamageToShip: (amount: number) => void;
    consumeFuel: (amount: number) => void;
    addFuel: (amount: number) => void;
    addShield: (amount: number) => void;

    purchaseUpgrade: (id: UpgradeId) => PurchaseResult;

    setUpgradeTreeViewport: (v: { tx: number; ty: number; scale: number }) => void;
};

export const useGameStore = create<GameState>((set, get) => ({
    mode: 'menu',
    activeTab: 'update',
    selectedLevelId: 1,
    unlockedLevels: { 1: true, 2: false },
    run: null,

    bankMinerals: 0,
    bankScrap: 0,
    purchasedUpgrades: {},
    upgradeTreeViewport: null,

    setActiveTab: (tab: MenuTabId) => set({ activeTab: tab }),
    selectLevel: (levelId) =>
        set((s) => (s.unlockedLevels[levelId] ? { selectedLevelId: levelId } : s)),
    startRun: () => {
        const { selectedLevelId, purchasedUpgrades } = get();
        const derived = deriveRunStats({
            base: {
                startHp: GAME_CONFIG.shipStartHp,
                startFuel: GAME_CONFIG.shipStartFuel,
                bulletDamage: GAME_CONFIG.bulletDamage,
                bulletLifetimeSec: GAME_CONFIG.bulletLifetimeSec,
                bulletSpeedPxPerSec: GAME_CONFIG.bulletSpeedPxPerSec,
                weaponFireRatePerSec: GAME_CONFIG.weaponFireRatePerSec,
                shipAccelPxPerSec2: GAME_CONFIG.shipAccelPxPerSec2,
                shipMaxSpeedPxPerSec: GAME_CONFIG.shipMaxSpeedPxPerSec,
                fuelDrainPerSec: GAME_CONFIG.fuelDrainPerSec,
                fuelDrainWhileThrustPerSec: GAME_CONFIG.fuelDrainWhileThrustPerSec,
                fuelDrainPerShot: GAME_CONFIG.fuelDrainPerShot,
                shieldRegenDelaySec: 0.7
            },
            purchased: purchasedUpgrades
        });
        set({
            mode: 'run',
            run: {
                levelId: selectedLevelId,
                hp: derived.startHp,
                maxHp: derived.maxHp,
                fuel: derived.startFuel,
                maxFuel: derived.maxFuel,
                shield: derived.maxShield,
                maxShield: derived.maxShield,
                stats: {
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
                    collisionDamageMultiplier: derived.collisionDamageMultiplier
                },
                minerals: 0,
                scrap: 0
            }
        });
    },
    endRunToMenu: () =>
        set((s) => {
            const run = s.run;
            if (!run) return { mode: 'menu', run: null };
            return {
                mode: 'menu',
                run: null,
                bankMinerals: s.bankMinerals + run.minerals,
                bankScrap: s.bankScrap + run.scrap
            };
        }),

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
        if (run && run.hp <= 0) get().endRunToMenu();
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

    purchaseUpgrade: (id) => {
        const { bankMinerals, purchasedUpgrades } = get();
        const check = canPurchaseUpgrade({ id, minerals: bankMinerals, purchased: purchasedUpgrades });
        if (!check.ok) return check;

        // canPurchaseUpgrade already validated; safe to compute the next cost.
        const current = getPurchasedLevel(purchasedUpgrades, id);
        const cost = getUpgradeCostForLevel(id, current + 1);

        set((s) => ({
            bankMinerals: s.bankMinerals - cost,
            purchasedUpgrades: { ...s.purchasedUpgrades, [id]: current + 1 }
        }));

        return { ok: true };
    },

    setUpgradeTreeViewport: (v) => set({ upgradeTreeViewport: v })
}));


