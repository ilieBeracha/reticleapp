/**
 * Session Creation Types
 * 
 * Based on the 6-step mental model:
 * 1. Intent - What am I going to do?
 * 2. Context - Under what conditions?
 * 3. Measurement - How will this be measured?
 * 4. Execution - Shooting in progress
 * 5. Results - What actually happened?
 * 6. Review - Does this look right?
 * 
 * This file covers steps 1-3 (pre-shooting configuration)
 */

// ============================================================================
// STEP 1: INTENT - "What am I going to do now?"
// ============================================================================

/**
 * Session purpose - answers "What am I going to do?"
 * Each purpose maps to different default configurations
 */
export type SessionPurpose = 
  | 'grouping'      // Measure shot dispersion / consistency
  | 'achievement'   // Hit targets / zone-based scoring
  | 'zeroing'       // Confirm or adjust rifle zero
  | 'physical'      // Physical/stress/pulse drills
  | 'custom';       // Mixed or user-defined

export interface PurposeOption {
  id: SessionPurpose;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  defaults: Partial<SessionContextState>;
}

/**
 * Source of drill configuration
 */
export type DrillSource = 
  | 'quick'    // Use purpose defaults (one-tap start)
  | 'preset'   // Load from saved personal preset
  | 'library'  // Load from curated drill library
  | 'custom';  // Configure manually

// ============================================================================
// STEP 2: CONTEXT - "Under what conditions?"
// ============================================================================

export type Position = 'standing' | 'kneeling' | 'prone' | 'seated' | 'supported' | 'any';
export type TargetType = 'paper' | 'tactical' | 'steel' | 'ipsc';
export type TimeOfDay = 'day' | 'night';

export interface SessionContextState {
  // Required
  weaponId: string | null;
  weaponName: string | null;
  /** Weapon category - shapes the entire experience */
  weaponCategory: string | null;
  distance: number;
  
  // Common
  position: Position;
  targetType: TargetType;
  shotsPlanned: number;
  
  // Optional (advanced)
  timeLimit: number | null;
  ammoType: string | null;
  windCondition: string | null;
  timeOfDay: TimeOfDay;
  notes: string;
}

// ============================================================================
// COMBINED SESSION CREATION STATE
// ============================================================================

// Note: Only 2 steps in the form:
// - Watch/Phone selection → SessionPrepView after form
// - Scan/Manual selection → activeSession.tsx during session (based on drill config)

export type CreationStep = 'intent' | 'context' | 'ready';

// Legacy type for drill config compatibility
export type InputMethod = 'scan' | 'manual';

export interface SessionCreationState {
  // Current step
  step: CreationStep;
  
  // Step 1: Intent
  purpose: SessionPurpose | null;
  drillSource: DrillSource | null;
  selectedPresetId: string | null;
  selectedLibraryId: string | null;
  
  // Category Drill - When selected, session MUST follow this drill
  selectedDrillId: string | null;
  /** True when a drill is selected and requirements are locked */
  isDrillLocked: boolean;
  
  // Step 2: Context
  context: SessionContextState;
  
  // Submission
  isSubmitting: boolean;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_CONTEXT: SessionContextState = {
  weaponId: null,
  weaponName: null,
  weaponCategory: null,
  distance: 25,
  position: 'any',
  targetType: 'paper',
  shotsPlanned: 5,
  timeLimit: null,
  ammoType: null,
  windCondition: null,
  timeOfDay: 'day',
  notes: '',
};

export const DEFAULT_CREATION_STATE: SessionCreationState = {
  step: 'intent',
  purpose: null,
  drillSource: null,
  selectedPresetId: null,
  selectedLibraryId: null,
  selectedDrillId: null,
  isDrillLocked: false,
  context: DEFAULT_CONTEXT,
  isSubmitting: false,
};

