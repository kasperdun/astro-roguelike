import { buildSaveFromState, saveGame } from '../../persistence/save';
import type { GameState } from './types';

export function autosaveProgress(get: () => GameState) {
    const s = get();
    const save = buildSaveFromState({
        bankMinerals: s.bankMinerals,
        bankScrap: s.bankScrap,
        bankCores: s.bankCores,
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


