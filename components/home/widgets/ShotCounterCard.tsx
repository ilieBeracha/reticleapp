/**
 * Shot Counter Card
 * 
 * Shows total shots fired this month with optional goal progress
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { Crosshair } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ShotCounterCardProps {
  sessions: SessionWithDetails[];
  monthlyGoal?: number; // Optional goal
}

export function ShotCounterCard({ sessions, monthlyGoal = 1000 }: ShotCounterCardProps) {
  const colors = useColors();

  const { totalShots, progress } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let shots = 0;
    sessions.forEach((session) => {
      const date = new Date(session.started_at);
      if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
        shots += session.stats?.shots_fired ?? 0;
      }
    });

    return {
      totalShots: shots,
      progress: Math.min((shots / monthlyGoal) * 100, 100),
    };
  }, [sessions, monthlyGoal]);

  const monthName = format(new Date(), 'MMMM');

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: `${colors.purple}22` }]}>
          <Crosshair size={18} color={colors.purple} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Shots This {monthName}</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {totalShots.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: progress >= 100 ? colors.green : colors.purple,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {Math.round(progress)}% of goal
          </Text>
          <Text style={[styles.progressGoal, { color: colors.textMuted }]}>
            Goal: {monthlyGoal.toLocaleString()}
          </Text>
        </View>
      </View>

      {progress >= 100 && (
        <View style={[styles.achievementBanner, { backgroundColor: `${colors.green}15` }]}>
          <Text style={[styles.achievementText, { color: colors.green }]}>
            🎯 Monthly goal reached!
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressContainer: {
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressGoal: {
    fontSize: 12,
    fontWeight: '500',
  },
  achievementBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  achievementText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

