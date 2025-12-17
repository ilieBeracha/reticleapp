/**
 * Training Detail
 * 
 * Visual, immersive design with 3D effects and bold typography.
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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Play,
  Target,
  Users,
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
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// DRILL ITEM
// ═══════════════════════════════════════════════════════════════════════════

function DrillItem({
  drill,
  index,
  colors,
  isCompleted,
  canStart,
  onStart,
  isStarting,
  isLast,
}: {
  drill: any;
  index: number;
  colors: ReturnType<typeof useColors>;
  isCompleted: boolean;
  canStart: boolean;
  onStart: () => void;
  isStarting: boolean;
  isLast: boolean;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(200 + index * 80).springify()}>
      <TouchableOpacity
        style={[
          styles.drillCard,
          { 
            backgroundColor: colors.card, 
            borderColor: isCompleted ? colors.green : colors.border,
          },
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
        {/* Number/Check */}
        <View
          style={[
            styles.drillNumber,
            {
              backgroundColor: isCompleted ? colors.green : colors.secondary,
            },
          ]}
        >
          {isCompleted ? (
            <Check size={14} color="#fff" strokeWidth={3} />
          ) : (
            <Text style={[styles.drillNumberText, { color: colors.textMuted }]}>{index + 1}</Text>
          )}
        </View>

        {/* Content */}
        <View style={[styles.drillContent, isCompleted && { opacity: 0.5 }]}>
          <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
            {drill.distance_m}m · {drill.rounds_per_shooter} rounds
            {drill.time_limit_seconds ? ` · ${drill.time_limit_seconds}s` : ''}
          </Text>
        </View>

        {/* Action */}
        {canStart && !isCompleted && (
          <View style={[styles.drillPlayBtn, { backgroundColor: colors.primary }]}>
            {isStarting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Play size={16} color="#fff" fill="#fff" />
            )}
          </View>
        )}
        {isCompleted && (
          <Text style={[styles.drillDoneText, { color: colors.green }]}>Done</Text>
        )}
        {!canStart && !isCompleted && (
          <ChevronRight size={20} color={colors.border} />
        )}
      </TouchableOpacity>
    </Animated.View>
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
  const timeStr = training.manual_start ? 'Manual' : format(scheduledDate, 'h:mm a');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.card }]} 
          onPress={handleBack} 
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Status */}
        <View 
          style={[
            styles.statusBadge, 
            { backgroundColor: isOngoing ? `${colors.green}15` : isFinished ? `${colors.primary}15` : colors.secondary }
          ]}
        >
          <View 
            style={[
              styles.statusDot, 
              { backgroundColor: isOngoing ? colors.green : isFinished ? colors.primary : colors.textMuted }
            ]} 
          />
          <Text 
            style={[
              styles.statusText, 
              { color: isOngoing ? colors.green : isFinished ? colors.primary : colors.textMuted }
            ]}
          >
            {isOngoing ? 'Live Now' : isFinished ? 'Completed' : 'Scheduled'}
          </Text>
        </View>

        {/* Cancel action (if can manage) */}
        {canManageTraining && (isPlanned || isOngoing) ? (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleCancelTraining();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.headerBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

    <ScrollView
      style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
        {/* Title */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>{training.title}</Text>
          {training.description && (
            <Text style={[styles.description, { color: colors.textMuted }]}>{training.description}</Text>
          )}
        </Animated.View>

        {/* Info Chips */}
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.infoChips}>
          <View style={[styles.infoChip, { backgroundColor: colors.card }]}>
            <Calendar size={14} color={colors.textMuted} />
            <Text style={[styles.infoChipText, { color: colors.text }]}>{dateStr}</Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: colors.card }]}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[styles.infoChipText, { color: colors.text }]}>{timeStr}</Text>
          </View>
          {training.team && (
            <View style={[styles.infoChip, { backgroundColor: colors.card }]}>
              <Users size={14} color={colors.textMuted} />
              <Text style={[styles.infoChipText, { color: colors.text }]}>{training.team.name}</Text>
            </View>
          )}
        </Animated.View>

        {/* Progress Card */}
        {drills.length > 0 && (
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressTop}>
                <View>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Your progress</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {completedCount} of {drills.length} drills
                  </Text>
                </View>
                <View style={[styles.progressCircle, { borderColor: colors.border }]}>
                  <Text style={[styles.progressPercent, { color: colors.text }]}>
                    {Math.round(progressPercent)}%
                  </Text>
                </View>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent === 100 ? colors.green : colors.primary,
                    },
                  ]}
                />
              </View>
              {completedCount === drills.length && (
                <Text style={[styles.progressMessage, { color: colors.green }]}>
                  🎉 All drills completed!
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Team Progress Section (Commander View) */}
        {showTeamProgress && (
          <Animated.View entering={FadeInUp.delay(180).springify()}>
            <View style={[styles.teamProgressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Header */}
              <View style={styles.teamProgressHeader}>
                <View style={styles.teamProgressHeaderLeft}>
                  <View style={[styles.teamProgressIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Users size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.teamProgressTitle, { color: colors.text }]}>
                    Team Progress
                  </Text>
                </View>
                {groupedTeamProgress.length > 0 && (
                  <View style={[styles.teamProgressBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.teamProgressBadgeText, { color: colors.textMuted }]}>
                      {groupedTeamProgress.length} member{groupedTeamProgress.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={styles.teamProgressContent}>
                {loadingTeamProgress ? (
                  <View style={styles.teamProgressLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.teamProgressLoadingText, { color: colors.textMuted }]}>
                      Loading team data...
                    </Text>
                  </View>
                ) : groupedTeamProgress.length === 0 ? (
                  <View style={styles.teamProgressEmpty}>
                    <Users size={24} color={colors.textMuted} />
                    <Text style={[styles.teamProgressEmptyText, { color: colors.textMuted }]}>
                      No team members have started yet
                    </Text>
                  </View>
                ) : (
                  groupedTeamProgress.map((member, index) => {
                    // Generate initials from name
                    const initials = member.userName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    // Generate a consistent color based on name
                    const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                    const colorIndex = member.userName.length % avatarColors.length;
                    const avatarColor = avatarColors[colorIndex];

                    return (
                      <View
                        key={member.userId}
                        style={[
                          styles.teamMemberRow,
                          index !== groupedTeamProgress.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        {/* Avatar with initials */}
                        <View style={[styles.teamMemberAvatar, { backgroundColor: avatarColor }]}>
                          <Text style={styles.teamMemberInitials}>{initials}</Text>
                          {member.isActive && (
                            <View style={[styles.activeIndicator, { borderColor: colors.card }]} />
                          )}
                        </View>

                        <View style={styles.teamMemberInfo}>
                          <Text style={[styles.teamMemberName, { color: colors.text }]} numberOfLines={1}>
                            {member.userName}
                          </Text>
                          <Text style={[styles.teamMemberSessions, { color: colors.textMuted }]}>
                            {member.drillsCompleted} drill{member.drillsCompleted !== 1 ? 's' : ''} completed
                            {member.isActive && ' • Active now'}
                          </Text>
                        </View>
                        <View style={styles.teamMemberStats}>
                          {member.totalShots === 0 ? (
                            <Text style={[styles.teamMemberNotStarted, { color: colors.textMuted }]}>
                              Not started
                            </Text>
                          ) : (
                            <>
                              <View style={styles.teamMemberStat}>
                                <Text style={[styles.teamMemberStatValue, { color: colors.text }]}>
                                  {member.totalShots}
                                </Text>
                                <Text style={[styles.teamMemberStatLabel, { color: colors.textMuted }]}>
                                  shots
                                </Text>
                              </View>
                              <View style={styles.teamMemberStat}>
                                <Text style={[styles.teamMemberStatValue, { color: colors.primary }]}>
                                  {member.totalHits}
                                </Text>
                                <Text style={[styles.teamMemberStatLabel, { color: colors.textMuted }]}>
                                  hits
                                </Text>
                              </View>
                              <View style={styles.teamMemberStat}>
                                <Text style={[styles.teamMemberStatValue, {
                                  color: member.accuracy >= 70 ? colors.green : member.accuracy >= 50 ? colors.orange : colors.text
                                }]}>
                                  {member.accuracy}%
                                </Text>
                                <Text style={[styles.teamMemberStatLabel, { color: colors.textMuted }]}>
                                  acc
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Refresh button */}
              <TouchableOpacity
                style={[styles.teamProgressRefresh, { borderTopColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  loadTeamProgress();
                }}
                disabled={loadingTeamProgress}
                activeOpacity={0.7}
              >
                <Text style={[styles.teamProgressRefreshText, { color: colors.primary }]}>
                  {loadingTeamProgress ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Status Message */}
        {!canManageTraining && isPlanned && (
          <Animated.View entering={FadeIn.delay(180).duration(400)}>
            <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Clock size={20} color={colors.orange} />
              <View style={styles.messageContent}>
                <Text style={[styles.messageTitle, { color: colors.text }]}>Waiting for start</Text>
                <Text style={[styles.messageText, { color: colors.textMuted }]}>
                  Your commander will start this training when ready.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {isOngoing && drills.length > 0 && completedCount < drills.length && (
          <Animated.View entering={FadeIn.delay(180).duration(400)}>
            <View style={[styles.messageCard, { backgroundColor: `${colors.green}10`, borderColor: `${colors.green}30` }]}>
              <Play size={20} color={colors.green} />
              <View style={styles.messageContent}>
                <Text style={[styles.messageTitle, { color: colors.green }]}>Ready to go</Text>
                <Text style={[styles.messageText, { color: colors.green }]}>
                  Tap any drill below to start shooting.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Drills Section */}
        <View style={styles.drillsSection}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Drills</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{drills.length}</Text>
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
                    isLast={index === drills.length - 1}
                  />
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Target size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No drills added yet</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Created {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
            {training.creator?.full_name ? ` by ${training.creator.full_name}` : ''}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      {canManageTraining && (isPlanned || isOngoing) && (
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
              borderTopColor: colors.border,
            },
          ]}
        >
          {isPlanned && (
            <TouchableOpacity
              style={styles.mainBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleStartTraining();
              }}
              disabled={actionLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.green, '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainBtnGradient}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Play size={20} color="#fff" fill="#fff" />
                    <Text style={styles.mainBtnText}>Start Training</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isOngoing && (
            <TouchableOpacity
              style={styles.mainBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                handleFinishTraining();
              }}
              disabled={actionLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.indigo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainBtnGradient}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={20} color="#fff" />
                    <Text style={styles.mainBtnText}>Finish Training</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Title
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Info Chips
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  infoChipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Progress Card
  progressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressMessage: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },

  // Message Card
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Drills Section
  drillsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  drillsList: {
    gap: 12,
  },

  // Drill Card
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  drillNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillNumberText: {
    fontSize: 15,
    fontWeight: '700',
  },
  drillContent: {
    flex: 1,
  },
  drillName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  drillMeta: {
    fontSize: 14,
  },
  drillPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillDoneText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 18,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  mainBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  mainBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  mainBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Team Progress (Commander View)
  teamProgressCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  teamProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  teamProgressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamProgressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamProgressTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  teamProgressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  teamProgressBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  teamProgressContent: {
  },
  teamProgressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  teamProgressLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  teamProgressEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  teamProgressEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  teamMemberInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  teamMemberSessions: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  teamMemberStats: {
    flexDirection: 'row',
    gap: 20,
  },
  teamMemberStat: {
    alignItems: 'center',
    minWidth: 44,
  },
  teamMemberStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  teamMemberStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  teamMemberNotStarted: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  teamProgressRefresh: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  teamProgressRefreshText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
