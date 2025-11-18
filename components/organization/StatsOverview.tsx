import { useColors } from '@/hooks/ui/useColors';
import { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatsOverviewProps {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  teams: Team[];
}

export default function StatsOverview({ totalSessions, activeSessions, completedSessions, teams }: StatsOverviewProps) {
  const colors = useColors();

  const stats = useMemo(() => [{
    icon: 'calendar-outline',
    value: totalSessions,
    label: 'Total Sessions',
  }, {
    icon: 'play-circle-outline',
    value: activeSessions,
    label: 'Active Now',
  }, {
    icon: 'checkmark-circle-outline',
    value: completedSessions,
    label: 'Completed',
  }, {
    icon: 'people-outline',
    value: teams.length,
    label: 'Teams',
  }], [totalSessions, activeSessions, completedSessions, teams]);

  return (
    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Stats Overview</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.icon} style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.muted + '15' }]}>
              <Ionicons name={stat.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.muted} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Stats Card
  statsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});
