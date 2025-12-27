/**
 * Unified Drill Modal
 *
 * Single modal for all drill-related forms:
 * - mode: 'template' → Create/edit drill templates (saves to DB) - Full screen modal
 * - mode: 'configure' → Configure drill instance for training - Full screen modal
 * - mode: 'quick' → Quick inline drill (not saved, for training) - Bottom sheet
 *
 * Uses shared DrillFormComponents for consistent UI with SessionFormSheet.
 */
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
} from '@/components/session/form/DrillFormComponents';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal, DrillInstanceConfig, TargetType } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Check,
  Crosshair,
  Hand,
  Trophy,
  X
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================
export type DrillModalMode = 'template' | 'configure' | 'quick';

export interface DrillFormData {
  name: string;
  description?: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  input_method: 'scan' | 'manual';
  distance_m: number;
  rounds_per_shooter: number;
  strings_count: number;
  time_limit_seconds: number | null;
}

export interface UnifiedDrillModalProps {
  visible: boolean;
  onClose: () => void;
  mode: DrillModalMode;
  onSaveTemplate?: (data: DrillFormData) => void;
  onConfirmConfig?: (config: DrillInstanceConfig) => void;
  onSaveQuick?: (data: { draft: DrillFormData; instance: DrillInstanceConfig }) => void;
  initialData?: Partial<DrillFormData>;
  drillName?: string;
  saving?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function UnifiedDrillModal({
  visible,
  onClose,
  mode,
  onSaveTemplate,
  onConfirmConfig,
  onSaveQuick,
  initialData,
  drillName,
  saving = false,
}: UnifiedDrillModalProps) {
  // Use bottom sheet for quick mode, modal for template/configure
  if (mode === 'quick') {
    return (
      <QuickDrillSheet
        visible={visible}
        onClose={onClose}
        onSave={onSaveQuick}
        initialData={initialData}
        saving={saving}
      />
    );
  }

  return (
    <FullScreenDrillModal
      visible={visible}
      onClose={onClose}
      mode={mode}
      onSaveTemplate={onSaveTemplate}
      onConfirmConfig={onConfirmConfig}
      initialData={initialData}
      drillName={drillName}
      saving={saving}
    />
  );
}

// ============================================================================
// QUICK DRILL SHEET (Modal styled as bottom sheet - simpler, more reliable)
// ============================================================================
interface QuickDrillSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (data: { draft: DrillFormData; instance: DrillInstanceConfig }) => void;
  initialData?: Partial<DrillFormData>;
  saving?: boolean;
}

