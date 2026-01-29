import { getRecentSessionsWithStats } from '@/services/session/queries';
import type { SessionWithDetails } from '@/types/session';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_FILTERS, DEFAULT_SORT, PAGE_SIZE } from './SessionHistory.constants';
import { applyFilters, applySearch, applySorting } from './SessionHistory.helpers';
import type {
  SessionFilters,
  SessionHistoryState,
  SortConfig,
  UseSessionHistoryReturn,
} from '@/types/sessionHistory';

/**
 * Hook for session history with filtering, sorting, search, and pagination
 */
export function useSessionHistory(
  initialFilters?: Partial<SessionFilters>
): UseSessionHistoryReturn {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters & sort
  const [filters, setFiltersState] = useState<SessionFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [sort, setSortState] = useState<SortConfig>(DEFAULT_SORT);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchSessions = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setPage(0);
      }
      
      // Fetch a large batch - we'll filter client-side for responsiveness
      const data = await getRecentSessionsWithStats({
        days: 365 * 2, // 2 years
        limit: 500,
      });
      
      setSessions(data);
      setHasMore(false); // All data loaded
      setError(null);
    } catch (err) {
      console.error('[SessionHistory] Error fetching sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSessions(true);
  }, [fetchSessions]);

  // ============================================================================
  // COMPUTED - Apply filters, search, and sorting
  // ============================================================================

  const filteredSessions = useMemo(() => {
    let result = sessions;
    
    // Apply filters
    result = applyFilters(result, filters);
    
    // Apply search
    result = applySearch(result, searchQuery);
    
    // Apply sorting
    result = applySorting(result, sort);
    
    return result;
  }, [sessions, filters, searchQuery, sort]);

  // Paginated sessions for display
  const displayedSessions = useMemo(() => {
    const endIndex = (page + 1) * PAGE_SIZE;
    return filteredSessions.slice(0, endIndex);
  }, [filteredSessions, page]);

  // Check if there's more to load
  const canLoadMore = displayedSessions.length < filteredSessions.length;

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSessions(true);
  }, [fetchSessions]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !canLoadMore) return;
    
    setIsLoadingMore(true);
    setPage(p => p + 1);
    setIsLoadingMore(false);
  }, [isLoadingMore, canLoadMore]);

  const setFilters = useCallback((newFilters: Partial<SessionFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPage(0); // Reset pagination when filters change
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(0);
  }, []);

  const setSort = useCallback((newSort: SortConfig) => {
    setSortState(newSort);
    setPage(0);
  }, []);

  const openFilterSheet = useCallback(() => {
    setIsFilterSheetOpen(true);
  }, []);

  const closeFilterSheet = useCallback(() => {
    setIsFilterSheetOpen(false);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    sessions,
    filteredSessions: displayedSessions,
    
    // Pagination
    page,
    hasMore: canLoadMore,
    isLoadingMore,
    
    // Loading
    isLoading,
    isRefreshing,
    error,
    
    // Filters & sort
    filters,
    sort,
    searchQuery,
    
    // UI state
    isFilterSheetOpen,
    
    // Actions
    refresh,
    loadMore,
    setFilters,
    resetFilters,
    setSort,
    setSearchQuery,
    openFilterSheet,
    closeFilterSheet,
  };
}

