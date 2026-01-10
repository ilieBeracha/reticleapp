/**
 * Drill Card Component
 *
 * Displays a drill template with actions.
 * Used in Library browser and training creation.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { DrillTemplate } from '@/types/drillTypes';
import { DRILL_TYPES } from '@/types/drillTypes';
import * as Haptics from 'expo-haptics';
import { Award, Clock, Copy, Eye, Info, Plus, Target } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ============================================================================
// TYPES
// ============================================================================

interface DrillCardProps {
  template: DrillTemplate;
  index?: number;
  onView?: () => void;
  onDuplicate?: () => void;
  onUse?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const TYPE_ICONS: Record<string, any> = {
  zeroing: Target,
  grouping: Target,
  timed: Clock,
  qualification: Award,
};

// ============================================================================
// DIFFICULTY BADGE
// ============================================================================

function DifficultyBadge({ difficulty, colors }: { difficulty: string; colors: ReturnType<typeof useColors> }) {
  const config = {
    beginner: { color: '#10B981', label: 'Beginner' },
    intermediate: { color: '#F59E0B', label: 'Intermediate' },
    advanced: { color: '#EF4444', label: 'Advanced' },
  }[difficulty] || { color: colors.textMuted, label: difficulty };

  return (
    <View style={[styles.difficultyBadge, { backgroundColor: config.color + '20' }]}>
      <Text style={[styles.difficultyText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillCard({
  template,
  index = 0,
  onView,
  onDuplicate,
  onUse,
  showActions = true,
  compact = false,
}: DrillCardProps) {
  const colors = useColors();
  const drillType = DRILL_TYPES[template.drillType];
  const Icon = TYPE_ICONS[template.drillType] || Target;

  // Format params for display
  const distance = template.defaults.distance;
  const shots = template.defaults.shots;
  const parTime = template.defaults.parTime;

  const handleAction = (action: (() => void) | undefined) => {
    if (action) {
      Haptics.selectionAsync();
      action();
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleAction(onUse || onView)}
        activeOpacity={0.7}
      >
        <View style={[styles.compactIcon, { backgroundColor: drillType.color + '15' }]}>
          <Icon size={18} color={drillType.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={[styles.compactMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {distance}m • {shots} shots
          </Text>
        </View>
        {onUse && (
          <TouchableOpacity
            style={[styles.compactAction, { backgroundColor: drillType.color }]}
            onPress={() => handleAction(onUse)}
            hitSlop={8}
          >
            <Plus size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: drillType.color + '15' }]}>
          <Icon size={24} color={drillType.color} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {template.name}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.typeName, { color: drillType.color }]}>{drillType.name}</Text>
            <DifficultyBadge difficulty={template.difficulty} colors={colors} />
          </View>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
        {template.description}
      </Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{distance}m</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{shots}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots</Text>
        </View>
        {parTime && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{parTime}s</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Par</Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      {showActions && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onView && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={() => handleAction(onView)}
            >
              <Eye size={16} color={colors.textMuted} />
              <Text style={[styles.actionText, { color: colors.textMuted }]}>View</Text>
            </TouchableOpacity>
          )}
          {onDuplicate && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={() => handleAction(onDuplicate)}
            >
              <Copy size={16} color={colors.textMuted} />
              <Text style={[styles.actionText, { color: colors.textMuted }]}>Duplicate</Text>
            </TouchableOpacity>
          )}
          {onUse && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryAction, { backgroundColor: drillType.color }]}
              onPress={() => handleAction(onUse)}
            >
              <Plus size={16} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Use</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeName: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Difficulty
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Description
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryAction: {
    borderWidth: 0,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactMeta: {
    fontSize: 12,
  },
  compactAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
