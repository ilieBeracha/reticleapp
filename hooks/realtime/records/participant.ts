/**
 * Participant Record Types
 *
 * Database record definitions for engagement participants.
 */

export interface ParticipantRecord {
  id: string;
  engagement_id: string;
  /** @deprecated Use engagement_id. Will be removed after migration. */
  session_id?: string;
  user_id: string;
  state: 'pending' | 'joined' | 'left';
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}
