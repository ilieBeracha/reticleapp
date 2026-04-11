/**
 * TrainingDrillsStep - Clean drill selection
 *
 * Step 2 of training creation: Add and configure drills
 * Design inspired by DrillPresetPicker for consistency
 *
 * NOTE: Defines drill configs for training context only.
 * Execution happens via startEngagement.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Crosshair,
  Plus,
  Search,
  Target,
  X
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

import type { Drill } from '@/types/workspace';
import type { TrainingDrillItem } from '@/types/createTraining';

interface TrainingDrillsStepProps {
  drills: TrainingDrillItem[];
  teamDrills: Drill[];
  hasTeam: boolean;
  canCreateDrills: boolean;
  onBack: () => void;
  onSelectDrill: (drill: Drill) => void;
  onRemoveDrill: (id: string) => void;
  onMoveDrill: (index: number, direction: 'up' | 'down') => void;
  onCreateNew: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const getGoalConfig = (t: (key: string) => string) => ({
  grouping: {
    color: '#10B981',
    label: t('session.grouping'),
    icon: Target,
  },
  engagement: {
    color: '#F59E0B',
    label: t('session.engagement'),
    icon: Crosshair,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TrainingDrillsStep({
  drills,
  teamDrills,
  hasTeam,
  canCreateDrills,
  onBack,
  onSelectDrill,
  onRemoveDrill,
  onMoveDrill,
  onCreateNew,
}: TrainingDrillsStepProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'grouping' | 'engagement'>('all');
  const GOAL_CONFIG = getGoalConfig(t);

  // Filter drills
  const filteredDrills = teamDrills.filter((drill) => {
    if (activeFilter !== 'all' && drill.drill_goal !== activeFilter) {
      return false;
    }
    if (searchQuery) {
      return drill.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Calculate totals (drills with null shots are treated as 0 in the rollup)
  const totalShots = drills.reduce((sum, d) => sum + (d.rounds_per_shooter ?? 0) * (d.strings_count || 1), 0);
  const totalTime = drills.reduce((sum, d) => sum + (d.time_limit_seconds || 0), 0);

  return (
    <View style={styles.container}>
      {/* Selected Drills - Program Timeline */}
      {drills.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.programSection, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.programHeader}>
            <Text style={[styles.programTitle, { color: colors.text }]}>{t('training.trainingProgram')}</Text>
            <View style={styles.programStats}>
              <Text style={[styles.programStat, { color: colors.textMuted }]}>
                {totalTime > 0 
                  ? t('training.drillsShotsTimeWithTime', { drills: drills.length, shots: totalShots, time: Math.floor(totalTime / 60) })
                  : t('training.drillsShotsTime', { drills: drills.length, shots: totalShots })}
              </Text>
            </View>
          </View>

          {/* Drill List */}
          <View style={styles.programList}>
            {drills.map((drill, index) => {
              const goal = GOAL_CONFIG[drill.drill_goal as keyof typeof GOAL_CONFIG] || GOAL_CONFIG.grouping;
              const totalDrillShots = drill.rounds_per_shooter != null
                ? drill.rounds_per_shooter * (drill.strings_count || 1)
                : null;

              return (
                <Animated.View
                  key={drill.id}
                  entering={FadeInDown.delay(index * 30).duration(200)}
                  layout={Layout.springify()}
                  style={[styles.programItem, { borderBottomColor: colors.border }]}
                >
                  {/* Order Number */}
                  <View style={[styles.orderBadge, { backgroundColor: goal.color }]}>
                    <Text style={styles.orderNumber}>{index + 1}</Text>
                  </View>

                  {/* Drill Info */}
                  <View style={styles.programItemInfo}>
                    <Text style={[styles.programItemName, { color: colors.text }]} numberOfLines={1}>
                      {drill.name}
                    </Text>
                    <Text style={[styles.programItemMeta, { color: colors.textMuted }]}>
                      {drill.distance_m}m • {totalDrillShots != null ? `${totalDrillShots} shots` : 'Any shots'}
                      {drill.time_limit_seconds ? ` • ${drill.time_limit_seconds}s` : ''}
                    </Text>
                  </View>

                  {/* Goal Badge */}
                  <View style={[styles.goalPill, { backgroundColor: `${goal.color}15` }]}>
                    <View style={[styles.goalDot, { backgroundColor: goal.color }]} />
                    <Text style={[styles.goalPillText, { color: goal.color }]}>
                      {drill.drill_goal === 'grouping' ? t('training.groupingType') : t('training.engagementType')}
                    </Text>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onRemoveDrill(drill.id);
                    }}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Drill Library */}
      <View style={[styles.library, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.libraryHeader}>
          <Text style={[styles.libraryTitle, { color: colors.text }]}>
            {drills.length === 0 ? t('training.selectDrills') : t('training.addMore')}
          </Text>
          {canCreateDrills && (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.text }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateNew();
              }}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.background} strokeWidth={2.5} />
              <Text style={[styles.createBtnText, { color: colors.background }]}>{t('common.new')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!hasTeam ? (
          <View style={styles.emptyState}>
            <Target size={40} color={colors.textMuted} strokeWidth={1.2} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('training.selectTeamFirst')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t('training.selectTeamToSeeDrills')}
            </Text>
          </View>
        ) : (
          <>
            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.secondary }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('training.searchDrills')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filters */}
            <View style={styles.filters}>
              {(['all', 'grouping', 'engagement'] as const).map((filter) => {
                const isActive = activeFilter === filter;
                const filterColor =
                  filter === 'grouping'
                    ? GOAL_CONFIG.grouping.color
                    : filter === 'engagement'
                      ? GOAL_CONFIG.engagement.color
                      : colors.text;

                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? `${filterColor}15` : 'transparent',
                        borderColor: isActive ? filterColor : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveFilter(filter);
                    }}
                    activeOpacity={0.7}
                  >
                    {filter !== 'all' && <View style={[styles.filterDot, { backgroundColor: filterColor }]} />}
                    <Text style={[styles.filterText, { color: isActive ? filterColor : colors.textMuted }]}>
                      {filter === 'all' ? t('common.all') : filter === 'grouping' ? t('session.grouping') : t('session.engagement')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Drill List */}
            {filteredDrills.length > 0 ? (
              <ScrollView style={styles.drillList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {filteredDrills.map((drill, index) => {
                  const goal = GOAL_CONFIG[drill.drill_goal as keyof typeof GOAL_CONFIG] || GOAL_CONFIG.grouping;
                  const GoalIcon = goal.icon;
                  const isAlreadyAdded = drills.some((d) => d.id === drill.id);

                  return (
                    <TouchableOpacity
                      key={drill.id}
                      style={[
                        styles.drillRow,
                        {
                          borderBottomColor: colors.border,
                          opacity: isAlreadyAdded ? 0.5 : 1,
                        },
                      ]}
                      onPress={() => {
                        if (!isAlreadyAdded) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onSelectDrill(drill);
                        }
                      }}
                      activeOpacity={isAlreadyAdded ? 1 : 0.7}
                      disabled={isAlreadyAdded}
                    >
                      {/* Icon */}
                      <View style={[styles.drillIcon, { backgroundColor: colors.secondary }]}>
                        <GoalIcon size={18} color={goal.color} />
                      </View>

                      {/* Info */}
                      <View style={styles.drillInfo}>
                        <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                          {drill.icon ? `${drill.icon} ` : ''}
                          {drill.name}
                        </Text>
                        <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
                          {drill.time_limit_seconds 
                            ? t('training.drillMetaWithTime', { distance: drill.distance_m, shots: drill.rounds_per_shooter, time: drill.time_limit_seconds })
                            : t('training.drillMeta', { distance: drill.distance_m, shots: drill.rounds_per_shooter })}
                        </Text>
                      </View>

                      {/* Action */}
                      {isAlreadyAdded ? (
                        <View style={[styles.addedBadge, { backgroundColor: `${colors.green}15` }]}>
                          <Check size={14} color={colors.green} />
                        </View>
                      ) : (
                        <View style={[styles.addBtn, { borderColor: goal.color }]}>
                          <Plus size={16} color={goal.color} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {teamDrills.length === 0 ? t('training.noDrillsYet') : t('training.noMatchingDrills')}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {teamDrills.length === 0
                    ? t('training.createFirstDrill')
                    : t('training.tryDifferentSearch')}
                </Text>
                {teamDrills.length === 0 && canCreateDrills && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: colors.text }]}
                    onPress={onCreateNew}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color={colors.background} />
                    <Text style={[styles.emptyBtnText, { color: colors.background }]}>{t('training.createFirstDrill')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // Program Section (Selected Drills)
  programSection: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  programStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programStat: {
    fontSize: 13,
  },
  programList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  programItemInfo: {
    flex: 1,
  },
  programItemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  programItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  goalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  goalPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  removeBtn: {
    padding: 4,
  },

  // Library Section
  library: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  libraryTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  drillList: {
    maxHeight: 320,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  drillIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '500',
  },
  drillMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
