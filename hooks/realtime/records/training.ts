/**
 * Training Record Types
 *
 * Database record definitions for trainings.
 */

export interface TrainingRecord {
  id: string;
  team_id: string | null;
  status: 'planned' | 'ongoing' | 'finished' | 'cancelled';
  created_at: string;
  updated_at: string;
}
