/**
 * PersonalInsights Component
 *
 * Solo/Personal insights view focused on individual improvement journey.
 * Shows: Overview, Trends, Strengths, Weaknesses, Recommendations, Context Profiles
 */

import { AIExplanationProvider } from '@/contexts/AIExplanationContext';
import { usePersonalInsights, type TeamOverviewSummary } from '@/hooks/insights/usePersonalInsights';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Clock, HelpCircle, History, Shield, TrendingUp, User, Users } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { ActivityChart } from './components/ActivityChart';
import { PerformanceChart } from './components/PerformanceChart';
import { EvidenceSheet } from './EvidenceSheet';
import { InsightsFilterBar } from './InsightsFilterBar';
import { ContextSummarySection } from './sections/ContextSummarySection';
import { DetailedBreakdownSection } from './sections/DetailedBreakdownSection';
import { OverviewSection } from './sections/OverviewSection';
import { RecommendationsSection } from './sections/RecommendationsSection';
import { TotalsSection } from './sections/TotalsSection';

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
// EMPTY STATE
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
// CONTEXT HEADER
// ============================================================================

function PersonalContextHeader({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.contextHeader, { borderColor: colors.border }]}>
      <View style={[styles.contextIcon, { backgroundColor: `${colors.textMuted}10` }]}>
        <User size={12} color={colors.textMuted} />
      </View>
      <Text style={[styles.contextLabel, { color: colors.textMuted }]}>PERSONAL INSIGHTS</Text>
    </View>
  );
}

// ============================================================================
// TEAM OVERVIEW SECTION (shows all user's teams)
// ============================================================================

interface TeamOverviewSectionProps {
  teams: TeamOverviewSummary[];
  totals: {
    sessions: number;
    shots: number;
    avgAccuracy: number | null;
    teamCount: number;
  };
  colors: ReturnType<typeof useColors>;
}

