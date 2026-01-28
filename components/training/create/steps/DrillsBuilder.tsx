/**
 * DrillsBuilder - Custom Drill Creator
 *
 * Clean, card-based layout for drill configuration.
 * Simplified drill creation with type, position, distance, rounds, time.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import type { Drill } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Check, Clock, MapPin, Shield, Target, User } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { TrainingDrillItem } from '../createTraining.types';

// ============================================================================
// TYPES
// ============================================================================

interface DrillsBuilderProps {
  drills: TrainingDrillItem[];
  teamDrills: Drill[];
  onAddDrill: (drill: TrainingDrillItem) => void;
  onRemoveDrill: (id: string) => void;
  onMoveDrill: (index: number, direction: 'up' | 'down') => void;
  /** Called after a drill is issued - use to navigate back */
  onDrillIssued?: () => void;
}

type DrillType = 'grouping' | 'engagement';
type Position = 'standing' | 'kneeling' | 'prone';

// ============================================================================
// CONSTANTS
// ============================================================================

const getPositions = (t: (key: string) => string): { value: Position; label: string; icon: any }[] => [
  { value: 'prone', label: t('session.positionOptions.prone'), icon: User },
  { value: 'kneeling', label: t('session.positionOptions.kneeling'), icon: User },
  { value: 'standing', label: t('session.positionOptions.standing'), icon: User },
];

const DISTANCES: Record<DrillType, number[]> = {
  grouping: [50, 100, 200, 300],
  engagement: [7, 15, 25, 50],
};

const ROUNDS: Record<DrillType, number[]> = {
  grouping: [3, 5, 10],
  engagement: [5, 10, 20],
};

const getTimeOptions = (t: (key: string) => string): { value: number | null; label: string }[] => [
  { value: null, label: t('common.none') },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
];

// ============================================================================
// OPTION CHIP COMPONENT
// ============================================================================

