/**
 * TeamQuickActions Component
 *
 * Compact toolbar-style actions. Professional, utility-focused.
 */

import * as Haptics from 'expo-haptics';
import { Calendar, Crosshair, Settings, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeamQuickActionsProps {
  onStartTraining: () => void;
  onViewSchedule: () => void;
  onViewLeaderboard: () => void;
  onTeamSettings: () => void;
  hasLiveTraining?: boolean;
  upcomingCount?: number;
  showLeaderboard?: boolean; // Commanders only
  teamColor: string;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function TeamQuickActions({
  onStartTraining,
  onViewSchedule,
  onViewLeaderboard,
  onTeamSettings,
  hasLiveTraining = false,
  upcomingCount = 0,
  showLeaderboard = true,
  teamColor,
  colors,
}: TeamQuickActionsProps) {
  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <Animated.View entering={FadeIn.delay(50)} style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Primary Action */}
      <TouchableOpacity
        style={[s.primaryAction, { backgroundColor: hasLiveTraining ? colors.text : colors.border }]}
        onPress={() => handlePress(onStartTraining)}
        activeOpacity={0.7}
      >
        <Crosshair size={14} color={hasLiveTraining ? colors.background : colors.text} strokeWidth={2.2} />
        <Text style={[s.primaryText, { color: hasLiveTraining ? colors.background : colors.text }]}>
          {hasLiveTraining ? 'Join Live' : 'Train'}
        </Text>
        {hasLiveTraining && <View style={[s.liveDot, { backgroundColor: '#10B981' }]} />}
      </TouchableOpacity>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* Secondary Actions */}
      <View style={s.secondaryActions}>
        <TouchableOpacity style={s.action} onPress={() => handlePress(onViewSchedule)}>
          <Calendar size={14} color={colors.textMuted} />
          {upcomingCount > 0 && (
            <View style={[s.badge, { backgroundColor: colors.border }]}>
              <Text style={[s.badgeText, { color: colors.text }]}>{upcomingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Leaderboard - commanders only */}
        {showLeaderboard && (
          <TouchableOpacity style={s.action} onPress={() => handlePress(onViewLeaderboard)}>
            <Trophy size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.action} onPress={() => handlePress(onTeamSettings)}>
          <Settings size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    marginBottom: 12,
    gap: 6,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: 20,
  },
  secondaryActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  action: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
