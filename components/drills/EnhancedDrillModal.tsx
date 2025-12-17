/**
 * Enhanced Drill Modal
 * Type-first drill creation using drill packages
 *
 * 4 Drill Types: zeroing, grouping, timed, qualification
 */
import { useColors } from '@/hooks/ui/useColors';
import { DRILL_TYPES, type DrillTypeId } from '@/types/drillTypes';
import type { CreateTrainingDrillInput, DrillGoal, TargetType } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ArrowRight, Check, Award, Clock, Crosshair, Target } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Map drill types to icons
const DRILL_TYPE_ICONS: Record<DrillTypeId, typeof Crosshair> = {
  zeroing: Crosshair,
  grouping: Target,
  timed: Clock,
  qualification: Award,
};

// ============================================================================
// TYPES
// ============================================================================
type Step = 1 | 2 | 3;

interface EnhancedDrillModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (drill: CreateTrainingDrillInput & { id?: string }) => void;
  initialData?: Partial<CreateTrainingDrillInput> & { id?: string; drillType?: DrillTypeId };
  mode?: 'add' | 'edit';
}

// ============================================================================
// STEP INDICATOR
// ============================================================================
function StepIndicator({ current, total, colors, accentColor }: { current: number; total: number; colors: ReturnType<typeof useColors>; accentColor: string }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <View key={step} style={styles.stepDotContainer}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: step <= current ? accentColor : colors.border,
                width: step === current ? 16 : 6,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function EnhancedDrillModal({
  visible,
  onClose,
  onSave,
  initialData,
  mode = 'add',
}: EnhancedDrillModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Form state
  const [drillType, setDrillType] = useState<DrillTypeId>(initialData?.drillType || 'grouping');
  const [name, setName] = useState(initialData?.name || '');
  const [distance, setDistance] = useState(String(initialData?.distance_m || 25));
  const [shots, setShots] = useState(String(initialData?.rounds_per_shooter || 5));
  const [stringsCount, setStringsCount] = useState(String(initialData?.strings_count || 1));
  const [targetCount, setTargetCount] = useState(String(initialData?.target_count || 1));
  const [timeLimit, setTimeLimit] = useState(initialData?.time_limit_seconds ? String(initialData.time_limit_seconds) : '');
  const [parTime, setParTime] = useState(initialData?.par_time_seconds ? String(initialData.par_time_seconds) : '');
  const [minScore, setMinScore] = useState('80');

  // Get current drill type definition
  const currentType = DRILL_TYPES[drillType];
  const accentColor = currentType.color;

  // Reset on open
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setDrillType(initialData.drillType || 'grouping');
        setName(initialData.name || '');
        setDistance(String(initialData.distance_m || currentType.paramDefaults.distance || 25));
        setShots(String(initialData.rounds_per_shooter || currentType.paramDefaults.shots || 5));
        setStringsCount(String(initialData.strings_count || currentType.paramDefaults.strings || 1));
        setTargetCount(String(initialData.target_count || currentType.paramDefaults.targetCount || 1));
        setTimeLimit(initialData.time_limit_seconds ? String(initialData.time_limit_seconds) : '');
        setParTime(initialData.par_time_seconds ? String(initialData.par_time_seconds) : '');
        setMinScore(initialData.min_accuracy_percent ? String(initialData.min_accuracy_percent) : '80');
        setStep(1);
      } else {
        setDrillType('grouping');
        setName('');
        setDistance('25');
        setShots('5');
        setStringsCount('1');
        setTargetCount('1');
        setTimeLimit('');
        setParTime('');
        setMinScore('80');
        setStep(1);
      }
    }
  }, [visible, initialData]);

  // Update defaults when drill type changes
  useEffect(() => {
    const type = DRILL_TYPES[drillType];
    setDistance(String(type.paramDefaults.distance || 25));
    setShots(String(type.paramDefaults.shots || 5));
    setStringsCount(String(type.paramDefaults.strings || 1));
    setTargetCount(String(type.paramDefaults.targetCount || 1));
    if (type.paramDefaults.parTime) setParTime(String(type.paramDefaults.parTime));
    else setParTime('');
    if (type.paramDefaults.timeLimit) setTimeLimit(String(type.paramDefaults.timeLimit));
    else setTimeLimit('');
  }, [drillType]);

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Type is always selected
      case 2: return parseInt(distance) > 0 && parseInt(shots) > 0;
      case 3: return name.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      onClose();
    }
  };

  // Map drill type to workspace types
  const getDrillGoal = (): DrillGoal => {
    if (drillType === 'zeroing' || drillType === 'grouping') return 'grouping';
    return 'achievement';
  };

  const getTargetType = (): TargetType => {
    if (drillType === 'zeroing' || drillType === 'grouping') return 'paper';
    return 'tactical';
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const drill: CreateTrainingDrillInput & { id?: string } = {
      id: initialData?.id || Date.now().toString(),
      name: name.trim(),
      drill_goal: getDrillGoal(),
      target_type: getTargetType(),
      distance_m: parseInt(distance, 10) || 25,
      rounds_per_shooter: parseInt(shots, 10) || 5,
      strings_count: Math.max(1, parseInt(stringsCount, 10) || 1),
      target_count: drillType === 'timed' ? Math.max(1, parseInt(targetCount, 10) || 1) : 1,
      time_limit_seconds: timeLimit ? parseInt(timeLimit, 10) : undefined,
      par_time_seconds: parTime ? parseInt(parTime, 10) : undefined,
      min_accuracy_percent: drillType === 'qualification' && minScore ? parseInt(minScore, 10) : undefined,
    };

    onSave(drill);
    onClose();
  };

  // ============================================================================
  // STEP 1: Choose Drill Type
  // ============================================================================
  const renderStep1 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Drill Type</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Select the type of drill</Text>

      <ScrollView style={styles.typeScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.typeCards}>
          {(Object.keys(DRILL_TYPES) as DrillTypeId[]).map((typeId) => {
            const type = DRILL_TYPES[typeId];
            const Icon = DRILL_TYPE_ICONS[typeId];
            const isSelected = drillType === typeId;

            return (
              <TouchableOpacity
                key={typeId}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: isSelected ? type.color + '15' : colors.card,
                    borderColor: isSelected ? type.color : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setDrillType(typeId);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.typeCardIcon, { backgroundColor: type.color + '20' }]}>
                  <Icon size={24} color={type.color} />
                </View>
                <View style={styles.typeCardContent}>
                  <Text style={[styles.typeCardTitle, { color: isSelected ? type.color : colors.text }]}>
                    {type.name}
                  </Text>
                  <Text style={[styles.typeCardDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {type.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.typeCardCheck, { backgroundColor: type.color }]}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ============================================================================
  // STEP 2: Configuration (type-specific)
  // ============================================================================
  const renderStep2 = () => {
    const distanceOptions = currentType.paramConstraints.distance?.options as number[] || [25, 50, 100];
    const shotsOptions = currentType.paramConstraints.shots?.options as number[] || [3, 5, 10];

    return (
      <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Configuration</Text>
        <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
          Set up your {currentType.name.toLowerCase()} drill
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Distance */}
          <View style={styles.paramSection}>
            <Text style={[styles.paramLabel, { color: colors.text }]}>Distance</Text>
            <View style={styles.paramGrid}>
              {distanceOptions.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.paramBtn,
                    {
                      backgroundColor: parseInt(distance) === d ? accentColor : colors.card,
                      borderColor: parseInt(distance) === d ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDistance(String(d));
                  }}
                >
                  <Text style={[styles.paramBtnValue, { color: parseInt(distance) === d ? '#fff' : colors.text }]}>
                    {d}
                  </Text>
                  <Text style={[styles.paramBtnUnit, { color: parseInt(distance) === d ? '#ffffffcc' : colors.textMuted }]}>
                    m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Shots */}
          <View style={styles.paramSection}>
            <Text style={[styles.paramLabel, { color: colors.text }]}>Shots</Text>
            <View style={styles.paramGrid}>
              {shotsOptions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.paramBtn,
                    {
                      backgroundColor: parseInt(shots) === s ? accentColor : colors.card,
                      borderColor: parseInt(shots) === s ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShots(String(s));
                  }}
                >
                  <Text style={[styles.paramBtnValue, { color: parseInt(shots) === s ? '#fff' : colors.text }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Strings/Rounds */}
          <View style={styles.paramSection}>
            <Text style={[styles.paramLabel, { color: colors.text }]}>Rounds</Text>
            <View style={styles.paramGrid}>
              {[1, 2, 3, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.paramBtn,
                    {
                      backgroundColor: parseInt(stringsCount) === n ? accentColor : colors.card,
                      borderColor: parseInt(stringsCount) === n ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setStringsCount(String(n));
                  }}
                >
                  <Text style={[styles.paramBtnValue, { color: parseInt(stringsCount) === n ? '#fff' : colors.text }]}>
                    {n}
                  </Text>
                  <Text style={[styles.paramBtnUnit, { color: parseInt(stringsCount) === n ? '#ffffffcc' : colors.textMuted }]}>
                    x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Targets (timed drills only) */}
          {drillType === 'timed' && (
            <View style={styles.paramSection}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Targets</Text>
              <View style={styles.paramGrid}>
                {[1, 2, 3, 4, 6].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.paramBtn,
                      {
                        backgroundColor: parseInt(targetCount) === n ? accentColor : colors.card,
                        borderColor: parseInt(targetCount) === n ? accentColor : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTargetCount(String(n));
                    }}
                  >
                    <Text style={[styles.paramBtnValue, { color: parseInt(targetCount) === n ? '#fff' : colors.text }]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Par Time (timed drills) */}
          {drillType === 'timed' && (
            <View style={styles.paramSection}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Par Time (optional)</Text>
              <View style={styles.paramGrid}>
                {[2, 3, 5, 10, 15].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.paramBtn,
                      {
                        backgroundColor: parTime === String(t) ? accentColor : colors.card,
                        borderColor: parTime === String(t) ? accentColor : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setParTime(parTime === String(t) ? '' : String(t));
                    }}
                  >
                    <Text style={[styles.paramBtnValue, { color: parTime === String(t) ? '#fff' : colors.text }]}>
                      {t}
                    </Text>
                    <Text style={[styles.paramBtnUnit, { color: parTime === String(t) ? '#ffffffcc' : colors.textMuted }]}>
                      s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Time Limit (qualification) */}
          {drillType === 'qualification' && (
            <View style={styles.paramSection}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Time Limit (optional)</Text>
              <View style={styles.paramGrid}>
                {[60, 120, 300, 600].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.paramBtn,
                      {
                        backgroundColor: timeLimit === String(t) ? accentColor : colors.card,
                        borderColor: timeLimit === String(t) ? accentColor : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTimeLimit(timeLimit === String(t) ? '' : String(t));
                    }}
                  >
                    <Text style={[styles.paramBtnValue, { color: timeLimit === String(t) ? '#fff' : colors.text }]}>
                      {t >= 60 ? `${t / 60}` : t}
                    </Text>
                    <Text style={[styles.paramBtnUnit, { color: timeLimit === String(t) ? '#ffffffcc' : colors.textMuted }]}>
                      {t >= 60 ? 'min' : 's'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Min Score (qualification) */}
          {drillType === 'qualification' && (
            <View style={styles.paramSection}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Pass Score</Text>
              <View style={styles.paramGrid}>
                {[70, 80, 85, 90].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.paramBtn,
                      {
                        backgroundColor: parseInt(minScore) === s ? accentColor : colors.card,
                        borderColor: parseInt(minScore) === s ? accentColor : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMinScore(String(s));
                    }}
                  >
                    <Text style={[styles.paramBtnValue, { color: parseInt(minScore) === s ? '#fff' : colors.text }]}>
                      {s}
                    </Text>
                    <Text style={[styles.paramBtnUnit, { color: parseInt(minScore) === s ? '#ffffffcc' : colors.textMuted }]}>
                      %
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  // ============================================================================
  // STEP 3: Name & Save
  // ============================================================================
  const renderStep3 = () => {
    const Icon = DRILL_TYPE_ICONS[drillType];

    return (
      <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Name Your Drill</Text>
        <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Give it a memorable name</Text>

        <TextInput
          style={[styles.nameInput, { backgroundColor: colors.card, borderColor: name.trim() ? accentColor : colors.border, color: colors.text }]}
          placeholder={`e.g., ${currentType.name} Practice`}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Type</Text>
            <View style={styles.summaryTypeValue}>
              <Icon size={14} color={accentColor} />
              <Text style={[styles.summaryValue, { color: accentColor }]}>{currentType.name}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Distance</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{distance}m</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Shots</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{shots}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Rounds</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{stringsCount}x</Text>
          </View>

          {drillType === 'timed' && parseInt(targetCount) > 1 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Targets</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{targetCount}</Text>
            </View>
          )}

          {parTime && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Par time</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{parTime}s</Text>
            </View>
          )}

          {timeLimit && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Time limit</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{parseInt(timeLimit) >= 60 ? `${parseInt(timeLimit) / 60}min` : `${timeLimit}s`}</Text>
            </View>
          )}

          {drillType === 'qualification' && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pass score</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{minScore}%</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {mode === 'edit' ? 'Edit Drill' : 'New Drill'}
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <StepIndicator current={step} total={3} colors={colors} accentColor={accentColor} />

        {/* Content */}
        <View style={styles.body}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            onPress={handleBack}
          >
            <ArrowLeft size={18} color={colors.text} />
            <Text style={[styles.backBtnText, { color: colors.text }]}>
              {step === 1 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: canProceed() ? accentColor : colors.border },
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={[styles.nextBtnText, { color: canProceed() ? '#fff' : colors.textMuted }]}>
              {step === 3 ? 'Save Drill' : 'Next'}
            </Text>
            {step < 3 ? (
              <ArrowRight size={18} color={canProceed() ? '#fff' : colors.textMuted} />
            ) : (
              <Check size={18} color={canProceed() ? '#fff' : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// COMPACT STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
  },
  closeBtnText: {
    fontSize: 14,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  stepDotContainer: {
    alignItems: 'center',
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },

  // Type Selection
  typeScrollView: {
    flex: 1,
  },
  typeCards: {
    gap: 12,
    paddingBottom: 20,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    position: 'relative',
    gap: 14,
  },
  typeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardContent: {
    flex: 1,
  },
  typeCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  typeCardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  typeCardCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Params (Compact)
  paramSection: {
    marginBottom: 20,
  },
  paramLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paramBtn: {
    width: (SCREEN_WIDTH - 40 - 20) / 3, // tighter width
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  paramBtnValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  paramBtnUnit: {
    fontSize: 11,
    marginTop: 0,
  },

  // Method (Compact)
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  methodEmoji: {
    fontSize: 18,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Optional (Compact)
  optionalField: {
    marginBottom: 20,
  },
  defaultsToggle: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  defaultsToggleText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  defaultsToggleHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionalInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionalHints: {
    flexDirection: 'row',
    gap: 8,
  },
  hintChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hintChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skipHint: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  skipHintText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Name (Compact)
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 24,
  },

  // Summary (Compact)
  summary: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTypeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Footer (Compact)
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
