/**
 * Session Type Card (Compact)
 * 
 * Solo vs Team breakdown - minimal pills
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SessionTypeCardProps {
  sessions: SessionWithDetails[];
}

export function SessionTypeCard({ sessions }: SessionTypeCardProps) {
  const colors = useColors();

  const breakdown = useMemo(() => {
    let solo = 0;
    let team = 0;
    let drill = 0;
    let free = 0;

    sessions.forEach((session) => {
      if (session.team_id) team++;
      else solo++;

      if (session.drill_id) drill++;
      else free++;
    });

    const total = sessions.length;
    return {
      solo: { count: solo, pct: total > 0 ? Math.round((solo / total) * 100) : 0 },
      team: { count: team, pct: total > 0 ? Math.round((team / total) * 100) : 0 },
      drill: { count: drill, pct: total > 0 ? Math.round((drill / total) * 100) : 0 },
      free: { count: free, pct: total > 0 ? Math.round((free / total) * 100) : 0 },
      total,
    };
  }, [sessions]);

  if (breakdown.total === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>SESSION TYPES</Text>

      <View style={styles.row}>
        <View style={styles.section}>
          <View style={[styles.bar, { backgroundColor: colors.secondary }]}>
            <View style={[styles.barSegment, { backgroundColor: colors.indigo, flex: breakdown.solo.pct }]} />
            <View style={[styles.barSegment, { backgroundColor: colors.green, flex: breakdown.team.pct }]} />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.indigo }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Solo {breakdown.solo.pct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.green }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Team {breakdown.team.pct}%</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <View style={[styles.bar, { backgroundColor: colors.secondary }]}>
            <View style={[styles.barSegment, { backgroundColor: colors.purple, flex: breakdown.drill.pct }]} />
            <View style={[styles.barSegment, { backgroundColor: colors.orange, flex: breakdown.free.pct }]} />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.purple }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Drill {breakdown.drill.pct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.orange }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Free {breakdown.free.pct}%</Text>
            </View>
          </View>
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
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 14,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
});






