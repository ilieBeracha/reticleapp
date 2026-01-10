/**
 * Training Detail
 * 
 * Clean, refined design with proper state handling and auto-close support.
 */
import {
  useTrainingActions,
  useTrainingDetail,
} from '@/components/training';
import { WeaponAssignmentManager } from '@/components/weapons';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getTeamDrills } from '@/services/drillService';
import { getTrainingSessionsWithStats, SessionWithDetails } from '@/services/sessionService';
import { getTeamMembers } from '@/services/teamService';
import { addDrill, updateTraining } from '@/services/trainingService';
import type { Drill } from '@/types/workspace';
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
  Plus,
  RefreshCw,
  Search,
  Settings,
  Square,
  Target,
  Timer,
  Trophy,
  Users,
  X,
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
// COMMANDER ACTIONS SHEET
// ═══════════════════════════════════════════════════════════════════════════
function CommanderActionsSheet({
  visible,
  onClose,
  onAddDrill,
  onAssignWeapon,
  onFinishTraining,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAddDrill: () => void;
  onAssignWeapon: () => void;
  onFinishTraining: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setTimeout(action, 150);
  };

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent 
      onRequestClose={onClose}
    >
      <View style={cmdStyles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity 
          style={cmdStyles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        {/* Sheet */}
        <Animated.View 
          entering={FadeInDown.duration(200)}
          style={[
            cmdStyles.sheet, 
            { 
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }
          ]}
        >
          {/* Handle */}
          <View style={cmdStyles.handleWrap}>
            <View style={[cmdStyles.handle, { backgroundColor: colors.textMuted + '40' }]} />
          </View>
          
          {/* Title */}
          <Text style={[cmdStyles.title, { color: colors.textMuted }]}>Quick Actions</Text>
          
          {/* Actions */}
          <View style={cmdStyles.actionsWrap}>
            <TouchableOpacity 
              style={[cmdStyles.actionBtn, { backgroundColor: colors.card }]} 
              onPress={() => handleAction(onAddDrill)}
              activeOpacity={0.7}
            >
              <View style={[cmdStyles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Plus size={20} color={colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={[cmdStyles.actionLabel, { color: colors.text }]}>Add Drill</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[cmdStyles.actionBtn, { backgroundColor: colors.card }]} 
              onPress={() => handleAction(onAssignWeapon)}
              activeOpacity={0.7}
            >
              <View style={[cmdStyles.iconWrap, { backgroundColor: colors.yellow + '20' }]}>
                <Target size={20} color={colors.yellow} />
              </View>
              <Text style={[cmdStyles.actionLabel, { color: colors.text }]}>Assign Weapon</Text>
            </TouchableOpacity>
          </View>

          {/* Finish */}
          <TouchableOpacity 
            style={[cmdStyles.finishBtn, { backgroundColor: colors.destructive + '12' }]} 
            onPress={() => handleAction(onFinishTraining)}
            activeOpacity={0.7}
          >
            <Square size={16} color={colors.destructive} />
            <Text style={[cmdStyles.finishText, { color: colors.destructive }]}>Finish Training</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity 
            style={cmdStyles.cancelBtn} 
            onPress={onClose}
            activeOpacity={0.6}
          >
            <Text style={[cmdStyles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cmdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionsWrap: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  finishText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

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
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.green : '#F59E0B';
  const goalLabel = isGrouping ? 'Grouping' : 'Engagement';

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
      {/* Index badge with completion state */}
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

      {/* Drill info */}
      <View style={s.drillInfo}>
        <View style={s.drillNameRow}>
          <Text
            style={[s.drillName, { color: isCompleted ? colors.textMuted : colors.text }]}
            numberOfLines={1}
          >
            {drill.name}
          </Text>
        </View>
        <View style={s.drillMetaRow}>
          <View style={[s.drillGoalBadge, { backgroundColor: goalColor + '20' }]}>
            <View style={[s.drillGoalDotSmall, { backgroundColor: goalColor }]} />
            <Text style={[s.drillGoalText, { color: goalColor }]}>{goalLabel}</Text>
          </View>
          <Text style={[s.drillMeta, { color: colors.textMuted }]}>
            {drill.distance_m}m • {drill.rounds_per_shooter} shots
            {drill.time_limit_seconds ? ` • ${drill.time_limit_seconds}s` : ''}
          </Text>
        </View>
      </View>

      {/* Action button */}
      {canStart && !isCompleted ? (
        isStarting ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <View style={[s.drillPlayBtn, { backgroundColor: colors.text }]}>
            <Play size={12} color={colors.background} fill={colors.background} />
          </View>
        )
      ) : isCompleted ? (
        <Check size={18} color={colors.green} strokeWidth={2} />
      ) : (
        <ChevronRight size={16} color={colors.border} />
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FINISHED SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
interface ParticipantResult {
  userId: string;
  userName: string;
  totalShots: number;
  totalHits: number;
  accuracy: number | null; // null for grouping-only users
  drillsCompleted: number;
  drillResults: Array<{
    drillId: string;
    drillName: string;
    drillGoal: 'grouping' | 'engagement';
    accuracy: number | null; // null for grouping drills
    dispersion: number | null; // for grouping drills
    shots: number;
    hits: number;
    completed: boolean;
  }>;
}

function FinishedSummary({
  training,
  drillCount,
  completedCount,
  colors,
  teamSessions,
  drills,
  canManageTraining,
}: {
  training: any;
  drillCount: number;
  completedCount: number;
  colors: ReturnType<typeof useColors>;
  teamSessions: SessionWithDetails[];
  drills: any[];
  canManageTraining: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

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

  // Calculate participant results
  const participantResults = useMemo<ParticipantResult[]>(() => {
    if (!teamSessions.length || !drills.length) return [];
    
    const userMap = new Map<string, ParticipantResult>();
    
    teamSessions.forEach((session) => {
      const userId = session.user_id;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: session.user_full_name || 'Unknown',
          totalShots: 0,
          totalHits: 0,
          accuracy: null,
          drillsCompleted: 0,
          drillResults: [],
        });
      }
      
      const participant = userMap.get(userId)!;
      
      // Add session stats
      const shots = session.stats?.shots_fired ?? 0;
      const hits = session.stats?.hits_total ?? 0;
      const dispersion = session.stats?.best_dispersion_cm ?? null;
      
      // Find matching drill to check drill type
      const drill = drills.find(d => d.id === session.drill_id);
      const drillName = drill?.name || session.drill_name || session.drill_config?.name || 'Unknown Drill';
      const drillGoal = drill?.drill_goal || session.drill_config?.drill_goal || 'engagement';
      const isGrouping = drillGoal === 'grouping';
      
      // For engagement drills, track hits
      if (!isGrouping) {
        participant.totalShots += shots;
        participant.totalHits += hits;
      }
      
      if (session.status === 'completed') {
        participant.drillsCompleted++;
      }
      
      // Calculate accuracy only for engagement drills
      const drillAccuracy = !isGrouping && shots > 0 ? Math.round((hits / shots) * 100) : null;
      
      participant.drillResults.push({
        drillId: session.drill_id || '',
        drillName,
        drillGoal: isGrouping ? 'grouping' : 'engagement',
        accuracy: drillAccuracy,
        dispersion: isGrouping ? dispersion : null,
        shots,
        hits,
        completed: session.status === 'completed',
      });
    });
    
    // Calculate overall accuracy (only from engagement drills)
    userMap.forEach((p) => {
      if (p.totalShots > 0) {
        p.accuracy = Math.round((p.totalHits / p.totalShots) * 100);
      }
      // Sort by drill order in training
      p.drillResults.sort((a, b) => {
        const aIndex = drills.findIndex(d => d.id === a.drillId);
        const bIndex = drills.findIndex(d => d.id === b.drillId);
        return aIndex - bIndex;
      });
    });
    
    // Sort by completed drills, then by accuracy
    return Array.from(userMap.values()).sort((a, b) => {
      if (b.drillsCompleted !== a.drillsCompleted) return b.drillsCompleted - a.drillsCompleted;
      return (b.accuracy ?? 0) - (a.accuracy ?? 0);
    });
  }, [teamSessions, drills]);

  const hasParticipants = participantResults.length > 0 && canManageTraining;

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

      {/* Participant Results (expandable) */}
      {hasParticipants && (
        <>
          <TouchableOpacity
            style={[s.participantsToggle, { borderTopColor: colors.border }]}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Users size={16} color={colors.textMuted} />
            <Text style={[s.participantsToggleText, { color: colors.text }]}>
              Participant Results ({participantResults.length})
            </Text>
            <ChevronRight
              size={18}
              color={colors.textMuted}
              style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {expanded && (
            <View style={s.participantsList}>
              {participantResults.map((p) => (
                <View key={p.userId} style={[s.participantCard, { backgroundColor: colors.secondary }]}>
                  {/* Participant header */}
                  <View style={s.participantHeader}>
                    <View style={[s.participantAvatar, { backgroundColor: colors.card }]}>
                      <Text style={[s.participantInitial, { color: colors.text }]}>
                        {p.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.participantInfo}>
                      <Text style={[s.participantName, { color: colors.text }]} numberOfLines={1}>
                        {p.userName}
                      </Text>
                      <Text style={[s.participantStats, { color: colors.textMuted }]}>
                        {p.drillsCompleted}/{drillCount} drills
                      </Text>
                    </View>
                    {p.accuracy !== null && (
                      <View style={s.participantAccuracy}>
                        <Text style={[s.participantAccuracyValue, { color: colors.text }]}>
                          {p.accuracy}%
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Drill breakdown */}
                  <View style={s.drillBreakdown}>
                    {drills.map((drill, idx) => {
                      const result = p.drillResults.find(r => r.drillId === drill.id);
                      const isGrouping = drill.drill_goal === 'grouping';
                      const goalColor = isGrouping ? colors.green : '#F59E0B';
                      
                      // Get result display
                      let resultText = '—';
                      if (result?.completed) {
                        if (isGrouping && result.dispersion !== null) {
                          resultText = `${result.dispersion.toFixed(1)}cm`;
                        } else if (!isGrouping && result.accuracy !== null) {
                          resultText = `${result.accuracy}%`;
                        } else if (result.shots > 0) {
                          resultText = `${result.shots} shots`;
                        }
                      }
                      
                      return (
                        <View key={drill.id} style={s.drillBreakdownRow}>
                          <View style={[s.drillBreakdownDot, { backgroundColor: goalColor }]} />
                          {result ? (
                            <>
                              <View style={[s.drillBreakdownStatus, { backgroundColor: result.completed ? colors.green : colors.yellow }]} />
                              <Text style={[s.drillBreakdownName, { color: colors.text }]} numberOfLines={1}>
                                {drill.name}
                              </Text>
                              <Text style={[s.drillBreakdownAccuracy, { color: colors.textMuted }]}>
                                {resultText}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View style={[s.drillBreakdownStatus, { backgroundColor: colors.border }]} />
                              <Text style={[s.drillBreakdownName, { color: colors.textMuted }]} numberOfLines={1}>
                                {drill.name}
                              </Text>
                              <Text style={[s.drillBreakdownAccuracy, { color: colors.textMuted }]}>—</Text>
                            </>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
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
        onPress={() => router.replace('/(protected)/(tabs)' as any)}
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
  const [showCommanderActions, setShowCommanderActions] = useState(false);

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

  // Add Drill state
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(false);
  const [addingDrill, setAddingDrill] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');

  // Weapon Assignment state
  const [showWeaponAssignment, setShowWeaponAssignment] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; avatar_url?: string | null }[]>([]);

  // Show team progress/activity for commanders during ongoing or finished trainings
  const shouldLoadTeamData = !!training?.id && canManageTraining && 
    (training?.status === 'ongoing' || training?.status === 'finished');
  const showTeamProgress = shouldLoadTeamData && training?.status === 'ongoing';

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
    if (shouldLoadTeamData) loadTeamProgress();
  }, [shouldLoadTeamData, loadTeamProgress]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
    if (shouldLoadTeamData) await loadTeamProgress();
    setRefreshing(false);
  }, [refetch, shouldLoadTeamData, loadTeamProgress]);

  // Load available team drills for adding
  const loadAvailableDrills = useCallback(async () => {
    if (!training?.team_id) return;
    setLoadingDrills(true);
    try {
      const drills = await getTeamDrills(training.team_id);
      setAvailableDrills(drills);
    } catch (error) {
      console.error('[TrainingDetail] Failed to load drills:', error);
    } finally {
      setLoadingDrills(false);
    }
  }, [training?.team_id]);

  // Open add drill modal
  const handleOpenAddDrill = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddDrill(true);
    loadAvailableDrills();
  }, [loadAvailableDrills]);

  // Add drill to training
  const handleAddDrill = useCallback(async (drill: Drill) => {
    if (!training?.id || addingDrill) return;
    setAddingDrill(true);
    try {
      await addDrill(training.id, {
        drill_id: drill.id,
        name: drill.name,
        description: drill.description ?? undefined,
        drill_goal: drill.drill_goal,
        target_type: drill.target_type,
        distance_m: drill.distance_m,
        rounds_per_shooter: drill.rounds_per_shooter,
        time_limit_seconds: drill.time_limit_seconds ?? undefined,
        strings_count: drill.strings_count ?? undefined,
        position: drill.position ?? undefined,
        weapon_category: drill.weapon_category ?? undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddDrill(false);
      setDrillSearch('');
      refetch(); // Refresh training to show new drill
    } catch (error) {
      console.error('[TrainingDetail] Failed to add drill:', error);
      Alert.alert('Error', 'Failed to add drill. Please try again.');
    } finally {
      setAddingDrill(false);
    }
  }, [training?.id, addingDrill, refetch]);

  // Filtered drills for search
  const filteredDrills = useMemo(() => {
    if (!drillSearch.trim()) return availableDrills;
    const query = drillSearch.toLowerCase();
    return availableDrills.filter(d => 
      d.name.toLowerCase().includes(query) ||
      (d.description?.toLowerCase().includes(query))
    );
  }, [availableDrills, drillSearch]);

  // Open weapon assignment modal
  const handleOpenWeaponAssignment = useCallback(async () => {
    if (!training?.team_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const members = await getTeamMembers(training.team_id);
      setTeamMembers(members.map(m => ({
        id: m.user_id,
        full_name: m.profile?.full_name || 'Unknown',
        avatar_url: m.profile?.avatar_url,
      })));
      setShowWeaponAssignment(true);
    } catch (error) {
      console.error('[TrainingDetail] Failed to load team members:', error);
      Alert.alert('Error', 'Failed to load team members.');
    }
  }, [training?.team_id]);

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
    const trainingDrills = training?.drills || [];
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
          // Activity timeline data
          currentDrill: null as { name: string; startedAt: string } | null,
          lastCompleted: null as { name: string; completedAt: string } | null,
          sessions: [] as Array<{
            drillId: string | null;
            drillName: string;
            status: string;
            startedAt: string;
            endedAt: string | null;
            accuracy: number;
          }>,
        });
      }
      const e = userMap.get(id)!;
      
      // Aggregate stats
      if (s.stats) {
        e.totalShots += s.stats.shots_fired ?? 0;
        e.totalHits += s.stats.hits_total ?? 0;
      }
      
      // Track session status
      if (s.status === 'active') {
        e.isActive = true;
        e.currentDrill = {
          name: s.drill_name || s.drill_config?.name || 'Current Drill',
          startedAt: s.started_at,
        };
      }
      
      if (s.status === 'completed') {
        e.drillsCompleted++;
        // Track last completed (most recent)
        if (!e.lastCompleted || new Date(s.ended_at!) > new Date(e.lastCompleted.completedAt)) {
          e.lastCompleted = {
            name: s.drill_name || s.drill_config?.name || 'Drill',
            completedAt: s.ended_at!,
          };
        }
      }
      
      // Store session for detailed view
      const sessionAccuracy = s.stats?.shots_fired 
        ? Math.round((s.stats.hits_total / s.stats.shots_fired) * 100) 
        : 0;
      e.sessions.push({
        drillId: s.drill_id,
        drillName: s.drill_name || s.drill_config?.name || 'Unnamed',
        status: s.status,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        accuracy: sessionAccuracy,
      });
    });
    
    userMap.forEach((e) => {
      if (e.totalShots > 0) e.accuracy = Math.round((e.totalHits / e.totalShots) * 100);
      // Sort sessions by time
      e.sessions.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    });
    
    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [teamSessions, training?.drills]);

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
            onPress={() => router.back()}
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
            onPress={() => router.back()}
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
            router.back();
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
        
        {/* Commander Actions (ongoing) */}
        {canManageTraining && isOngoing && (
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.text }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCommanderActions(true);
            }}
          >
            <MoreHorizontal size={20} color={colors.background} />
          </TouchableOpacity>
        )}
        
        {/* Cancel (planned only) */}
        {canManageTraining && isPlanned && (
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleCancelTraining();
            }}
          >
            <X size={20} color={colors.textMuted} />
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
              teamSessions={teamSessions}
              drills={drills}
              canManageTraining={canManageTraining}
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
            {/* Add Drill button - only for commanders during ongoing training */}
            {canManageTraining && isOngoing && (
              <TouchableOpacity
                style={[s.addDrillBtn, { backgroundColor: colors.text }]}
                onPress={handleOpenAddDrill}
                activeOpacity={0.7}
              >
                <Plus size={14} color={colors.background} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
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

        {/* Team Activity */}
        {showTeamProgress && (
          <Animated.View entering={FadeIn.delay(100).duration(300)}>
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Users size={16} color={colors.textMuted} />
                <Text style={[s.sectionTitle, { color: colors.text }]}>Team Activity</Text>
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
                    <View key={m.userId} style={[s.memberCard, { backgroundColor: colors.card }]}>
                      {/* Member header */}
                      <View style={s.memberHeader}>
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
                            {m.drillsCompleted}/{drills.length} drills • {m.accuracy}% • {m.totalShots} shots
                          </Text>
                        </View>
                      </View>
                      
                      {/* Activity timeline */}
                      <View style={s.activityTimeline}>
                        {/* Current drill (if active) */}
                        {m.currentDrill && (
                          <View style={s.activityRow}>
                            <View style={[s.activityDot, { backgroundColor: colors.green }]} />
                            <Play size={12} color={colors.green} fill={colors.green} />
                            <Text style={[s.activityText, { color: colors.text }]} numberOfLines={1}>
                              {m.currentDrill.name}
                            </Text>
                            <Text style={[s.activityTime, { color: colors.textMuted }]}>
                              {formatDistanceToNow(new Date(m.currentDrill.startedAt), { addSuffix: false })}
                            </Text>
                          </View>
                        )}
                        
                        {/* Last completed drill */}
                        {m.lastCompleted && (
                          <View style={s.activityRow}>
                            <View style={[s.activityDot, { backgroundColor: colors.textMuted }]} />
                            <Check size={12} color={colors.textMuted} />
                            <Text style={[s.activityText, { color: colors.textMuted }]} numberOfLines={1}>
                              {m.lastCompleted.name}
                            </Text>
                            <Text style={[s.activityTime, { color: colors.textMuted }]}>
                              {formatDistanceToNow(new Date(m.lastCompleted.completedAt), { addSuffix: true })}
                            </Text>
                          </View>
                        )}
                        
                        {/* Not started state */}
                        {!m.currentDrill && !m.lastCompleted && (
                          <View style={s.activityRow}>
                            <View style={[s.activityDot, { backgroundColor: colors.border }]} />
                            <Clock size={12} color={colors.textMuted} />
                            <Text style={[s.activityText, { color: colors.textMuted }]}>
                              No drills started yet
                            </Text>
                          </View>
                        )}
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

      {/* Commander Actions Sheet */}
      <CommanderActionsSheet
        visible={showCommanderActions}
        onClose={() => setShowCommanderActions(false)}
        onAddDrill={handleOpenAddDrill}
        onAssignWeapon={handleOpenWeaponAssignment}
        onFinishTraining={handleFinishTraining}
        colors={colors}
      />

      {/* Weapon Assignment Modal */}
      <Modal
        visible={showWeaponAssignment}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponAssignment(false)}
      >
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          {training?.team_id && (
            <WeaponAssignmentManager
              teamId={training.team_id}
              teamMembers={teamMembers}
              onClose={() => setShowWeaponAssignment(false)}
            />
          )}
        </View>
      </Modal>

      {/* Add Drill Modal */}
      <Modal
        visible={showAddDrill}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddDrill(false)}
      >
        <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Add Drill</Text>
            <TouchableOpacity onPress={() => { setShowAddDrill(false); setDrillSearch(''); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[s.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder="Search drills..."
              placeholderTextColor={colors.textMuted}
              value={drillSearch}
              onChangeText={setDrillSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {drillSearch.length > 0 && (
              <TouchableOpacity onPress={() => setDrillSearch('')}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Drill List */}
          {loadingDrills ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={colors.textMuted} />
            </View>
          ) : filteredDrills.length === 0 ? (
            <View style={s.emptyDrillsContainer}>
              <Target size={48} color={colors.textMuted} />
              <Text style={[s.emptyDrillsText, { color: colors.textMuted }]}>
                {drillSearch ? 'No drills match your search' : 'No team drills available'}
              </Text>
            </View>
          ) : (
            <ScrollView style={s.drillsListModal} contentContainerStyle={{ paddingBottom: 40 }}>
              {filteredDrills.map((drill) => {
                const goalColor = drill.drill_goal === 'grouping' ? colors.green : '#F59E0B';
                return (
                  <TouchableOpacity
                    key={drill.id}
                    style={[s.drillItemModal, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleAddDrill(drill)}
                    disabled={addingDrill}
                    activeOpacity={0.7}
                  >
                    <View style={[s.drillGoalDot, { backgroundColor: goalColor }]} />
                    <View style={s.drillItemInfo}>
                      <Text style={[s.drillItemName, { color: colors.text }]} numberOfLines={1}>
                        {drill.name}
                      </Text>
                      <Text style={[s.drillItemMeta, { color: colors.textMuted }]}>
                        {drill.distance_m}m • {drill.rounds_per_shooter} shots
                        {drill.time_limit_seconds ? ` • ${drill.time_limit_seconds}s` : ''}
                      </Text>
                    </View>
                    {addingDrill ? (
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : (
                      <Plus size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
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
  drillsList: { gap: 8 },
  drillRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  drillIndex: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  drillIndexText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  drillInfo: { flex: 1 },
  drillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  drillName: { fontSize: 15, fontWeight: '600', flex: 1 },
  drillMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  drillGoalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  drillGoalDotSmall: { width: 5, height: 5, borderRadius: 3 },
  drillGoalText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  drillMeta: { fontSize: 12 },
  drillPlayBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

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
  teamList: { gap: 8 },
  memberCard: { padding: 14, borderRadius: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  memberInitial: { fontSize: 14, fontWeight: '600' },
  memberActive: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  memberStats: { fontSize: 12 },
  // Activity timeline
  activityTimeline: { marginTop: 10, marginLeft: 48, gap: 6 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityDot: { width: 6, height: 6, borderRadius: 3 },
  activityText: { flex: 1, fontSize: 13 },
  activityTime: { fontSize: 11 },

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

  // Add Drill Button
  addDrillBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

  // Participant Results
  participantsToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  participantsToggleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  participantsList: { marginTop: 12, gap: 10 },
  participantCard: { borderRadius: 10, padding: 12 },
  participantHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  participantAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  participantInitial: { fontSize: 13, fontWeight: '600' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  participantStats: { fontSize: 12 },
  participantAccuracy: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  participantAccuracyValue: { fontSize: 14, fontWeight: '700' },
  drillBreakdown: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)', gap: 6 },
  drillBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  drillBreakdownDot: { width: 4, height: 4, borderRadius: 2 },
  drillBreakdownStatus: { width: 6, height: 6, borderRadius: 3 },
  drillBreakdownName: { flex: 1, fontSize: 13 },
  drillBreakdownAccuracy: { fontSize: 12, fontWeight: '600', minWidth: 48, textAlign: 'right' },

  // Add Drill Modal
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  emptyDrillsContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyDrillsText: { fontSize: 15 },
  drillsListModal: { flex: 1, paddingHorizontal: 20 },
  drillItemModal: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  drillGoalDot: { width: 8, height: 8, borderRadius: 4 },
  drillItemInfo: { flex: 1 },
  drillItemName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  drillItemMeta: { fontSize: 13 },
});
