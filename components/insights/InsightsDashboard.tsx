import { useColors } from '@/hooks/ui/useColors';
import { getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// FILTER TYPES
// ============================================================================

type TimeFilter = 'week' | 'month' | 'year' | 'all';
type SourceFilter = 'all' | 'watch' | 'manual';
type ContextFilter = 'all' | 'personal' | 'team';

interface InsightFilters {
  time: TimeFilter;
  source: SourceFilter;
  context: ContextFilter;
}

const DEFAULT_FILTERS: InsightFilters = {
  time: 'all',
  source: 'all',
  context: 'all',
};

// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================

interface FilterChipProps {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function FilterChip({ label, icon, selected, onPress, colors }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { 
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <Ionicons 
          name={icon as any} 
          size={14} 
          color={selected ? '#fff' : colors.textMuted} 
          style={styles.filterChipIcon}
        />
      )}
      <Text style={[
        styles.filterChipText,
        { color: selected ? '#fff' : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// TIME FILTER BUTTON
// ============================================================================

function TimeFilterButton({ 
  filter, 
  selected, 
  onPress, 
  colors 
}: { 
  filter: TimeFilter; 
  selected: boolean; 
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const labels: Record<TimeFilter, string> = {
    week: '7D',
    month: '30D',
    year: '1Y',
    all: 'All',
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterButtonText,
        { color: selected ? '#fff' : colors.textMuted }
      ]}>
        {labels[filter]}
      </Text>
    </TouchableOpacity>
  );
}

import {
    EmptyState,
    StreakCard,
    useInsightsData,
} from './index';

import {
    AllTimeStatsCard,
    DistanceBreakdownCard,
    MonthlyComparisonCard,
    SessionTypeCard,
    ShotGoalCard,
} from './widgets';

// Compact Section Header
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );
}

// Compact Stats Row - replaces HeroStatsRow
function CompactStatsRow({ sessions }: { sessions: SessionWithDetails[] }) {
  const colors = useColors();

  const stats = sessions.reduce(
    (acc, s) => {
      if (s.status === 'completed') acc.completed++;
      if (s.stats) {
        acc.shots += s.stats.shots_fired;
        acc.hits += s.stats.hits_total;
        acc.targets += s.stats.target_count;
        // Collect dispersion values for avg grouping
        if (s.stats.best_dispersion_cm != null) {
          acc.dispersions.push(s.stats.best_dispersion_cm);
        }
      }
      return acc;
    },
    { completed: 0, shots: 0, hits: 0, targets: 0, dispersions: [] as number[] }
  );

  const accuracy = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
  
  // Calculate avg grouping from best dispersions
  const avgGrouping = stats.dispersions.length > 0
    ? (stats.dispersions.reduce((a, b) => a + b, 0) / stats.dispersions.length).toFixed(1)
    : null;

  return (
    <View style={[styles.compactStatsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{stats.completed}</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Sessions</Text>
      </View>
      <View style={[styles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{accuracy}%</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Accuracy</Text>
      </View>
      <View style={[styles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: avgGrouping ? colors.text : colors.textMuted }]}>
          {avgGrouping ? `${avgGrouping}cm` : '—'}
        </Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Avg Group</Text>
      </View>
      <View style={[styles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{stats.shots.toLocaleString()}</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Shots</Text>
      </View>
    </View>
  );
}

export function InsightsDashboard() {
  const colors = useColors();
  const router = useRouter();

  // Original insights data (for streak)
  const {
    sessions: storeSessions,
    refreshing: storeRefreshing,
    isLoading: storeLoading,
    onRefresh: storeRefresh,
  } = useInsightsData();

  // Sessions with stats (for widgets)
  const [sessionsWithStats, setSessionsWithStats] = useState<SessionWithDetails[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<InsightFilters>(DEFAULT_FILTERS);
  
  // Filter update helper
  const updateFilter = useCallback(<K extends keyof InsightFilters>(key: K, value: InsightFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Count active filters (excluding 'all' selections)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.time !== 'all') count++;
    if (filters.source !== 'all') count++;
    if (filters.context !== 'all') count++;
    return count;
  }, [filters]);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const loadSessionsWithStats = useCallback(async () => {
    try {
      const sessions = await getRecentSessionsWithStats({ days: 365, limit: 500 });
      setSessionsWithStats(sessions);
    } catch (error) {
      console.error('Failed to load sessions with stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadSessionsWithStats();
  }, [loadSessionsWithStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([storeRefresh(), loadSessionsWithStats()]);
    setRefreshing(false);
  }, [storeRefresh, loadSessionsWithStats]);

  // Filter sessions based on all filter selections
  const filteredSessions = useMemo(() => {
    return sessionsWithStats.filter(session => {
      // Time filter
      if (filters.time !== 'all') {
        const now = new Date();
        const thresholdDays: Record<Exclude<TimeFilter, 'all'>, number> = {
          week: 7,
          month: 30,
          year: 365,
        };
        const days = thresholdDays[filters.time];
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (new Date(session.started_at) < cutoff) return false;
      }
      
      // Source filter (watch vs manual)
      if (filters.source !== 'all') {
        if (filters.source === 'watch' && !session.watch_controlled) return false;
        if (filters.source === 'manual' && session.watch_controlled) return false;
      }
      
      // Context filter (personal vs team)
      if (filters.context !== 'all') {
        const hasTeam = session.team_id !== null;
        if (filters.context === 'team' && !hasTeam) return false;
        if (filters.context === 'personal' && hasTeam) return false;
      }
      
      return true;
    });
  }, [sessionsWithStats, filters]);

  const isLoading = storeLoading || loadingStats;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  const hasData = sessionsWithStats.length > 0 || storeSessions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Insights</Text>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterSection}>
          {/* Time Filter Row */}
          <View style={styles.filterRow}>
            {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
              <TimeFilterButton
                key={filter}
                filter={filter}
                selected={filters.time === filter}
                onPress={() => updateFilter('time', filter)}
                colors={colors}
              />
            ))}
          </View>
          
          {/* Additional Filters Row */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {/* Source */}
            <FilterChip
              label="Watch"
              icon="watch-outline"
              selected={filters.source === 'watch'}
              onPress={() => updateFilter('source', filters.source === 'watch' ? 'all' : 'watch')}
              colors={colors}
            />
            <FilterChip
              label="Manual"
              icon="create-outline"
              selected={filters.source === 'manual'}
              onPress={() => updateFilter('source', filters.source === 'manual' ? 'all' : 'manual')}
              colors={colors}
            />
            
            <View style={styles.filterSpacer} />
            
            {/* Context */}
            <FilterChip
              label="Personal"
              icon="person-outline"
              selected={filters.context === 'personal'}
              onPress={() => updateFilter('context', filters.context === 'personal' ? 'all' : 'personal')}
              colors={colors}
            />
            <FilterChip
              label="Team"
              icon="people-outline"
              selected={filters.context === 'team'}
              onPress={() => updateFilter('context', filters.context === 'team' ? 'all' : 'team')}
              colors={colors}
            />
          </ScrollView>
          
          {/* Active filter indicator & reset */}
          {activeFilterCount > 0 && (
            <View style={styles.activeFiltersRow}>
              <Text style={[styles.activeFiltersText, { color: colors.textMuted }]}>
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active • {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {hasData ? (
          <>
            {/* Overview Section */}
            <SectionHeader title="Overview" />
            <CompactStatsRow sessions={filteredSessions} />

            {/* View All Sessions Button */}
            <TouchableOpacity
              style={[styles.viewAllButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/sessionHistory')}
              activeOpacity={0.7}
            >
              <View style={styles.viewAllContent}>
                <Ionicons name="list-outline" size={20} color={colors.text} />
                <View style={styles.viewAllText}>
                  <Text style={[styles.viewAllTitle, { color: colors.text }]}>Session History</Text>
                  <Text style={[styles.viewAllSubtitle, { color: colors.textMuted }]}>
                    View all {sessionsWithStats.length} sessions with filters
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Trends Section */}
            <SectionHeader title="Trends" subtitle="Your progress over time" />
            <View style={styles.cardGroup}>
              <MonthlyComparisonCard sessions={filteredSessions} />
              <ShotGoalCard sessions={filteredSessions} monthlyGoal={1000} />
              <StreakCard sessions={storeSessions} colors={colors} />
            </View>

            {/* Performance Section */}
            <SectionHeader title="Performance" subtitle="Detailed breakdown" />
            <View style={styles.cardGroup}>
              <DistanceBreakdownCard sessions={filteredSessions} />
              <SessionTypeCard sessions={filteredSessions} />
            </View>

            {/* All-Time Section */}
            <SectionHeader title="All-Time" subtitle="Lifetime statistics" />
            <AllTimeStatsCard sessions={filteredSessions} />
          </>
        ) : (
          <EmptyState colors={colors} />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  
  // Header
  headerRow: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  
  // Filter Section
  filterSection: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Filter Chips
  filterChipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterSpacer: {
    width: 12,
  },
  
  // Active filters indicator
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  activeFiltersText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Compact Stats Row
  compactStatsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
  compactStat: {
    flex: 1,
    alignItems: 'center',
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  compactStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactStatDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },

  // Card Groups
  cardGroup: {
    gap: 0, // Cards have their own marginBottom
  },

  bottomSpacer: {
    height: 100,
  },

  // View All Button
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewAllText: {
    gap: 2,
  },
  viewAllTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  viewAllSubtitle: {
    fontSize: 12,
  },
});

export default InsightsDashboard;
