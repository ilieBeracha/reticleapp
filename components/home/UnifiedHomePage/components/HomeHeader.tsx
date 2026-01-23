/**
 * HomeHeader Component
 *
 * Clean header with user greeting and status.
 * Avatar is tappable to navigate to profile.
 * Garmin badge is tappable to navigate to settings.
 */

import { BaseAvatar } from '@/components/shared/Avatar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { HomeHeaderProps } from '../UnifiedHomePage.types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function HomeHeader({
  greeting,
  firstName,
  avatarUrl,
  fallbackInitial,
  isGarminConnected,
  colors,
}: HomeHeaderProps) {
  const avatarScale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handleAvatarPress = () => {
    avatarScale.value = withSpring(0.95, {}, () => {
      avatarScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/profileSheet');
  };

  const handleGarminPress = () => {
    badgeScale.value = withSpring(0.9, {}, () => {
      badgeScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)');
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.header}>
      <TouchableOpacity style={s.left} onPress={handleAvatarPress} activeOpacity={0.8}>
        <Animated.View style={[s.avatar, { backgroundColor: colors.secondary }, avatarAnimStyle]}>
          {avatarUrl ? (
            <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
          ) : (
            <Text style={[s.avatarText, { color: colors.text }]}>{fallbackInitial}</Text>
          )}
        </Animated.View>
        <View>
          <Text style={[s.greeting, { color: colors.textMuted }]}>{greeting}</Text>
          <Text style={[s.name, { color: colors.text }]}>{firstName}</Text>
        </View>
      </TouchableOpacity>

      <View style={s.rightActions}>
        {isGarminConnected && (
          <AnimatedTouchable
            style={[s.watchBadge, { backgroundColor: `${colors.green}12` }, badgeAnimStyle]}
            onPress={handleGarminPress}
            activeOpacity={0.7}
          >
            <View style={s.watchDot} />
            <Ionicons name="watch" size={15} color={colors.green} />
          </AnimatedTouchable>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 1,
    opacity: 0.7,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  watchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
