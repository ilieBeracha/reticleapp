import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ThemeColors } from './types';

interface GreetingHeaderProps {
  firstName: string;
  colors: ThemeColors;
}

export function GreetingHeader({ firstName, colors }: GreetingHeaderProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
      <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting}</Text>
      <Text style={[styles.name, { color: colors.text }]}>{firstName}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
