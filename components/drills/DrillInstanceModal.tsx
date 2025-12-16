/**
 * Drill Instance Modal - TYPE-AWARE
 *
 * Configure instance-specific values when adding a drill to a training.
 * Shows only relevant params for the drill type and respects template constraints.
 */
import { useColors } from '@/hooks/ui/useColors';
import type { Drill, DrillInstanceConfig } from '@/types/workspace';
import type { DrillTemplate, DrillTypeId, ParamConstraint } from '@/types/drillTypes';
import { DRILL_TYPES } from '@/types/drillTypes';
import { isParamLocked, mergeWithDefaults } from '@/utils/drillValidation';
import * as Haptics from 'expo-haptics';
import { Award, Check, Clock, Crosshair, Lock, Plus, Target, X } from 'lucide-react-native';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

interface DrillInstanceModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (config: DrillInstanceConfig) => void;
  // Support both Drill (legacy) and DrillTemplate (new)
  drill?: Drill | null;
  template?: DrillTemplate | null;
}

// ============================================================================
// ICON MAP
// ============================================================================

const TYPE_ICONS: Record<DrillTypeId, any> = {
  zeroing: Crosshair,
  grouping: Target,
  timed: Clock,
  qualification: Award,
};

// ============================================================================
// PILL SELECTOR COMPONENT
// ============================================================================

