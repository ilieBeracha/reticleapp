/**
 * CoachMessage Component
 *
 * Displays contextual guidance message with elegant presentation.
 * Subtle, refined typography with optional icon accent.
 */

import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { CoachMessageProps } from '../UnifiedHomePage.types';

export function CoachMessage({ message, colors }: CoachMessageProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={s.container}>
      <View style={[s.accentLine, { backgroundColor: colors.primary }]} />
      <View style={s.content}>
        <View style={s.iconWrapper}>
          <Sparkles size={13} color={colors.primary} style={{ opacity: 0.8 }} />
        </View>
        <Text style={[s.message, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 2,
  },
  accentLine: {
    width: 2,
    borderRadius: 1,
    marginRight: 10,
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    gap: 6,
  },
  iconWrapper: {
    marginTop: 1,
  },
  message: {
    // flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    opacity: 0.75,
    letterSpacing: -0.1,
  },
});
