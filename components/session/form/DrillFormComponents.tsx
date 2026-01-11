/**
 * Drill Form Components
 * 
 * Shared form components for drill configuration.
 * Used by UnifiedDrillModal and other drill-related forms.
 * 
 * TODO: Implement full form components when needed.
 */
import { useColors } from '@/hooks/ui/useColors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// PRESETS
// ============================================================================

export const DISTANCE_PRESETS = [7, 10, 15, 25, 50, 100, 200, 300];
export const SHOTS_PRESETS = [5, 10, 15, 20, 25, 30, 50];
export const ROUNDS_PRESETS = [1, 2, 3, 5, 10];
export const TIME_PRESETS = [30, 60, 90, 120, 180, 300];

// ============================================================================
// SECTION LABEL
// ============================================================================

interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
      {children}
    </Text>
  );
}

// ============================================================================
// HINT BOX
// ============================================================================

interface HintBoxProps {
  children: React.ReactNode;
}

export function HintBox({ children }: HintBoxProps) {
  const colors = useColors();
  return (
    <View style={[styles.hintBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.hintText, { color: colors.secondary }]}>
        {children}
      </Text>
    </View>
  );
}

// ============================================================================
// CONFIG CARD
// ============================================================================

interface ConfigCardProps {
  children: React.ReactNode;
  style?: any;
}

export function ConfigCard({ children, style }: ConfigCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.configCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

// ============================================================================
// CONFIG ROW
// ============================================================================

interface ConfigRowProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
  unit?: string;
  value?: number;
  onChange?: (value: number) => void;
  presets?: number[];
}

export function ConfigRow({ label, children, hint, unit }: ConfigRowProps) {
  const colors = useColors();
  return (
    <View style={styles.configRow}>
      <View style={styles.configRowHeader}>
        <Text style={[styles.configRowLabel, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[styles.configRowHint, { color: colors.secondary }]}>{hint}</Text>}
      </View>
      <View style={styles.configRowContent}>{children}</View>
    </View>
  );
}

// ============================================================================
// OPTION CARD
// ============================================================================

interface OptionCardProps {
  label: string;
  selected?: boolean;
  active?: boolean; // Alias for selected
  onPress?: () => void;
  icon?: React.ReactNode;
  description?: string;
}

export function OptionCard({ label, selected, active, onPress, icon, description }: OptionCardProps) {
  const isSelected = selected ?? active ?? false;
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.optionCard,
        { 
          backgroundColor: isSelected ? colors.accent + '20' : colors.cardBackground,
          borderColor: isSelected ? colors.accent : colors.border,
        },
      ]}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.optionIcon}>{icon}</View>}
      <Text style={[styles.optionLabel, { color: isSelected ? colors.accent : colors.text }]}>
        {label}
      </Text>
      {description && (
        <Text style={[styles.optionDescription, { color: colors.secondary }]}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// TIME ROW
// ============================================================================

interface TimeRowProps {
  value: number;
  onChange: (value: number) => void;
  presets?: number[];
  label?: string;
}

export function TimeRow({ value, onChange, presets = TIME_PRESETS, label }: TimeRowProps) {
  const colors = useColors();
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <View style={styles.timeRow}>
      {label && <Text style={[styles.timeLabel, { color: colors.text }]}>{label}</Text>}
      <View style={styles.timePresets}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset}
            onPress={() => onChange(preset)}
            style={[
              styles.timePreset,
              {
                backgroundColor: value === preset ? colors.accent : colors.cardBackground,
                borderColor: value === preset ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={[styles.timePresetText, { color: value === preset ? '#fff' : colors.text }]}>
              {formatTime(preset)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  hintBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
  },
  configCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  configRow: {
    marginBottom: 16,
  },
  configRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configRowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  configRowHint: {
    fontSize: 12,
  },
  configRowContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 80,
  },
  optionIcon: {
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  timeRow: {
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  timePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePreset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timePresetText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
