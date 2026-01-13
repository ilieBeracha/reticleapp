/**
 * WeeklyActivityChart Component
 *
 * Mini bar chart showing daily activity for the current week.
 * Visual representation of training consistency.
 */

import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { Colors } from '../UnifiedHomePage.types';

interface DayActivity {
  day: string;
  shots: number;
  hasSession: boolean;
}

interface WeeklyActivityChartProps {
  colors: Colors;
  sessionsData: Array<{
    started_at?: string | null;
    ended_at?: string | null;
    stats?: { shots_fired?: number } | null;
  }>;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_BAR_HEIGHT = 40;

function AnimatedBar({
  height,
  color,
  hasSession,
  index,
  colors,
}: {
  height: number;
  color: string;
  hasSession: boolean;
  index: number;
  colors: Colors;
}) {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withDelay(
      index * 80,
      withTiming(height, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <View style={s.barContainer}>
      <View style={[s.barBackground, { backgroundColor: colors.secondary }]}>
        <Animated.View
          style={[
            s.bar,
            { backgroundColor: hasSession ? color : colors.border },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}

export function WeeklyActivityChart({ colors, sessionsData }: WeeklyActivityChartProps) {
  const weekData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const weekDays: DayActivity[] = DAYS.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = sessionsData.filter((session) => {
        const sessionDate = new Date(session.started_at || session.ended_at || '');
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      const totalShots = daySessions.reduce(
        (sum, s) => sum + (s.stats?.shots_fired || 0),
        0
      );

      return {
        day,
        shots: totalShots,
        hasSession: daySessions.length > 0,
      };
    });

    return weekDays;
  }, [sessionsData]);

  const maxShots = Math.max(...weekData.map((d) => d.shots), 50);
  const todayIndex = new Date().getDay();
  const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

  const totalShots = weekData.reduce((sum, d) => sum + d.shots, 0);
  const activeDays = weekData.filter((d) => d.hasSession).length;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>This Week</Text>
        <View style={s.stats}>
          <Text style={[s.statValue, { color: colors.text }]}>{totalShots}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>shots</Text>
          <View style={[s.dot, { backgroundColor: colors.border }]} />
          <Text style={[s.statValue, { color: colors.text }]}>{activeDays}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>days</Text>
        </View>
      </View>

      <View style={s.chartContainer}>
        {weekData.map((day, index) => {
          const barHeight = day.shots > 0
            ? Math.max((day.shots / maxShots) * MAX_BAR_HEIGHT, 4)
            : 4;
          const isToday = index === adjustedTodayIndex;

          return (
            <View key={index} style={s.dayColumn}>
              <AnimatedBar
                height={barHeight}
                color={isToday ? colors.primary : colors.green}
                hasSession={day.hasSession}
                index={index}
                colors={colors}
              />
              <Text
                style={[
                  s.dayLabel,
                  { color: isToday ? colors.primary : colors.textMuted },
                  isToday && s.dayLabelActive,
                ]}
              >
                {day.day}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: MAX_BAR_HEIGHT + 24,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 6,
  },
  barBackground: {
    height: MAX_BAR_HEIGHT,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  dayLabelActive: {
    fontWeight: '700',
  },
});
