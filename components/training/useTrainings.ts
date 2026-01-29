/**
 * useTrainings Hook
 *
 * Manages all stateful logic for the Trainings Screen (Team Tab).
 * Handles team context, data loading, and navigation.
 */

import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTeamRealtime } from '@/hooks/realtime/team/useTeamRealtime';
import { getRecentSessionsWithStats } from '@/services/session/queries';
import { getTeamMembers } from '@/services/teamService';
import { useTeamContext, useTeamPermissions, useTeamStore } from '@/stores/teamStore';
import { useTrainingStore } from '@/stores/trainingStore';
import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';

import {
    calculateMemberStats,
    calculateTeamStatsFromSessions,
    getRoleConfig,
    type SessionStatsData,
} from './trainings.helpers';
import type { InternalTab, UseTrainingsReturn } from './trainings.types';

export function useTrainings(): UseTrainingsReturn {
  // Team context - single source of truth
  const { teamState, teams, activeTeamId, activeTeam, loading: teamsLoading, initialized } = useTeamContext();
  const { canSchedule, canManage } = useTeamPermissions();
  const { loadTeams } = useTeamStore();
  const { teamTrainings, loadTeamTrainings, loadingTeamTrainings } = useTrainingStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<InternalTab>('calendar');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStatsData[]>([]);

  // Reset tab to calendar when switching teams
  useEffect(() => {
    setActiveTab('calendar');
  }, [activeTeamId]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams])
  );

  // Load trainings for active team
  useFocusEffect(
    useCallback(() => {
      if (activeTeamId) {
        loadTeamTrainings(activeTeamId);
      }
    }, [activeTeamId, loadTeamTrainings])
  );

  // Load team members (for unified Team tab - visible to all roles)
  useFocusEffect(
    useCallback(() => {
      if (activeTeamId && activeTab === 'team') {
        getTeamMembers(activeTeamId).then(setMembers).catch(console.error);
      }
    }, [activeTeamId, activeTab])
  );

  // Load session stats for team (for commanders - "This Week" section in Team tab)
  useFocusEffect(
    useCallback(() => {
      if (activeTeamId && activeTab === 'team' && canManage) {
        getRecentSessionsWithStats({ days: 7, limit: 100, teamId: activeTeamId })
          .then((sessions) => {
            // Extract stats data for calculation
            const statsData: SessionStatsData[] = sessions.map((s) => ({
              shots_fired: s.stats?.shots_fired ?? 0,
              accuracy_pct: s.stats?.accuracy_pct ?? 0,
              started_at: s.started_at,
            }));
            setSessionStats(statsData);
          })
          .catch(console.error);
      }
    }, [activeTeamId, activeTab, canManage])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeams();
    if (activeTeamId) {
      await loadTeamTrainings(activeTeamId);
      // Load members for unified Team tab (visible to all roles)
      if (activeTab === 'team') {
        try {
          const membersData = await getTeamMembers(activeTeamId);
          setMembers(membersData);
        } catch (e) {
          console.error(e);
        }
        // Refresh session stats for commanders
        if (canManage) {
          try {
            const sessions = await getRecentSessionsWithStats({ days: 7, limit: 100, teamId: activeTeamId });
            const statsData: SessionStatsData[] = sessions.map((s) => ({
              shots_fired: s.stats?.shots_fired ?? 0,
              accuracy_pct: s.stats?.accuracy_pct ?? 0,
              started_at: s.started_at,
            }));
            setSessionStats(statsData);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    setRefreshing(false);
  }, [loadTeams, loadTeamTrainings, activeTeamId, activeTab, canManage]);

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  // Subscribe to team updates (trainings, members) for live updates
  const { isConnected: realtimeConnected } = useTeamRealtime({
    teamId: activeTeamId,
    enabled: !!activeTeamId,
    onTrainingCreated: useCallback(() => {
      console.log('[useTrainings] Realtime: New training created, refreshing...');
      if (activeTeamId) loadTeamTrainings(activeTeamId);
    }, [activeTeamId, loadTeamTrainings]),
    onTrainingUpdated: useCallback(() => {
      console.log('[useTrainings] Realtime: Training updated, refreshing...');
      if (activeTeamId) loadTeamTrainings(activeTeamId);
    }, [activeTeamId, loadTeamTrainings]),
    onTrainingDeleted: useCallback(() => {
      console.log('[useTrainings] Realtime: Training deleted, refreshing...');
      if (activeTeamId) loadTeamTrainings(activeTeamId);
    }, [activeTeamId, loadTeamTrainings]),
    onMemberJoined: useCallback(() => {
      console.log('[useTrainings] Realtime: New member joined, refreshing members...');
      if (activeTeamId && activeTab === 'team') {
        getTeamMembers(activeTeamId).then(setMembers).catch(console.error);
      }
    }, [activeTeamId, activeTab]),
  });

  // Debug: Log realtime connection status
  useEffect(() => {
    console.log(`[useTrainings] Realtime connected: ${realtimeConnected}, teamId: ${activeTeamId}`);
  }, [realtimeConnected, activeTeamId]);

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  // Filter trainings for active team
  const activeTeamTrainings = useMemo(() => {
    if (!activeTeamId) return [];
    return teamTrainings.filter((t) => t.team_id === activeTeamId);
  }, [teamTrainings, activeTeamId]);

  // Live training detection
  const liveTraining = useMemo(() => {
    return activeTeamTrainings.find((t) => t.status === 'ongoing');
  }, [activeTeamTrainings]);

  // Member stats
  const memberStats = useMemo(() => calculateMemberStats(members), [members]);

  // Team stats (this week) - uses real session data when available
  const teamStats = useMemo(
    () => calculateTeamStatsFromSessions(activeTeamTrainings, sessionStats),
    [activeTeamTrainings, sessionStats]
  );

  // UI computed values - show switcher when user has any teams (allows switching/viewing team options)
  const showSwitcher = teamState !== 'no_teams';
  const roleConfig = activeTeam ? getRoleConfig(activeTeam.my_role) : null;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTrainingPress = useCallback((training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
  }, []);

  const handleCreateTraining = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/createTraining?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleViewMembers = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamMembers?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleInviteMember = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/inviteTeamMember?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleTeamSettings = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamSettings?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleOpenArmory = useCallback(() => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamArmory?teamId=${activeTeamId}` as any);
  }, [activeTeamId]);

  const handleTabChange = useCallback((tab: InternalTab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Team context
    teamState,
    teams,
    activeTeamId,
    activeTeam,
    initialized,
    teamsLoading,

    // Permissions
    canSchedule,
    canManage,

    // Data
    activeTeamTrainings,
    liveTraining,
    members,
    memberStats,
    teamStats,

    // UI state
    refreshing,
    activeTab,
    switcherOpen,
    loadingTeamTrainings,
    showSwitcher,
    roleConfig,

    // Actions
    onRefresh,
    handleTabChange,
    handleTrainingPress,
    handleCreateTraining,
    handleOpenArmory,
    handleViewMembers,
    handleInviteMember,
    handleTeamSettings,
    setSwitcherOpen,
  };
}
