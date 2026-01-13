/**
 * useUnifiedHomePage Hook
 * 
 * All state management, effects, and callbacks for the unified home page.
 * Keeps the main component clean and focused on rendering.
 */

import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import {
    deleteSession,
    getMyActivePersonalSession,
    getRecentSessionsWithStats,
    type SessionWithDetails,
} from '@/services/sessionService';
import { useGarminStore } from '@/store/garminStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { mapSessionToHomeSession, type HomeSession } from '../types';
import { useHomeState } from '../useHomeState';
import { RECENT_SESSIONS_LIMIT, SESSION_FETCH_DAYS, SESSION_FETCH_LIMIT } from './UnifiedHomePage.constants';
import {
    calculateLastSessionDaysAgo,
    calculateStreak,
    calculateWeeklyStats,
    getCoachMessage,
    getGreeting,
} from './UnifiedHomePage.helpers';
import type { WeeklyStats } from './UnifiedHomePage.types';

export function useUnifiedHomePage() {
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH & CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const garminStatus = useGarminStore((s) => s.status);
  const isGarminConnected = garminStatus === 'CONNECTED';

  // User info
  const greeting = getGreeting();
  const firstName = profileFullName?.split(' ')[0] || 'Shooter';
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url ?? null;
  const fallbackInitial =
    profileFullName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';

  // ═══════════════════════════════════════════════════════════════════════════
  // STORES
  // ═══════════════════════════════════════════════════════════════════════════
  const { sessions, loading: sessionsLoading, initialized } = useSessionStore();
  const { teams, loadTeams } = useTeamStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionWithDetails[]>([]);
  const [loadingAllSessions, setLoadingAllSessions] = useState(true);
  const initialLoadDone = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  const loadAllSessions = useCallback(async () => {
    try {
      const sessions = await getRecentSessionsWithStats({ 
        days: SESSION_FETCH_DAYS, 
        limit: SESSION_FETCH_LIMIT 
      });
      setAllSessions(sessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
    } finally {
      setLoadingAllSessions(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) {
        loadAllSessions();
        loadMyUpcomingTrainings();
        loadMyStats();
        return;
      }
      initialLoadDone.current = true;
      loadAllSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
      loadTeams();
    }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams])
  );

  useEffect(() => {
    setOnSessionCreated(() => loadAllSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadAllSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════════════════
  const hasTeams = teams.length > 0;

  // Filter upcoming trainings
  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      .filter((t) => !allSessions.some((s) => s.training_id === t.id && s.status === 'active'))
      .slice(0, 3);
  }, [myUpcomingTrainings, allSessions]);

  // Today's trainings only (for hero section)
  const todayTrainings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return myUpcomingTrainings
      .filter((t) => {
        if (t.status === 'ongoing') return true; // Always show ongoing
        const trainingDate = new Date(t.scheduled_date || t.created_at || '');
        return trainingDate >= today && trainingDate < tomorrow;
      })
      .filter((t) => !allSessions.some((s) => s.training_id === t.id && s.status === 'active'));
  }, [myUpcomingTrainings, allSessions]);

  const homeState = useHomeState({
    sessions: allSessions,
    upcomingTrainings,
    hasTeams,
  });

  // Map sessions for display
  const timelineSessions = useMemo(() => {
    return allSessions.map((session) => mapSessionToHomeSession(session));
  }, [allSessions]);

  const completedSessions = useMemo(() => {
    return allSessions.filter((s) => s.status === 'completed');
  }, [allSessions]);

  const recentSessions = useMemo(() => {
    return timelineSessions
      .filter((s) => s.state === 'completed' || s.state === 'unreviewed')
      .slice(0, RECENT_SESSIONS_LIMIT);
  }, [timelineSessions]);

  // Weekly stats
  const weeklyStats: WeeklyStats = useMemo(() => {
    return calculateWeeklyStats(completedSessions);
  }, [completedSessions]);

  // Streak
  const streak = useMemo(() => {
    return calculateStreak(completedSessions);
  }, [completedSessions]);

  // Last session days ago
  const lastSessionDaysAgo = useMemo(() => {
    return calculateLastSessionDaysAgo(completedSessions);
  }, [completedSessions]);

  // Coach message
  const coachMessage = useMemo(
    () =>
      getCoachMessage({
        sessions: weeklyStats.sessions,
        shots: weeklyStats.shots,
        accuracy: weeklyStats.accuracy,
        hasActiveSession: !!homeState.activeSession,
        hasUpcoming: upcomingTrainings.length > 0,
        streak,
      }),
    [weeklyStats, homeState.activeSession, upcomingTrainings, streak]
  );

  // UI state
  const hasActiveSession = homeState.activeSession && homeState.activeSession.origin === 'solo';
  const hasTeamContent = upcomingTrainings.length > 0 || hasTeams;
  const shouldShowLoading =
    (loadingAllSessions && allSessions.length === 0) || (!initialized && sessionsLoading);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadAllSessions(), loadMyUpcomingTrainings(), loadMyStats(), loadTeams()]);
    setRefreshing(false);
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams]);

  const handleStartSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        setStarting(false);
        Alert.alert(
          'Active Session',
          `You have an active session${existing.drill_name ? ` for "${existing.drill_name}"` : ''}. What would you like to do?`,
          [
            { text: 'Continue', onPress: () => router.push(`/(protected)/activeSession?sessionId=${existing.id}`) },
            {
              text: 'Delete & Start New',
              style: 'destructive',
              onPress: async () => {
                await deleteSession(existing.id);
                await loadAllSessions();
                router.push('/(protected)/createSession');
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
      router.push('/(protected)/createSession');
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, loadAllSessions]);

  const handleActiveSessionPress = useCallback(() => {
    if (homeState.activeSession?.sourceSession) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(protected)/activeSession?sessionId=${homeState.activeSession.sourceSession.id}`);
    }
  }, [homeState.activeSession]);

  const handleSessionPress = useCallback((session: HomeSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (session.sourceSession) {
      router.push(`/(protected)/sessionDetail?sessionId=${session.sourceSession.id}`);
    }
  }, []);

  const handleTrainingPress = useCallback((training: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}`);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    // User info
    greeting,
    firstName,
    avatarUrl,
    fallbackInitial,
    isGarminConnected,

    // State
    refreshing,
    starting,
    shouldShowLoading,

    // Data
    homeState,
    weeklyStats,
    streak,
    lastSessionDaysAgo,
    coachMessage,
    recentSessions,
    upcomingTrainings,
    todayTrainings, // Today's team events only
    hasActiveSession,
    hasTeamContent,
    hasTeams,
    allSessions, // Raw session data for charts

    // Handlers
    onRefresh,
    handleStartSession,
    handleActiveSessionPress,
    handleSessionPress,
    handleTrainingPress,
  };
}

