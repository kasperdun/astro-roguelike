import { useEffect, useMemo, useRef, useState, type PointerEvent, type SVGProps } from 'react';
import { useGameStore } from '../../../../state/gameStore';
import {
    UPGRADES,
    canPurchaseUpgrade,
    getUpgradeAvailability,
    type PurchaseResult,
    type UpgradeId,
    type UpgradeNode
} from '../../../../progression/upgrades';

type Viewport = { tx: number; ty: number; scale: number };
type Vec2 = { x: number; y: number };

type NodeUiState = 'maxed' | 'available_can_buy' | 'available_cant_buy' | 'locked';

type Layout = {
    nodeCenter: Record<UpgradeId, Vec2>;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    edges: Array<{ key: string; from: Vec2; to: Vec2; locked: boolean }>;
};

type TooltipState = {
    nodeId: UpgradeId;
    atClient: Vec2;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function UpgradeTreeView() {
    const bankMinerals = useGameStore((s) => s.bankMinerals);
    const purchasedUpgrades = useGameStore((s) => s.purchasedUpgrades);
    const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, scale: 1 });
    const [drag, setDrag] = useState<{ lastClient: Vec2 } | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [lastMsg, setLastMsg] = useState<string | null>(null);

    const layout: Layout = useMemo(() => buildLayout(UPGRADES), []);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const resize = () => {
            const rect = el.getBoundingClientRect();

            // Center "hull_1" as the main hub; fallback to layout bounds center if missing.
            const hubId: UpgradeId = 'hull_1';
            const hub = layout.nodeCenter[hubId] ?? {
                x: (layout.bounds.minX + layout.bounds.maxX) / 2,
                y: (layout.bounds.minY + layout.bounds.maxY) / 2
            };

            const targetScale = 1;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const tx = cx - hub.x * targetScale;
            const ty = cy - hub.y * targetScale;
            setViewport({ tx, ty, scale: targetScale });
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        return () => ro.disconnect();
    }, [layout.bounds.maxX, layout.bounds.maxY, layout.bounds.minX, layout.bounds.minY, layout.nodeCenter]);

    // IMPORTANT: React attaches 'wheel' listeners as passive, so calling preventDefault inside onWheel
    // triggers "Unable to preventDefault inside passive event listener". We attach a native listener
    // with { passive: false } to support smooth zoom without page scroll.
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const onWheelNative = (e: globalThis.WheelEvent) => {
            e.preventDefault();

            const rect = el.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            setViewport((v) => {
                const zoomIntensity = 0.0012;
                const factor = Math.exp(-e.deltaY * zoomIntensity);
                const nextScale = clamp(v.scale * factor, 0.45, 2.6);

                // Zoom around cursor.
                const wx = (sx - v.tx) / v.scale;
                const wy = (sy - v.ty) / v.scale;
                const nextTx = sx - wx * nextScale;
                const nextTy = sy - wy * nextScale;
                return { tx: nextTx, ty: nextTy, scale: nextScale };
            });
        };

        el.addEventListener('wheel', onWheelNative, { passive: false });
        return () => el.removeEventListener('wheel', onWheelNative);
    }, []);

    const tryPurchase = (id: UpgradeId) => {
        const res = purchaseUpgrade(id);
        setLastMsg(renderPurchaseMessage(res));
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        // Pan with LMB or RMB.
        if (e.button !== 0 && e.button !== 2) return;
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setDrag({ lastClient: { x: e.clientX, y: e.clientY } });
        setTooltip(null);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!drag) return;
        e.preventDefault();
        const next = { x: e.clientX, y: e.clientY };
        const dx = next.x - drag.lastClient.x;
        const dy = next.y - drag.lastClient.y;
        setDrag({ lastClient: next });
        setViewport((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
    };

    const onPointerUpOrCancel = () => setDrag(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Upgrades</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                    Minerals: <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{bankMinerals}</span>
                </div>
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
                ref={wrapRef}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={onPointerDown}
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
                    userSelect: 'none'
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
                        {layout.edges.map((e) => (
                            <line
                                key={e.key}
                                x1={e.from.x - layout.bounds.minX}
                                y1={e.from.y - layout.bounds.minY}
                                x2={e.to.x - layout.bounds.minX}
                                y2={e.to.y - layout.bounds.minY}
                                stroke={e.locked ? '#2a2f43' : '#4a557a'}
                                strokeWidth={2}
                            />
                        ))}
                    </svg>

                    {/* Nodes */}
                    {UPGRADES.map((u) => {
                        const availability = getUpgradeAvailability(purchasedUpgrades, u.id);
                        const purchaseCheck = canPurchaseUpgrade({
                            purchased: purchasedUpgrades,
                            minerals: bankMinerals,
                            id: u.id
                        });

                        const state: NodeUiState = purchasedUpgrades[u.id]
                            ? 'maxed'
                            : availability.kind === 'locked'
                                ? 'locked'
                                : purchaseCheck.ok
                                    ? 'available_can_buy'
                                    : 'available_cant_buy';

                        const center = layout.nodeCenter[u.id];
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
                        const canBuy = state === 'available_can_buy';
                        const isClickable = !isLocked && !isMaxed;

                        const tooltipText = buildTooltipText({
                            node: u,
                            bankMinerals,
                            purchased: purchasedUpgrades[u.id] ? 1 : 0,
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
                                onMouseMove={(e) => tooltip && tooltip.nodeId === u.id && setTooltip({ nodeId: u.id, atClient: { x: e.clientX, y: e.clientY } })}
                                onMouseLeave={() => setTooltip(null)}
                                disabled={!isClickable}
                                onClick={() => tryPurchase(u.id)}
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
                                        {isMaxed ? 'MAX' : u.costMinerals}
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
                            node: getNodeById(tooltip.nodeId),
                            bankMinerals,
                            purchased: purchasedUpgrades[tooltip.nodeId] ? 1 : 0,
                            purchaseCheck: canPurchaseUpgrade({ purchased: purchasedUpgrades, minerals: bankMinerals, id: tooltip.nodeId }),
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
        </div>
    );
}

function getNodeById(id: UpgradeId): UpgradeNode {
    const found = UPGRADES.find((u) => u.id === id);
    if (!found) throw new Error(`Unknown upgrade id: ${id}`);
    return found;
}

function buildTooltipText(args: {
    node: UpgradeNode;
    bankMinerals: number;
    purchased: number; // 0/1 for MVP nodes
    purchaseCheck: PurchaseResult;
    availability: ReturnType<typeof getUpgradeAvailability>;
}): string {
    const { node, bankMinerals, purchased, purchaseCheck, availability } = args;

    const lines: string[] = [];
    lines.push(node.title);
    lines.push(node.description);
    lines.push('');

    lines.push(`Cost: ${node.costMinerals} minerals`);
    lines.push(`Upgrades: ${purchased}/1`);

    if (node.requires.length) lines.push(`Requires: ${node.requires.join(', ')}`);
    if (availability.kind === 'locked') lines.push(`Missing: ${availability.missing.join(', ')}`);

    return lines.join('\n');
}

function renderPurchaseMessage(res: PurchaseResult): string {
    if (res.ok) return 'Purchased! Bonuses will apply on next run start.';

    if (res.reason === 'already_bought') return 'Already purchased.';
    if (res.reason === 'locked') return `Locked. Missing: ${res.missing.join(', ')}`;
    if (res.reason === 'not_enough_minerals') return `Not enough minerals: need ${res.needed}, have ${res.have}.`;

    return 'Cannot purchase.';
}

function buildLayout(nodes: readonly UpgradeNode[]): Layout {
    const spacingX = 120;
    const spacingY = 98;

    const nodeCenter: Record<UpgradeId, Vec2> = {} as Record<UpgradeId, Vec2>;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const n of nodes) {
        const x = n.pos.col * spacingX;
        const y = n.pos.row * spacingY;
        nodeCenter[n.id] = { x, y };
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    // Add some padding so nodes aren't on the exact edge of bounds.
    const pad = 140;
    const bounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };

    const edges: Layout['edges'] = [];
    for (const n of nodes) {
        for (const req of n.requires) {
            const from = nodeCenter[req];
            const to = nodeCenter[n.id];
            edges.push({
                key: `${req}->${n.id}`,
                from,
                to,
                locked: false
            });
        }
    }

    return { nodeCenter, bounds, edges };
}

function UpgradeIconSvg({ icon }: { icon: UpgradeNode['icon'] }) {
    const common: SVGProps<SVGSVGElement> = {
        width: 22,
        height: 22,
        viewBox: '0 0 24 24',
        fill: 'none'
    };

    const stroke = 'rgba(255,255,255,0.92)';
    const strokeWidth = 2;

    if (icon === 'fuel') {
        return (
            <svg {...common}>
                <path d="M6 3h8v18H6V3Z" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M14 7h2l2 2v8a3 3 0 0 1-3 3h-1" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M8 7h4" stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
        );
    }

    if (icon === 'thrusters') {
        return (
            <svg {...common}>
                <path d="M12 3v8" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M7 11l5 3 5-3" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M9 14c0 3 1 6 3 7 2-1 3-4 3-7" stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
        );
    }

    if (icon === 'mining') {
        return (
            <svg {...common}>
                <path d="M4 12l6-6 4 4-6 6H4v-4Z" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M14 10l4 4" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M16 14l-2 2" stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
        );
    }

    if (icon === 'hull') {
        return (
            <svg {...common}>
                <path d="M12 3l7 4v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" stroke={stroke} strokeWidth={strokeWidth} />
                <path d="M12 6v14" stroke={stroke} strokeWidth={strokeWidth} opacity={0.6} />
            </svg>
        );
    }

    // core
    return (
        <svg {...common}>
            <circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth={strokeWidth} />
            <path d="M12 8v8M8 12h8" stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
    );
}

function Tooltip({ atClient, content }: { atClient: Vec2; content: string }) {
    const offset = 14;
    const maxW = 340;
    const x = atClient.x + offset;
    const y = atClient.y + offset;

    return (
        <div
            style={{
                position: 'fixed',
                left: x,
                top: y,
                width: maxW,
                pointerEvents: 'none',
                whiteSpace: 'pre-line',
                zIndex: 1000,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(5, 8, 14, 0.92)',
                backdropFilter: 'blur(6px)',
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.92)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.45)'
            }}
        >
            {content}
        </div>
    );
}


