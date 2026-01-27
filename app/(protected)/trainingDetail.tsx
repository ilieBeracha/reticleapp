/**
 * Training Detail
 *
 * Dashboard showing training context, drills, and history.
 * Training is a container for engagements - it provides context but NEVER executes anything.
 *
 * LAYOUT:
 * - Header: Navigation, training hero, status indicators + commander pill (Start/End)
 * - Tab Bar: [Drills] [Results]
 * - Tab Content:
 *   - Drills tab: Active session banner, planned drills list
 *   - Results tab: Summary card, completed sessions history
 */
import { useTrainingDetail } from '@/components/training';
import { SquadInvitationBanner } from '@/components/training/SquadInvitationBanner';
import { SquadLobbyBanner } from '@/components/training/SquadLobbyBanner';
import { TrainingHero, TrainingSettingsModal } from '@/components/training/detail';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getTrainingSessionsWithStats, SessionWithDetails } from '@/services/sessionService';
import { finishTraining, startTraining } from '@/services/trainingService';
import { useTeamStore } from '@/store/teamStore';
import type { TrainingDrill } from '@/types/workspace';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  Lock,
  Play,
  Settings,
  Sparkles,
  Target,
  Trophy,
  Unlock,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 140;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Section 1: Header & Navigation
 */
function HeaderSection({
  training,
  colors,
  insets,
  completedSessions,
  canManageTraining,
  onBack,
  onOpenSettings,
  onStartTraining,
  onEndTraining,
  isUpdatingStatus,
  headerAnimatedStyle,
}: {
  training: any;
  colors: any;
  insets: any;
  completedSessions: SessionWithDetails[];
  canManageTraining: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onStartTraining: () => void;
  onEndTraining: () => void;
  isUpdatingStatus: boolean;
  headerAnimatedStyle: any;
}) {
  const uniqueShooters = new Set(completedSessions.map((s) => s.user_id)).size;

  return (
    <Animated.View
      style={[styles.heroCard, { backgroundColor: colors.card, paddingTop: insets.top + 12 }, headerAnimatedStyle]}
    >
      {/* Navigation Row */}
      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.secondary }]} onPress={onBack}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {canManageTraining && (
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.secondary }]} onPress={onOpenSettings}>
            <Settings size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Training Hero */}
      <TrainingHero training={training} colors={colors} onAutoCloseExpired={() => {}} />

      {/* Status Indicators */}
      <View style={styles.statusBar}>
        <View style={[styles.statusItem, { backgroundColor: colors.primary + '12' }]}>
          <Target size={14} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.primary }]}>{completedSessions.length} completed</Text>
        </View>
        {uniqueShooters > 0 && (
          <View style={[styles.statusItem, { backgroundColor: colors.blue + '12' }]}>
            <Users size={14} color={colors.blue} />
            <Text style={[styles.statusText, { color: colors.blue }]}>
              {uniqueShooters} shooter{uniqueShooters !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        {/* Commander Pill - Start/End Training */}
        {canManageTraining && training.status === 'planned' && (
          <TouchableOpacity
            style={[styles.commanderPill, { backgroundColor: colors.green }]}
            onPress={onStartTraining}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size={10} color="#fff" />
            ) : (
              <>
                <Play size={10} color="#fff" fill="#fff" />
                <Text style={styles.commanderPillText}>Start</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {canManageTraining && training.status === 'ongoing' && (
          <TouchableOpacity
            style={[styles.commanderPill, { backgroundColor: colors.orange }]}
            onPress={onEndTraining}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size={10} color="#fff" />
            ) : (
              <>
                <Flag size={10} color="#fff" />
                <Text style={styles.commanderPillText}>End</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Tab Bar Component
 */
function TabBar({
  activeTab,
  onTabChange,
  colors,
}: {
  activeTab: 'drills' | 'results';
  onTabChange: (tab: 'drills' | 'results') => void;
  colors: any;
}) {
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'drills' && { borderBottomColor: colors.primary }]}
        onPress={() => onTabChange('drills')}
      >
        <Target size={16} color={activeTab === 'drills' ? colors.primary : colors.textMuted} />
        <Text style={[styles.tabText, { color: activeTab === 'drills' ? colors.primary : colors.textMuted }]}>
          Drills
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'results' && { borderBottomColor: colors.primary }]}
        onPress={() => onTabChange('results')}
      >
        <Trophy size={16} color={activeTab === 'results' ? colors.primary : colors.textMuted} />
        <Text style={[styles.tabText, { color: activeTab === 'results' ? colors.primary : colors.textMuted }]}>
          Results
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Section 5: Summary Card (Metrics)
 */
function SummaryCard({
  training,
  completedSessions,
  colors,
}: {
  training: any;
  completedSessions: SessionWithDetails[];
  colors: any;
}) {
  if (completedSessions.length === 0) return null;

  const totalShots = completedSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
  const totalHits = completedSessions.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);
  const avgAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : null;
  const uniqueShooters = new Set(completedSessions.map((s) => s.user_id)).size;
  const bestGroupings = completedSessions
    .map((s) => s.stats?.best_dispersion_cm)
    .filter((v): v is number => v !== null && v !== undefined && v > 0);
  const bestGroup = bestGroupings.length > 0 ? Math.min(...bestGroupings) : null;

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.summaryAccent, { backgroundColor: colors.green + '12' }]}>
        <Trophy size={18} color={colors.green} />
      </View>
      <Text style={[styles.summaryHeadline, { color: colors.text }]}>
        {avgAccuracy !== null
          ? `${avgAccuracy}% Hit Rate`
          : `${completedSessions.length} Session${completedSessions.length !== 1 ? 's' : ''}`}
      </Text>
      <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
        {format(new Date(training.scheduled_at), 'MMM d, yyyy')}
      </Text>
      <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{totalShots || '—'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Shots</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {bestGroup !== null ? `${bestGroup.toFixed(1)}` : '—'}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {bestGroup !== null ? 'Best (cm)' : 'Group'}
          </Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{uniqueShooters || '—'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Shooters</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Section 6: Completed Sessions List (History)
 */
function CompletedSessionsList({
  completedSessions,
  colors,
}: {
  completedSessions: SessionWithDetails[];
  colors: any;
}) {
  if (completedSessions.length === 0) return null;

  // Group sessions by user
  const groupedByUser = new Map<string, { name: string; sessions: SessionWithDetails[] }>();
  completedSessions.forEach((s) => {
    const uid = s.user_id;
    if (!groupedByUser.has(uid)) {
      groupedByUser.set(uid, { name: (s as any).user_full_name || 'Unknown', sessions: [] });
    }
    groupedByUser.get(uid)!.sessions.push(s);
  });

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SESSION HISTORY</Text>

      {Array.from(groupedByUser.entries()).map(([uid, { name, sessions }]) => (
        <View key={uid} style={styles.userGroup}>
          {/* User Header */}
          <View style={styles.userHeader}>
            <View style={[styles.userAvatar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.userAvatarText, { color: colors.textMuted }]}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.userCount, { color: colors.textMuted }]}>{sessions.length}</Text>
          </View>

          {/* Sessions List */}
          <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sessions.map((s, idx) => (
              <SessionRow key={s.id} session={s} colors={colors} isLast={idx === sessions.length - 1} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Single Session Row (for completed sessions)
 */
function SessionRow({ session, colors, isLast }: { session: SessionWithDetails; colors: any; isLast: boolean }) {
  const drillName = session.drill_config?.name || session.drill_name || 'Session';
  // Check both drill_config and engagement for drill_goal (engagement is authoritative)
  const isGrouping =
    session.engagement?.drill_goal === 'grouping' || session.drill_config?.drill_goal === 'grouping';
  const engagementMode = session.engagement?.engagement_mode;
  const isSquadOrGroup = engagementMode === 'squad' || engagementMode === 'group';
  const accuracy =
    session.stats?.accuracy_pct ??
    (session.stats?.hits_total && session.stats?.shots_fired
      ? Math.round((session.stats.hits_total / session.stats.shots_fired) * 100)
      : null);
  const groupSize = session.stats?.best_dispersion_cm;
  const distance = session.drill_config?.distance_m || '';
  const shots = session.stats?.shots_fired || 0;
  const hits = session.stats?.hits_total || 0;
  const targetCount = session.stats?.target_count || 0;

  // Get participant count for squad/group sessions
  const participantCount = isSquadOrGroup
    ? ((session.stats as any)?.participant_count ??
      session.engagement?.engagement_participants?.filter((p: any) => p.state === 'joined').length ??
      0)
    : 0;

  // Build meta text based on session type
  const getMetaText = () => {
    if (isSquadOrGroup) {
      // Squad/Group: show participants + shots
      return `${participantCount} shooter${participantCount !== 1 ? 's' : ''} · ${shots} rds${hits > 0 ? ` · ${hits} hits` : ''}`;
    } else if (isGrouping) {
      // Grouping: show distance, shots, and targets scanned
      const parts = [];
      if (distance) parts.push(`${distance}m`);
      if (shots > 0) parts.push(`${shots} rds`);
      if (targetCount > 0) parts.push(`${targetCount} target${targetCount !== 1 ? 's' : ''}`);
      return parts.length > 0 ? parts.join(' · ') : (groupSize != null ? `Group: ${groupSize.toFixed(1)}cm` : 'Completed');
    } else {
      // Solo engagement: show distance + shots
      return `${distance ? `${distance}m · ` : ''}${shots > 0 ? `${shots} rds` : 'No data'}`;
    }
  };

  // Determine icon color based on session type
  const iconBg = isSquadOrGroup ? colors.primary + '15' : isGrouping ? colors.orange + '15' : colors.green + '15';
  const iconColor = isSquadOrGroup ? colors.primary : isGrouping ? colors.orange : colors.green;

  return (
    <View style={[styles.sessionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.sessionIcon, { backgroundColor: iconBg }]}>
        {isSquadOrGroup ? (
          <Users size={14} color={iconColor} />
        ) : isGrouping ? (
          <Target size={14} color={iconColor} />
        ) : (
          <CheckCircle2 size={14} color={iconColor} />
        )}
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionNameRow}>
          <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
          {isSquadOrGroup && (
            <View style={[styles.squadBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.squadBadgeText, { color: colors.primary }]}>
                {engagementMode === 'group' ? 'GROUP' : 'SQUAD'}
              </Text>
            </View>
          )}
          {isGrouping && !isSquadOrGroup && (
            <View style={[styles.squadBadge, { backgroundColor: colors.orange + '15' }]}>
              <Text style={[styles.squadBadgeText, { color: colors.orange }]}>GROUPING</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>{getMetaText()}</Text>
      </View>
      {/* Stats display - different for each session type */}
      {isSquadOrGroup ? (
        // Squad/group: show total shots only (no accuracy %)
        shots > 0 ? (
          <Text style={[styles.sessionResult, { color: colors.primary }]}>{shots}</Text>
        ) : null
      ) : isGrouping ? (
        // Grouping: show group size (primary metric)
        groupSize != null && groupSize > 0 ? (
          <Text style={[styles.sessionResult, { color: colors.orange }]}>{groupSize.toFixed(1)}cm</Text>
        ) : null
      ) : accuracy !== null ? (
        // Solo engagement: show accuracy %
        <Text style={[styles.sessionResult, { color: colors.green }]}>{accuracy}%</Text>
      ) : null}
    </View>
  );
}

/**
 * Section 4: Planned Drills List (Available Actions)
 */
function PlannedDrillsList({
  training,
  colors,
  onStartDrill,
}: {
  training: any;
  colors: any;
  onStartDrill: (drill: TrainingDrill) => void;
}) {
  if (!training.drills || training.drills.length === 0) return null;

  const canStart = training.status === 'ongoing';

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        {canStart ? 'AVAILABLE DRILLS' : 'PLANNED DRILLS'}
      </Text>

      <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {training.drills
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((drill: any, idx: number) => (
            <DrillRow
              key={drill.id}
              drill={drill}
              index={idx}
              colors={colors}
              canStart={canStart}
              isLast={idx === training.drills!.length - 1}
              onStart={() => onStartDrill(drill)}
            />
          ))}
      </View>

      {training.status === 'planned' && (
        <Text style={[styles.drillsHint, { color: colors.textMuted }]}>
          Start the training to enable drill execution
        </Text>
      )}
    </View>
  );
}

/**
 * Single Drill Row (for planned drills)
 */
function DrillRow({
  drill,
  index,
  colors,
  canStart,
  isLast,
  onStart,
}: {
  drill: any;
  index: number;
  colors: any;
  canStart: boolean;
  isLast: boolean;
  onStart: () => void;
}) {
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.blue : colors.orange;

  // Execution policy display
  const policy = (drill.execution_policy || 'locked') as 'locked' | 'guided' | 'free';
  const policyConfigs = {
    locked: { Icon: Lock, color: colors.blue, label: 'Locked' },
    guided: { Icon: Sparkles, color: colors.green, label: 'Guided' },
    free: { Icon: Unlock, color: colors.orange, label: 'Free' },
  };
  const policyConfig = policyConfigs[policy];

  return (
    <TouchableOpacity
      style={[styles.sessionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onStart}
      disabled={!canStart}
      activeOpacity={canStart ? 0.7 : 1}
    >
      <View style={[styles.sessionIcon, { backgroundColor: goalColor + '15' }]}>
        <Target size={14} color={goalColor} />
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.drillNameRow}>
          <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
            {drill.name || `Drill ${index + 1}`}
          </Text>
          <View style={[styles.policyBadge, { backgroundColor: `${policyConfig.color}15` }]}>
            <policyConfig.Icon size={10} color={policyConfig.color} />
            <Text style={[styles.policyBadgeText, { color: policyConfig.color }]}>{policyConfig.label}</Text>
          </View>
        </View>
        <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
          {isGrouping ? 'Grouping' : 'Engagement'}
          {drill.distance_m != null ? ` · ${drill.distance_m}m` : ''}
          {drill.rounds_per_shooter != null ? ` · ${drill.rounds_per_shooter} rds` : ''}
          {drill.position && ` · ${drill.position}`}
          {drill.distance_m == null && drill.rounds_per_shooter == null && ' · Soldier chooses'}
        </Text>
      </View>
      {canStart && (
        <View style={[styles.startDrillBtn, { backgroundColor: colors.green }]}>
          <Play size={12} color="#fff" fill="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Empty State - When no drills or sessions exist
 */
function EmptyState({
  training,
  completedSessions,
  colors,
}: {
  training: any;
  completedSessions: SessionWithDetails[];
  colors: any;
}) {
  // Show pending notice if drills exist but no sessions
  if (completedSessions.length === 0 && training.drills?.length > 0) {
    return (
      <View style={[styles.pendingNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.pendingText, { color: colors.textMuted }]}>
          No completed sessions yet. Soldiers can start these drills from the home screen.
        </Text>
      </View>
    );
  }

  // Show empty state if no drills AND no sessions
  if (completedSessions.length === 0 && (!training.drills || training.drills.length === 0)) {
    return (
      <View style={[styles.emptyState, { borderColor: colors.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Target size={24} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Drills Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>This training has no drills configured</Text>
      </View>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCROLL CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

function TrainingSummaryContent({
  training,
  colors,
  insets,
  completedSessions,
  canManageTraining,
  onBack,
  onOpenSettings,
  onStartTraining,
  onEndTraining,
  onStartDrill,
  isUpdatingStatus,
  currentUserId,
  onRefresh,
}: {
  training: any;
  colors: any;
  insets: any;
  completedSessions: SessionWithDetails[];
  canManageTraining: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onStartTraining: () => void;
  onEndTraining: () => void;
  onStartDrill: (drill: TrainingDrill) => void;
  isUpdatingStatus: boolean;
  currentUserId: string | null;
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'drills' | 'results'>('drills');
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT * 0.6],
          [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT]
        ),
      },
      {
        scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [1.3, 1, 0.95]),
      },
    ],
    opacity: interpolate(scrollOffset.value, [0, HEADER_HEIGHT * 0.5], [1, 0]),
  }));

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Header & Navigation                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <HeaderSection
        training={training}
        colors={colors}
        insets={insets}
        completedSessions={completedSessions}
        canManageTraining={canManageTraining}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        onStartTraining={onStartTraining}
        onEndTraining={onEndTraining}
        isUpdatingStatus={isUpdatingStatus}
        headerAnimatedStyle={headerAnimatedStyle}
      />

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} colors={colors} />

      <View style={styles.contentContainer}>
        {activeTab === 'drills' ? (
          <>
            {/* Squad/Group Session Banners */}
            {training.id && currentUserId && (
              <>
                {/* Commander: Return to your lobby */}
                <SquadLobbyBanner trainingId={training.id} userId={currentUserId} onLobbyChanged={onRefresh} />
                {/* Participants: Join/Accept/Return to lobby */}
                <SquadInvitationBanner
                  trainingId={training.id}
                  userId={currentUserId}
                  onInvitationChanged={onRefresh}
                />
              </>
            )}

            {/* Planned Drills - What you can do */}
            <PlannedDrillsList training={training} colors={colors} onStartDrill={onStartDrill} />

            {/* Empty State for drills */}
            <EmptyState training={training} completedSessions={completedSessions} colors={colors} />
          </>
        ) : (
          <>
            {/* Summary Card - Overall stats */}
            <SummaryCard training={training} completedSessions={completedSessions} colors={colors} />

            {/* Completed Sessions - History */}
            <CompletedSessionsList completedSessions={completedSessions} colors={colors} />

            {/* Empty state for results */}
            {completedSessions.length === 0 && (
              <View style={[styles.emptyResults, { borderColor: colors.border }]}>
                <Text style={[styles.emptyResultsText, { color: colors.textMuted }]}>No completed sessions yet</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Created {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
      </Text>
    </Animated.ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function TrainingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const params = useLocalSearchParams<{ id?: string }>();
  const { selectedTraining: contextTraining } = useModals();

  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<SessionWithDetails[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Training Data
  // ─────────────────────────────────────────────────────────────────────────────
  const trainingId = params.id || contextTraining?.id;
  const { training, loading, setTraining } = useTrainingDetail(trainingId, contextTraining);

  const isCreator = training?.creator?.id === session?.user?.id;
  const activeTeamMatchesTraining = !training?.team_id || training?.team_id === activeTeamId;
  const canManageTraining = isCreator || (canManageByRole && activeTeamMatchesTraining);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load Completed Sessions
  // ─────────────────────────────────────────────────────────────────────────────
  const loadCompletedSessions = useCallback(async () => {
    if (!training?.id || !isMountedRef.current) return;
    try {
      const sessions = await getTrainingSessionsWithStats(training.id);
      if (isMountedRef.current) {
        setCompletedSessions(sessions.filter((s) => s.status === 'completed'));
      }
    } catch (error) {
      console.error('[TrainingDetail] Failed to load sessions:', error);
    }
  }, [training?.id]);

  useEffect(() => {
    if (training?.id) loadCompletedSessions();
  }, [training?.id, loadCompletedSessions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(protected)/(tabs)');
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSettings(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Training Status Handlers (Commander Only)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStartTraining = useCallback(async () => {
    if (!training?.id || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await startTraining(training.id);
      if (updated) {
        setTraining((prev: any) => ({ ...prev, status: 'ongoing', started_at: updated.started_at }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('[TrainingDetail] Failed to start training:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [training?.id, isUpdatingStatus, setTraining]);

  const handleEndTraining = useCallback(async () => {
    if (!training?.id || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await finishTraining(training.id);
      if (updated) {
        setTraining((prev: any) => ({ ...prev, status: 'finished', ended_at: updated.ended_at }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to training report after finishing
        router.push({
          pathname: '/(protected)/trainingReport',
          params: { trainingId: training.id },
        });
      }
    } catch (error: any) {
      console.error('[TrainingDetail] Failed to end training:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [training?.id, isUpdatingStatus, setTraining]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Drill Start Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStartDrill = useCallback(
    (drill: TrainingDrill) => {
      if (!training?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      router.push({
        pathname: '/(protected)/startEngagement',
        params: {
          teamId: training.team_id || '',
          trainingId: training.id,
          purpose: drill.drill_goal || 'grouping',
          distance: String(drill.distance_m || 25),
          shots: String(drill.rounds_per_shooter || 5),
          position: drill.position || '',
          timeLimit: drill.time_limit_seconds ? String(drill.time_limit_seconds) : '',
          drillName: drill.name || `Drill`,
          executionPolicy: drill.execution_policy || 'locked',
          engagementMode: drill.engagement_mode || 'solo',
          returnTo: 'trainingDetail',
          returnId: training.id,
        },
      });
    },
    [training?.id, training?.team_id]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Not Found State
  // ─────────────────────────────────────────────────────────────────────────────
  if (!training) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <AlertCircle size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Training Not Found</Text>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>
            This training may have been deleted or you don't have access.
          </Text>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TrainingSummaryContent
        training={training}
        colors={colors}
        insets={insets}
        completedSessions={completedSessions}
        canManageTraining={canManageTraining}
        onBack={handleBack}
        onOpenSettings={handleOpenSettings}
        onStartTraining={handleStartTraining}
        onEndTraining={handleEndTraining}
        onStartDrill={handleStartDrill}
        isUpdatingStatus={isUpdatingStatus}
        currentUserId={session?.user?.id || null}
        onRefresh={loadCompletedSessions}
      />

      <TrainingSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        training={training}
        onUpdate={setTraining}
        colors={colors}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Container
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  contentContainer: { paddingHorizontal: 16, gap: 16, marginTop: 16 },

  // Loading & Error States
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  notFoundTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  notFoundText: { fontSize: 14, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Commander Pill (in header)
  commanderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  commanderPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary Card
  summaryCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  summaryAccent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryHeadline: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  summarySubtitle: { fontSize: 13, marginBottom: 4 },
  metricsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricDivider: { width: 1, height: 28, alignSelf: 'center' },

  // Sections
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  // User Groups (for sessions)
  userGroup: { gap: 8 },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 11, fontWeight: '700' },
  userName: { flex: 1, fontSize: 13, fontWeight: '600' },
  userCount: { fontSize: 12, fontWeight: '500' },

  // Sessions List
  sessionsList: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1, gap: 4 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  sessionMeta: { fontSize: 12 },
  sessionResult: { fontSize: 14, fontWeight: '700' },

  // Badges
  squadBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  squadBadgeText: { fontSize: 10, fontWeight: '600' },
  drillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  policyBadgeText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },

  // Start Drill Button
  startDrillBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillsHint: { fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  // Empty States
  pendingNotice: { padding: 16, borderRadius: 14, borderWidth: 1 },
  pendingText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },

  // Empty Results (for Results tab)
  emptyResults: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 14,
  },

  // Footer
  footer: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    opacity: 0.5,
  },
});
