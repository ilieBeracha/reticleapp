/**
 * useTeamHomePage Hook
 *
 * Team-specific home page data and handlers.
 * Focused on team context: trainings, members, team activity.
 */

import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CONTEXT_SWITCH_LOADING_DELAY_MS } from '@/constants/unifiedHomePage';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { featuresToSessions } from '@/services/insights/insightsAdapter';
import { getDashboardFeatures } from '@/services/session/queries';
import { syncHomeWidgets } from '@/services/widgets/widgetSyncService';
import { useGarminStore } from '@/stores/garminStore';
import { useTeamStore } from '@/stores/teamStore';
import { useTrainingStore } from '@/stores/trainingStore';
import type { WeeklyStats } from '@/types/home';
import { mapSessionToHomeSession } from '@/types/home.viewmodel';
import type { SessionWithDetails } from '@/types/session';
import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';
import { isGroupingSessionWithFallback } from '@/utils/drillGoal';
import { calculateStreak, calculateWeeklyStats, getGreeting } from '@/utils/unifiedHomePage.helpers';

export function useTeamHomePage() {
  const { t } = useTranslation();
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const garminStatus = useGarminStore((s) => s.status);
  const isGarminConnected = garminStatus === 'CONNECTED';

  // User info
  const greeting = getGreeting(t);
  const firstName = profileFullName?.split(' ')[0] || t('home.defaultFirstName');
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url ?? null;
  const fallbackInitial =
    profileFullName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';

  // Stores
  const { activeTeam, activeTeamId, loadActiveTeam, members, membersLoading } = useTeamStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

  // Get user's role in this team
  const myRole = useTeamStore((state) => {
    const team = state.teams.find((t) => t.id === state.activeTeamId);
    return team?.my_role || null;
  });
  const isCommander = myRole === 'owner' || myRole === 'commander';

  // Get permissions (including granted overrides)
  const { canCreateTraining } = usePermissions();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isContextSwitching, setIsContextSwitching] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(undefined);
  const contextSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Raw sessions from API (not enriched yet)
  const [rawTeamSessions, setRawTeamSessions] = useState<SessionWithDetails[]>([]);

  // Load team sessions — same source as useTeamInsights for consistency
  const loadTeamSessions = useCallback(async () => {
    if (!activeTeamId || !user?.id) return;
    try {
      const features = await getDashboardFeatures({
        userId: user.id,
        days: 365,
        limit: 500,
        teamId: activeTeamId,
      });
      setRawTeamSessions(featuresToSessions(features));
    } catch (error) {
      console.error('Failed to load team sessions:', error);
    } finally {
      setLoading(false);
      setIsContextSwitching(false);
    }
  }, [activeTeamId, user?.id]);

  // Enrich with member names reactively (no refetch when members change)
  const teamSessions = useMemo(() => {
    if (rawTeamSessions.length === 0) return rawTeamSessions;
    return rawTeamSessions.map((s) => {
      if (s.user_full_name) return s;
      const name = members?.find((m) => m.user_id === s.user_id);
      if (name) {
        return { ...s, user_full_name: name.profile?.full_name || name.profile?.email || null };
      }
      return s;
    });
  }, [rawTeamSessions, members]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadTeamSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
      if (activeTeamId) loadActiveTeam();
    }, [loadTeamSessions, loadMyUpcomingTrainings, loadMyStats, activeTeamId, loadActiveTeam])
  );

  // Context switch handling
  useEffect(() => {
    if (prevTeamIdRef.current === undefined) {
      prevTeamIdRef.current = activeTeamId;
      return;
    }
    if (prevTeamIdRef.current === activeTeamId) return;

    prevTeamIdRef.current = activeTeamId;

    if (contextSwitchTimeoutRef.current) {
      clearTimeout(contextSwitchTimeoutRef.current);
    }

    // Immediately clear old data and set loading state
    setIsContextSwitching(true);
    setLoading(true);
    setRawTeamSessions([]);

    // Debounce the actual data fetch
    contextSwitchTimeoutRef.current = setTimeout(() => {
      Promise.all([loadTeamSessions(), loadMyUpcomingTrainings(), loadMyStats()]).finally(() => {
        setIsContextSwitching(false);
        setLoading(false);
      });
    }, CONTEXT_SWITCH_LOADING_DELAY_MS);

    return () => {
      if (contextSwitchTimeoutRef.current) {

        clearTimeout(contextSwitchTimeoutRef.current);
      }
    };
  }, [activeTeamId, loadTeamSessions, loadMyUpcomingTrainings, loadMyStats]);

  // Filter trainings for active team
  const teamTrainings = useMemo(() => {
    if (!activeTeamId) return [];
    return myUpcomingTrainings
      .filter((t) => t.team_id === activeTeamId)
      .filter((t) => t.status === 'planned' || t.status === 'ongoing');
  }, [myUpcomingTrainings, activeTeamId]);

  // Active (live) trainings - there can be multiple
  const liveTrainings = useMemo(() => {
    return teamTrainings.filter((t) => t.status === 'ongoing');
  }, [teamTrainings]);

  // Upcoming trainings (planned)
  const upcomingTrainings = useMemo(() => {
    return teamTrainings.filter((t) => t.status === 'planned').slice(0, 5);
  }, [teamTrainings]);

  // Team stats
  const completedSessions = useMemo(() => {
    return teamSessions.filter((s) => s.status === 'completed');
  }, [teamSessions]);

  const weeklyStats: WeeklyStats = useMemo(() => {
    return calculateWeeklyStats(completedSessions);
  }, [completedSessions]);

  const streak = useMemo(() => {
    return calculateStreak(completedSessions);
  }, [completedSessions]);

  // Team member count
  const memberCount = activeTeam?.member_count ?? 0;

  // Recent activity (sessions from team members)
  const recentActivity = useMemo(() => {
    return teamSessions
      .filter((s) => s.status === 'completed')
      .slice(0, 5)
      .map((s) => {
        const isGrouping = isGroupingSessionWithFallback(s);
        return {
          id: s.id,
          userName: s.user_full_name || 'Unknown',
          action: 'completed session',
          timeAgo: getTimeAgo(new Date(s.ended_at || s.created_at)),
          shotCount: s.stats?.shots_fired || 0,
          // For grouping drills: show dispersion in cm; for engagement: show accuracy %
          accuracy: isGrouping ? undefined : s.stats?.accuracy_pct,
          groupingCm: isGrouping ? s.stats?.best_dispersion_cm : undefined,
        };
      });
  }, [teamSessions]);

  // Weekly goal (default to 10 sessions)
  const weeklyGoal = 10;

  // Leaderboard data - aggregate stats per user
  // Only engagement sessions count for accuracy (not grouping drills)
  const leaderboard = useMemo(() => {
    const userStats = new Map<
      string,
      { userName: string; sessions: number; engagementShots: number; hits: number }
    >();

    completedSessions.forEach((s) => {
      const userId = s.user_id;
      const userName = s.user_full_name || 'Unknown';
      const existing = userStats.get(userId) || { userName, sessions: 0, engagementShots: 0, hits: 0 };
      const isGrouping = isGroupingSessionWithFallback(s);

      userStats.set(userId, {
        userName,
        sessions: existing.sessions + 1,
        // Only count shots/hits from engagement sessions for accuracy
        engagementShots: existing.engagementShots + (isGrouping ? 0 : (s.stats?.shots_fired || 0)),
        hits: existing.hits + (isGrouping ? 0 : (s.stats?.hits_total || 0)),
      });
    });

    // Convert to array and sort by sessions (primary) and accuracy (secondary)
    return Array.from(userStats.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        sessions: data.sessions,
        shots: data.engagementShots,
        accuracy: data.engagementShots > 0 ? (data.hits / data.engagementShots) * 100 : 0,
        rank: 0,
      }))
      .sort((a, b) => {
        if (b.sessions !== a.sessions) return b.sessions - a.sessions;
        return b.accuracy - a.accuracy;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [completedSessions]);

  // Team members mapped for display
  const teamMembersDisplay = useMemo(() => {
    if (!members || members.length === 0) return [];

    return members.slice(0, 6).map((m: TeamMemberWithProfile) => ({
      userId: m.user_id,
      userName: m.profile?.full_name || m.profile?.email || 'Unknown',
      avatarUrl: m.profile?.avatar_url || null,
    }));
  }, [members]);

  // Total shots this week
  const totalShotsThisWeek = useMemo(() => {
    return completedSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
  }, [completedSessions]);

  const recentHomeSessions = useMemo(() => completedSessions.slice(0, 5).map(mapSessionToHomeSession), [completedSessions]);

  const activeSessionForWidget = useMemo(() => {
    const liveTraining = liveTrainings[0];
    if (!liveTraining) return null;
    return {
      id: `training-${liveTraining.id}`,
      state: 'active' as const,
      origin: 'team' as const,
      scheduledAt: liveTraining.scheduled_at ? new Date(liveTraining.scheduled_at) : null,
      startedAt: liveTraining.started_at ? new Date(liveTraining.started_at) : null,
      endedAt: null,
      expiresAt: null,
      trainingTitle: liveTraining.title,
      teamName: activeTeam?.name,
    };
  }, [liveTrainings, activeTeam?.name]);

  const nextSessionForWidget = useMemo(() => {
    const nextTraining = upcomingTrainings[0];
    if (!nextTraining) return null;
    return {
      id: `training-${nextTraining.id}`,
      state: 'scheduled' as const,
      origin: 'team' as const,
      scheduledAt: nextTraining.scheduled_at ? new Date(nextTraining.scheduled_at) : null,
      startedAt: null,
      endedAt: null,
      expiresAt: null,
      trainingTitle: nextTraining.title,
      teamName: activeTeam?.name,
    };
  }, [upcomingTrainings, activeTeam?.name]);

  useEffect(() => {
    void syncHomeWidgets({
      activeSession: activeSessionForWidget,
      nextSession: nextSessionForWidget,
      weeklyStats,
      streak,
      recentSessions: recentHomeSessions,
    });
  }, [activeSessionForWidget, nextSessionForWidget, weeklyStats, streak, recentHomeSessions]);

  // Loading state - wait for all data including activeTeam details
  const shouldShowLoading =
    isContextSwitching ||
    membersLoading || // Wait for activeTeam and members to load
    (loading && teamSessions.length === 0) ||
    (activeTeamId && !activeTeam); // Team selected but details not yet loaded

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadTeamSessions(), loadMyUpcomingTrainings(), loadMyStats()]);
    setRefreshing(false);
  }, [loadTeamSessions, loadMyUpcomingTrainings, loadMyStats]);

  const handleTrainingPress = useCallback((training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}`);
  }, []);

  const handleJoinTraining = useCallback((training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/trainingDetail?id=${training.id}`);
  }, []);

  const handleTeamSettings = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamSettings?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleViewTeamInsights = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)/insights');
  }, []);

  const handleStartTraining = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (liveTrainings.length === 1) {
      // Exactly one live training - go directly to it
      router.push(`/(protected)/trainingDetail?id=${liveTrainings[0].id}`);
    } else if (liveTrainings.length > 1) {
      // Multiple live trainings - go to the first one (banners show all)
      router.push(`/(protected)/trainingDetail?id=${liveTrainings[0].id}`);
    } else if (canCreateTraining && activeTeamId) {
      // User with training creation permission: create a team training
      router.push(`/(protected)/createTraining?teamId=${activeTeamId}` as any);
    } else {
      // Member without permission: start a solo session
      router.push('/(protected)/startEngagement');
    }
  }, [liveTrainings, canCreateTraining, activeTeamId]);

  const handleViewSchedule = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/createTraining?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleViewLeaderboard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)/insights');
  }, []);

  const handleViewAllMembers = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamMembers?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  // My personal stats (for member view)
  const myStats = useMemo(() => {
    const mySessions = completedSessions.filter((s) => s.user_id === user?.id);
    const totalShots = mySessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
    const totalHits = mySessions.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);
    return {
      sessions: mySessions.length,
      shots: totalShots,
      accuracy: totalShots > 0 ? (totalHits / totalShots) * 100 : 0,
    };
  }, [completedSessions, user?.id]);

  // Team totals (for member view - collaborative stats)
  const teamTotals = useMemo(() => {
    const totalSessions = completedSessions.length;
    const totalShots = completedSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
    const uniqueMembers = new Set(completedSessions.map((s) => s.user_id)).size;
    return {
      sessions: totalSessions,
      shots: totalShots,
      activeMembers: uniqueMembers,
    };
  }, [completedSessions]);

  return {
    // User info
    greeting,
    firstName,
    avatarUrl,
    fallbackInitial,
    isGarminConnected,
    userId: user?.id || '',

    // Role
    myRole,
    isCommander,
    canCreateTraining,

    // Team info
    activeTeam,
    memberCount,
    members: teamMembersDisplay,

    // State
    refreshing,
    shouldShowLoading,

    // Data
    liveTrainings,
    upcomingTrainings,
    teamTrainings, // All trainings for the current team (for calendar)
    weeklyStats,
    streak,
    recentActivity,
    sessionsThisWeek: weeklyStats.sessions,
    weeklyGoal,
    leaderboard,
    totalShotsThisWeek,
    myStats,
    teamTotals,

    // Handlers
    onRefresh,
    handleTrainingPress,
    handleJoinTraining,
    handleTeamSettings,
    handleViewTeamInsights,
    handleStartTraining,
    handleViewSchedule,
    handleViewLeaderboard,
    handleViewAllMembers,
  };
}

// Helper function
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
