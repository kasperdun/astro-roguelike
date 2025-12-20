import localforage from 'localforage';
import { SaveV1Schema, SaveV2Schema, SAVE_VERSION, type SaveV1, type SaveV2 } from './saveSchema';
import { getUpgrade, UPGRADE_IDS, type PurchasedUpgrades } from '../progression/upgrades';

export type { SaveV1, SaveV2 } from './saveSchema';
export type SaveLatest = SaveV2;

const SAVE_KEY = 'main';

const storage = localforage.createInstance({
  name: 'SpaceMineCrafter',
  storeName: 'save'
});

export function createDefaultSave(): SaveV2 {
  return {
    version: SAVE_VERSION,
    bankMinerals: 0,
    bankScrap: 0,
    bankCores: 0,
    musicEnabled: true,
    sfxEnabled: true,
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

function sanitizeUnlockedLevels(raw: unknown): SaveLatest['unlockedLevels'] {
  const base = createDefaultSave().unlockedLevels;
  if (typeof raw !== 'object' || !raw) return base;
  const r = raw as Record<string, unknown>;

  return {
    1: typeof r['1'] === 'boolean' ? r['1'] : base[1],
    2: typeof r['2'] === 'boolean' ? r['2'] : base[2]
  };
}

function sanitizeBool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

function sanitizeSelectedLevelId(raw: unknown, unlockedLevels: SaveLatest['unlockedLevels']): SaveLatest['selectedLevelId'] {
  const v = raw === 2 ? 2 : 1;
  return unlockedLevels[v] ? v : 1;
}

function sanitizeUpgradeTreeViewport(raw: unknown): SaveLatest['upgradeTreeViewport'] {
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

export function migrateToLatest(raw: unknown): SaveLatest {
  const base = createDefaultSave();

  if (raw == null) return base;
  if (typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  const version = r.version;
  const unlockedLevels = sanitizeUnlockedLevels(r.unlockedLevels);

  if (version === 1) {
    const candidateV1: SaveV1 = {
      version: 1,
      bankMinerals: typeof r.bankMinerals === 'number' && Number.isFinite(r.bankMinerals) ? Math.max(0, r.bankMinerals) : 0,
      bankScrap: typeof r.bankScrap === 'number' && Number.isFinite(r.bankScrap) ? Math.max(0, r.bankScrap) : 0,
      musicEnabled: sanitizeBool(r.musicEnabled, true),
      sfxEnabled: sanitizeBool(r.sfxEnabled, true),
      purchasedUpgrades: sanitizePurchasedUpgrades(r.purchasedUpgrades),
      unlockedLevels,
      selectedLevelId: sanitizeSelectedLevelId(r.selectedLevelId, unlockedLevels),
      upgradeTreeViewport: sanitizeUpgradeTreeViewport(r.upgradeTreeViewport)
    };
    const parsedV1 = SaveV1Schema.safeParse(candidateV1);
    if (!parsedV1.success) return base;

    // v1 -> v2: add bankCores.
    const migrated: SaveLatest = {
      ...base,
      bankMinerals: parsedV1.data.bankMinerals,
      bankScrap: parsedV1.data.bankScrap,
      bankCores: 0,
      musicEnabled: parsedV1.data.musicEnabled,
      sfxEnabled: parsedV1.data.sfxEnabled,
      purchasedUpgrades: parsedV1.data.purchasedUpgrades,
      unlockedLevels: parsedV1.data.unlockedLevels,
      selectedLevelId: parsedV1.data.selectedLevelId,
      upgradeTreeViewport: parsedV1.data.upgradeTreeViewport
    };
    const parsedV2 = SaveV2Schema.safeParse(migrated);
    return parsedV2.success ? parsedV2.data : base;
  }

  if (version !== SAVE_VERSION) {
    // Unknown versions: fall back to defaults.
    return base;
  }

  const candidateV2: SaveLatest = {
    ...base,
    version: SAVE_VERSION,
    bankMinerals: typeof r.bankMinerals === 'number' && Number.isFinite(r.bankMinerals) ? Math.max(0, r.bankMinerals) : 0,
    bankScrap: typeof r.bankScrap === 'number' && Number.isFinite(r.bankScrap) ? Math.max(0, r.bankScrap) : 0,
    bankCores: typeof r.bankCores === 'number' && Number.isFinite(r.bankCores) ? Math.max(0, r.bankCores) : 0,
    musicEnabled: sanitizeBool(r.musicEnabled, base.musicEnabled),
    sfxEnabled: sanitizeBool(r.sfxEnabled, base.sfxEnabled),
    purchasedUpgrades: sanitizePurchasedUpgrades(r.purchasedUpgrades),
    unlockedLevels,
    selectedLevelId: sanitizeSelectedLevelId(r.selectedLevelId, unlockedLevels),
    upgradeTreeViewport: sanitizeUpgradeTreeViewport(r.upgradeTreeViewport)
  };

  const parsedV2 = SaveV2Schema.safeParse(candidateV2);
  return parsedV2.success ? parsedV2.data : base;
}

export async function loadSave(): Promise<SaveLatest> {
  const raw = await storage.getItem<unknown>(SAVE_KEY);
  const migrated = migrateToLatest(raw);

  // Always write back a normalized snapshot (covers: first run, corrupted saves, future migrations).
  await storage.setItem(SAVE_KEY, migrated);

  return migrated;
}

export async function saveGame(save: SaveLatest): Promise<void> {
  const parsed = SaveV2Schema.parse(save);
  await storage.setItem(SAVE_KEY, parsed);
}

export function buildSaveFromState(args: {
  bankMinerals: number;
  bankScrap: number;
  bankCores: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  purchasedUpgrades: PurchasedUpgrades;
  unlockedLevels: Record<number, boolean>;
  selectedLevelId: number;
  upgradeTreeViewport: { tx: number; ty: number; scale: number } | null;
}): SaveLatest {
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
    bankCores: Math.max(0, Number.isFinite(args.bankCores) ? args.bankCores : 0),
    musicEnabled: sanitizeBool(args.musicEnabled, true),
    sfxEnabled: sanitizeBool(args.sfxEnabled, true),
    purchasedUpgrades,
    unlockedLevels,
    selectedLevelId,
    upgradeTreeViewport: sanitizeUpgradeTreeViewport(args.upgradeTreeViewport)
  };
}


