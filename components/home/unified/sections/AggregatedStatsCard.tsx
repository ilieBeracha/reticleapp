import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, { FadeIn } from 'react-native-reanimated';
import { styles } from '../styles';

export function AggregatedStatsCard({
  colors,
  allSessions,
}: {
  colors: ReturnType<typeof useColors>;
  allSessions: SessionWithDetails[];
  trainingStats?: any; // Kept for compatibility but unused
}) {
  const { shots, hits, solo, team, accuracy } = useMemo(() => {
    let shots = 0;
    let hits = 0;
    let solo = 0;
    let team = 0;

    allSessions.forEach((s) => {
      // Only count completed sessions for stats to avoid skewing with empty active ones
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

  // Default data for empty state
  const chartData = pieData.length > 0 ? pieData : [{ value: 1, color: `${colors.text}10` }];

  return (
    <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.halfCard}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            padding: 0,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            flex: 1, // Add flex: 1 here
          },
        ]}
      >
        {/* Header / Chart Section */}
        <View style={{ padding: 12, paddingBottom: 0, alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          {/* Chart */}
          <View>
            <PieChart data={chartData} donut radius={32} innerRadius={24} showText={false} backgroundColor={colors.card} />
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>{allSessions.length}</Text>
            </View>
          </View>

          {/* Legend / Primary Stat */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              Accuracy
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -1 }}>{accuracy}%</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
          <View
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              backgroundColor: `${colors.text}05`,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{shots.toLocaleString()}</Text>
            <Text
              style={{
                fontSize: 9,
                color: colors.textMuted,
                fontWeight: '700',
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              Shots
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              backgroundColor: `${colors.text}05`,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{hits.toLocaleString()}</Text>
            <Text
              style={{
                fontSize: 9,
                color: colors.textMuted,
                fontWeight: '700',
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              Hits
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}







