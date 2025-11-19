// Database types for Supabase tables

export type SessionType = "steel" | "paper";
export type DayPeriod = "day" | "night";
export type SessionMode = "solo" | "squad";
export type Environment = "steel" | "paper";

export interface InvitationWithDetails {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  code: string;
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
  org_id: string;
  name: string;
  description?: string;
  scheduled_date?: string;
  location?: string;
  created_by: string;
  created_at: string;
}

// =====================================================
// SESSION TYPES (Matches actual schema)
// =====================================================
export interface Session {
  id: string;
  workspace_type: 'personal' | 'org';
  workspace_owner_id: string | null;
  org_workspace_id: string | null;
  user_id: string;
  training_id: string | null;
  team_id: string | null;
  drill_id: string | null;
  session_mode: 'solo' | 'group';
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  environment: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  workspace_type: 'personal' | 'org';
  workspace_owner_id?: string;
  org_workspace_id?: string;
  training_id?: string;
  team_id?: string;
  drill_id?: string;
  session_mode?: 'solo' | 'group';
  environment?: Record<string, any>;
}

export interface SessionWithDetails extends Session {
  training_name?: string;
  drill_name?: string;
  team_name?: string;
  user_full_name?: string;
}

export interface UpdateSessionInput {
  status?: 'active' | 'completed' | 'cancelled';
  ended_at?: string;
  environment?: Record<string, any>;
}

export interface CreateTrainingInput {
  name: string;
  description?: string;
  scheduled_date?: string;
  location?: string;
}

export interface UpdateTrainingInput {
  name?: string;
  description?: string;
  scheduled_date?: string;
  location?: string;
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

// =====================================================
// WORKSPACE TYPES (Simplified Schema)
// =====================================================

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  workspace_name?: string | null;
  workspace_slug?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceAccess {
  id: string;
  workspace_owner_id: string;  // profile.id of workspace owner
  member_id: string;            // user who has access
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Team {
  id: string;
  workspace_owner_id: string;  // profile.id
  name: string;
  team_type?: 'field' | 'back_office' | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'sniper' | 'pistol' | 'manager' | 'commander' | 'instructor' | 'staff';
  joined_at: string;
}

// Enriched types
export interface WorkspaceWithOwner extends Profile {
  // The profile IS the workspace
  access_role?: 'owner' | 'admin' | 'member';
}

export interface TeamWithMembers extends Team {
  members?: (TeamMember & { profile?: Profile })[];
  member_count?: number;
}

