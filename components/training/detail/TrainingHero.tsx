/**
 * TrainingHero Component
 * Sharp, elegant hero with bold title and minimal status
 */

import { CheckCircle2, Clock, XCircle, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LiveDot } from './AnimatedComponents';
import { AutoCloseCountdown } from './AutoCloseCountdown';
import type { TrainingHeroProps } from './types';

export function TrainingHero({ training, colors, onAutoCloseExpired }: TrainingHeroProps) {
  const { t } = useTranslation();
  const isOngoing = training.status === 'ongoing';
  const isFinished = training.status === 'finished';
  const isCancelled = training.status === 'cancelled';

  const getStatusConfig = () => {
    if (isOngoing) {
      return {
        accentColor: colors.green,
        label: t('training.live'),
        Icon: Zap,
        showDot: true,
      };
    }
    if (isFinished) {
      return {
        accentColor: colors.primary,
        label: t('training.completed').toUpperCase(),
        Icon: CheckCircle2,
        showDot: false,
      };
    }
    if (isCancelled) {
      return {
        accentColor: colors.red,
        label: t('training.cancelled').toUpperCase(),
        Icon: XCircle,
        showDot: false,
      };
    }
    return {
      accentColor: colors.textMuted,
      label: t('training.planned').toUpperCase(),
      Icon: Clock,
      showDot: false,
    };
  };

  const status = getStatusConfig();

  return (
    <View style={styles.hero}>
      {/* Accent Line */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.accentLine, { backgroundColor: status.accentColor }]}
      />

      {/* Status Tag */}
      <Animated.View entering={FadeInRight.duration(400).delay(100)} style={styles.statusRow}>
        {status.showDot && <LiveDot size={6} />}
        {!status.showDot && <status.Icon size={12} color={status.accentColor} strokeWidth={2.5} />}
        <Text style={[styles.statusLabel, { color: status.accentColor }]}>{status.label}</Text>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        entering={FadeInDown.duration(400).delay(50)}
        style={[styles.title, { color: colors.text }]}
        numberOfLines={2}
      >
        {training.title}
      </Animated.Text>

      {/* Auto-close countdown */}
      {isOngoing && training.auto_close_at && (
        <AutoCloseCountdown autoCloseAt={training.auto_close_at} colors={colors} onExpired={onAutoCloseExpired} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 16,
  },
  accentLine: {
    width: 32,
    height: 3,
    borderRadius: 2,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
});
