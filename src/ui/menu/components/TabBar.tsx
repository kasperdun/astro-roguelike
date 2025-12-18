import { useGameStore, type MenuTabId } from '../../../state/gameStore';

const tabs: Array<{ id: MenuTabId; label: string }> = [
  { id: 'update', label: 'Update' },
  { id: 'craft', label: 'Craft' },
  { id: 'quests', label: 'Quests' }
];

export function TabBar() {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  return (
    <div
      style={{
        display: 'flex',
        gap: 8
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === activeTab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
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
  );
}


