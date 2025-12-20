import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '../state/gameStore';
import { createGameHost, type GameHost } from '../game/core/GameHost';
import { MenuOverlay } from './menu/MenuOverlay';
import { EscapeDialog } from './EscapeDialog';
import { audio } from '../audio/audio';
import { loadSave } from '../persistence/save';

export function AppShell() {
  const mode = useGameStore((s) => s.mode);
  const runLevelId = useGameStore((s) => s.run?.levelId ?? null);
  const startRun = useGameStore((s) => s.startRun);
  const escapeDialogOpen = useGameStore((s) => s.escapeDialogOpen);

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  const host: GameHost = useMemo(() => createGameHost(), []);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;

    host.mount(el);
    return () => host.unmount();
  }, [host]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const save = await loadSave();
      if (cancelled) return;
      useGameStore.getState().hydrateFromSave(save);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode === 'run' && runLevelId) {
      host.startRun(runLevelId);
    }
    if (mode === 'menu') {
      host.showMenuBackground();
    }
  }, [host, mode, runLevelId]);

  useEffect(() => {
    audio.setBackgroundMusic(mode === 'menu' ? 'menu' : 'run');
    return () => audio.stopAll();
  }, [mode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (e.repeat) return;
      e.preventDefault();

      const s = useGameStore.getState();
      if (s.escapeDialogOpen) s.closeEscapeDialog();
      else s.openEscapeDialog();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // Pause GSAP-driven run effects while the pause dialog is open.
    gsap.globalTimeline.paused(mode === 'run' && escapeDialogOpen);
    return () => {
      gsap.globalTimeline.paused(false);
    };
  }, [mode, escapeDialogOpen]);

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
      {escapeDialogOpen ? <EscapeDialog /> : null}
    </div>
  );
}


