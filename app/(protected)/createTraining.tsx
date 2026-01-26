/**
 * CREATE TRAINING - Simple 2-Step Flow
 *
 * 1. Details - Team, name, schedule
 * 2. Sessions - Define drill configurations for the training
 *
 * Training = context only (who/when/what drills).
 * Execution happens via startEngagement when soldiers actually shoot.
 */

import { useCreateTrainingV2 } from '@/components/training/create';
import { AddDrillStep, TrainingDetailsStep } from '@/components/training/create/steps';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronLeft, Play, Users } from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateTrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId?: string }>();

  const {
    teams,
    selectedTeamId,
    isTeamLocked,
    title,
    setTitle,
    scheduledDate,
    setScheduledDate,
    manualStart,
    setManualStart,
    drills,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    submitting,
    currentStep,
    step1Complete,
    canCreate,
    // Actions
    handleSelectTeam,
    handleRemoveDrill,
    handleMoveDrill,
    addDrill,
    handleNextStep,
    handleBackStep,
    handleCreate,
  } = useCreateTrainingV2({ teamIdParam });

  // ─────────────────────────────────────────────────────────────────────────
  // NO TEAMS STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (teams.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.emptyContent}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Users size={32} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Teams Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Create or join a team to schedule trainings
          </Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.text }]}
              onPress={() => router.replace('/(protected)/createTeam')}
            >
              <Text style={[styles.emptyBtnText, { color: colors.background }]}>Create Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyBtnSecondary, { borderColor: colors.border }]}
              onPress={() => router.replace('/(protected)/acceptInvite')}
            >
              <Text style={[styles.emptyBtnSecondaryText, { color: colors.text }]}>Join Team</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const stepLabels = ['Details', 'Drills'];
  const totalSteps = 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 4 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (currentStep > 1) {
                handleBackStep();
              } else {
                router.back();
              }
            }}
            activeOpacity={0.7}
          >
            {currentStep > 1 ? (
              <ChevronLeft size={18} color={colors.text} strokeWidth={2.5} />
            ) : (
              <Ionicons name="close" size={16} color={colors.text} />
            )}
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {currentStep === 1 ? 'New Training' : 'Add Drills'}
          </Text>

          <View style={styles.headerButtonPlaceholder} />
        </View>

        {/* Progress indicator - minimal pill style */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.text,
                  width: `${(currentStep / totalSteps) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {currentStep}/{totalSteps}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Training Details */}
        {currentStep === 1 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <TrainingDetailsStep
              teams={teams}
              selectedTeamId={selectedTeamId}
              isTeamLocked={isTeamLocked}
              title={title}
              scheduledDate={scheduledDate}
              manualStart={manualStart}
              onSelectTeam={handleSelectTeam}
              onTitleChange={setTitle}
              onOpenDatePicker={() => setShowDatePicker(true)}
              onOpenTimePicker={() => setShowTimePicker(true)}
              onToggleManualStart={() => setManualStart(!manualStart)}
            />
          </Animated.View>
        )}

        {/* Step 2: Add Drills (Training defines drill configs, not sessions) */}
        {currentStep === 2 && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.step2Container}>
            <AddDrillStep
              drills={drills}
              onAddDrill={addDrill}
              onRemoveDrill={handleRemoveDrill}
              onMoveDrill={handleMoveDrill}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
        {currentStep === 2 && drills.length > 0 && (
          <Text style={[styles.footerHint, { color: colors.textMuted }]}>
            Team will be notified when training is created
          </Text>
        )}
        {currentStep === 1 ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: step1Complete ? colors.text : colors.secondary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleNextStep();
            }}
            disabled={!step1Complete}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionText, { color: step1Complete ? colors.background : colors.textMuted }]}>
              Continue
            </Text>
            <ArrowRight size={16} color={step1Complete ? colors.background : colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: canCreate ? colors.text : colors.secondary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleCreate();
            }}
            disabled={!canCreate}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Text style={[styles.actionText, { color: canCreate ? colors.background : colors.textMuted }]}>
                  {drills.length === 0 ? 'Add at least one drill' : 'Create Training'}
                </Text>
                {drills.length > 0 && <Play size={14} color={colors.background} fill={colors.background} />}
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════ */}

      <PickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        title="Select Date"
        mode="date"
        value={scheduledDate}
        onChange={setScheduledDate}
        minimumDate={new Date()}
        colors={colors}
        bottomInset={insets.bottom}
      />
      <PickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title="Select Time"
        mode="time"
        value={scheduledDate}
        onChange={setScheduledDate}
        colors={colors}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

// ============================================================================
// PICKER MODAL
// ============================================================================

function PickerModal({
  visible,
  onClose,
  title,
  mode,
  value,
  onChange,
  minimumDate,
  colors,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable
          style={[styles.pickerSheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn} hitSlop={8}>
              <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn} hitSlop={8}>
              <Text style={[styles.pickerDone, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerDivider, { backgroundColor: colors.border }]} />
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onChange={(_, date) => date && onChange(date)}
            minimumDate={minimumDate}
            style={styles.picker}
          />
          <View style={{ height: bottomInset + 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 32,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Progress - minimal bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'right',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Step Container
  step2Container: {
    flex: 1,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  footerHint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActions: {
    gap: 10,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBtnSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pickerHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  pickerHeaderBtn: {
    minWidth: 60,
  },
  pickerCancel: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pickerDone: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  pickerDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  picker: {
    height: 180,
  },
});
