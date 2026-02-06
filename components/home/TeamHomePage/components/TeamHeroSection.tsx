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
  colors,
}: TeamHeroSectionProps) {

  // Commander insights
  const topPerformer = leaderboard[0];
  const needsAttention = leaderboard.filter((e) => e.accuracy < 50 || e.sessions < 2);

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
                  <Text style={[s.metaText, { color: colors.textMuted }]}>{streak}d streak</Text>
                </>
              )}
              {totalShots > 0 && (
                <>
                  <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
                  <Text style={[s.metaText, { color: colors.textMuted }]}>
                    {totalShots.toLocaleString()} shots
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.detailsBtn} onPress={onViewDetails} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.detailsBtnText, { color: colors.textMuted }]}>Insights</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats Strip */}
        <View style={[s.statsStrip, { borderTopColor: colors.border }]}>
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{weeklyProgress}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>sessions</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {weeklyAccuracy > 0 ? `${Math.round(weeklyAccuracy)}%` : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {totalShots > 0 ? formatShots(totalShots) : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>shots</Text>
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
                  {' '}leads — {topPerformer.sessions} sessions, {Math.round(topPerformer.accuracy)}%
                </Text>
              </View>
            )}
            {needsAttention.length > 0 && needsAttention.length < leaderboard.length && (
              <View style={s.insightRow}>
                <AlertTriangle size={11} color={colors.textMuted} />
                <Text style={[s.insightText, { color: colors.textMuted }]}>
                  {needsAttention.length} member{needsAttention.length !== 1 ? 's' : ''} may need support
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
});
