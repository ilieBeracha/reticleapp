/**
 * Training Streak Card
 * 
 * Shows the user's current training streak with a weekly view:
 * - Current streak days
 * - Visual week calendar (Mon-Sun)
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { Flame } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TrainingStreakCardProps {
  sessions: SessionWithDetails[];
}

function calculateCurrentStreak(sessions: SessionWithDetails[]): number {
  const sortedSessions = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  if (sortedSessions.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique session days
  const sessionDays = new Set<string>();
  sortedSessions.forEach((session) => {
    const date = new Date(session.started_at);
    date.setHours(0, 0, 0, 0);
    sessionDays.add(date.toISOString());
  });

  // Check from today backwards
  let checkDate = new Date(today);
  
  // If no session today, check if yesterday had one to continue the streak
  if (!sessionDays.has(checkDate.toISOString())) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!sessionDays.has(checkDate.toISOString())) {
      return 0; // No session today or yesterday, streak is broken
    }
  }

  // Count consecutive days
  while (sessionDays.has(checkDate.toISOString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function getWeekDays(): Date[] {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function TrainingStreakCard({ sessions }: TrainingStreakCardProps) {
  const colors = useColors();

  const { streak, weekDays, trainedDays } = useMemo(() => {
    const currentStreak = calculateCurrentStreak(sessions);
    const days = getWeekDays();
    
    // Create a set of days with sessions this week
    const trained = new Set<string>();
    sessions.forEach((session) => {
      const sessionDate = new Date(session.started_at);
      sessionDate.setHours(0, 0, 0, 0);
      trained.add(sessionDate.toISOString());
    });

    return {
      streak: currentStreak,
      weekDays: days,
      trainedDays: trained,
    };
  }, [sessions]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: streak > 0 ? `${colors.orange}22` : `${colors.textMuted}22` }]}>
          <Flame size={18} color={streak > 0 ? colors.orange : colors.textMuted} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.streakValue, { color: streak > 0 ? colors.orange : colors.textMuted }]}>
            {streak} Day{streak !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
            {streak > 0 ? 'Current Streak' : 'No Active Streak'}
          </Text>
        </View>
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((day) => {
          const dayStr = day.toISOString().split('T')[0];
          const isTrained = Array.from(trainedDays).some((d) => d.startsWith(dayStr));
          const isToday = isSameDay(day, today);
          const isFuture = day > today;

          return (
            <View key={day.toISOString()} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
                {format(day, 'EEE').charAt(0)}
              </Text>
              <View
                style={[
                  styles.dayDot,
                  {
                    backgroundColor: isTrained
                      ? colors.green
                      : isFuture
                      ? colors.border
                      : colors.secondary,
                    borderColor: isToday ? colors.primary : 'transparent',
                    borderWidth: isToday ? 2 : 0,
                  },
                ]}
              >
                {isTrained && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {streak >= 3 && (
        <View style={[styles.motivationBanner, { backgroundColor: `${colors.orange}15` }]}>
          <Text style={[styles.motivationText, { color: colors.orange }]}>
            🔥 Keep it up! You're on fire!
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
    marginBottom: 20,
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
  streakValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  motivationBanner: {
    marginTop: 16,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 13,
    fontWeight: '600',
  },
});




