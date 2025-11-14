import type { RecentActivity } from '@/types/dashboard';
import { StyleSheet, Text, View } from 'react-native';

interface ActivityCardProps {
  activity: RecentActivity;
}

const colorMap = {
  mint: '#C7F5E8',
  yellow: '#FEF3C7',
  blue: '#DBEAFE',
  purple: '#E9D5FF',
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const backgroundColor = colorMap[activity.color];

  return (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={styles.progressCircle}>
        <Text style={styles.progressText}>{activity.score}%</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.meta}>
          {activity.distance} · {activity.timeAgo}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  meta: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});

