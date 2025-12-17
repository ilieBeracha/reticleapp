/**
 * Recent Performance Card
 * 
 * Shows performance trend from last 5 sessions:
 * - Mini accuracy sparkline
 * - Average accuracy
 * - Trend direction
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { formatDistanceToNow } from 'date-fns';
import { BarChart3, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface RecentPerformanceCardProps {
  sessions: SessionWithDetails[];
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;
  
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const height = 40;
  const width = 120;
  const barWidth = width / values.length - 2;
  
  return (
    <View style={[styles.sparkline, { width, height }]}>
      {values.map((value, i) => {
        const barHeight = ((value - min) / range) * height * 0.8 + height * 0.2;
        return (
          <View
            key={i}
            style={[
              styles.sparklineBar,
              {
                width: barWidth,
                height: barHeight,
                backgroundColor: i === values.length - 1 ? color : `${color}66`,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function RecentPerformanceCard({ sessions }: RecentPerformanceCardProps) {
  const colors = useColors();

  const { recentAccuracies, avgAccuracy, trend, lastSessionTime } = useMemo(() => {
    const completedSessions = sessions
      .filter((s) => s.status === 'completed' && s.stats && s.stats.shots_fired > 0)
      .slice(0, 5);

    const accuracies = completedSessions
      .map((s) => s.stats?.accuracy_pct ?? 0)
      .reverse(); // oldest to newest for sparkline

    const avg = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    // Calculate trend (compare last 2 vs previous 2)
    let trendDir: 'up' | 'down' | 'neutral' = 'neutral';
    if (accuracies.length >= 4) {
      const recent = (accuracies[accuracies.length - 1] + accuracies[accuracies.length - 2]) / 2;
      const previous = (accuracies[0] + accuracies[1]) / 2;
      if (recent > previous + 3) trendDir = 'up';
      else if (recent < previous - 3) trendDir = 'down';
    }

    const lastTime = completedSessions[0]
      ? formatDistanceToNow(new Date(completedSessions[0].ended_at || completedSessions[0].started_at), { addSuffix: true })
      : null;

    return {
      recentAccuracies: accuracies,
      avgAccuracy: avg,
      trend: trendDir,
      lastSessionTime: lastTime,
    };
  }, [sessions]);

  const trendColor = trend === 'up' ? colors.green : trend === 'down' ? colors.red : colors.textMuted;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  if (recentAccuracies.length === 0) {
    return null; // Don't show if no data
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: `${colors.indigo}22` }]}>
          <BarChart3 size={18} color={colors.indigo} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Recent Performance</Text>
          {lastSessionTime && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Last session {lastSessionTime}</Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statsSection}>
          <Text style={[styles.accuracyValue, { color: colors.text }]}>{avgAccuracy}%</Text>
          <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>avg accuracy</Text>
          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}22` }]}>
            <TrendIcon size={12} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Steady'}
            </Text>
          </View>
        </View>

        <Sparkline values={recentAccuracies} color={colors.indigo} />
      </View>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Based on last {recentAccuracies.length} session{recentAccuracies.length !== 1 ? 's' : ''}
      </Text>
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsSection: {
    gap: 4,
  },
  accuracyValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  accuracyLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  sparklineBar: {
    borderRadius: 2,
  },
  footer: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});






