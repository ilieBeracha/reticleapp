/**
 * Stats Cards
 * 
 * Side-by-side cards showing aggregated stats and insights.
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { Award, Crosshair, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const CARD_RADIUS = 16;

interface StatsCardsProps {
  allSessions: SessionWithDetails[];
  trainingStats: { upcoming: number; completed: number; total: number };
  hasTeams: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATED STATS CARD - Shows session completion ring
// ═══════════════════════════════════════════════════════════════════════════

export function AggregatedStatsCard({
  allSessions,
  trainingStats,
}: {
  allSessions: SessionWithDetails[];
  trainingStats: { upcoming: number; completed: number; total: number };
}) {
  const colors = useColors();
  const completedSessions = allSessions.filter((s) => s.status === 'completed').length;
  const activeSessions = allSessions.filter((s) => s.status === 'active').length;
  const totalSessions = allSessions.length;

  const progress = totalSessions > 0 ? completedSessions / totalSessions : 0;
  const progressPercent = Math.round(progress * 100);

  const size = 80;
  const strokeWidth = 8;

  return (
    <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.halfCard}>
      <View style={[styles.card, styles.radialCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Radial Ring */}
        <View style={styles.radialContainer}>
          <View style={[styles.radialRing, { width: size, height: size }]}>
            {/* Background ring */}
            <View
              style={[
                styles.ringBg,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: colors.secondary,
                },
              ]}
            />

            {/* Progress segments */}
            <View style={[styles.ringProgress, { width: size, height: size }]}>
              <View
                style={[
                  styles.ringSegment,
                  {
                    width: size / 2,
                    height: size / 2,
                    top: 0,
                    right: 0,
                    borderTopRightRadius: size / 2,
                    backgroundColor: progress > 0.25 ? `${colors.indigo}30` : 'transparent',
                  },
                ]}
              />
              <View
                style={[
                  styles.ringSegment,
                  {
                    width: size / 2,
                    height: size / 2,
                    bottom: 0,
                    right: 0,
                    borderBottomRightRadius: size / 2,
                    backgroundColor: progress > 0.5 ? `${colors.indigo}30` : 'transparent',
                  },
                ]}
              />
              <View
                style={[
                  styles.ringSegment,
                  {
                    width: size / 2,
                    height: size / 2,
                    bottom: 0,
                    left: 0,
                    borderBottomLeftRadius: size / 2,
                    backgroundColor: progress > 0.75 ? `${colors.indigo}30` : 'transparent',
                  },
                ]}
              />
            </View>

            {/* Center content */}
            <View style={styles.ringCenter}>
              <Text style={[styles.ringPercent, { color: colors.text }]}>{progressPercent}%</Text>
            </View>

            {/* Glowing dot indicator */}
            <View
              style={[
                styles.glowDot,
                {
                  backgroundColor: colors.indigo,
                  shadowColor: colors.indigo,
                  top: strokeWidth / 2,
                  left: size / 2 - 4,
                },
              ]}
            />
          </View>
        </View>

        {/* Stats breakdown */}
        <View style={styles.radialStats}>
          <View style={styles.radialStatRow}>
            <View style={[styles.statDot, { backgroundColor: colors.indigo }]} />
            <Text style={[styles.radialStatText, { color: colors.textMuted }]}>{activeSessions} active</Text>
          </View>
          <View style={styles.radialStatRow}>
            <View style={[styles.statDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.radialStatText, { color: colors.textMuted }]}>{completedSessions} done</Text>
          </View>
          <View style={styles.radialStatRow}>
            <View style={[styles.statDot, { backgroundColor: colors.orange }]} />
            <Text style={[styles.radialStatText, { color: colors.textMuted }]}>{totalSessions} total</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHTS CARD - Quick stats overview
// ═══════════════════════════════════════════════════════════════════════════

export function InsightsCard({
  allSessions,
  trainingStats,
  hasTeams,
}: StatsCardsProps) {
  const colors = useColors();
  const completedSessions = allSessions.filter((s) => s.status === 'completed').length;
  const totalSessions = allSessions.length;
  const personalSessions = allSessions.filter((s) => !s.team_id).length;
  const teamSessions = allSessions.filter((s) => s.team_id).length;

  const completionPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <Animated.View entering={FadeIn.delay(150).duration(400)} style={styles.halfCard}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Solo sessions */}
        <TouchableOpacity style={[styles.statRow, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
          <View style={[styles.statIcon, { backgroundColor: `${colors.indigo}22` }]}>
            <Crosshair size={14} color={colors.indigo} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.text }]}>Solo</Text>
            <Text style={[styles.statValue, { color: colors.textMuted }]}>
              {personalSessions} session{personalSessions !== 1 ? 's' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Team sessions or trainings */}
        <TouchableOpacity
          style={[styles.statRow, { backgroundColor: colors.secondary, marginTop: 8 }]}
          activeOpacity={0.7}
        >
          <View style={[styles.statIcon, { backgroundColor: `${colors.green}22` }]}>
            {hasTeams ? <Users size={14} color={colors.green} /> : <Award size={14} color={colors.green} />}
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.text }]}>{hasTeams ? 'Team' : 'Trainings'}</Text>
            <Text style={[styles.statValue, { color: colors.textMuted }]}>
              {hasTeams ? `${teamSessions} session${teamSessions !== 1 ? 's' : ''}` : `${trainingStats.completed} completed`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Mini progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
            <View
              style={[styles.progressFill, { backgroundColor: colors.indigo, width: `${Math.min(100, Math.max(0, completionPercent))}%` }]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  halfCard: {
    flex: 1,
  },
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    padding: 14,
  },
  radialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
    overflow: 'hidden',
  },
  ringSegment: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  glowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  radialStats: {
    flex: 1,
    gap: 6,
  },
  radialStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radialStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 11,
    marginTop: 1,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});






