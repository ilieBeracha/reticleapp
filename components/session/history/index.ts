// Components
export { SessionHistoryCatalog } from './SessionHistoryCatalog';
export { SessionCard } from './SessionCard';
export { FilterSheet } from './FilterSheet';

// Hook
export { useSessionHistory } from './useSessionHistory';

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
} from './SessionHistory.types';

// Constants
export {
  DATE_RANGE_OPTIONS,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DISTANCE_PRESETS,
  DRILL_GOAL_OPTIONS,
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUS_COLORS,
  STATUS_OPTIONS,
} from './SessionHistory.constants';

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
} from './SessionHistory.helpers';

