import type { DateRangePreset, SessionFilters, SortConfig, SortField } from '@/types/sessionHistory';

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_FILTERS: SessionFilters = {
  dateRange: 'all',
  status: ['completed'],
  sessionMode: [],
  drillGoal: [],
  weaponIds: [],
  distanceRange: { min: null, max: null },
  minAccuracy: null,
  minShots: null,
  watchControlled: null,
  hasTeam: null,
};

export const DEFAULT_SORT: SortConfig = {
  field: 'date',
  direction: 'desc',
};

export const PAGE_SIZE = 20;

// ============================================================================
// UI OPTIONS
// ============================================================================

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string; days: number | null }[] = [
  { value: 'today', label: 'Today', days: 1 },
  { value: 'week', label: 'This Week', days: 7 },
  { value: 'month', label: 'This Month', days: 30 },
  { value: 'quarter', label: '3 Months', days: 90 },
  { value: 'year', label: 'This Year', days: 365 },
  { value: 'all', label: 'All Time', days: null },
];

export const SORT_OPTIONS: { value: SortField; label: string; icon: string }[] = [
  { value: 'date', label: 'Date', icon: 'calendar-outline' },
  { value: 'shots', label: 'Shots', icon: 'target' },
  { value: 'accuracy', label: 'Accuracy', icon: 'checkmark-circle-outline' },
  { value: 'distance', label: 'Distance', icon: 'resize-outline' },
  { value: 'duration', label: 'Duration', icon: 'time-outline' },
];

export const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', color: '#10B981' },
  { value: 'active', label: 'Active', color: '#3B82F6' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
] as const;

export const DRILL_GOAL_OPTIONS = [
  { value: 'grouping', label: 'Grouping', icon: 'ellipse-outline' },
  { value: 'engagement', label: 'Engagement', icon: 'trophy-outline' },
] as const;

export const DISTANCE_PRESETS = [25, 50, 100, 200, 300, 500, 800, 1000];

// ============================================================================
// FORMAT HELPERS (constants)
// ============================================================================

export const STATUS_COLORS: Record<string, string> = {
  completed: '#10B981',
  active: '#3B82F6',
  cancelled: '#EF4444',
  pending: '#F59E0B',
};

