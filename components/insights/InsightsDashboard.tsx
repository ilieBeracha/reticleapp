/**
 * Insights Dashboard
 * 
 * Main analytics screen with session overview and single analysis entry point.
 */

import { useColors } from '@/hooks/ui/useColors';
import { getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState, StreakCard, useInsightsData } from './index';
import {
  AllTimeStatsCard,
  DistanceBreakdownCard,
  MonthlyComparisonCard,
  SessionTypeCard,
  ShotGoalCard,
  TrainingConsistencyCard,
} from './widgets';

// ============================================================================
// TYPES
// ============================================================================

type TimeFilter = 'week' | 'month' | 'year' | 'all';

// ============================================================================
// COMPONENTS
// ============================================================================

function TimeFilterPill({ 
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
        styles.timePill,
        { backgroundColor: selected ? colors.primary : colors.card }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.timePillText,
        { color: selected ? '#fff' : colors.textMuted }
      ]}>
        {labels[filter]}
      </Text>
    </TouchableOpacity>
  );
}

function QuickStat({ value, label, colors }: { value: string; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.quickStat}>
      <Text style={[styles.quickStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{children}</Text>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsDashboard() {
  const colors = useColors();
  const router = useRouter();

  const { sessions: storeSessions, isLoading: storeLoading, onRefresh: storeRefresh } = useInsightsData();

  const [sessionsWithStats, setSessionsWithStats] = useState<SessionWithDetails[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const loadSessionsWithStats = useCallback(async () => {
    try {
      const sessions = await getRecentSessionsWithStats({ days: 365, limit: 500 });
      setSessionsWithStats(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
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

  // Filter sessions by time
  const filteredSessions = useMemo(() => {
    if (timeFilter === 'all') return sessionsWithStats;
    
    const now = new Date();
    const days = { week: 7, month: 30, year: 365 }[timeFilter];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return sessionsWithStats.filter(s => new Date(s.started_at) >= cutoff);
  }, [sessionsWithStats, timeFilter]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const completed = filteredSessions.filter(s => s.status === 'completed');
    let shots = 0, hits = 0;
    
    completed.forEach(s => {
      if (s.stats) {
        shots += s.stats.shots_fired;
        hits += s.stats.hits_total;
      }
    });
    
    return {
      sessions: completed.length,
      shots,
      accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
    };
  }, [filteredSessions]);

  const isLoading = storeLoading || loadingStats;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  const hasData = sessionsWithStats.length > 0;
  const hasEnoughForAnalysis = sessionsWithStats.length >= 8;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />
        }
      >
        {/* Header */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>Insights</Text>

        {/* Time Filter */}
        <View style={styles.filterRow}>
          {(['week', 'month', 'year', 'all'] as TimeFilter[]).map((f) => (
            <TimeFilterPill
              key={f}
              filter={f}
              selected={timeFilter === f}
              onPress={() => setTimeFilter(f)}
              colors={colors}
            />
          ))}
        </View>

        {hasData ? (
          <>
            {/* Quick Stats */}
            <View style={[styles.quickStatsCard, { backgroundColor: colors.card }]}>
              <QuickStat value={String(quickStats.sessions)} label="Sessions" colors={colors} />
              <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
              <QuickStat value={`${quickStats.accuracy}%`} label="Accuracy" colors={colors} />
              <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
              <QuickStat value={quickStats.shots.toLocaleString()} label="Shots" colors={colors} />
            </View>

            {/* Performance Analysis - Single Entry Point */}
            {hasEnoughForAnalysis && (
              <TouchableOpacity
                style={[styles.analysisCard, { backgroundColor: colors.card }]}
                onPress={() => router.push('/(protected)/analysis')}
                activeOpacity={0.7}
              >
                <View style={[styles.analysisIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="analytics" size={22} color={colors.primary} />
                </View>
                <View style={styles.analysisText}>
                  <Text style={[styles.analysisTitle, { color: colors.text }]}>
                    Performance Analysis
                  </Text>
                  <Text style={[styles.analysisSubtitle, { color: colors.textMuted }]}>
                    See what changed and why
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Links */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card }]}
              onPress={() => router.push('/sessionHistory')}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={colors.text} />
              <Text style={[styles.linkText, { color: colors.text }]}>Session History</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Activity */}
            <SectionTitle>ACTIVITY</SectionTitle>
            <MonthlyComparisonCard sessions={filteredSessions} />
            <TrainingConsistencyCard sessions={filteredSessions} />
            <ShotGoalCard sessions={filteredSessions} monthlyGoal={1000} />
            <StreakCard sessions={storeSessions} colors={colors} />

            {/* Performance */}
            <SectionTitle>PERFORMANCE</SectionTitle>
            <DistanceBreakdownCard sessions={filteredSessions} />
            <SessionTypeCard sessions={filteredSessions} />

            {/* Career */}
            <SectionTitle>CAREER</SectionTitle>
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  
  // Header
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  
  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Quick Stats
  quickStatsCard: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  quickStatDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
  },
  
  // Analysis Card
  analysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 14,
  },
  analysisIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisText: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  analysisSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  
  // Link Card
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  
  bottomSpacer: {
    height: 100,
  },
});

export default InsightsDashboard;
