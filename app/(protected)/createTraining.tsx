import { useColors } from "@/hooks/ui/useColors";
import { createTraining } from "@/services/trainingService";
import { useTeamStore } from "@/store/teamStore";
import { useTrainingStore } from "@/store/trainingStore";
import type { CreateDrillInput, TargetType, Team } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DrillFormData extends CreateDrillInput {
  id: string;
}

const DRILL_PRESETS = [
  { name: 'Grouping Drill', distance: 100, rounds: 5, type: 'paper' as TargetType },
  { name: 'Rapid Fire', distance: 25, rounds: 10, type: 'tactical' as TargetType },
  { name: 'Precision', distance: 200, rounds: 3, type: 'paper' as TargetType },
];

// ============================================================================
// STEP INDICATOR
// ============================================================================
const StepIndicator = React.memo(function StepIndicator({
  currentStep,
  totalSteps,
  colors,
}: {
  currentStep: number;
  totalSteps: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            {
              backgroundColor: index <= currentStep ? colors.primary : colors.border,
              width: index === currentStep ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
});

// ============================================================================
// TEAM CHIP
// ============================================================================
const TeamChip = React.memo(function TeamChip({
  team,
  isSelected,
  onSelect,
  colors,
}: {
  team: Team;
  isSelected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.teamChip,
        {
          backgroundColor: isSelected ? colors.primary : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <Ionicons
        name="people"
        size={16}
        color={isSelected ? '#fff' : colors.textMuted}
      />
      <Text
        style={[
          styles.teamChipText,
          { color: isSelected ? '#fff' : colors.text },
        ]}
      >
        {team.name}
      </Text>
      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
    </TouchableOpacity>
  );
});

/**
 * CREATE TRAINING - Native Form Sheet (2-Step Flow)
 * 
 * Step 0: Team & Basic Info (name, team, date/time)
 * Step 1: Drills & Confirm (optional drills, notes, review)
 */
export default function CreateTrainingSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeTeamId, teams: myTeams, activeTeam } = useTeamStore();
  const { loadTeamTrainings, loadMyUpcomingTrainings } = useTrainingStore();

  const isInTeamMode = !!activeTeamId;
  // In team-first, if you're in a team, you can create trainings for it
  const canCreateTraining = isInTeamMode;

  // ========== STEP STATE ==========
  const [step, setStep] = useState(0);
  const totalSteps = 2;

  // ========== FORM STATE ==========
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(scheduledDate);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [drills, setDrills] = useState<DrillFormData[]>([]);

  // ========== DATA STATE ==========
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const availableTeams = useMemo(() => teams, [teams]);
  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);

  // ========== EFFECTS ==========
  // In team-first, use the active team directly
  useEffect(() => {
    if (activeTeamId && activeTeam) {
      // Set the active team as the only option
      setTeams([activeTeam as any]);
      setSelectedTeamId(activeTeamId);
      setLoadingTeams(false);
    } else {
      setTeams([]);
      setLoadingTeams(false);
    }
  }, [activeTeamId, activeTeam]);

  useEffect(() => {
    if (availableTeams.length === 1 && !selectedTeamId) {
      setSelectedTeamId(availableTeams[0].id);
    }
  }, [availableTeams, selectedTeamId]);

  // Legacy function - not used in team-first (teams come from useTeamStore)
  const fetchTeams = async () => {
    // No-op in team-first - teams are managed by teamStore
  };

  // ========== HANDLERS ==========
  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Step 0 validation
    if (step === 0) {
      if (!title.trim()) {
        Alert.alert('Missing Title', 'Please enter a name for this training');
        return;
      }
      if (!selectedTeamId) {
        Alert.alert('Select Team', 'Please select which team will attend');
        return;
      }
    }

    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  }, [step, title, selectedTeamId]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  const handleAddPresetDrill = useCallback((preset: typeof DRILL_PRESETS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills(prev => [...prev, {
      id: Date.now().toString(),
      name: preset.name,
      target_type: preset.type,
      distance_m: preset.distance,
      rounds_per_shooter: preset.rounds,
    }]);
  }, []);

  const handleRemoveDrill = useCallback((drillId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrills(prev => prev.filter(d => d.id !== drillId));
  }, []);

  const openDatePicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempDate(scheduledDate);
    setPickerMode('date');
  }, [scheduledDate]);

  const openTimePicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempDate(scheduledDate);
    setPickerMode('time');
  }, [scheduledDate]);

  const handlePickerConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScheduledDate(tempDate);
    setPickerMode(null);
  }, [tempDate]);

  const handlePickerCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerMode(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedTeamId) return;

    Keyboard.dismiss();
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createTraining({
        team_id: selectedTeamId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDate.toISOString(),
        drills: drills.length > 0 ? drills.map(({ id, ...drill }) => drill) : undefined,
      });

      // Stop loader immediately after successful creation
      setSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh trainings lists in background (don't block)
      loadTeamTrainings(selectedTeamId).catch(() => {});
      loadMyUpcomingTrainings().catch(() => {});

      // Navigate back immediately
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error: any) {
      setSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create training');
    }
  }, [title, description, selectedTeamId, scheduledDate, drills, loadTeamTrainings, loadMyUpcomingTrainings]);

  // ========== FORMATTERS ==========
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTimeDisplay = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // ========== NOT IN ORG MODE ==========
  if (!isInTeamMode) {
    return (
      <View style={[styles.notAvailable, { backgroundColor: colors.card }]}>
        <View style={[styles.notAvailableIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="business-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={[styles.notAvailableTitle, { color: colors.text }]}>Organization Required</Text>
        <Text style={[styles.notAvailableText, { color: colors.textMuted }]}>
          Switch to an organization workspace to schedule trainings
        </Text>
      </View>
    );
  }

  // ========== RENDER ==========
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="calendar" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Schedule Training</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {step === 0 ? 'Set up your training session' : 'Add drills & review'}
        </Text>
      </View>
        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={totalSteps} colors={colors} />

        {/* ========== STEP 0: Team & Basic Info ========== */}
        {step === 0 && (
          <View style={styles.stepContent}>
            {/* Training Name */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TRAINING NAME</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.titleInput, { color: colors.text }]}
                  placeholder="e.g., Team Alpha Range Day..."
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="next"
                  autoFocus
                />
              </View>
            </View>

            {/* Team Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT TEAM</Text>
              {loadingTeams ? (
                <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading teams...</Text>
                </View>
              ) : availableTeams.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.card }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {canCreateTraining ? "No teams found" : "No teams you command"}
                  </Text>
                </View>
              ) : (
                <View style={styles.teamList}>
                  {availableTeams.map(team => (
                    <TeamChip
                      key={team.id}
                      team={team}
                      isSelected={selectedTeamId === team.id}
                      onSelect={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedTeamId(team.id);
                      }}
                      colors={colors}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WHEN</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.dateTimeBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={openDatePicker}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDateDisplay(scheduledDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateTimeBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={openTimePicker}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time" size={18} color={colors.primary} />
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTimeDisplay(scheduledDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ========== STEP 1: Drills & Confirm ========== */}
        {step === 1 && (
          <View style={styles.stepContent}>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
                    {selectedTeam?.name} • {formatDateDisplay(scheduledDate)} at {formatTimeDisplay(scheduledDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Drills Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                DRILLS {drills.length > 0 && `(${drills.length})`}
              </Text>

              {/* Added Drills */}
              {drills.length > 0 && (
                <View style={styles.drillList}>
                  {drills.map((drill, idx) => (
                    <View key={drill.id} style={[styles.drillItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={styles.drillItemInfo}>
                        <Text style={[styles.drillItemName, { color: colors.text }]}>{idx + 1}. {drill.name}</Text>
                        <Text style={[styles.drillItemMeta, { color: colors.textMuted }]}>
                          {drill.distance_m}m • {drill.rounds_per_shooter} rds • {drill.target_type}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveDrill(drill.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={22} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Presets */}
              <Text style={[styles.presetsLabel, { color: colors.textMuted }]}>Quick Add</Text>
              <View style={styles.presetRow}>
                {DRILL_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => handleAddPresetDrill(preset)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.presetChipText, { color: colors.text }]}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.drillHint, { color: colors.textMuted }]}>
                Drills are optional. You can add more after creating.
              </Text>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>NOTES (OPTIONAL)</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.descInput, { color: colors.text }]}
                  placeholder="Any additional notes..."
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        )}

        {/* ========== ACTION BUTTONS ========== */}
        <View style={styles.actions}>
          {step > 0 && (
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.secondary }]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}

          {step < totalSteps - 1 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: (!title.trim() || !selectedTeamId) ? colors.muted : colors.primary },
              ]}
              onPress={handleNext}
              disabled={!title.trim() || !selectedTeamId}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, { color: '#fff' }]}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: submitting ? colors.muted : colors.primary },
              ]}
              onPress={handleCreate}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={20} color="#fff" />
                  <Text style={[styles.createButtonText, { color: '#fff' }]}>Schedule Training</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

      {/* Date/Time Picker Modal */}
      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={handlePickerCancel}
      >
        <Pressable style={styles.modalOverlay} onPress={handlePickerCancel}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
            {/* Grabber */}
            <View style={[styles.pickerGrabber, { backgroundColor: colors.border }]} />
            
            {/* Header */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={handlePickerCancel} style={styles.pickerHeaderBtn}>
                <Text style={[styles.pickerCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
              </Text>
              <TouchableOpacity onPress={handlePickerConfirm} style={styles.pickerHeaderBtn}>
                <Text style={[styles.pickerDoneText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Picker */}
            <View style={styles.pickerContainer}>
              {pickerMode === 'date' && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) {
                      const newDate = new Date(tempDate);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setTempDate(newDate);
                    }
                  }}
                  minimumDate={new Date()}
                  style={styles.picker}
                />
              )}
              {pickerMode === 'time' && (
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) {
                      const newDate = new Date(tempDate);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setTempDate(newDate);
                    }
                  }}
                  style={styles.picker}
                />
              )}
            </View>

            {/* Safe area padding */}
            <View style={{ height: insets.bottom + 10 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  headerSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },

  // Step Content
  stepContent: {
    marginBottom: 16,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Input boxes
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleInput: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '500',
  },
  descInput: {
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  // Team list
  teamList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  teamChipText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Date/Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Loading/Empty
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
  },

  // Summary Card
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryMeta: {
    fontSize: 13,
  },

  // Drills
  drillList: {
    gap: 8,
    marginBottom: 16,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  drillItemInfo: {
    flex: 1,
    gap: 2,
  },
  drillItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  drillItemMeta: {
    fontSize: 13,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  drillHint: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 6,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Not available state
  notAvailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  notAvailableIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notAvailableTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  notAvailableText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal Picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  pickerGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pickerHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerCancelText: {
    fontSize: 16,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  pickerContainer: {
    paddingVertical: 10,
  },
  picker: {
    height: 200,
  },
});
