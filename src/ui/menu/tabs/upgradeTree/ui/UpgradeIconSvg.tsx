import type { SVGProps } from 'react';
import type { UpgradeNode } from '../../../../../progression/upgrades';

export function UpgradeIconSvg({ icon }: { icon: UpgradeNode['icon'] }) {
    const common: SVGProps<SVGSVGElement> = {
        width: 22,
        height: 22,
        viewBox: '0 0 24 24',
        fill: 'none'
    };

    const stroke = 'rgba(255,255,255,0.92)';
    const strokeWidth = 2;

    // Placeholder icon renderer.
    // When icons diversify, switch on `icon` and render distinct paths.
    void icon;
    return (
        <svg {...common}>
            <circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth={strokeWidth} />
            <path d="M12 8v8M8 12h8" stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
    );
}


