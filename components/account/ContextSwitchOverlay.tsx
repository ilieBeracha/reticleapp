/**
 * ContextSwitchOverlay
 *
 * Full-screen loading overlay shown when switching between accounts/teams.
 * Stays visible until the destination page is mounted to ensure smooth transitions.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/stores/teamStore';
import { Target } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function ContextSwitchOverlay() {
  const { t } = useTranslation();
  const colors = useColors();
  const { contextSwitchOverlay, contextSwitchTarget } = useTeamStore();

  const pulseOpacity = useSharedValue(0.4);
  const barWidth = useSharedValue(0);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    if (contextSwitchOverlay) {
      // Pulse animation for the icon
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      // Ring scale animation
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      // Progress bar animation - slower, continuous
      barWidth.value = withRepeat(
        withSequence(
          withTiming(85, { duration: 2000, easing: Easing.out(Easing.cubic) }),
          withTiming(95, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 0.4;
      barWidth.value = 0;
      ringScale.value = 1;
    }
  }, [contextSwitchOverlay, pulseOpacity, barWidth, ringScale]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  if (!contextSwitchOverlay) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(300)}
      style={[s.overlay, { backgroundColor: colors.background }]}
    >
      <View style={s.content}>
        {/* Crosshair Icon with Ring */}
        <Animated.View style={[s.iconContainer, iconStyle]}>
          <Animated.View style={[s.iconRing, { borderColor: colors.primary }, ringStyle]}>
            <Target size={32} color={colors.primary} strokeWidth={1.5} />
          </Animated.View>
        </Animated.View>

        {/* Status Text */}
        <View style={s.textContainer}>
          <Text style={[s.statusText, { color: colors.textMuted }]}>
            {t('account.switching').toUpperCase()}
          </Text>
          <Text style={[s.targetText, { color: colors.text }]} numberOfLines={1}>
            {contextSwitchTarget}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[s.progressBar, { backgroundColor: colors.primary }, barStyle]} />
        </View>

        {/* Subtle Status */}
        <Text style={[s.loadingHint, { color: colors.textMuted }]}>
          {t('account.loadingData')}
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 28,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  targetText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  progressTrack: {
    width: '50%',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  loadingHint: {
    fontSize: 12,
    fontWeight: '500',
  },
});
