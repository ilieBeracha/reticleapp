/**
 * useTrainings Hook
 *
 * Manages all stateful logic for the Trainings Screen (Team Tab).
 * Handles team context, data loading, and navigation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { getTeamMembers } from '@/services/teamService';
import { useTeamContext, useTeamPermissions, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';

import type { InternalTab, UseTrainingsReturn } from './trainings.types';
import { calculateMemberStats, calculateTeamStats, getRoleConfig } from './trainings.helpers';

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

  // Load team members for stats (only on Manage tab)
  useFocusEffect(
    useCallback(() => {
      if (activeTeamId && activeTab === 'manage') {
        getTeamMembers(activeTeamId)
          .then(setMembers)
          .catch(console.error);
      }
    }, [activeTeamId, activeTab])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeams();
    if (activeTeamId) {
      await loadTeamTrainings(activeTeamId);
      if (activeTab === 'manage') {
        try {
          const membersData = await getTeamMembers(activeTeamId);
          setMembers(membersData);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setRefreshing(false);
  }, [loadTeams, loadTeamTrainings, activeTeamId, activeTab]);

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  // Filter trainings for active team
  const activeTeamTrainings = useMemo(() => {
    if (!activeTeamId) return [];
    return teamTrainings.filter(t => t.team_id === activeTeamId);
  }, [teamTrainings, activeTeamId]);

  // Live training detection
  const liveTraining = useMemo(() => {
    return activeTeamTrainings.find(t => t.status === 'ongoing');
  }, [activeTeamTrainings]);

  // Member stats
  const memberStats = useMemo(() => calculateMemberStats(members), [members]);

  // Team stats (this week)
  const teamStats = useMemo(() => calculateTeamStats(activeTeamTrainings), [activeTeamTrainings]);

  // UI computed values
  const showSwitcher = teamState === 'multiple_teams';
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

  const handleOpenLibrary = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/drillLibrary' as any);
  }, []);

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
    handleOpenLibrary,
    handleViewMembers,
    handleInviteMember,
    handleTeamSettings,
    setSwitcherOpen,
  };
}

