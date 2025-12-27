/**
 * DrillFormSheet - Bottom sheet wrapper for drill configuration
 *
 * Provides a consistent bottom sheet presentation for drill forms.
 * Used by UnifiedDrillModal for quick drill mode.
 */

import { useColors } from '@/hooks/ui/useColors';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
    Camera,
    Check,
    Crosshair,
    Hand,
    Target,
    Trophy,
    X,
} from 'lucide-react-native';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
    Keyboard,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ConfigCard,
    ConfigRow,
    DISTANCE_PRESETS,
    HintBox,
    OptionCard,
    ROUNDS_PRESETS,
    SectionLabel,
    SHOTS_PRESETS,
    TIME_PRESETS,
    TimeRow,
} from './DrillFormComponents';

// ============================================================================
// TYPES
// ============================================================================

export type DrillGoal = 'grouping' | 'achievement';
export type InputMethod = 'scan' | 'manual';

export interface QuickDrillFormData {
  name: string;
  drillGoal: DrillGoal;
  inputMethod: InputMethod;
  distance: number;
  shots: number;
  rounds: number;
  timeLimit: number | null;
}

export interface DrillFormSheetRef {
  open: () => void;
  close: () => void;
}

export interface DrillFormSheetProps {
  onSubmit: (data: QuickDrillFormData) => void;
  onClose?: () => void;
  title?: string;
  submitLabel?: string;
  initialData?: Partial<QuickDrillFormData>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DrillFormSheet = forwardRef<DrillFormSheetRef, DrillFormSheetProps>(
  function DrillFormSheet(
    {
      onSubmit,
      onClose,
      title = 'Quick Drill',
      submitLabel = 'Add Drill',
      initialData,
    },
    ref
  ) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Form state
    const [name, setName] = useState(initialData?.name ?? '');
    const [drillGoal, setDrillGoal] = useState<DrillGoal>(initialData?.drillGoal ?? 'achievement');
    const [inputMethod, setInputMethod] = useState<InputMethod>(initialData?.inputMethod ?? 'manual');
    const [distance, setDistance] = useState(initialData?.distance ?? 25);
    const [shots, setShots] = useState(initialData?.shots ?? 5);
    const [rounds, setRounds] = useState(initialData?.rounds ?? 1);
    const [timeLimit, setTimeLimit] = useState<number | null>(initialData?.timeLimit ?? null);

    const isGrouping = drillGoal === 'grouping';

    // Snap points for bottom sheet
    const snapPoints = useMemo(() => ['92%'], []);

    // Imperative handle for parent control
    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    // Reset form when opened
    useEffect(() => {
      if (initialData) {
        setName(initialData.name ?? '');
        setDrillGoal(initialData.drillGoal ?? 'achievement');
        setInputMethod(initialData.inputMethod ?? 'manual');
        setDistance(initialData.distance ?? 25);
        setShots(initialData.shots ?? 5);
        setRounds(initialData.rounds ?? 1);
        setTimeLimit(initialData.timeLimit ?? null);
      }
    }, [initialData]);

    // Grouping forces scan
    useEffect(() => {
      if (drillGoal === 'grouping') {
        setInputMethod('scan');
      }
    }, [drillGoal]);

    const canSubmit = name.trim().length > 0 && distance > 0 && shots > 0 && rounds > 0;

    const handleSubmit = useCallback(() => {
      if (!canSubmit) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();

      onSubmit({
        name: name.trim(),
        drillGoal,
        inputMethod: isGrouping ? 'scan' : inputMethod,
        distance,
        shots,
        rounds,
        timeLimit,
      });

      bottomSheetRef.current?.close();
    }, [canSubmit, name, drillGoal, inputMethod, isGrouping, distance, shots, rounds, timeLimit, onSubmit]);

    const handleClose = useCallback(() => {
      Keyboard.dismiss();
      bottomSheetRef.current?.close();
      onClose?.();
    }, [onClose]);

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose?.();
        }
      },
      [onClose]
    );

    // Backdrop
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
        backgroundStyle={{ backgroundColor: colors.background }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleClose} hitSlop={12}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
              <Target size={18} color={colors.text} strokeWidth={1.5} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <BottomSheetScrollView
          style={styles.scrollContent}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name Input */}
          <View style={styles.section}>
            <SectionLabel>DRILL NAME</SectionLabel>
            <BottomSheetTextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.card,
                  borderColor: name.trim() ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g., Bill Drill, Cold Bore..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Objective */}
          <View style={styles.section}>
            <SectionLabel>OBJECTIVE</SectionLabel>
            <View style={styles.optionGroup}>
              <OptionCard
                icon={<Crosshair size={18} color={colors.text} strokeWidth={1.5} />}
                label="Grouping"
                description="Measure shot dispersion"
                active={drillGoal === 'grouping'}
                onPress={() => setDrillGoal('grouping')}
              />
              <OptionCard
                icon={<Trophy size={18} color={colors.text} strokeWidth={1.5} />}
                label="Achievement"
                description="Zone-based scoring"
                active={drillGoal === 'achievement'}
                onPress={() => setDrillGoal('achievement')}
              />
            </View>
          </View>

          {/* Input Method */}
          {!isGrouping && (
            <View style={styles.section}>
              <SectionLabel>INPUT METHOD</SectionLabel>
              <View style={styles.optionGroup}>
                <OptionCard
                  icon={<Camera size={18} color={colors.text} strokeWidth={1.5} />}
                  label="Scan"
                  description="AI target detection"
                  active={inputMethod === 'scan'}
                  onPress={() => setInputMethod('scan')}
                />
                <OptionCard
                  icon={<Hand size={18} color={colors.text} strokeWidth={1.5} />}
                  label="Manual"
                  description="Mark shots yourself"
                  active={inputMethod === 'manual'}
                  onPress={() => setInputMethod('manual')}
                />
              </View>
            </View>
          )}

          {/* Grouping hint */}
          {isGrouping && (
            <HintBox>
              Grouping drills use camera scanning to measure shot dispersion
            </HintBox>
          )}

          {/* Parameters */}
          <View style={styles.section}>
            <SectionLabel>PARAMETERS</SectionLabel>
            <ConfigCard>
              <ConfigRow
                label="Distance"
                unit="meters"
                value={distance}
                onChange={setDistance}
                presets={DISTANCE_PRESETS}
              />
              <ConfigRow
                label="Shots"
                unit="per round"
                value={shots}
                onChange={setShots}
                presets={SHOTS_PRESETS}
              />
              <ConfigRow
                label="Rounds"
                unit="repetitions"
                value={rounds}
                onChange={setRounds}
                presets={ROUNDS_PRESETS}
              />
              <TimeRow
                value={timeLimit}
                onChange={setTimeLimit}
                presets={TIME_PRESETS}
                isLast
              />
            </ConfigCard>
          </View>
        </BottomSheetScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? colors.primary : colors.secondary },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Check size={18} color={canSubmit ? '#fff' : colors.textMuted} />
            <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.textMuted }]}>
              {submitLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Content
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  optionGroup: {
    gap: 10,
  },

  // Name input
  nameInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

