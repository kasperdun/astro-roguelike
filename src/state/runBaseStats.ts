import { GAME_CONFIG } from '../config/gameConfig';

export type RunBaseStats = {
    startHp: number;
    startFuel: number;
    asteroidsSpawnIntervalSec: number;
    asteroidsMaxCount: number;
    asteroidExplosionDamage: number;
    bulletDamage: number;
    bulletLifetimeSec: number;
    bulletSpeedPxPerSec: number;
    weaponFireRatePerSec: number;
    shipAccelPxPerSec2: number;
    shipMaxSpeedPxPerSec: number;
    fuelDrainPerSec: number;
    fuelDrainWhileThrustPerSec: number;
    fuelDrainPerShot: number;
    shieldRegenDelaySec: number;
    pickupMagnetRadiusPx: number;
};

export function getRunBaseStats(): RunBaseStats {
    return {
        startHp: GAME_CONFIG.shipStartHp,
        startFuel: GAME_CONFIG.shipStartFuel,
        asteroidsSpawnIntervalSec: GAME_CONFIG.asteroidsSpawnIntervalSec,
        asteroidsMaxCount: GAME_CONFIG.asteroidsMaxCount,
        asteroidExplosionDamage: 0,
        bulletDamage: GAME_CONFIG.bulletDamage,
        bulletLifetimeSec: GAME_CONFIG.bulletLifetimeSec,
        bulletSpeedPxPerSec: GAME_CONFIG.bulletSpeedPxPerSec,
        weaponFireRatePerSec: GAME_CONFIG.weaponFireRatePerSec,
        shipAccelPxPerSec2: GAME_CONFIG.shipAccelPxPerSec2,
        shipMaxSpeedPxPerSec: GAME_CONFIG.shipMaxSpeedPxPerSec,
        fuelDrainPerSec: GAME_CONFIG.fuelDrainPerSec,
        fuelDrainWhileThrustPerSec: GAME_CONFIG.fuelDrainWhileThrustPerSec,
        fuelDrainPerShot: GAME_CONFIG.fuelDrainPerShot,
        shieldRegenDelaySec: 0.7,
        pickupMagnetRadiusPx: GAME_CONFIG.pickupMagnetRadiusPx
    };
}


