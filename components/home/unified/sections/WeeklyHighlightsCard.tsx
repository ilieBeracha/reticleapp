import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Crosshair, Target } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { styles } from '../styles';

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
      // Time
      if (s.started_at && s.ended_at) {
        const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
        if (diff > 0 && diff < 86400000) totalTimeMs += diff;
      }

      // Dispersion
      if (s.stats?.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
        hasDispersion = true;
        minDispersion = Math.min(minDispersion, s.stats.best_dispersion_cm);
      }

      // Distance
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
    <Animated.View entering={FadeIn.delay(150).duration(400)} style={styles.halfCard}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            justifyContent: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
            flex: 1, // Add flex: 1 here
          },
        ]}
      >
        <View style={{ gap: 16 }}>
          {/* Row 2: Best Group */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={[styles.statIcon, { backgroundColor: `${colors.indigo}15`, width: 36, height: 36, borderRadius: 10 }]}
            >
              <Crosshair size={18} color={colors.indigo} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textMuted,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                Best Group
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>{stats.bestGroup}</Text>
            </View>
          </View>

          {/* Row 3: Avg Distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={[styles.statIcon, { backgroundColor: `${colors.green}15`, width: 36, height: 36, borderRadius: 10 }]}
            >
              <Target size={18} color={colors.green} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textMuted,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                Avg Distance
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>{stats.avgDist}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}


