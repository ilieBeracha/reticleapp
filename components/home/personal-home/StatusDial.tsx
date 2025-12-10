import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowRight, Calendar, Crosshair, Play, Target } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type {
  SessionStats,
  SessionWithDetails,
  ThemeColors,
  WeeklyStats,
} from './types';

interface UpcomingTraining {
  id: string;
  title: string;
  status: string;
}

interface StatsCardProps {
  colors: ThemeColors;
  activeSession: SessionWithDetails | undefined;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  weeklyStats: WeeklyStats;
  lastSession: SessionWithDetails | undefined;
  // Session actions
  starting: boolean;
  onStart: () => void;
  // Training
  nextTraining?: UpcomingTraining;
}

export function StatusDial({
  colors,
  activeSession,
  sessionTitle,
  sessionStats,
  weeklyStats,
  lastSession,
  starting,
  onStart,
  nextTraining,
}: StatsCardProps) {
  // Calculate last session insight
  const lastSessionInsight = lastSession ? {
    date: format(new Date(lastSession.created_at), 'MMM d'),
    type: lastSession.training_title || lastSession.drill_name || 'Freestyle',
  } : null;

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.section}>
      {/* Active Session Card */}
      {activeSession ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.activeCard, { borderColor: '#10B981' }]}
          onPress={onStart}
        >
          <View style={styles.activeHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE SESSION</Text>
            </View>
            <Text style={[styles.activeTitle, { color: colors.text }]}>{sessionTitle}</Text>
          </View>
          
          <View style={styles.activeStats}>
            <View style={styles.activeStat}>
              <Text style={[styles.activeStatValue, { color: colors.text }]}>
                {sessionStats?.targetCount ?? 0}
              </Text>
              <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>targets</Text>
            </View>
            <View style={styles.activeStat}>
              <Text style={[styles.activeStatValue, { color: colors.text }]}>
                {sessionStats?.totalShotsFired ?? 0}
              </Text>
              <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>shots</Text>
            </View>
            <View style={styles.activeStat}>
              <Text style={[styles.activeStatValue, { color: colors.text }]}>
                {sessionStats?.totalHits ?? 0}
              </Text>
              <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>hits</Text>
            </View>
          </View>

          <View style={styles.resumeRow}>
            <Text style={styles.resumeText}>Continue Session</Text>
            <ArrowRight size={18} color="#10B981" />
          </View>
        </TouchableOpacity>
      ) : (
        /* Start Session Button */
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={starting}
          style={[styles.startButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onStart}
        >
          <View style={styles.startButtonIcon}>
            {starting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Play size={24} color="#fff" fill="#fff" />
            )}
          </View>
          <View style={styles.startButtonText}>
            <Text style={[styles.startTitle, { color: colors.text }]}>
              {starting ? 'Starting...' : 'Start Session'}
            </Text>
            <Text style={[styles.startDesc, { color: colors.textMuted }]}>
              Scan targets or log results
            </Text>
          </View>
          <ArrowRight size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Training Card - if available */}
      {nextTraining && !activeSession && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.trainingCard,
            { 
              backgroundColor: colors.card,
              borderColor: nextTraining.status === 'ongoing' ? '#EF4444' : colors.border,
            }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/(protected)/trainingDetail?id=${nextTraining.id}` as any);
          }}
        >
          <View style={styles.trainingLeft}>
            {nextTraining.status === 'ongoing' ? (
              <View style={styles.trainingLive}>
                <View style={styles.liveDotRed} />
                <Text style={styles.liveTextRed}>LIVE</Text>
              </View>
            ) : (
              <View style={styles.trainingScheduled}>
                <Calendar size={14} color={colors.textMuted} />
                <Text style={[styles.scheduledText, { color: colors.textMuted }]}>TRAINING</Text>
              </View>
            )}
            <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
              {nextTraining.title}
            </Text>
          </View>
          <View style={[styles.joinButton, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.joinText, { color: colors.text }]}>Join</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Weekly Stats - Small summary */}
      {!activeSession && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyStats.paperTargets + weeklyStats.tacticalTargets}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>targets</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Crosshair size={14} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyStats.totalShots}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weeklyStats.sessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>sessions</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  
  // Active Session
  activeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
  },
  activeHeader: {
    marginBottom: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#10B981',
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  activeStat: {
    alignItems: 'center',
  },
  activeStatValue: {
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  activeStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
  },
  resumeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },

  // Start Session Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  startButtonIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    flex: 1,
  },
  startTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  startDesc: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Training Card
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  trainingLeft: {
    flex: 1,
    gap: 4,
  },
  trainingLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveTextRed: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#EF4444',
  },
  trainingScheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduledText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
  },
});
