import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface WelcomeCardProps {
  fullName?: string;
  stats: {
    totalSessions: number;
    totalAbg: number;
    totalCompletedSessions: number;
    totalTime: string;
  };
}

// Separate Header Component
function WelcomeHeader({ fullName }: { fullName?: string }) {
  const colors = useColors();
  
  return (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: colors.textMuted }]}>
        Welcome back,
      </Text>
      <Text style={[styles.name, { color: colors.text }]}>
        {fullName || 'User'}
      </Text>
    </View>
  );
}

// Separate Stats Grid Component
function StatsGrid({ stats }: { stats: WelcomeCardProps['stats'] }) {
  const colors = useColors();

  const statsConfig = [
    {
      icon: 'calendar-outline' as const,
      iconColor: '#5B7A8C',
      value: stats.totalSessions,
      label: 'Total Sessions',
    },
    {
      icon: 'trophy-outline' as const,
      iconColor: '#E76925',
      value: stats.totalAbg,
      label: 'Total ABG',
    },
    {
      icon: 'time-outline' as const,
      iconColor: '#5A8473',
      value: stats.totalTime,
      label: 'Total Time',
    },
    {
      icon: 'checkmark-circle-outline' as const,
      iconColor: '#6B8FA3',
      value: stats.totalCompletedSessions,
      label: 'Completed',
    },
  ];

  return (
    <View style={styles.statsGrid}>
      {statsConfig.map((stat, index) => (
        <View key={index} style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: stat.iconColor + '15' }]}>
            <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {stat.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Main Component - Combines Header and Stats
export default function WelcomeCard({ fullName, stats }: WelcomeCardProps) {
  return (
    <View style={styles.wrapper}>
      <WelcomeHeader fullName={fullName} />
      <StatsGrid stats={stats} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
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
    paddingVertical: 12,
  },
  statContent: {
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 20,
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