function QuickDrillSheet({
  visible,
  onClose,
  onSave,
  initialData,
  saving = false,
}: QuickDrillSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Form state
  const [name, setName] = useState('');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('achievement');
  const [inputMethod, setInputMethod] = useState<'scan' | 'manual'>('manual');
  const [distance, setDistance] = useState(25);
  const [shots, setShots] = useState(5);
  const [rounds, setRounds] = useState(1);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const isGrouping = drillGoal === 'grouping';

  // Reset form on open
  useEffect(() => {
    if (!visible) return;

    if (initialData) {
      setName(initialData.name || '');
      setDrillGoal(initialData.drill_goal || 'achievement');
      setInputMethod(initialData.input_method || 'manual');
      setDistance(initialData.distance_m || 25);
      setShots(initialData.rounds_per_shooter || 5);
      setRounds(initialData.strings_count || 1);
      setTimeLimit(initialData.time_limit_seconds || null);
    } else {
      setName('');
      setDrillGoal('achievement');
      setInputMethod('manual');
      setDistance(25);
      setShots(5);
      setRounds(1);
      setTimeLimit(null);
    }
  }, [visible, initialData]);

  // Grouping forces scan
  useEffect(() => {
    if (drillGoal === 'grouping') {
      setInputMethod('scan');
    }
  }, [drillGoal]);

  const canSave = name.trim().length > 0 && distance > 0 && shots > 0 && rounds > 0;

  const handleSave = useCallback(() => {
    if (!canSave || saving) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();

    const formData: DrillFormData = {
      name: name.trim(),
      drill_goal: drillGoal,
      target_type: isGrouping ? 'paper' : 'tactical',
      input_method: isGrouping ? 'scan' : inputMethod,
      distance_m: distance,
      rounds_per_shooter: shots,
      strings_count: rounds,
      time_limit_seconds: timeLimit,
    };

    const instanceConfig: DrillInstanceConfig = {
      distance_m: distance,
      rounds_per_shooter: shots,
      strings_count: rounds,
      time_limit_seconds: timeLimit,
      input_method: isGrouping ? 'scan' : inputMethod,
    };

    onSave?.({ draft: formData, instance: instanceConfig });
    onClose();
  }, [canSave, saving, name, drillGoal, isGrouping, inputMethod, distance, shots, rounds, timeLimit, onSave, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 20, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} hitSlop={12}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Quick Drill</Text>
          <TouchableOpacity
            style={[styles.headerSaveBtn, { opacity: canSave && !saving ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={!canSave || saving}
            hitSlop={12}
          >
            <Text style={[styles.headerSaveText, { color: colors.primary }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.section}>
            <SectionLabel>DRILL NAME</SectionLabel>
            <TextInput
              style={[
                styles.textInput,
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
              autoFocus
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
            <HintBox>Grouping drills use camera scanning to measure shot dispersion</HintBox>
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
              <TimeRow value={timeLimit} onChange={setTimeLimit} presets={TIME_PRESETS} isLast />
            </ConfigCard>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.footerBtn,
              { backgroundColor: canSave && !saving ? colors.primary : colors.secondary },
            ]}
            onPress={handleSave}
            disabled={!canSave || saving}
            activeOpacity={0.8}
          >
            <Check size={20} color={canSave && !saving ? '#fff' : colors.textMuted} />
            <Text style={[styles.footerBtnText, { color: canSave && !saving ? '#fff' : colors.textMuted }]}>
              Add Drill
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// FULL SCREEN MODAL (Template / Configure modes)
// ============================================================================
interface FullScreenDrillModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'template' | 'configure';
  onSaveTemplate?: (data: DrillFormData) => void;
  onConfirmConfig?: (config: DrillInstanceConfig) => void;
  initialData?: Partial<DrillFormData>;
  drillName?: string;
  saving?: boolean;
}

function FullScreenDrillModal({
  visible,
  onClose,
  mode,
  onSaveTemplate,
  onConfirmConfig,
  initialData,
  drillName,
  saving = false,
}: FullScreenDrillModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('achievement');
  const [targetType, setTargetType] = useState<TargetType>('tactical');
  const [inputMethod, setInputMethod] = useState<'scan' | 'manual'>('manual');
  const [distance, setDistance] = useState(25);
  const [shots, setShots] = useState(5);
  const [strings, setStrings] = useState(1);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const isGrouping = drillGoal === 'grouping';

  const title = useMemo(() => {
    switch (mode) {
      case 'template':
        return initialData?.name ? 'Edit Drill' : 'New Drill';
      case 'configure':
        return drillName || 'Configure Drill';
    }
  }, [mode, initialData, drillName]);

  const showNameField = mode === 'template';
  const showGoalSelection = mode === 'template';

  // Reset on open
  useEffect(() => {
    if (!visible) return;

    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setDrillGoal(initialData.drill_goal || 'achievement');
      setTargetType(initialData.target_type || 'tactical');
      setInputMethod(initialData.input_method || 'manual');
      setDistance(initialData.distance_m || 25);
      setShots(initialData.rounds_per_shooter || 5);
      setStrings(initialData.strings_count || 1);
      setTimeLimit(initialData.time_limit_seconds || null);
    } else {
      setName('');
      setDescription('');
      setDrillGoal('achievement');
      setTargetType('tactical');
      setInputMethod('manual');
      setDistance(25);
      setShots(5);
      setStrings(1);
      setTimeLimit(null);
    }
  }, [visible, initialData]);

  // Grouping forces paper + scan
  useEffect(() => {
    if (drillGoal === 'grouping') {
      setTargetType('paper');
      setInputMethod('scan');
    }
  }, [drillGoal]);

  const canSave = useMemo(() => {
    if (showNameField && name.trim().length === 0) return false;
    if (distance <= 0 || shots <= 0 || strings <= 0) return false;
    return true;
  }, [showNameField, name, distance, shots, strings]);

  const handleSave = () => {
    if (!canSave || saving) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const formData: DrillFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      drill_goal: drillGoal,
      target_type: isGrouping ? 'paper' : targetType,
      input_method: isGrouping ? 'scan' : inputMethod,
      distance_m: distance,
      rounds_per_shooter: shots,
      strings_count: strings,
      time_limit_seconds: timeLimit,
    };

    const instanceConfig: DrillInstanceConfig = {
      distance_m: distance,
      rounds_per_shooter: shots,
      strings_count: strings,
      time_limit_seconds: timeLimit,
      input_method: isGrouping ? 'scan' : inputMethod,
    };

    switch (mode) {
      case 'template':
        onSaveTemplate?.(formData);
        break;
      case 'configure':
        onConfirmConfig?.(instanceConfig);
        break;
    }

    onClose();
  };

  const saveButtonLabel = useMemo(() => {
    switch (mode) {
      case 'template':
        return initialData?.name ? 'Save Changes' : 'Create Drill';
      case 'configure':
        return 'Add to Training';
    }
  }, [mode, initialData]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} hitSlop={12}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity
            style={[styles.headerSaveBtn, { opacity: canSave && !saving ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={!canSave || saving}
            hitSlop={12}
          >
            <Text style={[styles.headerSaveText, { color: colors.primary }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* NAME & DESCRIPTION */}
          {showNameField && (
            <View style={styles.section}>
              <SectionLabel>DRILL NAME</SectionLabel>
              <TextInput
                style={[
                  styles.textInput,
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
                autoFocus={mode === 'template'}
              />
            </View>
          )}

          {mode === 'template' && (
            <View style={styles.section}>
              <SectionLabel>DESCRIPTION (OPTIONAL)</SectionLabel>
              <TextInput
                style={[
                  styles.textInputMulti,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="What's this drill about?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* OBJECTIVE */}
          {showGoalSelection && (
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
          )}

          {/* INPUT METHOD */}
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
          {isGrouping && showGoalSelection && (
            <HintBox>Grouping drills use camera scanning to measure shot dispersion</HintBox>
          )}

          {/* CONFIGURATION */}
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
                value={strings}
                onChange={setStrings}
                presets={ROUNDS_PRESETS}
              />
              <TimeRow value={timeLimit} onChange={setTimeLimit} presets={TIME_PRESETS} isLast />
            </ConfigCard>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.footerBtn,
              { backgroundColor: canSave && !saving ? colors.primary : colors.secondary },
            ]}
            onPress={handleSave}
            disabled={!canSave || saving}
            activeOpacity={0.8}
          >
            <Check size={20} color={canSave && !saving ? '#fff' : colors.textMuted} />
            <Text style={[styles.footerBtnText, { color: canSave && !saving ? '#fff' : colors.textMuted }]}>
              {saveButtonLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Shared header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSaveBtn: {
    paddingHorizontal: 4,
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  optionGroup: {
    gap: 10,
  },

  // Text inputs
  textInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  textInputMulti: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
