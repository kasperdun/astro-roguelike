import { z } from 'zod';

export const SAVE_VERSION = 1 as const;

const UpgradeTreeViewportSchema = z
  .object({
    tx: z.number().finite(),
    ty: z.number().finite(),
    scale: z.number().finite().positive()
  })
  .strict();

export const SaveV1Schema = z
  .object({
    version: z.literal(SAVE_VERSION),

    bankMinerals: z.number().finite().nonnegative(),
    bankScrap: z.number().finite().nonnegative(),

    musicEnabled: z.boolean(),
    sfxEnabled: z.boolean(),

    /** Stored as a plain record; we sanitize keys/levels against known UpgradeId list at load time. */
    purchasedUpgrades: z.record(z.string(), z.number().finite()),

    /**
     * LevelId keys become strings after JSON roundtrip; numeric access still works in JS.
     * Keep schema explicit so corrupted saves get rejected.
     */
    unlockedLevels: z.object({ '1': z.boolean(), '2': z.boolean() }).strict(),
    selectedLevelId: z.union([z.literal(1), z.literal(2)]),

    upgradeTreeViewport: UpgradeTreeViewportSchema.nullable()
  })
  .strict();

export type SaveV1 = z.infer<typeof SaveV1Schema>;


