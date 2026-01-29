import { PAPER_TYPE } from '@/constants/drill';
import { addTargetWithPaperResult, addTargetWithTacticalResult } from '@/services/sessionService';
import { BUTTON_GRADIENT, BUTTON_GRADIENT_DISABLED } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, Crosshair, Minus, Plus, Ruler, Target, Timer } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════
const getDistanceCategories = (t: (key: string) => string) => [
  { label: t('target.distanceCategory.close'), range: '5-15m', distances: [5, 7, 10, 15] },
  { label: t('target.distanceCategory.medium'), range: '25-50m', distances: [25, 35, 50] },
  { label: t('target.distanceCategory.long'), range: '100m+', distances: [100, 200, 300] },
];

// ═══════════════════════════════════════════════════════════════════════════
// STEPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  disabled?: boolean;
}

const Stepper = React.memo(function Stepper({
  value,
  onChange,
  min = 1,
  max = 100,
  label,
  unit,
  disabled = false,
}: StepperProps) {
  const handleDecrement = useCallback(() => {
    if (disabled) return;
    if (value > min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [disabled, value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  }, [disabled, value, max, onChange]);

  return (
    <View style={stepperStyles.container}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.row}>
        <TouchableOpacity
          style={[stepperStyles.btn, (disabled || value <= min) && stepperStyles.btnDisabled]}
          onPress={handleDecrement}
          disabled={disabled || value <= min}
          activeOpacity={0.7}
        >
          <Minus size={24} color={value <= min ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>

        <View style={stepperStyles.valueContainer}>
          <Text style={stepperStyles.value}>{value}</Text>
          {unit && <Text style={stepperStyles.unit}>{unit}</Text>}
        </View>

        <TouchableOpacity
          style={[stepperStyles.btn, (disabled || value >= max) && stepperStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={disabled || value >= max}
          activeOpacity={0.7}
        >
          <Plus size={24} color={value >= max ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Quick select */}
      <View style={stepperStyles.quickRow}>
        {[5, 10, 20, 30].map((num) => (
          <TouchableOpacity
            key={num}
            style={[stepperStyles.quickBtn, value === num && stepperStyles.quickBtnActive]}
            onPress={() => {
              if (disabled) return;
              Haptics.selectionAsync();
              onChange(num);
            }}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={[stepperStyles.quickText, value === num && stepperStyles.quickTextActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const stepperStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  btnDisabled: { opacity: 0.4 },
  valueContainer: { alignItems: 'center', minWidth: 80 },
  value: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 14, color: COLORS.textMuted, marginTop: -4 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
  },
  quickBtnActive: { backgroundColor: `${COLORS.primary}30` },
  quickText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  quickTextActive: { color: COLORS.primary },
});

// ═══════════════════════════════════════════════════════════════════════════
// HITS STEPPER (CIRCULAR) - Simple hits-only mode
// ═══════════════════════════════════════════════════════════════════════════
interface HitsStepperProps {
  value: number;
  onChange: (value: number) => void;
  bulletsFired: number;
}

const HitsStepper = React.memo(function HitsStepper({ value, onChange, bulletsFired }: HitsStepperProps) {
  const { t } = useTranslation();
  const handleDecrement = useCallback(() => {
    if (value > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [value, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < bulletsFired) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  }, [value, onChange, bulletsFired]);

  const accuracy = bulletsFired > 0 ? Math.round((value / bulletsFired) * 100) : 0;

  return (
    <View style={hitsStyles.container}>
      <Text style={hitsStyles.label}>{t('target.hitsOnTarget')}</Text>
      <Text style={hitsStyles.sublabel}>{t('target.outOfBulletsFired', { count: bulletsFired })}</Text>

      <View style={hitsStyles.row}>
        <TouchableOpacity
          style={[hitsStyles.btn, value <= 0 && hitsStyles.btnDisabled]}
          onPress={handleDecrement}
          disabled={value <= 0}
          activeOpacity={0.7}
        >
          <Minus size={28} color={value <= 0 ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={hitsStyles.valueContainer}>
          <View style={[hitsStyles.valueRing, value > 0 && hitsStyles.valueRingGood]}>
            <Text style={hitsStyles.value}>{value}</Text>
            <Text style={hitsStyles.maxLabel}>/ {bulletsFired}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[hitsStyles.btn, value >= bulletsFired && hitsStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={value >= bulletsFired}
          activeOpacity={0.7}
        >
          <Plus size={28} color={value >= bulletsFired ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Accuracy display */}
      <Text style={hitsStyles.accuracyText}>{t('target.accuracyPercent', { percent: accuracy })}</Text>

      {/* Quick select - only show values up to bulletsFired */}
      <View style={hitsStyles.quickRow}>
        {[0, Math.floor(bulletsFired / 4), Math.floor(bulletsFired / 2), Math.floor(bulletsFired * 0.75), bulletsFired]
          .filter((num, idx, arr) => arr.indexOf(num) === idx && num <= bulletsFired) // unique values
          .map((num) => (
            <TouchableOpacity
              key={num}
              style={[hitsStyles.quickBtn, value === num && hitsStyles.quickBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(num);
              }}
            >
              <Text style={[hitsStyles.quickText, value === num && hitsStyles.quickTextActive]}>{num}</Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
});

const hitsStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sublabel: { fontSize: 13, color: COLORS.textDim, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  btnDisabled: { opacity: 0.4 },
  valueContainer: { alignItems: 'center' },
  valueRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRingGood: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  value: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  maxLabel: { fontSize: 13, color: COLORS.textDim, marginTop: -2 },
  accuracyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 12,
    marginBottom: 4,
  },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  quickBtnActive: { backgroundColor: `${COLORS.primary}25` },
  quickText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  quickTextActive: { color: COLORS.primary },
});

// ═══════════════════════════════════════════════════════════════════════════
// TACTICAL TARGET FLOW
// Standalone component for logging tactical targets
// ═══════════════════════════════════════════════════════════════════════════

type FlowStep = 'setup' | 'results';

interface TacticalTargetFlowProps {
  sessionId: string;
  defaultDistance?: number;
  defaultBullets?: number;
  lockDistance?: boolean;
  lockBullets?: boolean;
  /** When true, shows group size (cm) input instead of hits counter */
  isGrouping?: boolean;
  showTimeInput?: boolean;
  /** For squad sessions: associates target with specific participant */
  participantId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TacticalTargetFlow({
  sessionId,
  defaultDistance = 25,
  defaultBullets = 10,
  lockDistance = false,
  lockBullets = false,
  isGrouping = false,
  showTimeInput = true,
  participantId,
  onComplete,
  onCancel,
}: TacticalTargetFlowProps) {
  const { t } = useTranslation();
  const distanceCategories = getDistanceCategories(t);
  // ALWAYS skip setup step - go directly to results
  // - Grouping: enter group size (cm) + shots count
  // - Engagement: enter hits count
  // Distance and bullets come from drill config or defaults
  const [step, setStep] = useState<FlowStep>('results');
  const [saving, setSaving] = useState(false);

  // Setup state
  const [distance, setDistance] = useState(defaultDistance);
  const [bullets, setBullets] = useState(defaultBullets);

  // Results state
  const [hits, setHits] = useState(0);
  const [groupSizeCm, setGroupSizeCm] = useState(''); // For grouping mode
  const [groupingShots, setGroupingShots] = useState(0); // Shots in the group (required)
  const [time, setTime] = useState('');
  const [stageCleared, setStageCleared] = useState(false);
  const [notes, setNotes] = useState('');

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }, [onCancel]);

  const handleContinue = useCallback(() => {
    if (distance <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('target.invalidDistanceTitle'), t('target.invalidDistanceMessage'));
      return;
    }
    if (bullets <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('target.invalidBulletsTitle'), t('target.invalidBulletsMessage'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('results');
  }, [distance, bullets, t]);

  const handleSave = useCallback(async () => {
    if (!sessionId) {
      Alert.alert(t('common.error'), t('target.sessionIdMissing'));
      return;
    }

    // Note: hits can be 0 (completely missed) - that's a valid result

    if (isGrouping && !groupSizeCm) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('target.missingGroupSizeTitle'), t('target.missingGroupSizeMessage'));
      return;
    }

    if (isGrouping && groupingShots < 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('target.missingShotsTitle'), t('target.missingShotsMessage'));
      return;
    }

    setSaving(true);

    try {
      if (isGrouping) {
        // For grouping: Use paper target with dispersion
        // groupingShots = how many shots are in the group (entered manually)
        await addTargetWithPaperResult({
          session_id: sessionId,
          distance_m: distance,
          lane_number: null,
          planned_shots: groupingShots,
          participant_id: participantId, // For squad sessions
          paper_type: PAPER_TYPE.GROUPING,
          bullets_fired: groupingShots,
          dispersion_cm: parseFloat(groupSizeCm),
          result_notes: notes || null,
        });
      } else {
        // For engagement: Use tactical target
        // bullets_fired = how many shots fired (from drill config)
        // hits = how many actually hit the target
        await addTargetWithTacticalResult({
          session_id: sessionId,
          distance_m: distance,
          lane_number: null,
          planned_shots: bullets, // From drill config
          participant_id: participantId, // For squad sessions
          bullets_fired: bullets, // How many were actually fired
          hits: hits, // How many hit
          is_stage_cleared: stageCleared,
          time_seconds: time ? parseFloat(time) : null,
          result_notes: notes || null,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onComplete) {
        onComplete();
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error('Failed to add target:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), error.message || t('target.failedToAddTarget'));
      setSaving(false);
    }
  }, [
    sessionId,
    distance,
    bullets,
    hits,
    groupSizeCm,
    groupingShots,
    isGrouping,
    time,
    stageCleared,
    notes,
    onComplete,
    t,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP STEP
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 'setup') {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              {isGrouping ? (
                <Target size={24} color={COLORS.primary} />
              ) : (
                <Crosshair size={24} color={COLORS.primary} />
              )}
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {isGrouping ? t('target.groupingTarget') : t('target.tactical')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isGrouping ? t('target.manualGroupSizeEntry') : t('target.manualHitLogging')}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Distance Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('session.distance')}</Text>
          {distanceCategories.map((category) => (
            <View key={category.label} style={styles.distanceCategory}>
              <View style={styles.distanceCategoryHeader}>
                <Text style={styles.distanceCategoryLabel}>{category.label}</Text>
                <Text style={styles.distanceCategoryRange}>{category.range}</Text>
              </View>
              <View style={styles.distanceChipsRow}>
                {category.distances.map((dist) => (
                  <TouchableOpacity
                    key={dist}
                    style={[styles.distanceChip, distance === dist && styles.distanceChipSelected]}
                    onPress={() => {
                      if (lockDistance) return;
                      Haptics.selectionAsync();
                      setDistance(dist);
                    }}
                    disabled={lockDistance}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.distanceChipText, distance === dist && styles.distanceChipTextSelected]}>
                      {dist}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Bullets Stepper */}
        <View style={styles.section}>
          <Stepper
            label={isGrouping ? t('target.shotsInGroup') : t('target.bulletsToFire')}
            value={bullets}
            onChange={lockBullets ? () => {} : setBullets}
            min={lockBullets ? bullets : 1}
            max={lockBullets ? bullets : 100}
            unit={t('target.bulletsUnit')}
            disabled={lockBullets}
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleContinue} activeOpacity={0.9}>
          <LinearGradient
            colors={[...BUTTON_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            <Text style={styles.submitBtnText}>{t('target.enterResults')}</Text>
            <ChevronRight size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS STEP
  // ═══════════════════════════════════════════════════════════════════════════
  // Never show back button - we always skip the setup step
  const canGoBack = false;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => setStep('setup')} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('target.logResults')}</Text>
          <View style={styles.headerMeta}>
            {isGrouping ? <Target size={14} color={COLORS.primary} /> : <Crosshair size={14} color={COLORS.primary} />}
            <Text style={styles.headerSubtitle}>
              {isGrouping ? t('target.groupingMeta', { distance }) : t('target.engagementMeta', { distance, shots: bullets })}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Hits Stepper OR Group Size Input */}
      {isGrouping ? (
        // GROUPING: Show group size input
        <View style={styles.groupingSection}>
          <View style={styles.groupingHeader}>
            <View style={styles.groupingIconContainer}>
              <Ruler size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.groupingTitle}>{t('target.groupSize')}</Text>
            <Text style={styles.groupingSublabel}>{t('target.measureShotDispersion')}</Text>
          </View>

          <View style={styles.groupingInputRow}>
            <TextInput
              style={styles.groupingInput}
              value={groupSizeCm}
              onChangeText={setGroupSizeCm}
              placeholder="0.0"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <View style={styles.groupingUnitBox}>
              <Text style={styles.groupingUnit}>cm</Text>
            </View>
          </View>

          <View style={styles.groupingQuickRow}>
            {[1, 2, 3, 5, 10].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.groupingQuickBtn, groupSizeCm === String(val) && styles.groupingQuickBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGroupSizeCm(String(val));
                }}
              >
                <Text style={[styles.groupingQuickText, groupSizeCm === String(val) && styles.groupingQuickTextActive]}>
                  {val}cm
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Total Shots in Group (Required) */}
          <View style={styles.groupingShotsSection}>
            <Text style={styles.groupingShotsLabel}>
              {t('target.totalShots')} <Text style={{ color: COLORS.danger }}>*</Text>
            </Text>
            <View style={styles.groupingShotsRow}>
              <TouchableOpacity
                style={[styles.groupingShotsBtn, groupingShots <= 2 && styles.groupingBtnDisabled]}
                onPress={() => {
                  if (groupingShots > 2) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGroupingShots(groupingShots - 1);
                  }
                }}
                disabled={groupingShots <= 2}
              >
                <Minus size={20} color={groupingShots <= 2 ? COLORS.textDim : COLORS.white} />
              </TouchableOpacity>
              <Text style={[styles.groupingShotsValue, groupingShots < 2 && { color: COLORS.textDim }]}>
                {groupingShots < 2 ? '—' : groupingShots}
              </Text>
              <TouchableOpacity
                style={styles.groupingShotsBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Jump to 2 if below minimum
                  setGroupingShots(groupingShots < 2 ? 2 : groupingShots + 1);
                }}
              >
                <Plus size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.groupingShotsQuickRow}>
              {[2, 3, 5, 10].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.groupingShotsQuickBtn, groupingShots === val && styles.groupingShotsQuickBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGroupingShots(val);
                  }}
                >
                  <Text
                    style={[
                      styles.groupingShotsQuickText,
                      groupingShots === val && styles.groupingShotsQuickTextActive,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        // ENGAGEMENT: Show simple hits stepper
        <View style={styles.hitsSection}>
          <HitsStepper value={hits} onChange={setHits} bulletsFired={bullets} />
        </View>
      )}

      {/* Time Input - only for engagement */}
      {!isGrouping && showTimeInput && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Timer size={18} color={COLORS.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{t('target.engagementTime')}</Text>
              <Text style={styles.cardHint}>{time ? `${time}s` : t('target.optionalHowFast')}</Text>
            </View>
          </View>

          {/* Time chips */}
          <View style={styles.timeChipsContainer}>
            <TouchableOpacity
              style={[styles.timeChip, !time && styles.timeChipSelected]}
              onPress={() => {
                Haptics.selectionAsync();
                setTime('');
              }}
            >
              <Text style={[styles.timeChipText, !time && styles.timeChipTextSelected]}>{t('common.skip')}</Text>
            </TouchableOpacity>
            {[3, 5, 10, 15, 20, 30].map((seconds) => {
              const isSelected = time === String(seconds);
              return (
                <TouchableOpacity
                  key={seconds}
                  style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTime(String(seconds));
                  }}
                >
                  <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>{seconds}s</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom input */}
          <View style={styles.timeCustomRow}>
            <Text style={styles.timeCustomLabel}>{t('common.custom')}:</Text>
            <TextInput
              style={styles.timeCustomInput}
              value={time}
              onChangeText={setTime}
              placeholder="0.0"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.timeCustomUnit}>sec</Text>
          </View>
        </View>
      )}

      {/* Stage Cleared Toggle - only for engagement */}
      {!isGrouping && (
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <View style={[styles.cardIconBox, stageCleared && styles.cardIconBoxActive]}>
              <Check size={18} color={stageCleared ? '#000' : COLORS.textMuted} />
            </View>
            <View>
              <Text style={styles.toggleTitle}>{t('target.stageCleared')}</Text>
              <Text style={styles.toggleHint}>{t('target.stageClearedHint')}</Text>
            </View>
          </View>
          <Switch
            value={stageCleared}
            onValueChange={(val) => {
              Haptics.selectionAsync();
              setStageCleared(val);
            }}
            trackColor={{ false: COLORS.borderLight, true: `${COLORS.primary}50` }}
            thumbColor={stageCleared ? COLORS.primary : '#6B7280'}
          />
        </View>
      )}

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>
          {t('common.notes')} <Text style={styles.optionalLabel}>({t('common.optional')})</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={isGrouping ? t('target.groupNotesPlaceholder') : t('target.engagementNotesPlaceholder')}
          placeholderTextColor={COLORS.textDim}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSave} activeOpacity={0.9} disabled={saving}>
        <LinearGradient
          colors={saving ? [...BUTTON_GRADIENT_DISABLED] : [...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnGradient}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Target size={20} color="#fff" />
              <Text style={styles.submitBtnText}>{t('target.saveTarget')}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {canGoBack && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setStep('setup')}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={styles.cancelBtnText}>{t('target.backToSetup')}</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: COLORS.textMuted },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Distance
  distanceCategory: { marginBottom: 16 },
  distanceCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distanceCategoryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  distanceCategoryRange: { fontSize: 11, color: COLORS.textDim },
  distanceChipsRow: { flexDirection: 'row', gap: 8 },
  distanceChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  distanceChipSelected: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  distanceChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  distanceChipTextSelected: { color: COLORS.white },

  // Hits Section
  hitsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBoxActive: { backgroundColor: COLORS.primary },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  cardHint: { fontSize: 12, color: COLORS.textDim, marginTop: 1 },

  // Time Input with Chips
  timeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardHover,
  },
  timeChipSelected: {
    backgroundColor: `${COLORS.primary}25`,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  timeChipTextSelected: {
    color: COLORS.primary,
  },
  timeCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardHover,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  timeCustomLabel: {
    fontSize: 13,
    color: COLORS.textDim,
    marginRight: 8,
  },
  timeCustomInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  timeCustomUnit: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 4,
  },

  // Toggle
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  toggleHint: { fontSize: 12, color: COLORS.textDim, marginTop: 1 },

  // Notes
  notesSection: { marginBottom: 24 },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  optionalLabel: {
    fontWeight: '400',
    color: COLORS.textDim,
    textTransform: 'none',
    letterSpacing: 0,
  },
  notesInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: COLORS.white,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Grouping Section
  groupingSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  groupingHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  groupingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  groupingSublabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  groupingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  groupingInput: {
    width: 120,
    height: 64,
    backgroundColor: COLORS.cardHover,
    borderRadius: 16,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  groupingUnitBox: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardHover,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupingUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  groupingQuickRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  groupingQuickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.cardHover,
  },
  groupingQuickBtnActive: {
    backgroundColor: `${COLORS.primary}25`,
  },
  groupingQuickText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  groupingQuickTextActive: {
    color: COLORS.primary,
  },

  // Grouping shots stepper
  groupingShotsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  groupingShotsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groupingShotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  groupingShotsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupingBtnDisabled: {
    opacity: 0.4,
  },
  groupingShotsValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
    minWidth: 60,
    textAlign: 'center',
  },
  groupingShotsQuickRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  groupingShotsQuickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.cardHover,
  },
  groupingShotsQuickBtnActive: {
    backgroundColor: `${COLORS.primary}25`,
  },
  groupingShotsQuickText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  groupingShotsQuickTextActive: {
    color: COLORS.primary,
  },

  // Buttons
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    gap: 10,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
});

export default TacticalTargetFlow;
