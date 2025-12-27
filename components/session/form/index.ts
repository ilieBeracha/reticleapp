/**
 * Session Form Components
 *
 * Unified form system for session creation and editing.
 * Single source of truth for all session/drill forms.
 */

// Hook
export {
  useSessionForm,
  type UseSessionFormReturn,
  type SessionFormState,
  type SessionFormContext,
  type DrillGoal,
  type InputMethod,
  type TargetType,
  DISTANCE_PRESETS,
  SHOTS_PRESETS,
  ROUNDS_PRESETS,
  TIME_PRESETS,
} from './useSessionForm';

// Main Form Components
export { SessionFormSheet } from './SessionFormSheet';

// Shared Drill Form Components (used by both SessionFormSheet and UnifiedDrillModal)
export {
  OptionCard,
  ConfigRow,
  TimeRow,
  ConfigCard,
  SectionLabel,
  HintBox,
  DISTANCE_PRESETS as DRILL_DISTANCE_PRESETS,
  SHOTS_PRESETS as DRILL_SHOTS_PRESETS,
  ROUNDS_PRESETS as DRILL_ROUNDS_PRESETS,
  TIME_PRESETS as DRILL_TIME_PRESETS,
  type OptionCardProps,
  type ConfigRowProps,
  type TimeRowProps,
} from './DrillFormComponents';

// Bottom Sheet Wrapper
export { DrillFormSheet, type DrillFormSheetRef, type DrillFormSheetProps, type QuickDrillFormData } from './DrillFormSheet';

// Legacy components (deprecated, use DrillFormComponents instead)
export {
  PillSelector,
  FormSection,
  GoalSelector,
  InputMethodSelector,
  GOAL_COLORS,
} from './FormComponents';

