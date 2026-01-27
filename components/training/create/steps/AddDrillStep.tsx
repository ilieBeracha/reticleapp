/**
 * AddDrillStep - Add drills to training via bottom sheet
 *
 * Shows the drill list with an "Add Drill" button.
 * Tapping opens a bottom sheet with drill configuration form
 * (goal toggle, execution policy, drill params).
 * On submit, closes sheet and adds drill to list.
 *
 * NOTE: Training only defines drill configurations (what to practice).
 * Execution happens via startEngagement when soldiers actually shoot.
 * Session = invisible setup container created at execution time.
 */

import { SessionContextStep } from '@/components/session/creation';
import type { SessionContextState, SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import { useColors } from '@/hooks/ui/useColors';
import { type TrainingDrillItem } from '@/services/drills';
import type { ExecutionPolicy } from '@/services/session/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  Crosshair,
  Lock,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Unlock,
  User,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// TYPES
// ============================================================================

interface AddDrillStepProps {
  drills: TrainingDrillItem[];
  onAddDrill: (drill: TrainingDrillItem) => void;
  onRemoveDrill: (id: string) => void;
  onMoveDrill: (index: number, direction: 'up' | 'down') => void;
}

// ============================================================================
// DRILL CARD
// ============================================================================

interface SessionCardProps {
  session: TrainingDrillItem;
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  colors: ReturnType<typeof useColors>;
}

function SessionCard({ session, index, total, onRemove, onMove, colors }: SessionCardProps) {
  const isGrouping = session.drill_goal === 'grouping';
  const isSquad = session.engagement_mode === 'squad';
  const purposeColor = isGrouping ? colors.blue : colors.orange;
  const purposeLabel = isGrouping ? 'Grouping' : isSquad ? 'Squad Engagement' : 'Engagement';

  // Execution policy display
  const policy = session.execution_policy || 'locked';
  const policyConfig = {
    locked: { icon: Lock, color: colors.blue, label: 'Locked' },
    guided: { icon: Sparkles, color: colors.green, label: 'Guided' },
    free: { icon: Unlock, color: colors.orange, label: 'Free' },
  }[policy];
  const PolicyIcon = policyConfig.icon;

  // Engagement mode icon
  const ModeIcon = isSquad ? Users : User;

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sessionCardHeader}>
        <View style={[styles.sessionNumber, { backgroundColor: `${purposeColor}15` }]}>
          <Text style={[styles.sessionNumberText, { color: purposeColor }]}>{index + 1}</Text>
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionNameRow}>
            <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
              {session.name || `Drill ${index + 1}`}
            </Text>
            <View style={[styles.policyBadge, { backgroundColor: `${policyConfig.color}15` }]}>
              <PolicyIcon size={10} color={policyConfig.color} />
              <Text style={[styles.policyBadgeText, { color: policyConfig.color }]}>{policyConfig.label}</Text>
            </View>
            {!isGrouping && (
              <View
                style={[
                  styles.policyBadge,
                  { backgroundColor: isSquad ? `${colors.orange}15` : `${colors.primary}15`, marginLeft: 4 },
                ]}
              >
                <ModeIcon size={10} color={isSquad ? colors.orange : colors.primary} />
                <Text style={[styles.policyBadgeText, { color: isSquad ? colors.orange : colors.primary }]}>
                  {isSquad ? 'Squad' : 'Solo'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
            {purposeLabel}
            {session.config.distance_m != null ? ` · ${session.config.distance_m}m` : ''}
            {session.config.rounds != null ? ` · ${session.config.rounds} shots` : ''}
            {session.config.position && ` · ${session.config.position}`}
            {session.config.distance_m == null && session.config.rounds == null && ' · Soldier chooses'}
          </Text>
        </View>
        <View style={styles.sessionActions}>
          {total > 1 && (
            <>
              <TouchableOpacity
                style={[styles.moveBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                onPress={() => onMove('up')}
                disabled={index === 0}
              >
                <ChevronUp size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveBtn, { opacity: index === total - 1 ? 0.3 : 1 }]}
                onPress={() => onMove('down')}
                disabled={index === total - 1}
              >
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={[styles.removeBtn, { backgroundColor: `${colors.red}15` }]} onPress={onRemove}>
            <Trash2 size={14} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// ADD DRILL BOTTOM SHEET
// ============================================================================

// Empty context - NO DEFAULTS
// Commander must explicitly set values (for locked policy)
// 0 = not set (will become null in drill config)
// Note: 0 distance/rounds doesn't make sense for shooting, so 0 = "not specified"
const EMPTY_CONTEXT: SessionContextState = {
  weaponId: null,
  weaponName: null,
  weaponCategory: null,
  distance: 0, // 0 = not set (will become null in drill config)
  position: 'any', // 'any' = not specified
  targetType: 'paper',
  shotsPlanned: 0, // 0 = not set (will become null in drill config)
  timeLimit: null,
  stressDrill: false,
  ammoType: null,
  windCondition: null,
  timeOfDay: 'day',
  notes: '',
};

interface AddSessionSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (session: TrainingDrillItem) => void;
}

function AddSessionSheet({ visible, onClose, onAdd }: AddSessionSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Goal + Mode + Policy
  const [purpose, setPurpose] = useState<SessionPurpose>('grouping');
  const [engagementMode, setEngagementMode] = useState<'solo' | 'squad'>('solo');
  const [executionPolicy, setExecutionPolicy] = useState<ExecutionPolicy>('locked');

  // Step 2: Configuration
  const [context, setContext] = useState<SessionContextState>(EMPTY_CONTEXT);
  const [customDistanceEditing, setCustomDistanceEditing] = useState(false);
  const [customDistanceText, setCustomDistanceText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Grouping drills are ALWAYS solo (enforced by canonical model)
  const effectiveEngagementMode = purpose === 'grouping' ? 'solo' : engagementMode;

  // Check if step 2 is needed (free mode skips config)
  const needsStep2 = executionPolicy !== 'free' || effectiveEngagementMode === 'squad';

  const handlePurposeSelect = useCallback((p: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurpose(p);
    // Reset to solo when switching to grouping (grouping is always solo)
    if (p === 'grouping') {
      setEngagementMode('solo');
    }
  }, []);

  const handlePolicySelect = useCallback((p: ExecutionPolicy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExecutionPolicy(p);
  }, []);

  const handleEngagementModeSelect = useCallback((mode: 'solo' | 'squad') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEngagementMode(mode);
    // Squad mode = always locked (commander controls)
    if (mode === 'squad') {
      setExecutionPolicy('locked');
    }
  }, []);

  const handleUpdateContext = useCallback((partial: Partial<SessionContextState>) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleNextStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Reset context when moving to step 2 to avoid stale values
    setContext(EMPTY_CONTEXT);
    setCustomDistanceEditing(false);
    setCustomDistanceText('');
    setValidationError(null);
    setStep(2);
  }, []);

  const handleBackStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
    setValidationError(null);
  }, []);

  const handleClose = useCallback(() => {
    // Reset all state
    setStep(1);
    setPurpose('grouping');
    setEngagementMode('solo');
    setExecutionPolicy('locked');
    setContext(EMPTY_CONTEXT);
    setCustomDistanceEditing(false);
    setCustomDistanceText('');
    setValidationError(null);
    onClose();
  }, [onClose]);

  const mapPosition = (pos: string | null): 'standing' | 'kneeling' | 'prone' | 'sitting' | null => {
    if (!pos || pos === 'any') return null;
    if (pos === 'seated') return 'sitting';
    if (['standing', 'kneeling', 'prone', 'sitting'].includes(pos)) {
      return pos as 'standing' | 'kneeling' | 'prone' | 'sitting';
    }
    return null;
  };

  const handleSubmit = useCallback(() => {
    // 0 = not set, convert to null for config
    const hasDistance = context.distance > 0;
    const hasRounds = context.shotsPlanned > 0;
    const hasPosition = context.position && context.position !== 'any';

    // Validation for LOCKED policy only - commander must specify config
    // Squad mode: only distance required (free-form session)
    // Grouping mode: only distance + position required (shot count comes from scan)
    // Engagement mode: full config required (distance, rounds, position)
    if (executionPolicy === 'locked') {
      if (!hasDistance) {
        setValidationError('Distance is required for locked drills');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      // Solo locked mode requires config based on drill goal
      if (effectiveEngagementMode !== 'squad') {
        // Engagement drills need rounds specified upfront
        // Grouping drills don't - shot count comes from scanned target
        if (purpose !== 'grouping' && !hasRounds) {
          setValidationError('Rounds are required for locked engagement drills');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        if (!hasPosition) {
          setValidationError('Position is required for locked drills');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValidationError(null);

    // Build name based on what's configured
    const nameParts = [purpose === 'grouping' ? 'Grouping' : 'Engagement'];
    if (hasDistance) nameParts.push(`${context.distance}m`);
    if (effectiveEngagementMode === 'squad') nameParts.push('(Squad)');

    const newSession: TrainingDrillItem = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      drill_id: '',
      name: nameParts.join(' '),
      description: context.notes || undefined,
      drill_goal: purpose,
      target_type: context.targetType === 'paper' || context.targetType === 'tactical' ? context.targetType : 'paper',
      execution_policy: executionPolicy,
      engagement_mode: effectiveEngagementMode,
      config: {
        // null = soldier chooses at execution time
        distance_m: hasDistance ? context.distance : null,
        rounds: hasRounds ? context.shotsPlanned : null,
        time_limit_seconds: context.timeLimit,
        position: mapPosition(context.position),
        strings_count: 1,
      },
    };

    onAdd(newSession);
    // Reset for next time
    setStep(1);
    setPurpose('grouping');
    setEngagementMode('solo');
    setExecutionPolicy('locked');
    setContext(EMPTY_CONTEXT);
    setCustomDistanceEditing(false);
    setCustomDistanceText('');
    setValidationError(null);
    onClose();
  }, [purpose, context, executionPolicy, effectiveEngagementMode, onAdd, onClose]);

  // Get step title
  const stepTitle = step === 1 ? 'Drill Type' : 'Configuration';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity
            style={[styles.sheetCloseBtn, { backgroundColor: colors.card }]}
            onPress={step === 1 ? handleClose : handleBackStep}
          >
            <Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.sheetHeaderCenter}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{stepTitle}</Text>
            <Text style={[styles.sheetStep, { color: colors.textMuted }]}>
              Step {step} of {needsStep2 ? 2 : 1}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: step === 1 ? (needsStep2 ? '50%' : '100%') : '100%',
              },
            ]}
          />
        </View>

        {/* Form */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════════════════════════════════════════════════════════
              STEP 1: Goal + Mode + Policy
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* Purpose Toggle */}
              <View style={styles.purposeRow}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal</Text>
                <View style={[styles.purposeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.purposeOption,
                      purpose === 'grouping' && [styles.purposeOptionActive, { backgroundColor: colors.primary }],
                    ]}
                    onPress={() => handlePurposeSelect('grouping')}
                    activeOpacity={0.7}
                  >
                    <Crosshair size={16} color={purpose === 'grouping' ? '#fff' : colors.textMuted} />
                    <Text style={[styles.purposeText, { color: purpose === 'grouping' ? '#fff' : colors.text }]}>
                      Grouping
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.purposeOption,
                      purpose === 'engagement' && [styles.purposeOptionActive, { backgroundColor: colors.orange }],
                    ]}
                    onPress={() => handlePurposeSelect('engagement')}
                    activeOpacity={0.7}
                  >
                    <Target size={16} color={purpose === 'engagement' ? '#fff' : colors.textMuted} />
                    <Text style={[styles.purposeText, { color: purpose === 'engagement' ? '#fff' : colors.text }]}>
                      Engagement
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Engagement Mode - Solo vs Squad */}
              <View style={styles.policySection}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Mode</Text>
                <Text style={[styles.policyHint, { color: colors.textMuted }]}>
                  {purpose === 'grouping' ? 'Grouping drills are always individual' : 'Individual or team execution?'}
                </Text>
                <View style={[styles.policyToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.policyOption,
                      effectiveEngagementMode === 'solo' && [
                        styles.policyOptionActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                    onPress={() => handleEngagementModeSelect('solo')}
                    disabled={purpose === 'grouping'}
                    activeOpacity={0.7}
                  >
                    <User size={14} color={effectiveEngagementMode === 'solo' ? '#fff' : colors.textMuted} />
                    <Text
                      style={[styles.policyText, { color: effectiveEngagementMode === 'solo' ? '#fff' : colors.text }]}
                    >
                      Solo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.policyOption,
                      effectiveEngagementMode === 'squad' && [
                        styles.policyOptionActive,
                        { backgroundColor: colors.orange },
                      ],
                      purpose === 'grouping' && { opacity: 0.4 },
                    ]}
                    onPress={() => handleEngagementModeSelect('squad')}
                    disabled={purpose === 'grouping'}
                    activeOpacity={0.7}
                  >
                    <Users size={14} color={effectiveEngagementMode === 'squad' ? '#fff' : colors.textMuted} />
                    <Text
                      style={[styles.policyText, { color: effectiveEngagementMode === 'squad' ? '#fff' : colors.text }]}
                    >
                      Squad
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Execution Policy - Only show for solo mode */}
              {effectiveEngagementMode !== 'squad' && (
                <View style={styles.policySection}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Flexibility</Text>
                  <Text style={[styles.policyHint, { color: colors.textMuted }]}>
                    How strictly must soldiers follow the configuration?
                  </Text>
                  <View style={[styles.policyToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[
                        styles.policyOption,
                        executionPolicy === 'locked' && [styles.policyOptionActive, { backgroundColor: colors.blue }],
                      ]}
                      onPress={() => handlePolicySelect('locked')}
                      activeOpacity={0.7}
                    >
                      <Lock size={14} color={executionPolicy === 'locked' ? '#fff' : colors.textMuted} />
                      <Text style={[styles.policyText, { color: executionPolicy === 'locked' ? '#fff' : colors.text }]}>
                        Locked
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.policyOption,
                        executionPolicy === 'guided' && [styles.policyOptionActive, { backgroundColor: colors.green }],
                      ]}
                      onPress={() => handlePolicySelect('guided')}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={14} color={executionPolicy === 'guided' ? '#fff' : colors.textMuted} />
                      <Text style={[styles.policyText, { color: executionPolicy === 'guided' ? '#fff' : colors.text }]}>
                        Guided
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.policyOption,
                        executionPolicy === 'free' && [styles.policyOptionActive, { backgroundColor: colors.orange }],
                      ]}
                      onPress={() => handlePolicySelect('free')}
                      activeOpacity={0.7}
                    >
                      <Unlock size={14} color={executionPolicy === 'free' ? '#fff' : colors.textMuted} />
                      <Text style={[styles.policyText, { color: executionPolicy === 'free' ? '#fff' : colors.text }]}>
                        Free
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.policyDesc, { color: colors.textMuted }]}>
                    {executionPolicy === 'locked' && 'Soldiers must execute exactly as defined'}
                    {executionPolicy === 'guided' && 'Defaults pre-filled, soldiers may adjust'}
                    {executionPolicy === 'free' && 'Soldiers choose everything freely'}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 2: Configuration
          ═══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              {/* Summary of Step 1 choices */}
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Goal</Text>
                  <View style={styles.summaryValue}>
                    {purpose === 'grouping' ? (
                      <Crosshair size={14} color={colors.primary} />
                    ) : (
                      <Target size={14} color={colors.orange} />
                    )}
                    <Text style={[styles.summaryText, { color: colors.text }]}>
                      {purpose === 'grouping' ? 'Grouping' : 'Engagement'}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Mode</Text>
                  <View style={styles.summaryValue}>
                    {effectiveEngagementMode === 'solo' ? (
                      <User size={14} color={colors.primary} />
                    ) : (
                      <Users size={14} color={colors.orange} />
                    )}
                    <Text style={[styles.summaryText, { color: colors.text }]}>
                      {effectiveEngagementMode === 'solo' ? 'Solo' : 'Squad'}
                    </Text>
                  </View>
                </View>
                {effectiveEngagementMode !== 'squad' && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Flexibility</Text>
                    <View style={styles.summaryValue}>
                      {executionPolicy === 'locked' && <Lock size={14} color={colors.blue} />}
                      {executionPolicy === 'guided' && <Sparkles size={14} color={colors.green} />}
                      {executionPolicy === 'free' && <Unlock size={14} color={colors.orange} />}
                      <Text style={[styles.summaryText, { color: colors.text }]}>
                        {executionPolicy === 'locked' ? 'Locked' : executionPolicy === 'guided' ? 'Guided' : 'Free'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Drill Configuration - for locked/guided solo */}
              {executionPolicy !== 'free' && effectiveEngagementMode !== 'squad' && (
                <>
                  {executionPolicy === 'guided' && (
                    <View style={styles.optionalHeader}>
                      <Text style={[styles.optionalLabel, { color: colors.textMuted }]}>
                        SUGGESTED DEFAULTS (OPTIONAL)
                      </Text>
                      <Text style={[styles.optionalHint, { color: colors.textMuted }]}>
                        Soldiers can adjust these values when executing
                      </Text>
                    </View>
                  )}
                  <SessionContextStep
                    purpose={purpose}
                    context={context}
                    onUpdateContext={handleUpdateContext}
                    onBack={() => {}}
                    hideWeaponSection
                  />
                </>
              )}

              {/* Squad mode - distance only */}
              {effectiveEngagementMode === 'squad' && (
                <>
                  <View
                    style={[
                      styles.squadNotice,
                      { backgroundColor: colors.primary + '10', borderColor: colors.primary },
                    ]}
                  >
                    <Users size={20} color={colors.primary} />
                    <View style={styles.freeNoticeText}>
                      <Text style={[styles.freeNoticeTitle, { color: colors.text }]}>Squad Session</Text>
                      <Text style={[styles.freeNoticeDesc, { color: colors.textMuted }]}>
                        Team drill with shared results. Only distance is configured.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.squadDistanceSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Distance</Text>
                    <View style={[styles.distanceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {[15, 25, 50, 100].map((d) => {
                        const isActive = context.distance === d && !customDistanceEditing;
                        return (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.distanceOption,
                              isActive && [styles.distanceOptionActive, { backgroundColor: colors.primary }],
                              customDistanceEditing && { opacity: 0.5 },
                            ]}
                            disabled={customDistanceEditing}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              handleUpdateContext({ distance: d });
                              setCustomDistanceEditing(false);
                            }}
                          >
                            <Text style={[styles.distanceText, { color: isActive ? '#fff' : colors.text }]}>{d}m</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {/* Custom distance input */}
                      {customDistanceEditing ? (
                        <View
                          style={[
                            styles.distanceOption,
                            styles.distanceInputContainer,
                            { borderColor: colors.primary },
                          ]}
                        >
                          <TextInput
                            style={[styles.distanceInput, { color: colors.text }]}
                            value={customDistanceText}
                            onChangeText={setCustomDistanceText}
                            onBlur={() => {
                              const num = parseInt(customDistanceText, 10);
                              if (!isNaN(num) && num > 0) {
                                handleUpdateContext({ distance: num });
                              }
                              setCustomDistanceEditing(false);
                            }}
                            onSubmitEditing={() => {
                              const num = parseInt(customDistanceText, 10);
                              if (!isNaN(num) && num > 0) {
                                handleUpdateContext({ distance: num });
                              }
                              setCustomDistanceEditing(false);
                            }}
                            keyboardType="number-pad"
                            autoFocus
                            selectTextOnFocus
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                          />
                          <Text style={[styles.distanceInputSuffix, { color: colors.text }]}>m</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.distanceOption,
                            context.distance > 0 &&
                              ![15, 25, 50, 100].includes(context.distance) && [
                                styles.distanceOptionActive,
                                { backgroundColor: colors.primary },
                              ],
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCustomDistanceText(context.distance > 0 ? String(context.distance) : '');
                            setCustomDistanceEditing(true);
                          }}
                        >
                          <Text
                            style={[
                              styles.distanceText,
                              {
                                color:
                                  context.distance > 0 && ![15, 25, 50, 100].includes(context.distance)
                                    ? '#fff'
                                    : colors.textMuted,
                              },
                            ]}
                          >
                            {context.distance > 0 && ![15, 25, 50, 100].includes(context.distance)
                              ? `${context.distance}m`
                              : 'Other'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {context.distance === 0 && (
                      <Text style={[styles.policyDesc, { color: colors.red }]}>Select a distance</Text>
                    )}
                  </View>
                </>
              )}

              {/* Free policy notice - only for solo free mode (shouldn't reach here but safety) */}
              {executionPolicy === 'free' && effectiveEngagementMode !== 'squad' && (
                <View
                  style={[styles.freeNotice, { backgroundColor: colors.orange + '10', borderColor: colors.orange }]}
                >
                  <Unlock size={20} color={colors.orange} />
                  <View style={styles.freeNoticeText}>
                    <Text style={[styles.freeNoticeTitle, { color: colors.text }]}>Full Freedom Mode</Text>
                    <Text style={[styles.freeNoticeDesc, { color: colors.textMuted }]}>
                      Soldiers will choose their own distance, rounds, and position when executing this drill.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.sheetFooter, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {validationError && <Text style={[styles.validationError, { color: colors.red }]}>{validationError}</Text>}
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.sheetSubmitBtn, { backgroundColor: colors.text }]}
              onPress={needsStep2 ? handleNextStep : handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={[styles.sheetSubmitText, { color: colors.background }]}>
                {needsStep2 ? 'Continue' : 'Add Drill'}
              </Text>
              {needsStep2 ? (
                <Ionicons name="arrow-forward" size={18} color={colors.background} />
              ) : (
                <Plus size={18} color={colors.background} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sheetSubmitBtn, { backgroundColor: colors.text }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Plus size={18} color={colors.background} />
              <Text style={[styles.sheetSubmitText, { color: colors.background }]}>Add Drill</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddDrillStep({ drills, onAddDrill, onRemoveDrill, onMoveDrill }: AddDrillStepProps) {
  const colors = useColors();
  const [showSheet, setShowSheet] = useState(false);

  const handleAdd = useCallback(
    (drill: TrainingDrillItem) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onAddDrill(drill);
    },
    [onAddDrill]
  );

  const handleOpenSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSheet(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Target size={20} color={colors.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>What will you train?</Text>
          <Text style={[styles.headerHint, { color: colors.textMuted }]}>
            Add drills · Everyone runs them in parallel
          </Text>
        </View>
      </View>

      {/* Drills List */}
      {drills.length > 0 && (
        <View style={styles.sessionsList}>
          {drills.map((drill, index) => (
            <SessionCard
              key={drill.id}
              session={drill}
              index={index}
              total={drills.length}
              onRemove={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onRemoveDrill(drill.id);
              }}
              onMove={(dir) => onMoveDrill(index, dir)}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Add Drill Button */}
      <TouchableOpacity
        style={[
          styles.addBtn,
          {
            backgroundColor: drills.length === 0 ? colors.primary : colors.card,
            borderColor: drills.length === 0 ? colors.primary : colors.border,
          },
        ]}
        onPress={handleOpenSheet}
        activeOpacity={0.7}
      >
        <Plus size={18} color={drills.length === 0 ? '#fff' : colors.primary} />
        <Text style={[styles.addBtnText, { color: drills.length === 0 ? '#fff' : colors.primary }]}>
          {drills.length === 0 ? 'Add First Drill' : 'Add Another Drill'}
        </Text>
      </TouchableOpacity>

      {/* Empty hint */}
      {drills.length === 0 && (
        <View style={styles.emptyHint}>
          <Circle size={16} color={colors.textMuted} />
          <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>Add at least one drill to continue</Text>
        </View>
      )}

      {/* Bottom Sheet */}
      <AddSessionSheet visible={showSheet} onClose={() => setShowSheet(false)} onAdd={handleAdd} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    paddingTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerHint: {
    fontSize: 14,
  },

  // Sessions list
  sessionsList: {
    gap: 8,
  },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  sessionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sessionMeta: {
    fontSize: 12,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveBtn: {
    padding: 6,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
  },

  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty hint
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyHintText: {
    fontSize: 13,
  },

  // Sheet
  sheetContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetHeaderCenter: {
    alignItems: 'center',
  },
  sheetStep: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBar: {
    height: 3,
    marginHorizontal: 20,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  validationError: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  sheetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  sheetSubmitText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Purpose Toggle (in sheet)
  purposeRow: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  purposeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  purposeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
  },
  purposeOptionActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Session name row with policy badge
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  policyBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Execution Policy Section (in sheet)
  policySection: {
    marginBottom: 20,
  },
  policyHint: {
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4,
  },
  policyToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  policyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  policyOptionActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  policyText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  policyDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Summary Card (Step 2)
  summaryCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Optional header for guided mode
  optionalHeader: {
    marginBottom: 12,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  optionalHint: {
    fontSize: 12,
  },

  // Free policy notice
  freeNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  freeNoticeText: {
    flex: 1,
    gap: 4,
  },
  freeNoticeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  freeNoticeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Squad mode notice
  squadNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },

  // Squad distance section
  squadDistanceSection: {},
  distanceRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  distanceOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9,
  },
  distanceOptionActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 8,
    gap: 2,
  },
  distanceInput: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    paddingVertical: 0,
  },
  distanceInputSuffix: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default AddDrillStep;
