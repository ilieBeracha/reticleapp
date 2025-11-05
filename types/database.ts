// Database types for Supabase tables

export type SessionType = "steel" | "paper";
export type DayPeriod = "day" | "night";

export interface InvitationWithDetails {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  invited_by: string;
  accepted_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  training_id?: string;
  organization_id: string;
  name: string;
  session_type: SessionType;
  range_m?: number;
  day_period: DayPeriod;
  env_wind_mps?: number;
  env_temp_c?: number;
  env_pressure_hpa?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  training_id?: string;
  name: string;
  session_type: SessionType;
  day_period: DayPeriod;
}

export interface UpdateSessionInput {
  name?: string;
  session_type?: SessionType;
  day_period?: DayPeriod;
  range_m?: number;
  env_wind_mps?: number;
  env_temp_c?: number;
  env_pressure_hpa?: number;
}

export interface CreateTrainingInput {
  name: string;
  description?: string;
}

export interface UpdateTrainingInput {
  name?: string;
  description?: string;
}

export interface Detection {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Weather conditions stored as JSONB
export interface WeatherConditions {
  wind_mps?: number;
  wind_direction?: string;
  temp_c?: number;
  pressure_hpa?: number;
  visibility?: string;
  humidity?: number;
  [key: string]: any; // Allow additional weather fields
}

export interface SessionStats {
  id: string;
  training_id?: string | null;
  organization_id?: string | null;
  name?: string | null;
  started_at: string;
  ended_at?: string | null;
  range_location?: string | null;
  weather?: WeatherConditions | null;
  day_period?: DayPeriod | null;
  is_squad: boolean;
  comments?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionStatsInput {
  training_id?: string | null;
  name?: string;
  started_at?: string;
  ended_at?: string | null;
  range_location?: string;
  weather?: WeatherConditions;
  day_period?: DayPeriod;
  is_squad?: boolean;
  comments?: string;
}

export interface UpdateSessionStatsInput {
  name?: string;
  started_at?: string;
  ended_at?: string | null;
  range_location?: string;
  weather?: WeatherConditions;
  day_period?: DayPeriod;
  is_squad?: boolean;
  comments?: string;
}

export interface WeaponModel {
  id: string;
  name: string;
  weapon_name?: string;
  manufacturer?: string;
  weapon_type?: string;
  caliber?: string;
  cartridge_raw?: string;
  effective_range_m?: number;
  barrel_length_cm?: number;
  twist_rate?: string;
  origin?: string;
  year?: number;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SightModel {
  id: string;
  name: string;
  manufacturer?: string;
  kind: string; // scope, optic, thermal
  mount_type?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Weapon {
  id: string;
  weapon_model_id: string;
  serial_number: string;
  organization_id: string;
  last_maintenance_date?: string;
  round_count?: number;
  condition?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sight {
  id: string;
  sight_model_id: string;
  serial_number: string;
  organization_id: string;
  last_calibration_date?: string;
  condition?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLoadout {
  id: string;
  user_id: string;
  organization_id?: string;
  name: string;
  weapon_id?: string;
  sight_id?: string;
  zero_distance_m?: number;
  zero_conditions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLoadoutInput {
  name: string;
  weapon_id?: string;
  sight_id?: string;
  zero_distance_m?: number;
  zero_conditions?: Record<string, any>;
}

export interface UpdateLoadoutInput {
  name?: string;
  weapon_id?: string;
  sight_id?: string;
  zero_distance_m?: number;
  zero_conditions?: Record<string, any>;
  is_active?: boolean;
}

// Enriched loadout with joined data
export interface LoadoutWithDetails extends UserLoadout {
  weapon?: Weapon & { model?: WeaponModel };
  sight?: Sight & { model?: SightModel };
}

