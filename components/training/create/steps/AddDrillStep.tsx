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

import { SessionContextStep } from '@/components/session/creation/SessionContextStep';
import { useColors } from '@/hooks/ui/useColors';
import { type TrainingDrillItem } from '@/services/drills/drillService';
import type { ExecutionPolicy } from '@/types/session';
import type { SessionContextState, SessionPurpose } from '@/types/sessionCreation';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Lock,
  Minus,
  Plus,
  Repeat,
  Target,
  Trash2,
  User,
  Users
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

function getDistanceCategoryLabel(category: string, t: (key: string) => string): string {
  if (category === 'short') return t('training.shortRange');
  if (category === 'medium') return t('training.mediumRange');
  return t('training.longRange');
}

function buildSessionMetaText(
  session: TrainingDrillItem,
  purposeLabel: string,
  t: (key: string, opts?: Record<string, any>) => string
): string {
  const parts: string[] = [purposeLabel];
  const config = session.config;

  if (config?.distance_category) {
    parts.push(getDistanceCategoryLabel(config.distance_category, t));
  } else if (config?.distance_m != null) {
    parts.push(`${config.distance_m}m`);
  }

  if (config?.rounds != null) {
    parts.push(t('training.shotsCount', { count: config.rounds }));
  }

  if (config?.position) {
    parts.push(t(`session.positionOptions.${config.position}`));
  }

  if (config?.distance_m == null && !config?.distance_category && config?.rounds == null) {
    parts.push(t('training.soldierChooses'));
  }

  if (config?.available_from && config?.available_until) {
    parts.push(
      `${new Date(config.available_from).toLocaleDateString()} → ${new Date(config.available_until).toLocaleDateString()}`
    );
  }

  return parts.join(' · ');
}

function SessionCard({ session, index, total, onRemove, onMove, colors }: SessionCardProps) {
  const { t } = useTranslation();
  const isGrouping = session.drill_goal === 'grouping';
  const isSquad = session.engagement_mode === 'squad';
  const purposeColor = isGrouping ? colors.blue : colors.orange;
  const purposeLabel = isGrouping
    ? t('session.grouping')
    : isSquad
      ? t('training.squadEngagement')
      : t('session.engagement');

  // Execution policy display - always locked (soldiers can only change weapon)
  const policyConfig = { icon: Lock, color: colors.blue, label: t('training.locked') };
  const PolicyIcon = policyConfig.icon;

  // Engagement mode icon
  const ModeIcon = isSquad ? Users : User;

  // Scale animation
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.sessionCardHeader}>
          <View style={[styles.sessionNumber, { backgroundColor: `${purposeColor}20` }]}>
            <Text style={[styles.sessionNumberText, { color: purposeColor }]}>{index + 1}</Text>
          </View>
          <View style={styles.sessionInfo}>
            <View style={styles.sessionNameRow}>
              <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
                {session.name || t('training.drillNumber', { number: index + 1 })}
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
                    {isSquad ? t('training.collective') : t('training.individual')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
              {buildSessionMetaText(session, purposeLabel, t)}
            </Text>
          </View>
          <View style={styles.sessionActions}>
            {total > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.moveBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                  onPress={() => onMove('up')}
                  disabled={index === 0}
                  hitSlop={8}
                >
                  <ChevronUp size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moveBtn, { opacity: index === total - 1 ? 0.3 : 1 }]}
                  onPress={() => onMove('down')}
                  disabled={index === total - 1}
                  hitSlop={8}
                >
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: `${colors.red}10` }]}
              onPress={onRemove}
              hitSlop={8}
            >
              <Trash2 size={14} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// ADD DRILL BOTTOM SHEET
// ============================================================================

