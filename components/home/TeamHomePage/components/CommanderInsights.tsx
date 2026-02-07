/**
 * CommanderInsights Component
 *
 * Analytics summary for commanders showing team performance metrics.
 * Comparisons, trends, and actionable insights.
 */

import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  sessions: number;
  accuracy: number;
  shots: number;
}

interface CommanderInsightsProps {
  leaderboard: LeaderboardEntry[];
  avgAccuracy: number;
  totalSessions: number;
  totalShots: number;
  memberCount: number;
  weeklyGoal: number;
  onViewDetails: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
}

export function CommanderInsights({
  leaderboard,
  avgAccuracy,
  totalSessions,
  totalShots,
  memberCount,
  weeklyGoal,
  onViewDetails,
  colors,
}: CommanderInsightsProps) {
  const { t } = useTranslation();
  // Calculate insights
  const activeMembers = leaderboard.length;
  const participationRate = memberCount > 0 ? Math.round((activeMembers / memberCount) * 100) : 0;
  const goalProgress = weeklyGoal > 0 ? Math.round((totalSessions / weeklyGoal) * 100) : 0;

  // Find top and needs-attention
  const topPerformer = leaderboard[0];
  const needsAttention = leaderboard.filter((e) => e.accuracy < 50 || e.sessions < 2);

  return (
    <Animated.View entering={FadeIn.delay(100)} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerText, { color: colors.textMuted }]}>{t('teamHome.commanderView')}</Text>
        <TouchableOpacity style={s.detailsBtn} onPress={onViewDetails} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[s.detailsBtnText, { color: colors.textMuted }]}>{t('teamHome.details')}</Text>
          <ChevronRight size={10} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Insights Card */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Key Metrics Row */}
        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: colors.text }]}>{participationRate}%</Text>
            <Text style={[s.metricLabel, { color: colors.textMuted }]}>{t('teamHome.participation')}</Text>
          </View>
          <View style={[s.metricDivider, { backgroundColor: colors.border }]} />
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: colors.text }]}>{Math.round(avgAccuracy)}%</Text>
            <Text style={[s.metricLabel, { color: colors.textMuted }]}>{t('teamHome.teamAvg')}</Text>
          </View>
          <View style={[s.metricDivider, { backgroundColor: colors.border }]} />
          <View style={s.metric}>
            <Text style={[s.metricValue, { color: colors.text }]}>{goalProgress}%</Text>
            <Text style={[s.metricLabel, { color: colors.textMuted }]}>{t('teamHome.ofGoal')}</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={[s.insightsSection, { borderTopColor: colors.border }]}>
          {/* Top performer */}
          {topPerformer && (
            <View style={s.insightRow}>
              <TrendingUp size={12} color={colors.green} />
              <Text style={[s.insightText, { color: colors.textMuted }]}>
                {t('teamHome.leadsWithSessions', { name: topPerformer.userName, sessions: topPerformer.sessions, accuracy: Math.round(topPerformer.accuracy) })}
              </Text>
            </View>
          )}

          {/* Needs attention */}
          {needsAttention.length > 0 && needsAttention.length < leaderboard.length && (
            <View style={s.insightRow}>
              <AlertTriangle size={12} color={colors.textMuted} />
              <Text style={[s.insightText, { color: colors.textMuted }]}>
                {needsAttention.length === 1
                  ? t('teamHome.membersNeedSupport', { count: needsAttention.length })
                  : t('teamHome.membersNeedSupportPlural', { count: needsAttention.length })}
              </Text>
            </View>
          )}

          {/* Low participation warning */}
          {participationRate < 50 && memberCount > 2 && (
            <View style={s.insightRow}>
              <TrendingDown size={12} color={colors.textMuted} />
              <Text style={[s.insightText, { color: colors.textMuted }]}>
                {(memberCount - activeMembers) === 1
                  ? t('teamHome.memberInactiveThisWeek', { count: memberCount - activeMembers })
                  : t('teamHome.membersInactiveThisWeek', { count: memberCount - activeMembers })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  insightsSection: {
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
});
