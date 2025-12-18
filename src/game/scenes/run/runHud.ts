import type { Text } from 'pixi.js';
import { useGameStore, type LevelId } from '../../../state/gameStore';

export function hookRunHud(args: { hudText: Text; getLevelId: () => LevelId }): () => void {
  const { hudText, getLevelId } = args;

  const renderHud = () => {
    const state = useGameStore.getState();
    const run = state.run;

    if (!run) {
      hudText.text = `LEVEL ${getLevelId()}\n(no session)`;
      return;
    }

    hudText.text =
      `LEVEL ${run.levelId}\n` +
      `HP: ${Math.round(run.hp)}/${Math.round(run.maxHp)}\n` +
      `SHIELD: ${Math.round(run.shield)}/${Math.round(run.maxShield)}\n` +
      `FUEL: ${Math.round(run.fuel)}/${Math.round(run.maxFuel)}\n` +
      `MINERALS: ${run.minerals}\n` +
      `SCRAP: ${run.scrap}\n\n` +
      `WASD: thrust (inertia)\n` +
      `LMB: shoot\n` +
      `ESC: back to menu`;
  };

  renderHud();
  const unsub = useGameStore.subscribe(() => renderHud());
  return unsub;
}


