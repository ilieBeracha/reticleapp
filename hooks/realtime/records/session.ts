/**
 * Session Record Types
 *
 * Database record definitions for sessions and session targets.
 */

export interface SessionRecord {
  id: string;
  user_id: string;
  team_id: string | null;
  training_id: string | null;
  drill_id: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionTargetRecord {
  id: string;
  session_id: string;
  target_type: string;
  distance_m: number;
  created_at: string;
}