function PillSelector({
  label,
  unit,
  options,
  value,
  onChange,
  colors,
  accentColor,
  locked = false,
  formatLabel,
}: {
  label: string;
  unit?: string;
  options: (number | string | null)[];
  value: number | string | null;
  onChange: (val: number | string | null) => void;
  colors: ReturnType<typeof useColors>;
  accentColor: string;
  locked?: boolean;
  formatLabel?: (val: number | string | null) => string;
}) {
  return (
    <View style={[styles.fieldContainer, locked && styles.fieldLocked]}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {unit && <Text style={[styles.fieldUnit, { color: colors.textMuted }]}>{unit}</Text>}
        {locked && (
          <View style={[styles.lockedBadge, { backgroundColor: colors.secondary }]}>
            <Lock size={10} color={colors.textMuted} />
            <Text style={[styles.lockedText, { color: colors.textMuted }]}>Fixed</Text>
          </View>
        )}
      </View>
      <View style={styles.pillRow}>
        {options.map((opt) => {
          const isSelected = value === opt;
          const displayLabel = formatLabel
            ? formatLabel(opt)
            : opt === null
              ? 'None'
              : String(opt);
          return (
            <TouchableOpacity
              key={opt ?? 'none'}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? accentColor : colors.card,
                  borderColor: isSelected ? accentColor : colors.border,
                  opacity: locked && !isSelected ? 0.4 : 1,
                },
              ]}
              onPress={() => {
                if (locked) return;
                Haptics.selectionAsync();
                onChange(opt);
              }}
              activeOpacity={locked ? 1 : 0.7}
              disabled={locked}
            >
              <Text style={[styles.pillText, { color: isSelected ? '#fff' : colors.text }]}>
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// NUMBER INPUT COMPONENT
// ============================================================================

function NumberInput({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  colors,
  accentColor,
  locked = false,
}: {
  label: string;
  unit?: string;
  value: number | null;
  onChange: (val: number | null) => void;
  min?: number;
  max?: number;
  colors: ReturnType<typeof useColors>;
  accentColor: string;
  locked?: boolean;
}) {
  const [text, setText] = useState(value?.toString() ?? '');

  useEffect(() => {
    setText(value?.toString() ?? '');
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);
    const num = parseInt(newText, 10);
    if (!isNaN(num)) {
      const clamped = Math.max(min ?? 0, Math.min(max ?? 9999, num));
      onChange(clamped);
    } else if (newText === '') {
      onChange(null);
    }
  };

  return (
    <View style={[styles.fieldContainer, locked && styles.fieldLocked]}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {unit && <Text style={[styles.fieldUnit, { color: colors.textMuted }]}>{unit}</Text>}
        {locked && (
          <View style={[styles.lockedBadge, { backgroundColor: colors.secondary }]}>
            <Lock size={10} color={colors.textMuted} />
            <Text style={[styles.lockedText, { color: colors.textMuted }]}>Fixed</Text>
          </View>
        )}
      </View>
      <View style={[styles.numberInputRow, { borderColor: locked ? colors.border : accentColor }]}>
        <TextInput
          style={[styles.numberInput, { color: colors.text }]}
          value={text}
          onChangeText={handleChange}
          keyboardType="number-pad"
          editable={!locked}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
        {unit && <Text style={[styles.numberUnit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>
      {min !== undefined && max !== undefined && (
        <Text style={[styles.rangeHint, { color: colors.textMuted }]}>
          Range: {min} - {max}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillInstanceModal({
  visible,
  onClose,
  onConfirm,
  drill,
  template,
}: DrillInstanceModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Determine drill type and source
  const drillTypeId: DrillTypeId | null = useMemo(() => {
    if (template) return template.drillType;
    if (drill) {
      // Map legacy drill_goal to drill type
      if (drill.drill_goal === 'grouping') return 'grouping';
      return 'qualification'; // Default achievement to qualification
    }
    return null;
  }, [drill, template]);

  const drillType = drillTypeId ? DRILL_TYPES[drillTypeId] : null;
  const accentColor = drillType?.color ?? '#3B82F6';
  const Icon = drillTypeId ? TYPE_ICONS[drillTypeId] : Target;

  // Config state - store all params
  const [params, setParams] = useState<Record<string, any>>({});

  // Get display name
  const displayName = template?.name ?? drill?.name ?? 'Configure Drill';
  const displayGoal = template?.goal ?? drill?.description ?? '';

  // Initialize params from template/drill defaults
  useEffect(() => {
    if (!visible) return;

    if (template && drillType) {
      // Use template defaults merged with type defaults
      const merged = mergeWithDefaults(template, {});
      setParams(merged);
    } else if (drill && drillType) {
      // Legacy drill - convert to params
      setParams({
        distance: drill.distance_m ?? drillType.paramDefaults.distance,
        shots: drill.rounds_per_shooter ?? drillType.paramDefaults.shots,
        strings: drill.strings_count ?? 1,
        timeLimit: drill.time_limit_seconds ?? null,
        position: null,
        parTime: null,
        targetCount: 1,
        minScore: 80,
      });
    } else if (drillType) {
      setParams({ ...drillType.paramDefaults });
    }
  }, [visible, drill, template, drillType]);

  // Update single param
  const updateParam = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Check if param is locked
  const isLocked = (param: string): boolean => {
    if (template) {
      return isParamLocked(template, param);
    }
    return false;
  };

  // Get options for a param from type constraints
  const getOptions = (param: string): (number | string | null)[] => {
    if (!drillType) return [];
    const constraint = drillType.paramConstraints[param];
    if (!constraint || constraint.type !== 'options') return [];

    let options = constraint.options ?? [];

    // Apply template constraints
    if (template?.constraints?.allowedDistances && param === 'distance') {
      options = options.filter((o) =>
        template.constraints!.allowedDistances!.includes(o as number)
      );
    }

    return options;
  };

  // Get constraint for a param
  const getConstraint = (param: string): ParamConstraint | null => {
    if (!drillType) return null;
    return drillType.paramConstraints[param] ?? null;
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Convert params to DrillInstanceConfig
    const config: DrillInstanceConfig = {
      distance_m: params.distance ?? 25,
      rounds_per_shooter: params.shots ?? 5,
      strings_count: params.strings ?? 1,
      time_limit_seconds: params.timeLimit ?? null,
    };

    onConfirm(config);
    onClose();
  };

  if (!drillType || (!drill && !template)) return null;

  // Render params based on drill type
  const renderParamControls = () => {
    const sections = drillType.configSections;

    return sections.map((section, sectionIndex) => (
      <Animated.View
        key={section.id}
        entering={FadeInDown.delay(100 + sectionIndex * 50)}
        style={[styles.configSection, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>

        {section.params.map((param) => {
          const constraint = getConstraint(param);
          if (!constraint) return null;

          const locked = isLocked(param);
          const value = params[param];

          if (constraint.type === 'options') {
            const options = getOptions(param);
            if (options.length === 0) return null;

            return (
              <PillSelector
                key={param}
                label={formatParamLabel(param)}
                unit={constraint.unit}
                options={options}
                value={value}
                onChange={(v) => updateParam(param, v)}
                colors={colors}
                accentColor={accentColor}
                locked={locked}
                formatLabel={
                  param === 'timeLimit' || param === 'parTime'
                    ? (v) => (v === null ? 'None' : `${v}s`)
                    : undefined
                }
              />
            );
          }

          if (constraint.type === 'range') {
            return (
              <NumberInput
                key={param}
                label={formatParamLabel(param)}
                unit={constraint.unit}
                value={value}
                onChange={(v) => updateParam(param, v)}
                min={constraint.min}
                max={constraint.max}
                colors={colors}
                accentColor={accentColor}
                locked={locked}
              />
            );
          }

          return null;
        })}
      </Animated.View>
    ));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Plus size={18} color={accentColor} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add to Training</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Drill Info Card */}
        <Animated.View
          entering={FadeInDown.delay(50)}
          style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.drillIcon, { backgroundColor: accentColor + '15' }]}>
            <Icon size={24} color={accentColor} />
          </View>
          <View style={styles.drillInfo}>
            <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.drillMeta}>
              <View style={[styles.drillBadge, { backgroundColor: accentColor + '20' }]}>
                <Text style={[styles.drillBadgeText, { color: accentColor }]}>
                  {drillType.name}
                </Text>
              </View>
              {template?.source === 'library' && (
                <Text style={[styles.sourceText, { color: colors.textMuted }]}>Library</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Goal */}
        {displayGoal && (
          <Animated.View entering={FadeInDown.delay(75)} style={styles.goalContainer}>
            <Text style={[styles.goalLabel, { color: colors.textMuted }]}>Goal</Text>
            <Text style={[styles.goalText, { color: colors.text }]}>{displayGoal}</Text>
          </Animated.View>
        )}

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {renderParamControls()}
        </ScrollView>

        {/* Footer */}
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}
        >
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: accentColor }]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnText}>Add Drill</Text>
            <Check size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatParamLabel(param: string): string {
  const labels: Record<string, string> = {
    distance: 'Distance',
    shots: 'Shots',
    strings: 'Rounds',
    position: 'Position',
    targetSize: 'Target Size',
    parTime: 'Par Time',
    timeLimit: 'Time Limit',
    targetCount: 'Targets',
    minScore: 'Min Score',
  };
  return labels[param] ?? param.charAt(0).toUpperCase() + param.slice(1);
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },

  // Drill Card
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  drillIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfo: {
    flex: 1,
    gap: 8,
  },
  drillName: {
    fontSize: 18,
    fontWeight: '700',
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  drillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sourceText: {
    fontSize: 12,
  },

  // Goal
  goalContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 12,
  },

  // Config Section
  configSection: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },

  // Field
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLocked: {
    opacity: 0.7,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  fieldUnit: {
    fontSize: 12,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Number Input
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  numberInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 14,
  },
  numberUnit: {
    fontSize: 14,
    marginLeft: 8,
  },
  rangeHint: {
    fontSize: 11,
    marginTop: 6,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
