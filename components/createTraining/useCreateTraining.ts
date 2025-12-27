/**
 * useCreateTraining Hook
 *
 * Manages all stateful logic for the Create Training Screen.
 * Handles form state, drill management, and submission.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard } from 'react-native';

import { createDrill, drillToTrainingInput, getTeamDrills } from '@/services/drillService';
import { createTraining } from '@/services/trainingService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { Drill, DrillInstanceConfig } from '@/types/workspace';

import {
    createDefaultScheduledDate,
    isStep1Complete,
    isStep2Complete,
    moveDrill,
} from './createTraining.helpers';
import type {
    DrillModalMode,
    QuickDrillPayload,
    TrainingDrillItem,
    UseCreateTrainingReturn,
    WizardStep,
} from './createTraining.types';

interface UseCreateTrainingParams {
  teamIdParam: string | undefined;
}

export function useCreateTraining({ teamIdParam }: UseCreateTrainingParams): UseCreateTrainingReturn {
  const { teams } = useTeamStore();
  const { loadTeamTrainings, loadMyUpcomingTrainings } = useTrainingStore();

  // Determine if team is locked (came from teamWorkspace with specific team)
  const isTeamLocked = !!teamIdParam;

  // Form state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teamIdParam ?? null);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(createDefaultScheduledDate);
  const [manualStart, setManualStart] = useState(true);
  const [drills, setDrills] = useState<TrainingDrillItem[]>([]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Drill library and modal state
  const [teamDrills, setTeamDrills] = useState<Drill[]>([]);
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [drillModalMode, setDrillModalMode] = useState<DrillModalMode>('configure');
  const [savingDrill, setSavingDrill] = useState(false);

  // ============================================================================
  // TEAM SYNC
  // ============================================================================

  // Sync selectedTeamId with URL param when it loads
  useEffect(() => {
    if (teamIdParam && !selectedTeamId) {
      setSelectedTeamId(teamIdParam);
    }
  }, [teamIdParam, selectedTeamId]);

  // Auto-select team if only one available (and no URL param was provided)
  useEffect(() => {
    if (teams.length === 1 && !selectedTeamId && !teamIdParam) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId, teamIdParam]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const canCreateDrills = selectedTeam?.my_role === 'owner' || selectedTeam?.my_role === 'commander';
  const needsTeamSelection = !selectedTeamId && teams.length > 1 && !isTeamLocked;

  const step1Complete = isStep1Complete(selectedTeamId, title);
  const step2Complete = isStep2Complete(drills);
  const canCreate = step1Complete && step2Complete && !submitting;

  // ============================================================================
  // LOAD DRILL LIBRARY
  // ============================================================================

  useEffect(() => {
    if (selectedTeamId) {
      getTeamDrills(selectedTeamId).then(setTeamDrills).catch(console.error);
    } else {
      setTeamDrills([]);
    }
  }, [selectedTeamId]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectTeam = useCallback((teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (teamId !== selectedTeamId) {
      setDrills([]); // Clear drills when switching teams
    }
    setSelectedTeamId(teamId);
  }, [selectedTeamId]);

  const handleRemoveDrill = useCallback((drillId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills(prev => prev.filter(d => d.id !== drillId));
  }, []);

  const handleMoveDrill = useCallback((index: number, direction: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills(prev => moveDrill(prev, index, direction));
  }, []);

  const handleSelectDrill = useCallback((drill: Drill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDrill(drill);
    setDrillModalMode('configure');
    setDrillModalVisible(true);
  }, []);

  const handleOpenQuickDrill = useCallback(() => {
    if (!selectedTeamId) {
      Alert.alert('Team Required', 'Please select a team first');
      return;
    }
    if (!canCreateDrills) {
      Alert.alert('Not Allowed', 'Only team owners and commanders can create drills.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDrill(null);
    setDrillModalMode('quick');
    setDrillModalVisible(true);
  }, [selectedTeamId, canCreateDrills]);

  const handleCloseDrillModal = useCallback(() => {
    setDrillModalVisible(false);
    setSelectedDrill(null);
  }, []);

  const handleConfigureConfirm = useCallback((config: DrillInstanceConfig) => {
    if (!selectedDrill) return;

    const trainingDrill = drillToTrainingInput(selectedDrill, config);

    setDrills(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        ...trainingDrill,
      },
    ]);

    setDrillModalVisible(false);
    setSelectedDrill(null);
  }, [selectedDrill]);

  const handleQuickDrillSave = useCallback(async (payload: QuickDrillPayload) => {
    if (!selectedTeamId || !canCreateDrills || savingDrill) return;

    setSavingDrill(true);
    try {
      const created = await createDrill(selectedTeamId, {
        name: payload.draft.name,
        drill_goal: payload.draft.drill_goal,
        target_type: payload.draft.drill_goal === 'grouping' ? 'paper' : payload.draft.target_type,
        distance_m: payload.instance.distance_m,
        rounds_per_shooter: payload.instance.rounds_per_shooter,
        time_limit_seconds: payload.instance.time_limit_seconds ?? undefined,
        strings_count: payload.instance.strings_count ?? undefined,
      });

      setTeamDrills(prev => [created, ...prev]);

      const trainingDrill = drillToTrainingInput(created, payload.instance);
      setDrills(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          ...trainingDrill,
        },
      ]);

      setDrillModalVisible(false);
    } catch (error: any) {
      console.error('Failed to create quick drill:', error);
      Alert.alert('Error', error?.message || 'Failed to create drill');
    } finally {
      setSavingDrill(false);
    }
  }, [selectedTeamId, canCreateDrills, savingDrill]);

  const handleNextStep = useCallback(() => {
    if (!step1Complete) {
      if (!selectedTeamId) {
        Alert.alert('Team Required', 'Please select a team first');
      } else if (!title.trim()) {
        Alert.alert('Name Required', 'Please enter a training name');
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(2);
  }, [step1Complete, selectedTeamId, title]);

  const handleBackStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(1);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedTeamId) {
      Alert.alert('Team Required', 'Please select a team for this training');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Name Required', 'Please enter a training name');
      return;
    }

    if (drills.length === 0) {
      Alert.alert('Drills Required', 'Add at least one drill to this training');
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const finalDate = new Date(scheduledDate);
      if (manualStart) {
        finalDate.setHours(0, 0, 0, 0);
      }

      await createTraining({
        team_id: selectedTeamId,
        title: title.trim(),
        scheduled_at: finalDate.toISOString(),
        manual_start: manualStart,
        drills: drills.map(({ id, ...drill }) => drill),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTeamTrainings(selectedTeamId).catch(() => {});
      loadMyUpcomingTrainings().catch(() => {});

      if (router.canGoBack()) {
        router.back();
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create training');
    } finally {
      setSubmitting(false);
    }
  }, [selectedTeamId, title, scheduledDate, manualStart, drills, loadTeamTrainings, loadMyUpcomingTrainings]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Teams
    teams,
    selectedTeamId,
    selectedTeam,
    isTeamLocked,
    needsTeamSelection,
    canCreateDrills,

    // Form state
    title,
    setTitle,
    scheduledDate,
    setScheduledDate,
    manualStart,
    setManualStart,
    drills,

    // UI state
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    submitting,
    currentStep,

    // Drill modal state
    teamDrills,
    selectedDrill,
    drillModalVisible,
    drillModalMode,
    savingDrill,

    // Validation
    step1Complete,
    step2Complete,
    canCreate,

    // Actions
    handleSelectTeam,
    handleRemoveDrill,
    handleMoveDrill,
    handleSelectDrill,
    handleOpenQuickDrill,
    handleCloseDrillModal,
    handleConfigureConfirm,
    handleQuickDrillSave,
    handleNextStep,
    handleBackStep,
    handleCreate,
  };
}

