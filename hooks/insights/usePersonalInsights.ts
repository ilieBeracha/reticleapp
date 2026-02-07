/**
 * usePersonalInsights Hook
 *
 * Provides all data and handlers for personal/solo insights view.
 * Extracted from InsightsDashboard for cleaner separation.
 */

import { DEFAULT_FILTERS } from '@/constants/insights';
import { useAuth } from '@/contexts/AuthContext';
import { applyFilters, computeContextProfiles, computeInsights, computeOverviewStatus } from '@/services/insights/dashboardEngine';
import { featuresToSessions } from '@/services/insights/insightsAdapter';
import { getDashboardFeatures } from '@/services/session/queries';
import { supabase } from '@/services/supabase';
import { useTeamStore } from '@/stores/teamStore';
import type {
    ComputedContextProfiles,
    ComputedInsights,
    ContextProfile,
    EvidenceContext,
    InsightsFilters,
    OverviewStatus,
    Recommendation,
    StrengthCard,
    TotalsMetric,
    TrendData,
    WeaknessCard,
} from '@/types/insights';
import type { SessionWithDetails } from '@/types/session';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ActivityDataPoint } from '@/components/insights/components/ActivityChart';
import type { ChartDataPoint } from '@/components/insights/components/PerformanceChart';

// Team overview summary type
export interface TeamOverviewSummary {
  teamId: string;
  teamName: string;
  sessions: number;
  shots: number;
  avgAccuracy: number | null;
  memberCount: number;
  myRole: string | null;
}

export function usePersonalInsights() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  // Get user's teams
  const teams = useTeamStore((s) => s.teams);

  // Data state
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [teamSessions, setTeamSessions] = useState<Map<string, SessionWithDetails[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<InsightsFilters>(DEFAULT_FILTERS);

  // Evidence sheet state
  const [evidenceContext, setEvidenceContext] = useState<EvidenceContext | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  // Track initial load
  const initialLoadDone = useRef(false);

  // Load sessions (personal + team overview)
  const loadSessions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      // Load personal sessions
      const features = await getDashboardFeatures({
        userId: user.id,
        days: 365,
        limit: 500,
        teamId: null, // Personal sessions only
      });
      setSessions(featuresToSessions(features));

      // Load team sessions for overview (if user has teams)
      if (teams.length > 0) {
        const teamSessionsMap = new Map<string, SessionWithDetails[]>();
        await Promise.all(
          teams.map(async (team) => {
            try {
              const teamFeatures = await getDashboardFeatures({
                userId: user.id,
                days: 365,
                limit: 200,
                teamId: team.id,
              });
              teamSessionsMap.set(team.id, featuresToSessions(teamFeatures));
            } catch (e) {
              console.warn(`Failed to load team ${team.id} sessions:`, e);
            }
          })
        );
        setTeamSessions(teamSessionsMap);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, teams]);

  useEffect(() => {
    loadSessions();
    initialLoadDone.current = true;
  }, [loadSessions]);

  // Backfill check
  const backfillTriggered = useRef(false);
  useEffect(() => {
    if (!user?.id || loading || backfillTriggered.current) return;
    backfillTriggered.current = true;

    (async () => {
      try {
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const { count: featureCount } = await supabase
          .from('session_features')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const gap = (sessionCount ?? 0) - (featureCount ?? 0);
        if (gap > 2) {
          await supabase.rpc('backfill_user_session_features', { p_user_id: user.id });
          loadSessions();
        }
      } catch (e) {
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

  // Compute context profiles
  const contextProfiles: ComputedContextProfiles = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    return computeContextProfiles(completedSessions, undefined, t);
  }, [sessions, t]);

  // Compute overview status
  const overviewStatus: OverviewStatus = useMemo(() => {
    return computeOverviewStatus(insights, contextProfiles);
  }, [insights, contextProfiles]);

  // Apply filters for charts
  const filteredSessions = useMemo(() => {
    return applyFilters(sessions, filters);
  }, [sessions, filters]);

  // Performance chart data
  const performanceChartData: ChartDataPoint[] = useMemo(() => {
    const completedSessions = filteredSessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .slice(-15);

    return completedSessions.map((s) => ({
      date: s.started_at,
      accuracy: s.stats?.accuracy_pct ?? undefined,
      grouping: s.stats?.best_dispersion_cm ?? undefined,
    }));
  }, [filteredSessions]);

  // Weekly activity data
  const weeklyActivityData: ActivityDataPoint[] = useMemo(() => {
    const now = new Date();
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const result: ActivityDataPoint[] = [];

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

  // Quick stats
  const quickStats = useMemo(() => {
    const totalSessions = filteredSessions.filter((s) => s.status === 'completed').length;
    const totalRounds = filteredSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
    return { totalSessions, totalRounds };
  }, [filteredSessions]);

  // Team overview summaries
  const teamOverviews = useMemo((): TeamOverviewSummary[] => {
    return teams.map((team) => {
      const sessions = teamSessions.get(team.id) || [];
      const completed = sessions.filter((s) => s.status === 'completed');
      const totalShots = completed.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
      const totalHits = completed.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);

      return {
        teamId: team.id,
        teamName: team.name,
        sessions: completed.length,
        shots: totalShots,
        avgAccuracy: totalShots > 0 ? (totalHits / totalShots) * 100 : null,
        memberCount: team.member_count || 0,
        myRole: team.my_role,
      };
    }).filter((t) => t.sessions > 0); // Only show teams with activity
  }, [teams, teamSessions]);

  // Combined totals across all teams
  const allTeamsTotals = useMemo(() => {
    const totalSessions = teamOverviews.reduce((sum, t) => sum + t.sessions, 0);
    const totalShots = teamOverviews.reduce((sum, t) => sum + t.shots, 0);
    const totalHits = teamOverviews.reduce((sum, t) => {
      const sessions = teamSessions.get(t.teamId) || [];
      return sum + sessions.reduce((s, sess) => s + (sess.stats?.hits_total || 0), 0);
    }, 0);

    return {
      sessions: totalSessions,
      shots: totalShots,
      avgAccuracy: totalShots > 0 ? (totalHits / totalShots) * 100 : null,
      teamCount: teamOverviews.length,
    };
  }, [teamOverviews, teamSessions]);

  // Evidence handlers
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
    const sessionIds = [
      ...(profile.engagement?.evidenceIds ?? []),
      ...(profile.grouping?.evidenceIds ?? []),
    ];
    const uniqueIds = [...new Set(sessionIds)];

    setEvidenceContext({
      insightType: 'strength',
      insightId: profile.keyString,
      title: profile.label,
      sessionIds: uniqueIds,
    });
    setShowEvidence(true);
  }, []);

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

  // Navigation handlers
  const goToSessionHistory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  }, [router]);

  const goToStartSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/(tabs)');
  }, [router]);

  const handleAddToTrainingPlan = useCallback((rec: Recommendation) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('Add to training plan:', rec);
  }, []);

  const closeEvidence = useCallback(() => {
    setShowEvidence(false);
  }, []);

  return {
    // State
    loading,
    refreshing,
    sessions,
    filters,
    setFilters,
    hasData: sessions.length > 0,
    userId: user?.id ?? '',

    // Computed data
    insights,
    contextProfiles,
    overviewStatus,
    filteredSessions,
    performanceChartData,
    weeklyActivityData,
    quickStats,

    // Team overview (for personal insights page)
    teamOverviews,
    allTeamsTotals,
    hasTeams: teams.length > 0,

    // Evidence
    evidenceContext,
    showEvidence,
    closeEvidence,

    // Handlers
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
  };
}
