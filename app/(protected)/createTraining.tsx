/**
 * CREATE TRAINING - Simple 2-Step Flow
 *
 * 1. Details - Team, name, schedule
 * 2. Sessions - Add simple sessions (like solo createSession)
 *
 * No drill catalog, no presets, no complexity.
 * Just add sessions and go.
 */

import {
  useCreateTrainingV2
} from '@/components/training/create';
import {
  QuickSessionsStep,
  TrainingDetailsStep,
} from '@/components/training/create/steps';
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

  const stepLabels = ['Details', 'Sessions'];
  const totalSteps = 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
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
              <ChevronLeft size={18} color={colors.text} />
            ) : (
              <Ionicons name="close" size={18} color={colors.text} />
            )}
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {currentStep === 1 ? 'New Training' : 'Add Sessions'}
            </Text>
            <Text style={[styles.headerStep, { color: colors.textMuted }]}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>

          <View style={styles.headerButtonPlaceholder} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {stepLabels.map((label, idx) => {
            const isActive = currentStep === idx + 1;
            const isComplete = currentStep > idx + 1;
            return (
              <View key={label} style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: isActive || isComplete ? colors.text : colors.border,
                    },
                    isActive && styles.progressDotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.progressStepLabel,
                    {
                      color: isActive ? colors.text : colors.textMuted,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
          <View style={[styles.progressLine, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressLineFill,
                {
                  backgroundColor: colors.text,
                  width: currentStep > 1 ? '100%' : '0%',
                },
              ]}
            />
          </View>
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

      {/* Step 2: Add Sessions (Simple Flow) */}
      {currentStep === 2 && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.step2Container}>
          <QuickSessionsStep
            sessions={drills}
            onAddSession={addDrill}
            onRemoveSession={handleRemoveDrill}
            onMoveSession={handleMoveDrill}
          />
        </Animated.View>
      )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <View style={[styles.bottomBarInner, { borderTopColor: colors.border }]}>
          {currentStep === 2 && drills.length > 0 && (
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>
              Team will be notified when training is created
            </Text>
          )}
          {currentStep === 1 ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: step1Complete ? colors.text : colors.secondary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleNextStep();
              }}
              disabled={!step1Complete}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionText, { color: step1Complete ? colors.background : colors.textMuted }]}>
                Next: Add Sessions
              </Text>
              <ArrowRight size={18} color={step1Complete ? colors.background : colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: canCreate ? colors.text : colors.secondary },
              ]}
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
                    {drills.length === 0 ? 'Add at least one session' : 'Create Training'}
                  </Text>
                  {drills.length > 0 && (
                    <Play size={16} color={colors.background} fill={colors.background} />
                  )}
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
          <View style={[styles.pickerGrabber, { backgroundColor: colors.border }]} />
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.pickerDone, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onChange={(_, date) => date && onChange(date)}
            minimumDate={minimumDate}
            style={styles.picker}
          />
          <View style={{ height: bottomInset }} />
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

  // Header Container (fixed at top)
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 36,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerStep: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 20,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressStepLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  progressLine: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 5,
    height: 2,
    borderRadius: 1,
  },
  progressLineFill: {
    height: '100%',
    borderRadius: 1,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  // Step Container
  step2Container: {
    flex: 1,
  },

  // Bottom Bar (fixed)
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  bottomBarInner: {
    paddingTop: 12,
    borderTopWidth: 1,
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  footerHint: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
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
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },
  emptyActions: {
    gap: 12,
  },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyBtnSecondary: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Picker Modals
  pickerOverlay: {
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pickerCancel: {
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    height: 200,
  },
});
