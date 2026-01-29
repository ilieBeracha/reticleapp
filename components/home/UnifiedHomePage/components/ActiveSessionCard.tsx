/**
 * ActiveSessionCard Component
 *
 * Displays the currently active session with animated live indicator.
 * Features pulse animation and micro-interactions.
 */

import { ArrowRight } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ActiveSessionCardProps } from '@/types/home';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ActiveSessionCard({ session, colors, onPress }: ActiveSessionCardProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 0 })),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1);
  };

  return (
    <AnimatedTouchable
      style={[s.card, { backgroundColor: colors.green, borderColor: colors.green }, cardAnimStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <View style={s.content}>
        <View style={s.liveIndicator}>
          <View style={s.pulseContainer}>
            <Animated.View style={[s.pulseRing, pulseStyle]} />
            <View style={s.liveDot} />
          </View>
          <Text style={s.liveLabel}>LIVE SESSION</Text>
        </View>
        <Text style={s.title} numberOfLines={1}>
          {session.drillName || 'Practice Session'}
        </Text>
        {session.stats && session.stats.shots > 0 && (
          <Text style={s.meta}>
            {session.stats.shots} shots · {session.stats.accuracy || 0}% accuracy
          </Text>
        )}
      </View>
      <View style={s.arrowContainer}>
        <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
      </View>
    </AnimatedTouchable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pulseContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
