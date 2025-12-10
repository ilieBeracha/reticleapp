import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ThemeColors } from './types';

interface InsightsHeaderProps {
  colors: ThemeColors;
}

export function InsightsHeader({ colors }: InsightsHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>Insights</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your training analytics</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
