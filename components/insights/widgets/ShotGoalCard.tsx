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
            <Ionicons name="flag" size={14} color={isComplete ? colors.green : colors.primary} />
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
              <Ionicons name="checkmark-circle" size={11} color={colors.green} />
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  current: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  divider: {
    fontSize: 14,
    fontWeight: '400',
  },
  target: {
    fontSize: 13,
    fontWeight: '600',
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 3,
  },
  remaining: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ringContainer: {
    marginLeft: 12,
  },
  ringBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
});
