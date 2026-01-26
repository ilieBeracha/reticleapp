/**
 * Session Components
 *
 * Complete session management system organized by lifecycle phase:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SESSION LIFECYCLE                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  1. SHARED (cross-cutting)                                              │
 * │     Types: DrillGoal, SessionContext, EngagementMode, ExecutionPolicy   │
 * │     Guards: enforceEngagementMode, isTrainingSession, canEditConfig     │
 * │                                                                         │
 * │  2. CREATION (steps 1-3)                                                │
 * │     Intent → Context → Ready                                            │
 * │     Components: EngagementModeToggle, InviteParticipantsPanel           │
 * │                                                                         │
 * │  3. ACTIVE (steps 4-5)                                                  │
 * │     Execution → Results entry                                           │
 * │     Views: SessionPrepView, SquadSessionView                            │
 * │                                                                         │
 * │  4. HISTORY (step 6)                                                    │
 * │     Review past sessions                                                │
 * │     Components: SessionHistoryCatalog, SessionCard                      │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════
// SHARED - Cross-cutting types and utilities
// ═══════════════════════════════════════════════════════════════════════════

export * from './shared';

// ═══════════════════════════════════════════════════════════════════════════
// CREATION - Session setup (steps 1-3)
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  CreationStep,
  DrillSource,
  InputMethod,
  Position,
  PurposeOption,
  SessionContextState,
  SessionCreationState,
  SessionPurpose,
  TargetType,
  TimeOfDay,
} from './creation';

// Constants (namespaced to avoid collision with history)
export {
  DISTANCE_PRESETS as CREATION_DISTANCE_PRESETS,
  DRILL_SOURCE_LABELS,
  getPurposeOption,
  POSITION_OPTIONS,
  PURPOSE_OPTIONS,
  purposeToDrillGoal,
  SHOTS_PRESETS,
  STEP_COPY,
  TIME_PRESETS,
} from './creation';

// Hook
export { useSessionCreation } from './creation';
export type { TrainingContext, UseSessionCreationOptions, UseSessionCreationReturn } from './creation';

// Components
export { EngagementModeToggle, InviteParticipantsPanel, PurposeSelector, SessionContextStep } from './creation';

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE - Session execution (steps 4-5)
// ═══════════════════════════════════════════════════════════════════════════

export * from './activeSession';

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY - Session review (step 6)
// ═══════════════════════════════════════════════════════════════════════════

// Types
export type {
  DateRange,
  DateRangePreset,
  FilterSheetProps,
  SessionCardProps,
  SessionFilters,
  SessionHistoryCatalogProps,
  SessionHistoryState,
  SortConfig,
  SortDirection,
  SortField,
  UseSessionHistoryReturn,
} from './history';

// Constants (namespaced to avoid collision with creation)
export {
  DATE_RANGE_OPTIONS,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DISTANCE_PRESETS as HISTORY_DISTANCE_PRESETS,
  DRILL_GOAL_OPTIONS,
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_COLORS,
  STATUS_OPTIONS,
} from './history';

// Helpers
export {
  applyFilters,
  applySearch,
  applySorting,
  calculateAccuracy,
  countActiveFilters,
  formatDuration,
  formatRelativeDate,
  formatSessionDate,
  getDateRangeFromPreset,
  getSessionDurationMinutes,
  getSessionSummary,
} from './history';

// Hook
export { useSessionHistory } from './history';

// Components
export { FilterSheet, SessionCard, SessionHistoryCatalog } from './history';

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { TargetCard } from './TargetCard';
export { CaptureModePicker, CaptureModePickerInline } from './CaptureModePicker';
export type { CaptureMode, CaptureModeSelection } from './CaptureModePicker';
export { CategoryDrillPicker } from './CategoryDrillPicker';
export { useSessionTimeline } from './useSessionTimeline';
