/**
 * CREATE TRAINING
 * Drill-first training creation flow
 */

import { UnifiedDrillModal } from '@/components/drills/UnifiedDrillModal';
import {
  calculateTotalShots,
  calculateTotalTime,
  COLORS,
  formatDisplayDate,
  formatDisplayTime,
  formatTimeLimit,
  getDrillGoalColor,
  styles,
  useCreateTraining,
  type TrainingDrillItem,
} from '@/components/createTraining';
import { useColors } from '@/hooks/ui/useColors';
import type { Drill } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Target, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// DRILL LIBRARY PICKER - Tab-based design
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
        <Text style={[styles.libEmptyText, { color: colors.textMuted }]}>Select a team to view drills</Text>
      </View>
    );
  }

  return (
    <View style={[styles.libSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.libHeader}>
        <Text style={[styles.libTitle, { color: colors.text }]}>Drill Library</Text>
        {onCreateNew && (
          <TouchableOpacity onPress={onCreateNew} hitSlop={8}>
            <Text style={[styles.libNewLink, { color: colors.primary }]}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

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
          <Text style={[styles.libTabText, { color: activeTab === 'achievement' ? COLORS.achievement : colors.textMuted }]}>
            Achievement ({achievementCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.libTab, activeTab === 'grouping' && { backgroundColor: colors.card }]}
          onPress={() => setActiveTab('grouping')}
        >
          <Text style={[styles.libTabText, { color: activeTab === 'grouping' ? COLORS.grouping : colors.textMuted }]}>
            Grouping ({groupingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredDrills.length > 0 ? (
        <View style={styles.libList}>
          {filteredDrills.map(drill => {
            const goalColor = getDrillGoalColor(drill.drill_goal);
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
            <TouchableOpacity style={[styles.libEmptyBtn, { borderColor: colors.primary }]} onPress={onCreateNew}>
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
  const totalShots = calculateTotalShots(drills);
  const totalTime = calculateTotalTime(drills);

  return (
    <View style={styles.timeline}>
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
                <Text style={[styles.timelineStatValue, { color: colors.text }]}>{formatTimeLimit(totalTime)}</Text>
                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>limit</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.timelineRail}>
        {drills.map((drill, index) => {
          const goalColor = getDrillGoalColor(drill.drill_goal);
          const totalDrillShots = drill.rounds_per_shooter * (drill.strings_count || 1);
          const isFirst = index === 0;
          const isLast = index === drills.length - 1;
  const isGrouping = drill.drill_goal === 'grouping';

  return (
    <Animated.View
              key={drill.id}
      entering={FadeInRight.delay(index * 50).springify()}
      layout={Layout.springify()}
              style={styles.timelineNode}
    >
              {!isFirst && <View style={[styles.timelineLineTop, { backgroundColor: colors.border }]} />}
              <View style={[styles.timelineCircle, { backgroundColor: goalColor, borderColor: goalColor }]}>
                <Text style={styles.timelineCircleText}>{index + 1}</Text>
      </View>
              {!isLast && <View style={[styles.timelineLineBottom, { backgroundColor: colors.border }]} />}

              <View style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  <TouchableOpacity style={styles.timelineActionBtn} onPress={() => onRemove(drill.id)} hitSlop={6}>
                    <Trash2 size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
    </Animated.View>
          );
        })}

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
    handleSelectDrill,
    handleOpenQuickDrill,
    handleCloseDrillModal,
    handleConfigureConfirm,
    handleQuickDrillSave,
    handleNextStep,
    handleBackStep,
    handleCreate,
  } = useCreateTraining({ teamIdParam });

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

      {/* Stepper */}
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
        
        {(isTeamLocked || teams.length === 1) && selectedTeam ? (
          <View style={[styles.teamSelected, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={[styles.teamSelectedIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.teamSelectedName, { color: colors.text }]}>{selectedTeam.name}</Text>
                {isTeamLocked && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
          </View>
        ) : (
          <>
            {needsTeamSelection && (
                  <View style={[styles.teamPrompt, { backgroundColor: COLORS.yellow + '15', borderColor: COLORS.yellow }]}>
                    <Ionicons name="information-circle" size={16} color={COLORS.yellow} />
                    <Text style={[styles.teamPromptText, { color: colors.text }]}>Select a team to see available drills</Text>
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
                      onPress={() => handleSelectTeam(team.id)}
                  activeOpacity={0.7}
                >
                      <Ionicons name="people" size={16} color={selectedTeamId === team.id ? colors.primary : colors.textMuted} />
                      <Text style={[styles.teamOptionName, { color: selectedTeamId === team.id ? colors.primary : colors.text }]} numberOfLines={1}>
                    {team.name}
                  </Text>
                      {selectedTeamId === team.id && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
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
                <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDisplayDate(scheduledDate)}</Text>
          </TouchableOpacity>
          {!manualStart && (
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.background, borderColor: colors.primary }]}
              onPress={() => setShowTimePicker(true)}
            >
                  <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDisplayTime(scheduledDate)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Manual Start Toggle */}
      <TouchableOpacity
        style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setManualStart(!manualStart)}
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
            style={[styles.nextButton, { backgroundColor: step1Complete ? colors.primary : colors.muted }]}
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
          <TouchableOpacity style={styles.backLink} onPress={handleBackStep} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={[styles.backLinkText, { color: colors.primary }]}>Details</Text>
        </TouchableOpacity>

        {drills.length > 0 && (
            <DrillTimeline drills={drills} colors={colors} onRemove={handleRemoveDrill} onMove={handleMoveDrill} />
          )}

          <DrillLibraryPicker
            drills={teamDrills}
                  colors={colors}
            onSelect={handleSelectDrill}
            onCreateNew={canCreateDrills ? handleOpenQuickDrill : undefined}
            hasTeam={!!selectedTeamId}
          />

              <TouchableOpacity
            style={[styles.createButton, { backgroundColor: step2Complete ? colors.primary : colors.muted, opacity: submitting ? 0.85 : 1 }]}
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
                <Ionicons name={step2Complete ? 'checkmark-circle' : 'add-circle-outline'} size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Training</Text>
            </>
          )}
        </TouchableOpacity>

        {drills.length > 0 && (
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>Team will be notified when training is created</Text>
        )}
        </>
      )}

      {/* Unified Drill Modal */}
      <UnifiedDrillModal
        visible={drillModalVisible}
        onClose={handleCloseDrillModal}
        mode={drillModalMode}
        drillName={selectedDrill?.name}
        initialData={
          selectedDrill
            ? {
                drill_goal: selectedDrill.drill_goal,
                target_type: selectedDrill.target_type,
                distance_m: selectedDrill.distance_m,
                rounds_per_shooter: selectedDrill.rounds_per_shooter,
                strings_count: selectedDrill.strings_count ?? 1,
                time_limit_seconds: selectedDrill.time_limit_seconds ?? null,
                input_method: selectedDrill.drill_goal === 'grouping' ? 'scan' : 'manual',
              }
            : undefined
        }
        onConfirmConfig={handleConfigureConfirm}
        onSaveQuick={handleQuickDrillSave}
        saving={savingDrill}
      />

      {/* Date Picker Modal */}
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

      {/* Time Picker Modal */}
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
