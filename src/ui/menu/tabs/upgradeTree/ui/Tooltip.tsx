import type { Vec2 } from '../upgradeTreeTypes';

export function Tooltip({ atClient, content }: { atClient: Vec2; content: string }) {
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


