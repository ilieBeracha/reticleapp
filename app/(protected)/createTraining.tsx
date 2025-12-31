/**
 * CREATE TRAINING
 * Professional, question-driven training creation flow
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
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Check, Play } from 'lucide-react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CreateTrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId?: string }>();

  // Use new config sheet instead of old modal
  const [configDrill, setConfigDrill] = useState<Drill | null>(null);
  const [showDrillCreator, setShowDrillCreator] = useState(false);

  const {
    teams,
    selectedTeamId,
    selectedTeam,
    isTeamLocked,
    needsTeamSelection,
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
    selectedDrill,
    drillModalVisible,
    drillModalMode,
    savingDrill,
    step1Complete,
    step2Complete,
    canCreate,
    handleSelectTeam,
    handleRemoveDrill,
    handleMoveDrill,
    addDrill,
    handleSelectDrill,
    handleOpenQuickDrill,
    handleCloseDrillModal,
    handleConfigureConfirm,
    handleQuickDrillSave,
    handleNextStep,
    handleBackStep,
    handleCreate,
  } = useCreateTraining({ teamIdParam });

  // Override drill selection to use new config sheet
  const handleDrillSelect = (drill: Drill) => {
    setConfigDrill(drill);
  };

  // Handle config confirm from new sheet
  const handleNewConfigConfirm = (config: NewDrillInstanceConfig) => {
    if (!configDrill) return;
    
    // Add drill to list with config
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

  // Handle "Create New" to open DrillCreator
  const handleOpenDrillCreator = () => {
    setShowDrillCreator(true);
  };

  // Handle adding drill from DrillCreator
  const handleDrillCreatorAdd = (drill: TrainingDrillItem) => {
    addDrill(drill);
  };

  // Handle saving new drill and adding to training
  const handleDrillCreatorSaveAndAdd = async (
    drillData: { name: string; drill_goal: 'grouping' | 'achievement'; target_type: 'paper' | 'tactical'; distance_m: number; rounds_per_shooter: number; time_limit_seconds?: number; strings_count?: number },
    config: NewDrillInstanceConfig
  ) => {
    if (!selectedTeamId) return;
    
    // Create drill in database
    const created = await createDrill(selectedTeamId, {
      name: drillData.name,
      drill_goal: drillData.drill_goal,
      target_type: drillData.target_type,
      distance_m: drillData.distance_m,
      rounds_per_shooter: drillData.rounds_per_shooter,
      time_limit_seconds: drillData.time_limit_seconds,
      strings_count: drillData.strings_count,
    });

    // Add to training
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

  // No teams available
  if (teams.length === 0) {
    return (
      <View style={[localStyles.notAvailable, { backgroundColor: colors.background }]}>
        <View style={[localStyles.notAvailableIcon, { backgroundColor: colors.card }]}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={[localStyles.notAvailableTitle, { color: colors.text }]}>No Teams</Text>
        <Text style={[localStyles.notAvailableDesc, { color: colors.textMuted }]}>
          Create or join a team to schedule trainings
        </Text>
        <View style={localStyles.notAvailableActions}>
          <TouchableOpacity
            style={[localStyles.notAvailableBtn, { backgroundColor: colors.text }]}
            onPress={() => router.replace('/(protected)/createTeam')}
          >
            <Text style={[localStyles.notAvailableBtnText, { color: colors.background }]}>Create Team</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[localStyles.notAvailableBtnSecondary, { borderColor: colors.border }]}
            onPress={() => router.replace('/(protected)/acceptInvite')}
          >
            <Text style={[localStyles.notAvailableBtnTextSecondary, { color: colors.text }]}>Join Team</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[localStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[localStyles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={localStyles.header}>
        <View style={[localStyles.headerIcon, { backgroundColor: colors.card }]}>
          <Ionicons name="barbell" size={24} color={colors.text} />
        </View>
        <Text style={[localStyles.title, { color: colors.text }]}>New Training</Text>
      </View>

      {/* Step Indicator */}
      <View style={localStyles.stepIndicator}>
        <View style={localStyles.stepRow}>
          <TouchableOpacity
            style={localStyles.stepItem}
            onPress={() => currentStep === 2 && handleBackStep()}
            activeOpacity={currentStep === 2 ? 0.7 : 1}
          >
            <View
              style={[
                localStyles.stepCircle,
                {
                  backgroundColor: step1Complete ? colors.text : currentStep === 1 ? `${colors.text}30` : colors.secondary,
                  borderColor: step1Complete || currentStep === 1 ? colors.text : colors.border,
                },
              ]}
            >
              {step1Complete ? (
                <Check size={12} color={colors.background} strokeWidth={3} />
              ) : (
                <Text style={[localStyles.stepNumber, { color: currentStep === 1 ? colors.text : colors.textMuted }]}>1</Text>
              )}
            </View>
            <Text style={[localStyles.stepLabel, { color: currentStep === 1 ? colors.text : colors.textMuted }]}>
              Details
            </Text>
          </TouchableOpacity>

          <View style={[localStyles.stepLine, { backgroundColor: step1Complete ? colors.text : colors.border }]} />

          <View style={localStyles.stepItem}>
            <View
              style={[
                localStyles.stepCircle,
                {
                  backgroundColor: step2Complete ? colors.text : currentStep === 2 ? `${colors.text}30` : colors.secondary,
                  borderColor: step2Complete || currentStep === 2 ? colors.text : colors.border,
                },
              ]}
            >
              {step2Complete ? (
                <Check size={12} color={colors.background} strokeWidth={3} />
              ) : (
                <Text style={[localStyles.stepNumber, { color: currentStep === 2 ? colors.text : colors.textMuted }]}>2</Text>
              )}
            </View>
            <Text style={[localStyles.stepLabel, { color: currentStep === 2 ? colors.text : colors.textMuted }]}>
              Drills
            </Text>
          </View>
        </View>
      </View>

      {/* ==================== STEP 1: TRAINING DETAILS ==================== */}
      {currentStep === 1 && (
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
      )}

      {/* ==================== STEP 2: ATTACH DRILLS ==================== */}
      {currentStep === 2 && (
        <TrainingDrillsStep
          drills={drills}
          teamDrills={teamDrills}
          hasTeam={!!selectedTeamId}
          canCreateDrills={canCreateDrills}
          onBack={handleBackStep}
          onSelectDrill={handleDrillSelect}
          onRemoveDrill={handleRemoveDrill}
          onMoveDrill={handleMoveDrill}
          onCreateNew={handleOpenDrillCreator}
        />
      )}

      {/* Spacer */}
      <View style={localStyles.spacer} />

      {/* Action Button */}
      {currentStep === 1 ? (
        <TouchableOpacity
          style={[
            localStyles.actionBtn,
            { backgroundColor: step1Complete ? colors.text : colors.secondary },
          ]}
          onPress={handleNextStep}
          disabled={!step1Complete}
          activeOpacity={0.85}
        >
          <Text
            style={[
              localStyles.actionBtnText,
              { color: step1Complete ? colors.background : colors.textMuted },
            ]}
          >
            Next: Add Drills
          </Text>
          <ArrowRight size={18} color={step1Complete ? colors.background : colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            localStyles.actionBtn,
            { backgroundColor: step2Complete ? colors.text : colors.secondary },
          ]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Text
                style={[
                  localStyles.actionBtnText,
                  { color: step2Complete ? colors.background : colors.textMuted },
                ]}
              >
                Create Training
              </Text>
              <Play
                size={16}
                color={step2Complete ? colors.background : colors.textMuted}
                fill={step2Complete ? colors.background : colors.textMuted}
              />
            </>
          )}
        </TouchableOpacity>
      )}

      {currentStep === 2 && drills.length > 0 && (
        <Text style={[localStyles.footerHint, { color: colors.textMuted }]}>
          Team will be notified when training is created
        </Text>
      )}

      {/* ============= MODALS ============= */}

      {/* New Drill Config Sheet (for existing drills from library) */}
      <DrillConfigSheet
        visible={configDrill !== null}
        drill={configDrill}
        onConfirm={handleNewConfigConfirm}
        onClose={() => setConfigDrill(null)}
      />

      {/* Unified Drill Creator (for new drills or modify existing) */}
      <DrillCreator
        visible={showDrillCreator}
        teamDrills={teamDrills}
        canSaveToLibrary={canCreateDrills}
        onAddToTraining={handleDrillCreatorAdd}
        onSaveAndAdd={handleDrillCreatorSaveAndAdd}
        onClose={() => setShowDrillCreator(false)}
      />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={localStyles.pickerOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={[localStyles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
              <View style={[localStyles.pickerGrabber, { backgroundColor: colors.border }]} />
              <View style={localStyles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[localStyles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[localStyles.pickerTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[localStyles.pickerDone, { color: colors.text }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setScheduledDate(date)}
                minimumDate={new Date()}
                style={localStyles.picker}
              />
              <View style={{ height: insets.bottom }} />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={localStyles.pickerOverlay} onPress={() => setShowTimePicker(false)}>
            <Pressable style={[localStyles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
              <View style={[localStyles.pickerGrabber, { backgroundColor: colors.border }]} />
              <View style={localStyles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[localStyles.pickerCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[localStyles.pickerTitle, { color: colors.text }]}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[localStyles.pickerDone, { color: colors.text }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={scheduledDate}
                mode="time"
                display="spinner"
                onChange={(_, date) => date && setScheduledDate(date)}
                style={localStyles.picker}
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
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  // Step Indicator
  stepIndicator: {
    marginTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepLine: {
    width: 60,
    height: 2,
    marginHorizontal: 12,
  },
  // No Teams
  notAvailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notAvailableIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notAvailableTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  notAvailableDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  notAvailableActions: {
    gap: 12,
  },
  notAvailableBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  notAvailableBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  notAvailableBtnSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  notAvailableBtnTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Spacer
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  // Action Button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  // Picker Modals
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
