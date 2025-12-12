/**
 * ACTIVITY LOG
 * Event-style display of this week's sessions
 */
import {
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  isYesterday,
  startOfWeek,
} from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Crosshair, Target } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BUTTON_GRADIENT } from '@/theme/colors';
import type { ThemeColors } from './types';

interface WeeklyActivityChartProps {
  sessions: any[];
  colors: ThemeColors;
}

export function WeeklyActivityChart({ sessions, colors }: WeeklyActivityChartProps) {
  const { weekDays, recentSessions, weekSessionCount, streak } = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Map days with session counts
    const dayData = days.map((day) => {
      const daySessions = sessions.filter((s) => {
        const sessionDate = new Date(s.started_at);
        return (
          sessionDate.getDate() === day.getDate() &&
          sessionDate.getMonth() === day.getMonth() &&
          sessionDate.getFullYear() === day.getFullYear()
        );
      });
      return {
        date: day,
        dayLetter: format(day, 'EEEEE'),
        count: daySessions.length,
        isToday: isToday(day),
        isFuture: day > new Date(),
      };
    });

    // Get this week's sessions, sorted by most recent
    const weekSessions = sessions
      .filter((s) => {
        const d = new Date(s.started_at);
        return d >= weekStart && d <= weekEnd;
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 5); // Show last 5

    // Calculate streak
    let currentStreak = 0;
    for (let i = dayData.length - 1; i >= 0; i--) {
      const day = dayData[i];
      if (day.isFuture) continue;
      if (day.count > 0) {
        currentStreak++;
      } else if (!day.isToday) {
        break;
      }
    }

    return {
      weekDays: dayData,
      recentSessions: weekSessions,
      weekSessionCount: weekSessions.length,
      streak: currentStreak,
    };
  }, [sessions]);

  const formatSessionTime = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt);
    if (isToday(start)) {
      return `Today, ${format(start, 'h:mm a')}`;
    } else if (isYesterday(start)) {
      return `Yesterday, ${format(start, 'h:mm a')}`;
    }
    return format(start, 'EEE, MMM d · h:mm a');
  };

  const formatDuration = (startedAt: string, endedAt?: string) => {
    if (!endedAt) return 'In progress';
    const mins = differenceInMinutes(new Date(endedAt), new Date(startedAt));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(400)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header with week strip */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>Activity</Text>
            {streak > 1 && (
              <View style={[styles.streakBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={[styles.streakText, { color: '#F59E0B' }]}>{streak}</Text>
              </View>
            )}
          </View>
          
          {/* Mini week strip */}
          <View style={styles.weekStrip}>
            {weekDays.map((day, i) => (
              <View key={i} style={styles.weekDay}>
                <Text style={[styles.weekDayLetter, { color: day.isToday ? colors.text : colors.textMuted }]}>
                  {day.dayLetter}
                </Text>
                <View
                  style={[
                    styles.weekDot,
                    day.count > 0 && styles.weekDotActive,
                    day.isToday && styles.weekDotToday,
                    {
                      backgroundColor: day.count > 0
                        ? day.isToday ? colors.text : 'rgba(156,163,175,0.5)'
                        : 'transparent',
                      borderColor: day.isToday ? colors.text : colors.border,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Session Events Log */}
        <View style={styles.eventLog}>
          {recentSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Target size={20} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No sessions this week yet
              </Text>
            </View>
          ) : (
            recentSessions.map((session, index) => (
              <Animated.View
                key={session.id}
                entering={FadeIn.delay(100 + index * 50).duration(300)}
              >
                <View
                  style={[
                    styles.eventRow,
                    index < recentSessions.length - 1 && styles.eventRowBorder,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  {/* Timeline dot */}
                  <View style={styles.timelineCol}>
                    {session.status === 'active' ? (
                      <LinearGradient
                        colors={[...BUTTON_GRADIENT]}
                        style={styles.timelineDotGradient}
                      />
                    ) : (
                      <View style={[styles.timelineDot, { backgroundColor: colors.border }]} />
                    )}
                    {index < recentSessions.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>

                  {/* Event Content */}
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                        {session.training_title || session.drill_name || 'Freestyle Session'}
                      </Text>
                      {session.status === 'active' && (
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>LIVE</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.eventTime, { color: colors.textMuted }]}>
                      {formatSessionTime(session.started_at)}
                    </Text>

                    {/* Session Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={[styles.statText, { color: colors.textMuted }]}>
                          {formatDuration(session.started_at, session.ended_at)}
                        </Text>
                      </View>
                      {session.targets && session.targets.length > 0 && (
                        <>
                          <View style={styles.statItem}>
                            <Target size={12} color={colors.textMuted} />
                            <Text style={[styles.statText, { color: colors.textMuted }]}>
                              {session.targets.length}
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Crosshair size={12} color={colors.textMuted} />
                            <Text style={[styles.statText, { color: colors.textMuted }]}>
                              {session.targets.reduce((sum: number, t: any) => sum + (t.shots_fired || 0), 0)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </View>

        {/* Footer */}
        {weekSessionCount > 0 && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {weekSessionCount} session{weekSessionCount !== 1 ? 's' : ''} this week
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streakIcon: {
    fontSize: 10,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Week Strip
  weekStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  weekDay: {
    alignItems: 'center',
    gap: 3,
  },
  weekDayLetter: {
    fontSize: 9,
    fontWeight: '600',
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  weekDotActive: {},
  weekDotToday: {
    borderWidth: 2,
  },

  // Event Log
  eventLog: {
    paddingHorizontal: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },

  // Event Row
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  eventRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Timeline
  timelineCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineDotGradient: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 4,
  },

  // Event Content
  eventContent: {
    flex: 1,
    marginLeft: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  eventTime: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Footer
  footer: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
