import { useMemo, useState } from 'react';
import { useGameStore } from '../../../state/gameStore';
import {
  UPGRADES,
  getUpgradeAvailability,
  type PurchaseResult,
  type UpgradeId,
  type UpgradeNode
} from '../../../progression/upgrades';

type NodeUiState = 'bought' | 'available' | 'locked';

export function UpdateTab() {
  const bankMinerals = useGameStore((s) => s.bankMinerals);
  const purchasedUpgrades = useGameStore((s) => s.purchasedUpgrades);
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);

  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const layout = useMemo(() => buildLayout(UPGRADES), []);

  const onBuy = (id: UpgradeId) => {
    const res = purchaseUpgrade(id);
    setLastMsg(renderPurchaseMessage(res));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Upgrades</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Minerals: <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{bankMinerals}</span>
        </div>
      </div>

      <div style={{ opacity: 0.82, lineHeight: 1.5, maxWidth: 820 }}>
        Клик по узлу — покупка. Узлы с требованиями подсвечиваются и блокируются, пока не куплены предыдущие.
        (MVP: эффекты пока влияют только на стартовые HP/Fuel.)
      </div>

      {lastMsg ? (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 12,
            opacity: 0.9
          }}
        >
          {lastMsg}
        </div>
      ) : null}

      <div
        style={{
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.18)',
          overflow: 'auto',
          padding: 14
        }}
      >
        <div style={{ position: 'relative', width: layout.widthPx, height: layout.heightPx }}>
          <svg
            width={layout.widthPx}
            height={layout.heightPx}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {layout.edges.map((e) => (
              <line
                key={e.key}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={2}
              />
            ))}
          </svg>

          {UPGRADES.map((u) => {
            const availability = getUpgradeAvailability(purchasedUpgrades, u.id);
            const state: NodeUiState = availability.kind;

            const isBought = state === 'bought';
            const isAvailable = state === 'available';
            const isLocked = state === 'locked';

            const tooltip =
              `${u.title}\n` +
              `${u.description}\n\n` +
              `Cost: ${u.costMinerals} minerals` +
              (u.requires.length ? `\nRequires: ${u.requires.join(', ')}` : '') +
              (isLocked ? `\nMissing: ${(availability.kind === 'locked' ? availability.missing : []).join(', ')}` : '');

            return (
              <UpgradeCard
                key={u.id}
                u={u}
                x={layout.nodeLeftPx[u.id]}
                y={layout.nodeTopPx[u.id]}
                state={state}
                disabled={!isAvailable}
                onBuy={() => onBuy(u.id)}
                tooltip={tooltip}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderPurchaseMessage(res: PurchaseResult): string {
  if (res.ok) return 'Purchased! Bonuses will apply on next run start.';

  if (res.reason === 'already_bought') return 'Already purchased.';
  if (res.reason === 'locked') return `Locked. Missing: ${res.missing.join(', ')}`;
  if (res.reason === 'not_enough_minerals') return `Not enough minerals: need ${res.needed}, have ${res.have}.`;

  // Exhaustive guard (should never happen)
  return 'Cannot purchase.';
}

function UpgradeCard(args: {
  u: UpgradeNode;
  x: number;
  y: number;
  state: NodeUiState;
  disabled: boolean;
  onBuy: () => void;
  tooltip: string;
}) {
  const { u, x, y, state, disabled, onBuy, tooltip } = args;

  const palette =
    state === 'bought'
      ? {
          border: 'rgba(80,180,140,0.45)',
          bg: 'rgba(80,180,140,0.16)',
          title: 'rgba(255,255,255,0.96)',
          sub: 'rgba(255,255,255,0.78)'
        }
      : state === 'available'
        ? {
            border: 'rgba(120,160,255,0.40)',
            bg: 'rgba(120,160,255,0.12)',
            title: 'rgba(255,255,255,0.96)',
            sub: 'rgba(255,255,255,0.78)'
          }
        : {
            border: 'rgba(255,255,255,0.10)',
            bg: 'rgba(0,0,0,0.25)',
            title: 'rgba(255,255,255,0.78)',
            sub: 'rgba(255,255,255,0.55)'
          };

  return (
    <button
      type="button"
      title={tooltip}
      disabled={disabled}
      onClick={onBuy}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 220,
        minHeight: 96,
        textAlign: 'left',
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: 12,
        background: palette.bg,
        color: palette.title,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{u.title}</div>
        <div style={{ fontSize: 12, opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
          {u.costMinerals}
        </div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6, lineHeight: 1.4, color: palette.sub }}>
        {u.description}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
        <div
          style={{
            height: 24,
            padding: '0 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.22)',
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            color: 'rgba(255,255,255,0.88)'
          }}
        >
          {state === 'bought' ? 'Bought' : state === 'available' ? 'Buy' : 'Locked'}
        </div>
        {u.requires.length ? (
          <div style={{ fontSize: 12, opacity: 0.6 }}>Req: {u.requires.join(', ')}</div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.6 }}>Req: —</div>
        )}
      </div>
    </button>
  );
}

function buildLayout(nodes: readonly UpgradeNode[]) {
  const cardW = 220;
  const cardMinH = 96;
  const gapX = 54;
  const gapY = 26;

  const maxCol = Math.max(...nodes.map((n) => n.pos.col));
  const maxRow = Math.max(...nodes.map((n) => n.pos.row));

  const widthPx = (maxCol + 1) * cardW + maxCol * gapX;
  const heightPx = (maxRow + 1) * cardMinH + maxRow * gapY;

  const nodeLeftPx: Record<UpgradeId, number> = {} as Record<UpgradeId, number>;
  const nodeTopPx: Record<UpgradeId, number> = {} as Record<UpgradeId, number>;

  for (const n of nodes) {
    nodeLeftPx[n.id] = n.pos.col * (cardW + gapX);
    nodeTopPx[n.id] = n.pos.row * (cardMinH + gapY);
  }

  const edges: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];
  for (const n of nodes) {
    for (const req of n.requires) {
      const x1 = nodeLeftPx[req] + cardW;
      const y1 = nodeTopPx[req] + cardMinH / 2;
      const x2 = nodeLeftPx[n.id];
      const y2 = nodeTopPx[n.id] + cardMinH / 2;
      edges.push({ key: `${req}->${n.id}`, x1, y1, x2, y2 });
    }
  }

  return { widthPx, heightPx, nodeLeftPx, nodeTopPx, edges };
}


