export const UPGRADE_IDS = [
    'weapon_damage',
    'bullet_range',
    'hull_hp',
    'fuel_capacity',
    'move_speed',
    'bullet_speed',
    'fire_rate',
    'damage_boost',
    'marksman_protocol',
    'collision_plating',
    'shield_core',
    'shield_regen',
    'shield_delay',
    'fortress_protocol',
    'fuel_efficiency',
    'fuel_thrust_eff',
    'fuel_shot_eff',
    'fuel_regen',
    'accel_control',
    'drift_tuning',
    'mining_yield',
    'mining_mastery'
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];


