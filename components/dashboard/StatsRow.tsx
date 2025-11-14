import type { DashboardStats } from '@/types/dashboard';
import { StyleSheet, View } from 'react-native';
import { StatItem } from './StatItem';

interface StatsRowProps {
  stats: DashboardStats;
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <View style={styles.container}>
      <StatItem value={stats.totalSessions} label="Sessions" />
      <StatItem value={`${stats.hitRate}%`} label="Hit Rate" />
      <StatItem value={`${stats.avgGrouping}cm`} label="Grouping" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});

