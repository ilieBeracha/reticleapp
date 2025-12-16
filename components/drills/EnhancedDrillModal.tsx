/**
 * Enhanced Drill Modal
 * Compact, elegant stepper-based drill creation
 */
import { useColors } from '@/hooks/ui/useColors';
import type {
  CreateTrainingDrillInput,
  DrillGoal,
  ScoringMode,
  TargetType,
} from '@/types/workspace';
import { INFINITE_SHOTS_SENTINEL, isInfiniteShots } from '@/utils/drillShots';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================
type Step = 1 | 2 | 3 | 4;

interface EnhancedDrillModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (drill: CreateTrainingDrillInput & { id?: string }) => void;
  initialData?: Partial<CreateTrainingDrillInput> & { id?: string };
  mode?: 'add' | 'edit';
}

// ============================================================================
// STEP INDICATOR
// ============================================================================
function StepIndicator({ current, total, colors }: { current: number; total: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <View key={step} style={styles.stepDotContainer}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: step <= current ? '#93C5FD' : colors.border,
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
  const [drillGoal, setDrillGoal] = useState<DrillGoal>(initialData?.drill_goal || 'grouping');
  const [targetType, setTargetType] = useState<TargetType>(initialData?.target_type || 'paper');
  const [name, setName] = useState(initialData?.name || '');
  // Session defaults (kept for DB compatibility, but not required to configure here)
  const [distance, setDistance] = useState(String(initialData?.distance_m || 25));
  const [rounds, setRounds] = useState(String(initialData?.rounds_per_shooter || 5));
  const [shotsPolicy, setShotsPolicy] = useState<'fixed' | 'flexible'>(
    initialData?.rounds_per_shooter != null && isInfiniteShots(initialData.rounds_per_shooter) ? 'flexible' : 'fixed'
  );
  const [showDefaults, setShowDefaults] = useState(false);
  const [stringsCount, setStringsCount] = useState(String(initialData?.strings_count || 1));
  const [targetCount, setTargetCount] = useState(String(initialData?.target_count || 1));
  const [timeLimit, setTimeLimit] = useState(initialData?.time_limit_seconds ? String(initialData.time_limit_seconds) : '');
  const [parTime, setParTime] = useState(initialData?.par_time_seconds ? String(initialData.par_time_seconds) : '');
  const [minAccuracy, setMinAccuracy] = useState(initialData?.min_accuracy_percent ? String(initialData.min_accuracy_percent) : '');
  const [scoringMode, setScoringMode] = useState<ScoringMode | ''>((initialData?.scoring_mode as ScoringMode) || '');
  const [pointsPerHit, setPointsPerHit] = useState(
    initialData?.points_per_hit != null ? String(initialData.points_per_hit) : ''
  );
  const [penaltyPerMiss, setPenaltyPerMiss] = useState(
    initialData?.penalty_per_miss != null ? String(initialData.penalty_per_miss) : ''
  );
  const [shotsPerTarget, setShotsPerTarget] = useState(
    initialData?.shots_per_target != null ? String(initialData.shots_per_target) : ''
  );

  // Reset on open
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setDrillGoal(initialData.drill_goal || 'grouping');
        setTargetType(initialData.target_type || 'paper');
        setName(initialData.name || '');
        setDistance(String(initialData.distance_m || 25));
        setRounds(String(initialData.rounds_per_shooter || 5));
        setShotsPolicy(
          initialData.rounds_per_shooter != null && isInfiniteShots(initialData.rounds_per_shooter) ? 'flexible' : 'fixed'
        );
        setShowDefaults(false);
        setStringsCount(String(initialData.strings_count || 1));
        setTargetCount(String(initialData.target_count || 1));
        setTimeLimit(initialData.time_limit_seconds ? String(initialData.time_limit_seconds) : '');
        setParTime(initialData.par_time_seconds ? String(initialData.par_time_seconds) : '');
        setMinAccuracy(initialData.min_accuracy_percent ? String(initialData.min_accuracy_percent) : '');
        setScoringMode((initialData.scoring_mode as ScoringMode) || '');
        setPointsPerHit(initialData.points_per_hit != null ? String(initialData.points_per_hit) : '');
        setPenaltyPerMiss(initialData.penalty_per_miss != null ? String(initialData.penalty_per_miss) : '');
        setShotsPerTarget(initialData.shots_per_target != null ? String(initialData.shots_per_target) : '');
        setStep(1);
      } else {
        setDrillGoal('grouping');
        setTargetType('paper');
        setName('');
        setDistance('25');
        setRounds('5');
        setShotsPolicy('flexible'); // default: decide shots per session
        setShowDefaults(false);
        setStringsCount('1');
        setTargetCount('1');
        setTimeLimit('');
        setParTime('');
        setMinAccuracy('');
        setScoringMode('');
        setPointsPerHit('');
        setPenaltyPerMiss('');
        setShotsPerTarget('');
        setStep(1);
      }
    }
  }, [visible, initialData]);

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Goal is always selected
      case 2: return parseInt(distance) > 0 && parseInt(rounds) > 0;
      case 3: return true; // Optional settings
      case 4: return name.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 4) {
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

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const drill: CreateTrainingDrillInput & { id?: string } = {
      id: initialData?.id || Date.now().toString(),
      name: name.trim(),
      drill_goal: drillGoal,
      target_type: drillGoal === 'grouping' ? 'paper' : targetType,
      // Stored as defaults; sessions/targets can override in practice.
      distance_m: parseInt(distance, 10) || 25,
      rounds_per_shooter:
        shotsPolicy === 'flexible'
          ? INFINITE_SHOTS_SENTINEL
          : (parseInt(rounds, 10) || 5),
      strings_count: Math.max(1, parseInt(stringsCount, 10) || 1),
      target_count: Math.max(1, parseInt(targetCount, 10) || 1),
      time_limit_seconds: timeLimit ? parseInt(timeLimit, 10) : undefined,
      par_time_seconds: parTime ? parseInt(parTime, 10) : undefined,
      min_accuracy_percent: minAccuracy ? parseInt(minAccuracy, 10) : undefined,
      scoring_mode: scoringMode || undefined,
      points_per_hit: scoringMode === 'points' && pointsPerHit ? parseInt(pointsPerHit, 10) : undefined,
      penalty_per_miss: scoringMode === 'points' && penaltyPerMiss ? parseInt(penaltyPerMiss, 10) : undefined,
      shots_per_target: shotsPerTarget ? parseInt(shotsPerTarget, 10) : undefined,
    };

    onSave(drill);
    onClose();
  };

  const goalColor = drillGoal === 'grouping' ? '#10B981' : '#93C5FD';

  // ============================================================================
  // STEP 1: Choose Goal
  // ============================================================================
  const renderStep1 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>What to measure?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Choose the goal for this drill</Text>

      <View style={styles.goalCards}>
        {/* Grouping */}
        <TouchableOpacity
          style={[
            styles.goalCard,
            {
              backgroundColor: drillGoal === 'grouping' ? '#10B98115' : colors.card,
              borderColor: drillGoal === 'grouping' ? '#10B981' : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDrillGoal('grouping');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.goalCardHeader, { borderBottomColor: drillGoal === 'grouping' ? '#10B98130' : colors.border }]}>
            <Text style={[styles.goalCardEmoji]}>🎯</Text>
            <View>
              <Text style={[styles.goalCardTitle, { color: drillGoal === 'grouping' ? '#10B981' : colors.text }]}>
                Grouping
              </Text>
              <Text style={[styles.goalCardDesc, { color: colors.textMuted }]}>How tight are my shots?</Text>
            </View>
          </View>
          
          <View style={styles.goalCardFeatures}>
            <Text style={[styles.goalCardFeature, { color: colors.textMuted }]}>• Measures dispersion</Text>
            <Text style={[styles.goalCardFeature, { color: colors.textMuted }]}>• No hit counting</Text>
          </View>
          
          {drillGoal === 'grouping' && (
            <View style={[styles.goalCardCheck, { backgroundColor: '#10B981' }]}>
              <Check size={10} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Achievement */}
        <TouchableOpacity
          style={[
            styles.goalCard,
            {
              backgroundColor: drillGoal === 'achievement' ? '#93C5FD15' : colors.card,
              borderColor: drillGoal === 'achievement' ? '#93C5FD' : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDrillGoal('achievement');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.goalCardHeader, { borderBottomColor: drillGoal === 'achievement' ? '#93C5FD30' : colors.border }]}>
            <Text style={[styles.goalCardEmoji]}>🏆</Text>
            <View>
              <Text style={[styles.goalCardTitle, { color: drillGoal === 'achievement' ? '#93C5FD' : colors.text }]}>
                Achievement
              </Text>
              <Text style={[styles.goalCardDesc, { color: colors.textMuted }]}>How many did I hit?</Text>
            </View>
          </View>

          <View style={styles.goalCardFeatures}>
            <Text style={[styles.goalCardFeature, { color: colors.textMuted }]}>• Counts hits & accuracy</Text>
            <Text style={[styles.goalCardFeature, { color: colors.textMuted }]}>• Scan or manual entry</Text>
          </View>
          
          {drillGoal === 'achievement' && (
            <View style={[styles.goalCardCheck, { backgroundColor: '#93C5FD' }]}>
              <Check size={10} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // ============================================================================
  // STEP 2: Distance & Shots
  // ============================================================================
  const renderStep2 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Structure</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
        Define what the drill is. Session settings can be adjusted each time you run it.
      </Text>

      {/* Rounds (strings) */}
      <View style={styles.paramSection}>
        <Text style={[styles.paramLabel, { color: colors.text }]}>Rounds (strings)</Text>
        <View style={styles.paramGrid}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.paramBtn,
                {
                  backgroundColor: parseInt(stringsCount) === n ? goalColor : colors.card,
                  borderColor: parseInt(stringsCount) === n ? goalColor : colors.border,
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

      {/* Targets per round */}
      <View style={styles.paramSection}>
        <Text style={[styles.paramLabel, { color: colors.text }]}>Targets per round</Text>
        <View style={styles.paramGrid}>
          {[1, 2, 3, 4].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.paramBtn,
                {
                  backgroundColor: parseInt(targetCount) === n ? goalColor : colors.card,
                  borderColor: parseInt(targetCount) === n ? goalColor : colors.border,
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
              <Text style={[styles.paramBtnUnit, { color: parseInt(targetCount) === n ? '#ffffffcc' : colors.textMuted }]}>
                tgt
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input method for achievement */}
      {drillGoal === 'achievement' && (
        <View style={styles.paramSection}>
          <Text style={[styles.paramLabel, { color: colors.text }]}>Logging Method</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[
                styles.methodBtn,
                {
                  backgroundColor: targetType === 'paper' ? '#93C5FD15' : colors.card,
                  borderColor: targetType === 'paper' ? '#93C5FD' : colors.border,
                },
              ]}
              onPress={() => setTargetType('paper')}
            >
              <Text style={styles.methodEmoji}>📷</Text>
              <Text style={[styles.methodLabel, { color: targetType === 'paper' ? '#93C5FD' : colors.text }]}>
                Scan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodBtn,
                {
                  backgroundColor: targetType === 'tactical' ? colors.text + '15' : colors.card,
                  borderColor: targetType === 'tactical' ? colors.text : colors.border,
                },
              ]}
              onPress={() => setTargetType('tactical')}
            >
              <Text style={styles.methodEmoji}>✏️</Text>
              <Text style={[styles.methodLabel, { color: colors.text }]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Defaults (optional) */}
      <View style={[styles.optionalField, { marginTop: 8 }]}>
        <TouchableOpacity
          style={[styles.defaultsToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={() => setShowDefaults((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={[styles.defaultsToggleText, { color: colors.text }]}>
            {showDefaults ? 'Hide session defaults' : 'Show session defaults (optional)'}
          </Text>
          <Text style={[styles.defaultsToggleHint, { color: colors.textMuted }]}>
            {showDefaults ? 'These are suggestions' : 'Distance & shot plan'}
          </Text>
        </TouchableOpacity>

        {showDefaults && (
          <>
            {/* Distance default */}
            <View style={[styles.paramSection, { marginTop: 14 }]}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Default distance (optional)</Text>
              <View style={styles.paramGrid}>
                {[7, 15, 25, 50, 100, 200].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.paramBtn,
                      {
                        backgroundColor: parseInt(distance) === d ? goalColor : colors.card,
                        borderColor: parseInt(distance) === d ? goalColor : colors.border,
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
                    <Text
                      style={[
                        styles.paramBtnUnit,
                        { color: parseInt(distance) === d ? '#ffffffcc' : colors.textMuted },
                      ]}
                    >
                      m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Shots policy */}
            <View style={styles.paramSection}>
              <Text style={[styles.paramLabel, { color: colors.text }]}>Shots per entry</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor: shotsPolicy === 'flexible' ? goalColor + '15' : colors.card,
                      borderColor: shotsPolicy === 'flexible' ? goalColor : colors.border,
                    },
                  ]}
                  onPress={() => setShotsPolicy('flexible')}
                >
                  <Text style={styles.methodEmoji}>🧩</Text>
                  <Text style={[styles.methodLabel, { color: colors.text }]}>Flexible</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor: shotsPolicy === 'fixed' ? goalColor + '15' : colors.card,
                      borderColor: shotsPolicy === 'fixed' ? goalColor : colors.border,
                    },
                  ]}
                  onPress={() => setShotsPolicy('fixed')}
                >
                  <Text style={styles.methodEmoji}>🎯</Text>
                  <Text style={[styles.methodLabel, { color: colors.text }]}>Fixed</Text>
                </TouchableOpacity>
              </View>

              {shotsPolicy === 'fixed' && (
                <View style={[styles.paramGrid, { marginTop: 10 }]}>
                  {[3, 5, 10, 15, 20, 30].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.paramBtn,
                        {
                          backgroundColor: parseInt(rounds) === s ? goalColor : colors.card,
                          borderColor: parseInt(rounds) === s ? goalColor : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRounds(String(s));
                      }}
                    >
                      <Text style={[styles.paramBtnValue, { color: parseInt(rounds) === s ? '#fff' : colors.text }]}>
                        {s}
                      </Text>
                      <Text
                        style={[
                          styles.paramBtnUnit,
                          { color: parseInt(rounds) === s ? '#ffffffcc' : colors.textMuted },
                        ]}
                      >
                        rds
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );

  // ============================================================================
  // STEP 3: Optional Settings
  // ============================================================================
  const renderStep3 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Requirements</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Optional limits and thresholds</Text>

      {/* Time Limit */}
      <View style={styles.optionalField}>
        <Text style={[styles.optionalLabel, { color: colors.text }]}>Time limit (seconds)</Text>
        <TextInput
          style={[styles.optionalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="No limit"
          placeholderTextColor={colors.textMuted}
          value={timeLimit}
          onChangeText={setTimeLimit}
          keyboardType="number-pad"
        />
        <View style={styles.optionalHints}>
          {[10, 30, 60, 120].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.hintChip, { backgroundColor: timeLimit === String(t) ? goalColor : colors.secondary }]}
              onPress={() => setTimeLimit(timeLimit === String(t) ? '' : String(t))}
            >
              <Text style={[styles.hintChipText, { color: timeLimit === String(t) ? '#fff' : colors.textMuted }]}>
                {t}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Par Time */}
      <View style={styles.optionalField}>
        <Text style={[styles.optionalLabel, { color: colors.text }]}>Par time (seconds)</Text>
        <TextInput
          style={[styles.optionalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          value={parTime}
          onChangeText={setParTime}
          keyboardType="number-pad"
        />
      </View>

      {/* Scoring */}
      <View style={styles.optionalField}>
        <Text style={[styles.optionalLabel, { color: colors.text }]}>Scoring mode</Text>
        <View style={styles.optionalHints}>
          {(['accuracy', 'speed', 'combined', 'pass_fail', 'points'] as ScoringMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.hintChip, { backgroundColor: scoringMode === m ? goalColor : colors.secondary }]}
              onPress={() => setScoringMode(scoringMode === m ? '' : m)}
            >
              <Text style={[styles.hintChipText, { color: scoringMode === m ? '#fff' : colors.textMuted }]}>
                {m.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Points scoring params */}
      {scoringMode === 'points' && (
        <>
          <View style={styles.optionalField}>
            <Text style={[styles.optionalLabel, { color: colors.text }]}>Points per hit</Text>
            <TextInput
              style={[styles.optionalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 5"
              placeholderTextColor={colors.textMuted}
              value={pointsPerHit}
              onChangeText={setPointsPerHit}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.optionalField}>
            <Text style={[styles.optionalLabel, { color: colors.text }]}>Penalty per miss</Text>
            <TextInput
              style={[styles.optionalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 1"
              placeholderTextColor={colors.textMuted}
              value={penaltyPerMiss}
              onChangeText={setPenaltyPerMiss}
              keyboardType="number-pad"
            />
          </View>
        </>
      )}

      {/* Hits required per target (achievement) */}
      {drillGoal === 'achievement' && (
        <View style={styles.optionalField}>
          <Text style={[styles.optionalLabel, { color: colors.text }]}>Hits required per target (optional)</Text>
          <TextInput
            style={[styles.optionalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. 5"
            placeholderTextColor={colors.textMuted}
            value={shotsPerTarget}
            onChangeText={setShotsPerTarget}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Min Accuracy (only for achievement) */}
      {drillGoal === 'achievement' && (
        <View style={styles.optionalField}>
          <Text style={[styles.optionalLabel, { color: colors.text }]}>Minimum accuracy %</Text>
          <TextInput
            style={[styles.optionalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="No minimum"
            placeholderTextColor={colors.textMuted}
            value={minAccuracy}
            onChangeText={setMinAccuracy}
            keyboardType="number-pad"
          />
          <View style={styles.optionalHints}>
            {[50, 70, 80, 90].map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.hintChip, { backgroundColor: minAccuracy === String(a) ? goalColor : colors.secondary }]}
                onPress={() => setMinAccuracy(minAccuracy === String(a) ? '' : String(a))}
              >
                <Text style={[styles.hintChipText, { color: minAccuracy === String(a) ? '#fff' : colors.textMuted }]}>
                  {a}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.skipHint, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.skipHintText, { color: colors.textMuted }]}>
          Optional. Skip if you don't need limits.
        </Text>
      </View>
    </Animated.View>
  );

  // ============================================================================
  // STEP 4: Name & Save
  // ============================================================================
  const renderStep4 = () => (
    <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Drill Name</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Give it a memorable name</Text>

      <TextInput
        style={[styles.nameInput, { backgroundColor: colors.card, borderColor: name.trim() ? goalColor : colors.border, color: colors.text }]}
        placeholder="e.g., Qualification Test"
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
          <Text style={[styles.summaryValue, { color: goalColor }]}>
            {drillGoal === 'grouping' ? '🎯 Grouping' : '🏆 Achievement'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Distance</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{distance}m</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Shots</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{rounds}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Rounds</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{stringsCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Targets/round</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{targetCount}</Text>
        </View>
        {timeLimit && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Time limit</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{timeLimit}s</Text>
          </View>
        )}
        {parTime && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Par time</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{parTime}s</Text>
          </View>
        )}
        {scoringMode && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Scoring</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{scoringMode.replace('_', ' ')}</Text>
          </View>
        )}
        {minAccuracy && drillGoal === 'achievement' && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Min accuracy</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{minAccuracy}%</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

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
        <StepIndicator current={step} total={4} colors={colors} />

        {/* Content */}
        <View style={styles.body}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
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
              { backgroundColor: canProceed() ? goalColor : colors.border },
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={[styles.nextBtnText, { color: canProceed() ? '#fff' : colors.textMuted }]}>
              {step === 4 ? 'Save Drill' : 'Next'}
            </Text>
            {step < 4 ? (
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

  // Goal Cards (Compact)
  goalCards: {
    gap: 12,
  },
  goalCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative',
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  goalCardEmoji: {
    fontSize: 24,
  },
  goalCardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  goalCardDesc: {
    fontSize: 13,
  },
  goalCardFeatures: {
    gap: 4,
  },
  goalCardFeature: {
    fontSize: 13,
  },
  goalCardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
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
