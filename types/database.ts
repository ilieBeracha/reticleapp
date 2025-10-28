// Database types for Supabase tables

export type SessionType = "steel" | "paper";
export type DayPeriod = "day" | "night";

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
  name: string;
  weapon_name: string;
  manufacturer: string;
  weapon_type: string;
  caliber: string;
  cartridge_raw: string;
  origin: string;
  year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
