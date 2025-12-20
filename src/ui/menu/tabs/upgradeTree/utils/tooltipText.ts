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
    const { node, purchased, availability, purchaseCheck } = args;

    const lines: string[] = [];
    lines.push(node.title);
    lines.push(node.description);
    lines.push('');

    const isMaxed = purchased >= node.maxLevel;
    const nextCost = isMaxed ? null : getUpgradeCostForLevel(node.id, purchased + 1);

    lines.push(`Level: ${purchased}/${node.maxLevel}`);
    if (nextCost != null) {
        const cur = node.cost.currency === 'scrap' ? 'Scrap' : node.cost.currency === 'core' ? 'Core' : 'Minerals';
        lines.push(`Next cost: ${nextCost} ${cur}`);
    }

    if (node.requires.length) {
        lines.push(`Requires: ${node.requires.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }
    if (availability.kind === 'locked') {
        lines.push(`Missing: ${availability.missing.map((r) => `${r.id} (lvl ${r.level})`).join(', ')}`);
    }

    if (!purchaseCheck.ok) {
        if (purchaseCheck.reason === 'not_enough_minerals') lines.push(`Need minerals: ${purchaseCheck.needed} (have ${purchaseCheck.have})`);
        if (purchaseCheck.reason === 'not_enough_scrap') lines.push(`Need scrap: ${purchaseCheck.needed} (have ${purchaseCheck.have})`);
        if (purchaseCheck.reason === 'not_enough_cores') lines.push(`Need cores: ${purchaseCheck.needed} (have ${purchaseCheck.have})`);
        if (purchaseCheck.reason === 'maxed') lines.push('Max level reached.');
    }

    return lines.join('\n');
}
