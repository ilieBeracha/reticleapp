/**
 * SessionIntentStep - Step 1: "What am I going to do now?"
 * 
 * Content only - parent handles ScrollView and button.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Crosshair,
  Focus,
  HeartPulse,
  Sliders,
  Trophy,
} from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SessionPurpose } from './sessionCreation.types';

// ============================================================================
// PURPOSE OPTIONS
// ============================================================================

const PURPOSES: {
  id: SessionPurpose;
  label: string;
  hint: string;
  Icon: React.ComponentType<any>;
}[] = [
  { id: 'grouping', label: 'Grouping', hint: 'Precision & dispersion', Icon: Crosshair },
  { id: 'achievement', label: 'Target Hits', hint: 'Zone scoring', Icon: Trophy },
  { id: 'zeroing', label: 'Zeroing', hint: 'Confirm zero', Icon: Focus },
  { id: 'physical', label: 'Stress Drill', hint: 'Physical + pulse', Icon: HeartPulse },
  { id: 'custom', label: 'Custom', hint: 'Manual setup', Icon: Sliders },
];

// ============================================================================
// PROPS
// ============================================================================

interface SessionIntentStepProps {
  selectedPurpose: SessionPurpose | null;
  onSelectPurpose: (purpose: SessionPurpose) => void;
  onUseSavedDrill?: () => void;
}

// ============================================================================
// PURPOSE ROW
// ============================================================================

const PurposeRow = memo(function PurposeRow({
  label,
  hint,
  Icon,
  isSelected,
  onPress,
}: {
  label: string;
  hint: string;
  Icon: React.ComponentType<any>;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isSelected ? colors.text : colors.card,
          borderColor: isSelected ? colors.text : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon
        size={18}
        color={isSelected ? colors.background : colors.textMuted}
        strokeWidth={1.5}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: isSelected ? colors.background : colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.rowHint, { color: isSelected ? `${colors.background}90` : colors.textMuted }]}>
          {hint}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.check, { backgroundColor: colors.background }]}>
          <Check size={10} color={colors.text} strokeWidth={3} />
        </View>
      )}
    </TouchableOpacity>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SessionIntentStep({
  selectedPurpose,
  onSelectPurpose,
  onUseSavedDrill,
}: SessionIntentStepProps) {
  const colors = useColors();

  const handleSelect = useCallback(
    (purpose: SessionPurpose) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectPurpose(purpose);
    },
    [onSelectPurpose]
  );

  return (
    <View style={{ marginTop: 16 }}>
      {/* Header */}
      <Text style={[styles.title, { color: colors.text }]}>Session Type</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        What are you training today?
      </Text>

      {/* Purpose List */}
      <View style={styles.list}>
        {PURPOSES.map((p) => (
          <PurposeRow
            key={p.id}
            {...p}
            isSelected={selectedPurpose === p.id}
            onPress={() => handleSelect(p.id)}
          />
        ))}
      </View>

      {/* Saved Drills Link */}
      {onUseSavedDrill && (
        <TouchableOpacity style={styles.savedLink} onPress={onUseSavedDrill}>
          <Text style={[styles.savedText, { color: colors.textMuted }]}>
            Or choose from saved drills →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowHint: {
    fontSize: 12,
    marginTop: 1,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  savedText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
