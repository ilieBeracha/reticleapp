/**
 * TeamHeroSection Component
 *
 * Compact, utilitarian team stats card.
 * Clean information hierarchy, minimal decoration.
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
  onViewDetails,
  userId,
  myStats,
  colors,
}: TeamHeroSectionProps) {
  const { t } = useTranslation();

  const topPerformer = leaderboard[0];
  const needsAttention = leaderboard.filter((e) => e.accuracy < 50 || e.sessions < 2);
  const activeMembers = leaderboard.length;
  const participationRate = memberCount > 0 ? Math.round((activeMembers / memberCount) * 100) : 0;

  const myRank = userId ? leaderboard.find((e) => e.userId === userId)?.rank : null;
  const totalRanked = leaderboard.length;

  // Soldier view - personal stats focused
  if (!isCommander && myStats) {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={s.container}>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={[s.title, { color: colors.text }]}>{t('teamHome.yourProgress')}</Text>
              <Text style={[s.subtitle, { color: colors.textMuted }]}>{teamName}</Text>
            </View>
            {myRank && totalRanked > 1 && (
              <View style={[s.rankPill, { backgroundColor: colors.green + '12' }]}>
                <TrendingUp size={10} color={colors.green} />
                <Text style={[s.rankText, { color: colors.green }]}>#{myRank}/{totalRanked}</Text>
              </View>
            )}
          </View>

          <View style={[s.statsRow, { borderTopColor: colors.border }]}>
            <View style={s.stat}>
              <Text style={[s.statValue, { color: colors.text }]}>{myStats.sessions}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.sessionsLower')}</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.stat}>
              <Text style={[s.statValue, { color: colors.text }]}>
                {myStats.accuracy > 0 ? `${Math.round(myStats.accuracy)}%` : '—'}
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.accuracyLower')}</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.stat}>
              <Text style={[s.statValue, { color: colors.text }]}>{formatShots(myStats.shots)}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.shots')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.linkRow, { borderTopColor: colors.border }]}
            onPress={onViewDetails}
            activeOpacity={0.6}
          >
            <Text style={[s.linkText, { color: colors.textMuted }]}>{t('teamHome.viewFullInsights')}</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Commander view - team overview
  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.container}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Team header */}
        <View style={s.headerRow}>
          <View style={s.teamIdentity}>
            <View style={[s.teamBadge, { backgroundColor: teamColor + '15' }]}>
              <Text style={[s.teamInitial, { color: teamColor }]}>{teamName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={[s.teamName, { color: colors.text }]}>{teamName}</Text>
              <View style={s.metaRow}>
                <Users size={10} color={colors.textMuted} />
                <Text style={[s.metaText, { color: colors.textMuted }]}>{memberCount}</Text>
                {streak > 0 && (
                  <>
                    <Text style={[s.metaDot, { color: colors.border }]}>·</Text>
                    <Text style={[s.metaText, { color: colors.textMuted }]}>{streak}d streak</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.insightsBtn} onPress={onViewDetails} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.insightsBtnText, { color: colors.textMuted }]}>{t('teamHome.insights')}</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[s.statsRow, { borderTopColor: colors.border }]}>
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
            <Text style={[s.statValue, { color: colors.text }]}>{participationRate}%</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.active')}</Text>
          </View>
        </View>

        {/* Insights - only show if meaningful */}
        {isCommander && (topPerformer || needsAttention.length > 0) && (
          <View style={[s.insightsRow, { borderTopColor: colors.border }]}>
            {topPerformer && (
              <View style={s.insight}>
                <TrendingUp size={10} color={colors.green} />
                <Text style={[s.insightText, { color: colors.textMuted }]} numberOfLines={1}>
                  <Text style={{ color: colors.text, fontWeight: '500' }}>{topPerformer.userName}</Text>
                  {' · '}{topPerformer.sessions}s · {Math.round(topPerformer.accuracy)}%
                </Text>
              </View>
            )}
            {needsAttention.length > 0 && needsAttention.length < leaderboard.length && (
              <View style={s.insight}>
                <AlertTriangle size={10} color="#F59E0B" />
                <Text style={[s.insightText, { color: colors.textMuted }]}>
                  {needsAttention.length} {t('teamHome.needsAttention')}
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
  container: { marginBottom: 10 },
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  subtitle: { fontSize: 11, marginTop: 1 },
  teamIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  teamInitial: { fontSize: 14, fontWeight: '700' },
  teamName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11 },
  metaDot: { fontSize: 11 },
  insightsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  insightsBtnText: { fontSize: 12 },
  rankPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rankText: { fontSize: 11, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, alignSelf: 'stretch', marginVertical: 4 },

  // Insights
  insightsRow: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightText: { fontSize: 11, flex: 1 },

  // Link
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderTopWidth: 1, paddingVertical: 10 },
  linkText: { fontSize: 12 },
});
