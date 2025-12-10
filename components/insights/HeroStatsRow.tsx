import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ThemeColors, TotalTime } from './types';

interface HeroStatsRowProps {
  totalSessions: number;
  totalTime: TotalTime;
  colors: ThemeColors;
}

export function HeroStatsRow({ totalSessions, totalTime, colors }: HeroStatsRowProps) {
  return (
    <View style={styles.row}>
      <HeroStatCard
        icon="layers-outline"
        value={totalSessions}
        label="Sessions"
        subtitle="Total completed"
        colors={colors}
        delay={0}
      />
      <HeroStatCard
        icon="time-outline"
        value={totalTime.display}
        label="Time"
        subtitle="Training time"
        colors={colors}
        delay={50}
      />
    </View>
  );
}

interface HeroStatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  subtitle: string;
  colors: ThemeColors;
  delay?: number;
}

function HeroStatCard({ icon, value, label, subtitle, colors, delay = 0 }: HeroStatCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
