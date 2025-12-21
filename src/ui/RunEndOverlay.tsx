import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useGameStore } from '../state/gameStore';
import { audio } from '../audio/audio';
import type { RunEndSummary } from '../state/gameStore/types';

export function RunEndOverlay() {
  const summary = useGameStore((s) => s.runEndSummary);
  const closeToMenu = useGameStore((s) => s.closeRunEndSummaryToMenu);
  const startRunAtLevel = useGameStore((s) => s.startRunAtLevel);

  const vm = useMemo(() => toViewModel(summary), [summary]);
  if (!summary) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Итоги сессии"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.62)'
      }}
    >
      <div
        style={{
          width: 'min(620px, 100%)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.70)',
          padding: 18
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{vm.title}</div>
          <div style={{ opacity: 0.85, fontSize: 12 }}>Уровень: {summary.levelId}</div>
        </div>

        <div style={{ height: 10 }} />

        <div style={{ fontSize: 13, opacity: 0.92 }}>{vm.subtitle}</div>

        <div style={{ height: 14 }} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10
          }}
        >
          <StatCard title="Сессия">
            <StatLine label="Длительность" value={formatTime(summary.timeSec)} />
            <StatLine label="Астероидов уничтожено" value={`${summary.asteroidsKilled}`} />
            <StatLine label="Врагов уничтожено" value={`${summary.enemiesKilled}`} />
          </StatCard>

          <StatCard title="Добыча">
            <StatLine label="Минералы" value={`${summary.minerals}`} />
            <StatLine label="Скрап" value={`${summary.scrap}`} />
            <StatLine label="Ядра" value={`${summary.cores}`} />
            <div style={{ height: 8 }} />
            <StatLine label="Топливо подобрано" value={`${summary.collected.fuel}`} />
            <StatLine label="Здоровье подобрано" value={`${summary.collected.health}`} />
          </StatCard>
        </div>

        <div style={{ height: 16 }} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              audio.playMenuClick();
              closeToMenu();
            }}
            style={btnStyle('neutral')}
          >
            К улучшениям
          </button>
          <button
            type="button"
            onClick={() => {
              audio.playMenuClick();
              startRunAtLevel(summary.levelId);
            }}
            style={btnStyle('primary')}
          >
            Рестарт уровня
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard(props: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.25)',
        padding: 12,
        minHeight: 130
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.95 }}>{props.title}</div>
      <div style={{ height: 8 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{props.children}</div>
    </div>
  );
}

function StatLine(props: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{props.label}</div>
      <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.95 }}>{props.value}</div>
    </div>
  );
}

function btnStyle(kind: 'primary' | 'neutral'): CSSProperties {
  const base: CSSProperties = {
    height: 44,
    padding: '0 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.95)',
    cursor: 'pointer',
    fontWeight: 900
  };
  if (kind === 'primary') return { ...base, background: 'rgba(80,180,140,0.30)' };
  return { ...base, background: 'rgba(0,0,0,0.25)' };
}

function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function toViewModel(summary: RunEndSummary | null): { title: string; subtitle: string } {
  if (!summary) return { title: 'Итоги', subtitle: '' };
  if (summary.outcome === 'victory') {
    return { title: 'Победа!', subtitle: 'Поздравляем! Босс уничтожен, добыча сохранена.' };
  }
  if (summary.reason === 'out_of_fuel') {
    return { title: 'Поражение', subtitle: 'Топливо закончилось. Попробуйте улучшить двигатель или экономию топлива.' };
  }
  if (summary.reason === 'death') {
    return { title: 'Поражение', subtitle: 'Корабль уничтожен. Попробуйте усилить броню/щит или повысить урон.' };
  }
  if (summary.reason === 'quit') {
    return { title: 'Сессия завершена', subtitle: 'Вы вышли из уровня.' };
  }
  return { title: 'Поражение', subtitle: 'Сессия завершена.' };
}


