/**
 * Activity Calendar Card
 * 
 * Shows a weekly calendar spread with:
 * - Past days: Recent sessions
 * - Today: Current activity
 * - Future days: Upcoming trainings
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import type { TrainingWithDetails } from '@/types/workspace';
import {
  addDays,
  format,
  isSameDay
} from 'date-fns';
import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActivityCalendarCardProps {
  sessions: SessionWithDetails[];
  trainings: TrainingWithDetails[];
  onSessionPress?: (session: SessionWithDetails) => void;
}

interface DayData {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  sessions: SessionWithDetails[];
  trainings: TrainingWithDetails[];
}

export function ActivityCalendarCard({ sessions, trainings, onSessionPress }: ActivityCalendarCardProps) {
  const colors = useColors();

  // Generate 7 days: 3 past + today + 3 future
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: DayData[] = [];

    // 3 past + today + 3 future = 7 days total
    for (let i = -3; i <= 3; i++) {
      const date = addDays(today, i);
      const isPast = i < 0;
      const isTodayFlag = i === 0;

      // Find sessions for this day
      const daySessions = sessions.filter((s) => {
        const sessionDate = new Date(s.started_at);
        return isSameDay(sessionDate, date);
      });

      // Find trainings for this day
      const dayTrainings = trainings.filter((t) => {
        if (!t.scheduled_at) return false;
        const trainingDate = new Date(t.scheduled_at);
        return isSameDay(trainingDate, date);
      });

      result.push({
        date,
        isToday: isTodayFlag,
        isPast,
        sessions: daySessions,
        trainings: dayTrainings,
      });
    }

    return result;
  }, [sessions, trainings]);

  const handleDayPress = (day: DayData) => {
    if (day.sessions.length > 0 && onSessionPress) {
      onSessionPress(day.sessions[0]);
    } else if (day.trainings.length > 0) {
      router.push(`/(protected)/trainingDetail?id=${day.trainings[0].id}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Calendar size={14} color={colors.textMuted} />
        <Text style={[styles.headerTitle, { color: colors.textMuted }]}>Activity</Text>
      </View>

      <View style={styles.daysRow}>
        {days.map((day) => {
          const hasActivity = day.sessions.length > 0 || day.trainings.length > 0;
          const sessionCount = day.sessions.length;
          const trainingCount = day.trainings.length;

          return (
            <TouchableOpacity
              key={day.date.toISOString()}
              style={[
                styles.dayCard,
                {
                  backgroundColor: day.isToday ? colors.primary : colors.card,
                  borderColor: day.isToday ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={hasActivity ? 0.7 : 1}
              disabled={!hasActivity}
            >
              {/* Day label */}
              <Text
                style={[
                  styles.dayLabel,
                  { color: day.isToday ? '#fff' : colors.textMuted },
                ]}
              >
                {format(day.date, 'EEEEE')}
              </Text>

              {/* Date number */}
              <Text
                style={[
                  styles.dayNumber,
                  { color: day.isToday ? '#fff' : colors.text },
                ]}
              >
                {format(day.date, 'd')}
              </Text>

              {/* Activity indicators */}
              <View style={styles.indicators}>
                {sessionCount > 0 && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: day.isToday ? '#fff' : colors.green },
                    ]}
                  />
                )}

                {trainingCount > 0 && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: day.isToday ? '#fff' : colors.orange },
                    ]}
                  />
                )}

                {!hasActivity && (
                  <View style={[styles.dot, { backgroundColor: 'transparent' }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Sessions</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.orange }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Trainings</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  indicators: {
    flexDirection: 'row',
    gap: 3,
    minHeight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
});










