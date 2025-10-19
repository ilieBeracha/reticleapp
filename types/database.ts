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
  training_id: string;
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
  training_id: string;
  name: string;
  session_type: SessionType;
  day_period: DayPeriod;
  range_m?: number;
  env_wind_mps?: number;
  env_temp_c?: number;
  env_pressure_hpa?: number;
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
