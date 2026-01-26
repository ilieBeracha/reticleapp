/**
 * useCreateTraining V2 Hook
 *
 * Simplified 2-step flow using new canonical drills architecture:
 * 1. Training Details - Team, name, schedule
 * 2. Select & Configure Drills - Canonical drills + team presets
 *
 * Key changes from V1:
 * - Uses canonical drills (global, read-only)
 * - Uses team presets (saved configurations)
 * - Simpler flow (no Step 3 "custom builder")
 * - DrillConfig stored separately from drill reference
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard } from 'react-native';

import {
  createTeamPreset,
  getDrillsGroupedByCategory,
  getTeamPresets,
  type CanonicalDrill,
  type DrillCategory,
  type DrillConfig,
  type TeamDrillPreset,
  type TrainingDrillItem
} from '@/services/drills';
import { createTraining } from '@/services/trainingService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamWithRole } from '@/types/workspace';

import { createDefaultScheduledDate, isStep1Complete } from './createTraining.helpers';

// ============================================================================
// TYPES
// ============================================================================

type WizardStep = 1 | 2;

interface UseCreateTrainingV2Params {
  teamIdParam: string | undefined;
}

export interface UseCreateTrainingV2Return {
  // Teams
  teams: TeamWithRole[];
  selectedTeamId: string | null;
  selectedTeam: TeamWithRole | undefined;
  isTeamLocked: boolean;
  canCreatePresets: boolean;

  // Form state
  title: string;
  setTitle: (title: string) => void;
  scheduledDate: Date;
  setScheduledDate: (date: Date) => void;
  manualStart: boolean;
  setManualStart: (manual: boolean) => void;
  drills: TrainingDrillItem[];

  // UI state
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (show: boolean) => void;
  submitting: boolean;
  currentStep: WizardStep;
  loading: boolean;

  // Drill data
  canonicalDrills: Record<DrillCategory, CanonicalDrill[]>;
  teamPresets: TeamDrillPreset[];

  // Adjust modal
  adjustingDrill: TrainingDrillItem | null;
  adjustModalVisible: boolean;

  // Validation
  step1Complete: boolean;
  step2Complete: boolean;
  canCreate: boolean;

  // Actions
  handleSelectTeam: (teamId: string) => void;
  handleRemoveDrill: (drillId: string) => void;
  handleMoveDrill: (index: number, direction: 'up' | 'down') => void;
  addDrill: (drill: TrainingDrillItem) => void;
  handleNextStep: () => void;
  handleBackStep: () => void;
  handleCreate: () => Promise<void>;
  handleAdjustDrill: (drill: TrainingDrillItem) => void;
  handleCloseAdjustModal: () => void;
  handleUpdateDrill: (updated: TrainingDrillItem) => void;
  handleSavePreset: (drillId: string, config: DrillConfig, label?: string) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCreateTrainingV2({ teamIdParam }: UseCreateTrainingV2Params): UseCreateTrainingV2Return {
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
  const [loading, setLoading] = useState(false);

  // Drill data
  const [canonicalDrills, setCanonicalDrills] = useState<Record<DrillCategory, CanonicalDrill[]>>({
    zeroing: [],
    grouping: [],
    speed: [],
    qualification: [],
  });
  const [teamPresets, setTeamPresets] = useState<TeamDrillPreset[]>([]);

  // Adjust modal
  const [adjustingDrill, setAdjustingDrill] = useState<TrainingDrillItem | null>(null);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);

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

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const canCreatePresets = selectedTeam?.my_role === 'owner' || selectedTeam?.my_role === 'commander';

  const step1Complete = isStep1Complete(selectedTeamId, title);
  const step2Complete = drills.length > 0;
  const canCreate = step1Complete && step2Complete && !submitting;

  // ============================================================================
  // LOAD CANONICAL DRILLS + TEAM PRESETS
  // ============================================================================

  // Load canonical drills once
  useEffect(() => {
    setLoading(true);
    getDrillsGroupedByCategory()
      .then(setCanonicalDrills)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load team presets when team changes
  useEffect(() => {
    if (selectedTeamId) {
      getTeamPresets(selectedTeamId).then(setTeamPresets).catch(console.error);
    } else {
      setTeamPresets([]);
    }
  }, [selectedTeamId]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectTeam = useCallback(
    (teamId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (teamId !== selectedTeamId) {
        setDrills([]); // Clear drills when switching teams
      }
      setSelectedTeamId(teamId);
    },
    [selectedTeamId]
  );

  const handleRemoveDrill = useCallback((drillId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills((prev) => prev.filter((d) => d.id !== drillId));
  }, []);

  const handleMoveDrill = useCallback((index: number, direction: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills((prev) => {
      const arr = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  }, []);

  const addDrill = useCallback((drill: TrainingDrillItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills((prev) => [...prev, drill]);
  }, []);

  const handleNextStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep === 1) {
      // Validate step 1 before moving to step 2
      if (!step1Complete) {
        if (!selectedTeamId) {
          Alert.alert('Team Required', 'Please select a team first');
        } else if (!title.trim()) {
          Alert.alert('Name Required', 'Please enter a training name');
        }
        return;
      }
      setCurrentStep(2);
    }
  }, [currentStep, step1Complete, selectedTeamId, title]);

  const handleBackStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  }, [currentStep]);

  // ============================================================================
  // ADJUST DRILL HANDLERS
  // ============================================================================

  const handleAdjustDrill = useCallback((drill: TrainingDrillItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAdjustingDrill(drill);
    setAdjustModalVisible(true);
  }, []);

  const handleCloseAdjustModal = useCallback(() => {
    setAdjustModalVisible(false);
    setAdjustingDrill(null);
  }, []);

  const handleUpdateDrill = useCallback((updated: TrainingDrillItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setAdjustModalVisible(false);
    setAdjustingDrill(null);
  }, []);

  // ============================================================================
  // SAVE PRESET
  // ============================================================================

  const handleSavePreset = useCallback(
    async (drillId: string, config: DrillConfig, label?: string) => {
      if (!selectedTeamId || !canCreatePresets) return;

      try {
        const preset = await createTeamPreset({
          team_id: selectedTeamId,
          drill_id: drillId,
          label: label || null,
          distance_m: config.distance_m,
          rounds: config.rounds,
          time_limit_seconds: config.time_limit_seconds,
          position: config.position,
          strings_count: config.strings_count,
        });

        setTeamPresets((prev) => [preset, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved', 'Configuration saved as team preset');
      } catch (error: any) {
        console.error('[CreateTraining] Failed to save preset:', error);
        Alert.alert('Error', error?.message || 'Failed to save preset');
      }
    },
    [selectedTeamId, canCreatePresets]
  );

  // ============================================================================
  // CREATE TRAINING
  // ============================================================================

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

      // Convert TrainingDrillItem (V2) to the format expected by createTraining
      // Note: drill_id is NOT passed because canonical drills use string IDs,
      // but training_drills.drill_id expects UUIDs (from old drill_templates)
      const drillsPayload = drills.map((d) => ({
        // Don't pass drill_id - canonical drills use string IDs, DB expects UUID
        name: d.name || 'Drill',
        description: d.description || undefined,
        drill_goal: d.drill_goal || 'grouping',
        target_type: d.target_type || 'paper',
        // Execution policy - how strictly soldiers must follow this config
        execution_policy: d.execution_policy || 'locked',
        // Engagement mode - solo or squad (grouping is always solo)
        engagement_mode: d.engagement_mode || 'solo',
        // Config values - null means soldier chooses at execution time
        distance_m: d.config.distance_m,
        rounds_per_shooter: d.config.rounds,
        time_limit_seconds: d.config.time_limit_seconds ?? undefined,
        strings_count: d.config.strings_count,
        position: d.config.position ?? undefined,
        // Store canonical drill reference in notes for future reference
        notes: d.drill_id ? `canonical:${d.drill_id}` : undefined,
      }));

      console.log('[CreateTrainingV2] Creating training:', {
        team_id: selectedTeamId,
        title: title.trim(),
        scheduled_at: finalDate.toISOString(),
        drills_count: drills.length,
      });

      const created = await createTraining({
        team_id: selectedTeamId,
        title: title.trim(),
        scheduled_at: finalDate.toISOString(),
        manual_start: manualStart,
        drills: drillsPayload,
      });

      console.log('[CreateTrainingV2] Training created successfully:', created.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh stores
      try {
        await Promise.all([loadTeamTrainings(selectedTeamId), loadMyUpcomingTrainings()]);
      } catch (refreshError) {
        console.error('[CreateTrainingV2] Failed to refresh stores:', refreshError);
      }

      if (router.canGoBack()) {
        router.back();
      }
    } catch (error: any) {
      console.error('[CreateTrainingV2] Failed to create training:', error);
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
    canCreatePresets,

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
    loading,

    // Drill data
    canonicalDrills,
    teamPresets,

    // Adjust modal
    adjustingDrill,
    adjustModalVisible,

    // Validation
    step1Complete,
    step2Complete,
    canCreate,

    // Actions
    handleSelectTeam,
    handleRemoveDrill,
    handleMoveDrill,
    addDrill,
    handleNextStep,
    handleBackStep,
    handleCreate,
    handleAdjustDrill,
    handleCloseAdjustModal,
    handleUpdateDrill,
    handleSavePreset,
  };
}
