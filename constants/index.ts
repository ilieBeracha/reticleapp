/**
 * Constants Barrel Export
 *
 * Import from '@/constants' for centralized access to all constants.
 */

// Drill-related constants
export {
  DRILL_DEFAULTS, DRILL_GOAL,
  DRILL_GOALS, INPUT_METHOD,
  INPUT_METHODS, isEngagementGoal,
  isEngagementPaper,
  isGroupingGoal,
  isGroupingPaper,
  isPaperTarget,
  isTacticalTarget,
  isValidDrillGoal, PAPER_TYPE,
  PAPER_TYPES,
  TARGET_TYPE,
  TARGET_TYPES
} from './drill';
export type { DrillGoal, InputMethod, PaperType, TargetType } from './drill';

// Session-related constants
export {
  isActiveSession,
  isCompletedSession,
  isGroupSession,
  isPendingSession,
  isSoloSession,
  isTerminalStatus, SESSION_MODE,
  SESSION_MODES,
  SESSION_STATUS,
  SESSION_STATUSES,
  SESSION_TIMEOUTS,
  TRAINING_STATUS,
  TRAINING_STATUSES
} from './session';
export type { SessionMode, SessionStatus, TrainingStatus } from './session';

// Colors
export { Colors } from './Colors';

// Garmin constants
export * from './garmin';

// Weapon categories
export * from './weaponCategories';

// Drill library
export * from './drillLibrary';

// Category drills
export * from './categoryDrills';

// Weapon policy
export * from './weaponPolicy';
