import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import type { SessionStats, ThemeColors, TotalTime } from './types';

interface MiniStatsRowProps {
  stats: SessionStats;
  myStats: { upcoming: number };
  totalTime: TotalTime;
  colors: ThemeColors;
}

export function MiniStatsRow({ stats, myStats, totalTime, colors }: MiniStatsRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      <MiniStatCard
        icon="checkmark-circle-outline"
        value={stats.completedSessions}
        label="Completed"
        colors={colors}
        delay={150}
      />
      <MiniStatCard
        icon="radio-button-on-outline"
        value={stats.activeSessions}
        label="Active"
        colors={colors}
        delay={200}
      />
      <MiniStatCard
        icon="calendar-outline"
        value={myStats.upcoming}
        label="Upcoming"
        colors={colors}
        delay={250}
      />
      <MiniStatCard
        icon="trending-up-outline"
        value={`${totalTime.hours}h`}
        label="This Month"
        colors={colors}
        delay={300}
      />
    </ScrollView>
  );
}

interface MiniStatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  colors: ThemeColors;
  delay?: number;
}

function MiniStatCard({ icon, value, label, colors, delay = 0 }: MiniStatCardProps) {
  return (
    <Animated.View
      entering={FadeInRight.delay(delay).duration(350)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 16,
  },
  container: {
    gap: 10,
    paddingRight: 16,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});
