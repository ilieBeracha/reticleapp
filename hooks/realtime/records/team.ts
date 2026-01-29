/**
 * Team Record Types
 *
 * Database record definitions for team members, invitations, and team trainings.
 */

export interface TeamMemberRecord {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  squad_id?: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitationRecord {
  id: string;
  team_id: string;
  invite_code: string;
  team_role: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invited_by: string;
  accepted_by?: string | null;
  accepted_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamTrainingRecord {
  id: string;
  team_id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'scheduled' | 'ongoing' | 'finished' | 'cancelled';
  scheduled_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
