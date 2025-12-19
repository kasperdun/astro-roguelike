export const UPGRADE_IDS = [
    'weapon_damage',
    'bullet_range',
    'hull_hp',
    'health_drop_chance',
    'fuel_capacity',
    'move_speed',
    'bullet_speed',
    'fire_rate',
    'projectile_plus1',
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
    'fuel_drop_chance',
    'accel_control',
    'drift_tuning',
    'mining_yield',
    'mining_mastery',
    'asteroid_spawn_rate',
    'asteroid_max_count',
    'asteroid_explosion_damage',
    'asteroid_explosion_radius',
    'enemy_resource_yield'
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];


