import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { StreakDay, ThemeColors } from './types';

interface StreakCardProps {
  sessions: any[];
  colors: ThemeColors;
}

export function StreakCard({ sessions, colors }: StreakCardProps) {
  const streak = useMemo(() => {
    let count = 0;
    const currentDate = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(currentDate, i);
      const hasSession = sessions.some((s) => isSameDay(new Date(s.started_at), checkDate));

      if (hasSession) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [sessions]);

  const streakDays: StreakDay[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const hasSession = sessions.some((s) => isSameDay(new Date(s.started_at), day));
      return { day, hasSession, label: format(day, 'EEEEE') };
    });
  }, [sessions]);

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Ionicons name="flame-outline" size={20} color={colors.text} />
            <View style={styles.textContainer}>
              <Text style={[styles.value, { color: colors.text }]}>
                {streak} day{streak !== 1 ? 's' : ''}
              </Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>Current Streak</Text>
            </View>
          </View>
          {streak >= 7 && (
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>🔥 On Fire</Text>
            </View>
          )}
        </View>

        <View style={styles.days}>
          {streakDays.map((item, index) => (
            <View key={index} style={styles.dayColumn}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: item.hasSession ? colors.text : 'transparent',
                    borderColor: item.hasSession ? colors.text : colors.border,
                  },
                ]}
              >
                {item.hasSession && <Ionicons name="checkmark" size={10} color={colors.background} />}
              </View>
              <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{item.label}</Text>
            </View>
          ))}
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    gap: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
