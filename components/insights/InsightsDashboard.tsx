/**
 * Insights Dashboard (Redesigned v2.1)
 *
 * Main analytics screen with new progressive hierarchy:
 * 1. Training Overview (answers "Am I improving?" immediately)
 * 2. Top Recommendations (actionable next steps)
 * 3. Context Breakdown (engagement ↔ grouping connection)
 * 4. Detailed Breakdown (collapsed: Strengths, Weaknesses, Trends)
 *
 * Philosophy: Insights ≠ Dashboard
 * - Dashboard = what happened
 * - Insights = what it means + what to do next
 *
 * AI Integration:
 * - Engine computes insights (authoritative)
 * - AI explains on demand (assistive)
 * - "Why?" buttons on cards load AI explanations
 */

import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/services/supabase';
import { getDashboardFeatures } from '@/services/sessionService';
import type { SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, HelpCircle, History, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AIExplanationProvider } from './AIExplanationProvider';
import { featuresToSessions } from './insights.adapter';
import { ActivityChart, type ActivityDataPoint } from './components/ActivityChart';
import { PerformanceChart, type ChartDataPoint } from './components/PerformanceChart';
import { EvidenceSheet } from './EvidenceSheet';
import { applyFilters, computeContextProfiles, computeInsights, computeOverviewStatus } from './insights.engine';
import {
  ComputedContextProfiles,
  ComputedInsights,
  ContextProfile,
  DEFAULT_FILTERS,
  EvidenceContext,
  InsightsFilters,
  OverviewStatus,
  Recommendation,
  StrengthCard,
  TotalsMetric,
  TrendData,
  WeaknessCard,
} from './insights.types';
import { InsightsFilterBar } from './InsightsFilterBar';
import { ContextSummarySection } from './sections/ContextSummarySection';
import { DetailedBreakdownSection } from './sections/DetailedBreakdownSection';
import { OverviewSection } from './sections/OverviewSection';
import { RecommendationsSection } from './sections/RecommendationsSection';
import { TotalsSection } from './sections/TotalsSection';

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
  const { t } = useTranslation();
  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="analytics" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('insights.startBuilding')}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {t('insights.completeFirstSessions')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={onStartSession}
      >
        <Text style={styles.emptyButtonText}>{t('insights.startTraining')}</Text>
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
  const { t } = useTranslation();
  const progress = Math.min(currentSessions / minRequired, 1);

  return (
    <View style={[styles.notEnoughContainer, { backgroundColor: colors.card }]}>
      <View style={[styles.progressIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="hourglass" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.notEnoughTitle, { color: colors.text }]}>
        {t('insights.buildingProfile')}
      </Text>
      <Text style={[styles.notEnoughText, { color: colors.textMuted }]}>
        {t('insights.moreSessionsNeeded', { count: minRequired - currentSessions })}
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
        {t('insights.sessionsProgress', { current: currentSessions, total: minRequired })}
      </Text>
    </View>
  );
}

// ============================================================================
// SECTION HEADER WITH TOOLTIP
// ============================================================================

interface SectionHeaderWithTooltipProps {
  title: string;
  tooltip: string;
  icon: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}

