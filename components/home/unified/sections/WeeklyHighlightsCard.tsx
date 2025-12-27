import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { getSafeSessionDuration } from '@/utils/sessionDuration';
import { Crosshair, Target } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export function WeeklyHighlightsCard({
  colors,
  sessions,
}: {
  colors: ReturnType<typeof useColors>;
  sessions: SessionWithDetails[];
}) {
  const stats = useMemo(() => {
    let totalTimeMs = 0;
    let minDispersion = 1000;
    let hasDispersion = false;
    let totalDist = 0;
    let distCount = 0;

    sessions.forEach((s) => {
      const durationSeconds = getSafeSessionDuration(s);
      if (durationSeconds > 0) {
        totalTimeMs += durationSeconds * 1000;
      }

      if (s.stats?.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
        hasDispersion = true;
        minDispersion = Math.min(minDispersion, s.stats.best_dispersion_cm);
      }

      if (s.stats?.avg_distance_m) {
        totalDist += s.stats.avg_distance_m;
        distCount++;
      }
    });

    const hours = Math.floor(totalTimeMs / (1000 * 60 * 60));
    const mins = Math.floor((totalTimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const bestGroup = hasDispersion ? `${minDispersion.toFixed(1)} cm` : '—';
    const avgDist = distCount > 0 ? `${Math.round(totalDist / distCount)} m` : '—';

    return { timeStr, bestGroup, avgDist };
  }, [sessions]);

  return (
    <Animated.View entering={FadeIn.delay(150).duration(300)} style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Best Group */}
        <View style={styles.statRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.indigo}15` }]}>
            <Crosshair size={16} color={colors.indigo} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Group</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.bestGroup}</Text>
          </View>
        </View>

        {/* Avg Distance */}
        <View style={styles.statRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.green}15` }]}>
            <Target size={16} color={colors.green} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Distance</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgDist}</Text>
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
    justifyContent: 'center',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: -1,
  },
});
