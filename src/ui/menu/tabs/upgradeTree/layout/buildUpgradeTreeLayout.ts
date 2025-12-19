import type { UpgradeId, UpgradeNode } from '../../../../../progression/upgrades';
import type { Layout, Vec2 } from '../upgradeTreeTypes';

export function buildUpgradeTreeLayout(nodes: readonly UpgradeNode[]): Layout {
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




