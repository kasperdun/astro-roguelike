import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { createGameHost, type GameHost } from '../game/core/GameHost';
import { MenuOverlay } from './menu/MenuOverlay';

export function AppShell() {
  const mode = useGameStore((s) => s.mode);
  const runLevelId = useGameStore((s) => s.run?.levelId ?? null);
  const startRun = useGameStore((s) => s.startRun);

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  const host: GameHost = useMemo(() => createGameHost(), []);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;

    host.mount(el);
    return () => host.unmount();
  }, [host]);

  useEffect(() => {
    if (mode === 'run' && runLevelId) {
      host.startRun(runLevelId);
    }
    if (mode === 'menu') {
      host.showMenuBackground();
    }
  }, [host, mode, runLevelId]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
    >
      <div
        ref={canvasWrapRef}
        style={{
          position: 'absolute',
          inset: 0
        }}
      />

      {mode === 'menu' ? <MenuOverlay onGoToMine={startRun} /> : null}
    </div>
  );
}


