import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
} from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { DailyCount, ThemeColors } from './types';

interface WeeklyActivityChartProps {
  sessions: any[];
  colors: ThemeColors;
}

export function WeeklyActivityChart({ sessions, colors }: WeeklyActivityChartProps) {
  const { dailyCounts, weekSessionCount, maxCount } = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const counts: DailyCount[] = weekDays.map((day) => {
      const count = sessions.filter((s) => isSameDay(new Date(s.started_at), day)).length;
      return { day, count, label: format(day, 'EEE') };
    });

    const weekCount = sessions.filter((s) => {
      const d = new Date(s.started_at);
      return d >= weekStart && d <= weekEnd;
    }).length;

    return {
      dailyCounts: counts,
      weekSessionCount: weekCount,
      maxCount: Math.max(...counts.map((d) => d.count), 1),
    };
  }, [sessions]);

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>This Week</Text>
          <Text style={[styles.badge, { color: colors.textMuted }]}>
            {weekSessionCount} session{weekSessionCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.bars}>
          {dailyCounts.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 40 : 4;
            const barHeight = Math.max(height, 4);
            const today = isToday(item.day);

            return (
              <Animated.View
                key={item.label}
                entering={FadeInDown.delay(250 + index * 40).duration(350)}
                style={styles.barColumn}
              >
                <View style={styles.barWrapper}>
                  {today && item.count > 0 ? (
                    <Svg height={barHeight} width={12}>
                      <Defs>
                        <LinearGradient id={`barGrad${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                          <Stop offset="50%" stopColor="rgba(147,197,253,0.7)" />
                          <Stop offset="100%" stopColor="rgba(156,163,175,0.8)" />
                        </LinearGradient>
                      </Defs>
                      <Rect 
                        x="0" 
                        y="0" 
                        width="12" 
                        height={barHeight} 
                        rx="3" 
                        fill={`url(#barGrad${index})`} 
                      />
                    </Svg>
                  ) : (
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: colors.border,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.barLabel, { color: today ? colors.text : colors.textMuted }]}
                >
                  {item.label.charAt(0)}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    fontSize: 11,
    fontWeight: '500',
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 50,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '45%',
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
});
