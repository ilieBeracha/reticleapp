import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50)}>
      <View
        style={[
          styles.card, 
          { backgroundColor: colors.background, borderColor: colors.border },
          isCompleted && styles.cardCompleted,
        ]}
      >
        {/* Index or Checkmark */}
        <View
          style={[
            styles.index,
            { backgroundColor: isCompleted ? '#22C55E20' : canStart ? colors.primary + '20' : colors.secondary },
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color="#22C55E" />
          ) : (
            <Text style={[styles.indexText, { color: canStart ? colors.primary : colors.textMuted }]}>
              #{index + 1}
            </Text>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[
            styles.name, 
            { color: colors.text },
            isCompleted && styles.nameCompleted,
          ]}>{drill.name}</Text>
          <View style={styles.details}>
            <View
              style={[
                styles.badge,
                { backgroundColor: drill.target_type === 'paper' ? '#8B5CF620' : '#F59E0B20' },
              ]}
            >
              <Ionicons
                name={drill.target_type === 'paper' ? 'scan-outline' : 'flash-outline'}
                size={12}
                color={drill.target_type === 'paper' ? '#8B5CF6' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: drill.target_type === 'paper' ? '#8B5CF6' : '#F59E0B' },
                ]}
              >
                {drill.target_type}
              </Text>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{drill.distance_m}m</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {drill.rounds_per_shooter} rds
            </Text>
          </View>
        </View>

        {/* Completed badge */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Done</Text>
          </View>
        )}

        {/* Start button */}
        {canStart && (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={() => onStartDrill(drill)}
            disabled={isStarting}
            activeOpacity={0.8}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.startText}>Start</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 12,
    alignItems: 'center',
  },
  cardCompleted: {
    opacity: 0.7,
  },
  index: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: '#22C55E20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: 'center',
  },
  startText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
