import type { UpgradeId } from '../../../../progression/upgrades';

export type Viewport = { tx: number; ty: number; scale: number };
export type Vec2 = { x: number; y: number };

export type NodeUiState = 'maxed' | 'available_can_buy' | 'available_cant_buy' | 'locked';

export type Layout = {
    nodeCenter: Record<UpgradeId, Vec2>;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    edges: Array<{ key: string; from: Vec2; to: Vec2; locked: boolean }>;
};

export type TooltipState = {
    nodeId: UpgradeId;
    atClient: Vec2;
};





