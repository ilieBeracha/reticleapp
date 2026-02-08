/**
 * MyProgressCard Component
 *
 * Personal progress within the team context.
 * Clean, data-focused. Shows contribution without competition.
 */

import { Crosshair, Flame, Target, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface MyProgressCardProps {
  sessions: number;
  shots: number;
  accuracy: number;
  teamTotalSessions: number;
  teamColor?: string;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
}

export function MyProgressCard({ sessions, shots, accuracy, teamTotalSessions, teamColor, colors }: MyProgressCardProps) {
  const { t } = useTranslation();
  const contributionPercent = teamTotalSessions > 0 ? Math.round((sessions / teamTotalSessions) * 100) : 0;
  const accentColor = teamColor || colors.green;

  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <Animated.View entering={FadeIn.delay(100)} style={s.container}>
      {/* Section Header */}
      <Text style={[s.headerText, { color: colors.textMuted }]}>{t('teamHome.yourProgress').toUpperCase()}</Text>

      {/* Stats Card */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Main Stats Grid */}
        <View style={s.statsGrid}>
          {/* Sessions */}
          <View style={s.statItem}>
            <View style={[s.statIconWrap, { backgroundColor: accentColor + '15' }]}>
              <Flame size={14} color={accentColor} strokeWidth={2} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{sessions}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.sessionsLower')}</Text>
          </View>

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Shots */}
          <View style={s.statItem}>
            <View style={[s.statIconWrap, { backgroundColor: colors.border }]}>
              <Crosshair size={14} color={colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{formatNumber(shots)}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.shots')}</Text>
          </View>

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Accuracy */}
          <View style={s.statItem}>
            <View style={[s.statIconWrap, { backgroundColor: colors.green + '15' }]}>
              <Target size={14} color={colors.green} strokeWidth={2} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{Math.round(accuracy)}%</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{t('teamHome.accuracyLower')}</Text>
          </View>
        </View>

        {/* Contribution Bar */}
        {teamTotalSessions > 0 && (
          <View style={[s.footer, { borderTopColor: colors.border }]}>
            <View style={s.footerContent}>
              <TrendingUp size={12} color={colors.textMuted} />
              <Text style={[s.footerText, { color: colors.textMuted }]}>
                {t('teamHome.ofTeamSessionsWeek', { percent: contributionPercent })}
              </Text>
            </View>
            {/* Progress bar */}
            <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[s.progressBar, { backgroundColor: accentColor, width: `${Math.min(contributionPercent, 100)}%` }]}
              />
            </View>
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
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    marginVertical: 8,
  },
  // Footer
  footer: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
