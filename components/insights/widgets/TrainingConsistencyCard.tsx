/**
 * Training Consistency Card
 * 
 * Shows training patterns by day of week with a mini heatmap
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TrainingConsistencyCardProps {
  sessions: SessionWithDetails[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TrainingConsistencyCard({ sessions }: TrainingConsistencyCardProps) {
  const colors = useColors();

  const { dayStats, bestDay, totalThisWeek, avgPerWeek } = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let thisWeekCount = 0;
    
    sessions.forEach((session) => {
      const date = new Date(session.started_at);
      counts[date.getDay()]++;
      
      if (date >= oneWeekAgo) {
        thisWeekCount++;
      }
    });

    const maxCount = Math.max(...counts);
    const bestDayIndex = counts.indexOf(maxCount);
    
    // Calculate weeks of data
    if (sessions.length === 0) {
      return { 
        dayStats: counts.map((_, i) => ({ day: DAYS[i], count: 0, intensity: 0 })),
        bestDay: null,
        totalThisWeek: 0,
        avgPerWeek: 0,
      };
    }
    
    const oldestSession = new Date(sessions[sessions.length - 1]?.started_at || now);
    const weeksOfData = Math.max(1, Math.ceil((now.getTime() - oldestSession.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    
    return {
      dayStats: counts.map((count, i) => ({
        day: DAYS[i],
        count,
        intensity: maxCount > 0 ? count / maxCount : 0,
      })),
      bestDay: maxCount > 0 ? { index: bestDayIndex, name: DAYS_FULL[bestDayIndex], count: maxCount } : null,
      totalThisWeek: thisWeekCount,
      avgPerWeek: Math.round(sessions.length / weeksOfData * 10) / 10,
    };
  }, [sessions]);

  if (sessions.length < 3) return null;

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return colors.secondary;
    if (intensity < 0.33) return `rgba(99,102,241,0.3)`;
    if (intensity < 0.66) return `rgba(99,102,241,0.6)`;
    return colors.primary;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>TRAINING PATTERN</Text>
      </View>

      {/* Day heatmap */}
      <View style={styles.heatmapRow}>
        {dayStats.map((stat) => (
          <View key={stat.day} style={styles.dayColumn}>
            <View 
              style={[
                styles.dayCell, 
                { backgroundColor: getIntensityColor(stat.intensity) }
              ]} 
            />
            <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{stat.day}</Text>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalThisWeek}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>This week</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{avgPerWeek}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg/week</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {bestDay?.name.slice(0, 3) || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best day</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayCell: {
    width: 36,
    height: 24,
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
