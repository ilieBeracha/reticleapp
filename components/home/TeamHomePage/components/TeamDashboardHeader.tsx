/**
 * TeamDashboardHeader Component
 *
 * Compact header with user greeting and team context.
 */

import { BaseAvatar } from '@/components/shared/Avatar';
import type { TeamWithMembers } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeamDashboardHeaderProps {
  greeting: string;
  firstName: string;
  avatarUrl: string | null;
  fallbackInitial: string;
  isGarminConnected: boolean;
  team: TeamWithMembers | null;
  teamColor: string;
  onTeamSettings: () => void;
  colors: {
    text: string;
    textMuted: string;
    secondary: string;
    green: string;
    background: string;
    border: string;
  };
}

export function TeamDashboardHeader({
  greeting,
  firstName,
  avatarUrl,
  fallbackInitial,
  isGarminConnected,
  team,
  teamColor,
  onTeamSettings,
  colors,
}: TeamDashboardHeaderProps) {
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
      {/* User Row */}
      <View style={s.userRow}>
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

          <TouchableOpacity style={[s.settingsBtn, { borderColor: colors.border }]} onPress={onTeamSettings} activeOpacity={0.7}>
            <Settings size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
