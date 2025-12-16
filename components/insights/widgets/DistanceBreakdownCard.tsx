/**
 * Distance Breakdown Card (Compact)
 * 
 * Accuracy by distance range - minimal bars
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DistanceBreakdownCardProps {
  sessions: SessionWithDetails[];
}

interface DistanceStats {
  label: string;
  accuracy: number;
  shots: number;
}

export function DistanceBreakdownCard({ sessions }: DistanceBreakdownCardProps) {
  const colors = useColors();

  const distanceStats = useMemo(() => {
    const ranges: { [key: string]: { shots: number; hits: number } } = {
      close: { shots: 0, hits: 0 },
      medium: { shots: 0, hits: 0 },
      long: { shots: 0, hits: 0 },
    };

    sessions.forEach((session) => {
      if (!session.stats?.avg_distance_m) return;

      const distance = session.stats.avg_distance_m;
      let range: string;

      if (distance <= 10) range = 'close';
      else if (distance <= 25) range = 'medium';
      else range = 'long';

      ranges[range].shots += session.stats.shots_fired;
      ranges[range].hits += session.stats.hits_total;
    });

    const result: DistanceStats[] = [
      { label: '0-10m', accuracy: ranges.close.shots > 0 ? Math.round((ranges.close.hits / ranges.close.shots) * 100) : 0, shots: ranges.close.shots },
      { label: '10-25m', accuracy: ranges.medium.shots > 0 ? Math.round((ranges.medium.hits / ranges.medium.shots) * 100) : 0, shots: ranges.medium.shots },
      { label: '25m+', accuracy: ranges.long.shots > 0 ? Math.round((ranges.long.hits / ranges.long.shots) * 100) : 0, shots: ranges.long.shots },
    ];

    return result.filter((r) => r.shots > 0);
  }, [sessions]);

  if (distanceStats.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>BY DISTANCE</Text>
      
      <View style={styles.rows}>
        {distanceStats.map((stat) => (
          <View key={stat.label} style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>{stat.label}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${stat.accuracy}%`,
                      backgroundColor: stat.accuracy >= 80 ? colors.green : stat.accuracy >= 60 ? colors.orange : colors.red,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.value, { color: colors.text }]}>{stat.accuracy}%</Text>
          </View>
        ))}
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
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
});




