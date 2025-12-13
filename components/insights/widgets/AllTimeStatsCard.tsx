/**
 * All-Time Stats Card (Compact)
 * 
 * Lifetime statistics in a minimal grid
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { differenceInMinutes } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AllTimeStatsCardProps {
  sessions: SessionWithDetails[];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function AllTimeStatsCard({ sessions }: AllTimeStatsCardProps) {
  const colors = useColors();

  const stats = useMemo(() => {
    let totalShots = 0;
    let totalHits = 0;
    let totalTargets = 0;
    let totalMinutes = 0;
    let completedSessions = 0;
    let bestAccuracy = 0;

    sessions.forEach((session) => {
      if (session.status === 'completed') {
        completedSessions++;

        if (session.stats) {
          totalShots += session.stats.shots_fired;
          totalHits += session.stats.hits_total;
          totalTargets += session.stats.target_count;
          
          if (session.stats.accuracy_pct > bestAccuracy) {
            bestAccuracy = session.stats.accuracy_pct;
          }
        }

        if (session.ended_at) {
          totalMinutes += differenceInMinutes(new Date(session.ended_at), new Date(session.started_at));
        }
      }
    });

    return {
      sessions: completedSessions,
      shots: totalShots,
      hits: totalHits,
      targets: totalTargets,
      accuracy: totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0,
      bestAccuracy,
      time: formatDuration(totalMinutes),
    };
  }, [sessions]);

  const items = [
    { label: 'Sessions', value: stats.sessions.toLocaleString() },
    { label: 'Shots Fired', value: stats.shots.toLocaleString() },
    { label: 'Hits', value: stats.hits.toLocaleString() },
    { label: 'Targets', value: stats.targets.toLocaleString() },
    { label: 'Avg Accuracy', value: `${stats.accuracy}%` },
    { label: 'Best Accuracy', value: `${stats.bestAccuracy}%` },
    { label: 'Total Time', value: stats.time },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.gridItem,
              index < items.length - 1 && styles.gridItemBorder,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.itemValue, { color: colors.text }]}>{item.value}</Text>
            <Text style={[styles.itemLabel, { color: colors.textMuted }]}>{item.label}</Text>
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
    padding: 12,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '33.33%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  gridItemBorder: {
    // Borders handled by layout
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  itemLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

