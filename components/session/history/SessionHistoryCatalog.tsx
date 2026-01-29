import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/types/session';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { countActiveFilters } from '@/utils/sessionHistory.helpers';
import type { SessionHistoryCatalogProps } from '@/types/sessionHistory';
import { FilterSheet } from './FilterSheet';
import { SessionCard } from './SessionCard';
import { useSessionHistory } from './useSessionHistory';

/**
 * SessionHistoryCatalog - Full session history with search, filters, and sorting
 * 
 * Features:
 * - Search by drill name, weapon, team
 * - Filter by date, status, drill type, distance, etc.
 * - Sort by date, shots, accuracy, etc.
 * - Infinite scroll pagination
 * - Pull to refresh
 */
export function SessionHistoryCatalog({
  initialFilters,
  hideHeader = false,
  onSessionSelect,
}: SessionHistoryCatalogProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  
  const {
    filteredSessions,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    filters,
    sort,
    searchQuery,
    isFilterSheetOpen,
    refresh,
    loadMore,
    setFilters,
    resetFilters,
    setSort,
    setSearchQuery,
    openFilterSheet,
    closeFilterSheet,
  } = useSessionHistory(initialFilters);

  // Handle session press - opens the same bottom sheet as recent activity
  const handleSessionPress = useCallback((session: SessionWithDetails) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    } else {
      // Navigate to session detail sheet (same as recent activity)
      router.push(`/(protected)/sessionDetail?sessionId=${session.id}`);
    }
  }, [onSessionSelect, router]);

  // Active filter count
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Render session item
  const renderItem = useCallback(({ item }: { item: SessionWithDetails }) => (
    <SessionCard session={item} onPress={handleSessionPress} />
  ), [handleSessionPress]);

  // Key extractor
  const keyExtractor = useCallback((item: SessionWithDetails) => item.id, []);

  // Footer loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }, [isLoadingMore, colors]);

  // Empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {searchQuery || activeFilterCount > 0 ? t('session.noMatchingSessions') : t('session.noSessionsYet')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          {searchQuery || activeFilterCount > 0
            ? t('session.tryAdjustingSearchOrFilters')
            : t('session.completeShootingSessionToSee')}
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={[styles.clearFiltersButton, { borderColor: colors.border }]}
            onPress={resetFilters}
          >
            <Text style={[styles.clearFiltersText, { color: colors.primary }]}>
              {t('session.clearFilters')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, searchQuery, activeFilterCount, colors, resetFilters]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('session.sessionHistory')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('session.sessionsCount', { count: filteredSessions.length })}
          </Text>
        </View>
      )}

      {/* Search & Filter Bar */}
      <View style={styles.searchBar}>
        <View style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder={t('session.searchSessions')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { 
              backgroundColor: activeFilterCount > 0 ? colors.primary : colors.card,
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={openFilterSheet}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="options-outline" 
            size={20} 
            color={activeFilterCount > 0 ? '#fff' : colors.text} 
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort indicator */}
      <View style={styles.sortIndicator}>
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={openFilterSheet}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={sort.direction === 'desc' ? 'arrow-down' : 'arrow-up'} 
            size={14} 
            color={colors.textMuted} 
          />
          <Text style={[styles.sortText, { color: colors.textMuted }]}>
            {t('session.sortedBy', { field: t(`session.sortField.${sort.field}`) })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sessions List */}
      <FlatList
        data={filteredSessions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.text}
          />
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={closeFilterSheet}
        filters={filters}
        sort={sort}
        onApplyFilters={setFilters as any}
        onApplySort={setSort}
        onReset={resetFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Sort indicator
  sortIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SessionHistoryCatalog;

