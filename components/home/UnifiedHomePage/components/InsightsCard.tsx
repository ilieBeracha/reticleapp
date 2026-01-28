/**
 * InsightsCard Component
 *
 * Compact AI-powered shooter insights.
 */

import { AlertTriangle, Award, ChevronRight, Clock, Sparkles, Target, TrendingUp, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Colors, WeeklyStats } from '../UnifiedHomePage.types';

interface InsightsCardProps {
  stats: WeeklyStats;
  streak: number;
  lastSessionDaysAgo: number | null;
  colors: Colors;
  onPress?: () => void;
}

type InsightType = 'positive' | 'warning' | 'achievement';

interface Insight {
  type: InsightType;
  icon: React.ReactNode;
  text: string;
  highlight?: string;
}

function generateInsight(
  stats: WeeklyStats,
  streak: number,
  lastSessionDaysAgo: number | null,
  colors: Colors,
  t: ReturnType<typeof useTranslation>['t']
): Insight | null {
  // Priority: achievements > warnings > positive

  // Inactivity warning (highest priority)
  if (lastSessionDaysAgo !== null && lastSessionDaysAgo > 5) {
    return {
      type: 'warning',
      icon: <Clock size={16} color={colors.orange} />,
      text: t('insights.daysIdle', { count: lastSessionDaysAgo }),
      highlight: t('insights.timeToTrain'),
    };
  }

  // Accuracy achievements
  if (stats.accuracy >= 85) {
    return {
      type: 'achievement',
      icon: <Award size={16} color="#F59E0B" />,
      text: t('insights.elitePerformance'),
      highlight: t('insights.accuracyHighlight', { accuracy: stats.accuracy }),
    };
  }

  // Session achievements
  if (stats.sessions >= 5) {
    return {
      type: 'achievement',
      icon: <Zap size={16} color="#8B5CF6" />,
      text: t('insights.trainingMachine'),
      highlight: t('insights.sessionsHighlight', { count: stats.sessions }),
    };
  }

  // Streak achievements
  if (streak >= 7) {
    return {
      type: 'achievement',
      icon: <Sparkles size={16} color="#F97316" />,
      text: t('insights.onFire'),
      highlight: t('insights.streakHighlight', { count: streak }),
    };
  }

  // Low accuracy warning
  if (stats.accuracy < 50 && stats.sessions > 0) {
    return {
      type: 'warning',
      icon: <AlertTriangle size={16} color={colors.orange} />,
      text: t('insights.focusFundamentals'),
      highlight: t('insights.slowIsSmooth'),
    };
  }

  // Good momentum
  if (stats.sessions >= 3) {
    return {
      type: 'positive',
      icon: <TrendingUp size={16} color={colors.green} />,
      text: t('insights.goodMomentum'),
      highlight: t('insights.sessionsThisWeek', { count: stats.sessions }),
    };
  }

  // Default
  if (stats.sessions > 0) {
    return {
      type: 'positive',
      icon: <Target size={16} color={colors.primary} />,
      text: t('insights.keepBuilding'),
      highlight: t('insights.consistencyIsKey'),
    };
  }

  return null;
}

export function InsightsCard({ stats, streak, lastSessionDaysAgo, colors, onPress }: InsightsCardProps) {
  const { t } = useTranslation();
  const insight = generateInsight(stats, streak, lastSessionDaysAgo, colors, t);

  if (!insight) return null;

  const bgColors = {
    positive: `${colors.green}10`,
    warning: `${colors.orange}10`,
    achievement: '#F59E0B10',
  };

  const borderColors = {
    positive: `${colors.green}30`,
    warning: `${colors.orange}30`,
    achievement: '#F59E0B30',
  };

  return (
    <TouchableOpacity
      style={[
        s.card,
        {
          backgroundColor: bgColors[insight.type],
          borderColor: borderColors[insight.type],
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={s.iconWrap}>{insight.icon}</View>

      <View style={s.content}>
        <Text style={[s.text, { color: colors.text }]}>{insight.text}</Text>
        {insight.highlight && <Text style={[s.highlight, { color: colors.textMuted }]}>{insight.highlight}</Text>}
      </View>

      {onPress && <ChevronRight size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  highlight: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
});
