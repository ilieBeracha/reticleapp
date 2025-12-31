/**
 * Type definitions for Create Training Screen
 */

import type { WeaponCategory } from '@/types/workspace';
import type { CreateTrainingDrillInput, Drill, DrillInstanceConfig } from '@/types/workspace';
import type { DrillFormData as UnifiedDrillFormData } from '@/components/drills/UnifiedDrillModal';

// ============================================================================
// TRAINING DRILL ITEM
// ============================================================================
export interface TrainingDrillItem extends CreateTrainingDrillInput {
  id: string;
}

// ============================================================================
// DRILL CONFIG (from new DrillConfigSheet)
// ============================================================================
export interface NewDrillInstanceConfig {
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds: number | null;
  strings_count: number;
  weapon_category: WeaponCategory | null;
  input_method: 'scan' | 'manual';
}

// ============================================================================
// WIZARD STEP
// ============================================================================
export type WizardStep = 1 | 2;

// ============================================================================
// DRILL MODAL MODE
// ============================================================================
export type DrillModalMode = 'configure' | 'quick';

// ============================================================================
// QUICK DRILL PAYLOAD
// ============================================================================
export interface QuickDrillPayload {
  draft: UnifiedDrillFormData;
  instance: DrillInstanceConfig;
}

// ============================================================================
// USE CREATE TRAINING RETURN
// ============================================================================
export interface UseCreateTrainingReturn {
  // Teams
  teams: any[];
  selectedTeamId: string | null;
  selectedTeam: any | null;
  isTeamLocked: boolean;
  needsTeamSelection: boolean;
  canCreateDrills: boolean;
  
  // Form state
  title: string;
  setTitle: (title: string) => void;
  scheduledDate: Date;
  setScheduledDate: (date: Date) => void;
  manualStart: boolean;
  setManualStart: (manual: boolean) => void;
  drills: TrainingDrillItem[];
  
  // UI state
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (show: boolean) => void;
  submitting: boolean;
  currentStep: WizardStep;
  
  // Drill modal state
  teamDrills: Drill[];
  selectedDrill: Drill | null;
  drillModalVisible: boolean;
  drillModalMode: DrillModalMode;
  savingDrill: boolean;
  
  // Validation
  step1Complete: boolean;
  step2Complete: boolean;
  canCreate: boolean;
  
  // Actions
  handleSelectTeam: (teamId: string) => void;
  handleRemoveDrill: (drillId: string) => void;
  handleMoveDrill: (index: number, direction: 'up' | 'down') => void;
  addDrill: (drill: TrainingDrillItem) => void;
  handleSelectDrill: (drill: Drill) => void;
  handleOpenQuickDrill: () => void;
  handleCloseDrillModal: () => void;
  handleConfigureConfirm: (config: DrillInstanceConfig) => void;
  handleQuickDrillSave: (payload: QuickDrillPayload) => Promise<void>;
  handleNextStep: () => void;
  handleBackStep: () => void;
  handleCreate: () => Promise<void>;
}

