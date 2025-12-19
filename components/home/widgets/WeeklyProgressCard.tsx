/**
 * Weekly Progress Card
 * 
 * Shows this week's training stats compared to last week:
 * - Sessions count
 * - Shots fired
 * - Average accuracy
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { endOfWeek, isWithinInterval, startOfWeek, subWeeks } from 'date-fns';
import { Activity, Crosshair, Target, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface WeeklyProgressCardProps {
  sessions: SessionWithDetails[];
}

interface WeekStats {
  sessionCount: number;
  totalShots: number;
  totalHits: number;
  avgAccuracy: number;
}

function calculateWeekStats(sessions: SessionWithDetails[], weekStart: Date, weekEnd: Date): WeekStats {
  const weekSessions = sessions.filter((s) => {
    const date = new Date(s.started_at);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  let totalShots = 0;
  let totalHits = 0;

  // We don't have detailed stats in SessionWithDetails, so we estimate from available data
  // In a real implementation, you might want to fetch aggregated stats from the backend
  weekSessions.forEach((session) => {
    // Use aggregated stats if available
    if (session.stats) {
      totalShots += session.stats.shots_fired;
      totalHits += session.stats.hits_total;
    }
  });

  const avgAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

  return {
    sessionCount: weekSessions.length,
    totalShots,
    totalHits,
    avgAccuracy,
  };
}

function TrendIndicator({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const colors = useColors();
  const diff = current - previous;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  if (isNeutral) {
    return (
      <Text style={[styles.trendText, { color: colors.textMuted }]}>—</Text>
    );
  }

  return (
    <View style={styles.trendContainer}>
      {isPositive ? (
        <TrendingUp size={12} color={colors.green} />
      ) : (
        <TrendingDown size={12} color={colors.red} />
      )}
      <Text style={[styles.trendText, { color: isPositive ? colors.green : colors.red }]}>
        {isPositive ? '+' : ''}{diff}{suffix}
      </Text>
    </View>
  );
}

export function WeeklyProgressCard({ sessions }: WeeklyProgressCardProps) {
  const colors = useColors();

  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    return {
      thisWeek: calculateWeekStats(sessions, thisWeekStart, thisWeekEnd),
      lastWeek: calculateWeekStats(sessions, lastWeekStart, lastWeekEnd),
    };
  }, [sessions]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: `${colors.indigo}22` }]}>
          <Activity size={18} color={colors.indigo} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>This Week</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>vs last week</Text>
      </View>

      <View style={styles.statsRow}>
        {/* Sessions */}
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{thisWeek.sessionCount}</Text>
          <TrendIndicator current={thisWeek.sessionCount} previous={lastWeek.sessionCount} />
        </View>

        {/* Shots */}
        <View style={[styles.statItem, styles.statItemMiddle, { borderColor: colors.border }]}>
          <View style={styles.statHeader}>
            <Crosshair size={14} color={colors.textMuted} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{thisWeek.totalShots}</Text>
          <TrendIndicator current={thisWeek.totalShots} previous={lastWeek.totalShots} />
        </View>

        {/* Accuracy */}
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{thisWeek.avgAccuracy}%</Text>
          <TrendIndicator current={thisWeek.avgAccuracy} previous={lastWeek.avgAccuracy} suffix="%" />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statItemMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});









