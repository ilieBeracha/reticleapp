/**
 * Training Detail
 * 
 * Clean, refined design with subtle accents.
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
  Square,
  Target,
  Users
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// LIVE DOT
// ═══════════════════════════════════════════════════════════════════════════
function LiveDot({ size = 6 }: { size?: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ width: size, height: size }}>
      <View style={[s.liveDotBase, { width: size, height: size, borderRadius: size / 2 }]} />
      <Animated.View
        style={[s.liveDotPulse, { width: size, height: size, borderRadius: size / 2 }, style]}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DRILL ROW
// ═══════════════════════════════════════════════════════════════════════════
function DrillRow({
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
  return (
    <TouchableOpacity
      style={[s.drillRow, { backgroundColor: colors.card }]}
      onPress={() => {
        if (canStart) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStart();
        }
      }}
      disabled={!canStart || isStarting}
      activeOpacity={canStart ? 0.7 : 1}
    >
      <View
        style={[
          s.drillIndex,
          {
            backgroundColor: isCompleted ? colors.green : canStart ? colors.text : colors.secondary,
          },
        ]}
      >
        {isCompleted ? (
          <Check size={12} color="#fff" strokeWidth={3} />
        ) : (
          <Text style={s.drillIndexText}>{index + 1}</Text>
        )}
      </View>

      <View style={s.drillInfo}>
        <Text
          style={[s.drillName, { color: isCompleted ? colors.textMuted : colors.text }]}
          numberOfLines={1}
        >
          {drill.name}
        </Text>
        <Text style={[s.drillMeta, { color: colors.textMuted }]}>
          {drill.distance_m}m • {drill.rounds_per_shooter} shots
          {drill.time_limit_seconds ? ` • ${drill.time_limit_seconds}s` : ''}
        </Text>
      </View>

      {canStart && !isCompleted ? (
        isStarting ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <View style={[s.drillPlayBtn, { backgroundColor: colors.text }]}>
            <Play size={12} color={colors.background} fill={colors.background} />
          </View>
        )
      ) : !isCompleted ? (
        <ChevronRight size={16} color={colors.border} />
      ) : null}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function TrainingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const params = useLocalSearchParams<{ id?: string; startDrillId?: string }>();
  const { selectedTraining: contextTraining, getOnTrainingUpdated } = useModals();

  const trainingId = params.id || contextTraining?.id;
  const { training, drillProgress, loading, setTraining } = useTrainingDetail(
    trainingId,
    contextTraining
  );
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

  const [teamSessions, setTeamSessions] = useState<SessionWithDetails[]>([]);
  const [loadingTeamProgress, setLoadingTeamProgress] = useState(false);

  const showTeamProgress = !!training?.id && canManageTraining && training?.status === 'ongoing';

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

  useEffect(() => {
    if (showTeamProgress) loadTeamProgress();
  }, [showTeamProgress, loadTeamProgress]);

  const groupedTeamProgress = useMemo(() => {
    if (!teamSessions.length) return [];
    const userMap = new Map<string, any>();
    teamSessions.forEach((s) => {
      const id = s.user_id;
      if (!userMap.has(id)) {
        userMap.set(id, {
          userId: id,
          userName: s.user_full_name || 'Unknown',
          totalShots: 0,
          totalHits: 0,
          accuracy: 0,
          isActive: false,
          drillsCompleted: 0,
        });
      }
      const e = userMap.get(id)!;
      if (s.stats) {
        e.totalShots += s.stats.shots_fired ?? 0;
        e.totalHits += s.stats.hits_total ?? 0;
      }
      if (s.status === 'active') e.isActive = true;
      if (s.status === 'completed') e.drillsCompleted++;
    });
    userMap.forEach((e) => {
      if (e.totalShots > 0) e.accuracy = Math.round((e.totalHits / e.totalShots) * 100);
    });
    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [teamSessions]);

  useEffect(() => {
    const startDrillId = Array.isArray(params.startDrillId)
      ? params.startDrillId[0]
      : params.startDrillId;
    if (!startDrillId || !training) return;
    if (handledAutoStartRef.current === startDrillId) return;
    handledAutoStartRef.current = startDrillId;

    const drill = (training.drills || []).find((d) => d.id === startDrillId);
    if (!drill) {
      router.replace(`/(protected)/trainingDetail?id=${training.id}`);
      return;
    }
    if (training.status !== 'ongoing') {
      Alert.alert('Training not started', 'Start the training first.');
      router.replace(`/(protected)/trainingDetail?id=${training.id}`);
      return;
    }
    handleStartDrill(drill);
  }, [params.startDrillId, training, handleStartDrill]);

  if (loading || !training) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </View>
    );
  }

  const drills = training.drills || [];
  const completedCount = drillProgress.filter((p) => p.completed).length;
  const progressPercent = drills.length > 0 ? (completedCount / drills.length) * 100 : 0;
  const isOngoing = training.status === 'ongoing';
  const isPlanned = training.status === 'planned';
  const isFinished = training.status === 'finished';

  const dateStr = format(new Date(training.scheduled_at), 'EEE, MMM d');
  const timeStr = training.manual_start ? 'Manual' : format(new Date(training.scheduled_at), 'HH:mm');

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[s.headerBtn, { backgroundColor: colors.card }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to trainings tab to avoid recursive back loop
            router.replace('/(protected)/(tabs)/trainings');
          }}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {canManageTraining && (isPlanned || isOngoing) && (
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleCancelTraining();
            }}
          >
            <MoreHorizontal size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(300)} style={s.hero}>
          {/* Status */}
          <View style={s.statusRow}>
            {isOngoing && <LiveDot />}
            <Text style={[s.statusText, { color: isOngoing ? colors.green : colors.textMuted }]}>
              {isOngoing ? 'Live' : isFinished ? 'Completed' : 'Scheduled'}
            </Text>
          </View>

          <Text style={[s.title, { color: colors.text }]}>{training.title}</Text>

          <Text style={[s.meta, { color: colors.textMuted }]}>
            {dateStr} • {timeStr}
            {training.team && ` • ${training.team.name}`}
          </Text>
        </Animated.View>

        {/* Progress Bar */}
        {drills.length > 0 && (
          <Animated.View entering={FadeIn.delay(50).duration(300)}>
            <View style={[s.progressCard, { backgroundColor: colors.card }]}>
              <View style={s.progressHeader}>
                <Text style={[s.progressLabel, { color: colors.textMuted }]}>Progress</Text>
                <Text style={[s.progressValue, { color: colors.text }]}>
                  {completedCount}/{drills.length}
                </Text>
              </View>
              <View style={[s.progressBar, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent >= 100 ? colors.green : colors.text,
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Drills */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Target size={16} color={colors.textMuted} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Drills</Text>
            <View style={[s.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[s.badgeText, { color: colors.textMuted }]}>{drills.length}</Text>
            </View>
          </View>

          {drills.length > 0 ? (
            <View style={s.drillsList}>
              {drills.map((drill, index) => {
                const progress = drillProgress.find((p) => p.drillId === drill.id);
                return (
                  <DrillRow
                    key={drill.id}
                    drill={drill}
                    index={index}
                    colors={colors}
                    isCompleted={progress?.completed || false}
                    canStart={isOngoing && !progress?.completed}
                    onStart={() => handleStartDrill(drill)}
                    isStarting={startingDrillId === drill.id}
                  />
                );
              })}
            </View>
          ) : (
            <View style={[s.empty, { backgroundColor: colors.card }]}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No drills</Text>
            </View>
          )}
        </View>

        {/* Team Progress */}
        {showTeamProgress && (
          <Animated.View entering={FadeIn.delay(100).duration(300)}>
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Users size={16} color={colors.textMuted} />
                <Text style={[s.sectionTitle, { color: colors.text }]}>Team</Text>
                <TouchableOpacity
                  style={[s.refreshBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    loadTeamProgress();
                  }}
                  disabled={loadingTeamProgress}
                >
                  <RefreshCw size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {loadingTeamProgress ? (
                <View style={[s.teamLoading, { backgroundColor: colors.card }]}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                </View>
              ) : groupedTeamProgress.length === 0 ? (
                <View style={[s.empty, { backgroundColor: colors.card }]}>
                  <Text style={[s.emptyText, { color: colors.textMuted }]}>No one started yet</Text>
                </View>
              ) : (
                <View style={s.teamList}>
                  {groupedTeamProgress.map((m) => (
                    <View key={m.userId} style={[s.memberRow, { backgroundColor: colors.card }]}>
                      <View style={[s.memberAvatar, { backgroundColor: colors.secondary }]}>
                        <Text style={[s.memberInitial, { color: colors.text }]}>
                          {m.userName.charAt(0).toUpperCase()}
                        </Text>
                        {m.isActive && <View style={s.memberActive} />}
                      </View>
                      <View style={s.memberInfo}>
                        <Text style={[s.memberName, { color: colors.text }]} numberOfLines={1}>
                          {m.userName}
                        </Text>
                        <Text style={[s.memberStats, { color: colors.textMuted }]}>
                          {m.drillsCompleted}/{drills.length} • {m.accuracy}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Footer */}
        <Text style={[s.footer, { color: colors.textMuted }]}>
          Created {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
        </Text>
      </ScrollView>

      {/* Bottom Action */}
      {canManageTraining && (isPlanned || isOngoing) && (
        <View style={[s.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          {isPlanned ? (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.text }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleStartTraining();
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Play size={18} color={colors.background} fill={colors.background} />
                  <Text style={[s.actionBtnText, { color: colors.background }]}>Start Training</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                handleFinishTraining();
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Square size={16} color={colors.text} />
                  <Text style={[s.actionBtnText, { color: colors.text }]}>Finish Training</Text>
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
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { marginBottom: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  meta: { fontSize: 14 },

  // Live dot
  liveDotBase: { backgroundColor: '#10B981' },
  liveDotPulse: { position: 'absolute', backgroundColor: '#10B981' },

  // Progress
  progressCard: { padding: 14, borderRadius: 12, marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },
  progressValue: { fontSize: 13, fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  refreshBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Drills
  drillsList: { gap: 6 },
  drillRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  drillIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  drillIndexText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  drillInfo: { flex: 1 },
  drillName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  drillMeta: { fontSize: 13 },
  drillPlayBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Empty
  empty: { padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 14 },

  // Team
  teamLoading: { padding: 24, borderRadius: 12, alignItems: 'center' },
  teamList: { gap: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  memberInitial: { fontSize: 14, fontWeight: '600' },
  memberActive: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  memberStats: { fontSize: 13 },

  // Footer
  footer: { fontSize: 12, textAlign: 'center', paddingVertical: 20 },

  // Bottom
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 12 },
  actionBtnText: { fontSize: 16, fontWeight: '600' },
});