function TeamOverviewSection({ teams, totals, colors }: TeamOverviewSectionProps) {
  if (teams.length === 0) return null;

  return (
    <View style={styles.teamOverviewSection}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Users size={13} color={colors.textMuted} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR TEAMS</Text>
      </View>

      {/* Team list */}
      <View style={[styles.teamOverviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {teams.map((team, i) => (
          <View
            key={team.teamId}
            style={[
              styles.teamRow,
              i < teams.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                {team.teamName}
              </Text>
              <View style={styles.teamMeta}>
                {(team.myRole === 'owner' || team.myRole === 'commander') && (
                  <View style={[styles.roleBadge, { backgroundColor: `${colors.textMuted}12` }]}>
                    <Shield size={8} color={colors.textMuted} />
                    <Text style={[styles.roleBadgeText, { color: colors.textMuted }]}>CMD</Text>
                  </View>
                )}
                <Text style={[styles.teamMetaText, { color: colors.textMuted }]}>
                  {team.memberCount} members
                </Text>
              </View>
            </View>
            <View style={styles.teamStats}>
              <Text style={[styles.teamStatValue, { color: colors.text }]}>{team.sessions}</Text>
              <Text style={[styles.teamStatLabel, { color: colors.textMuted }]}>sess</Text>
            </View>
            <View style={styles.teamStats}>
              <Text style={[styles.teamStatValue, { color: team.avgAccuracy && team.avgAccuracy >= 70 ? colors.green : colors.text }]}>
                {team.avgAccuracy !== null ? `${team.avgAccuracy.toFixed(0)}%` : '—'}
              </Text>
              <Text style={[styles.teamStatLabel, { color: colors.textMuted }]}>acc</Text>
            </View>
          </View>
        ))}

        {/* Totals footer */}
        {teams.length > 1 && (
          <View style={[styles.teamTotalsFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.teamTotalsText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{totals.teamCount}</Text> teams · 
              <Text style={{ fontWeight: '600', color: colors.text }}> {totals.sessions}</Text> sessions · 
              <Text style={{ fontWeight: '600', color: colors.text }}> {totals.shots.toLocaleString()}</Text> shots
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PersonalInsights() {
  const { t } = useTranslation();
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const [detailsYOffset, setDetailsYOffset] = useState(0);

  const {
    loading,
    refreshing,
    filters,
    setFilters,
    hasData,
    userId,
    insights,
    contextProfiles,
    overviewStatus,
    performanceChartData,
    weeklyActivityData,
    quickStats,
    evidenceContext,
    showEvidence,
    closeEvidence,
    handleRefresh,
    openEvidenceForTotals,
    openEvidenceForStrength,
    openEvidenceForWeakness,
    openEvidenceForTrend,
    openEvidenceForRecommendation,
    openEvidenceForContextProfile,
    openEvidenceForOverviewAccuracy,
    openEvidenceForOverviewGrouping,
    openEvidenceForFocus,
    openEvidenceForTrust,
    goToSessionHistory,
    goToStartSession,
    handleAddToTrainingPlan,
    // Team overview
    teamOverviews,
    allTeamsTotals,
    hasTeams,
  } = usePersonalInsights();

  const scrollToDetails = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef.current?.scrollTo({ y: detailsYOffset, animated: true });
  }, [detailsYOffset]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AIExplanationProvider userId={userId}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />
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

          {/* Context Header */}
          <PersonalContextHeader colors={colors} />

          {/* Filter Bar */}
          {hasData && <InsightsFilterBar filters={filters} onFiltersChange={setFilters} />}

          {/* Content */}
          {!hasData ? (
            <EmptyState colors={colors} onStartSession={goToStartSession} />
          ) : (
            <>
              {/* Overview */}
              <OverviewSection
                status={overviewStatus}
                onAccuracyPress={openEvidenceForOverviewAccuracy}
                onGroupingPress={openEvidenceForOverviewGrouping}
                onFocusPress={openEvidenceForFocus}
                onTrustPress={openEvidenceForTrust}
              />

              {/* Trends */}
              {performanceChartData.length >= 3 && (
                <View style={styles.chartsSection}>
                  <SectionHeaderWithTooltip
                    title={t('insights.trends')}
                    tooltip={t('insights.trendsTooltip')}
                    icon={<TrendingUp size={13} color={colors.textMuted} />}
                    colors={colors}
                  />
                  <PerformanceChart data={performanceChartData} height={160} />
                  <ActivityChart data={weeklyActivityData} height={120} title={t('home.thisWeek')} />
                </View>
              )}

              {/* Limited content when not enough data */}
              {!insights.hasEnoughData ? (
                <>
                  {insights.totals.length > 0 && (
                    <View style={styles.sectionCompact}>
                      <TotalsSection metrics={insights.totals} onMetricPress={openEvidenceForTotals} />
                    </View>
                  )}
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
                    <TouchableOpacity style={styles.actionBarButton} onPress={goToSessionHistory} activeOpacity={0.6}>
                      <View style={[styles.actionBarIcon, { backgroundColor: `${colors.textMuted}12` }]}>
                        <History size={14} color={colors.textMuted} />
                      </View>
                      <Text style={[styles.actionBarText, { color: colors.text }]}>{t('common.history')}</Text>
                    </TouchableOpacity>
                    <View style={[styles.actionBarDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.actionBarButton} onPress={scrollToDetails} activeOpacity={0.6}>
                      <View style={[styles.actionBarIcon, { backgroundColor: `${colors.textMuted}12` }]}>
                        <TrendingUp size={14} color={colors.textMuted} />
                      </View>
                      <Text style={[styles.actionBarText, { color: colors.text }]}>{t('insights.details')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Detailed Breakdown */}
                  <View style={styles.sectionBlock} onLayout={(e) => setDetailsYOffset(e.nativeEvent.layout.y)}>
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

              {/* Team Overview */}
              {hasTeams && teamOverviews.length > 0 && (
                <TeamOverviewSection
                  teams={teamOverviews}
                  totals={allTeamsTotals}
                  colors={colors}
                />
              )}
            </>
          )}

          {/* Date range footer */}
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
        <EvidenceSheet visible={showEvidence} context={evidenceContext} onClose={closeEvidence} />
      </View>
    </AIExplanationProvider>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: Platform.OS === 'ios' ? 6 : 12 },

  // Header
  headerSection: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 12, fontWeight: '500' },

  // Context header
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  contextIcon: { width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  contextLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  // Sections
  sectionCompact: { marginTop: 24 },
  tooltipHeaderContainer: { marginBottom: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  helpButton: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tooltipBubble: { marginTop: 8, padding: 12, borderRadius: 10 },
  tooltipText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },

  // Charts
  chartsSection: { marginTop: 24, gap: 12 },

  // Section blocks
  sectionBlock: { marginTop: 24, gap: 14 },
  sectionDivider: { height: StyleSheet.hairlineWidth, opacity: 0.5 },

  // Action bar
  actionBar: { flexDirection: 'row', alignItems: 'center', marginTop: 16, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6 },
  actionBarButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  actionBarIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBarText: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  actionBarDivider: { width: 1, height: 20, opacity: 0.2 },

  // Link card
  linkCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginTop: 12, gap: 6 },
  linkText: { flex: 1, fontSize: 13, fontWeight: '500' },

  // Empty state
  emptyContainer: { alignItems: 'center', padding: 28, borderRadius: 14, marginTop: 16, gap: 14 },
  emptyIconContainer: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 6 },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Date range
  dateRangeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 24, opacity: 0.6 },
  dateRangeText: { fontSize: 10 },

  // Team overview section
  teamOverviewSection: { marginTop: 28 },
  teamOverviewCard: { borderRadius: 10, borderWidth: 1 },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 13, fontWeight: '600' },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  roleBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.4 },
  teamMetaText: { fontSize: 10 },
  teamStats: { alignItems: 'center', width: 44 },
  teamStatValue: { fontSize: 14, fontWeight: '700' },
  teamStatLabel: { fontSize: 9, marginTop: 1 },
  teamTotalsFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 14 },
  teamTotalsText: { fontSize: 11, textAlign: 'center' },

  bottomSpacer: { height: 80 },
});

export default PersonalInsights;
