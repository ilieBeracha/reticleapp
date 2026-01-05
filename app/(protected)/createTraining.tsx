/**
 * CREATE TRAINING - Premium 2-Step Flow
 *
 * A polished, premium training creation experience.
 * Step 1: Details - Team, name, schedule
 * Step 2: Program - Build drill sequence
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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Check, ChevronLeft, Play, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Animation values
  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.97);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1);
  };

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
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContent}>
          <View style={[styles.emptyIconOuter, { backgroundColor: `${colors.text}08` }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Users size={32} color={colors.textMuted} strokeWidth={1.5} />
            </View>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Teams Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Create or join a team to start{'\n'}scheduling team trainings
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
  // COMPUTED
  // ─────────────────────────────────────────────────────────────────────────

  const totalShots = drills.reduce((sum, d) => sum + d.rounds_per_shooter * (d.strings_count || 1), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <Animated.View 
        entering={FadeInDown.duration(400)} 
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
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
          <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        {/* Title + Sparkle */}
        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {currentStep === 1 ? 'New Training' : 'Build Program'}
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {currentStep === 1 
              ? 'Set up your team training session' 
              : `${drills.length} drill${drills.length !== 1 ? 's' : ''} · ${totalShots} shots`
            }
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Step Indicator */}
      <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.stepIndicator}>
        <View style={styles.stepRow}>
          {[1, 2].map((step) => {
            const isComplete = step === 1 ? step1Complete : step2Complete;
            const isActive = currentStep === step;
            const labels = ['Details', 'Program'];
            
            return (
              <View key={step} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: isComplete ? colors.text : isActive ? colors.text : colors.border,
                      width: isActive ? 28 : 8,
                    },
                  ]}
                >
                  {isComplete && <Check size={10} color={colors.background} strokeWidth={3} />}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isActive || isComplete ? colors.text : colors.textMuted },
                  ]}
                >
                  {labels[step - 1]}
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 ? (
          <Animated.View 
            key="step1"
            entering={SlideInRight.duration(300)} 
            exiting={FadeOut.duration(150)}
          >
            <TrainingDetailsStep
              teams={teams}
              selectedTeamId={selectedTeamId}
              isTeamLocked={isTeamLocked}
              title={title}
              scheduledDate={scheduledDate}
              manualStart={manualStart}
              teamDrillsCount={teamDrills.length}
              onSelectTeam={handleSelectTeam}
              onTitleChange={setTitle}
              onOpenDatePicker={() => setShowDatePicker(true)}
              onOpenTimePicker={() => setShowTimePicker(true)}
              onToggleManualStart={() => setManualStart(!manualStart)}
              onViewDrillLibrary={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleNextStep();
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View 
            key="step2"
            entering={SlideInRight.duration(300)} 
            exiting={FadeOut.duration(150)}
          >
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
      </ScrollView>

      {/* Bottom Action Bar */}
      <Animated.View 
        entering={FadeInUp.delay(200).duration(400)}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}
      >
        <LinearGradient
          colors={[`${colors.background}00`, colors.background, colors.background]}
          style={styles.bottomGradient}
        />
        <Animated.View style={animatedButtonStyle}>
          {currentStep === 1 ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: step1Complete ? colors.text : colors.card },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleNextStep();
              }}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={!step1Complete}
              activeOpacity={0.9}
            >
              <Text style={[styles.actionText, { color: step1Complete ? colors.background : colors.textMuted }]}>
                Continue
              </Text>
              <ArrowRight size={18} color={step1Complete ? colors.background : colors.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: canCreate ? colors.text : colors.card },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleCreate();
              }}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={!canCreate}
              activeOpacity={0.9}
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
        </Animated.View>

        {currentStep === 2 && drills.length > 0 && (
          <Animated.Text 
            entering={FadeIn.delay(300).duration(300)}
            style={[styles.footerHint, { color: colors.textMuted }]}
          >
            Team will be notified when training is created
          </Animated.Text>
        )}
      </Animated.View>

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
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={styles.pickerOverlay} onPress={() => setShowDatePicker(false)}>
            <Animated.View entering={FadeInUp.springify()}>
              <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <X size={20} color={colors.textMuted} />
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
            </Animated.View>
          </Pressable>
        </Modal>
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={styles.pickerOverlay} onPress={() => setShowTimePicker(false)}>
            <Animated.View entering={FadeInUp.springify()}>
              <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <X size={20} color={colors.textMuted} />
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
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  headerSpacer: {
    width: 44,
  },
  // Step Indicator
  stepIndicator: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 28,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  stepItem: {
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 58,
    borderRadius: 18,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  footerHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.1,
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
  emptyIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyActions: {
    gap: 12,
  },
  emptyBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyBtnSecondary: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  emptyBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Picker Modals
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    height: 220,
    marginVertical: 8,
  },
});
