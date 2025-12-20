/**
 * Drill Instance Modal - Compact Config
 *
 * Configure instance-specific values when adding a drill to a training.
 */
import { useColors } from '@/hooks/ui/useColors';
import type { DrillTemplate, DrillTypeId, ParamConstraint } from '@/types/drillTypes';
import { DRILL_TYPES } from '@/types/drillTypes';
import type { Drill, DrillInstanceConfig } from '@/types/workspace';
import { isParamLocked, mergeWithDefaults } from '@/utils/drillValidation';
import * as Haptics from 'expo-haptics';
import { Check, Lock, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView as HorizontalScroll,
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

interface DrillInstanceModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (config: DrillInstanceConfig) => void;
  // Support both Drill (legacy) and DrillTemplate (new)
  drill?: Drill | null;
  template?: DrillTemplate | null;
}

// ============================================================================
// PILL SELECTOR COMPONENT (Compact)
// ============================================================================

function PillSelector({
  label,
  hint,
  options,
  value,
  onChange,
  colors,
  locked = false,
  formatLabel,
}: {
  label: string;
  hint?: string | null;
  options: (number | string | null)[];
  value: number | string | null;
  onChange: (val: number | string | null) => void;
  colors: ReturnType<typeof useColors>;
  locked?: boolean;
  formatLabel?: (val: number | string | null) => string;
}) {
  return (
    <View style={[styles.fieldRow, locked && styles.fieldLocked]}>
      <View style={styles.fieldLabelWrap}>
        <View style={styles.fieldLabelRow}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
          {locked && <Lock size={10} color={colors.textMuted} />}
        </View>
        {hint && <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      <HorizontalScroll 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {options.map((opt) => {
          const isSelected = value === opt;
          const displayLabel = formatLabel
            ? formatLabel(opt)
            : opt === null
              ? '—'
              : String(opt);
          return (
            <TouchableOpacity
              key={opt ?? 'none'}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? colors.text : colors.secondary,
                  opacity: locked && !isSelected ? 0.3 : 1,
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
              <Text style={[styles.pillText, { color: isSelected ? colors.background : colors.textMuted }]}>
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </HorizontalScroll>
    </View>
  );
}

// ============================================================================
// NUMBER INPUT COMPONENT (Compact)
// ============================================================================

function NumberInput({
  label,
  hint,
  unit,
  value,
  onChange,
  min,
  max,
  colors,
  locked = false,
}: {
  label: string;
  hint?: string | null;
  unit?: string;
  value: number | null;
  onChange: (val: number | null) => void;
  min?: number;
  max?: number;
  colors: ReturnType<typeof useColors>;
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
    <View style={[styles.fieldRow, locked && styles.fieldLocked]}>
      <View style={styles.fieldLabelWrap}>
        <View style={styles.fieldLabelRow}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
          {locked && <Lock size={10} color={colors.textMuted} />}
        </View>
        {hint && <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      <View style={[styles.numberInputWrap, { backgroundColor: colors.secondary }]}>
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
      if (drill.drill_goal === 'grouping') return 'grouping';
      return 'qualification';
    }
    return null;
  }, [drill, template]);

  const drillType = drillTypeId ? DRILL_TYPES[drillTypeId] : null;

  // Config state
  const [params, setParams] = useState<Record<string, any>>({});
  const initializedDrillIdRef = useRef<string | null>(null);

  // Get display name
  const displayName = template?.name ?? drill?.name ?? 'Configure Drill';
  const currentId = template?.id ?? drill?.id ?? null;
  const isGrouping = drill?.drill_goal === 'grouping' || drillTypeId === 'grouping' || drillTypeId === 'zeroing';

  // Initialize params from template/drill defaults - only when drill changes or modal opens
  useEffect(() => {
    // Skip if not visible
    if (!visible) {
      // Reset the initialized ID when modal closes so next open will re-initialize
      initializedDrillIdRef.current = null;
      return;
    }
    
    // Skip if already initialized for this drill (prevents re-render loop)
    if (currentId && initializedDrillIdRef.current === currentId) {
      return;
    }

    // Mark as initialized
    initializedDrillIdRef.current = currentId;

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
  }, [visible, currentId, template, drill, drillType]);

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

    // Parent handles closing the modal to avoid race conditions
    onConfirm(config);
  };

  if (!drillType || (!drill && !template)) return null;

  // Render params - flat list, no sections
  const renderParamControls = () => {
    const allParams: string[] = [];
    drillType.configSections.forEach((section) => {
      section.params.forEach((param) => allParams.push(param));
    });

    return allParams.map((param) => {
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
            hint={getParamHint(param)}
            options={options}
            value={value}
            onChange={(v) => updateParam(param, v)}
            colors={colors}
            locked={locked}
            formatLabel={
              param === 'timeLimit' || param === 'parTime'
                ? (v) => (v === null ? '—' : `${v}s`)
                : param === 'distance'
                  ? (v) => `${v}m`
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
            hint={getParamHint(param)}
            unit={constraint.unit}
            value={value}
            onChange={(v) => updateParam(param, v)}
            min={constraint.min}
            max={constraint.max}
            colors={colors}
            locked={locked}
          />
        );
      }

      return null;
    });
  };

  const badgeColor = isGrouping ? '#10B981' : '#3B82F6';

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
        {/* Compact Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={[styles.headerBadge, { backgroundColor: badgeColor + '20' }]}>
              <Text style={[styles.headerBadgeText, { color: badgeColor }]}>
                {isGrouping ? 'Grouping' : 'Achievement'}
              </Text>
            </View>
          </View>
        </View>

        {/* Config */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <Text style={[styles.introText, { color: colors.textMuted }]}>
            Configure how this drill will run in the training session.
          </Text>
          
          {renderParamControls()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Check size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add to Training</Text>
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
    shots: 'Shots per round',
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

function getParamHint(param: string): string | null {
  const hints: Record<string, string> = {
    distance: 'How far from target',
    shots: 'Bullets fired each round',
    strings: 'How many times to repeat',
    timeLimit: 'Max time allowed',
    parTime: 'Target completion time',
    targetCount: 'Number of targets',
    minScore: 'Required to pass',
  };
  return hints[param] ?? null;
}

// ============================================================================
// STYLES (Compact)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  introText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },

  // Field Row
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  fieldLocked: {
    opacity: 0.5,
  },
  fieldLabelWrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    width: 100,
    flexShrink: 0,
    marginRight: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 12,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    flexShrink: 0,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },

  // Number Input
  numberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  numberInput: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 6,
    minWidth: 40,
    textAlign: 'center',
  },
  numberUnit: {
    fontSize: 13,
    marginLeft: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
