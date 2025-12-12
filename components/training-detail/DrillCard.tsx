import { Ionicons } from '@expo/vector-icons';
import { Crosshair, Play, Target } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import type { ThemeColors, TrainingDrill, TrainingStatus } from './types';

interface DrillCardProps {
  drill: TrainingDrill;
  index: number;
  colors: ThemeColors;
  trainingStatus: TrainingStatus;
  onStartDrill?: (drill: TrainingDrill) => void;
  isStarting?: boolean;
  isCompleted?: boolean;
}

export function DrillCard({
  drill,
  index,
  colors,
  trainingStatus,
  onStartDrill,
  isStarting,
  isCompleted,
}: DrillCardProps) {
  const canStart = trainingStatus === 'ongoing' && onStartDrill && !isCompleted;
  const isPaper = drill.target_type === 'paper';
  const isLive = trainingStatus === 'ongoing';

  return (
    <Animated.View entering={FadeInRight.delay(50 + index * 40).springify()}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: isCompleted ? 'rgba(147,197,253,0.4)' : canStart ? colors.text : colors.border },
          canStart && styles.cardActive,
          isCompleted && styles.cardCompleted,
        ]}
        onPress={() => canStart && onStartDrill?.(drill)}
        disabled={!canStart || isStarting}
        activeOpacity={canStart ? 0.7 : 1}
      >
        {/* Left: Number + Icon */}
        <View style={styles.leftSection}>
          <View
            style={[
              styles.indexBadge,
              { backgroundColor: isCompleted ? '#93C5FD' : canStart ? colors.text : colors.secondary },
            ]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={14} color="#000" />
            ) : (
              <Text style={[styles.indexText, { color: canStart ? colors.background : colors.textMuted }]}>
                {index + 1}
              </Text>
            )}
          </View>
          <View style={[styles.typeIcon, { backgroundColor: isPaper ? 'rgba(147,197,253,0.12)' : 'rgba(156,163,175,0.12)' }]}>
            {isPaper ? (
              <Target size={18} color="#93C5FD" />
            ) : (
              <Crosshair size={18} color={colors.textMuted} />
            )}
          </View>
        </View>

        {/* Middle: Info */}
        <View style={styles.content}>
          <Text
            style={[
              styles.name,
              { color: colors.text },
              isCompleted && styles.nameCompleted,
            ]}
            numberOfLines={1}
          >
            {drill.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{drill.distance_m}m</Text>
            <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {(drill.strings_count ?? 1)} rounds • {drill.rounds_per_shooter} shots/round
            </Text>
            {drill.time_limit_seconds && (
              <>
                <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>{drill.time_limit_seconds}s</Text>
              </>
            )}
          </View>
        </View>

        {/* Right: Action */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#93C5FD" />
            <Text style={styles.completedText}>Done</Text>
          </View>
        )}

        {canStart && (
          <View style={[styles.startButton, { backgroundColor: colors.text }]}>
            {isStarting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Play size={14} color={colors.background} fill={colors.background} />
                <Text style={[styles.startText, { color: colors.background }]}>Start</Text>
              </>
            )}
          </View>
        )}

        {!canStart && !isCompleted && trainingStatus !== 'ongoing' && (
          <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {trainingStatus === 'planned' ? 'Pending' : 'Inactive'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  cardActive: {
    borderWidth: 1.5,
  },
  cardCompleted: {
    opacity: 0.85,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(147,197,253,0.15)',
    borderRadius: 10,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#93C5FD',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 76,
    justifyContent: 'center',
  },
  startText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
