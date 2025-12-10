import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { SessionStats, ThemeColors } from './types';

interface CompletionCardProps {
  completionRate: number;
  stats: SessionStats;
  colors: ThemeColors;
}

export function CompletionCard({ completionRate, stats, colors }: CompletionCardProps) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.content}>
          <View style={styles.ringContainer}>
            <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.border}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.text}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.ringValue, { color: colors.text }]}>{completionRate}%</Text>
            </View>
          </View>

          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>Completion Rate</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {stats.completedSessions} of {stats.totalSessions} sessions finished
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>
                  {stats.completedSessions} completed
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>
                  {stats.activeSessions} active
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  statsRow: {
    gap: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 12,
  },
});
