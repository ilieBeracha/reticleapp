import type { SessionWithDetails } from '@/services/session/types';
import type { DrillGoal } from '@/types/workspace';

// ============================================================================
// FILTER TYPES
// ============================================================================

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

export type SortField = 'date' | 'shots' | 'accuracy' | 'distance' | 'duration';
export type SortDirection = 'asc' | 'desc';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface SessionFilters {
  // Time
  dateRange: DateRangePreset;
  customDateRange?: DateRange;
  
  // Session attributes
  status: ('completed' | 'active' | 'cancelled')[];
  sessionMode: ('solo' | 'group')[];
  
  // Drill/weapon
  drillGoal: DrillGoal[];
  weaponIds: string[];
  distanceRange: { min: number | null; max: number | null };
  
  // Performance (for completed sessions)
  minAccuracy: number | null;
  minShots: number | null;
  
  // Source
  watchControlled: boolean | null; // null = any
  hasTeam: boolean | null; // null = any
}

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// ============================================================================
// HOOK STATE
// ============================================================================

export interface SessionHistoryState {
  sessions: SessionWithDetails[];
  filteredSessions: SessionWithDetails[];
  
  // Pagination
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Filters & sort
  filters: SessionFilters;
  sort: SortConfig;
  searchQuery: string;
  
  // UI state
  isFilterSheetOpen: boolean;
}

export interface SessionHistoryActions {
  // Data
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // Filters
  setFilters: (filters: Partial<SessionFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: SortConfig) => void;
  setSearchQuery: (query: string) => void;
  
  // UI
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
}

export type UseSessionHistoryReturn = SessionHistoryState & SessionHistoryActions;

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface SessionCardProps {
  session: SessionWithDetails;
  onPress: (session: SessionWithDetails) => void;
  compact?: boolean;
}

export interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SessionFilters;
  onApply: (filters: SessionFilters) => void;
  onReset: () => void;
  availableWeapons: { id: string; name: string }[];
}

export interface SessionHistoryCatalogProps {
  /** Initial filters to apply */
  initialFilters?: Partial<SessionFilters>;
  /** Hide the header (when used inline) */
  hideHeader?: boolean;
  /** Callback when a session is selected */
  onSessionSelect?: (session: SessionWithDetails) => void;
}

