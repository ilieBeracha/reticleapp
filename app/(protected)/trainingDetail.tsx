/**
 * Training Detail
 * 
 * Clean, refined design with proper state handling and auto-close support.
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
import { updateTraining } from '@/services/trainingService';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Play,
  RefreshCw,
  Settings,
  Square,
  Target,
  Timer,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
// AUTO-CLOSE COUNTDOWN
// ═══════════════════════════════════════════════════════════════════════════
function AutoCloseCountdown({
  autoCloseAt,
  colors,
  onExpired,
}: {
  autoCloseAt: string;
  colors: ReturnType<typeof useColors>;
  onExpired: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(autoCloseAt);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Closing...');
        setIsExpired(true);
        onExpired();
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else if (mins > 0) {
        setTimeLeft(`${mins}m ${secs}s`);
      } else {
        setTimeLeft(`${secs}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [autoCloseAt, onExpired]);

  if (isExpired) return null;

  return (
    <View style={[s.autoCloseCard, { backgroundColor: colors.orange + '15' }]}>
      <Timer size={16} color={colors.orange} />
      <View style={s.autoCloseContent}>
        <Text style={[s.autoCloseLabel, { color: colors.textMuted }]}>Auto-closes in</Text>
        <Text style={[s.autoCloseTime, { color: colors.orange }]}>{timeLeft}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════════════
function TrainingSettingsModal({
  visible,
  onClose,
  training,
  onUpdate,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  training: any;
  onUpdate: (data: any) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(!!training?.auto_close_at);
  const [hours, setHours] = useState('2');
  const [mins, setMins] = useState('0');

  useEffect(() => {
    if (training?.auto_close_at) {
      const now = new Date();
      const end = new Date(training.auto_close_at);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setHours(String(h));
      setMins(String(m));
      setAutoCloseEnabled(true);
    } else {
      setAutoCloseEnabled(false);
      setHours('2');
      setMins('0');
    }
  }, [training?.auto_close_at, visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let autoCloseAt: string | null = null;
      if (autoCloseEnabled) {
        const h = parseInt(hours, 10) || 0;
        const m = parseInt(mins, 10) || 0;
        if (h > 0 || m > 0) {
          const closeTime = new Date();
          closeTime.setHours(closeTime.getHours() + h);
          closeTime.setMinutes(closeTime.getMinutes() + m);
          autoCloseAt = closeTime.toISOString();
        }
      }

      await updateTraining(training.id, { auto_close_at: autoCloseAt });
      onUpdate({ ...training, auto_close_at: autoCloseAt });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAutoClose = async () => {
    setSaving(true);
    try {
      await updateTraining(training.id, { auto_close_at: null });
      onUpdate({ ...training, auto_close_at: null });
      setAutoCloseEnabled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove auto-close');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={s.modalHeader}>
          <Text style={[s.modalTitle, { color: colors.text }]}>Training Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <XCircle size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {/* Auto-close section */}
          <View style={[s.settingsSection, { backgroundColor: colors.card }]}>
            <View style={s.settingRow}>
              <View style={s.settingInfo}>
                <Timer size={20} color={colors.text} />
                <View style={s.settingTextWrap}>
                  <Text style={[s.settingTitle, { color: colors.text }]}>Auto-close</Text>
                  <Text style={[s.settingDesc, { color: colors.textMuted }]}>
                    Automatically finish training after time
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  s.settingToggle,
                  { backgroundColor: autoCloseEnabled ? colors.green : colors.secondary },
                ]}
                onPress={() => setAutoCloseEnabled(!autoCloseEnabled)}
              >
                <View
                  style={[
                    s.settingToggleKnob,
                    { 
                      backgroundColor: colors.background,
                      transform: [{ translateX: autoCloseEnabled ? 18 : 2 }],
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>

            {autoCloseEnabled && (
              <View style={s.timeInputRow}>
                <Text style={[s.timeInputLabel, { color: colors.textMuted }]}>Close in:</Text>
                <View style={s.timeInputs}>
                  <View style={[s.timeInputWrap, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      style={[s.timeInput, { color: colors.text }]}
                      value={hours}
                      onChangeText={setHours}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={[s.timeInputUnit, { color: colors.textMuted }]}>h</Text>
                  </View>
                  <View style={[s.timeInputWrap, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      style={[s.timeInput, { color: colors.text }]}
                      value={mins}
                      onChangeText={setMins}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={[s.timeInputUnit, { color: colors.textMuted }]}>m</Text>
                  </View>
                </View>
              </View>
            )}

            {training?.auto_close_at && (
              <TouchableOpacity
                style={[s.removeBtn, { borderColor: colors.red }]}
                onPress={handleRemoveAutoClose}
                disabled={saving}
              >
                <Text style={[s.removeBtnText, { color: colors.red }]}>Remove auto-close</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={[s.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.text }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[s.saveBtnText, { color: colors.background }]}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETION BANNER
// ═══════════════════════════════════════════════════════════════════════════
function CompletionBanner({ 
  colors, 
  allDrillsCompleted,
  onFinish,
  canManage,
}: { 
  colors: ReturnType<typeof useColors>;
  allDrillsCompleted: boolean;
  onFinish: () => void;
  canManage: boolean;
}) {
  if (!allDrillsCompleted) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <View style={[s.completionBanner, { backgroundColor: colors.green + '15' }]}>
        <View style={s.completionContent}>
          <View style={[s.completionIconWrap, { backgroundColor: colors.green }]}>
            <Trophy size={20} color="#fff" />
          </View>
          <View style={s.completionText}>
            <Text style={[s.completionTitle, { color: colors.text }]}>
              All drills completed!
            </Text>
            <Text style={[s.completionSubtitle, { color: colors.textMuted }]}>
              {canManage ? 'You can now finish the training.' : 'Great job! Wait for commander to finish.'}
            </Text>
          </View>
        </View>
        {canManage && (
          <TouchableOpacity
            style={[s.completionBtn, { backgroundColor: colors.green }]}
            onPress={onFinish}
          >
            <Text style={s.completionBtnText}>Finish</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════
function StatusBadge({
  status,
  colors,
}: {
  status: 'planned' | 'ongoing' | 'finished' | 'cancelled';
  colors: ReturnType<typeof useColors>;
}) {
  const config = {
    planned: { label: 'Scheduled', color: colors.textMuted, icon: Clock },
    ongoing: { label: 'Live', color: colors.green, icon: null },
    finished: { label: 'Completed', color: colors.green, icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', color: colors.red, icon: XCircle },
  };

  const { label, color, icon: Icon } = config[status] || config.planned;

  return (
    <View style={s.statusRow}>
      {status === 'ongoing' && <LiveDot />}
      {Icon && <Icon size={14} color={color} />}
      <Text style={[s.statusText, { color }]}>{label}</Text>
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
// FINISHED SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
function FinishedSummary({
  training,
  drillCount,
  completedCount,
  colors,
}: {
  training: any;
  drillCount: number;
  completedCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const duration = useMemo(() => {
    if (!training.started_at || !training.ended_at) return null;
    const start = new Date(training.started_at);
    const end = new Date(training.ended_at);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }, [training.started_at, training.ended_at]);

  return (
    <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
      <View style={s.summaryHeader}>
        <CheckCircle2 size={18} color={colors.green} />
        <Text style={[s.summaryTitle, { color: colors.text }]}>Training Complete</Text>
      </View>
      <View style={s.summaryStats}>
        <View style={s.summaryStat}>
          <Text style={[s.summaryStatValue, { color: colors.text }]}>
            {completedCount}/{drillCount}
          </Text>
          <Text style={[s.summaryStatLabel, { color: colors.textMuted }]}>Drills</Text>
        </View>
        {duration && (
          <View style={s.summaryStat}>
            <Text style={[s.summaryStatValue, { color: colors.text }]}>{duration}</Text>
            <Text style={[s.summaryStatLabel, { color: colors.textMuted }]}>Duration</Text>
          </View>
        )}
        {training.ended_at && (
          <View style={s.summaryStat}>
            <Text style={[s.summaryStatValue, { color: colors.text }]}>
              {format(new Date(training.ended_at), 'HH:mm')}
            </Text>
            <Text style={[s.summaryStatLabel, { color: colors.textMuted }]}>Ended</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOT FOUND STATE
// ═══════════════════════════════════════════════════════════════════════════
function NotFoundState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={s.notFoundContainer}>
      <AlertCircle size={48} color={colors.textMuted} />
      <Text style={[s.notFoundTitle, { color: colors.text }]}>Training Not Found</Text>
      <Text style={[s.notFoundText, { color: colors.textMuted }]}>
        This training may have been deleted or you don't have access.
      </Text>
      <TouchableOpacity
        style={[s.notFoundBtn, { backgroundColor: colors.card }]}
        onPress={() => router.replace('/(protected)/(tabs)/trainings' as any)}
      >
        <Text style={[s.notFoundBtnText, { color: colors.text }]}>Go to Trainings</Text>
      </TouchableOpacity>
    </View>
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
  const { training, drillProgress, loading, setTraining, refetch } = useTrainingDetail(
    trainingId,
    contextTraining
  );
  const handledAutoStartRef = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
    if (showTeamProgress) await loadTeamProgress();
    setRefreshing(false);
  }, [refetch, showTeamProgress, loadTeamProgress]);

  // Auto-close expired handler
  const handleAutoCloseExpired = useCallback(() => {
    if (canManageTraining) {
      handleFinishTraining();
    } else {
      // For non-commanders, just refresh to see updated status
      setTimeout(() => refetch(), 2000);
    }
  }, [canManageTraining, handleFinishTraining, refetch]);

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

  // Loading state
  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => router.replace('/(protected)/(tabs)/trainings' as any)}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </View>
    );
  }

  // Not found state
  if (!training) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => router.replace('/(protected)/(tabs)/trainings' as any)}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <NotFoundState colors={colors} />
      </View>
    );
  }

  const drills = training.drills || [];
  const completedCount = drillProgress.filter((p) => p.completed).length;
  // Only count progress for ongoing trainings (for planned, progress is 0)
  const effectiveCompletedCount = training.status === 'planned' ? 0 : completedCount;
  const progressPercent = drills.length > 0 ? (effectiveCompletedCount / drills.length) * 100 : 0;
  const allDrillsCompleted = drills.length > 0 && completedCount === drills.length && training.status === 'ongoing';
  
  const isOngoing = training.status === 'ongoing';
  const isPlanned = training.status === 'planned';
  const isFinished = training.status === 'finished';
  const isCancelled = training.status === 'cancelled';

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
            router.replace('/(protected)/(tabs)/trainings' as any);
          }}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        
        {/* Refresh button */}
        <TouchableOpacity
          style={[s.headerBtn, { backgroundColor: colors.card }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <RefreshCw size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {/* Settings button (commander only, ongoing only) */}
        {canManageTraining && isOngoing && (
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
          >
            <Settings size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        
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
          <StatusBadge status={training.status} colors={colors} />
          <Text style={[s.title, { color: colors.text }]}>{training.title}</Text>
          <Text style={[s.meta, { color: colors.textMuted }]}>
            {dateStr} • {timeStr}
            {training.team && ` • ${training.team.name}`}
          </Text>
        </Animated.View>

        {/* Auto-close countdown */}
        {isOngoing && training.auto_close_at && (
          <AutoCloseCountdown
            autoCloseAt={training.auto_close_at}
            colors={colors}
            onExpired={handleAutoCloseExpired}
          />
        )}

        {/* Cancelled message */}
        {isCancelled && (
          <View style={[s.cancelledCard, { backgroundColor: colors.red + '15' }]}>
            <XCircle size={18} color={colors.red} />
            <Text style={[s.cancelledText, { color: colors.text }]}>
              This training was cancelled
            </Text>
          </View>
        )}

        {/* Finished Summary */}
        {isFinished && (
          <Animated.View entering={FadeIn.delay(50).duration(300)}>
            <FinishedSummary
              training={training}
              drillCount={drills.length}
              completedCount={completedCount}
              colors={colors}
            />
          </Animated.View>
        )}

        {/* Completion Banner (when ongoing and all done) */}
        {isOngoing && (
          <CompletionBanner
            colors={colors}
            allDrillsCompleted={allDrillsCompleted}
            onFinish={handleFinishTraining}
            canManage={canManageTraining}
          />
        )}

        {/* Progress Bar (only for ongoing) */}
        {drills.length > 0 && isOngoing && (
          <Animated.View entering={FadeIn.delay(50).duration(300)}>
            <View style={[s.progressCard, { backgroundColor: colors.card }]}>
              <View style={s.progressHeader}>
                <Text style={[s.progressLabel, { color: colors.textMuted }]}>Your Progress</Text>
                <Text style={[s.progressValue, { color: colors.text }]}>
                  {effectiveCompletedCount}/{drills.length}
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
                const isCompleted = isOngoing ? (progress?.completed || false) : false;
                return (
                  <DrillRow
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
      {canManageTraining && isPlanned && (
        <View style={[s.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
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
        </View>
      )}

      {/* Ongoing bottom (only if not all completed) */}
      {canManageTraining && isOngoing && !allDrillsCompleted && (
        <View style={[s.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
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
        </View>
      )}

      {/* Settings Modal */}
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

  // Auto-close
  autoCloseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  autoCloseContent: { flex: 1 },
  autoCloseLabel: { fontSize: 12, marginBottom: 2 },
  autoCloseTime: { fontSize: 18, fontWeight: '700' },

  // Cancelled
  cancelledCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  cancelledText: { fontSize: 14, fontWeight: '500' },

  // Completion banner
  completionBanner: { padding: 16, borderRadius: 12, marginBottom: 16 },
  completionContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  completionIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  completionText: { flex: 1 },
  completionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  completionSubtitle: { fontSize: 13 },
  completionBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start' },
  completionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Summary card
  summaryCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  summaryTitle: { fontSize: 15, fontWeight: '600' },
  summaryStats: { flexDirection: 'row', gap: 20 },
  summaryStat: { alignItems: 'center' },
  summaryStatValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  summaryStatLabel: { fontSize: 12 },

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

  // Not found
  notFoundContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  notFoundTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  notFoundText: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  notFoundBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  notFoundBtnText: { fontSize: 15, fontWeight: '600' },

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

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { flex: 1, padding: 20 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 12 },

  // Settings
  settingsSection: { borderRadius: 12, padding: 16, marginBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTextWrap: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  settingDesc: { fontSize: 13 },
  settingToggle: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  settingToggleKnob: { width: 22, height: 22, borderRadius: 11 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  timeInputLabel: { fontSize: 14 },
  timeInputs: { flexDirection: 'row', gap: 8 },
  timeInputWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  timeInput: { fontSize: 16, fontWeight: '600', width: 32, textAlign: 'center' },
  timeInputUnit: { fontSize: 14 },
  removeBtn: { marginTop: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  removeBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
});
