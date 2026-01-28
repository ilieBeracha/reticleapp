/**
 * AutoCloseCountdown Component
 * Countdown timer for auto-close functionality
 */

import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AutoCloseCountdownProps } from './types';

export function AutoCloseCountdown({ autoCloseAt, colors, onExpired }: AutoCloseCountdownProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(autoCloseAt);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(t('training.closing'));
        setIsExpired(true);
        onExpired();
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else if (mins > 0) {
        setTimeLeft(`${mins}m ${secs}s`);
      } else {
        setTimeLeft(`${secs}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [autoCloseAt, onExpired]);

  if (isExpired) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.orange + '15' }]}>
      <Timer size={14} color={colors.orange} />
      <Text style={[styles.text, { color: colors.orange }]}>
        {t('training.autoCloseIn')} <Text style={styles.timeValue}>{timeLeft}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
  },
  timeValue: {
    fontWeight: '700',
  },
});
