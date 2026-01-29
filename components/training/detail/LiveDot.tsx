/**
 * LiveDot - Animated live indicator dot
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

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
