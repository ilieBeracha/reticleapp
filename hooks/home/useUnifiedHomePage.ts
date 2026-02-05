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
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
    CONTEXT_SWITCH_LOADING_DELAY_MS,
    getFetchConfig,
} from '@/constants/unifiedHomePage';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useHomeState } from '@/hooks/home/useHomeState';
import { deleteSession } from '@/services/session/mutations';
import { getMyActivePersonalSession, getRecentSessionsWithStats } from '@/services/session/queries';
import { getDefaultWeapon, getWeaponStats, type UserWeapon, type WeaponStats } from '@/services/weaponService';
import { useGarminStore } from '@/stores/garminStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTeamStore } from '@/stores/teamStore';
import { useTrainingStore } from '@/stores/trainingStore';
import type { HeroMode, WeeklyStats } from '@/types/home';
import { mapSessionToHomeSession, type HomeSession } from '@/types/home.viewmodel';
import type { SessionWithDetails } from '@/types/session';
import {
    calculateLastSessionDaysAgo,
    calculateStreak,
    calculateWeeklyStats,
    getCoachMessage,
    getGreeting,
} from '@/utils/unifiedHomePage.helpers';

export function useUnifiedHomePage() {
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH & CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const { t } = useTranslation();
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const garminStatus = useGarminStore((s) => s.status);
  const isGarminConnected = garminStatus === 'CONNECTED';

  // User info
  const greeting = getGreeting(t);
  const firstName = profileFullName?.split(' ')[0] || t('home.defaultFirstName');
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url ?? null;
  const fallbackInitial =
    profileFullName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';

  // ═══════════════════════════════════════════════════════════════════════════
  // STORES
  // ═══════════════════════════════════════════════════════════════════════════
  const { sessions, loading: sessionsLoading, initialized } = useSessionStore();
  const { teams, loadTeams, activeTeamId, activeTeam } = useTeamStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionWithDetails[]>([]);
  const [loadingAllSessions, setLoadingAllSessions] = useState(true);
  const [defaultWeapon, setDefaultWeapon] = useState<UserWeapon | null>(null);
  const [weaponStatsMap, setWeaponStatsMap] = useState<Map<string, WeaponStats>>(new Map());
  const [isContextSwitching, setIsContextSwitching] = useState(false);
  const initialLoadDone = useRef(false);
  const prevTeamIdRef = useRef<string | null | undefined>(undefined);
  const contextSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  // Get fetch configuration based on mode
  const isTeamMode = activeTeamId !== null;
  const fetchConfig = getFetchConfig(isTeamMode);

  const loadAllSessions = useCallback(async () => {
    try {
      const config = getFetchConfig(activeTeamId !== null);
      const sessions = await getRecentSessionsWithStats({
        days: config.days,
        limit: config.limit,
        teamId: activeTeamId,
      });
      setAllSessions(sessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
    } finally {
      setLoadingAllSessions(false);
      setIsContextSwitching(false);
    }
  }, [activeTeamId]);

  const loadWeaponData = useCallback(async () => {
    try {
      const [weapon, stats] = await Promise.all([
        getDefaultWeapon(),
        getWeaponStats(),
      ]);
      setDefaultWeapon(weapon);
      setWeaponStatsMap(stats);
    } catch (error) {
      console.error('Failed to load weapon data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) {
        loadAllSessions();
        loadMyUpcomingTrainings();
        loadMyStats();
        loadWeaponData();
        return;
      }
      initialLoadDone.current = true;
      loadAllSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
      loadTeams();
      loadWeaponData();
    }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams, loadWeaponData])
  );

  useEffect(() => {
    setOnSessionCreated(() => loadAllSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadAllSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // Reload all data when account context changes (personal <-> team switch)
  useEffect(() => {
    // Skip on initial render
    if (prevTeamIdRef.current === undefined) {
      prevTeamIdRef.current = activeTeamId;
      return;
    }

    // Only trigger if actually changed
    if (prevTeamIdRef.current === activeTeamId) {
      return;
    }

    prevTeamIdRef.current = activeTeamId;

    // Clear any pending timeout
    if (contextSwitchTimeoutRef.current) {
      clearTimeout(contextSwitchTimeoutRef.current);
    }

    // Small delay to prevent flash on quick switches
    contextSwitchTimeoutRef.current = setTimeout(() => {
      setIsContextSwitching(true);
      setLoadingAllSessions(true);
      setAllSessions([]); // Clear old data to show fresh state

      // Reload everything for the new context
      Promise.all([
        loadAllSessions(),
        loadMyUpcomingTrainings(),
        loadMyStats(),
        loadWeaponData(),
      ]).finally(() => {
        setIsContextSwitching(false);
      });
    }, CONTEXT_SWITCH_LOADING_DELAY_MS);

    return () => {
      if (contextSwitchTimeoutRef.current) {
        clearTimeout(contextSwitchTimeoutRef.current);
      }
    };
  }, [activeTeamId, loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadWeaponData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════════════════
  const hasTeams = teams.length > 0;

  // Filter upcoming trainings by account context
  // Personal mode: No trainings (trainings are team-only)
  // Team mode: Only show trainings from the active team
  const upcomingTrainings = useMemo(() => {
    // In personal mode, don't show any team trainings
    if (activeTeamId === null) {
      return [];
    }
    
    return myUpcomingTrainings
      .filter((t) => t.team_id === activeTeamId) // Only from active team
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      .filter((t) => !allSessions.some((s) => s.training_id === t.id && s.status === 'active'))
      .slice(0, 3);
  }, [myUpcomingTrainings, allSessions, activeTeamId]);

  // All upcoming trainings from ALL teams — for personal mode home page
  // Sorted by closest date, includes team name for display
  const allTeamsUpcoming = useMemo(() => {
    return myUpcomingTrainings
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      .filter((t) => t.scheduled_at) // Must have a date
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  }, [myUpcomingTrainings]);

  // Map of team IDs to team names for display
  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [teams]);

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
      .slice(0, fetchConfig.recentLimit);
  }, [timelineSessions, fetchConfig.recentLimit]);

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
      getCoachMessage(
        {
          sessions: weeklyStats.sessions,
          shots: weeklyStats.shots,
          accuracy: weeklyStats.accuracy,
          hasActiveSession: !!homeState.activeSession,
          hasUpcoming: upcomingTrainings.length > 0,
          streak,
        },
        t
      ),
    [weeklyStats, homeState.activeSession, upcomingTrainings, streak, t]
  );

  // Default weapon stats
  const defaultWeaponStats = useMemo(() => {
    if (!defaultWeapon) return null;
    return weaponStatsMap.get(defaultWeapon.id) || null;
  }, [defaultWeapon, weaponStatsMap]);

  // Active team training (ongoing status) - only from active team
  const activeTeamTraining = useMemo(() => {
    // In personal mode, no active team training
    if (activeTeamId === null) return null;
    return myUpcomingTrainings.find((t) => t.status === 'ongoing' && t.team_id === activeTeamId) ?? null;
  }, [myUpcomingTrainings, activeTeamId]);

  // Is the current user the commander of the active team training?
  const isTrainingCommander = !!(activeTeamTraining && user && activeTeamTraining.created_by === user.id);

  // Active solo session
  const activeSoloSession = homeState.activeSession?.origin === 'solo' ? homeState.activeSession : null;

  // Hero mode priority logic
  const heroMode: HeroMode = useMemo(() => {
    if (activeTeamTraining) return 'team-live';
    if (activeSoloSession) return 'solo-active';
    return 'idle';
  }, [activeTeamTraining, activeSoloSession]);

  // Next upcoming training (planned, not ongoing) for secondary row - only from active team
  const nextUpcomingTraining = useMemo(() => {
    // In personal mode, no upcoming trainings
    if (activeTeamId === null) return null;
    return myUpcomingTrainings.find((t) => t.status === 'planned' && t.scheduled_at && t.team_id === activeTeamId) ?? null;
  }, [myUpcomingTrainings, activeTeamId]);

  // All upcoming trainings filtered by account context (for timeline strip in HeroActions)
  const filteredUpcomingTrainings = useMemo(() => {
    // In personal mode, no trainings
    if (activeTeamId === null) return [];
    return myUpcomingTrainings.filter((t) => t.team_id === activeTeamId);
  }, [myUpcomingTrainings, activeTeamId]);

  // UI state
  const hasActiveSession = !!homeState.activeSession;
  const hasTeamContent = upcomingTrainings.length > 0 || hasTeams;
  const shouldShowLoading =
    isContextSwitching || // Show loading during team/account switch
    (loadingAllSessions && allSessions.length === 0) ||
    (!initialized && sessionsLoading);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadAllSessions(), loadMyUpcomingTrainings(), loadMyStats(), loadTeams(), loadWeaponData()]);
    setRefreshing(false);
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams, loadWeaponData]);

  const handleStartSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        setStarting(false);
        Alert.alert(
          t('home.activeSession.title'),
          existing.drill_name
            ? t('home.activeSession.messageWithDrill', { drillName: existing.drill_name })
            : t('home.activeSession.message', { drillName: '' }),
          [
            { text: t('common.continue'), onPress: () => router.push(`/(protected)/activeSession?sessionId=${existing.id}`) },
            {
              text: t('home.activeSession.deleteAndStart'),
              style: 'destructive',
              onPress: async () => {
                await deleteSession(existing.id);
                await loadAllSessions();
                router.push('/(protected)/startEngagement');
              },
            },
            { text: t('common.cancel'), style: 'cancel' },
          ]
        );
        return;
      }
      router.push('/(protected)/startEngagement');
    } catch (error) {
      console.error('Failed to start engagement:', error);
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
    myUpcomingTrainings: filteredUpcomingTrainings, // Filtered by account context for timeline strip
    hasActiveSession,
    hasTeamContent,
    hasTeams,
    heroMode,
    activeTeam, // Current active team (for team colors)
    activeTeamTraining,
    isTrainingCommander,
    nextUpcomingTraining,
    allSessions, // Raw session data for charts
    allTeamsUpcoming, // All upcoming trainings from all teams (for personal mode)
    teamNameMap, // Map of team IDs to names
    defaultWeapon, // Default weapon info
    defaultWeaponStats, // Stats for default weapon

    // Handlers
    onRefresh,
    handleStartSession,
    handleActiveSessionPress,
    handleSessionPress,
    handleTrainingPress,
  };
}

