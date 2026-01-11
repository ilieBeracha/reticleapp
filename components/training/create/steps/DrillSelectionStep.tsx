/**
 * DrillSelectionStep - Quick Drill Selection (Step 2)
 * 
 * Shows three sections:
 * 1. Recent Drills - From last training
 * 2. Team Drills - Saved team drill templates
 * 3. Standard Templates - Quick presets
 * 
 * Single tap to add, tap added drill to adjust.
 */

import { useColors } from '@/hooks/ui/useColors';
import { STANDARD_DRILL_TEMPLATES, type StandardDrillTemplate } from '@/constants/standardDrills';
import type { Drill, TrainingDrill } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  Check,
  ChevronRight,
  Clock,
  History,
  Plus,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout, SlideOutLeft } from 'react-native-reanimated';

import type { TrainingDrillItem } from '../createTraining.types';

// ============================================================================
// TYPES
// ============================================================================

interface DrillSelectionStepProps {
  /** Currently added drills (shown in Program section) */
  drills: TrainingDrillItem[];
  /** Team's saved drills */
  teamDrills: Drill[];
  /** Drills from the last training */
  lastTrainingDrills: TrainingDrill[];
  /** Add a drill to the program */
  onAddDrill: (drill: TrainingDrillItem) => void;
  /** Remove a drill from the program */
  onRemoveDrill: (id: string) => void;
  /** Open adjust modal for a drill */
  onAdjustDrill: (drill: TrainingDrillItem) => void;
  /** Go to custom/library step */
  onBuildCustom: () => void;
}

// ============================================================================
// DRILL CARD
// ============================================================================

