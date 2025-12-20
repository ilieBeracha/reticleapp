/**
 * Quick Drill Modal
 *
 * Minimal drill creation for use inside Create Training:
 * - name
 * - drill_goal (grouping/achievement)
 * - target_type (paper/tactical) (forced to paper for grouping)
 */
import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal, DrillInstanceConfig, TargetType } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Check, Target, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type QuickDrillDraft = {
  name: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
};

export type QuickDrillPayload = {
  draft: QuickDrillDraft;
  instance: DrillInstanceConfig;
};

const DISTANCE_OPTIONS = [7, 15, 25, 50, 100, 200];
const SHOTS_OPTIONS = [3, 5, 10, 15, 20, 30];
const STRINGS_OPTIONS = [1, 2, 3, 5, 10];
const TIME_OPTIONS: (number | null)[] = [null, 30, 60, 120, 300];

export function QuickDrillModal({
  visible,
  onClose,
  onSave,
  initial,
  title = 'Quick Drill',
  saving = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: QuickDrillPayload) => void;
  initial?: Partial<QuickDrillDraft>;
  title?: string;
  saving?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState<DrillGoal>('achievement');
  const [targetType, setTargetType] = useState<TargetType>('tactical');
  const [distance, setDistance] = useState<number>(25);
  const [shots, setShots] = useState<number>(5);
  const [strings, setStrings] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setGoal(initial?.drill_goal ?? 'achievement');
    setTargetType(initial?.target_type ?? 'tactical');
    setDistance(25);
    setShots(5);
    setStrings(1);
    setTimeLimit(null);
  }, [visible, initial?.name, initial?.drill_goal, initial?.target_type]);

  // Grouping drills are scan/paper-only in this product.
  useEffect(() => {
    if (goal === 'grouping') {
      setTargetType('paper');
    }
  }, [goal]);

  const canSave = useMemo(
    () => name.trim().length > 0 && distance > 0 && shots > 0 && strings > 0,
    [name, distance, shots, strings]
  );

  const handleSave = () => {
    if (!canSave || saving) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      draft: {
        name: name.trim(),
        drill_goal: goal,
        target_type: goal === 'grouping' ? 'paper' : targetType,
      },
      instance: {
        distance_m: distance,
        rounds_per_shooter: shots,
        strings_count: strings,
        time_limit_seconds: timeLimit,
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
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
            <Target size={18} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: canSave && !saving ? colors.primary : colors.secondary },
            ]}
            onPress={handleSave}
            disabled={!canSave || saving}
            hitSlop={8}
          >
            <Check size={18} color={canSave ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          {/* Name */}
          <Text style={[styles.label, { color: colors.textMuted }]}>DRILL NAME</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: name.trim() ? colors.primary : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="e.g. Bill Drill"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
          />

          {/* Goal */}
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>GOAL</Text>
          <View style={[styles.segmented, { backgroundColor: colors.secondary }]}>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                goal === 'grouping' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setGoal('grouping');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentedText, { color: goal === 'grouping' ? '#fff' : colors.text }]}>
                Grouping
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                goal === 'achievement' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setGoal('achievement');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentedText, { color: goal === 'achievement' ? '#fff' : colors.text }]}>
                Achievement
              </Text>
            </TouchableOpacity>
          </View>

          {/* Target Type */}
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>TARGET TYPE</Text>
          <View style={[styles.segmented, { backgroundColor: colors.secondary }]}>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                (goal === 'grouping' || targetType === 'paper') && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                if (goal === 'grouping') return;
                Haptics.selectionAsync();
                setTargetType('paper');
              }}
              activeOpacity={goal === 'grouping' ? 1 : 0.8}
              disabled={goal === 'grouping'}
            >
              <Text style={[styles.segmentedText, { color: (goal === 'grouping' || targetType === 'paper') ? '#fff' : colors.text }]}>
                Paper
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                goal !== 'grouping' && targetType === 'tactical' && { backgroundColor: colors.primary },
                goal === 'grouping' && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (goal === 'grouping') return;
                Haptics.selectionAsync();
                setTargetType('tactical');
              }}
              activeOpacity={goal === 'grouping' ? 1 : 0.8}
              disabled={goal === 'grouping'}
            >
              <Text style={[styles.segmentedText, { color: goal !== 'grouping' && targetType === 'tactical' ? '#fff' : colors.text }]}>
                Tactical
              </Text>
            </TouchableOpacity>
          </View>

          {goal === 'grouping' && (
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Grouping drills use paper targets (scan).
            </Text>
          )}

          {/* Instance Config */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.label, { color: colors.textMuted }]}>RUN CONFIG</Text>

          <Text style={[styles.smallLabel, { color: colors.textMuted }]}>Distance</Text>
          <View style={styles.pillRow}>
            {DISTANCE_OPTIONS.map((opt) => {
              const selected = distance === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDistance(opt);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, { color: selected ? '#fff' : colors.text }]}>{opt}m</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.smallLabel, { color: colors.textMuted, marginTop: 12 }]}>Shots</Text>
          <View style={styles.pillRow}>
            {SHOTS_OPTIONS.map((opt) => {
              const selected = shots === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShots(opt);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, { color: selected ? '#fff' : colors.text }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.smallLabel, { color: colors.textMuted, marginTop: 12 }]}>Rounds</Text>
          <View style={styles.pillRow}>
            {STRINGS_OPTIONS.map((opt) => {
              const selected = strings === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setStrings(opt);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, { color: selected ? '#fff' : colors.text }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.smallLabel, { color: colors.textMuted, marginTop: 12 }]}>Time Limit</Text>
          <View style={styles.pillRow}>
            {TIME_OPTIONS.map((opt) => {
              const selected = timeLimit === opt;
              const label = opt === null ? 'None' : `${opt}s`;
              return (
                <TouchableOpacity
                  key={opt ?? 'none'}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTimeLimit(opt);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, { color: selected ? '#fff' : colors.text }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentedOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
});


