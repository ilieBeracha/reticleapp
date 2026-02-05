/**
 * TeamQuickStats Component
 *
 * Compact horizontal stats row for team overview.
 */

import { Calendar, Target, TrendingUp, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeamQuickStatsProps {
  memberCount: number;
  sessionsThisWeek: number;
  upcomingCount: number;
  accuracy: number;
  teamColor: string;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
  };
}

export function TeamQuickStats({
  memberCount,
  sessionsThisWeek,
  upcomingCount,
  accuracy,
  teamColor,
  colors,
}: TeamQuickStatsProps) {
  const stats = [
    { icon: Users, value: memberCount, label: 'Members' },
    { icon: Target, value: sessionsThisWeek, label: 'This week' },
    { icon: Calendar, value: upcomingCount, label: 'Upcoming' },
    { icon: TrendingUp, value: `${Math.round(accuracy)}%`, label: 'Accuracy' },
  ];

  return (
    <Animated.View entering={FadeIn.delay(100)} style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {stats.map((stat, i) => (
        <View key={stat.label} style={s.stat}>
          <stat.icon size={14} color={teamColor} strokeWidth={2} />
          <Text style={[s.value, { color: colors.text }]}>{stat.value}</Text>
          <Text style={[s.label, { color: colors.textMuted }]}>{stat.label}</Text>
          {i < stats.length - 1 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
        </View>
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  divider: {
    position: 'absolute',
    right: 0,
    top: '10%',
    width: 1,
    height: '80%',
  },
});