function DrillCard({
  name,
  distance,
  rounds,
  timeLimit,
  drillGoal,
  isAdded,
  onPress,
  colors,
}: {
  name: string;
  distance: number;
  rounds: number;
  timeLimit?: number | null;
  drillGoal: 'grouping' | 'engagement';
  isAdded: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const goalColor = drillGoal === 'grouping' ? '#22C55E' : '#F59E0B';

  return (
    <TouchableOpacity
      style={[
        styles.drillCard,
        { 
          backgroundColor: isAdded ? colors.text : colors.card,
          borderColor: isAdded ? colors.text : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.goalDot, { backgroundColor: goalColor }]} />
      <View style={styles.drillCardContent}>
        <Text 
          style={[styles.drillName, { color: isAdded ? colors.background : colors.text }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={[styles.drillMeta, { color: isAdded ? colors.background + '99' : colors.textMuted }]}>
          {distance}m · {rounds} rds{timeLimit ? ` · ${timeLimit}s` : ''}
        </Text>
      </View>
      {isAdded ? (
        <Check size={16} color={colors.background} strokeWidth={2.5} />
      ) : (
        <Plus size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// PROGRAM ITEM (added drill)
// ============================================================================

function ProgramItem({
  drill,
  index,
  onRemove,
  onAdjust,
  colors,
}: {
  drill: TrainingDrillItem;
  index: number;
  onRemove: () => void;
  onAdjust: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const goalColor = drill.drill_goal === 'grouping' ? '#22C55E' : '#F59E0B';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(200)}
      exiting={SlideOutLeft.duration(150)}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        style={[styles.programItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAdjust();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.programIndex, { backgroundColor: colors.text }]}>
          <Text style={[styles.programIndexText, { color: colors.background }]}>{index + 1}</Text>
        </View>
        <View style={styles.programInfo}>
          <Text style={[styles.programName, { color: colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          <View style={styles.programMetaRow}>
            <View style={[styles.programGoalBadge, { backgroundColor: goalColor + '20' }]}>
              <View style={[styles.programGoalDot, { backgroundColor: goalColor }]} />
              <Text style={[styles.programGoalText, { color: goalColor }]}>
                {drill.drill_goal === 'grouping' ? 'Grouping' : 'Engagement'}
              </Text>
            </View>
            <Text style={[styles.programParams, { color: colors.textMuted }]}>
              {drill.distance_m}m · {drill.rounds_per_shooter} rds
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRemove();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.removeBtn}
        >
          <Text style={[styles.removeBtnText, { color: colors.destructive }]}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  colors,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={16} color={colors.textMuted} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillSelectionStep({
  drills,
  teamDrills,
  lastTrainingDrills,
  onAddDrill,
  onRemoveDrill,
  onAdjustDrill,
  onBuildCustom,
}: DrillSelectionStepProps) {
  const colors = useColors();

  // Track which drills are already added
  const addedIds = useMemo(() => new Set(drills.map(d => d.id)), [drills]);

  // Convert standard template to TrainingDrillItem
  const handleAddStandard = (template: StandardDrillTemplate) => {
    if (addedIds.has(template.id)) {
      onRemoveDrill(template.id);
      return;
    }

    onAddDrill({
      id: template.id,
      name: template.name,
      drill_goal: template.drill_goal,
      target_type: template.target_type,
      distance_m: template.distance_m,
      rounds_per_shooter: template.rounds_per_shooter,
      time_limit_seconds: template.time_limit_seconds ?? undefined,
      strings_count: template.strings_count,
      position: template.position,
    });
  };

  // Convert team drill to TrainingDrillItem
  const handleAddTeamDrill = (drill: Drill) => {
    const itemId = `team-${drill.id}`;
    if (addedIds.has(itemId)) {
      onRemoveDrill(itemId);
      return;
    }

    onAddDrill({
      id: itemId,
      drill_id: drill.id,
      name: drill.name,
      drill_goal: drill.drill_goal,
      target_type: drill.target_type,
      distance_m: drill.distance_m,
      rounds_per_shooter: drill.rounds_per_shooter,
      time_limit_seconds: drill.time_limit_seconds ?? undefined,
      strings_count: drill.strings_count ?? 1,
      position: drill.position as any,
    });
  };

  // Convert last training drill to TrainingDrillItem
  const handleAddLastDrill = (drill: TrainingDrill) => {
    const itemId = `last-${drill.id}`;
    if (addedIds.has(itemId)) {
      onRemoveDrill(itemId);
      return;
    }

    onAddDrill({
      id: itemId,
      drill_id: drill.drill_id ?? undefined,
      name: drill.name,
      drill_goal: drill.drill_goal,
      target_type: drill.target_type,
      distance_m: drill.distance_m,
      rounds_per_shooter: drill.rounds_per_shooter,
      time_limit_seconds: drill.time_limit_seconds ?? undefined,
      strings_count: drill.strings_count ?? 1,
      position: drill.position as any,
    });
  };

  // Total rounds calculation
  const totalRounds = drills.reduce((sum, d) => sum + d.rounds_per_shooter * (d.strings_count || 1), 0);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Program Section (Added Drills) */}
      {drills.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.section}>
          <View style={styles.programHeader}>
            <Text style={[styles.programTitle, { color: colors.text }]}>PROGRAM</Text>
            <Text style={[styles.programStats, { color: colors.textMuted }]}>
              {drills.length} {drills.length === 1 ? 'drill' : 'drills'} · {totalRounds} rounds
            </Text>
          </View>
          <View style={styles.programList}>
            {drills.map((drill, index) => (
              <ProgramItem
                key={drill.id}
                drill={drill}
                index={index}
                onRemove={() => onRemoveDrill(drill.id)}
                onAdjust={() => onAdjustDrill(drill)}
                colors={colors}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Recent Drills (from last training) */}
      {lastTrainingDrills.length > 0 && (
        <View style={styles.section}>
          <SectionHeader 
            icon={History} 
            title="From Last Training" 
            subtitle={`${lastTrainingDrills.length} drills`}
            colors={colors} 
          />
          <View style={styles.drillGrid}>
            {lastTrainingDrills.map((drill) => {
              const itemId = `last-${drill.id}`;
              return (
                <DrillCard
                  key={drill.id}
                  name={drill.name}
                  distance={drill.distance_m}
                  rounds={drill.rounds_per_shooter}
                  timeLimit={drill.time_limit_seconds}
                  drillGoal={drill.drill_goal}
                  isAdded={addedIds.has(itemId)}
                  onPress={() => handleAddLastDrill(drill)}
                  colors={colors}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Team Drills */}
      {teamDrills.length > 0 && (
        <View style={styles.section}>
          <SectionHeader 
            icon={Shield} 
            title="Team Drills" 
            colors={colors} 
          />
          <View style={styles.drillGrid}>
            {teamDrills.slice(0, 6).map((drill) => {
              const itemId = `team-${drill.id}`;
              return (
                <DrillCard
                  key={drill.id}
                  name={drill.name}
                  distance={drill.distance_m}
                  rounds={drill.rounds_per_shooter}
                  timeLimit={drill.time_limit_seconds}
                  drillGoal={drill.drill_goal}
                  isAdded={addedIds.has(itemId)}
                  onPress={() => handleAddTeamDrill(drill)}
                  colors={colors}
                />
              );
            })}
          </View>
          {teamDrills.length > 6 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderColor: colors.border }]}
              onPress={onBuildCustom}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: colors.text }]}>
                View all {teamDrills.length} team drills
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Standard Templates */}
      <View style={styles.section}>
        <SectionHeader 
          icon={Sparkles} 
          title="Quick Templates" 
          colors={colors} 
        />
        <View style={styles.drillGrid}>
          {STANDARD_DRILL_TEMPLATES.slice(0, 8).map((template) => (
            <DrillCard
              key={template.id}
              name={template.name}
              distance={template.distance_m}
              rounds={template.rounds_per_shooter}
              timeLimit={template.time_limit_seconds}
              drillGoal={template.drill_goal}
              isAdded={addedIds.has(template.id)}
              onPress={() => handleAddStandard(template)}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Build Custom Button */}
      <TouchableOpacity
        style={[styles.customBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onBuildCustom();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.customIconWrap, { backgroundColor: colors.secondary }]}>
          <Target size={20} color={colors.text} />
        </View>
        <View style={styles.customContent}>
          <Text style={[styles.customTitle, { color: colors.text }]}>Build Custom Drill</Text>
          <Text style={[styles.customSubtitle, { color: colors.textMuted }]}>
            Create from scratch or browse full library
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginLeft: 'auto',
  },

  // Program
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  programTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  programStats: {
    fontSize: 12,
  },
  programList: {
    gap: 8,
  },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  programIndex: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  programMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  programGoalDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  programGoalText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  programParams: {
    fontSize: 12,
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },

  // Drill Grid
  drillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    minWidth: '47%',
    flex: 1,
  },
  goalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  drillCardContent: {
    flex: 1,
  },
  drillName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  drillMeta: {
    fontSize: 11,
  },

  // View All
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Custom Button
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  customIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customContent: {
    flex: 1,
  },
  customTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  customSubtitle: {
    fontSize: 12,
  },
});
