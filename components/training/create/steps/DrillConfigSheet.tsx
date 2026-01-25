/**
 * DrillConfigSheet - Configure drill instance before adding to training
 *
 * Allows customizing: distance, shots, time limit, weapon category
 */

import { useColors } from '@/hooks/ui/useColors';
import { getCategoryLabel, WEAPON_CATEGORIES } from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Check, Clock, Crosshair, MapPin, Target, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Drill } from '@/types/workspace';
import type { NewDrillInstanceConfig } from '../createTraining.types';

interface DrillConfigSheetProps {
  visible: boolean;
  drill: Drill | null;
  onConfirm: (config: NewDrillInstanceConfig) => void;
  onClose: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DISTANCE_PRESETS = [25, 50, 100, 200, 300];
const SHOTS_PRESETS = [3, 5, 10, 15, 20];
const TIME_PRESETS = [null, 30, 60, 90, 120, 180];
const STRINGS_PRESETS = [1, 2, 3, 5];

const GOAL_COLORS: Record<string, string> = {
  grouping: '#10B981',
  engagement: '#F59E0B',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DrillConfigSheet({ visible, drill, onConfirm, onClose }: DrillConfigSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Config state - initialized from drill when it changes
  const [distance, setDistance] = useState(drill?.distance_m || 100);
  const [shots, setShots] = useState(drill?.rounds_per_shooter || 5);
  const [timeLimit, setTimeLimit] = useState<number | null>(drill?.time_limit_seconds || null);
  const [strings, setStrings] = useState(drill?.strings_count || 1);
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory | null>(drill?.weapon_category || null);
  const [customDistance, setCustomDistance] = useState('');
  const [customShots, setCustomShots] = useState('');

  // Reset when drill changes
  const resetConfig = useCallback(() => {
    if (drill) {
      setDistance(drill.distance_m);
      setShots(drill.rounds_per_shooter);
      setTimeLimit(drill.time_limit_seconds || null);
      setStrings(drill.strings_count || 1);
      setWeaponCategory(drill.weapon_category || null);
      setCustomDistance('');
      setCustomShots('');
    }
  }, [drill]);

  // Handlers
  const handleConfirm = useCallback(() => {
    if (!drill) return;

    const inputMethod = drill.drill_goal === 'grouping' ? 'scan' : 'manual';

    onConfirm({
      distance_m: distance,
      rounds_per_shooter: shots,
      time_limit_seconds: timeLimit,
      strings_count: strings,
      weapon_category: weaponCategory,
      input_method: inputMethod,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [drill, distance, shots, timeLimit, strings, weaponCategory, onConfirm]);

  const handleDistancePreset = (val: number) => {
    Haptics.selectionAsync();
    setDistance(val);
    setCustomDistance('');
  };

  const handleCustomDistance = (text: string) => {
    setCustomDistance(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      setDistance(num);
    }
  };

  const handleShotsPreset = (val: number) => {
    Haptics.selectionAsync();
    setShots(val);
    setCustomShots('');
  };

  const handleCustomShots = (text: string) => {
    setCustomShots(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      setShots(num);
    }
  };

  if (!drill) return null;

  const goalColor = GOAL_COLORS[drill.drill_goal];
  const totalShots = shots * strings;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={resetConfig}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Configure Drill</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={handleConfirm}>
            <Check size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Drill Info */}
          <View style={[styles.drillInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.goalIndicator, { backgroundColor: goalColor }]} />
            <View style={styles.drillInfoContent}>
              <Text style={[styles.drillName, { color: colors.text }]}>{drill.name}</Text>
              <Text style={[styles.drillType, { color: colors.textMuted }]}>
                {drill.drill_goal === 'grouping' ? 'Grouping Drill' : 'Achievement Drill'}
              </Text>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Distance</Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>{distance}m</Text>
            </View>
            <View style={styles.presetRow}>
              {DISTANCE_PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: distance === val && !customDistance ? colors.text : 'transparent',
                      borderColor: distance === val && !customDistance ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => handleDistancePreset(val)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: distance === val && !customDistance ? colors.background : colors.text },
                    ]}
                  >
                    {val}m
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: customDistance ? colors.text : colors.card,
                    borderColor: customDistance ? colors.text : colors.border,
                    color: customDistance ? colors.background : colors.text,
                  },
                ]}
                placeholder="..."
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={customDistance}
                onChangeText={handleCustomDistance}
              />
            </View>
          </View>

          {/* Shots */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={14} color={colors.textMuted} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Shots per round</Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>{shots}</Text>
            </View>
            <View style={styles.presetRow}>
              {SHOTS_PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: shots === val && !customShots ? colors.text : 'transparent',
                      borderColor: shots === val && !customShots ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => handleShotsPreset(val)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: shots === val && !customShots ? colors.background : colors.text },
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: customShots ? colors.text : colors.card,
                    borderColor: customShots ? colors.text : colors.border,
                    color: customShots ? colors.background : colors.text,
                  },
                ]}
                placeholder="..."
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={customShots}
                onChangeText={handleCustomShots}
              />
            </View>
          </View>

          {/* Strings (Rounds) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={14} color={colors.textMuted} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Strings</Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>{strings}x</Text>
            </View>
            <View style={styles.presetRow}>
              {STRINGS_PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: strings === val ? colors.text : 'transparent',
                      borderColor: strings === val ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setStrings(val);
                  }}
                >
                  <Text style={[styles.presetText, { color: strings === val ? colors.background : colors.text }]}>
                    {val}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Limit */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Time Limit</Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>{timeLimit ? `${timeLimit}s` : 'None'}</Text>
            </View>
            <View style={styles.presetRow}>
              {TIME_PRESETS.map((val, i) => (
                <TouchableOpacity
                  key={val ?? 'none'}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: timeLimit === val ? colors.text : 'transparent',
                      borderColor: timeLimit === val ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTimeLimit(val);
                  }}
                >
                  <Text style={[styles.presetText, { color: timeLimit === val ? colors.background : colors.text }]}>
                    {val ? `${val}s` : 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weapon Category */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Crosshair size={14} color={colors.textMuted} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon Category</Text>
            </View>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Optional: Filter which weapons soldiers can use
            </Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: weaponCategory === null ? colors.text : 'transparent',
                    borderColor: weaponCategory === null ? colors.text : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setWeaponCategory(null);
                }}
              >
                <Text style={[styles.presetText, { color: weaponCategory === null ? colors.background : colors.text }]}>
                  Any
                </Text>
              </TouchableOpacity>
              {WEAPON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: weaponCategory === cat.value ? colors.text : 'transparent',
                      borderColor: weaponCategory === cat.value ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWeaponCategory(cat.value);
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: weaponCategory === cat.value ? colors.background : colors.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Summary */}
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total shots:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalShots}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Input method:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {drill.drill_goal === 'grouping' ? '📷 Scan' : '✋ Manual'}
              </Text>
            </View>
            {weaponCategory && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Weapon:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{getCategoryLabel(weaponCategory)}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.text }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={[styles.addBtnText, { color: colors.background }]}>Add to Training</Text>
            <Check size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  // Drill Info
  drillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  goalIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  drillInfoContent: {
    flex: 1,
  },
  drillName: {
    fontSize: 16,
    fontWeight: '600',
  },
  drillType: {
    fontSize: 13,
    marginTop: 2,
  },
  // Section
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: -4,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
  },
  customInput: {
    width: 50,
    height: 34,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  // Summary
  summary: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
