/**
 * Session Form Components - Compact UI primitives
 * 
 * Design: Inline number input + quick presets side by side
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { Camera, Check, Crosshair, Hand, Minus, Plus, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { DrillGoal, InputMethod } from './useSessionForm';

// ============================================================================
// COLORS
// ============================================================================

export const GOAL_COLORS = {
  grouping: '#10B981',
  achievement: '#3B82F6',
} as const;

// ============================================================================
// COMPACT NUMBER INPUT WITH PRESETS
// ============================================================================

interface CompactNumberInputProps {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  presets: number[];
  min?: number;
  max?: number;
  accentColor: string;
}

export function CompactNumberInput({
  label,
  unit,
  value,
  onChange,
  presets,
  min = 1,
  max = 999,
  accentColor,
}: CompactNumberInputProps) {
  const colors = useColors();
  const [textValue, setTextValue] = useState(String(value));

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  const handleTextChange = (text: string) => {
    setTextValue(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(textValue, 10);
    if (isNaN(num) || num < min) {
      onChange(min);
      setTextValue(String(min));
    } else if (num > max) {
      onChange(max);
      setTextValue(String(max));
    }
  };

  const increment = () => {
    Haptics.selectionAsync();
    onChange(Math.min(max, value + 1));
  };

  const decrement = () => {
    Haptics.selectionAsync();
    onChange(Math.max(min, value - 1));
  };

  return (
    <View style={styles.compactRow}>
      {/* Label */}
      <View style={styles.compactLabelWrap}>
        <Text style={[styles.compactLabel, { color: colors.text }]}>{label}</Text>
        {unit && <Text style={[styles.compactUnit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>

      {/* Input + Presets */}
      <View style={styles.compactInputArea}>
        {/* Stepper */}
        <View style={styles.compactStepper}>
          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}
            onPress={decrement}
            disabled={value <= min}
            hitSlop={8}
          >
            <Minus size={14} color={value <= min ? colors.border : colors.text} />
          </TouchableOpacity>

          <View style={[styles.compactInputBox, { borderColor: accentColor }]}>
            <TextInput
              style={[styles.compactInput, { color: colors.text }]}
              value={textValue}
              onChangeText={handleTextChange}
              onBlur={handleBlur}
              keyboardType="number-pad"
              selectTextOnFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}
            onPress={increment}
            disabled={value >= max}
            hitSlop={8}
          >
            <Plus size={14} color={value >= max ? colors.border : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Presets */}
        <View style={styles.presetChips}>
          {presets.map((preset) => {
            const isSelected = value === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? accentColor : 'transparent',
                    borderColor: isSelected ? accentColor : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange(preset);
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: isSelected ? '#fff' : colors.textMuted },
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// TIME LIMIT SELECTOR (with None option)
// ============================================================================

interface TimeLimitInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  presets: (number | null)[];
  accentColor: string;
}

export function TimeLimitInput({ value, onChange, presets, accentColor }: TimeLimitInputProps) {
  const colors = useColors();
  const hasValue = value !== null;

  return (
    <View style={styles.compactRow}>
      <View style={styles.compactLabelWrap}>
        <Text style={[styles.compactLabel, { color: colors.text }]}>Time</Text>
        <Text style={[styles.compactUnit, { color: colors.textMuted }]}>optional</Text>
      </View>

      <View style={styles.compactInputArea}>
        <View style={styles.presetChips}>
          {presets.map((preset, idx) => {
            const isSelected = value === preset;
            const label = preset === null ? 'None' : `${preset}s`;
            return (
              <TouchableOpacity
                key={preset ?? `none-${idx}`}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? accentColor : 'transparent',
                    borderColor: isSelected ? accentColor : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange(preset);
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: isSelected ? '#fff' : colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// GOAL SELECTOR (Compact)
// ============================================================================

interface GoalSelectorProps {
  value: DrillGoal;
  onChange: (goal: DrillGoal) => void;
}

export function GoalSelector({ value, onChange }: GoalSelectorProps) {
  const colors = useColors();

  const goals: { id: DrillGoal; label: string; Icon: typeof Crosshair }[] = [
    { id: 'grouping', label: 'Grouping', Icon: Crosshair },
    { id: 'achievement', label: 'Achievement', Icon: Trophy },
  ];

  return (
    <View style={styles.goalRow}>
      {goals.map(({ id, label, Icon }) => {
        const isSelected = value === id;
        const color = GOAL_COLORS[id];

        return (
          <TouchableOpacity
            key={id}
            style={[
              styles.goalCard,
              {
                backgroundColor: isSelected ? `${color}12` : colors.card,
                borderColor: isSelected ? color : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(id);
            }}
            activeOpacity={0.7}
          >
            <Icon size={20} color={isSelected ? color : colors.textMuted} />
            <Text style={[styles.goalLabel, { color: isSelected ? color : colors.text }]}>
              {label}
            </Text>
            {isSelected && (
              <View style={[styles.goalCheck, { backgroundColor: color }]}>
                <Check size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// INPUT METHOD SELECTOR (Compact)
// ============================================================================

interface InputMethodSelectorProps {
  value: InputMethod;
  onChange: (method: InputMethod) => void;
  accentColor: string;
  /** Show hint when scan disables watch */
  showWatchHint?: boolean;
}

export function InputMethodSelector({
  value,
  onChange,
  accentColor,
  showWatchHint,
}: InputMethodSelectorProps) {
  const colors = useColors();

  const methods: { id: InputMethod; label: string; Icon: typeof Camera }[] = [
    { id: 'scan', label: 'Scan', Icon: Camera },
    { id: 'manual', label: 'Manual', Icon: Hand },
  ];

  return (
    <View>
      <View style={styles.methodRow}>
        {methods.map(({ id, label, Icon }) => {
          const isSelected = value === id;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.methodCard,
                {
                  backgroundColor: isSelected ? `${accentColor}12` : colors.card,
                  borderColor: isSelected ? accentColor : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(id);
              }}
              activeOpacity={0.7}
            >
              <Icon size={18} color={isSelected ? accentColor : colors.textMuted} />
              <Text style={[styles.methodText, { color: isSelected ? accentColor : colors.text }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {showWatchHint && value === 'scan' && (
        <Text style={[styles.methodHint, { color: colors.textMuted }]}>
          📷 Watch control unavailable with scan
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// SECTION WRAPPER (Simplified)
// ============================================================================

interface FormSectionProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormSection({ label, hint, children }: FormSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
        {hint && <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

// ============================================================================
// LEGACY PILL SELECTOR (kept for backwards compat)
// ============================================================================

interface PillSelectorProps<T> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  formatLabel?: (value: T) => string;
  accentColor?: string;
}

export function PillSelector<T extends number | string | null>({
  options,
  value,
  onChange,
  formatLabel,
  accentColor,
}: PillSelectorProps<T>) {
  const colors = useColors();
  const accent = accentColor || colors.primary;

  return (
    <View style={styles.pillRow}>
      {options.map((opt, idx) => {
        const isSelected = value === opt;
        const label = formatLabel ? formatLabel(opt) : opt === null ? 'None' : String(opt);

        return (
          <TouchableOpacity
            key={String(opt) ?? `null-${idx}`}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected ? accent : colors.card,
                borderColor: isSelected ? accent : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: isSelected ? '#fff' : colors.text }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Compact Number Input
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  compactLabelWrap: {
    flexDirection: 'column',
    gap: 2,
  },
  compactLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactUnit: {
    fontSize: 11,
  },
  compactInputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInputBox: {
    width: 48,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  compactInput: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  presetChips: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Goal Selector
  goalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  goalCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  // Method Selector
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  methodHint: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 11,
  },

  // Pills (legacy)
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: 44,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
