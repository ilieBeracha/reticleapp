/**
 * ACTIVITY HUB
 * Event-focused unified section:
 * - Active session (personal)
 * - Live/upcoming team training
 * - Last session summary
 * - Start session
 */
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
  Users
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import type { SessionStats, SessionWithDetails, ThemeColors, WeeklyStats } from './types';

// Gradient colors (matching TacticalTargetFlow)
const GRADIENT_COLORS = ['rgba(255,255,255,0.95)', 'rgba(147,197,253,0.85)', 'rgba(156,163,175,0.9)'] as const;

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
  // Session
  activeSession: SessionWithDetails | undefined;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  lastSession: SessionWithDetails | undefined;
  weeklyStats: WeeklyStats;
  // Actions
  starting: boolean;
  onStart: () => void;
  // Training
  nextTraining?: UpcomingTraining;
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
  onStart,
  nextTraining,
}: ActivityHubProps) {
  const [expanded, setExpanded] = useState(false);
  
  const hasActiveSession = !!activeSession;
  const hasLiveTraining = nextTraining?.status === 'ongoing';
  const hasUpcomingTraining = nextTraining && nextTraining.status !== 'ongoing';

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const handleStartSolo = () => {
    setExpanded(false);
    onStart();
  };

  const handleGoToTraining = () => {
    if (!nextTraining) return;
    setExpanded(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/trainingDetail?id=${nextTraining.id}` as any);
  };

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.container}>
      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: LIVE TRAINING (Team) - Highest Priority
      ══════════════════════════════════════════════════════════════════════ */}
      {hasLiveTraining && nextTraining && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.liveTrainingCard, { backgroundColor: colors.card }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(protected)/trainingDetail?id=${nextTraining.id}` as any);
          }}
        >
          <View style={styles.liveTrainingHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDotRed} />
              <Text style={styles.liveTextRed}>LIVE TRAINING</Text>
            </View>
            {nextTraining.team_name && (
              <View style={styles.teamBadge}>
                <Users size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.teamBadgeText}>{nextTraining.team_name}</Text>
              </View>
            )}
          </View>
          <Text style={styles.liveTrainingTitle}>{nextTraining.title}</Text>
          <View style={styles.liveTrainingFooter}>
            <Text style={styles.liveTrainingMeta}>
              {nextTraining.drill_count || 0} drills
            </Text>
            <View style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join</Text>
              <ArrowRight size={14} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: ACTIVE PERSONAL SESSION
      ══════════════════════════════════════════════════════════════════════ */}
      {hasActiveSession && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.activeSessionCard}
          onPress={onStart}
        >
          <View style={styles.activeHeader}>
            <View style={styles.liveBadgeGreen}>
              <View style={styles.liveDotGreen} />
              <Text style={styles.liveTextGreen}>ACTIVE SESSION</Text>
            </View>
            {activeSession.started_at && (
              <Text style={styles.elapsedText}>
                {formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: false })}
              </Text>
            )}
          </View>
          <Text style={[styles.activeTitle, { color: colors.text }]}>{sessionTitle}</Text>
          
          <View style={styles.activeStats}>
            <View style={styles.activeStat}>
              <Target size={16} color="#10B981" />
              <Text style={[styles.activeStatValue, { color: colors.text }]}>
                {sessionStats?.targetCount ?? 0}
              </Text>
            </View>
            <View style={styles.activeStat}>
              <Crosshair size={16} color="#10B981" />
              <Text style={[styles.activeStatValue, { color: colors.text }]}>
                {sessionStats?.totalShotsFired ?? 0}
              </Text>
            </View>
            <View style={styles.activeStat}>
              <Text style={[styles.activeStatValue, { color: colors.text }]}>
                {sessionStats?.totalHits ?? 0}
              </Text>
              <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>hits</Text>
            </View>
          </View>

          <View style={styles.continueRow}>
            <Play size={14} color="#10B981" fill="#10B981" />
            <Text style={styles.continueText}>Continue</Text>
            <ArrowRight size={14} color="#10B981" />
          </View>
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: START SESSION BUTTON (with collapsible training option)
      ══════════════════════════════════════════════════════════════════════ */}
      {!hasActiveSession && (
        <View style={styles.startSection}>
          {/* Main Button Row */}
          <View style={styles.startButtonRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={starting}
              onPress={hasUpcomingTraining ? handleStartSolo : onStart}
              style={[styles.startButtonWrapper, hasUpcomingTraining && styles.startButtonWithIcon]}
            >
              <LinearGradient
                colors={starting ? ['#6B7280', '#9CA3AF'] : [...GRADIENT_COLORS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                {starting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Play size={18} color="#000" fill="#000" />
                    <Text style={styles.startLabel}>Start Session</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Team Training Toggle Icon */}
            {hasUpcomingTraining && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleToggleExpand}
                style={[styles.teamToggleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Users size={18} color={colors.text} />
                {expanded ? (
                  <ChevronUp size={14} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={14} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Expanded Options */}
          {expanded && hasUpcomingTraining && (
            <Animated.View 
              entering={FadeIn.duration(200)} 
              exiting={FadeOut.duration(150)}
              style={[styles.expandedOptions, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Solo Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleStartSolo}
                style={styles.optionRow}
              >
                <View style={[styles.optionIcon, { backgroundColor: 'rgba(156,163,175,0.15)' }]}>
                  <User size={16} color={colors.text} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Solo Session</Text>
                  <Text style={[styles.optionMeta, { color: colors.textMuted }]}>Personal practice</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />

              {/* Team Training Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGoToTraining}
                style={styles.optionRow}
              >
                <View style={[styles.optionIcon, { backgroundColor: 'rgba(147,197,253,0.15)' }]}>
                  <Users size={16} color="#93C5FD" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]} numberOfLines={1}>
                    {nextTraining?.title}
                  </Text>
                  <Text style={[styles.optionMeta, { color: colors.textMuted }]}>
                    {nextTraining?.team_name && `${nextTraining.team_name} · `}
                    {nextTraining?.scheduled_at 
                      ? format(new Date(nextTraining.scheduled_at), 'EEE h:mm a')
                      : 'Team training'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: LAST SESSION EVENT
      ══════════════════════════════════════════════════════════════════════ */}
      {lastSession && (
        <Animated.View entering={FadeInDown.delay(150)}>
          <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.eventLeft}>
              <View style={[styles.eventIconWrap, { backgroundColor: 'rgba(156,163,175,0.15)' }]}>
                <Clock size={16} color={colors.textMuted} />
              </View>
              <View style={styles.eventContent}>
                <Text style={[styles.eventLabel, { color: colors.textMuted }]}>Last Session</Text>
                <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                  {lastSession.training_title || lastSession.drill_name || 'Freestyle'}
                </Text>
                <Text style={[styles.eventMeta, { color: colors.textMuted }]}>
                  {format(new Date(lastSession.created_at), 'EEE, MMM d · h:mm a')}
                </Text>
              </View>
            </View>
            {/* Mini Stats */}
            <View style={styles.miniStats}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.text }]}>
                  {weeklyStats.sessions}
                </Text>
                <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>this week</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Empty State */}
      {!lastSession && !hasActiveSession && (
        <Animated.View entering={FadeInDown.delay(150)}>
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Target size={24} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to train?</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Start your first session above
            </Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },

  // Live Training Card (Team)
  liveTrainingCard: {

    borderRadius: 14,
    padding: 16,
  },
  liveTrainingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveTextRed: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#fff',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  liveTrainingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  liveTrainingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveTrainingMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Active Session Card
  activeSessionCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 14,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#10B981',
  },
  elapsedText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  activeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
  },
  activeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeStatValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activeStatLabel: {
    fontSize: 11,
  },
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

  // Start Section (with expandable)
  startSection: {
    gap: 8,
  },
  startButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  startButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonWithIcon: {
    flex: 1,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  startLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  teamToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Expanded Options
  expandedOptions: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  optionDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },

  // Event Card (generic reusable)
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  eventIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  // Mini Stats (inside event card)
  miniStats: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  miniStat: {
    alignItems: 'flex-end',
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniStatLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },

  // Empty State
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

