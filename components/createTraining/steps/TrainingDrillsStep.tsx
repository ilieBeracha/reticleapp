/**
 * TRAINING DRILLS STEP - Premium Design
 *
 * Step 2: Build training program with stunning timeline & drill library
 */

import { useColors } from '@/hooks/ui/useColors';
import type { Drill } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Crosshair,
  Flag,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Target,
  Timer,
  Trash2,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInRight, 
  FadeInUp,
  Layout, 
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';

import type { TrainingDrillItem } from '../createTraining.types';

interface TrainingDrillsStepProps {
  drills: TrainingDrillItem[];
  teamDrills: Drill[];
  hasTeam: boolean;
  canCreateDrills: boolean;
  onSelectDrill: (drill: Drill) => void;
  onRemoveDrill: (id: string) => void;
  onMoveDrill: (index: number, direction: 'up' | 'down') => void;
  onCreateNew: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOAL_CONFIG = {
  grouping: {
    color: '#10B981',
    label: 'Grouping',
    icon: Crosshair,
  },
  achievement: {
    color: '#F59E0B',
    label: 'Achievement',
    icon: Target,
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TrainingDrillsStep({
  drills,
  teamDrills,
  hasTeam,
  canCreateDrills,
  onSelectDrill,
  onRemoveDrill,
  onMoveDrill,
  onCreateNew,
}: TrainingDrillsStepProps) {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'grouping' | 'achievement'>('all');

  // Filter drills
  const filteredDrills = useMemo(() => {
    return teamDrills.filter(drill => {
      if (activeFilter !== 'all' && drill.drill_goal !== activeFilter) return false;
      if (searchQuery) {
        return drill.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [teamDrills, activeFilter, searchQuery]);

  const counts = useMemo(() => ({
    all: teamDrills.length,
    grouping: teamDrills.filter(d => d.drill_goal === 'grouping').length,
    achievement: teamDrills.filter(d => d.drill_goal === 'achievement').length,
  }), [teamDrills]);

  // Calculate totals
  const stats = useMemo(() => {
    const totalShots = drills.reduce((sum, d) => sum + d.rounds_per_shooter * (d.strings_count || 1), 0);
    const totalTime = drills.reduce((sum, d) => sum + (d.time_limit_seconds || 0), 0);
    return { totalShots, totalTime };
  }, [drills]);

  return (
    <View style={styles.container}>
      {/* ═══════════════════════════════════════════════════════════════════
          PROGRAM TIMELINE
      ═══════════════════════════════════════════════════════════════════ */}
      {drills.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.programSection}>
          {/* Section Header */}
          <View style={styles.programHeader}>
            <View style={styles.programTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.purple}15` }]}>
                <Layers size={14} color={colors.purple} strokeWidth={2} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Program</Text>
            </View>
            
            {/* Stats Pills */}
            <View style={styles.statsRow}>
              <View style={[styles.statPill, { backgroundColor: colors.card }]}>
                <Target size={12} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalShots}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: colors.card }]}>
                <Layers size={12} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: colors.text }]}>{drills.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>drill{drills.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timeline}>
            {/* Start marker */}
            <Animated.View entering={ZoomIn.duration(200)} style={styles.markerRow}>
              <View style={[styles.markerDot, { backgroundColor: colors.text }]}>
                <Sparkles size={8} color={colors.background} />
              </View>
              <Text style={[styles.markerText, { color: colors.textMuted }]}>Start</Text>
            </Animated.View>

            {/* Drill Nodes */}
            {drills.map((drill, index) => {
              const config = GOAL_CONFIG[drill.drill_goal];
              const isFirst = index === 0;
              const isLast = index === drills.length - 1;
              const totalDrillShots = drill.rounds_per_shooter * (drill.strings_count || 1);
              const IconComponent = config.icon;

              return (
                <Animated.View
                  key={drill.id}
                  entering={SlideInRight.delay(index * 30).duration(300)}
                  layout={Layout.springify()}
                  style={styles.drillNode}
                >
                  {/* Connecting Line */}
                  <View style={styles.railContainer}>
                    <View style={[styles.railLine, { backgroundColor: colors.border }]} />
                    <View style={[styles.railDot, { backgroundColor: config.color, borderColor: colors.background }]}>
                      <Text style={styles.railNumber}>{index + 1}</Text>
                    </View>
                  </View>

                  {/* Drill Card */}
                  <Animated.View 
                    entering={FadeIn.delay(index * 30 + 100).duration(200)}
                    style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={[styles.goalBadge, { backgroundColor: `${config.color}15` }]}>
                        <IconComponent size={14} color={config.color} strokeWidth={2} />
                      </View>
                      <View style={styles.cardTitleArea}>
                        <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                          {drill.name}
                        </Text>
                        <Text style={[styles.goalLabel, { color: config.color }]}>{config.label}</Text>
                      </View>
                      
                      {/* Quick Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.miniBtn, { opacity: isFirst ? 0.3 : 1 }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onMoveDrill(index, 'up');
                          }}
                          disabled={isFirst}
                          hitSlop={8}
                        >
                          <ArrowUp size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.miniBtn, { opacity: isLast ? 0.3 : 1 }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onMoveDrill(index, 'down');
                          }}
                          disabled={isLast}
                          hitSlop={8}
                        >
                          <ArrowDown size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.miniBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onRemoveDrill(drill.id);
                          }}
                          hitSlop={8}
                        >
                          <X size={14} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Card Meta */}
                    <View style={styles.cardMeta}>
                      <View style={styles.metaChip}>
                        <MapPin size={11} color={colors.textMuted} />
                        <Text style={[styles.metaValue, { color: colors.textMuted }]}>{drill.distance_m}m</Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Target size={11} color={colors.textMuted} />
                        <Text style={[styles.metaValue, { color: colors.textMuted }]}>{totalDrillShots} shots</Text>
                      </View>
                      {drill.time_limit_seconds && drill.time_limit_seconds > 0 && (
                        <View style={styles.metaChip}>
                          <Timer size={11} color={colors.textMuted} />
                          <Text style={[styles.metaValue, { color: colors.textMuted }]}>{drill.time_limit_seconds}s</Text>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                </Animated.View>
              );
            })}

            {/* End marker */}
            <Animated.View 
              entering={ZoomIn.delay(drills.length * 30 + 100).duration(200)} 
              style={styles.markerRow}
            >
              <View style={[styles.finishDot, { backgroundColor: colors.text }]}>
                <Flag size={8} color={colors.background} fill={colors.background} />
              </View>
              <Text style={[styles.markerText, { color: colors.textMuted }]}>Complete</Text>
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          DRILL LIBRARY
      ═══════════════════════════════════════════════════════════════════ */}
      <Animated.View 
        entering={drills.length > 0 ? FadeIn.delay(200).duration(300) : FadeIn.duration(300)} 
        style={styles.librarySection}
      >
        {/* Section Header */}
        <View style={styles.libraryHeader}>
          <View style={styles.programTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.blue}15` }]}>
              <BookOpen size={14} color={colors.blue} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {drills.length === 0 ? 'Drill Library' : 'Add More'}
            </Text>
          </View>
          
          {canCreateDrills && (
            <TouchableOpacity
              style={[styles.createNewBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateNew();
              }}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.text} strokeWidth={2} />
              <Text style={[styles.createNewText, { color: colors.text }]}>Create New</Text>
            </TouchableOpacity>
          )}
        </View>

        {!hasTeam ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Select a team to see available drills
            </Text>
          </View>
        ) : (
          <>
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search drills..."
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

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {(['all', 'grouping', 'achievement'] as const).map((filter, index) => {
                const isActive = activeFilter === filter;
                const config = filter !== 'all' ? GOAL_CONFIG[filter] : null;
                
                return (
                  <Animated.View 
                    key={filter} 
                    entering={FadeInDown.delay(index * 50).duration(200)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isActive ? (config?.color ?? colors.text) + '15' : colors.card,
                          borderColor: isActive ? (config?.color ?? colors.text) : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setActiveFilter(filter);
                      }}
                      activeOpacity={0.7}
                    >
                      {config && <View style={[styles.filterIndicator, { backgroundColor: config.color }]} />}
                      <Text
                        style={[
                          styles.filterLabel,
                          { color: isActive ? (config?.color ?? colors.text) : colors.textMuted },
                        ]}
                      >
                        {filter === 'all' ? 'All' : config?.label}
                      </Text>
                      <Text
                        style={[
                          styles.filterCount,
                          { color: isActive ? (config?.color ?? colors.text) : colors.textMuted },
                        ]}
                      >
                        {counts[filter]}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Drill List */}
            {filteredDrills.length > 0 ? (
              <View style={styles.drillGrid}>
                {filteredDrills.map((drill, index) => {
                  const config = GOAL_CONFIG[drill.drill_goal];
                  const alreadyAdded = drills.some(d => d.drill_id === drill.id);
                  const addedCount = drills.filter(d => d.drill_id === drill.id).length;
                  const IconComponent = config.icon;
                  
                  return (
                    <Animated.View 
                      key={drill.id}
                      entering={FadeInRight.delay(index * 30).duration(200)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.drillItem,
                          {
                            backgroundColor: colors.card,
                            borderColor: alreadyAdded ? config.color : colors.border,
                            borderWidth: alreadyAdded ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onSelectDrill(drill);
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Goal Icon */}
                        <View style={[styles.drillItemIcon, { backgroundColor: `${config.color}15` }]}>
                          <IconComponent size={18} color={config.color} strokeWidth={1.5} />
                        </View>

                        {/* Content */}
                        <View style={styles.drillItemContent}>
                          <Text 
                            style={[styles.drillItemName, { color: colors.text }]} 
                            numberOfLines={1}
                          >
                            {drill.name}
                          </Text>
                          <View style={styles.drillItemMeta}>
                            <Text style={[styles.drillItemMetaText, { color: colors.textMuted }]}>
                              {drill.distance_m}m
                            </Text>
                            <View style={[styles.metaDot, { backgroundColor: colors.textMuted }]} />
                            <Text style={[styles.drillItemMetaText, { color: colors.textMuted }]}>
                              {drill.rounds_per_shooter} shots
                            </Text>
                          </View>
                        </View>

                        {/* Add Button / Status */}
                        {alreadyAdded ? (
                          <View style={styles.addedBadge}>
                            <View style={[styles.addedInner, { backgroundColor: config.color }]}>
                              <Check size={12} color="#fff" strokeWidth={3} />
                            </View>
                            {addedCount > 1 && (
                              <Text style={[styles.addedCount, { color: config.color }]}>×{addedCount}</Text>
                            )}
                          </View>
                        ) : (
                          <View style={[styles.addCircle, { borderColor: config.color }]}>
                            <Plus size={16} color={config.color} strokeWidth={2} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {teamDrills.length === 0 ? 'No drills in library yet' : 'No matching drills found'}
                </Text>
                {teamDrills.length === 0 && canCreateDrills && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: colors.text }]}
                    onPress={onCreateNew}
                  >
                    <Plus size={14} color={colors.background} strokeWidth={2} />
                    <Text style={[styles.emptyBtnText, { color: colors.background }]}>Create First Drill</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 36,
  },

  // Section Header Shared
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRAM SECTION
  // ════════════════════════════════════════════════════════════════════════════
  programSection: {},
  programHeader: {
    marginBottom: 24,
  },
  programTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },

  // Timeline
  timeline: {
    paddingLeft: 4,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Drill Node
  drillNode: {
    flexDirection: 'row',
    marginLeft: 9,
  },
  railContainer: {
    width: 22,
    alignItems: 'center',
    marginRight: 14,
  },
  railLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  railDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  railNumber: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Drill Card
  drillCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  goalBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleArea: {
    flex: 1,
    gap: 4,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaValue: {
    fontSize: 12,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LIBRARY SECTION
  // ════════════════════════════════════════════════════════════════════════════
  librarySection: {},
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  createNewText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Drill Grid
  drillGrid: {
    gap: 12,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  drillItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillItemContent: {
    flex: 1,
    gap: 5,
  },
  drillItemName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  drillItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillItemMetaText: {
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addedInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedCount: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    gap: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

