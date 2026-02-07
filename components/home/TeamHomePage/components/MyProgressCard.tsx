/**
 * MyProgressCard Component
 *
 * Personal progress within the team context.
 * For members (non-commanders) - focuses on individual contribution.
 */

import { Target, TrendingUp, Zap } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface MyProgressCardProps {
  sessions: number;
  shots: number;
  accuracy: number;
  teamTotalSessions: number;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
  };
}

export function MyProgressCard({ sessions, shots, accuracy, teamTotalSessions, colors }: MyProgressCardProps) {
  const contributionPercent = teamTotalSessions > 0 ? Math.round((sessions / teamTotalSessions) * 100) : 0;

  return (
    <Animated.View entering={FadeIn.delay(100)} style={s.container}>
      {/* Header */}
      <Text style={[s.headerText, { color: colors.textMuted }]}>YOUR CONTRIBUTION</Text>

      {/* Stats Card */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.statsRow}>
          {/* Sessions */}
          <View style={s.stat}>
            <View style={s.statIcon}>
              <Zap size={12} color={colors.textMuted} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{sessions}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>sessions</Text>
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Shots */}
          <View style={s.stat}>
            <View style={s.statIcon}>
              <Target size={12} color={colors.textMuted} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{shots}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>shots</Text>
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Accuracy */}
          <View style={s.stat}>
            <View style={s.statIcon}>
              <TrendingUp size={12} color={colors.textMuted} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{Math.round(accuracy)}%</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
        </View>

        {/* Contribution footer */}
        {teamTotalSessions > 0 && (
          <View style={[s.footer, { borderTopColor: colors.border }]}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              {contributionPercent}% of team sessions this week
            </Text>
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
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
