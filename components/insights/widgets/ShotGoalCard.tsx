/**
 * Shot Goal Card (Compact)
 * 
 * Monthly shot progress with goal - minimal design
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ShotGoalCardProps {
  sessions: SessionWithDetails[];
  monthlyGoal?: number;
}

export function ShotGoalCard({ sessions, monthlyGoal = 1000 }: ShotGoalCardProps) {
  const colors = useColors();

  const { totalShots, progress, monthName } = useMemo(() => {
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
      monthName: format(now, 'MMM').toUpperCase(),
    };
  }, [sessions, monthlyGoal]);

  const isComplete = progress >= 100;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>{monthName} GOAL</Text>
        {isComplete && (
          <Text style={[styles.badge, { color: colors.green, backgroundColor: `${colors.green}15` }]}>
            ✓ Complete
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.stats}>
          <Text style={[styles.value, { color: colors.text }]}>{totalShots.toLocaleString()}</Text>
          <Text style={[styles.separator, { color: colors.textMuted }]}>/</Text>
          <Text style={[styles.goal, { color: colors.textMuted }]}>{monthlyGoal.toLocaleString()}</Text>
        </View>
        <Text style={[styles.label, { color: colors.textMuted }]}>shots</Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, Math.max(0, progress))}%`,
              backgroundColor: isComplete ? colors.green : colors.purple,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  separator: {
    fontSize: 18,
    fontWeight: '400',
    marginHorizontal: 4,
  },
  goal: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});







