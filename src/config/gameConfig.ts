export const GAME_CONFIG = {
    /** Стартовое здоровье корабля в начале уровня (MVP: заглушка). */
    shipStartHp: 10,

    /** Стартовое топливо в начале уровня (MVP: заглушка). */
    shipStartFuel: 35,

    /** Радиус корабля для коллизий (в пикселях). */
    shipCollisionRadiusPx: 14,

    /** Ускорение корабля (px/s^2). Влияет на “инерцию” управления. */
    shipAccelPxPerSec2: 900,

    /** Максимальная скорость корабля (px/s). Ограничивает разгон. */
    shipMaxSpeedPxPerSec: 160,

    /** “Трение”/демпфирование скорости (1/s). Чем больше — тем быстрее гасится скорость. */
    shipDampingPerSec: 2.8,

    /** Время неуязвимости после столкновения (сек). Нужна, чтобы не умереть за один кадр. */
    shipInvulnAfterHitSec: 0.35,

    /** Базовый расход топлива в секунду во время рана. */
    fuelDrainPerSec: 0.8,

    /** Дополнительный расход топлива в секунду, когда корабль ускоряется (WASD нажаты). */
    fuelDrainWhileThrustPerSec: 2.2,

    /** Расход топлива за один выстрел. */
    fuelDrainPerShot: 0.2,

    /** Скорострельность (выстрелов в секунду). */
    weaponFireRatePerSec: 2,

    /** Скорость пули (px/s). */
    bulletSpeedPxPerSec: 360,

    /** Время жизни пули (сек). Ограничивает дальность. */
    bulletLifetimeSec: 0.6,

    /** Радиус пули для коллизий (в пикселях). */
    bulletRadiusPx: 3,

    /** Урон пули по астероидам (MVP). */
    bulletDamage: 1,

    /** Сила “кинетического импульса” пули, передаваемого астероиду (0..1+). */
    bulletAsteroidImpulseFactor: 0.04,

    /** Потеря скорости астероида от каждого попадания (0..1). 0.06 = -6% скорости за hit. */
    bulletAsteroidHitSpeedLossFactor: 0.06,

    /** Минимальная доля “прогресса вперёд” астероида, которую нельзя потерять от одного хита (0..1). */
    bulletAsteroidMinForwardRetention: 0.7,

    /** Максимальная скорость астероида после импульсов/ударов (px/s). */
    asteroidMaxSpeedAfterHitPxPerSec: 40,

    /** Смещение точки вылета пули от центра корабля (px). */
    bulletMuzzleOffsetPx: 18,

    /** Боковое смещение для параллельных пуль при multi-shot (px). */
    bulletParallelOffsetPx: 12,

    /** Максимум астероидов одновременно (ограничение производительности). */
    asteroidsMaxCount: 8,

    /** Интервал спавна астероидов (сек). Чем меньше — тем плотнее поле. */
    asteroidsSpawnIntervalSec: 5.55,

    /** Минимальный радиус астероида (px). */
    asteroidMinRadiusPx: 36,

    /** Максимальный радиус астероида (px). */
    asteroidMaxRadiusPx: 59,

    /** HP астероида при минимальном радиусе (линейно растёт к max radius). */
    asteroidHpAtMinRadius: 3,

    /** HP астероида при максимальном радиусе (линейно растёт от min radius). */
    asteroidHpAtMaxRadius: 3,

    /** Шанс, что астероид будет вращаться (0..1). */
    asteroidSpinChance: 0.55,

    /** Минимальная модульная скорость вращения астероида (рад/сек). */
    asteroidSpinMinRadPerSec: 0.35,

    /** Максимальная модульная скорость вращения астероида (рад/сек). */
    asteroidSpinMaxRadPerSec: 1.65,

    /** Минимальная скорость астероида (px/s). */
    asteroidMinSpeedPxPerSec: 18,

    /** Максимальная скорость астероида (px/s). */
    asteroidMaxSpeedPxPerSec: 86,

    /** Урон кораблю при столкновении с астероидом (MVP). */
    asteroidCollisionDamage: 125,

    /** Сколько минералов выпадает за один разрушенный астероид (фиксировано для упрощения баланса). */
    asteroidDropMineralsPerAsteroid: 1,

    /** Шанс выпадения скрапа при разрушении астероида (0..1). */
    asteroidDropScrapChance: 0.22,

    /** Сколько скрапа выпадает (если выпал). */
    asteroidDropScrapAmount: 1,

    /** Сколько топлива даёт один fuel-pickup. */
    fuelPickupAmount: 6,

    /** Сколько здоровья даёт один health-pickup. */
    healthPickupAmount: 10,

    /** Базовый множитель радиуса AOE-взрыва астероида относительно его радиуса. */
    asteroidExplosionRadiusFromAsteroidMult: 1.35,

    /** Радиус “магнита” подбора лута (px). Внутри радиуса лут тянется к кораблю. */
    pickupMagnetRadiusPx: 40,

    /** Сила притяжения лута к кораблю (px/s^2). */
    pickupMagnetAccelPxPerSec2: 1200,

    /** Скорость затухания скорости лута (1/s). */
    pickupDampingPerSec: 2.0,

    /** Скорость warp-влёта (чем больше — тем быстрее прилетает корабль в центр). */
    warpInDurationSec: 0.6,

    /** Начальное количество астероидов при старте сцены (чтобы сразу было “живенько”). */
    asteroidsInitialCount: 4,

    // -----------------------------
    // Enemies (combat layer)
    // -----------------------------

    /** Стартовая задержка перед первым спавном врагов после начала рана (сек). */
    enemiesSpawnStartAfterSec: 6,

    /** Максимум врагов одновременно (ограничение производительности и читаемости боя). */
    enemiesMaxCount: 4,

    /** Базовый интервал спавна врагов (сек). Может быть ускорен прогрессом (kills/time). */
    enemiesSpawnIntervalSec: 7.5,

    /** Насколько спавн ускоряется от каждого убийства врага (сек). */
    enemiesSpawnIntervalReducePerKillSec: 0.15,

    /** Минимально возможный интервал спавна врагов (сек). */
    enemiesSpawnIntervalMinSec: 2.6,

    /** Сколько минералов выпадает за убитого врага (база). */
    enemyDropMineralsPerEnemy: 2,

    /** Шанс выпадения скрапа при убийстве врага (0..1). */
    enemyDropScrapChance: 0.42,

    /** Сколько скрапа выпадает (если выпал). */
    enemyDropScrapAmount: 1,

    // -----------------------------
    // Boss
    // -----------------------------

    /**
     * Сколько "прогресса" нужно набрать, чтобы появился босс.
     * Прогресс набирается за убийства: астероиды дают мало, враги — больше.
     */
    bossProgressRequired: 120,

    /** Сколько прогресса даёт убийство астероида (мало). */
    bossProgressPerAsteroidKill: 2,

    /** Сколько прогресса даёт убийство врага (заметно больше). */
    bossProgressPerEnemyKill: 10,

    /** Задержка (сек) после убийства босса перед завершением рана победой (чтобы собрать лут). */
    bossVictoryDelaySec: 3.2,

    /** Дроп минералов с босса (шт). */
    bossDropMinerals: 40,

    /** Дроп скрапа с босса (шт). */
    bossDropScrap: 8,

    /** Дроп ядер с босса (шт). */
    bossDropCores: 1

    ,
    // -----------------------------
    // Level scaling (difficulty)
    // -----------------------------
    /**
     * Настройки сложности по уровням.
     *
     * Важно:
     * - Уровень 1: очень маленькие числа (урон=1, астероиды стартуют с 3 HP).
     * - Уровень 2: резкий скачок (астероидам старт от 30 HP, враги/босс сильнее и живучее).
     * - “Со временем”: новые астероиды постепенно спавнятся с большим HP.
     */
    levelBalance: {
        1: {
            asteroidHpStartMin: 3,
            asteroidHpStartMax: 3,
            asteroidHpRampEverySec: 8,
            asteroidHpRampPerStep: 1,

            enemyHpMult: 1.0,
            enemyDamageMult: 1.0,
            bossHpMult: 1.0,
            bossDamageMult: 1.0
        },
        2: {
            asteroidHpStartMin: 30,
            asteroidHpStartMax: 45,
            asteroidHpRampEverySec: 10,
            asteroidHpRampPerStep: 3,

            enemyHpMult: 2.3,
            enemyDamageMult: 1.7,
            bossHpMult: 2.0,
            bossDamageMult: 1.6
        }
    } as const
} as const;