function OptionChip({
  label,
  active,
  onPress,
  colors,
  size = 'normal',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  size?: 'normal' | 'large';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionChip,
        size === 'large' && styles.optionChipLarge,
        {
          backgroundColor: active ? colors.text : colors.card,
          borderColor: active ? colors.text : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      {active && <Check size={14} color={colors.background} strokeWidth={2.5} />}
      <Text
        style={[
          styles.optionChipText,
          size === 'large' && styles.optionChipTextLarge,
          { color: active ? colors.background : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillsBuilder({
  drills,
  teamDrills,
  onAddDrill,
  onRemoveDrill,
  onMoveDrill,
  onDrillIssued,
}: DrillsBuilderProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const POSITIONS = getPositions(t);
  const TIME_OPTIONS = getTimeOptions(t);

  // Order state
  const [drillType, setDrillType] = useState<DrillType>('grouping');
  const [position, setPosition] = useState<Position>('prone');
  const [distance, setDistance] = useState(100);
  const [rounds, setRounds] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  // Issue custom drill order
  const handleIssueDrill = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const typeLabel = drillType === 'grouping' ? t('session.grouping') : t('session.engagement');
    const posLabel = POSITIONS.find((p) => p.value === position)?.label || position;
    onAddDrill({
      id: `order-${Date.now()}`,
      name: `${typeLabel} · ${posLabel} · ${distance}m`,
      drill_goal: drillType,
      target_type: drillType === 'grouping' ? 'paper' : 'tactical',
      distance_m: distance,
      rounds_per_shooter: rounds,
      time_limit_seconds: timeLimit ?? undefined,
      strings_count: 1,
      position: position,
    });
    // Go back to selection step after issuing
    onDrillIssued?.();
  }, [drillType, position, distance, rounds, timeLimit, onAddDrill, onDrillIssued]);

  // Issue team drill
  const handleIssueTeamDrill = useCallback(
    (drill: Drill) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onAddDrill({
        id: `drill-${drill.id}-${Date.now()}`,
        drill_id: drill.id,
        name: drill.name,
        drill_goal: drill.drill_goal,
        target_type: drill.target_type,
        distance_m: drill.distance_m,
        rounds_per_shooter: drill.rounds_per_shooter,
        time_limit_seconds: drill.time_limit_seconds ?? undefined,
        strings_count: drill.strings_count ?? 1,
        position: drill.position as Position | undefined,
      });
      // Go back to selection step after issuing
      onDrillIssued?.();
    },
    [onAddDrill, onDrillIssued]
  );

  // Available team drills
  const availableDrills = useMemo(() => {
    const addedIds = new Set(drills.map((d) => d.drill_id).filter(Boolean));
    return teamDrills.filter((d) => !addedIds.has(d.id));
  }, [teamDrills, drills]);

  // Summary for button
  const orderSummary = useMemo(() => {
    const typeLabel = drillType === 'grouping' ? t('session.grouping') : t('session.engagement');
    let summary = `${typeLabel} · ${distance}m · ${t('training.roundsCount', { count: rounds })}`;
    if (timeLimit) summary += ` · ${timeLimit}s`;
    return summary;
  }, [drillType, distance, rounds, timeLimit, t]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('training.createCustomDrill')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{t('training.configureDrillParameters')}</Text>
      </Animated.View>

      {/* Drill Type */}
      <Animated.View entering={FadeInDown.delay(50).duration(200)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target size={16} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('training.type')}</Text>
        </View>
        <View style={styles.optionsRow}>
          <OptionChip
            label={t('session.grouping')}
            active={drillType === 'grouping'}
            onPress={() => {
              setDrillType('grouping');
              setDistance(DISTANCES.grouping[1]);
              setRounds(ROUNDS.grouping[1]);
            }}
            colors={colors}
            size="large"
          />
          <OptionChip
            label={t('session.engagement')}
            active={drillType === 'engagement'}
            onPress={() => {
              setDrillType('engagement');
              setDistance(DISTANCES.engagement[1]);
              setRounds(ROUNDS.engagement[1]);
            }}
            colors={colors}
            size="large"
          />
        </View>
      </Animated.View>

      {/* Position */}
      <Animated.View entering={FadeInDown.delay(100).duration(200)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={16} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('session.position')}</Text>
        </View>
        <View style={styles.optionsRow}>
          {POSITIONS.map((p) => (
            <OptionChip
              key={p.value}
              label={p.label}
              active={position === p.value}
              onPress={() => setPosition(p.value)}
              colors={colors}
            />
          ))}
        </View>
      </Animated.View>

      {/* Distance */}
      <Animated.View entering={FadeInDown.delay(150).duration(200)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <MapPin size={16} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('session.distance')}</Text>
        </View>
        <View style={styles.optionsRow}>
          {DISTANCES[drillType].map((d) => (
            <OptionChip
              key={d}
              label={`${d}m`}
              active={distance === d}
              onPress={() => setDistance(d)}
              colors={colors}
            />
          ))}
        </View>
      </Animated.View>

      {/* Rounds */}
      <Animated.View entering={FadeInDown.delay(200).duration(200)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target size={16} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('training.rounds')}</Text>
        </View>
        <View style={styles.optionsRow}>
          {ROUNDS[drillType].map((r) => (
            <OptionChip key={r} label={String(r)} active={rounds === r} onPress={() => setRounds(r)} colors={colors} />
          ))}
        </View>
      </Animated.View>

      {/* Time Limit */}
      <Animated.View entering={FadeInDown.delay(250).duration(200)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('session.timeLimit')}</Text>
        </View>
        <View style={styles.optionsRow}>
          {TIME_OPTIONS.map((timeOpt) => (
            <OptionChip
              key={timeOpt.label}
              label={timeOpt.label}
              active={timeLimit === timeOpt.value}
              onPress={() => setTimeLimit(timeOpt.value)}
              colors={colors}
            />
          ))}
        </View>
      </Animated.View>

      {/* Summary Card */}
      <Animated.View entering={FadeInDown.delay(300).duration(200)}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>{orderSummary}</Text>
        </View>
      </Animated.View>

      {/* Add Drill Button */}
      <Animated.View entering={FadeInDown.delay(350).duration(200)}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.text }]}
          onPress={handleIssueDrill}
          activeOpacity={0.85}
        >
          <Check size={18} color={colors.background} strokeWidth={2.5} />
          <Text style={[styles.addButtonText, { color: colors.background }]}>{t('training.addDrill')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Team Drills Section */}
      {availableDrills.length > 0 && (
        <Animated.View entering={FadeInDown.delay(400).duration(200)} style={styles.teamSection}>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t('training.orSelectTeamDrill')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.teamList}>
            {availableDrills.slice(0, 4).map((drill) => (
              <TouchableOpacity
                key={drill.id}
                style={[styles.teamDrill, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleIssueTeamDrill(drill)}
                activeOpacity={0.7}
              >
                <View style={[styles.teamDrillIcon, { backgroundColor: colors.secondary }]}>
                  <Shield size={16} color={colors.textMuted} />
                </View>
                <View style={styles.teamDrillInfo}>
                  <Text style={[styles.teamDrillName, { color: colors.text }]} numberOfLines={1}>
                    {drill.name}
                  </Text>
                  <Text style={[styles.teamDrillMeta, { color: colors.textMuted }]}>
                    {drill.distance_m}m · {drill.rounds_per_shooter} rds
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
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
    paddingBottom: 32,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Options
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionChipLarge: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionChipTextLarge: {
    fontSize: 15,
  },

  // Summary Card
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Team Section
  teamSection: {
    marginTop: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  teamList: {
    gap: 8,
  },
  teamDrill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  teamDrillIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamDrillInfo: {
    flex: 1,
  },
  teamDrillName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  teamDrillMeta: {
    fontSize: 12,
  },
});
