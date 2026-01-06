/**
 * TrainingDrillsStep - Professional drill selection and configuration
 * 
 * Step 2 of training creation: Add and configure drills
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flag,
  MapPin,
  Plus,
  Search,
  Target,
  Timer,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';

import type { TrainingDrillItem } from '../createTraining.types';
import type { Drill } from '@/types/workspace';

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

const GOAL_COLORS: Record<string, string> = {
  grouping: '#10B981', // Green
  achievement: '#F59E0B', // Orange (legacy)
  engagement: '#F59E0B', // Orange
};

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
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'grouping' | 'achievement'>('all');

  // Filter drills
  const filteredDrills = teamDrills.filter(drill => {
    if (activeFilter !== 'all' && drill.drill_goal !== activeFilter) return false;
    if (searchQuery) {
      return drill.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const counts = {
    all: teamDrills.length,
    grouping: teamDrills.filter(d => d.drill_goal === 'grouping').length,
    engagement: teamDrills.filter(d => d.drill_goal === 'achievement' || d.drill_goal === 'engagement').length,
  };

  // Calculate totals
  const totalShots = drills.reduce((sum, d) => sum + d.rounds_per_shooter * (d.strings_count || 1), 0);
  const totalTime = drills.reduce((sum, d) => sum + (d.time_limit_seconds || 0), 0);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onBack();
        }}
        activeOpacity={0.7}
      >
        <ChevronLeft size={18} color={colors.text} strokeWidth={1.5} />
        <Text style={[styles.backText, { color: colors.text }]}>Details</Text>
      </TouchableOpacity>

      {/* Training Timeline */}
      {drills.length > 0 && (
        <View style={styles.timeline}>
          {/* Summary */}
          <View style={[styles.timelineSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{drills.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>drills</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{totalShots}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>shots</Text>
              </View>
              {totalTime > 0 && (
                <>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {totalTime >= 60 ? `${Math.floor(totalTime / 60)}m` : `${totalTime}s`}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>limit</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Drill Cards */}
          {drills.map((drill, index) => {
            const goalColor = GOAL_COLORS[drill.drill_goal];
            const isFirst = index === 0;
            const isLast = index === drills.length - 1;
            const totalDrillShots = drill.rounds_per_shooter * (drill.strings_count || 1);

            return (
              <Animated.View
                key={drill.id}
                entering={FadeInRight.delay(index * 50).springify()}
                layout={Layout.springify()}
                style={styles.drillNode}
              >
                {/* Timeline Rail */}
                <View style={styles.rail}>
                  {!isFirst && <View style={[styles.railLine, { backgroundColor: colors.border }]} />}
                  <View style={[styles.railCircle, { backgroundColor: goalColor }]}>
                    <Text style={styles.railNumber}>{index + 1}</Text>
                  </View>
                  {!isLast && <View style={[styles.railLine, { backgroundColor: colors.border }]} />}
                </View>

                {/* Drill Card */}
                <View style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.drillCardHeader}>
                    <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                      {drill.name}
                    </Text>
                    <View style={[styles.goalBadge, { backgroundColor: `${goalColor}20` }]}>
                      <Text style={[styles.goalBadgeText, { color: goalColor }]}>
                        {drill.drill_goal === 'grouping' ? 'GRP' : 'ACH'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.drillCardMeta}>
                    <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                      <MapPin size={10} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{drill.distance_m}m</Text>
                    </View>
                    <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                      <Target size={10} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{totalDrillShots}</Text>
                    </View>
                    {drill.time_limit_seconds && (
                      <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                        <Timer size={10} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>{drill.time_limit_seconds}s</Text>
                      </View>
                    )}
                    <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {drill.input_method === 'scan' || drill.drill_goal === 'grouping' ? '📷' : '✋'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.drillActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { opacity: isFirst ? 0.3 : 1 }]}
                      onPress={() => onMoveDrill(index, 'up')}
                      disabled={isFirst}
                    >
                      <ArrowUp size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { opacity: isLast ? 0.3 : 1 }]}
                      onPress={() => onMoveDrill(index, 'down')}
                      disabled={isLast}
                    >
                      <ArrowDown size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => onRemoveDrill(drill.id)}
                    >
                      <Trash2 size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            );
          })}

          {/* Finish Marker */}
          <View style={styles.finishMarker}>
            <View style={[styles.finishCircle, { backgroundColor: colors.text }]}>
              <Flag size={10} color={colors.background} fill={colors.background} />
            </View>
            <Text style={[styles.finishText, { color: colors.textMuted }]}>Training Complete</Text>
          </View>
        </View>
      )}

      {/* Drill Library */}
      <View style={[styles.library, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.libraryHeader}>
          <Text style={[styles.libraryTitle, { color: colors.text }]}>Add Drills</Text>
          {canCreateDrills && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateNew();
              }}
            >
              <View style={styles.createNewBtn}>
                <Plus size={14} color={colors.text} />
                <Text style={[styles.createNewText, { color: colors.text }]}>New</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!hasTeam ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Select a team to view drills
            </Text>
          </View>
        ) : (
          <>
            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.secondary }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search drills..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filters */}
            <View style={styles.filters}>
              {(['all', 'grouping', 'achievement'] as const).map(filter => {
                const isActive = activeFilter === filter;
                const color = filter === 'grouping' ? GOAL_COLORS.grouping 
                  : (filter === 'achievement' || filter === 'engagement') ? GOAL_COLORS.engagement 
                  : colors.text;
                
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterBtn,
                      {
                        backgroundColor: isActive ? `${color}20` : 'transparent',
                        borderColor: isActive ? color : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveFilter(filter);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: isActive ? color : colors.textMuted },
                      ]}
                    >
                      {filter === 'all' ? 'All' : filter === 'grouping' ? 'Grouping' : 'Achievement'}
                      {' '}({counts[filter]})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Drill List */}
            {filteredDrills.length > 0 ? (
              <View style={styles.drillList}>
                {filteredDrills.map(drill => {
                  const goalColor = GOAL_COLORS[drill.drill_goal];
                  return (
                    <TouchableOpacity
                      key={drill.id}
                      style={[styles.drillItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelectDrill(drill);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={[styles.drillIndicator, { backgroundColor: goalColor }]} />
                      <View style={styles.drillItemContent}>
                        <Text style={[styles.drillItemName, { color: colors.text }]} numberOfLines={1}>
                          {drill.icon ? `${drill.icon} ` : ''}{drill.name}
                        </Text>
                        <Text style={[styles.drillItemMeta, { color: colors.textMuted }]}>
                          {drill.distance_m}m · {drill.rounds_per_shooter} shots
                          {drill.time_limit_seconds ? ` · ${drill.time_limit_seconds}s` : ''}
                        </Text>
                      </View>
                      <View style={[styles.addIcon, { borderColor: goalColor }]}>
                        <Plus size={14} color={goalColor} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {teamDrills.length === 0 ? 'No drills yet' : 'No matching drills'}
                </Text>
                {teamDrills.length === 0 && canCreateDrills && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { borderColor: colors.text }]}
                    onPress={onCreateNew}
                  >
                    <Text style={[styles.emptyBtnText, { color: colors.text }]}>Create First Drill</Text>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Timeline
  timeline: {
    gap: 0,
  },
  timelineSummary: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStat: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
  },
  // Drill Node
  drillNode: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
  },
  railCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railNumber: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  drillCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  drillCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  drillName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  goalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  drillCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
  },
  drillActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  // Finish Marker
  finishMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    gap: 10,
    marginTop: 4,
  },
  finishCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Library
  library: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  libraryTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createNewText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,

  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  drillList: {
    marginTop: 4,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  drillIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  drillItemContent: {
    flex: 1,
  },
  drillItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  drillItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  addIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  emptyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});


