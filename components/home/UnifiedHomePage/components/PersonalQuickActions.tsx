/**
 * PersonalQuickActions Component
 *
 * Compact toolbar-style actions for personal mode.
 * Mirrors TeamQuickActions design: professional, utility-focused.
 */

import * as Haptics from 'expo-haptics';
import { BarChart3, Crosshair, History } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface PersonalQuickActionsProps {
  onStartSession: () => void;
  onViewHistory: () => void;
  onViewInsights: () => void;
  hasActiveSession?: boolean;
  starting?: boolean;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function PersonalQuickActions({
  onStartSession,
  onViewHistory,
  onViewInsights,
  hasActiveSession = false,
  starting = false,
  colors,
}: PersonalQuickActionsProps) {
  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <Animated.View
      entering={FadeIn.delay(50)}
      style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Primary Action */}
      <TouchableOpacity
        style={[s.primaryAction, { backgroundColor: colors.border }]}
        onPress={() => handlePress(onStartSession)}
        activeOpacity={0.7}
        disabled={starting}
      >
        <Crosshair size={14} color={colors.text} strokeWidth={2.2} />
        <Text style={[s.primaryText, { color: colors.text }]}>
          {hasActiveSession ? 'Continue' : 'Train'}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* Secondary Actions */}
      <View style={s.secondaryActions}>
        <TouchableOpacity style={s.action} onPress={() => handlePress(onViewHistory)}>
          <History size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.action} onPress={() => handlePress(onViewInsights)}>
          <BarChart3 size={14} color={colors.textMuted} />
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
  },
});
