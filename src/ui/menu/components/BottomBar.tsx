import { useGameStore, type LevelId } from '../../../state/gameStore';
import { audio } from '../../../audio/audio';

type Props = {
  onGoToMine: () => void;
};

export function BottomBar({ onGoToMine }: Props) {
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const unlockedLevels = useGameStore((s) => s.unlockedLevels);
  const selectLevel = useGameStore((s) => s.selectLevel);
  const bankMinerals = useGameStore((s) => s.bankMinerals);
  const bankScrap = useGameStore((s) => s.bankScrap);

  const levels: LevelId[] = [1, 2];

  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: 24,
        height: 78,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.45)',
        borderRadius: 14,
        padding: '12px 14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Bank</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <StatPill label="Minerals" value={bankMinerals} />
            <StatPill label="Scrap" value={bankScrap} />
          </div>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.10)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Level</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {levels.map((lvl) => {
            const isUnlocked = unlockedLevels[lvl];
            const isSelected = selectedLevelId === lvl;

            return (
              <button
                key={lvl}
                type="button"
                disabled={!isUnlocked}
                onClick={() => {
                  audio.playMenuClick();
                  selectLevel(lvl);
                }}
                style={{
                  width: 44,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: isSelected ? 'rgba(120,160,255,0.22)' : 'rgba(0,0,0,0.25)',
                  color: isUnlocked ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
                  cursor: isUnlocked ? 'pointer' : 'not-allowed'
                }}
              >
                {lvl}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          audio.playWarp();
          onGoToMine();
        }}
        style={{
          height: 48,
          padding: '0 18px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(80,180,140,0.28)',
          color: 'rgba(255,255,255,0.95)',
          cursor: 'pointer',
          fontWeight: 700
        }}
      >
        Go to mine
      </button>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.25)',
        color: 'rgba(255,255,255,0.9)'
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}


