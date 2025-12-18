import {
    getUpgradeCostForLevel,
    type PurchaseResult,
    type UpgradeAvailability,
    type UpgradeNode
} from '../../../../../progression/upgrades';

export function buildTooltipText(args: {
    node: UpgradeNode;
    purchased: number;
    availability: UpgradeAvailability;
    purchaseCheck: PurchaseResult;
}): string {
    const { node, purchased, availability } = args;

    const lines: string[] = [];
    lines.push(node.title);
    lines.push(node.description);
    lines.push('');

    const isMaxed = purchased >= node.maxLevel;
    const nextCost = isMaxed ? null : getUpgradeCostForLevel(node.id, purchased + 1);

    lines.push(`Level: ${purchased}/${node.maxLevel}`);

    if (node.requires.length) {
        lines.push(`Requires: ${node.requires.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }
    if (availability.kind === 'locked') {
        lines.push(`Missing: ${availability.missing.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }

    return lines.join('\n');
}
