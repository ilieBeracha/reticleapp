/**
 * DrillAdjustModal - Quick Drill Adjustment
 *
 * Simple modal to adjust drill parameters:
 * - Distance
 * - Rounds
 * - Time limit
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { Clock, MapPin, Target, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TrainingDrillItem } from '../createTraining.types';

// ============================================================================
// TYPES
// ============================================================================

interface DrillAdjustModalProps {
  visible: boolean;
  drill: TrainingDrillItem | null;
  onClose: () => void;
  onSave: (updated: TrainingDrillItem) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DISTANCES = {
  grouping: [25, 50, 100, 200, 300],
  engagement: [7, 15, 25, 50, 100],
};

const ROUNDS = {
  grouping: [3, 5, 10, 20],
  engagement: [5, 10, 15, 20, 30],
};

const TIME_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No Limit' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
];

// ============================================================================
// OPTION BUTTON
// ============================================================================

function OptionButton({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionBtn, { backgroundColor: active ? colors.text : colors.secondary }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionText, { color: active ? colors.background : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillAdjustModal({ visible, drill, onClose, onSave }: DrillAdjustModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [distance, setDistance] = useState(100);
  const [rounds, setRounds] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  // Sync state when drill changes
  useEffect(() => {
    if (drill) {
      setDistance(drill.distance_m);
      setRounds(drill.rounds_per_shooter);
      setTimeLimit(drill.time_limit_seconds ?? null);
    }
  }, [drill]);

  const handleSave = () => {
    if (!drill) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      ...drill,
      distance_m: distance,
      rounds_per_shooter: rounds,
      time_limit_seconds: timeLimit ?? undefined,
    });
    onClose();
  };

  if (!drill) return null;

  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? '#22C55E' : '#F59E0B';
  const availableDistances = isGrouping ? DISTANCES.grouping : DISTANCES.engagement;
  const availableRounds = isGrouping ? ROUNDS.grouping : ROUNDS.engagement;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.goalBadge, { backgroundColor: goalColor + '20' }]}>
                  <View style={[styles.goalDot, { backgroundColor: goalColor }]} />
                  <Text style={[styles.goalText, { color: goalColor }]}>{isGrouping ? 'Grouping' : 'Engagement'}</Text>
                </View>
                <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                  {drill.name}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Distance */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <MapPin size={16} color={colors.textMuted} />
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Distance</Text>
              </View>
              <View style={styles.optionsRow}>
                {availableDistances.map((d) => (
                  <OptionButton
                    key={d}
                    label={`${d}m`}
                    active={distance === d}
                    onPress={() => setDistance(d)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>

            {/* Rounds */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Target size={16} color={colors.textMuted} />
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Rounds</Text>
              </View>
              <View style={styles.optionsRow}>
                {availableRounds.map((r) => (
                  <OptionButton
                    key={r}
                    label={String(r)}
                    active={rounds === r}
                    onPress={() => setRounds(r)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>

            {/* Time Limit */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Clock size={16} color={colors.textMuted} />
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Time Limit</Text>
              </View>
              <View style={styles.optionsRow}>
                {TIME_OPTIONS.map((t) => (
                  <OptionButton
                    key={t.label}
                    label={t.label}
                    active={timeLimit === t.value}
                    onPress={() => setTimeLimit(t.value)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>

            {/* Summary */}
            <View style={[styles.summary, { backgroundColor: colors.card }]}>
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {drill.name} · {distance}m · {rounds} rds{timeLimit ? ` · ${timeLimit}s` : ''}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.text }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={[styles.saveBtnText, { color: colors.background }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  goalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  goalText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drillName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Fields
  fieldSection: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary
  summary: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
