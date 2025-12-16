/**
 * Drill Editor Modal - SIMPLIFIED & POLISHED
 *
 * Creates/edits drills with only ESSENTIAL fields:
 * - Name, Description
 * - Goal (grouping/achievement), Target Type (paper/tactical)
 * - Distance, Shots, Time Limit, Strings
 */
import { useColors } from '@/hooks/ui/useColors';
import type { CreateDrillInput, Drill, DrillGoal, TargetType } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Camera, Check, Crosshair, Hand, Target, Trophy, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// CONSTANTS
// ============================================================================
const COLORS = {
  grouping: '#10B981',
  achievement: '#3B82F6',
};

const DISTANCE_OPTIONS = [7, 15, 25, 50, 100, 200];
const SHOTS_OPTIONS = [3, 5, 10, 15, 20, 30];
const STRINGS_OPTIONS = [1, 2, 3, 5, 10];
const TIME_OPTIONS = [null, 30, 60, 120, 300];

// ============================================================================
// TYPES
// ============================================================================
interface DrillEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (drill: CreateDrillInput) => void;
  initialData?: Partial<Drill>;
  mode?: 'create' | 'edit';
}

// ============================================================================
// PILL SELECTOR COMPONENT
// ============================================================================
function PillSelector({
  options,
  value,
  onChange,
  colors,
  accentColor,
  formatLabel,
}: {
  options: (number | null)[];
  value: number | string | null;
  onChange: (val: number | null) => void;
  colors: ReturnType<typeof useColors>;
  accentColor: string;
  formatLabel?: (val: number | null) => string;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt, idx) => {
        const isSelected = value === opt || (opt === null && value === '') || String(value) === String(opt);
        const label = formatLabel ? formatLabel(opt) : opt === null ? 'None' : String(opt);
        return (
          <TouchableOpacity
            key={opt ?? 'none'}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected ? accentColor : colors.card,
                borderColor: isSelected ? accentColor : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: isSelected ? '#fff' : colors.text },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function DrillEditorModal({
  visible,
  onClose,
  onSave,
  initialData,
  mode = 'create',
}: DrillEditorModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Essential fields only
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('achievement');
  const [targetType, setTargetType] = useState<TargetType>('tactical');
  const [distance, setDistance] = useState<number>(25);
  const [shots, setShots] = useState<number>(5);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [strings, setStrings] = useState<number>(1);

  const accentColor = drillGoal === 'grouping' ? COLORS.grouping : COLORS.achievement;

  // Reset on open
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setDrillGoal(initialData.drill_goal || 'achievement');
        setTargetType(initialData.target_type || 'tactical');
        setDistance(initialData.distance_m || 25);
        setShots(initialData.rounds_per_shooter || 5);
        setTimeLimit(initialData.time_limit_seconds || null);
        setStrings(initialData.strings_count || 1);
      } else {
        setName('');
        setDescription('');
        setDrillGoal('achievement');
        setTargetType('tactical');
        setDistance(25);
        setShots(5);
        setTimeLimit(null);
        setStrings(1);
      }
    }
  }, [visible, initialData]);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const drill: CreateDrillInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      drill_goal: drillGoal,
      target_type: drillGoal === 'grouping' ? 'paper' : targetType,
      distance_m: distance,
      rounds_per_shooter: shots,
      time_limit_seconds: timeLimit || undefined,
      strings_count: strings,
    };

    onSave(drill);
    onClose();
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
            <Target size={18} color={accentColor} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {mode === 'edit' ? 'Edit Drill' : 'New Drill'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: canSave ? accentColor : colors.secondary }]}
            onPress={handleSave}
            disabled={!canSave}
            hitSlop={8}
          >
            <Check size={18} color={canSave ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name Input */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>DRILL NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: name ? accentColor : colors.border, color: colors.text }]}
              placeholder="e.g., Bill Drill, Cold Bore..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.inputMulti, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="What's this drill about?"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </Animated.View>

          {/* Goal Selection */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>OBJECTIVE</Text>
            <View style={styles.goalRow}>
              <TouchableOpacity
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: drillGoal === 'grouping' ? COLORS.grouping + '15' : colors.card,
                    borderColor: drillGoal === 'grouping' ? COLORS.grouping : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDrillGoal('grouping');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.goalIcon, { backgroundColor: COLORS.grouping + '20' }]}>
                  <Crosshair size={24} color={COLORS.grouping} />
                </View>
                <Text style={[styles.goalTitle, { color: drillGoal === 'grouping' ? COLORS.grouping : colors.text }]}>
                  Grouping
                </Text>
                <Text style={[styles.goalSubtitle, { color: colors.textMuted }]}>
                  Measure shot dispersion
                </Text>
                {drillGoal === 'grouping' && (
                  <View style={[styles.goalCheck, { backgroundColor: COLORS.grouping }]}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: drillGoal === 'achievement' ? COLORS.achievement + '15' : colors.card,
                    borderColor: drillGoal === 'achievement' ? COLORS.achievement : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDrillGoal('achievement');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.goalIcon, { backgroundColor: COLORS.achievement + '20' }]}>
                  <Trophy size={24} color={COLORS.achievement} />
                </View>
                <Text style={[styles.goalTitle, { color: drillGoal === 'achievement' ? COLORS.achievement : colors.text }]}>
                  Achievement
                </Text>
                <Text style={[styles.goalSubtitle, { color: colors.textMuted }]}>
                  Count hits on target
                </Text>
                {drillGoal === 'achievement' && (
                  <View style={[styles.goalCheck, { backgroundColor: COLORS.achievement }]}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Target Type (achievement only) */}
          {drillGoal === 'achievement' && (
            <Animated.View entering={FadeIn} style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>INPUT METHOD</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: targetType === 'paper' ? accentColor + '15' : colors.card,
                      borderColor: targetType === 'paper' ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('paper');
                  }}
                  activeOpacity={0.7}
                >
                  <Camera size={20} color={targetType === 'paper' ? accentColor : colors.textMuted} />
                  <Text style={[styles.typeText, { color: targetType === 'paper' ? accentColor : colors.text }]}>
                    Scan Target
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: targetType === 'tactical' ? accentColor + '15' : colors.card,
                      borderColor: targetType === 'tactical' ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType('tactical');
                  }}
                  activeOpacity={0.7}
                >
                  <Hand size={20} color={targetType === 'tactical' ? accentColor : colors.textMuted} />
                  <Text style={[styles.typeText, { color: targetType === 'tactical' ? accentColor : colors.text }]}>
                    Manual Entry
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Configuration Section */}
          <Animated.View entering={FadeInDown.delay(200)} style={[styles.configSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.configHeader, { color: colors.text }]}>Configuration</Text>

            {/* Distance */}
            <View style={styles.configItem}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Distance</Text>
              <Text style={[styles.configUnit, { color: colors.textMuted }]}>meters</Text>
            </View>
            <PillSelector
              options={DISTANCE_OPTIONS}
              value={distance}
              onChange={(v) => setDistance(v ?? 25)}
              colors={colors}
              accentColor={accentColor}
            />

            {/* Shots */}
            <View style={[styles.configItem, { marginTop: 20 }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Shots</Text>
              <Text style={[styles.configUnit, { color: colors.textMuted }]}>per entry</Text>
            </View>
            <PillSelector
              options={SHOTS_OPTIONS}
              value={shots}
              onChange={(v) => setShots(v ?? 5)}
              colors={colors}
              accentColor={accentColor}
            />

            {/* Strings/Rounds */}
            <View style={[styles.configItem, { marginTop: 20 }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Rounds</Text>
              <Text style={[styles.configUnit, { color: colors.textMuted }]}>repetitions</Text>
            </View>
            <PillSelector
              options={STRINGS_OPTIONS}
              value={strings}
              onChange={(v) => setStrings(v ?? 1)}
              colors={colors}
              accentColor={accentColor}
            />

            {/* Time Limit */}
            <View style={[styles.configItem, { marginTop: 20 }]}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Time Limit</Text>
              <Text style={[styles.configUnit, { color: colors.textMuted }]}>optional</Text>
            </View>
            <PillSelector
              options={TIME_OPTIONS}
              value={timeLimit}
              onChange={setTimeLimit}
              colors={colors}
              accentColor={accentColor}
              formatLabel={(v) => (v === null ? 'None' : `${v}s`)}
            />
          </Animated.View>
        </ScrollView>
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
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },

  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  input: {
    fontSize: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  inputMulti: {
    fontSize: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Goal Cards
  goalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  goalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  goalCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Type Cards
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Config Section
  configSection: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  configHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  configUnit: {
    fontSize: 13,
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
});
