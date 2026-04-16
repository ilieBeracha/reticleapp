/**
 * PersonalQuickActions Component
 *
 * Gradient primary CTA with pulsing halo when idle.
 * Secondary actions remain utility-focused.
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Crosshair, History } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
  const pulse = useSharedValue(0);
  const shouldPulse = !hasActiveSession && !starting;

  useEffect(() => {
    if (shouldPulse) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => cancelAnimation(pulse);
  }, [shouldPulse, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.55,
    transform: [{ scale: 1 + pulse.value * 0.25 }],
  }));

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const gradientColors: [string, string] = hasActiveSession
    ? ['#16A34A', '#15803D']
    : ['#F97316', '#DC2626'];

  const label = hasActiveSession ? 'Continue' : 'Train Now';

  return (
    <Animated.View
      entering={FadeIn.delay(50)}
      style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={s.primaryWrap}>
        {shouldPulse && (
          <Animated.View
            pointerEvents="none"
            style={[s.halo, { backgroundColor: gradientColors[0] }, haloStyle]}
          />
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePress(onStartSession)}
          disabled={starting}
          style={s.primaryTouchable}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.primaryAction}
          >
            <Crosshair size={15} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={s.primaryText}>{label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      <View style={s.secondaryActions}>
        <TouchableOpacity style={s.action} onPress={() => handlePress(onViewHistory)}>
          <History size={15} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.action} onPress={() => handlePress(onViewInsights)}>
          <BarChart3 size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
    marginBottom: 12,
    gap: 6,
  },
  primaryWrap: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  primaryTouchable: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  halo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 8,
    opacity: 0.3,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 7,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
