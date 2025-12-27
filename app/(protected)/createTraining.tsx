/**
 * CREATE TRAINING
 * Drill-first training creation flow
 * 
 * ARCHITECTURE:
 * - Drills must come from the team's drill library
 * - Each drill can have instance-specific configuration (distance, shots, time)
 * - Quick Drill allows commanders to create a minimal drill inline (saved to library)
 */
import { UnifiedDrillModal, type DrillFormData as UnifiedDrillFormData } from '@/components/drills/UnifiedDrillModal';
import { useColors } from '@/hooks/ui/useColors';
import { createDrill, drillToTrainingInput, getTeamDrills } from '@/services/drillService';
import { createTraining } from '@/services/trainingService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { CreateTrainingDrillInput, Drill, DrillInstanceConfig } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Target, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Drill item in the training form (extends the training input with local ID) */
interface TrainingDrillItem extends CreateTrainingDrillInput {
  id: string;
}

// ============================================================================
// DRILL LIBRARY PICKER - Tab-based professional design
// ============================================================================
function DrillLibraryPicker({
  drills,
  colors,
  onSelect,
  onCreateNew,
  hasTeam,
}: {
  drills: Drill[];
  colors: ReturnType<typeof useColors>;
  onSelect: (drill: Drill) => void;
  onCreateNew?: () => void;
  hasTeam: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'achievement' | 'grouping'>('all');

  const filteredDrills = drills.filter(d => {
    if (activeTab === 'all') return true;
    return d.drill_goal === activeTab;
  });

  const achievementCount = drills.filter(d => d.drill_goal === 'achievement').length;
  const groupingCount = drills.filter(d => d.drill_goal === 'grouping').length;

  if (!hasTeam) {
    return (
      <View style={[styles.libSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.libEmptyText, { color: colors.textMuted }]}>
          Select a team to view drills
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.libSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.libHeader}>
        <Text style={[styles.libTitle, { color: colors.text }]}>Drill Library</Text>
        {onCreateNew && (
          <TouchableOpacity onPress={onCreateNew} hitSlop={8}>
            <Text style={[styles.libNewLink, { color: colors.primary }]}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.libTabs, { backgroundColor: colors.secondary }]}>
        <TouchableOpacity
          style={[styles.libTab, activeTab === 'all' && { backgroundColor: colors.card }]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.libTabText, { color: activeTab === 'all' ? colors.text : colors.textMuted }]}>
            All ({drills.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.libTab, activeTab === 'achievement' && { backgroundColor: colors.card }]}
          onPress={() => setActiveTab('achievement')}
        >
          <Text style={[styles.libTabText, { color: activeTab === 'achievement' ? '#3B82F6' : colors.textMuted }]}>
            Achievement ({achievementCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.libTab, activeTab === 'grouping' && { backgroundColor: colors.card }]}
          onPress={() => setActiveTab('grouping')}
        >
          <Text style={[styles.libTabText, { color: activeTab === 'grouping' ? '#10B981' : colors.textMuted }]}>
            Grouping ({groupingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {filteredDrills.length > 0 ? (
        <View style={styles.libList}>
          {filteredDrills.map((drill) => {
            const isGrouping = drill.drill_goal === 'grouping';
            const goalColor = isGrouping ? '#10B981' : '#3B82F6';

            return (
              <TouchableOpacity
                key={drill.id}
                style={[styles.libItem, { borderBottomColor: colors.border }]}
                onPress={() => onSelect(drill)}
                activeOpacity={0.6}
              >
                <View style={[styles.libItemIndicator, { backgroundColor: goalColor }]} />
                <View style={styles.libItemContent}>
                  <Text style={[styles.libItemName, { color: colors.text }]} numberOfLines={1}>
                    {drill.icon ? `${drill.icon} ` : ''}{drill.name}
                  </Text>
                  <Text style={[styles.libItemMeta, { color: colors.textMuted }]}>
                    {drill.distance_m}m · {drill.rounds_per_shooter} shots
                    {drill.time_limit_seconds ? ` · ${drill.time_limit_seconds}s` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={goalColor} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.libEmpty}>
          <Text style={[styles.libEmptyText, { color: colors.textMuted }]}>
            {drills.length === 0 ? 'No drills yet' : 'No drills in this category'}
          </Text>
          {drills.length === 0 && onCreateNew && (
            <TouchableOpacity
              style={[styles.libEmptyBtn, { borderColor: colors.primary }]}
              onPress={onCreateNew}
            >
              <Text style={[styles.libEmptyBtnText, { color: colors.primary }]}>Create Drill</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// DRILL TIMELINE - Visual progression rail
// ============================================================================
function DrillTimeline({
  drills,
  colors,
  onRemove,
  onMove,
}: {
  drills: TrainingDrillItem[];
  colors: ReturnType<typeof useColors>;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}) {
  const totalShots = drills.reduce((sum, d) => sum + d.rounds_per_shooter * (d.strings_count || 1), 0);
  const totalTime = drills.reduce((sum, d) => sum + (d.time_limit_seconds || 0), 0);

  return (
    <View style={styles.timeline}>
      {/* Summary bar */}
      <View style={[styles.timelineSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.timelineSummaryStats}>
          <View style={styles.timelineStat}>
            <Text style={[styles.timelineStatValue, { color: colors.text }]}>{drills.length}</Text>
            <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>drills</Text>
          </View>
          <View style={[styles.timelineStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.timelineStat}>
            <Text style={[styles.timelineStatValue, { color: colors.text }]}>{totalShots}</Text>
            <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>shots</Text>
          </View>
          {totalTime > 0 && (
            <>
              <View style={[styles.timelineStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.timelineStat}>
                <Text style={[styles.timelineStatValue, { color: colors.text }]}>
                  {totalTime >= 60 ? `${Math.floor(totalTime / 60)}m` : `${totalTime}s`}
                </Text>
                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>limit</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Timeline rail with nodes */}
      <View style={styles.timelineRail}>
        {drills.map((drill, index) => {
          const isGrouping = drill.drill_goal === 'grouping';
          const goalColor = isGrouping ? '#10B981' : '#3B82F6';
          const totalDrillShots = drill.rounds_per_shooter * (drill.strings_count || 1);
          const isFirst = index === 0;
          const isLast = index === drills.length - 1;

          return (
            <Animated.View
              key={drill.id}
              entering={FadeInRight.delay(index * 50).springify()}
              layout={Layout.springify()}
              style={styles.timelineNode}
            >
              {/* Rail line - top segment */}
              {!isFirst && (
                <View style={[styles.timelineLineTop, { backgroundColor: colors.border }]} />
              )}

              {/* Node circle */}
              <View style={[styles.timelineCircle, { backgroundColor: goalColor, borderColor: goalColor }]}>
                <Text style={styles.timelineCircleText}>{index + 1}</Text>
              </View>

              {/* Rail line - bottom segment */}
              {!isLast && (
                <View style={[styles.timelineLineBottom, { backgroundColor: colors.border }]} />
              )}

              {/* Drill content */}
              <View style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Header row */}
                <View style={styles.timelineContentHeader}>
                  <Text style={[styles.timelineDrillName, { color: colors.text }]} numberOfLines={1}>
                    {drill.name}
                  </Text>
                  <View style={[styles.timelineTypeBadge, { backgroundColor: `${goalColor}20` }]}>
                    <Text style={[styles.timelineTypeText, { color: goalColor }]}>
                      {isGrouping ? 'GRP' : 'ACH'}
                    </Text>
                  </View>
                </View>

                {/* Stats row */}
                <View style={styles.timelineContentStats}>
                  <View style={[styles.timelineStatChip, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="locate-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.timelineChipText, { color: colors.textMuted }]}>{drill.distance_m}m</Text>
                  </View>
                  <View style={[styles.timelineStatChip, { backgroundColor: colors.secondary }]}>
                    <Target size={11} color={colors.textMuted} />
                    <Text style={[styles.timelineChipText, { color: colors.textMuted }]}>{totalDrillShots}</Text>
                  </View>
                  {drill.time_limit_seconds && (
                    <View style={[styles.timelineStatChip, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="timer-outline" size={11} color={colors.textMuted} />
                      <Text style={[styles.timelineChipText, { color: colors.textMuted }]}>{drill.time_limit_seconds}s</Text>
                    </View>
                  )}
                  <View style={[styles.timelineStatChip, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.timelineChipText, { color: colors.textMuted }]}>
                      {drill.input_method === 'scan' || isGrouping ? '📷' : '✋'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.timelineActions}>
                  <TouchableOpacity
                    style={[styles.timelineActionBtn, { opacity: isFirst ? 0.3 : 1 }]}
                    onPress={() => onMove(index, 'up')}
                    disabled={isFirst}
                    hitSlop={6}
                  >
                    <Ionicons name="arrow-up" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timelineActionBtn, { opacity: isLast ? 0.3 : 1 }]}
                    onPress={() => onMove(index, 'down')}
                    disabled={isLast}
                    hitSlop={6}
                  >
                    <Ionicons name="arrow-down" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timelineActionBtn}
                    onPress={() => onRemove(drill.id)}
                    hitSlop={6}
                  >
                    <Trash2 size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          );
        })}

        {/* End marker */}
        <View style={styles.timelineEnd}>
          <View style={[styles.timelineEndCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="flag" size={12} color="#fff" />
          </View>
          <Text style={[styles.timelineEndText, { color: colors.textMuted }]}>Training Complete</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CreateTrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId?: string }>();
  const { teams } = useTeamStore();
  const { loadTeamTrainings, loadMyUpcomingTrainings } = useTrainingStore();

  // Determine if team is locked (came from teamWorkspace with specific team)
  const isTeamLocked = !!teamIdParam;

  // Form state - pre-select team if passed via URL param
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teamIdParam ?? null);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 2, 0, 0, 0);
    return date;
  });
  const [manualStart, setManualStart] = useState(true);
  const [drills, setDrills] = useState<TrainingDrillItem[]>([]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Wizard step (1 = Details, 2 = Drills)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  // Drill library and modal state
  const [teamDrills, setTeamDrills] = useState<Drill[]>([]);
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [drillModalMode, setDrillModalMode] = useState<'configure' | 'quick'>('configure');
  const [savingDrill, setSavingDrill] = useState(false);

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

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const canCreateDrills = selectedTeam?.my_role === 'owner' || selectedTeam?.my_role === 'commander';
  
  // Show team selection prompt when no team selected and multiple teams exist
  const needsTeamSelection = !selectedTeamId && teams.length > 1 && !isTeamLocked;

  // Load team's drill library
  useEffect(() => {
    if (selectedTeamId) {
      getTeamDrills(selectedTeamId).then(setTeamDrills).catch(console.error);
    } else {
      setTeamDrills([]);
    }
  }, [selectedTeamId]);

  const handleRemoveDrill = useCallback((drillId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills(prev => prev.filter(d => d.id !== drillId));
  }, []);

  const handleMoveDrill = useCallback((index: number, direction: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills(prev => {
      const newDrills = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newDrills.length) return prev;
      [newDrills[index], newDrills[targetIndex]] = [newDrills[targetIndex], newDrills[index]];
      return newDrills;
    });
  }, []);

  // Handle selecting a drill from library (opens configure modal)
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

  // Handle closing the drill modal
  const handleCloseDrillModal = useCallback(() => {
    setDrillModalVisible(false);
    setSelectedDrill(null);
  }, []);

  // Handle configure mode: add existing drill with custom config
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

  // Handle quick mode: create new drill and add to training
  const handleQuickDrillSave = useCallback(async (payload: { draft: UnifiedDrillFormData; instance: DrillInstanceConfig }) => {
    if (!selectedTeamId) return;
    if (!canCreateDrills) return;
    if (savingDrill) return;

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

      setTeamDrills((prev) => [created, ...prev]);

      const trainingDrill = drillToTrainingInput(created, payload.instance);
      setDrills((prev) => [
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

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const isFormValid = selectedTeamId && title.trim() && drills.length > 0;
  const canCreate = isFormValid && !submitting;

  // Wizard navigation
  const step1Complete = !!selectedTeamId && !!title.trim();
  const step2Complete = drills.length > 0;

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

  // No teams available
  if (teams.length === 0) {
    return (
      <View style={[styles.notAvailable, { backgroundColor: colors.background }]}>
        <View style={[styles.notAvailableIcon, { backgroundColor: colors.card }]}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={[styles.notAvailableTitle, { color: colors.text }]}>No Teams</Text>
        <Text style={[styles.notAvailableDesc, { color: colors.textMuted }]}>
          Create or join a team to schedule trainings
        </Text>
        <View style={styles.notAvailableActions}>
          <TouchableOpacity
            style={[styles.notAvailableBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(protected)/createTeam')}
          >
            <Text style={styles.notAvailableBtnText}>Create Team</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.notAvailableBtnSecondary, { backgroundColor: colors.secondary }]}
            onPress={() => router.replace('/(protected)/acceptInvite')}
          >
            <Text style={[styles.notAvailableBtnTextSecondary, { color: colors.text }]}>Join Team</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="barbell" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>New Training</Text>
        </View>

      {/* Stepper indicator */}
      <View style={styles.stepperWrap}>
        <View style={styles.stepperRow}>
          <TouchableOpacity 
            style={styles.stepperItem} 
            onPress={() => currentStep === 2 && handleBackStep()}
            activeOpacity={currentStep === 2 ? 0.7 : 1}
          >
            <View
              style={[
                styles.stepperCircle,
                {
                  backgroundColor: step1Complete ? colors.primary : currentStep === 1 ? colors.primary + '20' : colors.secondary,
                  borderColor: step1Complete || currentStep === 1 ? colors.primary : colors.border,
                },
              ]}
            >
              {step1Complete ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepperCircleText, { color: currentStep === 1 ? colors.primary : colors.textMuted }]}>1</Text>
              )}
            </View>
            <Text style={[styles.stepperLabel, { color: currentStep === 1 ? colors.text : colors.textMuted }]}>Details</Text>
          </TouchableOpacity>

          <View style={[styles.stepperLine, { backgroundColor: step1Complete ? colors.primary : colors.border }]} />

          <View style={styles.stepperItem}>
            <View
              style={[
                styles.stepperCircle,
                {
                  backgroundColor: step2Complete ? colors.primary : currentStep === 2 ? colors.primary + '20' : colors.secondary,
                  borderColor: step2Complete || currentStep === 2 ? colors.primary : colors.border,
                },
              ]}
            >
              {step2Complete ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepperCircleText, { color: currentStep === 2 ? colors.primary : colors.textMuted }]}>2</Text>
              )}
            </View>
            <Text style={[styles.stepperLabel, { color: currentStep === 2 ? colors.text : colors.textMuted }]}>Drills</Text>
          </View>
        </View>
      </View>

      {/* ==================== STEP 1: TRAINING DETAILS ==================== */}
      {currentStep === 1 && (
        <>
        <View style={[styles.stepHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Training Details</Text>
        </View>

      {/* Team Selector */}
      <View style={styles.inputSection}>
        <View style={styles.labelRow}>
          <Ionicons name="people" size={16} color={selectedTeamId ? colors.primary : colors.destructive} />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Team</Text>
          <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
          {isTeamLocked && (
            <View style={[styles.lockedBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
            </View>
          )}
        </View>
        
        {/* Locked state: team passed via URL param OR only 1 team */}
        {(isTeamLocked || teams.length === 1) && selectedTeam ? (
          <View style={[styles.teamSelected, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={[styles.teamSelectedIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.teamSelectedName, { color: colors.text }]}>{selectedTeam.name}</Text>
            {isTeamLocked && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
            )}
          </View>
        ) : (
          /* Selector: multiple teams, no locked param */
          <>
            {needsTeamSelection && (
              <View style={[styles.teamPrompt, { backgroundColor: colors.yellow + '15', borderColor: colors.yellow }]}>
                <Ionicons name="information-circle" size={16} color={colors.yellow} />
                <Text style={[styles.teamPromptText, { color: colors.text }]}>
                  Select a team to see available drills
                </Text>
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamSelector}>
              {teams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    {
                      backgroundColor: selectedTeamId === team.id ? colors.primary + '15' : colors.card,
                      borderColor: selectedTeamId === team.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTeamId(team.id);
                    // Clear drills when switching teams
                    if (team.id !== selectedTeamId) {
                      setDrills([]);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="people"
                    size={16}
                    color={selectedTeamId === team.id ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.teamOptionName,
                      { color: selectedTeamId === team.id ? colors.primary : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {team.name}
                  </Text>
                  {selectedTeamId === team.id && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* Training Name */}
      <View style={styles.inputSection}>
        <View style={styles.labelRow}>
          <Ionicons name="text" size={16} color={colors.primary} />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Training Name</Text>
          <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
        </View>
        <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: title ? colors.primary : colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. Morning Drill, Accuracy Training..."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="words"
          />
        </View>
      </View>

      {/* Date */}
      <View style={styles.inputSection}>
        <View style={styles.labelRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Schedule</Text>
        </View>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDate(scheduledDate)}</Text>
          </TouchableOpacity>
          {!manualStart && (
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.background, borderColor: colors.primary }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatTime(scheduledDate)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Manual Start Toggle */}
      <TouchableOpacity
        style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setManualStart(!manualStart);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.toggleLeft}>
          <View style={[styles.toggleIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="hand-left-outline" size={18} color={manualStart ? colors.primary : colors.text} />
          </View>
          <View>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>Manual Start</Text>
            <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
              {manualStart ? 'Start when ready' : 'Starts at scheduled time'}
            </Text>
          </View>
        </View>
        <View style={[styles.switch, { backgroundColor: manualStart ? colors.primary : colors.muted }]}>
          <View style={[styles.switchThumb, manualStart && styles.switchThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          {
            backgroundColor: step1Complete ? colors.primary : colors.muted,
          },
        ]}
        onPress={handleNextStep}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>Next: Add Drills</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
        </>
      )}

      {/* ==================== STEP 2: ATTACH DRILLS ==================== */}
      {currentStep === 2 && (
        <>
        {/* Compact back link */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={handleBackStep}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={[styles.backLinkText, { color: colors.primary }]}>Details</Text>
        </TouchableOpacity>

        {/* Drill Timeline */}
        {drills.length > 0 && (
          <DrillTimeline
            drills={drills}
            colors={colors}
            onRemove={handleRemoveDrill}
            onMove={handleMoveDrill}
          />
        )}

        {/* Drill Library - Tab Based */}
        <DrillLibraryPicker
          drills={teamDrills}
          colors={colors}
          onSelect={handleSelectDrill}
          onCreateNew={canCreateDrills ? handleOpenQuickDrill : undefined}
          hasTeam={!!selectedTeamId}
        />

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton, 
            { 
              backgroundColor: step2Complete ? colors.primary : colors.muted,
              opacity: submitting ? 0.85 : 1,
            }
          ]}
          onPress={step2Complete ? handleCreate : undefined}
          disabled={!canCreate}
          activeOpacity={0.8}
        >
          {submitting ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.createButtonText}>Creating...</Text>
            </>
          ) : (
            <>
              <Ionicons name={step2Complete ? "checkmark-circle" : "add-circle-outline"} size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Training</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Subtle info */}
        {drills.length > 0 && (
          <Text style={[styles.footerHint, { color: colors.textMuted }]}>
            Team will be notified when training is created
          </Text>
        )}
        </>
      )}

      {/* Unified drill modal for configure and quick modes */}
      <UnifiedDrillModal
        visible={drillModalVisible}
        onClose={handleCloseDrillModal}
        mode={drillModalMode}
        drillName={selectedDrill?.name}
        initialData={selectedDrill ? {
          drill_goal: selectedDrill.drill_goal,
          target_type: selectedDrill.target_type,
          distance_m: selectedDrill.distance_m,
          rounds_per_shooter: selectedDrill.rounds_per_shooter,
          strings_count: selectedDrill.strings_count ?? 1,
          time_limit_seconds: selectedDrill.time_limit_seconds ?? null,
          input_method: selectedDrill.drill_goal === 'grouping' ? 'scan' : 'manual',
        } : undefined}
        onConfirmConfig={handleConfigureConfirm}
        onSaveQuick={handleQuickDrillSave}
        saving={savingDrill}
      />

      {showDatePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.datePickerOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={[styles.datePickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
              <View style={[styles.datePickerGrabber, { backgroundColor: colors.border }]} />
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setScheduledDate(date)}
                minimumDate={new Date()}
                style={styles.datePickerWheel}
              />
              <View style={{ height: insets.bottom }} />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {showTimePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={styles.datePickerOverlay} onPress={() => setShowTimePicker(false)}>
            <Pressable style={[styles.datePickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
              <View style={[styles.datePickerGrabber, { backgroundColor: colors.border }]} />
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.datePickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.datePickerDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode="time"
                display="spinner"
                onChange={(_, date) => date && setScheduledDate(date)}
                style={styles.datePickerWheel}
              />
              <View style={{ height: insets.bottom }} />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ScrollView>
  );
}

// ============================================================================
// STYLES (matching createTeam.tsx pattern)
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Main stepper (2 steps)
  stepperWrap: { marginBottom: 18 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stepperItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperCircleText: { fontSize: 13, fontWeight: '800' },
  stepperLabel: { fontSize: 13, fontWeight: '700' },
  stepperLine: { width: 36, height: 2, borderRadius: 2 },

  // Step Header
  stepHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Next/Back buttons
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 10,
    marginBottom: 24,
  },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backLinkText: { fontSize: 15, fontWeight: '600' },

  // Input Section
  inputSection: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600' },
  required: { fontSize: 14, fontWeight: '600' },
  inputWrapper: { borderRadius: 12, borderWidth: 1.5 },
  input: { height: 48, paddingHorizontal: 14, fontSize: 15 },

  // Date Row
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dateBtnText: { fontSize: 15, fontWeight: '500' },

  // Toggle Row
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  toggleDesc: { fontSize: 12 },
  switch: { width: 48, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  switchThumbActive: { alignSelf: 'flex-end' },

  // Drill Timeline
  timeline: { marginBottom: 20 },
  
  // Timeline summary bar
  timelineSummary: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12, 
    borderRadius: 12, 
    borderWidth: 1,
    marginBottom: 16,
  },
  timelineSummaryStats: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
  },
  timelineStat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timelineStatValue: { fontSize: 18, fontWeight: '700' },
  timelineStatLabel: { fontSize: 12 },
  timelineStatDivider: { width: 1, height: 16 },

  // Timeline rail
  timelineRail: { paddingLeft: 20 },
  
  // Timeline node (each drill)
  timelineNode: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  
  // Rail lines
  timelineLineTop: { 
    position: 'absolute',
    left: 11,
    top: 0,
    width: 2,
    height: 12,
  },
  timelineLineBottom: { 
    position: 'absolute',
    left: 11,
    top: 36,
    bottom: -12,
    width: 2,
  },
  
  // Node circle
  timelineCircle: { 
    width: 24, 
    height: 24, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    zIndex: 1,
  },
  timelineCircleText: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#fff',
  },

  // Content card
  timelineContent: { 
    flex: 1,
    marginLeft: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  timelineContentHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineDrillName: { fontSize: 15, fontWeight: '600', flex: 1 },
  timelineTypeBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6,
  },
  timelineTypeText: { fontSize: 10, fontWeight: '700' },

  // Stats chips
  timelineContentStats: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 6,
  },
  timelineStatChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
  },
  timelineChipText: { fontSize: 11, fontWeight: '500' },

  // Actions
  timelineActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timelineActionBtn: { 
    width: 32, 
    height: 28, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 6,
  },

  // End marker
  timelineEnd: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    paddingTop: 4,
  },
  timelineEndCircle: { 
    width: 24, 
    height: 24, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEndText: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },

  // Drill Library - Tab Based
  libSection: { 
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  libHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  libTitle: { fontSize: 15, fontWeight: '600' },
  libNewLink: { fontSize: 14, fontWeight: '600' },

  // Tabs
  libTabs: { 
    flexDirection: 'row',
    marginHorizontal: 10,
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  libTab: { 
    flex: 1, 
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  libTabText: { fontSize: 12, fontWeight: '600' },

  // List
  libList: {},
  libItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  libItemIndicator: { width: 3, height: 24, borderRadius: 2 },
  libItemContent: { flex: 1, gap: 2 },
  libItemName: { fontSize: 14, fontWeight: '600' },
  libItemMeta: { fontSize: 12 },

  // Empty
  libEmpty: { 
    alignItems: 'center', 
    paddingVertical: 24, 
    gap: 10,
  },
  libEmptyText: { fontSize: 13 },
  libEmptyBtn: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1.5,
  },
  libEmptyBtnText: { fontSize: 13, fontWeight: '600' },


  // Create Button
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8, marginBottom: 12 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  footerHint: { fontSize: 12, textAlign: 'center', marginBottom: 20 },

  // Team Selector
  teamSelector: { marginHorizontal: -4 },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 4,
  },
  teamOptionName: { fontSize: 14, fontWeight: '600', maxWidth: 100 },
  teamSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  teamSelectedIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamSelectedName: { fontSize: 15, fontWeight: '600' },
  lockedBadge: { 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 4,
  },
  teamPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  teamPromptText: { fontSize: 13, flex: 1 },

  // Not Available
  notAvailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  notAvailableIcon: { width: 80, height: 80, borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  notAvailableTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  notAvailableDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  notAvailableActions: { flexDirection: 'row', gap: 12 },
  notAvailableBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  notAvailableBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  notAvailableBtnSecondary: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  notAvailableBtnTextSecondary: { fontSize: 14, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalCancel: { fontSize: 16 },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  // Form
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  formInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeBtnText: { fontSize: 15, fontWeight: '600' },

  // Date/Time Picker Modal
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  datePickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  datePickerGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  datePickerTitle: { fontSize: 17, fontWeight: '600' },
  datePickerCancel: { fontSize: 16 },
  datePickerDone: { fontSize: 16, fontWeight: '600' },
  datePickerWheel: { height: 200, alignSelf: 'center', width: '100%' },
});
