/**
 * TeamHeroSection Component
 *
 * Merged team summary card:
 * - Team identity (name, members, streak)
 * - Stats strip (sessions, accuracy, participation, goal)
 * - Commander: actionable insights (top performer, needs attention, inactive)
 * - Progress bar
 */

import { AlertTriangle, ChevronRight, TrendingUp, Users } from 'lucide-react-native';
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

interface TeamHeroSectionProps {
  teamName: string;
  teamColor: string;
  memberCount: number;
  weeklyProgress: number;
  weeklyAccuracy: number;
  streak: number;
  isCommander: boolean;
  leaderboard: LeaderboardEntry[];
  totalShots: number;
  onViewDetails: () => void;
  // Personal stats for soldiers
  userId?: string;
  myStats?: {
    sessions: number;
    shots: number;
    accuracy: number;
  };
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
    green: string;
  };
}

function formatShots(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function TeamHeroSection({
  teamName,
  teamColor,
  memberCount,
  weeklyProgress,
  weeklyAccuracy,
  streak,
  isCommander,
  leaderboard,
  totalShots,
  onViewDetails,
  userId,
  myStats,
  colors,
}: TeamHeroSectionProps) {
  const { t } = useTranslation();

  // Commander insights
  const topPerformer = leaderboard[0];
  const needsAttention = leaderboard.filter((e) => e.accuracy < 50 || e.sessions < 2);

  // Soldier: find my rank
  const myRank = userId ? leaderboard.find((e) => e.userId === userId)?.rank : null;
  const totalRanked = leaderboard.length;

  // Different layout for soldiers (personal-focused)
  if (!isCommander && myStats) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={s.container}>
        {/* Personal Stats Card - prominent focus on user */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Personal header with rank badge */}
          <View style={s.personalHeader}>
            <View style={s.personalHeaderLeft}>
              <Text style={[s.personalTitle, { color: colors.text }]}>{t('teamHome.yourProgress')}</Text>
              <View style={s.teamBadge}>
                <Text style={[s.teamBadgeText, { color: colors.textMuted }]}>{teamName}</Text>
              </View>
            </View>
            {myRank && totalRanked > 1 && (
              <View style={[s.rankBadge, { backgroundColor: `${colors.green}15` }]}>
                <TrendingUp size={10} color={colors.green} />
                <Text style={[s.rankText, { color: colors.green }]}>
                  {t('teamHome.rankOf', { rank: myRank, total: totalRanked })}
                </Text>
              </View>
            )}
          </View>

          {/* Big personal stats */}
          <View style={s.personalStatsRow}>
            <View style={s.personalStat}>
              <Text style={[s.personalStatValue, { color: colors.text }]}>{myStats.sessions}</Text>
              <Text style={[s.personalStatLabel, { color: colors.textMuted }]}>{t('teamHome.sessionsLower')}</Text>
            </View>
            <View style={s.personalStat}>
              <Text style={[s.personalStatValue, { color: colors.text }]}>
                {myStats.accuracy > 0 ? `${Math.round(myStats.accuracy)}%` : '—'}
              </Text>
              <Text style={[s.personalStatLabel, { color: colors.textMuted }]}>{t('teamHome.accuracyLower')}</Text>
            </View>
            <View style={s.personalStat}>
              <Text style={[s.personalStatValue, { color: colors.text }]}>{formatShots(myStats.shots)}</Text>
              <Text style={[s.personalStatLabel, { color: colors.textMuted }]}>{t('teamHome.shots')}</Text>
            </View>
          </View>

          {/* View insights link */}
          <TouchableOpacity
            style={[s.insightsLink, { borderTopColor: colors.border }]}
            onPress={onViewDetails}
            activeOpacity={0.6}
          >
            <Text style={[s.insightsLinkText, { color: colors.textMuted }]}>{t('teamHome.viewFullInsights')}</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Commander layout (unchanged)
  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.container}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Team Identity Row */}
        <View style={s.identityRow}>
          <View style={[s.badge, { backgroundColor: colors.border }]}>
            <Text style={[s.badgeText, { color: colors.text }]}>{teamName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.identityInfo}>
            <Text style={[s.teamName, { color: colors.text }]}>{teamName}</Text>
            <View style={s.metaRow}>
              <Users size={10} color={colors.textMuted} />
              <Text style={[s.metaText, { color: colors.textMuted }]}>{memberCount}</Text>
              {streak > 0 && (
                <>
                  <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
                  <Text style={[s.metaText, { color: colors.textMuted }]}>{t('teamHome.streakDays', { count: streak })}</Text>
                </>
              )}
              {totalShots > 0 && (
                <>
                  <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
                  <Text style={[s.metaText, { color: colors.textMuted }]}>
                    {totalShots.toLocaleString()} {t('teamHome.shots')}
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.detailsBtn} onPress={onViewDetails} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.detailsBtnText, { color: colors.textMuted }]}>{t('teamHome.insights')}</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats Strip */}
        <View style={[s.statsStrip, { borderTopColor: colors.border }]}>
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{weeklyProgress}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.sessionsLower')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {weeklyAccuracy > 0 ? `${Math.round(weeklyAccuracy)}%` : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.accuracyLower')}</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {totalShots > 0 ? formatShots(totalShots) : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.shots')}</Text>
          </View>
        </View>

        {/* Commander Insights */}
        {isCommander && (topPerformer || needsAttention.length > 0) && (
          <View style={[s.insightsSection, { borderTopColor: colors.border }]}>
            {topPerformer && (
              <View style={s.insightRow}>
                <TrendingUp size={11} color={colors.green} />
                <Text style={[s.insightText, { color: colors.textMuted }]}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{topPerformer.userName}</Text>
                  {' '}{t('teamHome.leadsStats', { sessions: topPerformer.sessions, accuracy: Math.round(topPerformer.accuracy) })}
                </Text>
              </View>
            )}
            {needsAttention.length > 0 && needsAttention.length < leaderboard.length && (
              <View style={s.insightRow}>
                <AlertTriangle size={11} color={colors.textMuted} />
                <Text style={[s.insightText, { color: colors.textMuted }]}>
                  {needsAttention.length === 1
                    ? t('teamHome.membersNeedSupport', { count: needsAttention.length })
                    : t('teamHome.membersNeedSupportPlural', { count: needsAttention.length })}
                </Text>
              </View>
            )}
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
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // ─── Commander layout ───
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  identityInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 8,
    marginHorizontal: 4,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  insightsSection: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  // ─── Soldier (personal) layout ───
  personalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  personalHeaderLeft: {
    gap: 2,
  },
  personalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  teamBadge: {
    marginTop: 2,
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '600',
  },
  personalStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  personalStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  personalStatValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  personalStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  insightsLinkText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
