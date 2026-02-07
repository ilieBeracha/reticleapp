/**
 * HomeHeader Component
 *
 * Compact header with user greeting and status.
 * Matches TeamDashboardHeader design: clean, professional, minimal.
 */

import { BaseAvatar } from '@/components/shared/Avatar';
import type { HomeHeaderProps } from '@/types/home';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export function HomeHeader({
  greeting,
  firstName,
  avatarUrl,
  fallbackInitial,
  isGarminConnected,
  colors,
}: HomeHeaderProps) {
  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/profileSheet');
  };

  const handleGarminPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)');
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.container}>
      <TouchableOpacity style={s.userInfo} onPress={handleAvatarPress} activeOpacity={0.7}>
        <View style={[s.avatar, { backgroundColor: colors.border }]}>
          {avatarUrl ? (
            <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
          ) : (
            <Text style={[s.avatarText, { color: colors.text }]}>{fallbackInitial}</Text>
          )}
        </View>
        <View>
          <Text style={[s.greeting, { color: colors.textMuted }]}>{greeting}</Text>
          <Text style={[s.name, { color: colors.text }]}>{firstName}</Text>
        </View>
      </TouchableOpacity>

      <View style={s.rightSection}>
        {isGarminConnected && (
          <TouchableOpacity style={s.watchBadge} onPress={handleGarminPress} activeOpacity={0.7}>
            <View style={[s.watchDot, { backgroundColor: colors.green }]} />
            <Ionicons name="watch" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 10,
    fontWeight: '500',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  watchDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
