import localforage from 'localforage';
import { SaveV1Schema, SAVE_VERSION, type SaveV1 } from './saveSchema';
import { getUpgrade, UPGRADE_IDS, type PurchasedUpgrades } from '../progression/upgrades';

export type { SaveV1 } from './saveSchema';

const SAVE_KEY = 'main';

const storage = localforage.createInstance({
  name: 'SpaceMineCrafter',
  storeName: 'save'
});

export function createDefaultSave(): SaveV1 {
  return {
    version: SAVE_VERSION,
    bankMinerals: 0,
    bankScrap: 0,
    purchasedUpgrades: {},
    unlockedLevels: { 1: true, 2: false },
    selectedLevelId: 1,
    upgradeTreeViewport: null
  };
}

function sanitizePurchasedUpgrades(raw: unknown): PurchasedUpgrades {
  const r = (typeof raw === 'object' && raw ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const out: PurchasedUpgrades = {};

  for (const id of UPGRADE_IDS) {
    const v = r[id];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const lvl = Math.max(0, Math.floor(v));
    if (lvl <= 0) continue;

    const max = getUpgrade(id).maxLevel;
    out[id] = Math.min(lvl, max);
  }

  return out;
}

function sanitizeUnlockedLevels(raw: unknown): SaveV1['unlockedLevels'] {
  const base = createDefaultSave().unlockedLevels;
  if (typeof raw !== 'object' || !raw) return base;
  const r = raw as Record<string, unknown>;

  return {
    1: typeof r['1'] === 'boolean' ? r['1'] : base[1],
    2: typeof r['2'] === 'boolean' ? r['2'] : base[2]
  };
}

function sanitizeSelectedLevelId(raw: unknown, unlockedLevels: SaveV1['unlockedLevels']): SaveV1['selectedLevelId'] {
  const v = raw === 2 ? 2 : 1;
  return unlockedLevels[v] ? v : 1;
}

function sanitizeUpgradeTreeViewport(raw: unknown): SaveV1['upgradeTreeViewport'] {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const tx = typeof r.tx === 'number' && Number.isFinite(r.tx) ? r.tx : null;
  const ty = typeof r.ty === 'number' && Number.isFinite(r.ty) ? r.ty : null;
  const scale = typeof r.scale === 'number' && Number.isFinite(r.scale) ? r.scale : null;
  if (tx == null || ty == null || scale == null) return null;
  if (scale <= 0) return null;
  return { tx, ty, scale };
}

export function migrateToLatest(raw: unknown): SaveV1 {
  const base = createDefaultSave();

  if (raw == null) return base;
  if (typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  const version = r.version;
  if (version !== SAVE_VERSION) {
    // Future-proofing: once we introduce v2+, we can add step-by-step migrations here.
    // For unknown versions we fall back to defaults.
    return base;
  }

  const unlockedLevels = sanitizeUnlockedLevels(r.unlockedLevels);

  const candidate: SaveV1 = {
    ...base,
    version: SAVE_VERSION,
    bankMinerals: typeof r.bankMinerals === 'number' && Number.isFinite(r.bankMinerals) ? Math.max(0, r.bankMinerals) : 0,
    bankScrap: typeof r.bankScrap === 'number' && Number.isFinite(r.bankScrap) ? Math.max(0, r.bankScrap) : 0,
    purchasedUpgrades: sanitizePurchasedUpgrades(r.purchasedUpgrades),
    unlockedLevels,
    selectedLevelId: sanitizeSelectedLevelId(r.selectedLevelId, unlockedLevels),
    upgradeTreeViewport: sanitizeUpgradeTreeViewport(r.upgradeTreeViewport)
  };

  const parsed = SaveV1Schema.safeParse(candidate);
  return parsed.success ? parsed.data : base;
}

export async function loadSave(): Promise<SaveV1> {
  const raw = await storage.getItem<unknown>(SAVE_KEY);
  const migrated = migrateToLatest(raw);

  // Always write back a normalized snapshot (covers: first run, corrupted saves, future migrations).
  await storage.setItem(SAVE_KEY, migrated);

  return migrated;
}

export async function saveGame(save: SaveV1): Promise<void> {
  const parsed = SaveV1Schema.parse(save);
  await storage.setItem(SAVE_KEY, parsed);
}

export function buildSaveFromState(args: {
  bankMinerals: number;
  bankScrap: number;
  purchasedUpgrades: PurchasedUpgrades;
  unlockedLevels: Record<number, boolean>;
  selectedLevelId: number;
  upgradeTreeViewport: { tx: number; ty: number; scale: number } | null;
}): SaveV1 {
  const unlockedLevels = sanitizeUnlockedLevels(args.unlockedLevels);
  const selectedLevelId = sanitizeSelectedLevelId(args.selectedLevelId, unlockedLevels);

  const purchasedUpgrades: PurchasedUpgrades = {};
  for (const id of UPGRADE_IDS) {
    const lvl = args.purchasedUpgrades[id] ?? 0;
    if (typeof lvl !== 'number' || !Number.isFinite(lvl)) continue;
    const intLvl = Math.max(0, Math.floor(lvl));
    if (intLvl <= 0) continue;
    purchasedUpgrades[id] = Math.min(intLvl, getUpgrade(id).maxLevel);
  }

  return {
    version: SAVE_VERSION,
    bankMinerals: Math.max(0, Number.isFinite(args.bankMinerals) ? args.bankMinerals : 0),
    bankScrap: Math.max(0, Number.isFinite(args.bankScrap) ? args.bankScrap : 0),
    purchasedUpgrades,
    unlockedLevels,
    selectedLevelId,
    upgradeTreeViewport: sanitizeUpgradeTreeViewport(args.upgradeTreeViewport)
  };
}


