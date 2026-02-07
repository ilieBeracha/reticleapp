/**
 * ActiveTrainingBanner Component
 *
 * Subtle notification bar for live training.
 */

import type { TrainingWithDetails } from '@/types/workspace';
import { Radio } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

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

  useEffect(() => {
    pulseOpacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, false);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Live Indicator */}
      <View style={s.liveSection}>
        <Animated.View style={[s.liveDot, { backgroundColor: '#10B981' }, pulseStyle]} />
        <Text style={[s.liveText, { color: colors.text }]}>{t('teamHome.live')}</Text>
      </View>

      {/* Training Info */}
      <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
        {training.title}
      </Text>

      {/* Join Button */}
      <TouchableOpacity style={[s.joinBtn, { backgroundColor: colors.text }]} onPress={onJoin} activeOpacity={0.7}>
        <Radio size={12} color={colors.background} strokeWidth={2.5} />
        <Text style={[s.joinText, { color: colors.background }]}>{t('teamHome.join')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  liveSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
