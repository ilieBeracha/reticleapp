import { useColors } from '@/hooks/ui/useColors';
import { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatsOverviewProps {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  teams: Team[];
  loading?: boolean;
}

const StatsOverview = memo(function StatsOverview({ 
  totalSessions, 
  activeSessions, 
  completedSessions, 
  teams,
  loading 
}: StatsOverviewProps) {
  const colors = useColors();

  const stats = useMemo(() => [{
    icon: 'calendar' as const,
    value: totalSessions,
    label: 'Sessions',
    color: colors.blue,
  }, {
    icon: 'play' as const,
    value: activeSessions,
    label: 'Active',
    color: colors.orange,
  }, {
    icon: 'people' as const,
    value: teams.length,
    label: 'Teams',
    color: colors.green,
  }], [totalSessions, activeSessions, teams.length, colors]);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View 
            key={stat.label} 
            style={[
              styles.card, 
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                // Subtle shadow
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
              }
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: stat.color + '15' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <View>
              <Text style={[styles.value, { color: colors.text }]}>
                {loading ? '-' : stat.value}
              </Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {stat.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.totalSessions === nextProps.totalSessions &&
    prevProps.activeSessions === nextProps.activeSessions &&
    prevProps.completedSessions === nextProps.completedSessions &&
    prevProps.teams.length === nextProps.teams.length &&
    prevProps.loading === nextProps.loading
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});

export default StatsOverview;
