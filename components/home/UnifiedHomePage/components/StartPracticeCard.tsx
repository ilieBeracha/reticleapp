/**
 * StartPracticeCard Component
 *
 * Prominent, elegant call-to-action to start a new engagement/grouping.
 * Features subtle gradient effect and micro-animations.
 *
 * NOTE: Users start "engagements" or "groupings", not "sessions".
 * Session is an invisible setup container.
 */

import { ArrowRight, Target } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { getStartPracticeSubtitle } from '../UnifiedHomePage.helpers';
import type { StartPracticeCardProps } from '../UnifiedHomePage.types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function StartPracticeCard({ colors, onPress, starting, lastSessionDaysAgo }: StartPracticeCardProps) {
  const subtitle = getStartPracticeSubtitle(lastSessionDaysAgo);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedTouchable
      style={[s.container, { backgroundColor: colors.primary }, animStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={starting}
    >
      <View style={s.iconContainer}>
        <View style={s.icon}>
          <Target size={22} color="#fff" strokeWidth={2.5} />
        </View>
      </View>

      <View style={s.content}>
        <Text style={s.title}>Start Practice</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>

      <View style={s.action}>
        {starting ? (
          <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
        ) : (
          <View style={s.arrowContainer}>
            <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
          </View>
        )}
      </View>
    </AnimatedTouchable>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    position: 'relative',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
