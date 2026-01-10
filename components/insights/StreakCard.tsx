/**
 * Streak Card
 * 
 * Shows current training streak with weekly activity dots
 */
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StreakDay, ThemeColors } from './types';

interface StreakCardProps {
  sessions: any[];
  colors: ThemeColors;
}

export function StreakCard({ sessions, colors }: StreakCardProps) {
  const { streak, longestStreak } = useMemo(() => {
    let count = 0;
    let longest = 0;
    let tempStreak = 0;
    const currentDate = new Date();

    // Current streak
    for (let i = 0; i < 365; i++) {
      const checkDate = subDays(currentDate, i);
      const hasSession = sessions.some((s) => isSameDay(new Date(s.started_at), checkDate));

      if (hasSession) {
        count++;
      } else if (i > 0) {
        break;
      }
    }

    // Longest streak (simplified)
    const sortedDates = sessions
      .map((s) => new Date(s.started_at))
      .sort((a, b) => a.getTime() - b.getTime());
    
    sortedDates.forEach((date, i) => {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = sortedDates[i - 1];
        const diff = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longest = Math.max(longest, tempStreak);
    });

    return { streak: count, longestStreak: Math.max(longest, count) };
  }, [sessions]);

  const streakDays: StreakDay[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const hasSession = sessions.some((s) => isSameDay(new Date(s.started_at), day));
      return { day, hasSession, label: format(day, 'EEE')[0] };
    });
  }, [sessions]);

  const isOnFire = streak >= 7;
  const streakColor = isOnFire ? '#F97316' : colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        {/* Left: Streak Info */}
        <View style={styles.info}>
          <View style={styles.header}>
            <Ionicons 
              name={isOnFire ? 'flame' : 'flame-outline'} 
              size={18} 
              color={streakColor} 
            />
            <Text style={[styles.title, { color: colors.text }]}>Training Streak</Text>
            {isOnFire && (
              <View style={[styles.fireBadge, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                <Text style={styles.fireText}>On Fire!</Text>
              </View>
            )}
          </View>
          
          <View style={styles.streakRow}>
            <Text style={[styles.streakValue, { color: colors.text }]}>{streak}</Text>
            <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
              day{streak !== 1 ? 's' : ''} in a row
            </Text>
          </View>

          <Text style={[styles.best, { color: colors.textMuted }]}>
            Best: {longestStreak} days
          </Text>
        </View>

        {/* Right: Week Dots */}
        <View style={styles.weekContainer}>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>This Week</Text>
          <View style={styles.dotsRow}>
            {streakDays.map((item, index) => (
              <View key={index} style={styles.dayCol}>
                <View
                  style={[
                    styles.dot,
                    item.hasSession 
                      ? { backgroundColor: streakColor } 
                      : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border }
                  ]}
                >
                  {item.hasSession && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </View>
                <Text style={[styles.dayText, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
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
  },
  info: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  fireBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  fireText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F97316',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  best: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 9,
    fontWeight: '600',
  },
});
