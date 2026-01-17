/**
 * Insights Dashboard (Redesigned)
 *
 * Main analytics screen with five progressive sections:
 * 1. Totals / Performance Snapshot
 * 2. Strengths
 * 3. Weaknesses
 * 4. Trends
 * 5. Recommendations
 *
 * Philosophy: Insights ≠ Dashboard
 * - Dashboard = what happened
 * - Insights = what it means + what to do next
 */

import { useColors } from '@/hooks/ui/useColors';
import { getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Clock, History } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { EvidenceSheet } from './EvidenceSheet';
import { computeInsights } from './insights.engine';
import {
  ComputedInsights,
  DEFAULT_FILTERS,
  EvidenceContext,
  InsightsFilters,
  Recommendation,
  StrengthCard,
  TotalsMetric,
  TrendData,
  WeaknessCard,
} from './insights.types';
import { InsightsFilterBar } from './InsightsFilterBar';
import {
  RecommendationsSection,
  StrengthsSection,
  TotalsSection,
  TrendsSection,
  WeaknessesSection,
} from './sections';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SESSIONS_MESSAGE = 5;

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  colors: ReturnType<typeof useColors>;
  onStartSession: () => void;
}

function EmptyState({ colors, onStartSession }: EmptyStateProps) {
  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="analytics" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Start Building Your Insights
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Complete your first sessions to unlock personalized performance analysis
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={onStartSession}
      >
        <Text style={styles.emptyButtonText}>Start Training</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// NOT ENOUGH DATA STATE
// ============================================================================

interface NotEnoughDataProps {
  colors: ReturnType<typeof useColors>;
  currentSessions: number;
  minRequired: number;
}

function NotEnoughDataState({ colors, currentSessions, minRequired }: NotEnoughDataProps) {
  const progress = Math.min(currentSessions / minRequired, 1);

  return (
    <View style={[styles.notEnoughContainer, { backgroundColor: colors.card }]}>
      <View style={[styles.progressIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="hourglass" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.notEnoughTitle, { color: colors.text }]}>
        Building Your Profile
      </Text>
      <Text style={[styles.notEnoughText, { color: colors.textMuted }]}>
        {minRequired - currentSessions} more session{minRequired - currentSessions !== 1 ? 's' : ''} needed for full insights
      </Text>
      {/* Progress bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {currentSessions} of {minRequired} sessions
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsDashboard() {
  const colors = useColors();
  const router = useRouter();

  // Data state
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<InsightsFilters>(DEFAULT_FILTERS);

  // Evidence sheet state
  const [evidenceContext, setEvidenceContext] = useState<EvidenceContext | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await getRecentSessionsWithStats({ days: 365, limit: 500 });
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  // Compute insights
  const insights: ComputedInsights = useMemo(() => {
    return computeInsights(sessions, filters);
  }, [sessions, filters]);

  // Handlers for evidence view
  const openEvidenceForTotals = useCallback((metric: TotalsMetric) => {
    setEvidenceContext({
      insightType: 'totals',
      insightId: metric.id,
      title: metric.label,
      sessionIds: metric.evidenceIds,
    });
    setShowEvidence(true);
  }, []);

  const openEvidenceForStrength = useCallback((strength: StrengthCard) => {
    setEvidenceContext({
      insightType: 'strength',
      insightId: strength.id,
      title: strength.label,
      sessionIds: strength.evidenceIds,
    });
    setShowEvidence(true);
  }, []);

  const openEvidenceForWeakness = useCallback((weakness: WeaknessCard) => {
    setEvidenceContext({
      insightType: 'weakness',
      insightId: weakness.id,
      title: weakness.label,
      sessionIds: weakness.evidenceIds,
    });
    setShowEvidence(true);
  }, []);

  const openEvidenceForTrend = useCallback((trend: TrendData) => {
    setEvidenceContext({
      insightType: 'trend',
      insightId: trend.id,
      title: trend.label,
      sessionIds: trend.evidenceIds,
    });
    setShowEvidence(true);
  }, []);

  const openEvidenceForRecommendation = useCallback((rec: Recommendation) => {
    setEvidenceContext({
      insightType: 'recommendation',
      insightId: rec.id,
      title: rec.title,
      sessionIds: rec.evidenceIds,
    });
    setShowEvidence(true);
  }, []);

  // Handle add to training plan (placeholder)
  const handleAddToTrainingPlan = useCallback((rec: Recommendation) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Implement add to training plan
    console.log('Add to training plan:', rec);
  }, []);

  // Navigate to session history
  const goToSessionHistory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  }, [router]);

  // Navigate to start session
  const goToStartSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/(tabs)');
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasData = sessions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Insights</Text>
        </View>

        {/* Filter Bar */}
        {hasData && (
          <InsightsFilterBar filters={filters} onFiltersChange={setFilters} />
        )}

        {/* Content */}
        {!hasData ? (
          <EmptyState colors={colors} onStartSession={goToStartSession} />
        ) : !insights.hasEnoughData ? (
          <>
            <NotEnoughDataState
              colors={colors}
              currentSessions={insights.sessionCount}
              minRequired={insights.minSessionsRequired}
            />
            
            {/* Still show totals even with limited data */}
            {insights.totals.length > 0 && (
              <View style={styles.section}>
                <TotalsSection
                  metrics={insights.totals}
                  onMetricPress={openEvidenceForTotals}
                />
              </View>
            )}

            {/* Session history link */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card }]}
              onPress={goToSessionHistory}
              activeOpacity={0.7}
            >
              <History size={16} color={colors.text} />
              <Text style={[styles.linkText, { color: colors.text }]}>
                Session History
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* 1. Totals / Performance Snapshot */}
            <View style={styles.section}>
              <TotalsSection
                metrics={insights.totals}
                onMetricPress={openEvidenceForTotals}
              />
            </View>

            {/* Session history link */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card }]}
              onPress={goToSessionHistory}
              activeOpacity={0.7}
            >
              <History size={16} color={colors.text} />
              <Text style={[styles.linkText, { color: colors.text }]}>
                Session History
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* 2. Strengths */}
            <View style={styles.section}>
              <StrengthsSection
                strengths={insights.strengths}
                onStrengthPress={openEvidenceForStrength}
              />
            </View>

            {/* 3. Weaknesses */}
            <View style={styles.section}>
              <WeaknessesSection
                weaknesses={insights.weaknesses}
                onWeaknessPress={openEvidenceForWeakness}
              />
            </View>

            {/* 4. Trends */}
            <View style={styles.section}>
              <TrendsSection
                trends={insights.trends}
                onTrendPress={openEvidenceForTrend}
              />
            </View>

            {/* 5. Recommendations */}
            <View style={styles.section}>
              <RecommendationsSection
                recommendations={insights.recommendations}
                onRecommendationPress={openEvidenceForRecommendation}
                onAddToTrainingPlan={handleAddToTrainingPlan}
                onShowEvidence={openEvidenceForRecommendation}
              />
            </View>
          </>
        )}

        {/* Data range info */}
        {hasData && insights.dateRange.start && (
          <View style={styles.dateRangeContainer}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.dateRangeText, { color: colors.textMuted }]}>
              Data from {new Date(insights.dateRange.start).toLocaleDateString()} to{' '}
              {new Date(insights.dateRange.end).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Evidence Sheet */}
      <EvidenceSheet
        visible={showEvidence}
        context={evidenceContext}
        onClose={() => setShowEvidence(false)}
      />
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
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Sections
  section: {
    marginTop: 24,
  },

  // Link card
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    marginTop: 20,
    gap: 16,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Not enough data
  notEnoughContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    gap: 12,
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notEnoughTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notEnoughText: {
    fontSize: 13,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },

  // Date range
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
  },
  dateRangeText: {
    fontSize: 11,
  },

  bottomSpacer: {
    height: 100,
  },
});

export default InsightsDashboard;
