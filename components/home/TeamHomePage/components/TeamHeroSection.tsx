/**
 * TeamHeroSection Component
 *
 * Compact command-style team header with inline stats.
 * Refined, professional aesthetic - minimal color usage.
 */

import { ChevronRight, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeamHeroSectionProps {
  teamName: string;
  teamColor: string;
  memberCount: number;
  weeklyGoal: number;
  weeklyProgress: number;
  weeklyAccuracy: number;
  streak: number;
  onViewDetails: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function TeamHeroSection({
  teamName,
  teamColor,
  memberCount,
  weeklyGoal,
  weeklyProgress,
  weeklyAccuracy,
  streak,
  onViewDetails,
  colors,
}: TeamHeroSectionProps) {
  const progressPercent = weeklyGoal > 0 ? Math.min((weeklyProgress / weeklyGoal) * 100, 100) : 0;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.container}>
      {/* Main Card */}
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
            <Text style={[s.statValue, { color: colors.text }]}>{Math.round(weeklyAccuracy)}%</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{Math.round(progressPercent)}%</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>of goal</Text>
          </View>
        </View>

        {/* Minimal Progress Bar */}
        <View style={[s.progressContainer, { backgroundColor: colors.border }]}>
          <View style={[s.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.textMuted }]} />
        </View>
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
  progressContainer: {
    height: 2,
  },
  progressFill: {
    height: '100%',
  },
});
