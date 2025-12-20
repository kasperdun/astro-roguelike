import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../../../state/gameStore';
import {
    UPGRADES,
    canPurchaseUpgrade,
    deriveRunStats,
    getUpgradeAvailability,
    getPurchasedLevel,
    getUpgradeCostForLevel,
    getUpgrade,
    type UpgradeId
} from '../../../../progression/upgrades';
import { getRunBaseStats } from '../../../../state/runBaseStats';
import { useUpgradeTreeViewport } from './hooks/useUpgradeTreeViewport';
import { buildUpgradeTreeLayout } from './layout/buildUpgradeTreeLayout';
import type { Layout, NodeUiState, TooltipState } from './upgradeTreeTypes';
import { StatsPanel } from './ui/StatsPanel';
import { Tooltip } from './ui/Tooltip';
import { UpgradeIconSvg } from './ui/UpgradeIconSvg';
import { buildTooltipText } from './utils/tooltipText';
import { audio } from '../../../../audio/audio';

export function UpgradeTreeView() {
    const bankMinerals = useGameStore((s) => s.bankMinerals);
    const bankScrap = useGameStore((s) => s.bankScrap);
    const bankCores = useGameStore((s) => s.bankCores);
    const purchasedUpgrades = useGameStore((s) => s.purchasedUpgrades);
    const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
    const savedViewport = useGameStore((s) => s.upgradeTreeViewport);
    const setSavedViewport = useGameStore((s) => s.setUpgradeTreeViewport);

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    // Depend on UPGRADES so layout is recalculated on HMR / tree changes.
    const layout: Layout = useMemo(() => buildUpgradeTreeLayout(UPGRADES), [UPGRADES]);

    const { viewport, onPointerDown: onViewportPointerDown, onPointerMove, onPointerUpOrCancel } = useUpgradeTreeViewport({
        wrapRef,
        layout,
        savedViewport,
        setSavedViewport
    });

    const tryPurchase = (id: UpgradeId) => {
        const res = purchaseUpgrade(id);
    };

    const base = useMemo(() => getRunBaseStats(), []);

    const derived = useMemo(
        () =>
            deriveRunStats({
                base,
                purchased: purchasedUpgrades
            }),
        [base, purchasedUpgrades]
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Upgrades</div>
                <div />
            </div>

            <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
                <div
                    ref={wrapRef}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                        setTooltip(null);
                        onViewportPointerDown(e);
                    }}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUpOrCancel}
                    onPointerCancel={onPointerUpOrCancel}
                    style={{
                        position: 'relative',
                        flex: 1,
                        border: '1px solid rgba(255,255,255,0.10)',
                        borderRadius: 12,
                        background: 'rgba(0,0,0,0.18)',
                        overflow: 'hidden',
                        touchAction: 'none',
                        userSelect: 'none',
                        minHeight: 0
                    }}
                >
                    {/* World layer */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
                            transformOrigin: '0 0'
                        }}
                    >
                        {/* Edges */}
                        <svg
                            width={layout.bounds.maxX - layout.bounds.minX}
                            height={layout.bounds.maxY - layout.bounds.minY}
                            style={{
                                position: 'absolute',
                                left: layout.bounds.minX,
                                top: layout.bounds.minY,
                                overflow: 'visible',
                                pointerEvents: 'none'
                            }}
                        >
                            {layout.edges.map((e) => {
                                // Extra guard: protects UI from stale layout during HMR or broken definitions.
                                if (!e.from || !e.to) return null;
                                return (
                                    <line
                                        key={e.key}
                                        x1={e.from.x - layout.bounds.minX}
                                        y1={e.from.y - layout.bounds.minY}
                                        x2={e.to.x - layout.bounds.minX}
                                        y2={e.to.y - layout.bounds.minY}
                                        stroke={e.locked ? '#2a2f43' : '#4a557a'}
                                        strokeWidth={2}
                                    />
                                );
                            })}
                        </svg>

                        {/* Nodes */}
                        {UPGRADES.map((u) => {
                            const availability = getUpgradeAvailability(purchasedUpgrades, u.id);
                            const level = getPurchasedLevel(purchasedUpgrades, u.id);
                            const purchaseCheck = canPurchaseUpgrade({
                                purchased: purchasedUpgrades,
                                minerals: bankMinerals,
                                scrap: bankScrap,
                                cores: bankCores,
                                id: u.id
                            });

                            const state: NodeUiState = level >= u.maxLevel
                                ? 'maxed'
                                : availability.kind === 'locked'
                                    ? 'locked'
                                    : purchaseCheck.ok
                                        ? 'available_can_buy'
                                        : 'available_cant_buy';

                            const center = layout.nodeCenter[u.id];
                            if (!center) return null;
                            const size = 56;

                            const border =
                                state === 'maxed'
                                    ? '#ffd25a'
                                    : state === 'available_can_buy'
                                        ? '#32e28c'
                                        : state === 'available_cant_buy'
                                            ? '#ff5a5a'
                                            : '#2d344a';

                            const bg =
                                state === 'maxed'
                                    ? '#2b2412'
                                    : state === 'available_can_buy'
                                        ? '#102418'
                                        : state === 'available_cant_buy'
                                            ? '#2a1214'
                                            : '#0b1020';

                            const isLocked = state === 'locked';
                            const isMaxed = state === 'maxed';
                            const isClickable = !isLocked && !isMaxed;

                            const tooltipText = buildTooltipText({
                                node: u,
                                purchased: level,
                                purchaseCheck,
                                availability
                            });

                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseEnter={(e) => {
                                        const el = wrapRef.current;
                                        if (!el) return;
                                        setTooltip({ nodeId: u.id, atClient: { x: e.clientX, y: e.clientY } });
                                    }}
                                    onMouseMove={(e) =>
                                        tooltip && tooltip.nodeId === u.id && setTooltip({ nodeId: u.id, atClient: { x: e.clientX, y: e.clientY } })
                                    }
                                    onMouseLeave={() => setTooltip(null)}
                                    aria-disabled={!isClickable}
                                    onClick={() => {
                                        if (!isClickable) return;
                                        audio.playMenuClick();
                                        tryPurchase(u.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: center.x - size / 2,
                                        top: center.y - size / 2,
                                        width: size,
                                        height: size,
                                        borderRadius: 12,
                                        border: `2px solid ${border}`,
                                        background: bg,
                                        color: '#eef1ff',
                                        cursor: isClickable ? 'pointer' : 'not-allowed',
                                        display: 'grid',
                                        placeItems: 'center',
                                        padding: 0
                                    }}
                                    aria-label={`${u.title}. ${tooltipText.replaceAll('\n', ' ')}`}
                                >
                                    <div style={{ display: 'grid', placeItems: 'center', gap: 6 }}>
                                        <UpgradeIconSvg icon={u.icon} />
                                        <div style={{ fontSize: 10, fontWeight: 800, lineHeight: 1, textAlign: 'center' }}>
                                            {isMaxed
                                                ? 'MAX'
                                                : `${getUpgradeCostForLevel(u.id, level + 1)} ${u.cost.currency === 'scrap' ? 'S' : u.cost.currency === 'core' ? 'C' : 'M'}`}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tooltip layer */}
                    {tooltip ? (
                        <Tooltip
                            atClient={tooltip.atClient}
                            content={buildTooltipText({
                                node: getUpgrade(tooltip.nodeId),
                                purchased: getPurchasedLevel(purchasedUpgrades, tooltip.nodeId),
                                purchaseCheck: canPurchaseUpgrade({
                                    purchased: purchasedUpgrades,
                                    minerals: bankMinerals,
                                    scrap: bankScrap,
                                    cores: bankCores,
                                    id: tooltip.nodeId
                                }),
                                availability: getUpgradeAvailability(purchasedUpgrades, tooltip.nodeId)
                            })}
                        />
                    ) : null}

                    {/* Small help */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 12,
                            bottom: 10,
                            fontSize: 12,
                            opacity: 0.65,
                            pointerEvents: 'none'
                        }}
                    >
                        Wheel: zoom • Drag LMB/RMB: pan
                    </div>
                </div>

                <StatsPanel base={base} derived={derived} />
            </div>
        </div>
    );
}

