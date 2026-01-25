/**
 * Monthly Comparison Card (Compact)
 * 
 * Compares this month vs last month - minimal design
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { endOfMonth, format, isWithinInterval, startOfMonth, subMonths } from 'date-fns';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MonthlyComparisonCardProps {
  sessions: SessionWithDetails[];
}

interface MonthStats {
  sessions: number;
  shots: number;
  accuracy: number;
}

function calculateMonthStats(sessions: SessionWithDetails[], monthStart: Date, monthEnd: Date): MonthStats {
  const monthSessions = sessions.filter((s) => {
    const date = new Date(s.started_at);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  let shots = 0;
  let hits = 0;

  monthSessions.forEach((session) => {
    if (session.stats) {
      shots += session.stats.shots_fired;
      hits += session.stats.hits_total;
    }
  });

  return {
    sessions: monthSessions.length,
    shots,
    accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
  };
}

function ChangeIndicator({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const colors = useColors();
  const diff = current - previous;
  if (diff === 0) return null;

  const isPositive = diff > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? colors.green : colors.red;

  return (
    <View style={styles.changeRow}>
      <Icon size={10} color={color} />
      <Text style={[styles.changeText, { color }]}>
        {isPositive ? '+' : ''}{diff}{suffix}
      </Text>
    </View>
  );
}

export function MonthlyComparisonCard({ sessions }: MonthlyComparisonCardProps) {
  const colors = useColors();

  const { thisMonth, lastMonth, monthName } = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    return {
      thisMonth: calculateMonthStats(sessions, thisMonthStart, thisMonthEnd),
      lastMonth: calculateMonthStats(sessions, lastMonthStart, lastMonthEnd),
      monthName: format(now, 'MMMM'),
    };
  }, [sessions]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>{monthName.toUpperCase()}</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{thisMonth.sessions}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>sessions</Text>
          <ChangeIndicator current={thisMonth.sessions} previous={lastMonth.sessions} />
        </View>
        
        <View style={[styles.statItem, styles.statMiddle, { borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{thisMonth.shots}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
          <ChangeIndicator current={thisMonth.shots} previous={lastMonth.shots} />
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{thisMonth.accuracy}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          <ChangeIndicator current={thisMonth.accuracy} previous={lastMonth.accuracy} suffix="%" />
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 6,
    paddingHorizontal: 6,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});











