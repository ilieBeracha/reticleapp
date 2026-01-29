/**
 * PulsingDot - Animated pulsing dot indicator
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface PulsingDotProps {
  size?: number;
  color: string;
}

export function PulsingDot({ size = 12, color }: PulsingDotProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
