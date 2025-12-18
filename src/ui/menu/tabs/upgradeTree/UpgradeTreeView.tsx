import { useEffect, useMemo, useRef, useState, type PointerEvent, type SVGProps } from 'react';
import { useGameStore } from '../../../../state/gameStore';
import { GAME_CONFIG } from '../../../../config/gameConfig';
import {
    UPGRADES,
    canPurchaseUpgrade,
    deriveRunStats,
    getUpgradeAvailability,
    getPurchasedLevel,
    getUpgradeCostForLevel,
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
    const savedViewport = useGameStore((s) => s.upgradeTreeViewport);
    const setSavedViewport = useGameStore((s) => s.setUpgradeTreeViewport);

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState<Viewport>(savedViewport ?? { tx: 0, ty: 0, scale: 1 });
    const viewportRef = useRef<Viewport>(savedViewport ?? { tx: 0, ty: 0, scale: 1 });
    const [drag, setDrag] = useState<{ lastClient: Vec2 } | null>(null);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [lastMsg, setLastMsg] = useState<string | null>(null);

    // Depend on UPGRADES so layout is recalculated on HMR / tree changes.
    const layout: Layout = useMemo(() => buildLayout(UPGRADES), [UPGRADES]);

    // If we already have a saved camera, restore it (e.g. after leaving the run back to menu).
    useEffect(() => {
        if (!savedViewport) return;
        viewportRef.current = savedViewport;
        setViewport(savedViewport);
    }, [savedViewport?.tx, savedViewport?.ty, savedViewport?.scale]);

    // Keep ref in sync so event handlers always see latest viewport without relying on functional updaters.
    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport.tx, viewport.ty, viewport.scale]);

    const commitViewport = (next: Viewport) => {
        viewportRef.current = next;
        setViewport(next);
        setSavedViewport(next);
    };

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const resize = () => {
            const rect = el.getBoundingClientRect();

            // Center root as the main hub; fallback to layout bounds center if missing.
            const hubId: UpgradeId = 'weapon_damage';
            const hub = layout.nodeCenter[hubId] ?? {
                x: (layout.bounds.minX + layout.bounds.maxX) / 2,
                y: (layout.bounds.minY + layout.bounds.maxY) / 2
            };

            const targetScale = 1;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const tx = cx - hub.x * targetScale;
            const ty = cy - hub.y * targetScale;

            // Important: do NOT recenter if user already positioned the camera.
            // This prevents viewport reset when the layout container size changes (e.g. after purchase message appears).
            if (savedViewport) return;
            const next = { tx, ty, scale: targetScale };
            commitViewport(next);
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        return () => ro.disconnect();
    }, [
        layout.bounds.maxX,
        layout.bounds.maxY,
        layout.bounds.minX,
        layout.bounds.minY,
        layout.nodeCenter,
        savedViewport,
        setSavedViewport
    ]);

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

            const v = viewportRef.current;
            const zoomIntensity = 0.0012;
            const factor = Math.exp(-e.deltaY * zoomIntensity);
            const nextScale = clamp(v.scale * factor, 0.45, 2.6);

            // Zoom around cursor.
            const wx = (sx - v.tx) / v.scale;
            const wy = (sy - v.ty) / v.scale;
            const nextTx = sx - wx * nextScale;
            const nextTy = sy - wy * nextScale;
            commitViewport({ tx: nextTx, ty: nextTy, scale: nextScale });
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
        const v = viewportRef.current;
        commitViewport({ ...v, tx: v.tx + dx, ty: v.ty + dy });
    };

    const onPointerUpOrCancel = () => setDrag(null);

    const base = useMemo(
        () => ({
            startHp: GAME_CONFIG.shipStartHp,
            startFuel: GAME_CONFIG.shipStartFuel,
            bulletDamage: GAME_CONFIG.bulletDamage,
            bulletLifetimeSec: GAME_CONFIG.bulletLifetimeSec,
            bulletSpeedPxPerSec: GAME_CONFIG.bulletSpeedPxPerSec,
            weaponFireRatePerSec: GAME_CONFIG.weaponFireRatePerSec,
            shipAccelPxPerSec2: GAME_CONFIG.shipAccelPxPerSec2,
            shipMaxSpeedPxPerSec: GAME_CONFIG.shipMaxSpeedPxPerSec,
            fuelDrainPerSec: GAME_CONFIG.fuelDrainPerSec,
            fuelDrainWhileThrustPerSec: GAME_CONFIG.fuelDrainWhileThrustPerSec,
            fuelDrainPerShot: GAME_CONFIG.fuelDrainPerShot,
            shieldRegenDelaySec: 0.7
        }),
        []
    );

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

            <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
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
                                bankMinerals,
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
                                            {isMaxed ? 'MAX' : getUpgradeCostForLevel(u.id, level + 1)}
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
                                purchased: getPurchasedLevel(purchasedUpgrades, tooltip.nodeId),
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

                <StatsPanel base={base} derived={derived} />
            </div>
        </div>
    );
}

