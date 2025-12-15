import { useColors } from '@/hooks/ui/useColors';
import { getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Time filter type
type TimeFilter = 'week' | 'month' | 'year' | 'all';

// Time filter button component
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
  
  // Time filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

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

  // Filter sessions based on time selection
  const filteredSessions = useMemo(() => {
    if (timeFilter === 'all') return sessionsWithStats;
    
    const now = new Date();
    const thresholdDays: Record<Exclude<TimeFilter, 'all'>, number> = {
      week: 7,
      month: 30,
      year: 365,
    };
    const days = thresholdDays[timeFilter];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return sessionsWithStats.filter(s => new Date(s.started_at) >= cutoff);
  }, [sessionsWithStats, timeFilter]);

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
        {/* Header with Filter */}
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Insights</Text>
          <View style={styles.filterRow}>
            {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
              <TimeFilterButton
                key={filter}
                filter={filter}
                selected={timeFilter === filter}
                onPress={() => setTimeFilter(filter)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {hasData ? (
          <>
            {/* Overview Section */}
            <SectionHeader title="Overview" />
            <CompactStatsRow sessions={filteredSessions} />

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
  
  // Header with filter
  headerRow: {
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
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
});

export default InsightsDashboard;