// Empty context - NO DEFAULTS
// Commander must explicitly set values (for locked policy)
// 0 = not set (will become null in drill config)
const EMPTY_CONTEXT: SessionContextState = {
  weaponId: null,
  weaponName: null,
  weaponCategory: null,
  distance: 0,
  distanceCategory: null,
  position: 'any',
  targetType: 'paper',
  shotsPlanned: 0,
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
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [drillName, setDrillName] = useState('');
  const [purpose, setPurpose] = useState<SessionPurpose>('grouping');
  const [engagementMode, setEngagementMode] = useState<'solo' | 'squad'>('solo');
  // Always locked - soldiers can only change weapon
  const executionPolicy: ExecutionPolicy = 'locked';
  const [context, setContext] = useState<SessionContextState>(EMPTY_CONTEXT);
  const [targetCount, setTargetCount] = useState(1);
  const [maxExecutions, setMaxExecutions] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Date range for squad engagement
  const [availableFrom, setAvailableFrom] = useState<Date | null>(null);
  const [availableUntil, setAvailableUntil] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showUntilPicker, setShowUntilPicker] = useState(false);

  const effectiveEngagementMode = purpose === 'grouping' ? 'solo' : engagementMode;

  const handlePurposeSelect = useCallback((p: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurpose(p);
    if (p === 'grouping') {
      setEngagementMode('solo');
      setTargetCount(1);
    }
  }, []);

  // Policy is always 'locked' - no selection needed
  // Soldiers can only change weapon, all other drill params are set by commander

  const handleEngagementModeSelect = useCallback((mode: 'solo' | 'squad') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEngagementMode(mode);
  }, []);

  const handleUpdateContext = useCallback((partial: Partial<SessionContextState>) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleClose = useCallback(() => {
    setDrillName('');
    setPurpose('grouping');
    setEngagementMode('solo');
    setContext(EMPTY_CONTEXT);
    setTargetCount(1);
    setMaxExecutions(1);
    setValidationError(null);
    setAvailableFrom(null);
    setAvailableUntil(null);
    setShowFromPicker(false);
    setShowUntilPicker(false);
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
    const hasDistance = context.distance > 0;
    // Use context.distanceCategory for both modes - SessionContextStep handles the UI
    const hasDistanceCategory = context.distanceCategory !== null;
    const hasRounds = context.shotsPlanned > 0;
    const hasPosition = context.position && context.position !== 'any';

    if (executionPolicy === 'locked') {
      if (!hasDistance && !hasDistanceCategory) {
        setValidationError(t('training.distanceRequiredForLocked'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (effectiveEngagementMode !== 'squad') {
        if (purpose !== 'grouping' && !hasRounds) {
          setValidationError(t('training.roundsRequiredForLocked'));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        if (!hasPosition) {
          setValidationError(t('training.positionRequiredForLocked'));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setValidationError(null);

    let name = drillName.trim();
    if (!name) {
      const nameParts = [purpose === 'grouping' ? t('session.grouping') : t('session.engagement')];
      if (hasDistanceCategory) {
        nameParts.push(getDistanceCategoryLabel(context.distanceCategory!, t));
      } else if (hasDistance) {
        nameParts.push(`${context.distance}m`);
      }
      if (effectiveEngagementMode === 'squad') nameParts.push(`(${t('training.squadType')})`);
      name = nameParts.join(' ');
    }

    const newSession: TrainingDrillItem = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      drill_id: '',
      name,
      description: context.notes || undefined,
      drill_goal: purpose,
      target_type: context.targetType === 'paper' || context.targetType === 'tactical' ? context.targetType : 'paper',
      execution_policy: executionPolicy,
      engagement_mode: effectiveEngagementMode,
      max_executions: maxExecutions,
      config: {
        distance_m: hasDistanceCategory ? null : hasDistance ? context.distance : null,
        distance_category: hasDistanceCategory ? context.distanceCategory : null,
        rounds: hasRounds ? context.shotsPlanned : null,
        time_limit_seconds: context.timeLimit,
        position: mapPosition(context.position),
        strings_count: 1,
        target_count: purpose === 'engagement' ? targetCount : null,
        measurement_scope: effectiveEngagementMode === 'squad' ? 'collective' : 'individual',
        available_from: effectiveEngagementMode === 'squad' && availableFrom ? availableFrom.toISOString() : null,
        available_until: effectiveEngagementMode === 'squad' && availableUntil ? availableUntil.toISOString() : null,
      },
    };

    onAdd(newSession);
    setDrillName('');
    setPurpose('grouping');
    setEngagementMode('solo');
    setContext(EMPTY_CONTEXT);
    setTargetCount(1);
    setMaxExecutions(1);
    setValidationError(null);
    setAvailableFrom(null);
    setAvailableUntil(null);
    onClose();
  }, [drillName, purpose, context, targetCount, maxExecutions, executionPolicy, effectiveEngagementMode, availableFrom, availableUntil, onAdd, onClose, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity style={[styles.sheetCloseBtn, { backgroundColor: colors.card }]} onPress={handleClose}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('training.addDrill')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Goal ── */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textMuted }]}>{t('training.goal')}</Text>
            <View style={[styles.segmentedControl, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={[styles.segment, purpose === 'grouping' && { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  handlePurposeSelect('grouping');
                }}
              >
                <Crosshair size={15} color={purpose === 'grouping' ? '#fff' : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.segmentText, { color: purpose === 'grouping' ? '#fff' : colors.text }]}>
                  {t('session.grouping')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segment, purpose === 'engagement' && { backgroundColor: colors.orange }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  handlePurposeSelect('engagement');
                }}
              >
                <Target size={15} color={purpose === 'engagement' ? '#fff' : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.segmentText, { color: purpose === 'engagement' ? '#fff' : colors.text }]}>
                  {t('session.engagement')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Name (optional) ── */}
          <View style={styles.formSection}>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder={t('training.drillName')}
              placeholderTextColor={colors.textMuted}
              value={drillName}
              onChangeText={setDrillName}
              returnKeyType="done"
            />
          </View>

          {/* ── Settings ── */}
          <View style={styles.formSection}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Mode (engagement only) */}
              {purpose === 'engagement' && (
                <>
                  <View style={styles.formRow}>
                    <View style={styles.formRowLabel}>
                      <Users size={14} color={colors.textMuted} />
                      <Text style={[styles.formRowText, { color: colors.text }]}>{t('training.mode')}</Text>
                    </View>
                    <View style={[styles.inlineSegment, { backgroundColor: colors.background }]}>
                      <Pressable
                        style={[styles.inlineOption, engagementMode === 'solo' && { backgroundColor: colors.primary }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          handleEngagementModeSelect('solo');
                        }}
                      >
                        <Text
                          style={[
                            styles.inlineOptionText,
                            { color: engagementMode === 'solo' ? '#fff' : colors.textMuted },
                          ]}
                        >
                          {t('training.individual')}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.inlineOption,
                          engagementMode === 'squad' && { backgroundColor: colors.orange },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          handleEngagementModeSelect('squad');
                        }}
                      >
                        <Text
                          style={[
                            styles.inlineOptionText,
                            { color: engagementMode === 'squad' ? '#fff' : colors.textMuted },
                          ]}
                        >
                          {t('training.collective')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
                </>
              )}

              {/* Policy is always 'locked' - soldiers can only change weapon */}

              {/* Target count + Repetitions (engagement only) */}
              {purpose === 'engagement' && (
                <>
                  <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.formRow}>
                    <View style={styles.formRowLabel}>
                      <Target size={14} color={colors.textMuted} />
                      <Text style={[styles.formRowText, { color: colors.text }]}>
                        {t('training.targets')}
                      </Text>
                    </View>
                    <View style={styles.miniStepper}>
                      <TouchableOpacity
                        style={[styles.miniStepperBtn, { backgroundColor: colors.background, opacity: targetCount <= 1 ? 0.3 : 1 }]}
                        onPress={() => { if (targetCount > 1) { Haptics.selectionAsync(); setTargetCount((c) => c - 1); } }}
                        disabled={targetCount <= 1}
                        hitSlop={8}
                      >
                        <Minus size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.miniStepperValue, { color: colors.text }]}>{targetCount}</Text>
                      <TouchableOpacity
                        style={[styles.miniStepperBtn, { backgroundColor: colors.background, opacity: targetCount >= 5 ? 0.3 : 1 }]}
                        onPress={() => { if (targetCount < 5) { Haptics.selectionAsync(); setTargetCount((c) => c + 1); } }}
                        disabled={targetCount >= 5}
                        hitSlop={8}
                      >
                        <Plus size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {/* Repetitions */}
              <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
              <View style={styles.formRow}>
                <View style={styles.formRowLabel}>
                  <Repeat size={14} color={colors.textMuted} />
                  <Text style={[styles.formRowText, { color: colors.text }]}>
                    {t('training.repetitions')}
                  </Text>
                </View>
                <View style={styles.miniStepper}>
                  <TouchableOpacity
                    style={[styles.miniStepperBtn, { backgroundColor: colors.background, opacity: maxExecutions <= 1 ? 0.3 : 1 }]}
                    onPress={() => { if (maxExecutions > 1) { Haptics.selectionAsync(); setMaxExecutions((c) => c - 1); } }}
                    disabled={maxExecutions <= 1}
                    hitSlop={8}
                  >
                    <Minus size={14} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.miniStepperValue, { color: colors.text }]}>{maxExecutions}</Text>
                  <TouchableOpacity
                    style={[styles.miniStepperBtn, { backgroundColor: colors.background, opacity: maxExecutions >= 10 ? 0.3 : 1 }]}
                    onPress={() => { if (maxExecutions < 10) { Haptics.selectionAsync(); setMaxExecutions((c) => c + 1); } }}
                    disabled={maxExecutions >= 10}
                    hitSlop={8}
                  >
                    <Plus size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* ── Configuration (solo) ── */}
          {effectiveEngagementMode !== 'squad' && (
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                {t('training.configuration')}
              </Text>
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <SessionContextStep
                  purpose={purpose}
                  context={context}
                  onUpdateContext={handleUpdateContext}
                  onBack={() => {}}
                  hideWeaponSection
                  showRangeCategory
                  targetCount={targetCount}
                />
              </View>
            </View>
          )}

          {/* ── Squad configuration ── */}
          {effectiveEngagementMode === 'squad' && (
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                {t('training.configuration')}
              </Text>
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.notice, { backgroundColor: `${colors.primary}10` }]}>
                  <Users size={16} color={colors.primary} />
                  <View style={styles.noticeContent}>
                    <Text style={[styles.noticeTitle, { color: colors.text }]}>
                      {t('training.collectiveSession')}
                    </Text>
                    <Text style={[styles.noticeDesc, { color: colors.textMuted }]}>
                      {t('training.collectiveSessionDescription')}
                    </Text>
                  </View>
                </View>
                <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
                <SessionContextStep
                  purpose={purpose}
                  context={context}
                  onUpdateContext={handleUpdateContext}
                  onBack={() => {}}
                  hideWeaponSection
                  showRangeCategory
                  targetCount={targetCount}
                />
              </View>
            </View>
          )}

          {/* Date Pickers */}
          {showFromPicker && (
            <DatePickerModal
              visible={showFromPicker}
              onClose={() => setShowFromPicker(false)}
              title={t('training.selectStartDate')}
              value={availableFrom || new Date()}
              onChange={(date) => {
                setAvailableFrom(date);
                // If end date is before start date, clear it
                if (availableUntil && date > availableUntil) {
                  setAvailableUntil(null);
                }
              }}
              minimumDate={new Date()}
              colors={colors}
              bottomInset={insets.bottom}
            />
          )}
          {showUntilPicker && (
            <DatePickerModal
              visible={showUntilPicker}
              onClose={() => setShowUntilPicker(false)}
              title={t('training.selectEndDate')}
              value={availableUntil || availableFrom || new Date()}
              onChange={setAvailableUntil}
              minimumDate={availableFrom || new Date()}
              colors={colors}
              bottomInset={insets.bottom}
            />
          )}

        </ScrollView>

        {/* Footer */}
        <View style={[styles.sheetFooter, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {validationError && <Text style={[styles.validationError, { color: colors.red }]}>{validationError}</Text>}
          <TouchableOpacity
            style={[styles.sheetSubmitBtn, { backgroundColor: colors.text }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Plus size={18} color={colors.background} />
            <Text style={[styles.sheetSubmitText, { color: colors.background }]}>{t('training.addDrill')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// DATE PICKER MODAL
// ============================================================================

function DatePickerModal({
  visible,
  onClose,
  title,
  value,
  onChange,
  minimumDate,
  colors,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn} hitSlop={8}>
              <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn} hitSlop={8}>
              <Text style={[styles.pickerDone, { color: colors.primary }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerDivider, { backgroundColor: colors.border }]} />
          <DateTimePicker
            value={value}
            mode="date"
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
// MAIN COMPONENT
// ============================================================================

export function AddDrillStep({ drills, onAddDrill, onRemoveDrill, onMoveDrill }: AddDrillStepProps) {
  const { t } = useTranslation();
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('training.whatWillYouTrain')}</Text>
          <Text style={[styles.headerHint, { color: colors.textMuted }]}>{t('training.addDrillsEveryoneRuns')}</Text>
        </View>
      </View>

      {/* Drills List */}
      {drills.length > 0 && (
        <View style={styles.sessionsList}>
          {drills.map((drill, index) => (
            <Animated.View
              key={drill.id}
              entering={FadeInDown.delay(index * 50)
                .duration(300)
                .springify()}
            >
              <SessionCard
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
            </Animated.View>
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
            borderStyle: drills.length === 0 ? 'solid' : 'dashed',
          },
        ]}
        onPress={handleOpenSheet}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.addBtnIcon,
            { backgroundColor: drills.length === 0 ? 'rgba(255,255,255,0.2)' : `${colors.primary}15` },
          ]}
        >
          <Plus size={16} color={drills.length === 0 ? '#fff' : colors.primary} strokeWidth={2.5} />
        </View>
        <Text style={[styles.addBtnText, { color: drills.length === 0 ? '#fff' : colors.text }]}>
          {drills.length === 0 ? t('training.addFirstDrill') : t('training.addAnotherDrill')}
        </Text>
      </TouchableOpacity>

      {/* Empty hint */}
      {drills.length === 0 && (
        <View style={[styles.emptyHint, { backgroundColor: `${colors.textMuted}08` }]}>
          <View style={[styles.emptyHintIcon, { backgroundColor: colors.card }]}>
            <Target size={20} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>{t('training.addAtLeastOneDrill')}</Text>
          <Text style={[styles.emptyHintSubtext, { color: colors.textMuted }]}>
            {t('training.drillsDefineWhatTeamPractices')}
          </Text>
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
    alignItems: 'flex-start',
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

  // Drill cards
  sessionsList: {
    gap: 10,
  },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  sessionNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  addBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Empty state
  emptyHint: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  emptyHintIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyHintText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHintSubtext: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
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
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
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

  // Form elements
  formSection: {
    gap: 8,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  formRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },

  // Segmented control (goal)
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Inline segmented control (mode, flexibility)
  inlineSegment: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  inlineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  inlineOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Name input
  nameInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  // Mini stepper (targets, repetitions)
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniStepperBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  miniStepperValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  noticeContent: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  noticeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Date range
  dateRangeSection: {
    gap: 8,
  },
  dateRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateRangeHint: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  dateBtnValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateSeparator: {
    fontSize: 16,
  },

  // Date picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerHandle: {
    width: 36,
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
    paddingVertical: 10,
  },
  pickerHeaderBtn: {
    minWidth: 60,
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
    textAlign: 'right',
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  picker: {
    height: 200,
  },
});

export default AddDrillStep;
