/**
 * DrillFormComponents - Shared UI primitives for drill/session forms
 *
 * Used by:
 * - SessionFormSheet (solo practice)
 * - UnifiedDrillModal (quick drill, template, configure)
 *
 * Design: Tactical, monochromatic with indigo accents for selections
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Circle,
  Crosshair,
  Hand,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export type DrillGoal = 'grouping' | 'achievement';
export type InputMethod = 'scan' | 'manual';

export interface OptionCardProps {
  icon: React.ReactNode;
  Icon?: LucideIcon;
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}

// ============================================================================
// OPTION CARD - Selection card with icon, label, description, radio
// ============================================================================

export function OptionCard({
  icon,
  Icon,
  label,
  description,
  active,
  onPress,
}: OptionCardProps) {
  const colors = useColors();
  // Accent color for selection highlights (blue-grayish)
  const accent = colors.indigo;

  // Determine which icon to render
  const renderIcon = () => {
    if (Icon) {
      return <Icon size={18} color={active ? accent : colors.text} strokeWidth={1.5} />;
    }
    if (active && icon) {
      // Clone icon with accent color when active
      // Handle known icon types
      const iconType = (icon as any)?.type;
      if (iconType === Crosshair) return <Crosshair size={18} color={accent} strokeWidth={1.5} />;
      if (iconType === Trophy) return <Trophy size={18} color={accent} strokeWidth={1.5} />;
      if (iconType === Camera) return <Camera size={18} color={accent} strokeWidth={1.5} />;
      if (iconType === Hand) return <Hand size={18} color={accent} strokeWidth={1.5} />;
    }
    return icon;
  };

  return (
    <TouchableOpacity
      style={[
        styles.optionCard,
        {
          backgroundColor: active ? `${accent}15` : colors.card,
          borderColor: active ? accent : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.optionIconWrap,
          { backgroundColor: active ? `${accent}20` : colors.secondary },
        ]}
      >
        {renderIcon()}
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, { color: active ? accent : colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.optionRadio,
          {
            borderColor: active ? accent : colors.border,
            backgroundColor: active ? accent : 'transparent',
          },
        ]}
      >
        {active && <Circle size={8} color="#fff" fill="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// CONFIG ROW - Inline number input with presets
// ============================================================================

export interface ConfigRowProps {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  presets: number[];
  isLast?: boolean;
}

export function ConfigRow({
  label,
  unit,
  value,
  onChange,
  presets,
  isLast = false,
}: ConfigRowProps) {
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
    <View
      style={[
        styles.configRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.configLeft}>
        <Text style={[styles.configLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.configUnit, { color: colors.textMuted }]}>{unit}</Text>
      </View>
      <View style={styles.configRight}>
        <View style={[styles.inputBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
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
              { backgroundColor: value === p ? colors.primary : colors.secondary },
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
// TIME ROW - Time limit with None toggle
// ============================================================================

export interface TimeRowProps {
  value: number | null;
  onChange: (v: number | null) => void;
  presets: (number | null)[];
  isLast?: boolean;
}

export function TimeRow({ value, onChange, presets, isLast = false }: TimeRowProps) {
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

  const numberPresets = presets.filter((p): p is number => p !== null);

  return (
    <View
      style={[
        styles.configRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.configLeft}>
        <Text style={[styles.configLabel, { color: colors.text }]}>Time Limit</Text>
        <Text style={[styles.configUnit, { color: colors.textMuted }]}>seconds</Text>
      </View>
      <View style={styles.configRight}>
        {/* None toggle */}
        <TouchableOpacity
          style={[
            styles.presetPill,
            { backgroundColor: !hasValue ? colors.primary : colors.secondary },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(null);
            setText('');
          }}
        >
          <Text style={[styles.presetText, { color: !hasValue ? '#fff' : colors.textMuted }]}>
            Off
          </Text>
        </TouchableOpacity>

        {/* Input box */}
        <View
          style={[
            styles.inputBox,
            { backgroundColor: colors.secondary, borderColor: hasValue ? colors.primary : colors.border },
          ]}
        >
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

        {/* Quick presets */}
        {numberPresets.slice(0, 3).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.presetPill,
              { backgroundColor: value === p ? colors.primary : colors.secondary },
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
// SECTION LABEL
// ============================================================================

export function SectionLabel({ children }: { children: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{children}</Text>
  );
}

// ============================================================================
// HINT BOX
// ============================================================================

export function HintBox({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.hintBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {icon || <Camera size={14} color={colors.textMuted} strokeWidth={1.5} />}
      <Text style={[styles.hintText, { color: colors.textMuted }]}>{children}</Text>
    </View>
  );
}

// ============================================================================
// CONFIG CARD WRAPPER
// ============================================================================

export function ConfigCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

// ============================================================================
// PRESETS
// ============================================================================

export const DISTANCE_PRESETS = [7, 15, 25, 50, 100, 200];
export const SHOTS_PRESETS = [3, 5, 10, 15, 20];
export const ROUNDS_PRESETS = [1, 2, 3, 5];
export const TIME_PRESETS: (number | null)[] = [null, 30, 60, 90];

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Config Row
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  configLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  configLabel: {
    fontSize: 14,
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
    width: 44,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    padding: 0,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Hint Box
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },

  // Config Card
  configCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

