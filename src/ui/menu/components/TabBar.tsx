import { useGameStore, type MenuTabId } from '../../../state/gameStore';
import { audio } from '../../../audio/audio';

const tabs: Array<{ id: MenuTabId; label: string }> = [
  { id: 'update', label: 'Update' },
  { id: 'craft', label: 'Craft' },
  { id: 'quests', label: 'Quests' }
];

export function TabBar() {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const bankMinerals = useGameStore((s) => s.bankMinerals);
  const bankScrap = useGameStore((s) => s.bankScrap);
  const bankCores = useGameStore((s) => s.bankCores);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                audio.playMenuClick();
                setActiveTab(t.id);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: isActive ? 'rgba(120,160,255,0.22)' : 'rgba(0,0,0,0.25)',
                color: 'rgba(255,255,255,0.92)',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Bank</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <StatPill label="Minerals" value={bankMinerals} />
          <StatPill label="Scrap" value={bankScrap} />
          <StatPill label="Cores" value={bankCores} />
        </div>
      </div>
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


