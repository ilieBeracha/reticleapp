/**
 * Session Form Components
 *
 * Unified form system for session creation and editing.
 * Single source of truth for all session/drill forms.
 */

// Hook
export {
  DISTANCE_PRESETS, ROUNDS_PRESETS, SHOTS_PRESETS, TIME_PRESETS, useSessionForm, type ControlMode, type DrillGoal,
  type InputMethod, type SessionFormContext, type SessionFormState, type TargetType, type UseSessionFormReturn
} from './useSessionForm';

// Main Form Components
export { SessionFormSheet } from './SessionFormSheet';

// Shared Drill Form Components (used by both SessionFormSheet and UnifiedDrillModal)
export {
  ConfigCard, ConfigRow, DISTANCE_PRESETS as DRILL_DISTANCE_PRESETS, ROUNDS_PRESETS as DRILL_ROUNDS_PRESETS, SHOTS_PRESETS as DRILL_SHOTS_PRESETS, TIME_PRESETS as DRILL_TIME_PRESETS, HintBox, OptionCard, SectionLabel, TimeRow, type ConfigRowProps, type OptionCardProps, type TimeRowProps
} from './DrillFormComponents';

// Bottom Sheet Wrapper
export { DrillFormSheet, type DrillFormSheetProps, type DrillFormSheetRef, type QuickDrillFormData } from './DrillFormSheet';

// Legacy components (deprecated, use DrillFormComponents instead)
export {
  FormSection, GOAL_COLORS, GoalSelector,
  InputMethodSelector, PillSelector
} from './FormComponents';

