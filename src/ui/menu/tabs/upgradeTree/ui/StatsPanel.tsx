import type { deriveRunStats } from '../../../../../progression/upgrades';
import type { RunBaseStats } from '../../../../../state/runBaseStats';

export function StatsPanel({
    base,
    derived
}: {
    base: Pick<
        RunBaseStats,
        'startHp' | 'startFuel' | 'bulletDamage' | 'bulletLifetimeSec' | 'bulletSpeedPxPerSec' | 'weaponFireRatePerSec' | 'shipMaxSpeedPxPerSec'
    >;
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


