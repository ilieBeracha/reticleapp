/**
 * Training Detail
 * 
 * Clean, focused design with clear visual hierarchy.
 */
import {
  useTrainingActions,
  useTrainingDetail,
} from '@/components/training-detail';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getTrainingSessionsWithStats, SessionWithDetails } from '@/services/sessionService';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MoreHorizontal,
  Play,
  RefreshCw,
  Target,
  Users,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// DRILL ITEM - Minimal, action-focused
// ═══════════════════════════════════════════════════════════════════════════

function DrillItem({
  drill,
  index,
  colors,
  isCompleted,
  canStart,
  onStart,
  isStarting,
}: {
  drill: any;
  index: number;
  colors: ReturnType<typeof useColors>;
  isCompleted: boolean;
  canStart: boolean;
  onStart: () => void;
  isStarting: boolean;
}) {
  const goalColor = drill.drill_goal === 'grouping' ? '#10B981' : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.drillCard,
        { backgroundColor: colors.card },
        isCompleted && styles.drillCardCompleted,
      ]}
      onPress={() => {
        if (canStart) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStart();
        }
      }}
      disabled={!canStart || isStarting}
      activeOpacity={canStart ? 0.7 : 1}
    >
      {/* Left accent */}
      <View style={[styles.drillAccent, { backgroundColor: isCompleted ? colors.green : goalColor }]} />

      {/* Content */}
      <View style={styles.drillContent}>
        <View style={styles.drillTop}>
          <Text style={[styles.drillName, { color: isCompleted ? colors.textMuted : colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          {isCompleted && (
            <View style={[styles.drillDoneBadge, { backgroundColor: colors.green }]}>
              <Check size={10} color="#fff" strokeWidth={3} />
            </View>
          )}
        </View>
        <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
          {drill.distance_m}m • {drill.rounds_per_shooter} shots
          {drill.time_limit_seconds ? ` • ${drill.time_limit_seconds}s` : ''}
        </Text>
      </View>

      {/* Action */}
      {canStart && !isCompleted && (
        <View style={[styles.drillPlayBtn, { backgroundColor: goalColor }]}>
          {isStarting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Play size={14} color="#fff" fill="#fff" />
          )}
        </View>
      )}
      {!canStart && !isCompleted && (
        <ChevronRight size={18} color={colors.border} />
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function TrainingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const params = useLocalSearchParams<{ id?: string; startDrillId?: string }>();
  const trainingIdParam = params.id;
  const startDrillIdParam = params.startDrillId;
  const { selectedTraining: contextTraining, getOnTrainingUpdated } = useModals();

  const trainingId = trainingIdParam || contextTraining?.id;
  const { training, drillProgress, loading, setTraining } = useTrainingDetail(trainingId, contextTraining);
  const handledAutoStartRef = useRef<string | null>(null);
  
  const isCreator = training?.creator?.id === session?.user?.id;
  const canManageTraining = canManageByRole || isCreator;

  const {
    actionLoading,
    startingDrillId,
    handleStartTraining,
    handleFinishTraining,
    handleCancelTraining,
    handleStartDrill,
  } = useTrainingActions({
    training,
    setTraining,
    onTrainingUpdated: getOnTrainingUpdated() ?? undefined,
  });

  // Team progress (commander view)
  const [teamSessions, setTeamSessions] = useState<SessionWithDetails[]>([]);
  const [loadingTeamProgress, setLoadingTeamProgress] = useState(false);

  // Determine if team progress section should be shown (commander + ongoing training)
  const showTeamProgress = !!training?.id && canManageTraining && training?.status === 'ongoing';

  // Load team progress data for commanders
  const loadTeamProgress = useCallback(async () => {
    if (!training?.id || !canManageTraining) return;

    setLoadingTeamProgress(true);
    try {
      const sessions = await getTrainingSessionsWithStats(training.id);
      setTeamSessions(sessions);
    } catch (error) {
      console.error('[TrainingDetail] Failed to load team progress:', error);
    } finally {
      setLoadingTeamProgress(false);
    }
  }, [training?.id, canManageTraining]);

  // Auto-load team progress when commander views ongoing training
  useEffect(() => {
    if (showTeamProgress) {
      loadTeamProgress();
    }
  }, [showTeamProgress, loadTeamProgress]);

  // Group team sessions by user for commander view
  const groupedTeamProgress = useMemo(() => {
    if (!teamSessions.length) return [];

    // Group sessions by user_id
    const userMap = new Map<string, {
      userId: string;
      userName: string;
      sessions: SessionWithDetails[];
      totalShots: number;
      totalHits: number;
      accuracy: number;
      isActive: boolean;
      drillsCompleted: number;
    }>();

    teamSessions.forEach((s) => {
      const odId = s.user_id;
      const userName = s.user_full_name || 'Unknown';

      if (!userMap.has(odId)) {
        userMap.set(odId, {
          userId: odId,
          userName,
          sessions: [],
          totalShots: 0,
          totalHits: 0,
          accuracy: 0,
          isActive: false,
          drillsCompleted: 0,
        });
      }

      const entry = userMap.get(odId)!;
      entry.sessions.push(s);

      // Aggregate stats
      if (s.stats) {
        entry.totalShots += s.stats.shots_fired ?? 0;
        entry.totalHits += s.stats.hits_total ?? 0;
      }

      // Check if user has an active session
      if (s.status === 'active') {
        entry.isActive = true;
      }

      // Count completed drills
      if (s.status === 'completed') {
        entry.drillsCompleted++;
      }
    });

    // Calculate accuracy for each user
    userMap.forEach((entry) => {
      if (entry.totalShots > 0) {
        entry.accuracy = Math.round((entry.totalHits / entry.totalShots) * 100);
      }
    });

    // Convert to array and sort by name
    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [teamSessions]);

  // If we navigated here with a specific drill intent (e.g. from Create Session),
  // auto-start that drill once the training loads.
  useEffect(() => {
    const startDrillId = Array.isArray(startDrillIdParam) ? startDrillIdParam[0] : startDrillIdParam;
    if (!startDrillId) return;
    if (!training) return;

    // Only handle once per navigation param value.
    if (handledAutoStartRef.current === startDrillId) return;
    handledAutoStartRef.current = startDrillId;

    const drill = (training.drills || []).find((d) => d.id === startDrillId);

    // If drill isn't present (stale param), just clear it.
    if (!drill) {
      router.replace(`/(protected)/trainingDetail?id=${training.id}`);
      return;
    }

    // Respect the same rule as the UI: drills can be started only when training is ongoing.
    if (training.status !== 'ongoing') {
      Alert.alert('Training not started', 'Start the training first to begin a drill session.');
      router.replace(`/(protected)/trainingDetail?id=${training.id}`);
      return;
    }

    // Kick off drill session creation + navigation (handled in useTrainingActions).
    handleStartDrill(drill);
    // We don't need to clear params here because we navigate away to the session screen.
  }, [startDrillIdParam, training, handleStartDrill]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading || !training) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const drills = training.drills || [];
  const completedCount = drillProgress.filter((p) => p.completed).length;
  const progressPercent = drills.length > 0 ? (completedCount / drills.length) * 100 : 0;
  const isOngoing = training.status === 'ongoing';
  const isPlanned = training.status === 'planned';
  const isFinished = training.status === 'finished';

  const scheduledDate = new Date(training.scheduled_at);
  const dateStr = format(scheduledDate, 'EEE, MMM d');
  const timeStr = training.manual_start ? 'Manual start' : format(scheduledDate, 'h:mm a');

  const statusColor = isOngoing ? colors.green : isFinished ? colors.primary : colors.orange;
  const statusLabel = isOngoing ? 'Live' : isFinished ? 'Done' : 'Scheduled';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Minimal Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {canManageTraining && (isPlanned || isOngoing) && (
          <TouchableOpacity
            style={[styles.moreBtn, { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleCancelTraining();
            }}
            activeOpacity={0.7}
          >
            <MoreHorizontal size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.heroSection}>
          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}15` }]}>
            {isOngoing && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{training.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {dateStr} • {timeStr}
            </Text>
            {training.team && (
              <>
                <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                <Users size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{training.team.name}</Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* Inline Progress */}
        {drills.length > 0 && (
          <Animated.View entering={FadeIn.delay(100).duration(400)}>
            <View style={[styles.progressRow, { backgroundColor: colors.card }]}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Progress</Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>
                  {completedCount}/{drills.length}
                </Text>
              </View>
              <View style={[styles.progressBarWrap, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent === 100 ? colors.green : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressPercent, { color: progressPercent === 100 ? colors.green : colors.text }]}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Action Banner - contextual */}
        {isPlanned && !canManageTraining && (
          <View style={[styles.actionBanner, { backgroundColor: colors.card }]}>
            <Zap size={16} color={colors.orange} />
            <Text style={[styles.actionBannerText, { color: colors.textMuted }]}>
              Waiting for commander to start
            </Text>
          </View>
        )}

        {isOngoing && drills.length > 0 && completedCount < drills.length && (
          <View style={[styles.actionBanner, { backgroundColor: `${colors.green}10` }]}>
            <Zap size={16} color={colors.green} />
            <Text style={[styles.actionBannerText, { color: colors.green }]}>
              Tap a drill to start shooting
            </Text>
          </View>
        )}

        {/* Drills Section */}
        <View style={styles.drillsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Drills</Text>
            <View style={[styles.sectionBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.sectionBadgeText, { color: colors.textMuted }]}>{drills.length}</Text>
            </View>
          </View>

          {drills.length > 0 ? (
            <View style={styles.drillsList}>
              {drills.map((drill, index) => {
                const progress = drillProgress.find((p) => p.drillId === drill.id);
                const isCompleted = progress?.completed || false;
                return (
                  <DrillItem
                    key={drill.id}
                    drill={drill}
                    index={index}
                    colors={colors}
                    isCompleted={isCompleted}
                    canStart={isOngoing && !isCompleted}
                    onStart={() => handleStartDrill(drill)}
                    isStarting={startingDrillId === drill.id}
                  />
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Target size={24} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No drills</Text>
            </View>
          )}
        </View>

        {/* Team Progress Section (Commander View) - Compact */}
        {showTeamProgress && (
          <Animated.View entering={FadeIn.delay(150).duration(400)}>
            <View style={styles.teamSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Team</Text>
                <TouchableOpacity
                  style={[styles.refreshBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    loadTeamProgress();
                  }}
                  disabled={loadingTeamProgress}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {loadingTeamProgress ? (
                <View style={[styles.teamLoading, { backgroundColor: colors.card }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : groupedTeamProgress.length === 0 ? (
                <View style={[styles.teamEmpty, { backgroundColor: colors.card }]}>
                  <Text style={[styles.teamEmptyText, { color: colors.textMuted }]}>
                    No one started yet
                  </Text>
                </View>
              ) : (
                <View style={styles.teamList}>
                  {groupedTeamProgress.map((member) => {
                    const initials = member.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                    const avatarColor = avatarColors[member.userName.length % avatarColors.length];

                    return (
                      <View key={member.userId} style={[styles.teamMember, { backgroundColor: colors.card }]}>
                        <View style={[styles.memberAvatar, { backgroundColor: avatarColor }]}>
                          <Text style={styles.memberInitials}>{initials}</Text>
                          {member.isActive && <View style={styles.memberActive} />}
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                            {member.userName.split(' ')[0]}
                          </Text>
                          <Text style={[styles.memberStats, { color: colors.textMuted }]}>
                            {member.drillsCompleted}/{drills.length} • {member.accuracy}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Created {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action - Simple */}
      {canManageTraining && (isPlanned || isOngoing) && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {isPlanned && (
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: colors.green }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleStartTraining();
              }}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Play size={18} color="#fff" fill="#fff" />
                  <Text style={styles.mainBtnText}>Start Training</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isOngoing && (
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                handleFinishTraining();
              }}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.mainBtnText}>Finish Training</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES - Clean, minimal
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header - Minimal
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Section
  heroSection: {
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },

  // Progress Row - Inline
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 12,
  },
  progressInfo: {
    alignItems: 'flex-start',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressBarWrap: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'right',
  },

  // Action Banner
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Section
  drillsSection: {
    marginBottom: 24,
  },
  teamSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  drillsList: {
    gap: 8,
  },

  // Drill Card - Minimal with accent
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    borderRadius: 14,
    gap: 0,
    overflow: 'hidden',
  },
  drillCardCompleted: {
    opacity: 0.6,
  },
  drillAccent: {
    width: 4,
    height: '100%',
    marginRight: 14,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  drillContent: {
    flex: 1,
  },
  drillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  drillDoneBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillMeta: {
    fontSize: 13,
  },
  drillPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 14,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Team Progress - Compact
  teamLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 14,
  },
  teamEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 14,
  },
  teamEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  teamList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  memberActive: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {},
  memberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberStats: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
  },

  // Bottom Bar - Simple
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
