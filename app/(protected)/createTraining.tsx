/**
 * CREATE TRAINING - 2-Step Flow
 *
 * 1. Details - Team, name, schedule
 * 2. Drills - Build training timeline
 *
 * Training is a team entity that groups multiple drill sessions.
 */

import {
  useCreateTraining
} from '@/components/createTraining';
import type { NewDrillInstanceConfig, TrainingDrillItem } from '@/components/createTraining/createTraining.types';
import {
  DrillConfigSheet,
  DrillCreator,
  TrainingDetailsStep,
  TrainingDrillsStep,
} from '@/components/createTraining/steps';
import { useColors } from '@/hooks/ui/useColors';
import { createDrill } from '@/services/drillService';
import type { Drill } from '@/types/workspace';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Check, ChevronLeft, Play, Users } from 'lucide-react-native';
import { useState } from 'react';
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

  // Config sheet state
  const [configDrill, setConfigDrill] = useState<Drill | null>(null);
  const [showDrillCreator, setShowDrillCreator] = useState(false);

  const {
    teams,
    selectedTeamId,
    selectedTeam,
    isTeamLocked,
    canCreateDrills,
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
    teamDrills,
    step1Complete,
    step2Complete,
    canCreate,
    handleSelectTeam,
    handleRemoveDrill,
    handleMoveDrill,
    addDrill,
    handleNextStep,
    handleBackStep,
    handleCreate,
  } = useCreateTraining({ teamIdParam });

  // ─────────────────────────────────────────────────────────────────────────
  // DRILL HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleDrillSelect = (drill: Drill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfigDrill(drill);
  };

  const handleNewConfigConfirm = (config: NewDrillInstanceConfig) => {
    if (!configDrill) return;
    
    addDrill({
      id: Date.now().toString(),
      drill_id: configDrill.id,
      name: configDrill.name,
      drill_goal: configDrill.drill_goal,
      target_type: configDrill.target_type,
      description: configDrill.description || undefined,
      input_method: config.input_method,
      distance_m: config.distance_m,
      rounds_per_shooter: config.rounds_per_shooter,
      time_limit_seconds: config.time_limit_seconds ?? undefined,
      strings_count: config.strings_count,
      weapon_category: config.weapon_category ?? undefined,
    });
    
    setConfigDrill(null);
  };

  const handleDrillCreatorAdd = (drill: TrainingDrillItem) => {
    addDrill(drill);
  };

  const handleDrillCreatorSaveAndAdd = async (
    drillData: { name: string; drill_goal: 'grouping' | 'achievement'; target_type: 'paper' | 'tactical'; distance_m: number; rounds_per_shooter: number; time_limit_seconds?: number; strings_count?: number },
    config: NewDrillInstanceConfig
  ) => {
    if (!selectedTeamId) return;
    
    const created = await createDrill(selectedTeamId, {
      name: drillData.name,
      drill_goal: drillData.drill_goal,
      target_type: drillData.target_type,
      distance_m: drillData.distance_m,
      rounds_per_shooter: drillData.rounds_per_shooter,
      time_limit_seconds: drillData.time_limit_seconds,
      strings_count: drillData.strings_count,
    });

    addDrill({
      id: Date.now().toString(),
      drill_id: created.id,
      name: created.name,
      drill_goal: created.drill_goal,
      target_type: created.target_type,
      description: created.description || undefined,
      input_method: config.input_method,
      distance_m: config.distance_m,
      rounds_per_shooter: config.rounds_per_shooter,
      time_limit_seconds: config.time_limit_seconds ?? undefined,
      strings_count: config.strings_count,
      weapon_category: config.weapon_category ?? undefined,
    });
  };

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top - 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header with back + step indicator */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (currentStep === 2) {
              handleBackStep();
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={1.5} />
        </TouchableOpacity>

        {/* Step Progress */}
        <View style={styles.progressContainer}>
          {[1, 2].map((step, idx) => {
            const isComplete = step === 1 ? step1Complete : step2Complete;
            const isActive = currentStep === step;
            const labels = ['Details', 'Program'];
            
            return (
              <View key={step} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: isComplete ? colors.text : isActive ? colors.text : colors.border,
                      transform: [{ scale: isActive ? 1.2 : 1 }],
                    },
                  ]}
                >
                  {isComplete && <Check size={10} color={colors.background} strokeWidth={3} />}
                </View>
                <Text
                  style={[
                    styles.progressLabel,
                    { color: currentStep >= step ? colors.text : colors.textMuted },
                  ]}
                >
                  {labels[idx]}
                </Text>
                {idx < 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      { backgroundColor: isComplete ? colors.text : colors.border },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.backButtonPlaceholder} />
      </View>

      {/* Step Content */}
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

      {currentStep === 2 && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <TrainingDrillsStep
            drills={drills}
            teamDrills={teamDrills}
            hasTeam={!!selectedTeamId}
            canCreateDrills={canCreateDrills}
            onSelectDrill={handleDrillSelect}
            onRemoveDrill={handleRemoveDrill}
            onMoveDrill={handleMoveDrill}
            onCreateNew={() => setShowDrillCreator(true)}
          />
        </Animated.View>
      )}

      {/* Spacer - pushes button to bottom when content is short */}
      <View style={styles.spacer} />

      {/* Action Button */}
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
            Next: Add Drills
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
                Create Training
              </Text>
              <Play size={16} color={canCreate ? colors.background : colors.textMuted} fill={canCreate ? colors.background : colors.textMuted} />
            </>
          )}
        </TouchableOpacity>
      )}

      {currentStep === 2 && drills.length > 0 && (
        <Text style={[styles.footerHint, { color: colors.textMuted }]}>
          Team will be notified when training is created
        </Text>
      )}

      {/* Bottom padding for scroll */}
      <View style={{ height: insets.bottom + 20 }} />

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════ */}

      {/* Drill Config Sheet */}
      <DrillConfigSheet
        visible={configDrill !== null}
        drill={configDrill}
        onConfirm={handleNewConfigConfirm}
        onClose={() => setConfigDrill(null)}
      />

      {/* Drill Creator */}
      <DrillCreator
        visible={showDrillCreator}
        teamDrills={teamDrills}
        canSaveToLibrary={canCreateDrills}
        onAddToTraining={handleDrillCreatorAdd}
        onSaveAndAdd={handleDrillCreatorSaveAndAdd}
        onClose={() => setShowDrillCreator(false)}
      />

      {/* Date Picker */}
      {showDatePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.pickerOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
              <View style={[styles.pickerGrabber, { backgroundColor: colors.border }]} />
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.pickerDone, { color: colors.text }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setScheduledDate(date)}
                minimumDate={new Date()}
                style={styles.picker}
              />
              <View style={{ height: insets.bottom }} />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={styles.pickerOverlay} onPress={() => setShowTimePicker(false)}>
            <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
              <View style={[styles.pickerGrabber, { backgroundColor: colors.border }]} />
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.pickerDone, { color: colors.text }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode="time"
                display="spinner"
                onChange={(_, date) => date && setScheduledDate(date)}
                style={styles.picker}
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
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  // Progress
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  progressLine: {
    width: 32,
    height: 2,
    marginHorizontal: 8,
  },
  // Spacer
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 12,
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
