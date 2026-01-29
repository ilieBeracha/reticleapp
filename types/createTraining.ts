/**
 * Type definitions for Create Training Screen
 *
 * Consolidated types for the training creation wizard.
 * Core drill/training types live in workspace.ts
 */

import type { RangeCategory } from '@/constants/drill';
import type { CreateTrainingDrillInput, TeamMemberWithProfile, WeaponCategory } from '@/types/workspace';

// ============================================================================
// TRAINING DRILL ITEM
// ============================================================================

/** A drill configured for a training, with a local ID for list management */
export interface TrainingDrillItem extends CreateTrainingDrillInput {
  id: string;
}

// ============================================================================
// DRILL CONFIG
// ============================================================================

/** Configuration options when adding a drill instance to training */
export interface DrillConfig {
  distance_m: number;
  distance_category?: RangeCategory | null;
  rounds_per_shooter: number;
  time_limit_seconds: number | null;
  strings_count: number;
  weapon_category: WeaponCategory | null;
  input_method: 'scan' | 'manual';
}

// ============================================================================
// PARTICIPANT SELECTION
// ============================================================================

/** Whether training targets the entire team or selected members */
export type ParticipantMode = 'all' | 'select';

/** Participant selection state exposed by the hook */
export interface ParticipantSelection {
  mode: ParticipantMode;
  selectedMemberIds: string[];
  members: TeamMemberWithProfile[];
  loadingMembers: boolean;
}
