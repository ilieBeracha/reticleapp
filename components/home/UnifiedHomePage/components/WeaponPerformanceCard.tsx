/**
 * WeaponPerformanceCard
 *
 * Prominent "Club Performance" style card showing weapon stats:
 * sessions, accuracy, best group, rounds, and last-used recency.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import type { UserWeapon, WeaponStats } from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Crosshair, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Colors } from '../UnifiedHomePage.types';

interface WeaponPerformanceCardProps {
  weapon: UserWeapon;
  stats: WeaponStats;
  colors: Colors;
}

type Trend = 'improving' | 'stable' | 'declining' | 'new';

function getTrend(stats: WeaponStats): Trend {
  if (stats.total_sessions < 3) return 'new';
  // Without historical data, derive from accuracy and recency
  const accuracy = stats.avg_accuracy_pct ?? 0;
  if (accuracy >= 75) return 'improving';
  if (accuracy >= 50) return 'stable';
  return 'declining';
}

function TrendBadge({ trend, colors }: { trend: Trend; colors: Colors }) {
  const { t } = useTranslation();
  const config = {
    improving: { label: t('insights.improving'), color: colors.green, Icon: TrendingUp },
    stable: { label: t('weapons.stable'), color: colors.textMuted, Icon: Minus },
    declining: { label: t('weapons.needsWork'), color: colors.orange, Icon: TrendingDown },
    new: { label: t('common.new'), color: colors.blue, Icon: Minus },
  }[trend];

  return (
    <View style={[s.trendBadge, { backgroundColor: config.color + '15' }]}>
      <config.Icon size={11} color={config.color} />
      <Text style={[s.trendText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function Metric({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={s.metric}>
      <Text style={[s.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function WeaponPerformanceCard({ weapon, stats, colors }: WeaponPerformanceCardProps) {
  const { t } = useTranslation();
  const trend = getTrend(stats);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/weaponDetail?weaponId=${weapon.id}` as any);
  };

  const accuracy = stats.avg_accuracy_pct !== null ? `${Math.round(stats.avg_accuracy_pct)}%` : '—';
  const bestGroup = stats.best_dispersion_cm !== null ? `${stats.best_dispersion_cm.toFixed(1)}cm` : '—';
  const rounds =
    stats.total_rounds_fired >= 1000
      ? `${(stats.total_rounds_fired / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : String(stats.total_rounds_fired);

  // Recency text
  let recency = '';
  if (stats.last_used_at) {
    const daysAgo = Math.floor((Date.now() - new Date(stats.last_used_at).getTime()) / 86400000);
    if (daysAgo === 0) recency = t('weapons.usedToday');
    else if (daysAgo === 1) recency = t('time.yesterday');
    else if (daysAgo < 7) recency = t('time.daysAgo', { count: daysAgo });
    else recency = t('time.weeksAgo', { count: Math.floor(daysAgo / 7) });
  }

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(50)}>
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Header row */}
        <View style={s.header}>
          <View style={[s.weaponIcon, { backgroundColor: `${colors.indigo}15` }]}>
            <Crosshair size={16} color={colors.indigo} />
          </View>
          <View style={s.headerInfo}>
            <Text style={[s.weaponName, { color: colors.text }]} numberOfLines={1}>
              {weapon.name}
            </Text>
            <Text style={[s.weaponMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {weapon.caliber || weapon.category || t('weapons.primaryWeapon')}
              {recency ? ` · ${recency}` : ''}
            </Text>
          </View>
          <TrendBadge trend={trend} colors={colors} />
        </View>

        {/* Metrics row */}
        <View style={[s.metricsRow, { borderTopColor: colors.border }]}>
          <Metric label={t('session.sessions')} value={String(stats.total_sessions)} colors={colors} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Metric label={t('session.accuracy')} value={accuracy} colors={colors} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Metric label={t('session.bestGroup')} value={bestGroup} colors={colors} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Metric label={t('weapons.rounds')} value={rounds} colors={colors} />
        </View>

        {/* Footer link */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.primary }]}>{t('common.viewDetails')}</Text>
          <DirectionalChevron size={13} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  weaponIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  weaponMeta: {
    fontSize: 12,
  },

  // Trend Badge
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 24,
    alignSelf: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 0,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
