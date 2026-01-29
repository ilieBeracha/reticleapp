/**
 * TeamTrainingCard Component
 *
 * Displays a team training with live status indicator.
 * Features subtle animations and press feedback.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import { Calendar, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { TeamTrainingCardProps } from '@/types/home';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function TeamTrainingCard({ training, colors, onPress }: TeamTrainingCardProps) {
  const { t } = useTranslation();
  const isLive = training.status === 'ongoing';
  const drillCount = training.drill_count || 0;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedTouchable
      style={[s.card, { backgroundColor: colors.card, borderColor: isLive ? colors.orange : colors.border }, animStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <View style={[s.icon, { backgroundColor: isLive ? `${colors.orange}12` : `${colors.blue}12` }]}>
        {isLive ? <Calendar size={18} color={colors.orange} /> : <Users size={18} color={colors.blue} />}
      </View>

      <View style={s.content}>
        <View style={s.header}>
          {isLive && (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>{t('training.live')}</Text>
            </View>
          )}
          <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
        </View>
        <View style={s.meta}>
          <Text style={[s.teamName, { color: colors.textMuted }]}>
            {training.team?.name || t('training.teamTraining')}
          </Text>
          {drillCount > 0 && (
            <>
              <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
              <Text style={[s.drillCount, { color: colors.textMuted }]}>
                {t('training.drillsCount', { count: drillCount })}
              </Text>
            </>
          )}
        </View>
      </View>

      <DirectionalChevron size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
    </AnimatedTouchable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F97316',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
    opacity: 0.5,
  },
  drillCount: {
    fontSize: 12,
  },
});
