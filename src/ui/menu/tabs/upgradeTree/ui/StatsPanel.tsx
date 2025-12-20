import type { deriveRunStats } from '../../../../../progression/upgrades';
import type { RunBaseStats } from '../../../../../state/runBaseStats';

export function StatsPanel({
    base,
    derived
}: {
    base: RunBaseStats;
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
            {line('Снарядов за выстрел', 1, derived.projectilesPerShot - 1)}
            {line('Скорострельность (выстр/с)', base.weaponFireRatePerSec, derived.weaponFireRatePerSec - base.weaponFireRatePerSec, (n) => n.toFixed(2))}
            {line('Скорость пули', base.bulletSpeedPxPerSec, derived.bulletSpeedPxPerSec - base.bulletSpeedPxPerSec)}
            {line('Дальность (время жизни)', base.bulletLifetimeSec, derived.bulletLifetimeSec - base.bulletLifetimeSec, (n) => n.toFixed(2))}

            {line('Здоровье', base.startHp, derived.maxHp - base.startHp)}
            {line('Топливо', base.startFuel, derived.maxFuel - base.startFuel)}
            {line('Реген топлива', 0, derived.fuelRegenPerSec, (n) => n.toFixed(2))}

            {line('Щит', 0, derived.maxShield)}
            {line('Реген щита', 0, derived.shieldRegenPerSec, (n) => n.toFixed(2))}
            {line('Задержка регена щита (с)', base.shieldRegenDelaySec, derived.shieldRegenDelaySec - base.shieldRegenDelaySec, (n) => n.toFixed(2))}

            {line('Ускорение корабля', base.shipAccelPxPerSec2, derived.shipAccelPxPerSec2 - base.shipAccelPxPerSec2)}
            {line('Скорость корабля', base.shipMaxSpeedPxPerSec, derived.shipMaxSpeedPxPerSec - base.shipMaxSpeedPxPerSec)}

            {line('Расход топлива (с)', base.fuelDrainPerSec, derived.fuelDrainPerSec - base.fuelDrainPerSec, (n) => n.toFixed(2))}
            {line('Расход топлива (тяга)', base.fuelDrainWhileThrustPerSec, derived.fuelDrainWhileThrustPerSec - base.fuelDrainWhileThrustPerSec, (n) => n.toFixed(2))}
            {line('Расход топлива (выстрел)', base.fuelDrainPerShot, derived.fuelDrainPerShot - base.fuelDrainPerShot, (n) => n.toFixed(2))}

            {line('Шанс дропа топлива', 0, derived.fuelDropChance, (n) => `${Math.round(n * 100)}%`)}
            {line('Шанс дропа здоровья', 0, derived.healthDropChance, (n) => `${Math.round(n * 100)}%`)}
            {line('Шанс дропа магнита', 0, derived.magnetDropChance, (n) => `${Math.round(n * 100)}%`)}

            {line('Радиус подбора (px)', base.pickupMagnetRadiusPx, derived.pickupMagnetRadiusPx - base.pickupMagnetRadiusPx)}

            {line('Бонус минералов (астероид)', 0, derived.asteroidMineralYieldBonus)}
            {line('Бонус минералов (враг)', 0, derived.enemyMineralYieldBonus)}

            {line('Интервал спавна астероидов (с)', base.asteroidsSpawnIntervalSec, derived.asteroidsSpawnIntervalSec - base.asteroidsSpawnIntervalSec, (n) => n.toFixed(2))}
            {line('Макс. астероидов', base.asteroidsMaxCount, derived.asteroidsMaxCount - base.asteroidsMaxCount)}
            {line('AOE урон астероида', base.asteroidExplosionDamage, derived.asteroidExplosionDamage - base.asteroidExplosionDamage)}
            {line('AOE радиус (бонус px)', 0, derived.asteroidExplosionRadiusBonusPx)}

            {line('Снижение урона от столкновений', 0, 1 - derived.collisionDamageMultiplier, (n) => `${Math.round(n * 100)}%`)}
        </div>
    );
}




