import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WelcomeCardProps {
  fullName?: string;
  stats: {
    totalSessions: number;
    totalAbg: number;
    totalCompletedSessions: number;
    totalTime: string;
  };
  loading?: boolean;
}

// Separate Header Component
const WelcomeHeader = memo(function WelcomeHeader({ fullName }: { fullName?: string }) {
  const colors = useColors();
  
  const greetingStyle = useMemo(() => [
    styles.greeting,
    { color: colors.textMuted }
  ], [colors.textMuted]);

  const nameStyle = useMemo(() => [
    styles.name,
    { color: colors.text }
  ], [colors.text]);
  
  return (
    <View style={styles.header}>
      <Text style={greetingStyle}>
        Welcome back,
      </Text>
      <Text style={nameStyle}>
        {fullName || 'User'}
      </Text>
    </View>
  );
});

// Separate Stats Grid Component
const StatsGrid = memo(function StatsGrid({ 
  stats, 
  loading 
}: { 
  stats: WelcomeCardProps['stats'];
  loading?: boolean;
}) {
  const colors = useColors();

  const statsConfig = useMemo(() => [
    {
      icon: 'calendar-outline' as const,
      iconColor: '#5B7A8C',
      value: stats.totalSessions,
      label: 'Total Sessions',
    },
    {
      icon: 'fitness-outline' as const,
      iconColor: '#7C3AED',
      value: stats.totalAbg,
      label: 'Upcoming',
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
  ], [stats]);

  const statValueStyle = useMemo(() => [
    styles.statValue,
    { color: colors.text }
  ], [colors.text]);

  const statLabelStyle = useMemo(() => [
    styles.statLabel,
    { color: colors.textMuted }
  ], [colors.textMuted]);

  const skeletonStyle = useMemo(() => [
    styles.skeleton,
    { backgroundColor: colors.secondary }
  ], [colors.secondary]);

  if (loading) {
    return (
      <View style={styles.statsGrid}>
        {statsConfig.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: stat.iconColor + '15' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
            </View>
            <View style={styles.statContent}>
              <View style={[skeletonStyle, styles.skeletonValue]} />
              <View style={[skeletonStyle, styles.skeletonLabel]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.statsGrid}>
      {statsConfig.map((stat, index) => (
        <View key={index} style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: stat.iconColor + '15' }]}>
            <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
          </View>
          <View style={styles.statContent}>
            <Text style={statValueStyle}>
              {stat.value}
            </Text>
            <Text style={statLabelStyle}>
              {stat.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
});

// Main Component - Combines Header and Stats
export default function WelcomeCard({ fullName, stats, loading }: WelcomeCardProps) {
  return (
    <View style={styles.wrapper}>
      <WelcomeHeader fullName={fullName} />
      <StatsGrid stats={stats} loading={loading} />
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
  skeleton: {
    borderRadius: 6,
    opacity: 0.6,
  },
  skeletonValue: {
    width: 50,
    height: 24,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 80,
    height: 14,
  },
});

