/**
 * Training Detail
 *
 * READ-ONLY dashboard showing training context and history.
 * Training is a container for completed engagements - it NEVER executes anything.
 *
 * Shows:
 * - Training header (name, time, team, status)
 * - Summary metrics (completed engagements, participants)
 * - Historical list of completed sessions (read-only)
 */
import { useTrainingDetail } from '@/components/training';
import { TrainingHero, TrainingSettingsModal } from '@/components/training/detail';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getTrainingSessionsWithStats, SessionWithDetails } from '@/services/sessionService';
import { startTraining, finishTraining } from '@/services/trainingService';
import { useTeamStore } from '@/store/teamStore';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type { TrainingDrill } from '@/types/workspace';
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
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 140;

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL CONTENT - Read-only training summary
// ═══════════════════════════════════════════════════════════════════════════

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
}) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT * 0.6], [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT]) },
      { scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [1.3, 1, 0.95]) },
    ],
    opacity: interpolate(scrollOffset.value, [0, HEADER_HEIGHT * 0.5], [1, 0]),
  }));

  // Compute summary metrics from completed sessions
  const totalShots = completedSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
  const totalHits = completedSessions.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);
  const avgAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : null;
  const uniqueShooters = new Set(completedSessions.map((s) => s.user_id)).size;
  const bestGroupings = completedSessions
    .map((s) => s.stats?.best_dispersion_cm)
    .filter((v): v is number => v !== null && v !== undefined && v > 0);
  const bestGroup = bestGroupings.length > 0 ? Math.min(...bestGroupings) : null;

  // Group completed sessions by user for display
  const groupedByUser = new Map<string, { name: string; sessions: SessionWithDetails[] }>();
  completedSessions.forEach((s) => {
    const uid = s.user_id;
    if (!groupedByUser.has(uid)) {
      groupedByUser.set(uid, { name: (s as any).user_full_name || 'Unknown', sessions: [] });
    }
    groupedByUser.get(uid)!.sessions.push(s);
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      {/* Header */}
      <Animated.View style={[styles.heroCard, { backgroundColor: colors.card, paddingTop: insets.top + 12 }, headerAnimatedStyle]}>
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

        {/* TrainingHero shows status - onAutoCloseExpired is no-op since Training doesn't execute */}
        <TrainingHero training={training} colors={colors} onAutoCloseExpired={() => {}} />

        {/* Status indicators */}
        <View style={styles.statusBar}>
          <View style={[styles.statusItem, { backgroundColor: colors.primary + '12' }]}>
            <Target size={14} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              {completedSessions.length} completed
            </Text>
          </View>
          {uniqueShooters > 0 && (
            <View style={[styles.statusItem, { backgroundColor: colors.blue + '12' }]}>
              <Users size={14} color={colors.blue} />
              <Text style={[styles.statusText, { color: colors.blue }]}>
                {uniqueShooters} shooter{uniqueShooters !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Commander Controls - Administrative status management */}
        {canManageTraining && (
          <View style={styles.commanderControls}>
            {training.status === 'planned' && (
              <TouchableOpacity
                style={[styles.commanderBtn, { backgroundColor: colors.green }]}
                onPress={onStartTraining}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Play size={16} color="#fff" fill="#fff" />
                    <Text style={styles.commanderBtnText}>Start Training</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {training.status === 'ongoing' && (
              <TouchableOpacity
                style={[styles.commanderBtn, { backgroundColor: colors.orange }]}
                onPress={onEndTraining}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Flag size={16} color="#fff" />
                    <Text style={styles.commanderBtnText}>End Training</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Summary Card - Only show if there are completed sessions */}
        {completedSessions.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryAccent, { backgroundColor: colors.green + '12' }]}>
              <Trophy size={18} color={colors.green} />
            </View>
            <Text style={[styles.summaryHeadline, { color: colors.text }]}>
              {avgAccuracy !== null ? `${avgAccuracy}% Hit Rate` : `${completedSessions.length} Session${completedSessions.length !== 1 ? 's' : ''}`}
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
        )}

        {/* Historical Sessions - READ ONLY */}
        {completedSessions.length > 0 ? (
          <View style={styles.historySection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>COMPLETED SESSIONS</Text>
            {Array.from(groupedByUser.entries()).map(([uid, { name, sessions }]) => (
              <View key={uid} style={styles.userGroup}>
                <View style={styles.userHeader}>
                  <View style={[styles.userAvatar, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.userAvatarText, { color: colors.textMuted }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
                  <Text style={[styles.userCount, { color: colors.textMuted }]}>{sessions.length}</Text>
                </View>
                <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {sessions.map((s, idx) => {
                    const drillName = s.drill_config?.name || s.drill_name || 'Session';
                    const isGrouping = s.drill_config?.drill_goal === 'grouping';
                    const isSquad = s.engagement?.engagement_mode === 'squad';
                    const accuracy = s.stats?.accuracy_pct ?? (s.stats?.hits_total && s.stats?.shots_fired ? Math.round((s.stats.hits_total / s.stats.shots_fired) * 100) : null);
                    const groupSize = s.stats?.best_dispersion_cm;
                    const distance = s.drill_config?.distance_m || '';
                    const shots = s.stats?.shots_fired || 0;

                    return (
                      <View
                        key={s.id}
                        style={[
                          styles.sessionRow,
                          idx < sessions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={[styles.sessionIcon, { backgroundColor: colors.green + '15' }]}>
                          <CheckCircle2 size={14} color={colors.green} />
                        </View>
                        <View style={styles.sessionInfo}>
                          <View style={styles.sessionNameRow}>
                            <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
                              {drillName}
                            </Text>
                            {isSquad && (
                              <View style={[styles.squadBadge, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.squadBadgeText, { color: colors.primary }]}>SQUAD</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
                            {distance ? `${distance}m · ` : ''}{shots > 0 ? `${shots} rds` : 'No data'}
                          </Text>
                        </View>
                        {isGrouping && groupSize != null && groupSize > 0 ? (
                          <Text style={[styles.sessionResult, { color: colors.green }]}>
                            {groupSize.toFixed(1)}cm
                          </Text>
                        ) : accuracy !== null ? (
                          <Text style={[styles.sessionResult, { color: colors.green }]}>{accuracy}%</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : training.drills && training.drills.length > 0 ? (
          <View style={[styles.pendingNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.pendingText, { color: colors.textMuted }]}>
              No completed sessions yet. Soldiers can start these drills from the home screen.
            </Text>
          </View>
        ) : null}

        {/* Planned Drills - Show what's configured for this training */}
        {training.drills && training.drills.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {training.status === 'ongoing' ? 'DRILLS - TAP TO START' : 'PLANNED DRILLS'}
            </Text>
            <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {training.drills
                .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
                .map((drill: any, idx: number) => {
                  const isGrouping = drill.drill_goal === 'grouping';
                  const goalColor = isGrouping ? colors.blue : colors.orange;
                  const canStart = training.status === 'ongoing';

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
                      key={drill.id}
                      style={[
                        styles.sessionRow,
                        idx < training.drills!.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                      onPress={() => canStart && onStartDrill(drill)}
                      disabled={!canStart}
                      activeOpacity={canStart ? 0.7 : 1}
                    >
                      <View style={[styles.sessionIcon, { backgroundColor: goalColor + '15' }]}>
                        <Target size={14} color={goalColor} />
                      </View>
                      <View style={styles.sessionInfo}>
                        <View style={styles.drillNameRow}>
                          <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
                            {drill.name || `Drill ${idx + 1}`}
                          </Text>
                          <View style={[styles.policyBadge, { backgroundColor: `${policyConfig.color}15` }]}>
                            <policyConfig.Icon size={10} color={policyConfig.color} />
                            <Text style={[styles.policyBadgeText, { color: policyConfig.color }]}>
                              {policyConfig.label}
                            </Text>
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
                })}
            </View>
            {training.status === 'planned' && (
              <Text style={[styles.drillsHint, { color: colors.textMuted }]}>
                Start the training to enable drill execution
              </Text>
            )}
          </View>
        )}

        {/* Empty state - Only show if no drills AND no sessions */}
        {completedSessions.length === 0 && (!training.drills || training.drills.length === 0) && (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Target size={24} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Drills Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              This training has no drills configured
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Created {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
      </Text>
    </Animated.ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function TrainingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const params = useLocalSearchParams<{ id?: string }>();
  const { selectedTraining: contextTraining, getOnTrainingUpdated } = useModals();

  // State
  const [showSettings, setShowSettings] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<SessionWithDetails[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Training data
  const trainingId = params.id || contextTraining?.id;
  const { training, loading, setTraining, refetch } = useTrainingDetail(trainingId, contextTraining);

  const isCreator = training?.creator?.id === session?.user?.id;
  const activeTeamMatchesTraining = !training?.team_id || training?.team_id === activeTeamId;
  const canManageTraining = isCreator || (canManageByRole && activeTeamMatchesTraining);

  // Load completed sessions
  const loadCompletedSessions = useCallback(async () => {
    if (!training?.id || !isMountedRef.current) return;
    setLoadingSessions(true);
    try {
      const sessions = await getTrainingSessionsWithStats(training.id);
      if (isMountedRef.current) {
        // Only show completed sessions - this is a history view
        setCompletedSessions(sessions.filter((s) => s.status === 'completed'));
      }
    } catch (error) {
      console.error('[TrainingDetail] Failed to load sessions:', error);
    } finally {
      if (isMountedRef.current) setLoadingSessions(false);
    }
  }, [training?.id]);

  useEffect(() => {
    if (training?.id) loadCompletedSessions();
  }, [training?.id, loadCompletedSessions]);

  // Navigation
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

  // Administrative status controls
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
      }
    } catch (error: any) {
      console.error('[TrainingDetail] Failed to end training:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [training?.id, isUpdatingStatus, setTraining]);

  // Navigate to startEngagement with drill config pre-filled
  // ExecutionPolicy determines how strict the configuration is:
  // - 'locked': Must execute exactly as defined (default for training drills)
  // - 'guided': Defaults pre-filled, user may change
  // - 'free': No defaults, full freedom
  const handleStartDrill = useCallback((drill: TrainingDrill) => {
    if (!training?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Training drills default to 'locked' unless drill specifies otherwise
    const executionPolicy = drill.execution_policy || 'locked';
    // Engagement mode: solo or squad (grouping is always solo)
    const engagementMode = drill.engagement_mode || 'solo';
    
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
        executionPolicy, // How strict is the configuration
        engagementMode,  // Solo or squad
        returnTo: 'trainingDetail',
        returnId: training.id,
      },
    });
  }, [training?.id, training?.team_id]);

  // Loading state
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

  // Not found state
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
      />

      {/* Settings Modal - Only administrative, no execution */}
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

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  heroCard: {
    minHeight: HEADER_HEIGHT,
    marginBottom: 24,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  navBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  statusBar: { flexDirection: 'row', gap: 8 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  commanderControls: { marginTop: 16 },
  commanderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  commanderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  contentContainer: { gap: 20 },
  summaryCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  summaryAccent: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryHeadline: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  summarySubtitle: { fontSize: 13, marginBottom: 4 },
  metricsRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  metricDivider: { width: 1, height: 28, alignSelf: 'center' },
  historySection: { gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  userGroup: { gap: 6 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  userAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 11, fontWeight: '700' },
  userName: { flex: 1, fontSize: 13, fontWeight: '600' },
  userCount: { fontSize: 12, fontWeight: '500' },
  sessionsList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sessionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1, gap: 4 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  sessionMeta: { fontSize: 12 },
  sessionResult: { fontSize: 14, fontWeight: '700' },
  squadBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  squadBadgeText: { fontSize: 10, fontWeight: '600' },
  startDrillBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  drillsHint: { fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  drillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  policyBadgeText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  pendingNotice: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  pendingText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', gap: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  footer: { fontSize: 12, textAlign: 'center', paddingVertical: 32, opacity: 0.5 },
  notFoundContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 100 },
  notFoundTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  notFoundText: { fontSize: 14, textAlign: 'center' },
});
