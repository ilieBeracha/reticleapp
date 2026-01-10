/**
 * Shot Goal Card
 * 
 * Monthly shot progress with visual progress ring
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { endOfMonth, format, isWithinInterval, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ShotGoalCardProps {
  sessions: SessionWithDetails[];
  monthlyGoal?: number;
}

export function ShotGoalCard({ sessions, monthlyGoal = 1000 }: ShotGoalCardProps) {
  const colors = useColors();

  const { totalShots, progress, monthName, daysLeft } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const remaining = Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
      monthName: format(now, 'MMMM'),
      daysLeft: remaining,
    };
  }, [sessions, monthlyGoal]);

  const isComplete = progress >= 100;
  const shotsRemaining = Math.max(0, monthlyGoal - totalShots);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        {/* Left: Info */}
        <View style={styles.info}>
          <View style={styles.header}>
            <Ionicons name="flag" size={16} color={isComplete ? colors.green : colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Monthly Goal</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={[styles.current, { color: colors.text }]}>
              {totalShots.toLocaleString()}
            </Text>
            <Text style={[styles.divider, { color: colors.textMuted }]}>/</Text>
            <Text style={[styles.target, { color: colors.textMuted }]}>
              {monthlyGoal.toLocaleString()}
            </Text>
            <Text style={[styles.unit, { color: colors.textMuted }]}>shots</Text>
          </View>

          {isComplete ? (
            <View style={[styles.statusBadge, { backgroundColor: `${colors.green}15` }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.green} />
              <Text style={[styles.statusText, { color: colors.green }]}>Goal reached!</Text>
            </View>
          ) : (
            <Text style={[styles.remaining, { color: colors.textMuted }]}>
              {shotsRemaining.toLocaleString()} shots • {daysLeft} days left
            </Text>
          )}
        </View>

        {/* Right: Progress Ring */}
        <View style={styles.ringContainer}>
          <View style={[styles.ringBg, { borderColor: colors.secondary }]}>
            <View 
              style={[
                styles.ringProgress, 
                { 
                  borderColor: isComplete ? colors.green : colors.primary,
                  transform: [{ rotate: '-90deg' }],
                }
              ]} 
            />
            <Text style={[styles.ringText, { color: colors.text }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, Math.max(0, progress))}%`,
              backgroundColor: isComplete ? colors.green : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  current: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  divider: {
    fontSize: 18,
    fontWeight: '400',
  },
  target: {
    fontSize: 16,
    fontWeight: '600',
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  remaining: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ringContainer: {
    marginLeft: 16,
  },
  ringBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringText: {
    fontSize: 14,
    fontWeight: '700',
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