function SectionHeaderWithTooltip({ title, tooltip, icon, colors }: SectionHeaderWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTooltip(!showTooltip);
  }, [showTooltip]);

  return (
    <View style={styles.tooltipHeaderContainer}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          onPress={handlePress} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.helpButton, { backgroundColor: showTooltip ? `${colors.primary}15` : colors.card }]}
        >
          <HelpCircle size={12} color={showTooltip ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>
      {showTooltip && (
        <Animated.View 
          entering={FadeInDown.duration(200)} 
          exiting={FadeOut.duration(150)}
          style={[styles.tooltipBubble, { backgroundColor: colors.text }]}
        >
          <Text style={[styles.tooltipText, { color: colors.background }]}>{tooltip}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InsightsDashboard() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // Data state
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<InsightsFilters>(DEFAULT_FILTERS);

  // Evidence sheet state
  const [evidenceContext, setEvidenceContext] = useState<EvidenceContext | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  // Load sessions from lightweight session_features table
  const loadSessions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const features = await getDashboardFeatures({ userId: user.id, days: 365, limit: 500 });
      setSessions(featuresToSessions(features));
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Backfill check: if session_features is missing rows, trigger backfill once
  const backfillTriggered = useRef(false);
  useEffect(() => {
    if (!user?.id || loading || backfillTriggered.current) return;
    backfillTriggered.current = true;

    (async () => {
      try {
        // Count completed sessions
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed');

        // Count features
        const { count: featureCount } = await supabase
          .from('session_features')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const gap = (sessionCount ?? 0) - (featureCount ?? 0);
        if (gap > 2) {
          await supabase.rpc('backfill_user_session_features', { p_user_id: user.id });
          // Reload after backfill
          loadSessions();
        }
      } catch (e) {
        // Non-critical — don't block UI
        console.warn('Backfill check failed:', e);
      }
    })();
  }, [user?.id, loading, loadSessions]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  // Compute insights
  const insights: ComputedInsights = useMemo(() => {
    return computeInsights(sessions, filters, undefined, t);
  }, [sessions, filters, t]);

  // Compute context profiles (engagement ↔ grouping connection)
  const contextProfiles: ComputedContextProfiles = useMemo(() => {
    // Apply same filters as insights
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    return computeContextProfiles(completedSessions, undefined, t);
  }, [sessions, t]);

  // Compute overview status (for Training Overview card)
  const overviewStatus: OverviewStatus = useMemo(() => {
    return computeOverviewStatus(insights, contextProfiles);
  }, [insights, contextProfiles]);

  // Apply filters to sessions for charts
  const filteredSessions = useMemo(() => {
    return applyFilters(sessions, filters);
  }, [sessions, filters]);

  // Compute performance chart data (accuracy + grouping over time) - with filters
  const performanceChartData: ChartDataPoint[] = useMemo(() => {
    const completedSessions = filteredSessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .slice(-15); // Last 15 sessions

    return completedSessions.map((s) => ({
      date: s.started_at,
      accuracy: s.stats?.accuracy_pct ?? undefined,
      grouping: s.stats?.best_dispersion_cm ?? undefined,
    }));
  }, [filteredSessions]);

  // Compute weekly activity data - with filters
  const weeklyActivityData: ActivityDataPoint[] = useMemo(() => {
    const now = new Date();
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const result: ActivityDataPoint[] = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const daySessions = filteredSessions.filter((s) => {
        const sessionDate = new Date(s.started_at);
        return s.status === 'completed' && sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      result.push({
        label: days[dayStart.getDay()],
        sessions: daySessions.length,
        rounds: daySessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0),
      });
    }

    return result;
  }, [filteredSessions]);

  // Scroll ref for "View Details"
  const scrollViewRef = useRef<ScrollView>(null);
  const [detailsYOffset, setDetailsYOffset] = useState(0);

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

  const openEvidenceForContextProfile = useCallback((profile: ContextProfile) => {
    // Combine evidence from both engagement and grouping
    const sessionIds = [
      ...(profile.engagement?.evidenceIds ?? []),
      ...(profile.grouping?.evidenceIds ?? []), 
    ];
    // Deduplicate
    const uniqueIds = [...new Set(sessionIds)];
    
    setEvidenceContext({
      insightType: 'strength', // Reuse strength type for display purposes
      insightId: profile.keyString,
      title: profile.label,
      sessionIds: uniqueIds,
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

  // Scroll to details handler
  const scrollToDetails = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef.current?.scrollTo({ y: detailsYOffset, animated: true });
  }, [detailsYOffset]);

  // Open evidence for overview accuracy/grouping
  const openEvidenceForOverviewAccuracy = useCallback(() => {
    if (overviewStatus.accuracy?.evidenceIds.length) {
      setEvidenceContext({
        insightType: 'trend',
        insightId: 'accuracy-trend',
        title: t('insights.trendsData.accuracyTrend'),
        sessionIds: overviewStatus.accuracy.evidenceIds,
      });
      setShowEvidence(true);
    }
  }, [overviewStatus.accuracy, t]);

  const openEvidenceForOverviewGrouping = useCallback(() => {
    if (overviewStatus.grouping?.evidenceIds.length) {
      setEvidenceContext({
        insightType: 'trend',
        insightId: 'grouping-trend',
        title: t('insights.trendsData.groupingTrend'),
        sessionIds: overviewStatus.grouping.evidenceIds,
      });
      setShowEvidence(true);
    }
  }, [overviewStatus.grouping, t]);

  // Open evidence for focus item
  const openEvidenceForFocus = useCallback(() => {
    if (overviewStatus.focusItem) {
      setEvidenceContext({
        insightType: overviewStatus.focusItem.sourceType === 'weakness' ? 'weakness' : 'recommendation',
        insightId: overviewStatus.focusItem.sourceId,
        title: overviewStatus.focusItem.label,
        sessionIds: overviewStatus.focusItem.evidenceIds,
      });
      setShowEvidence(true);
    }
  }, [overviewStatus.focusItem]);

  // Open evidence for trust item
  const openEvidenceForTrust = useCallback(() => {
    if (overviewStatus.trustItem) {
      setEvidenceContext({
        insightType: 'strength',
        insightId: overviewStatus.trustItem.sourceId,
        title: overviewStatus.trustItem.label,
        sessionIds: overviewStatus.trustItem.evidenceIds,
      });
      setShowEvidence(true);
    }
  }, [overviewStatus.trustItem]);

  // Quick stats for compact display - shows filtered counts
  const quickStats = useMemo(() => {
    const totalSessions = filteredSessions.filter(s => s.status === 'completed').length;
    const totalRounds = filteredSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
    return { totalSessions, totalRounds };
  }, [filteredSessions]);

  // Loading state - ALL HOOKS MUST BE DEFINED BEFORE THIS EARLY RETURN
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasData = sessions.length > 0;

  // User ID for AI explanations (fallback to empty string if not logged in)
  const userId = user?.id ?? '';

  return (
    <AIExplanationProvider userId={userId}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          ref={scrollViewRef}
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
          <View style={styles.headerSection}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('insights.title')}</Text>
            {hasData && (
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {t('insights.headerSubtitle', { sessions: quickStats.totalSessions, rounds: quickStats.totalRounds })}
              </Text>
            )}
          </View>

          {/* Filter Bar */}
          {hasData && (
            <InsightsFilterBar filters={filters} onFiltersChange={setFilters} />
          )}

          {/* Content */}
          {!hasData ? (
            <EmptyState colors={colors} onStartSession={goToStartSession} />
          ) : (
            <>
              {/* Overview - Clean metrics */}
              <OverviewSection
                status={overviewStatus}
                onAccuracyPress={openEvidenceForOverviewAccuracy}
                onGroupingPress={openEvidenceForOverviewGrouping}
                onFocusPress={openEvidenceForFocus}
                onTrustPress={openEvidenceForTrust}
              />

              {/* Trends Section */}
              {performanceChartData.length >= 3 && (
                <View style={styles.chartsSection}>
                  <SectionHeaderWithTooltip
                    title={t('insights.trends')}
                    tooltip={t('insights.trendsTooltip')}
                    icon={<TrendingUp size={13} color={colors.textMuted} />}
                    colors={colors}
                  />

                  {/* Performance Chart */}
                  <PerformanceChart data={performanceChartData} height={160} />

                  {/* Weekly Activity */}
                  <ActivityChart
                    data={weeklyActivityData}
                    height={120}
                    title={t('home.thisWeek')}
                  />
                </View>
              )}

              {/* Show limited content when not enough data */}
              {!insights.hasEnoughData ? (
                <>
                  {/* Totals in a visual grid */}
                  {insights.totals.length > 0 && (
                    <View style={styles.sectionCompact}>
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
                    <History size={14} color={colors.textMuted} />
                    <Text style={[styles.linkText, { color: colors.text }]}>{t('session.history')}</Text>
                    <ChevronRight size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Recommendations */}
                  {insights.recommendations.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
                      <RecommendationsSection
                        recommendations={insights.recommendations}
                        onRecommendationPress={openEvidenceForRecommendation}
                        onAddToTrainingPlan={handleAddToTrainingPlan}
                        onShowEvidence={openEvidenceForRecommendation}
                        maxVisible={3}
                      />
                    </View>
                  )}

                  {/* Context Summary */}
                  {contextProfiles.profiles.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
                      <ContextSummarySection
                        profiles={contextProfiles.profiles}
                        summary={contextProfiles.summary}
                        onViewEvidence={openEvidenceForContextProfile}
                        maxVisible={4}
                      />
                    </View>
                  )}

                  {/* Action bar */}
                  <View style={[styles.actionBar, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                      style={styles.actionBarButton}
                      onPress={goToSessionHistory}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.actionBarIcon, { backgroundColor: `${colors.textMuted}12` }]}>
                        <History size={14} color={colors.textMuted} />
                      </View>
                      <Text style={[styles.actionBarText, { color: colors.text }]}>{t('common.history')}</Text>
                    </TouchableOpacity>
                    <View style={[styles.actionBarDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity
                      style={styles.actionBarButton}
                      onPress={scrollToDetails}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.actionBarIcon, { backgroundColor: `${colors.textMuted}12` }]}>
                        <TrendingUp size={14} color={colors.textMuted} />
                      </View>
                      <Text style={[styles.actionBarText, { color: colors.text }]}>{t('insights.details')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Detailed Breakdown */}
                  <View
                    style={styles.sectionBlock}
                    onLayout={(e) => setDetailsYOffset(e.nativeEvent.layout.y)}
                  >
                    <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
                    <DetailedBreakdownSection
                      strengths={insights.strengths}
                      weaknesses={insights.weaknesses}
                      trends={insights.trends}
                      onStrengthPress={openEvidenceForStrength}
                      onWeaknessPress={openEvidenceForWeakness}
                      onTrendPress={openEvidenceForTrend}
                    />
                  </View>
                </>
              )}
            </>
          )}

          {/* Data range - Subtle footer */}
          {hasData && insights.dateRange.start && (
            <View style={styles.dateRangeContainer}>
              <Clock size={10} color={colors.textMuted} />
              <Text style={[styles.dateRangeText, { color: colors.textMuted }]}>
                {new Date(insights.dateRange.start).toLocaleDateString()} – {new Date(insights.dateRange.end).toLocaleDateString()}
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
    </AIExplanationProvider>
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
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 6 : 12,
  },

  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Sections
  sectionCompact: {
    marginTop: 24,
  },
  tooltipHeaderContainer: {
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBubble: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
  },
  tooltipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Charts section
  chartsSection: {
    marginTop: 24,
    gap: 12,
  },

  // Section block — clear top divider + spacing for visual hierarchy
  sectionBlock: {
    marginTop: 24,
    gap: 14,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },

  // Action bar — compact card with icon buttons
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  actionBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  actionBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBarText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionBarDivider: {
    width: 1,
    height: 20,
    opacity: 0.2,
  },

  // Link card (legacy)
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 14,
    marginTop: 16,
    gap: 14,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Not enough data
  notEnoughContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    marginTop: 16,
    gap: 10,
  },
  progressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notEnoughTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  notEnoughText: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
  },

  // Date range - subtle
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 24,
    opacity: 0.6,
  },
  dateRangeText: {
    fontSize: 10,
  },

  bottomSpacer: {
    height: 80,
  },
});

export default InsightsDashboard;
