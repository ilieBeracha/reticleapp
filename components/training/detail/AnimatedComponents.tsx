/**
 * Animated Components for Training Detail
 * Reusable animated UI elements
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════
// PULSING DOT
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// LIVE DOT
// ═══════════════════════════════════════════════════════════════════════════

interface LiveDotProps {
  size?: number;
}

export function LiveDot({ size = 6 }: LiveDotProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.liveDotBase, { width: size, height: size, borderRadius: size / 2 }]} />
      <Animated.View style={[styles.liveDotPulse, { width: size, height: size, borderRadius: size / 2 }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  liveDotBase: {
    backgroundColor: '#10B981',
  },
  liveDotPulse: {
    position: 'absolute',
    backgroundColor: '#10B981',
  },
});
