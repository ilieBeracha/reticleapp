/**
 * DrillQuickAdd - Quick drill configuration
 *
 * Quick flow:
 * 1. Select goal (grouping/engagement)
 * 2. Set distance, shots, strings, time
 * 3. Done
 *
 * NOTE: Configures drill params only. Execution via startEngagement.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { Check, Clock, Crosshair, Layers, MapPin, Target, X, Zap } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Drill } from '@/types/workspace';
import type { TrainingDrillItem } from '../createTraining.types';

// ============================================================================
// TYPES
// ============================================================================

interface DrillQuickAddProps {
  visible: boolean;
  teamDrills: Drill[];
  onAdd: (drill: TrainingDrillItem) => void;
  onClose: () => void;
}

type DrillGoal = 'grouping' | 'engagement';

// ============================================================================
// CONSTANTS
// ============================================================================

const DISTANCE_PRESETS = [25, 50, 100, 200, 300, 400, 500];
const SHOTS_PRESETS = [3, 5, 10, 15, 20, 25];
const STRINGS_PRESETS = [1, 2, 3, 4, 5];
const TIME_PRESETS = [
  { value: null, label: 'No limit' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
];

const GOAL_CONFIG = {
  grouping: {
    color: '#10B981',
    icon: Target,
    label: 'Grouping',
    shortLabel: 'GRP',
    description: 'Measure precision & dispersion',
  },
  engagement: {
    color: '#F59E0B',
    icon: Crosshair,
    label: 'Engagement',
    shortLabel: 'ENG',
    description: 'Hit targets, track accuracy %',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DrillQuickAdd({ visible, teamDrills, onAdd, onClose }: DrillQuickAddProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // State
  const [mode, setMode] = useState<'library' | 'create'>('create');
  const [goal, setGoal] = useState<DrillGoal>('grouping');
  const [distance, setDistance] = useState(100);
  const [shots, setShots] = useState(5);
  const [strings, setStrings] = useState(1);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');

  // Computed
  const totalShots = shots * strings;
  const goalConfig = GOAL_CONFIG[goal];
  const GoalIcon = goalConfig.icon;

  // Reset on close
  const handleClose = useCallback(() => {
    setMode('create');
    setGoal('grouping');
    setDistance(100);
    setShots(5);
    setStrings(1);
    setTimeLimit(null);
    setCustomName('');
    onClose();
  }, [onClose]);

  // Add from preset
  const handleSelectPreset = useCallback(
    (drill: Drill) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAdd({
        id: Date.now().toString(),
        drill_id: drill.id,
        name: drill.name,
        drill_goal: drill.drill_goal,
        target_type: drill.target_type,
        description: drill.description || undefined,
        distance_m: drill.distance_m,
        rounds_per_shooter: drill.rounds_per_shooter,
        time_limit_seconds: drill.time_limit_seconds || undefined,
        strings_count: drill.strings_count || 1,
      });
      handleClose();
    },
    [onAdd, handleClose]
  );

  // Add custom
  const handleAddCustom = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd({
      id: Date.now().toString(),
      name: customName.trim() || `${goalConfig.label} ${distance}m`,
      drill_goal: goal,
      target_type: goal === 'grouping' ? 'paper' : 'tactical',
      distance_m: distance,
      rounds_per_shooter: shots,
      strings_count: strings,
      time_limit_seconds: timeLimit || undefined,
    });
    handleClose();
  }, [goal, distance, shots, strings, timeLimit, customName, goalConfig, onAdd, handleClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Drill</Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Mode Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.tabs, { backgroundColor: colors.secondary }]}>
            <TouchableOpacity
              style={[styles.tab, mode === 'create' && [styles.tabActive, { backgroundColor: colors.card }]]}
              onPress={() => setMode('create')}
            >
              <Zap size={14} color={mode === 'create' ? colors.text : colors.textMuted} />
              <Text style={[styles.tabText, { color: mode === 'create' ? colors.text : colors.textMuted }]}>
                Quick Create
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'library' && [styles.tabActive, { backgroundColor: colors.card }]]}
              onPress={() => setMode('library')}
            >
              <Layers size={14} color={mode === 'library' ? colors.text : colors.textMuted} />
              <Text style={[styles.tabText, { color: mode === 'library' ? colors.text : colors.textMuted }]}>
                From Library ({teamDrills.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'library' ? (
            /* Library Selection */
            <Animated.View entering={FadeIn.duration(200)}>
              {teamDrills.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                    <Layers size={32} color={colors.textMuted} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved drills</Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Create drills to reuse them later</Text>
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: colors.text }]}
                    onPress={() => setMode('create')}
                  >
                    <Text style={[styles.emptyBtnText, { color: colors.background }]}>Create Now →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.presetList}>
                  {teamDrills.map((drill, idx) => {
                    const drillGoal = GOAL_CONFIG[drill.drill_goal as keyof typeof GOAL_CONFIG] || GOAL_CONFIG.grouping;
                    const DrillIcon = drillGoal.icon;
                    const drillTotalShots = drill.rounds_per_shooter * (drill.strings_count || 1);

                    return (
                      <Animated.View key={drill.id} entering={FadeInDown.delay(idx * 30).duration(200)}>
                        <TouchableOpacity
                          style={[styles.presetRow, { backgroundColor: colors.card }]}
                          onPress={() => handleSelectPreset(drill)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.presetIcon, { backgroundColor: `${drillGoal.color}15` }]}>
                            <DrillIcon size={20} color={drillGoal.color} />
                          </View>
                          <View style={styles.presetInfo}>
                            <Text style={[styles.presetName, { color: colors.text }]} numberOfLines={1}>
                              {drill.name}
                            </Text>
                            <View style={styles.presetMeta}>
                              <Text style={[styles.presetMetaText, { color: colors.textMuted }]}>
                                {drill.distance_m}m
                              </Text>
                              <View style={[styles.presetDot, { backgroundColor: colors.textMuted }]} />
                              <Text style={[styles.presetMetaText, { color: colors.textMuted }]}>
                                {drillTotalShots} shots
                              </Text>
                              {drill.time_limit_seconds && (
                                <>
                                  <View style={[styles.presetDot, { backgroundColor: colors.textMuted }]} />
                                  <Text style={[styles.presetMetaText, { color: colors.textMuted }]}>
                                    {drill.time_limit_seconds}s
                                  </Text>
                                </>
                              )}
                            </View>
                          </View>
                          <View style={[styles.presetBadge, { backgroundColor: `${drillGoal.color}15` }]}>
                            <Text style={[styles.presetBadgeText, { color: drillGoal.color }]}>
                              {drillGoal.shortLabel}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          ) : (
            /* Quick Create */
            <Animated.View entering={FadeIn.duration(200)} style={styles.form}>
              {/* Goal Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>What's the goal?</Text>
                <View style={styles.goalCards}>
                  {(['grouping', 'engagement'] as const).map((g) => {
                    const config = GOAL_CONFIG[g];
                    const Icon = config.icon;
                    const isSelected = goal === g;

                    return (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.goalCard,
                          {
                            backgroundColor: isSelected ? `${config.color}10` : colors.card,
                            borderColor: isSelected ? config.color : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setGoal(g);
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.goalCardIcon,
                            { backgroundColor: isSelected ? config.color : colors.secondary },
                          ]}
                        >
                          <Icon size={22} color={isSelected ? '#fff' : colors.textMuted} />
                        </View>
                        <Text style={[styles.goalCardLabel, { color: isSelected ? config.color : colors.text }]}>
                          {config.label}
                        </Text>
                        <Text style={[styles.goalCardDesc, { color: colors.textMuted }]} numberOfLines={1}>
                          {config.description}
                        </Text>
                        {isSelected && (
                          <View style={[styles.goalCardCheck, { backgroundColor: config.color }]}>
                            <Check size={12} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Distance */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MapPin size={16} color={colors.textMuted} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Distance</Text>
                </View>
                <View style={styles.chipGrid}>
                  {DISTANCE_PRESETS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: distance === d ? colors.text : colors.card,
                          borderColor: distance === d ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setDistance(d);
                      }}
                    >
                      <Text style={[styles.chipText, { color: distance === d ? colors.background : colors.text }]}>
                        {d}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Shots & Strings */}
              <View style={styles.sectionRow}>
                <View style={[styles.section, { flex: 1 }]}>
                  <View style={styles.sectionHeader}>
                    <Target size={16} color={colors.textMuted} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Shots</Text>
                  </View>
                  <View style={styles.chipGrid}>
                    {SHOTS_PRESETS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.chipSmall,
                          {
                            backgroundColor: shots === s ? colors.text : colors.card,
                            borderColor: shots === s ? colors.text : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setShots(s);
                        }}
                      >
                        <Text style={[styles.chipText, { color: shots === s ? colors.background : colors.text }]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.sectionDivider} />

                <View style={[styles.section, { flex: 0.6 }]}>
                  <View style={styles.sectionHeader}>
                    <Layers size={16} color={colors.textMuted} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Strings</Text>
                  </View>
                  <View style={styles.chipGrid}>
                    {STRINGS_PRESETS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.chipSmall,
                          {
                            backgroundColor: strings === s ? goalConfig.color : colors.card,
                            borderColor: strings === s ? goalConfig.color : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setStrings(s);
                        }}
                      >
                        <Text style={[styles.chipText, { color: strings === s ? '#fff' : colors.text }]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Total Shots Indicator */}
              <View style={[styles.totalBar, { backgroundColor: colors.card }]}>
                <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total shots per shooter:</Text>
                <Text style={[styles.totalValue, { color: goalConfig.color }]}>{totalShots}</Text>
                <Text style={[styles.totalCalc, { color: colors.textMuted }]}>
                  ({shots} × {strings} {strings > 1 ? 'strings' : 'string'})
                </Text>
              </View>

              {/* Time Limit */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={16} color={colors.textMuted} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Limit</Text>
                  <Text style={[styles.sectionOptional, { color: colors.textMuted }]}>(optional)</Text>
                </View>
                <View style={styles.chipGrid}>
                  {TIME_PRESETS.map((t) => (
                    <TouchableOpacity
                      key={t.label}
                      style={[
                        styles.chipTime,
                        {
                          backgroundColor: timeLimit === t.value ? colors.text : colors.card,
                          borderColor: timeLimit === t.value ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTimeLimit(t.value);
                      }}
                    >
                      <Text
                        style={[styles.chipText, { color: timeLimit === t.value ? colors.background : colors.text }]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Name */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[
                    styles.nameInput,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder={`${goalConfig.label} ${distance}m`}
                  placeholderTextColor={colors.textMuted}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Floating Add Button (only for create mode) */}
        {mode === 'create' && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.floatingBtn, { backgroundColor: colors.background, paddingBottom: insets.bottom + 12 }]}
          >
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: goalConfig.color }]}
              onPress={handleAddCustom}
              activeOpacity={0.85}
            >
              <GoalIcon size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add {customName.trim() || `${goalConfig.label} ${distance}m`}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // Tabs
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Form
  form: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  sectionDivider: {
    width: 1,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionOptional: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Goal Cards
  goalCards: {
    flexDirection: 'row',
    gap: 12,
  },
  goalCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 10,
  },
  goalCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCardLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  goalCardDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  goalCardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  chipSmall: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  chipTime: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Total Bar
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  totalCalc: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Name Input
  nameInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Preset List
  presetList: {
    gap: 10,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  presetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  presetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  presetMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  presetDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  presetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Floating Button
  floatingBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 10,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
