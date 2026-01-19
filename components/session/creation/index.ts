/**
 * Session Creation Module
 *
 * Unified session creation for both solo and training contexts.
 *
 * Components:
 * - SessionCreationForm: Unified form component (use this for new implementations)
 * - SessionIntentStep: Goal selection (grouping/engagement)
 * - SessionContextStep: Session details (weapon, distance, etc.)
 *
 * After form submission:
 * - SessionPrepView handles watch/phone selection
 * - activeSession.tsx handles scan/manual (based on drill config)
 */

// Types
export * from './sessionCreation.types';

// Constants
export * from './sessionCreation.constants';

// Hook (legacy - consider using SessionCreationForm directly)
export { useSessionCreation } from './useSessionCreation';
export type { UseSessionCreationOptions, UseSessionCreationReturn, TrainingContext } from './useSessionCreation';

// Unified Form Component (recommended)
export { SessionCreationForm } from './SessionCreationForm';
export type { 
  SessionCreationFormProps, 
  SessionFormValues, 
  DrillContext,
  TrainingContext as FormTrainingContext,
} from './SessionCreationForm';

// Modal/Sheet wrapper (drop-in replacement for StartDrillSheet)
export { SessionCreationSheet } from './SessionCreationSheet';
export type { SessionCreationSheetProps } from './SessionCreationSheet';

// Step Components (used internally by SessionCreationForm)
export { SessionContextStep } from './SessionContextStep';
export { SessionIntentStep } from './SessionIntentStep';

// Note: SessionWeaponStep is still available but no longer used as a separate step
// Weapon selection is now integrated as a sheet in the Details step
export { SessionWeaponStep } from './SessionWeaponStep';

