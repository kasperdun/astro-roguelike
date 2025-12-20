import { useGameStore } from '../state/gameStore';
import { audio } from '../audio/audio';

export function EscapeDialog() {
  const mode = useGameStore((s) => s.mode);
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const sfxEnabled = useGameStore((s) => s.sfxEnabled);
  const setMusicEnabled = useGameStore((s) => s.setMusicEnabled);
  const setSfxEnabled = useGameStore((s) => s.setSfxEnabled);
  const close = useGameStore((s) => s.closeEscapeDialog);
  const endRunToMenu = useGameStore((s) => s.endRunToMenu);

  const title = mode === 'run' ? 'Пауза' : 'Настройки';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // Click outside closes dialog.
        if (e.target === e.currentTarget) close();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.55)'
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.65)',
          padding: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <button
            type="button"
            onClick={() => {
              audio.playMenuClick();
              close();
            }}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.25)',
              color: 'rgba(255,255,255,0.92)',
              cursor: 'pointer'
            }}
          >
            Закрыть
          </button>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ToggleRow
            label="Музыка"
            enabled={musicEnabled}
            onToggle={() => {
              audio.playMenuClick();
              setMusicEnabled(!musicEnabled);
            }}
          />
          <ToggleRow
            label="Звуки"
            enabled={sfxEnabled}
            onToggle={() => {
              audio.playMenuClick();
              setSfxEnabled(!sfxEnabled);
            }}
          />
        </div>

        {mode === 'run' ? (
          <>
            <div style={{ height: 14 }} />
            <button
              type="button"
              onClick={() => {
                audio.playMenuClick();
                endRunToMenu();
              }}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(220,80,80,0.25)',
                color: 'rgba(255,255,255,0.95)',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              Выйти из уровня
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow(args: { label: string; enabled: boolean; onToggle: () => void }) {
  const { label, enabled, onToggle } = args;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.9 }}>{label}</div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          minWidth: 120,
          height: 36,
          padding: '0 12px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: enabled ? 'rgba(80,180,140,0.28)' : 'rgba(0,0,0,0.25)',
          color: 'rgba(255,255,255,0.92)',
          cursor: 'pointer',
          fontWeight: 800
        }}
      >
        {enabled ? 'Вкл' : 'Выкл'}
      </button>
    </div>
  );
}


