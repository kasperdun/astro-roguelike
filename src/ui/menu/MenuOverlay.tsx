import { useGameStore } from '../../state/gameStore';
import { BottomBar } from './components/BottomBar';
import { TabBar } from './components/TabBar';
import { UpdateTab } from './tabs/UpdateTab';
import { CraftTab } from './tabs/CraftTab';
import { QuestsTab } from './tabs/QuestsTab';

type Props = {
  onGoToMine: () => void;
};

export function MenuOverlay({ onGoToMine }: Props) {
  const activeTab = useGameStore((s) => s.activeTab);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '24px 24px 110px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'auto'
        }}
      >
        <TabBar />

        <div
          style={{
            flex: 1,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 12,
            padding: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {activeTab === 'update' ? <UpdateTab /> : null}
          {activeTab === 'craft' ? <CraftTab /> : null}
          {activeTab === 'quests' ? <QuestsTab /> : null}
        </div>
      </div>

      <BottomBar onGoToMine={onGoToMine} />
    </div>
  );
}


