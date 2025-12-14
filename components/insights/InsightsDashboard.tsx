import { useColors } from '@/hooks/ui/useColors';
import { getSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

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
      }
      return acc;
    },
    { completed: 0, shots: 0, hits: 0, targets: 0 }
  );

  const accuracy = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;

  return (
    <View style={[styles.compactStatsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{stats.completed}</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Sessions</Text>
      </View>
      <View style={[styles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{stats.shots.toLocaleString()}</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Shots</Text>
      </View>
      <View style={[styles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{accuracy}%</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Accuracy</Text>
      </View>
      <View style={[styles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.compactStat}>
        <Text style={[styles.compactStatValue, { color: colors.text }]}>{stats.targets}</Text>
        <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>Targets</Text>
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

  const loadSessionsWithStats = useCallback(async () => {
    try {
      const sessions = await getSessionsWithStats();
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
        <Text style={[styles.pageTitle, { color: colors.text }]}>Insights</Text>

        {hasData ? (
          <>
            {/* Overview Section */}
            <SectionHeader title="Overview" />
            <CompactStatsRow sessions={sessionsWithStats} />

            {/* Trends Section */}
            <SectionHeader title="Trends" subtitle="Your progress over time" />
            <View style={styles.cardGroup}>
              <MonthlyComparisonCard sessions={sessionsWithStats} />
              <ShotGoalCard sessions={sessionsWithStats} monthlyGoal={1000} />
              <StreakCard sessions={storeSessions} colors={colors} />
            </View>

            {/* Performance Section */}
            <SectionHeader title="Performance" subtitle="Detailed breakdown" />
            <View style={styles.cardGroup}>
              <DistanceBreakdownCard sessions={sessionsWithStats} />
              <SessionTypeCard sessions={sessionsWithStats} />
            </View>

            {/* All-Time Section */}
            <SectionHeader title="All-Time" subtitle="Lifetime statistics" />
            <AllTimeStatsCard sessions={sessionsWithStats} />
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
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 20,
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