function StatsPanel({
    base,
    derived
}: {
    base: {
        startHp: number;
        startFuel: number;
        bulletDamage: number;
        bulletLifetimeSec: number;
        bulletSpeedPxPerSec: number;
        weaponFireRatePerSec: number;
        shipMaxSpeedPxPerSec: number;
    };
    derived: ReturnType<typeof deriveRunStats>;
}) {
    const line = (
        label: string,
        baseValue: number,
        bonusValue: number,
        fmt: (n: number) => string = (n) => `${Math.round(n)}`
    ) => {
        const eps = 1e-6;
        const showBonus = Math.abs(bonusValue) > eps;
        return (
            <div key={label} style={{ lineHeight: 1.55, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ opacity: 0.92 }}>{label} </span>
                <span style={{ fontWeight: 800 }}>{fmt(baseValue)} </span>
                {showBonus ? (
                    <span style={{ color: '#32e28c', fontWeight: 800 }}>
                        ({bonusValue >= 0 ? '+' : ''}
                        {fmt(bonusValue)})
                    </span>
                ) : null}
            </div>
        );
    };

    return (
        <div
            style={{
                width: 320,
                flex: '0 0 320px',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.18)',
                padding: '12px 12px',
                overflow: 'auto'
            }}
        >
            <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>Статы</div>

            {line('Урон', base.bulletDamage, derived.bulletDamage - base.bulletDamage)}
            {line('Здоровье', base.startHp, derived.maxHp - base.startHp)}
            {line('Топливо', base.startFuel, derived.maxFuel - base.startFuel)}
            {line('Скорострельность', base.weaponFireRatePerSec, derived.weaponFireRatePerSec - base.weaponFireRatePerSec, (n) => n.toFixed(2))}
            {line('Скорость пули', base.bulletSpeedPxPerSec, derived.bulletSpeedPxPerSec - base.bulletSpeedPxPerSec)}
            {line('Дальность (время жизни)', base.bulletLifetimeSec, derived.bulletLifetimeSec - base.bulletLifetimeSec, (n) => n.toFixed(2))}
            {line('Скорость корабля', base.shipMaxSpeedPxPerSec, derived.shipMaxSpeedPxPerSec - base.shipMaxSpeedPxPerSec)}
            {line('Реген топлива', 0, derived.fuelRegenPerSec, (n) => n.toFixed(2))}
            {line('Щит', 0, derived.maxShield)}
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
    purchased: number;
    purchaseCheck: PurchaseResult;
    availability: ReturnType<typeof getUpgradeAvailability>;
}): string {
    const { node, bankMinerals, purchased, purchaseCheck, availability } = args;

    const lines: string[] = [];
    lines.push(node.title);
    lines.push(node.description);
    lines.push('');

    const isMaxed = purchased >= node.maxLevel;
    const nextCost = isMaxed ? null : getUpgradeCostForLevel(node.id, purchased + 1);

    lines.push(`Level: ${purchased}/${node.maxLevel}`);
    lines.push(`Next cost: ${nextCost ?? 'MAX'} minerals`);

    if (node.requires.length) {
        lines.push(`Requires: ${node.requires.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }
    if (availability.kind === 'locked') {
        lines.push(`Missing: ${availability.missing.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }

    return lines.join('\n');
}

function renderPurchaseMessage(res: PurchaseResult): string {
    if (res.ok) return 'Purchased! Combat/movement bonuses apply on next run start (economy bonuses apply immediately).';

    if (res.reason === 'maxed') return 'Already maxed.';
    if (res.reason === 'locked') return `Locked. Missing: ${res.missing.map((m) => `${m.id} (lvl ${m.level})`).join(', ')}`;
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
            const from = nodeCenter[req.id];
            const to = nodeCenter[n.id];
            if (!from || !to) continue;
            edges.push({
                key: `${req.id}->${n.id}`,
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

    void icon;
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


