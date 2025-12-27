/**
 * Personal Records Card
 * 
 * Shows the user's personal bests:
 * - Best accuracy percentage
 * - Tightest shot group
 * - Longest training streak
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { format } from 'date-fns';
import { Award, Crosshair, Flame, Target } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface PersonalRecordsCardProps {
  sessions: SessionWithDetails[];
}

interface PersonalRecords {
  bestAccuracy: { value: number; date: Date } | null;
  tightestGroup: { value: number; distance: number; date: Date } | null;
  longestStreak: number;
}

function calculatePersonalRecords(sessions: SessionWithDetails[]): PersonalRecords {
  let bestAccuracy: PersonalRecords['bestAccuracy'] = null;
  let tightestGroup: PersonalRecords['tightestGroup'] = null;

  // Calculate best accuracy and tightest group from sessions
  sessions.forEach((session) => {
    if (session.stats && session.stats.shots_fired > 0) {
      const accuracy = session.stats.accuracy_pct;
      if (!bestAccuracy || accuracy > bestAccuracy.value) {
        bestAccuracy = { value: accuracy, date: new Date(session.started_at) };
      }
    }

    // Check for best dispersion
    if (session.stats?.best_dispersion_cm) {
      const distance = session.stats.avg_distance_m || 10;
      if (!tightestGroup || session.stats.best_dispersion_cm < tightestGroup.value) {
        tightestGroup = {
          value: session.stats.best_dispersion_cm,
          distance,
          date: new Date(session.started_at),
        };
      }
    }
  });

  // Calculate streak (consecutive days with at least one session)
  const sortedSessions = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  let longestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  sortedSessions.forEach((session) => {
    const sessionDate = new Date(session.started_at);
    sessionDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      currentStreak = 1;
    } else {
      const dayDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        currentStreak++;
      } else if (dayDiff > 1) {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
      // If dayDiff === 0, same day, don't increment
    }

    lastDate = sessionDate;
  });
  longestStreak = Math.max(longestStreak, currentStreak);

  return { bestAccuracy, tightestGroup, longestStreak };
}

export function PersonalRecordsCard({ sessions }: PersonalRecordsCardProps) {
  const colors = useColors();

  const records = useMemo(() => calculatePersonalRecords(sessions), [sessions]);

  const hasAnyRecords = records.bestAccuracy || records.tightestGroup || records.longestStreak > 0;

  if (!hasAnyRecords) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${colors.orange}22` }]}>
            <Award size={18} color={colors.orange} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Personal Bests</Text>
        </View>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Complete more sessions to set records!
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: `${colors.orange}22` }]}>
          <Award size={18} color={colors.orange} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Personal Bests</Text>
      </View>

      <View style={styles.recordsList}>
        {/* Best Accuracy */}
        {records.bestAccuracy && (
          <View style={[styles.recordItem, { borderColor: colors.border }]}>
            <View style={[styles.recordIcon, { backgroundColor: `${colors.green}22` }]}>
              <Crosshair size={16} color={colors.green} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Best Accuracy</Text>
              <Text style={[styles.recordValue, { color: colors.text }]}>
                {records.bestAccuracy.value}%
              </Text>
            </View>
            <Text style={[styles.recordDate, { color: colors.textMuted }]}>
              {format(records.bestAccuracy.date, 'MMM d')}
            </Text>
          </View>
        )}

        {/* Tightest Group */}
        {records.tightestGroup && (
          <View style={[styles.recordItem, { borderColor: colors.border }]}>
            <View style={[styles.recordIcon, { backgroundColor: `${colors.indigo}22` }]}>
              <Target size={16} color={colors.indigo} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Tightest Group</Text>
              <Text style={[styles.recordValue, { color: colors.text }]}>
                {records.tightestGroup.value.toFixed(1)}cm
              </Text>
            </View>
            <Text style={[styles.recordDate, { color: colors.textMuted }]}>
              @ {records.tightestGroup.distance}m
            </Text>
          </View>
        )}

        {/* Longest Streak */}
        {records.longestStreak > 0 && (
          <View style={[styles.recordItem, { borderColor: colors.border }]}>
            <View style={[styles.recordIcon, { backgroundColor: `${colors.red}22` }]}>
              <Flame size={16} color={colors.red} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordLabel, { color: colors.textMuted }]}>Longest Streak</Text>
              <Text style={[styles.recordValue, { color: colors.text }]}>
                {records.longestStreak} days
              </Text>
            </View>
          </View>
        )}
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  recordsList: {
    gap: 12,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  recordValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  recordDate: {
    fontSize: 12,
    fontWeight: '500',
  },
});










