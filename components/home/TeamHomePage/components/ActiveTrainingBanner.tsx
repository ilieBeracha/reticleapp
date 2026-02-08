/**
 * ActiveTrainingBanner Component
 *
 * Urgent notification bar for live training.
 * High visibility, minimal distraction.
 */

import type { TrainingWithDetails } from '@/types/workspace';
import { ChevronRight, Radio } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ActiveTrainingBannerProps {
  training: TrainingWithDetails;
  teamColor: string;
  onJoin: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function ActiveTrainingBanner({ training, teamColor, onJoin, colors }: ActiveTrainingBannerProps) {
  const { t } = useTranslation();
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const participantCount = (training as any).participants?.length || 0;

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <TouchableOpacity
        style={[s.container, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '40' }]}
        onPress={onJoin}
        activeOpacity={0.8}
      >
        {/* Left: Live indicator + Info */}
        <View style={s.leftSection}>
          {/* Pulsing dot */}
          <View style={s.liveIndicator}>
            <Animated.View style={[s.liveDotOuter, pulseStyle]} />
            <View style={s.liveDotInner} />
          </View>

          {/* Text content */}
          <View style={s.textContent}>
            <View style={s.titleRow}>
              <Text style={[s.liveTag, { color: '#10B981' }]}>LIVE</Text>
              <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
                {training.title}
              </Text>
            </View>
            {participantCount > 0 && (
              <Text style={[s.subtitle, { color: colors.textMuted }]}>
                {t('teamHome.participantsActive', { count: participantCount })}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Join button */}
        <View style={s.joinSection}>
          <View style={[s.joinBtn, { backgroundColor: '#10B981' }]}>
            <Radio size={14} color="#fff" strokeWidth={2} />
            <Text style={s.joinText}>{t('teamHome.join')}</Text>
            <ChevronRight size={14} color="#fff" strokeWidth={2} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotOuter: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981' + '30',
  },
  liveDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  joinSection: {
    marginLeft: 12,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
