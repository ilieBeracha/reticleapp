/**
 * Unified Drill Modal
 *
 * Single modal for all drill-related forms:
 * - mode: 'template' → Create/edit drill templates (saves to DB)
 * - mode: 'configure' → Configure drill instance for training
 * - mode: 'quick' → Quick inline drill (not saved, for training)
 */
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
import { useEffect, useMemo, useState } from 'react';
import {
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
// PRESETS (shared with SessionFormSheet pattern)
// ============================================================================
const DISTANCE_PRESETS = [7, 15, 25, 50, 100, 200];
const SHOTS_PRESETS = [3, 5, 10, 15, 20];
const ROUNDS_PRESETS = [1, 2, 3, 5];
const TIME_PRESETS = [30, 60, 90, 120];

const GOAL_COLORS = {
  grouping: '#10B981',
  achievement: '#3B82F6',
};

// ============================================================================
// TOGGLE BUTTON (same as SessionFormSheet)
// ============================================================================
function ToggleButton({
  icon,
  label,
  active,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[
        styles.toggleBtn,
        {
          backgroundColor: active ? `${color}15` : colors.card,
          borderColor: active ? color : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.toggleLabel, { color: active ? color : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// CONFIG ROW (inline input + presets - same as SessionFormSheet)
// ============================================================================
function ConfigRow({
  label,
  unit,
  value,
  onChange,
  presets,
  accentColor,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  presets: number[];
  accentColor: string;
}) {
  const colors = useColors();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const handleBlur = () => {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < 1) {
      onChange(1);
      setText('1');
    } else {
      onChange(n);
    }
  };

  return (
    <View style={[styles.configRow, { borderBottomColor: colors.border }]}>
      <View style={styles.configLeft}>
        <Text style={[styles.configLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.configUnit, { color: colors.textMuted }]}>{unit}</Text>
      </View>
      <View style={styles.configRight}>
        <View style={[styles.inputBox, { borderColor: accentColor }]}>
          <TextInput
            style={[styles.inputText, { color: colors.text }]}
            value={text}
            onChangeText={setText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
        {presets.slice(0, 4).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.presetPill,
              { backgroundColor: value === p ? accentColor : colors.secondary },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(p);
            }}
          >
            <Text style={[styles.presetText, { color: value === p ? '#fff' : colors.textMuted }]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// TIME ROW (with input + None toggle - same as SessionFormSheet)
// ============================================================================
function TimeRow({
  value,
  onChange,
  presets,
  accentColor,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  presets: number[];
  accentColor: string;
}) {
  const colors = useColors();
  const [text, setText] = useState(value ? String(value) : '');
  const hasValue = value !== null;

  useEffect(() => {
    setText(value ? String(value) : '');
  }, [value]);

  const handleTextChange = (t: string) => {
    setText(t);
    if (t === '') {
      onChange(null);
    } else {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n > 0) onChange(n);
    }
  };

  const handleBlur = () => {
    if (text === '' || text === '0') {
      onChange(null);
      setText('');
    }
  };

  return (
    <View style={styles.configRow}>
      <View style={styles.configLeft}>
        <Text style={[styles.configLabel, { color: colors.text }]}>Time</Text>
        <Text style={[styles.configUnit, { color: colors.textMuted }]}>seconds</Text>
      </View>
      <View style={styles.configRight}>
        <TouchableOpacity
          style={[styles.presetPill, { backgroundColor: !hasValue ? accentColor : colors.secondary }]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(null);
            setText('');
          }}
        >
          <Text style={[styles.presetText, { color: !hasValue ? '#fff' : colors.textMuted }]}>
            None
          </Text>
        </TouchableOpacity>
        <View style={[styles.inputBox, { borderColor: hasValue ? accentColor : colors.border }]}>
          <TextInput
            style={[styles.inputText, { color: colors.text }]}
            value={text}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
          />
        </View>
        {presets.slice(0, 3).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.presetPill,
              { backgroundColor: value === p ? accentColor : colors.secondary },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(p);
            }}
          >
            <Text style={[styles.presetText, { color: value === p ? '#fff' : colors.textMuted }]}>
              {p}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
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
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('achievement');
  const [targetType, setTargetType] = useState<TargetType>('tactical');
  const [inputMethod, setInputMethod] = useState<'scan' | 'manual'>('manual');
  const [distance, setDistance] = useState<number>(25);
  const [shots, setShots] = useState<number>(5);
  const [strings, setStrings] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const accentColor = GOAL_COLORS[drillGoal];
  const isGrouping = drillGoal === 'grouping';

  const title = useMemo(() => {
    switch (mode) {
      case 'template':
        return initialData?.name ? 'Edit Drill' : 'New Drill';
      case 'configure':
        return drillName || 'Configure Drill';
      case 'quick':
        return 'Quick Drill';
    }
  }, [mode, initialData, drillName]);

  const showNameField = mode === 'template' || mode === 'quick';
  const showGoalSelection = mode === 'template' || mode === 'quick';

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
      case 'quick':
        onSaveQuick?.({ draft: formData, instance: instanceConfig });
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
      case 'quick':
        return 'Add Drill';
    }
  }, [mode, initialData]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
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
            <Text style={[styles.headerSaveText, { color: accentColor }]}>
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
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DRILL NAME</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: name.trim() ? accentColor : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g., Bill Drill, Cold Bore..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus={mode === 'template' || mode === 'quick'}
              />
            </View>
          )}

          {mode === 'template' && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                DESCRIPTION (optional)
              </Text>
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
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>OBJECTIVE</Text>
              <View style={styles.toggleRow}>
                <ToggleButton
                  icon={<Crosshair size={18} color={drillGoal === 'grouping' ? GOAL_COLORS.grouping : colors.textMuted} />}
                  label="Grouping"
                  active={drillGoal === 'grouping'}
                  color={GOAL_COLORS.grouping}
                  onPress={() => setDrillGoal('grouping')}
                />
                <ToggleButton
                  icon={<Trophy size={18} color={drillGoal === 'achievement' ? GOAL_COLORS.achievement : colors.textMuted} />}
                  label="Achievement"
                  active={drillGoal === 'achievement'}
                  color={GOAL_COLORS.achievement}
                  onPress={() => setDrillGoal('achievement')}
                />
              </View>
            </View>
          )}

          {/* ENTRY METHOD */}
          {!isGrouping && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>INPUT METHOD</Text>
              <View style={styles.toggleRow}>
                <ToggleButton
                  icon={<Camera size={18} color={inputMethod === 'scan' ? accentColor : colors.textMuted} />}
                  label="Scan"
                  active={inputMethod === 'scan'}
                  color={accentColor}
                  onPress={() => setInputMethod('scan')}
                />
                <ToggleButton
                  icon={<Hand size={18} color={inputMethod === 'manual' ? accentColor : colors.textMuted} />}
                  label="Manual"
                  active={inputMethod === 'manual'}
                  color={accentColor}
                  onPress={() => setInputMethod('manual')}
                />
              </View>
            </View>
          )}

          {/* Grouping hint */}
          {isGrouping && showGoalSelection && (
            <View style={[styles.hintBox, { backgroundColor: `${GOAL_COLORS.grouping}10` }]}>
              <Camera size={14} color={GOAL_COLORS.grouping} />
              <Text style={[styles.hintText, { color: GOAL_COLORS.grouping }]}>
                Grouping drills use camera scanning to measure shot dispersion
              </Text>
            </View>
          )}

          {/* CONFIGURATION */}
          <View style={[styles.configSection, { borderTopColor: colors.border }]}>
            <ConfigRow
              label="Distance"
              unit="meters"
              value={distance}
              onChange={setDistance}
              presets={DISTANCE_PRESETS}
              accentColor={accentColor}
            />

            <ConfigRow
              label="Shots"
              unit="per round"
              value={shots}
              onChange={setShots}
              presets={SHOTS_PRESETS}
              accentColor={accentColor}
            />

            <ConfigRow
              label="Rounds"
              unit="repetitions"
              value={strings}
              onChange={setStrings}
              presets={ROUNDS_PRESETS}
              accentColor={accentColor}
            />

            <TimeRow
              value={timeLimit}
              onChange={setTimeLimit}
              presets={TIME_PRESETS}
              accentColor={accentColor}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.footerBtn,
              { backgroundColor: canSave && !saving ? accentColor : colors.secondary },
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

  // Header
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Toggle buttons
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
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

  // Hint
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Config section
  configSection: {
    borderTopWidth: 1,
    paddingTop: 4,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  configLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  configLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  configUnit: {
    fontSize: 11,
  },
  configRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputBox: {
    width: 48,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
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
