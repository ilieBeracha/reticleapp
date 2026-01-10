/**
 * CREATE TRAINING - 2-Step Flow (Same style as createSession)
 *
 * 1. Details - Team, name, schedule
 * 2. Program - Build training timeline with drills
 *
 * Training is a team entity that groups multiple drill sessions.
 */

import {
  useCreateTraining
} from '@/components/training/create';
import type { TrainingDrillItem } from '@/components/training/create/createTraining.types';
import {
  DrillQuickAdd,
  TrainingDetailsStep,
  TrainingDrillsStep,
} from '@/components/training/create/steps';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronLeft, Play, Users } from 'lucide-react-native';
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

  // Simple add drill modal
  const [showAddDrill, setShowAddDrill] = useState(false);

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

  const handleAddDrill = (drill: TrainingDrillItem) => {
    addDrill(drill);
    setShowAddDrill(false);
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

  const stepLabels = ['Details', 'Program'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header - Clean style like createSession */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.card }]}
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
          {currentStep > 1 ? (
            <ChevronLeft size={20} color={colors.text} />
          ) : (
            <Ionicons name="close" size={20} color={colors.text} />
          )}
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>New Training</Text>

        <View style={styles.headerButtonPlaceholder} />
      </View>

      {/* Progress Bar - Linear style like createSession */}
      <View style={styles.progressBar}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.text,
                width: `${(currentStep / 2) * 100}%`,
              }
            ]} 
          />
        </View>
        <View style={styles.progressLabels}>
          {stepLabels.map((label, idx) => (
            <Text
              key={label}
              style={[
                styles.progressLabel,
                { 
                  color: currentStep > idx ? colors.text : colors.textMuted,
                  fontWeight: currentStep === idx + 1 ? '600' : '400',
                },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
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
            onBack={handleBackStep}
            onSelectDrill={(drill) => {
              // Quick add from library
              addDrill({
                id: Date.now().toString(),
                drill_id: drill.id,
                name: drill.name,
                drill_goal: drill.drill_goal,
                target_type: drill.target_type,
                distance_m: drill.distance_m,
                rounds_per_shooter: drill.rounds_per_shooter,
                time_limit_seconds: drill.time_limit_seconds || undefined,
                strings_count: drill.strings_count || 1,
              });
            }}
            onRemoveDrill={handleRemoveDrill}
            onMoveDrill={handleMoveDrill}
            onCreateNew={() => setShowAddDrill(true)}
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

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════ */}

      {/* Simple Drill Add */}
      <DrillQuickAdd
        visible={showAddDrill}
        teamDrills={teamDrills}
        onAdd={handleAddDrill}
        onClose={() => setShowAddDrill(false)}
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  
  // Header - Clean style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  
  // Progress Bar - Linear style
  progressBar: {
    marginBottom: 24,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  // Spacer
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  // Action Button - Larger like createSession
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    marginTop: 16,
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
