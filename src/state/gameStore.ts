import { create } from 'zustand';
import { GAME_CONFIG } from '../config/gameConfig';
import {
    canPurchaseUpgrade,
    deriveShipStartStats,
    getUpgrade,
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
    fuel: number;
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

    setActiveTab: (tab: MenuTabId) => void;
    selectLevel: (levelId: LevelId) => void;
    startRun: () => void;
    endRunToMenu: () => void;

    addMinerals: (amount: number) => void;
    addScrap: (amount: number) => void;

    applyDamageToShip: (amount: number) => void;
    consumeFuel: (amount: number) => void;

    purchaseUpgrade: (id: UpgradeId) => PurchaseResult;
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

    setActiveTab: (tab: MenuTabId) => set({ activeTab: tab }),
    selectLevel: (levelId) =>
        set((s) => (s.unlockedLevels[levelId] ? { selectedLevelId: levelId } : s)),
    startRun: () => {
        const { selectedLevelId, purchasedUpgrades } = get();
        const derived = deriveShipStartStats(
            { startHp: GAME_CONFIG.shipStartHp, startFuel: GAME_CONFIG.shipStartFuel },
            purchasedUpgrades
        );
        set({
            mode: 'run',
            run: {
                levelId: selectedLevelId,
                hp: derived.startHp,
                fuel: derived.startFuel,
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
            const hp = Math.max(0, s.run.hp - amount);
            return { run: { ...s.run, hp } };
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

    purchaseUpgrade: (id) => {
        const { bankMinerals, purchasedUpgrades } = get();
        const check = canPurchaseUpgrade({ id, minerals: bankMinerals, purchased: purchasedUpgrades });
        if (!check.ok) return check;

        // canPurchaseUpgrade already validated; safe to use getUpgrade for the cost.
        const cost = getUpgrade(id).costMinerals;

        set((s) => ({
            bankMinerals: s.bankMinerals - cost,
            purchasedUpgrades: { ...s.purchasedUpgrades, [id]: true }
        }));

        return { ok: true };
    }
}));


