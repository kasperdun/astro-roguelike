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
    lines.push(`Next cost: ${nextCost ?? 'MAX'} minerals`);

    if (node.requires.length) {
        lines.push(`Requires: ${node.requires.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }
    if (availability.kind === 'locked') {
        lines.push(`Missing: ${availability.missing.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }

    return lines.join('\n');
}

export function renderPurchaseMessage(res: PurchaseResult): string {
    if (res.ok) return 'Purchased! Combat/movement bonuses apply on next run start (economy bonuses apply immediately).';

    if (res.reason === 'maxed') return 'Already maxed.';
    if (res.reason === 'locked') return `Locked. Missing: ${res.missing.map((m) => `${m.id} (lvl ${m.level})`).join(', ')}`;
    if (res.reason === 'not_enough_minerals') return `Not enough minerals: need ${res.needed}, have ${res.have}.`;

    return 'Cannot purchase.';
}


