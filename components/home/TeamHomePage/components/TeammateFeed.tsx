/**
 * TeammateFeed Component
 *
 * Activity feed for members showing teammate accomplishments.
 * Collaborative, non-competitive. Clean timeline feel.
 */

import { Check, Target, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeammateActivity {
  id: string;
  userName: string;
  action: string;
  timeAgo: string;
  shotCount: number;
  accuracy?: number;
  groupingCm?: number | null;
}

interface TeammateFeedProps {
  activities: TeammateActivity[];
  teamTotalSessions: number;
  teamTotalShots: number;
  activeMembers: number;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
}

export function TeammateFeed({ activities, teamTotalSessions, teamTotalShots, activeMembers, colors }: TeammateFeedProps) {
  const { t } = useTranslation();

  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.container}>
      {/* Section Header */}
      <View style={s.header}>
        <Text style={[s.headerText, { color: colors.textMuted }]}>{t('teamHome.teamProgress').toUpperCase()}</Text>
      </View>

      {/* Main Card */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Team Summary Row */}
        <View style={[s.summaryRow, { borderBottomColor: colors.border }]}>
          <View style={s.summaryItem}>
            <Users size={12} color={colors.textMuted} />
            <Text style={[s.summaryValue, { color: colors.text }]}>{activeMembers}</Text>
            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>{t('teamHome.active')}</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Target size={12} color={colors.textMuted} />
            <Text style={[s.summaryValue, { color: colors.text }]}>{formatNumber(teamTotalShots)}</Text>
            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>{t('teamHome.shots')}</Text>
          </View>
          <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={s.summaryItem}>
            <Check size={12} color={colors.textMuted} />
            <Text style={[s.summaryValue, { color: colors.text }]}>{teamTotalSessions}</Text>
            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>{t('teamHome.sessionsLower')}</Text>
          </View>
        </View>

        {/* Activity Timeline */}
        {activities.length > 0 ? (
          <View style={s.timeline}>
            {activities.slice(0, 5).map((activity, i) => {
              const isLast = i === Math.min(activities.length, 5) - 1;
              const hasGrouping = activity.groupingCm != null && activity.groupingCm > 0;
              const hasAccuracy = activity.accuracy != null && activity.accuracy > 0;

              return (
                <View key={activity.id} style={s.timelineItem}>
                  {/* Timeline connector */}
                  <View style={s.timelineLeft}>
                    <View style={[s.timelineDot, { backgroundColor: colors.green }]} />
                    {!isLast && <View style={[s.timelineLine, { backgroundColor: colors.border }]} />}
                  </View>

                  {/* Content */}
                  <View style={[s.timelineContent, !isLast && s.timelineContentWithLine]}>
                    <View style={s.timelineHeader}>
                      <Text style={[s.timelineName, { color: colors.text }]} numberOfLines={1}>
                        {activity.userName}
                      </Text>
                      <Text style={[s.timelineTime, { color: colors.textMuted }]}>{activity.timeAgo}</Text>
                    </View>
                    <View style={s.timelineDetails}>
                      <Text style={[s.timelineAction, { color: colors.textMuted }]}>
                        {activity.shotCount > 0
                          ? t('teamHome.completedShots', { count: activity.shotCount })
                          : t('teamHome.completedASession')}
                      </Text>
                      {hasGrouping && (
                        <View style={[s.metricBadge, { backgroundColor: colors.border }]}>
                          <Text style={[s.metricText, { color: colors.text }]}>{activity.groupingCm!.toFixed(1)}cm</Text>
                        </View>
                      )}
                      {!hasGrouping && hasAccuracy && (
                        <View style={[s.metricBadge, { backgroundColor: colors.green + '20' }]}>
                          <Text style={[s.metricText, { color: colors.green }]}>{Math.round(activity.accuracy!)}%</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>{t('teamHome.noRecentActivity')}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 16,
  },
  // Timeline
  timeline: {
    paddingTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 28,
    alignItems: 'center',
    paddingTop: 12,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
  },
  timelineContentWithLine: {
    paddingBottom: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timelineName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  timelineDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineAction: {
    fontSize: 11,
    fontWeight: '400',
  },
  metricBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricText: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Empty state
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
