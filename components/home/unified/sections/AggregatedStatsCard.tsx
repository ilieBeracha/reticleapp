import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, { FadeIn } from 'react-native-reanimated';

export function AggregatedStatsCard({
  colors,
  allSessions,
}: {
  colors: ReturnType<typeof useColors>;
  allSessions: SessionWithDetails[];
  trainingStats?: any;
}) {
  const { shots, hits, solo, team, accuracy } = useMemo(() => {
    let shots = 0;
    let hits = 0;
    let solo = 0;
    let team = 0;

    allSessions.forEach((s) => {
      if (s.status === 'completed') {
        if (s.stats) {
          shots += s.stats.shots_fired || 0;
          hits += s.stats.hits_total || 0;
        }
      }

      if (s.team_id) team++;
      else solo++;
    });

    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    return { shots, hits, solo, team, accuracy };
  }, [allSessions]);

  const pieData = [
    { value: solo, color: colors.indigo, text: 'Solo' },
    { value: team, color: colors.green, text: 'Team' },
  ].filter((d) => d.value > 0);

  const chartData = pieData.length > 0 ? pieData : [{ value: 1, color: `${colors.text}15` }];

  return (
    <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Top: Chart + Accuracy */}
        <View style={styles.topRow}>
          <View style={styles.chartWrap}>
            <PieChart
              data={chartData}
              donut
              radius={26}
              innerRadius={19}
              showText={false}
              backgroundColor={colors.card}
            />
            <View style={[StyleSheet.absoluteFill, styles.chartCenter]}>
              <Text style={[styles.chartLabel, { color: colors.textMuted }]}>
                {allSessions.length}
              </Text>
            </View>
          </View>

          <View style={styles.accuracyWrap}>
            <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>Accuracy</Text>
            <Text style={[styles.accuracyValue, { color: colors.indigo }]}>{accuracy}%</Text>
          </View>
        </View>

        {/* Bottom: Shot stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: `${colors.text}06` }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{shots.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: `${colors.text}06` }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{hits.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hits</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartWrap: {
    position: 'relative',
  },
  chartCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  accuracyWrap: {
    flex: 1,
  },
  accuracyLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  accuracyValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
