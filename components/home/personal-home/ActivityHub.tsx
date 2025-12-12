/**
 * ACTIVITY HUB
 * Shows the user's current training activity state:
 * - Live team training (if any)
 * - Active personal session (if any)
 * - Last completed session
 * - Start new session button
 */
import { BUTTON_GRADIENT, BUTTON_GRADIENT_DISABLED } from '@/theme/colors';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Crosshair,
  Play,
  Target,
  User,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import type { SessionStats, SessionWithDetails, ThemeColors, WeeklyStats } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface UpcomingTraining {
  id: string;
  title: string;
  status: string;
  scheduled_at?: string;
  drill_count?: number;
  team_name?: string;
}

interface ActivityHubProps {
  colors: ThemeColors;
  activeSession: SessionWithDetails | undefined;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  lastSession: SessionWithDetails | undefined;
  weeklyStats: WeeklyStats;
  starting: boolean;
  /** Open the current active personal session */
  onOpenActiveSession: () => void;
  /** Start a solo personal session */
  onStartSolo: () => void;
  nextTraining?: UpcomingTraining;
  /** If true, user can manage training (commander). If false, user is soldier. */
  canManageTraining?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Shows when a team training is currently live */
function LiveTrainingCard({
  training,
  colors,
  onPress,
}: {
  training: UpcomingTraining;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      {/* Header: Live badge + Team name */}
      <View style={styles.cardHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        {training.team_name && (
          <View style={[styles.teamBadge, { backgroundColor: colors.border }]}>
            <Users size={10} color={colors.textMuted} />
            <Text style={[styles.teamBadgeText, { color: colors.textMuted }]}>{training.team_name}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: colors.text }]}>{training.title}</Text>

      {/* Footer: Drill count + Join button */}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{training.drill_count || 0} drills</Text>
        <View style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join</Text>
          <ArrowRight size={14} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Shows the user's currently active personal session */
function ActiveSessionCard({
  session,
  title,
  stats,
  colors,
  onPress,
}: {
  session: SessionWithDetails;
  title: string;
  stats: SessionStats | null;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.activeCard} onPress={onPress}>
      {/* Header: Active badge + Duration */}
      <View style={styles.cardHeader}>
        <View style={styles.activeBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>ACTIVE SESSION</Text>
        </View>
        {session.started_at && (
          <Text style={styles.durationText}>
            {formatDistanceToNow(new Date(session.started_at), { addSuffix: false })}
          </Text>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.activeTitle, { color: colors.text }]}>{title}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Target size={16} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.targetCount ?? 0}</Text>
        </View>
        <View style={styles.stat}>
          <Crosshair size={16} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalShotsFired ?? 0}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalHits ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>hits</Text>
        </View>
      </View>

      {/* Continue button */}
      <View style={styles.continueRow}>
        <Play size={14} color="#10B981" fill="#10B981" />
        <Text style={styles.continueText}>Continue</Text>
        <ArrowRight size={14} color="#10B981" />
      </View>
    </TouchableOpacity>
  );
}

/** Shows the user's last completed session */
function LastSessionCard({
  session,
  weeklyCount,
  colors,
}: {
  session: SessionWithDetails;
  weeklyCount: number;
  colors: ThemeColors;
}) {
  const sessionName = session.training_title || session.drill_name || 'Freestyle';
  const sessionDate = format(new Date(session.created_at), 'EEE, MMM d · h:mm a');

  return (
    <Animated.View entering={FadeInDown.delay(150)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.lastSessionContent}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Clock size={16} color={colors.textMuted} />
          </View>

          {/* Info */}
          <View style={styles.lastSessionInfo}>
            <Text style={[styles.lastSessionLabel, { color: colors.textMuted }]}>Last Session</Text>
            <Text style={[styles.lastSessionTitle, { color: colors.text }]} numberOfLines={1}>
              {sessionName}
            </Text>
            <Text style={[styles.lastSessionDate, { color: colors.textMuted }]}>{sessionDate}</Text>
          </View>

          {/* Weekly count */}
          <View style={styles.weeklyStats}>
            <Text style={[styles.weeklyValue, { color: colors.text }]}>{weeklyCount}</Text>
            <Text style={[styles.weeklyLabel, { color: colors.textMuted }]}>this week</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/** Start session button with dropdown options (solo + training when available) */
function StartSessionButton({
  colors,
  starting,
  upcomingTraining,
  onStartSolo,
  onGoToTraining,
}: {
  colors: ThemeColors;
  starting: boolean;
  upcomingTraining?: UpcomingTraining;
  onStartSolo: () => void;
  onGoToTraining: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasTeamOption = !!upcomingTraining;

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  };

  const handleSolo = () => {
    setExpanded(false);
    onStartSolo();
  };

  const handleTeam = () => {
    setExpanded(false);
    onGoToTraining();
  };

  return (
    <View style={styles.startSection}>
      {/* Start button (acts as dropdown trigger) */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleToggleExpand} style={styles.startButton}>
        <LinearGradient
          colors={starting ? [...BUTTON_GRADIENT_DISABLED] : [...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startGradient}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Play size={18} color="#fff" fill="#fff" />
              <Text style={styles.startText}>Start Session</Text>
              {expanded ? (
                <ChevronUp size={14} color="#fff" />
              ) : (
                <ChevronDown size={14} color="#fff" />
              )}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Dropdown */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Solo option */}
          <TouchableOpacity activeOpacity={0.8} onPress={handleSolo} style={styles.dropdownRow}>
            <View style={styles.dropdownIcon}>
              <User size={16} color={colors.text} />
            </View>
            <View style={styles.dropdownContent}>
              <Text style={[styles.dropdownTitle, { color: colors.text }]}>Solo Session</Text>
              <Text style={[styles.dropdownMeta, { color: colors.textMuted }]}>Personal practice</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {hasTeamOption && (
            <>
              <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />

              {/* Team training option */}
              <TouchableOpacity activeOpacity={0.8} onPress={handleTeam} style={styles.dropdownRow}>
                <View style={[styles.dropdownIcon, { backgroundColor: 'rgba(147,197,253,0.15)' }]}>
                  <Users size={16} color="#93C5FD" />
                </View>
                <View style={styles.dropdownContent}>
                  <Text style={[styles.dropdownTitle, { color: colors.text }]} numberOfLines={1}>
                    {upcomingTraining.title}
                  </Text>
                  <Text style={[styles.dropdownMeta, { color: colors.textMuted }]}>
                    {upcomingTraining.team_name && `${upcomingTraining.team_name} · `}
                    {upcomingTraining.scheduled_at
                      ? format(new Date(upcomingTraining.scheduled_at), 'EEE h:mm a')
                      : 'Team training'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}

/** Empty state when no sessions exist */
function EmptyState({ colors }: { colors: ThemeColors }) {
  return (
    <Animated.View entering={FadeInDown.delay(150)}>
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Target size={24} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to train?</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Start your first session above</Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityHub({
  colors,
  activeSession,
  sessionTitle,
  sessionStats,
  lastSession,
  weeklyStats,
  starting,
  onOpenActiveSession,
  onStartSolo,
  nextTraining,
  canManageTraining = false,
}: ActivityHubProps) {
  // Determine what to show
  const hasActiveSession = !!activeSession;
  const hasLiveTraining = nextTraining?.status === 'ongoing';
  const hasUpcomingTraining = nextTraining && nextTraining.status !== 'ongoing';
  const showEmptyState = !lastSession && !hasActiveSession;

  // Navigation handlers
  const goToTraining = () => {
    if (!nextTraining) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If training is ongoing and user is NOT a commander, go directly to trainingLive
    // This avoids the double navigation (trainingDetail opening then redirecting)
    if (nextTraining.status === 'ongoing' && !canManageTraining) {
      router.push(`/(protected)/trainingLive?trainingId=${nextTraining.id}` as any);
    } else {
      router.push(`/(protected)/trainingDetail?id=${nextTraining.id}` as any);
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.container}>
      {/* 1. Live Team Training (highest priority) */}
      {hasLiveTraining && nextTraining && (
        <LiveTrainingCard training={nextTraining} colors={colors} onPress={goToTraining} />
      )}
      {/* 2. Active Personal Session */}
      {hasActiveSession && (
        <ActiveSessionCard
          session={activeSession}
          title={sessionTitle}
          stats={sessionStats}
          colors={colors}
          onPress={onOpenActiveSession}
        />
      )}
      {/* 4. Start Session Button (only when no active session) */}
      {!hasActiveSession && (
        <StartSessionButton
          colors={colors}
          starting={starting}
          upcomingTraining={hasUpcomingTraining ? nextTraining : undefined}
          onStartSolo={onStartSolo}
          onGoToTraining={goToTraining}
        />
      )}
     
      {/* 3. Last Session Summary */}
      {lastSession && <LastSessionCard session={lastSession} weeklyCount={weeklyStats.sessions} colors={colors} />}
      {/* 5. Empty State */}
      {showEmptyState && <EmptyState colors={colors} />}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },

  // Shared card styles
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
  },

  // Live/Active badges
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#10B98120',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#10B981',
  },

  // Team badge
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Join button
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Active session card
  activeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 14,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
  },

  // Continue row
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // Last session card
  lastSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156,163,175,0.15)',
  },
  lastSessionInfo: {
    flex: 1,
  },
  lastSessionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
 
  lastSessionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSessionDate: {
    fontSize: 11,
    marginTop: 2,
  },
  weeklyStats: {
    alignItems: 'flex-end',
  },
  weeklyValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weeklyLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },

  // Start button section
  startSection: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  startButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonFlex: {
    flex: 1,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  startText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  teamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Options toggle (always visible)
  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Dropdown
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156,163,175,0.15)',
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
