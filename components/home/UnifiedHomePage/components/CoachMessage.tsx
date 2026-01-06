/**
 * CoachMessage Component
 * 
 * Displays contextual guidance message.
 */

import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { styles } from '../UnifiedHomePage.styles';
import type { CoachMessageProps } from '../UnifiedHomePage.types';

export function CoachMessage({ message, colors }: CoachMessageProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Text style={[styles.coachMessage, { color: colors.text }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

