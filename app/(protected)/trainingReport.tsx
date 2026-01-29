/**
 * Training Report Screen - Hebrew Military Format
 *
 * Debrief screen after training execution with editable notes.
 * Displays training metadata and allows commander to fill in:
 * - מהלך האימון ומקצים (Training flow)
 * - דגשים מקצועיים לשיפור (Improvement points)
 * - דגשים מקצועיים לשימור (Preservation points)
 * - לקחים מהאימון (Lessons learned)
 * - על מה לעבוד באימון הבא (Next training focus)
 */

import { ParticipantInsights } from '@/components/training/ParticipantInsights';
import { isSniperOrientedTeam } from '@/constants/teamSpecialties';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getEngagementParticipants } from '@/services/session/participants';
import { getTrainingSessionsWithStats } from '@/services/session/queries';
import { getSessionVerdict, type SessionVerdict } from '@/services/standards/standardsService';
import { getTrainingById, updateTrainingDebrief } from '@/services/trainingService';
import { useTeamStore } from '@/stores/teamStore';
import type { SessionWithDetails } from '@/types/session';
import type { SubType, TrainingType, UpdateTrainingDebriefInput } from '@/types/workspace';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Home,
  MapPin,
  Moon,
  RefreshCw,
  Save,
  Share2,
  Sun,
  Target,
  Trophy,
  User,
  Users,
  XCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Keyboard,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TrainingWithDrills {
  id: string;
  title: string;
  status: 'planned' | 'ongoing' | 'finished' | 'cancelled';
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  team_id: string;
  created_by?: string;
  team?: { name: string; specialty?: string | null };
  creator?: { id: string; full_name: string | null; avatar_url: string | null };
  drills: Array<{
    id: string;
    name: string;
    drill_goal?: 'grouping' | 'engagement';
    distance_m?: number;
    rounds_per_shooter?: number;
  }>;
  // Hebrew military format fields (only for sniper-oriented teams)
  location?: string | null;
  training_type?: TrainingType | null;
  sub_type?: SubType[] | null;
  training_flow_notes?: string | null;
  improvement_points?: string | null;
  preservation_points?: string | null;
  lessons_learned?: string | null;
  next_training_focus?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Day/Night Calculation
// ═══════════════════════════════════════════════════════════════════════════

function getTimeOfDay(startedAt: string | null): 'day' | 'night' {
  if (!startedAt) return 'day';
  const hour = new Date(startedAt).getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITABLE DEBRIEF SECTION
// ═══════════════════════════════════════════════════════════════════════════

function DebriefSection({
  label,
  value,
  onChange,
  placeholder,
  colors,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
}) {
  // Use RTL text alignment based on system locale
  const isRTL = I18nManager.isRTL;

  return (
    <View style={debriefStyles.section}>
      <View style={debriefStyles.labelRow}>
        <Edit3 size={14} color={colors.primary} strokeWidth={1.5} />
        <Text style={[debriefStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <TextInput
        style={[
          debriefStyles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        textAlign={isRTL ? 'right' : 'left'}
      />
    </View>
  );
}

const debriefStyles = StyleSheet.create({
  section: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HEBREW MILITARY FORMAT CARD
// ═══════════════════════════════════════════════════════════════════════════

function HebrewReportHeader({
  training,
  participantCount,
  colors,
}: {
  training: TrainingWithDrills;
  participantCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  const timeOfDay = getTimeOfDay(training.started_at);
  const TimeIcon = timeOfDay === 'day' ? Sun : Moon;
  const timeOfDayLabel = t(`training.militaryDebrief.${timeOfDay}`);

  const infoRows = [
    {
      label: t('training.militaryDebrief.date'),
      value: format(new Date(training.scheduled_at), 'dd/MM/yyyy'),
      icon: Calendar,
    },
    { label: t('training.militaryDebrief.location'), value: training.location || '—', icon: MapPin },
    { label: t('training.militaryDebrief.trainingManager'), value: training.creator?.full_name || '—', icon: User },
    { label: t('training.militaryDebrief.time'), value: timeOfDayLabel, icon: TimeIcon },
    { label: t('training.militaryDebrief.personnel'), value: participantCount.toString(), icon: Users },
    { label: t('training.militaryDebrief.trainingType'), value: training.training_type || '—', icon: Target },
    { label: t('training.militaryDebrief.subType'), value: training.sub_type?.join(', ') || '—', icon: FileText },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.hebrewCard, { backgroundColor: colors.card }]}>
        {/* Title */}
        <Text style={[styles.hebrewTitle, { color: colors.text }]}>{training.title}</Text>

        {/* Team Badge */}
        {training.team?.name && (
          <View style={[styles.teamBadge, { backgroundColor: colors.primary + '15' }]}>
            <Users size={12} color={colors.primary} />
            <Text style={[styles.teamBadgeText, { color: colors.primary }]}>{training.team.name}</Text>
          </View>
        )}

        {/* Info Grid */}
        <View style={[styles.infoGrid, { borderTopColor: colors.border }]}>
          {infoRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                index < infoRows.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.infoLabelContainer}>
                <row.icon size={14} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}:</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER STATS CARD (Legacy - kept for reference)
// ═══════════════════════════════════════════════════════════════════════════

function TrainingOverviewCard({
  training,
  sessionCount,
  colors,
}: {
  training: TrainingWithDrills;
  sessionCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  const duration = useMemo(() => {
    if (!training.started_at || !training.ended_at) return null;
    const start = new Date(training.started_at);
    const end = new Date(training.ended_at);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }, [training.started_at, training.ended_at]);

  const statusConfig = {
    planned: { label: t('training.status.planned'), color: colors.textMuted, icon: Clock },
    ongoing: { label: t('training.status.ongoing'), color: '#10B981', icon: Target },
    finished: { label: t('training.status.finished'), color: '#10B981', icon: CheckCircle2 },
    cancelled: { label: t('training.status.cancelled'), color: colors.destructive, icon: XCircle },
  };

  const { label, color, icon: Icon } = statusConfig[training.status];

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
          <Icon size={14} color={color} />
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.trainingTitle, { color: colors.text }]}>{training.title}</Text>

        {/* Date & Team */}
        <View style={styles.metaRow}>
          <Calendar size={14} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {format(new Date(training.scheduled_at), 'EEE, MMM d, yyyy')}
          </Text>
          {training.team?.name && (
            <>
              <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
              <Users size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{training.team.name}</Text>
            </>
          )}
        </View>

        {/* Quick Stats */}
        <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{training.drills.length}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>{t('training.drills')}</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{sessionCount}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>{t('training.sessions')}</Text>
          </View>
          {duration && (
            <>
              <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>{duration}</Text>
                <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>{t('training.duration')}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCESS DENIED
// ═══════════════════════════════════════════════════════════════════════════

function AccessDenied({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { t } = useTranslation();
  return (
    <View style={styles.accessDenied}>
      <View style={[styles.accessIcon, { backgroundColor: colors.destructive + '15' }]}>
        <AlertCircle size={32} color={colors.destructive} />
      </View>
      <Text style={[styles.accessTitle, { color: colors.text }]}>{t('training.commanderAccessOnly')}</Text>
      <Text style={[styles.accessDesc, { color: colors.textMuted }]}>{t('training.reportsCommanderOnly')}</Text>
      <TouchableOpacity style={[styles.accessBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
        <Text style={[styles.accessBtnText, { color: colors.text }]}>{t('common.goBack')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function TrainingReportScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ trainingId: string }>();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const activeTeamId = useTeamStore((s) => s.activeTeamId);

  const [training, setTraining] = useState<TrainingWithDrills | null>(null);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [verdicts, setVerdicts] = useState<Map<string, SessionVerdict>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debrief state (Hebrew military format)
  const [trainingFlowNotes, setTrainingFlowNotes] = useState('');
  const [improvementPoints, setImprovementPoints] = useState('');
  const [preservationPoints, setPreservationPoints] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [nextTrainingFocus, setNextTrainingFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate permissions based on loaded training (not active team)
  const canManageTraining = useMemo(() => {
    if (!training) return false;
    // Check if user is creator
    const isCreator = training.created_by === session?.user?.id;
    // Check if active team matches training team and user has manage role
    const activeTeamMatchesTraining = !training.team_id || training.team_id === activeTeamId;
    return isCreator || (canManageByRole && activeTeamMatchesTraining);
  }, [training, session?.user?.id, canManageByRole, activeTeamId]);

  // Feature flag: Hebrew military format for sniper-oriented teams
  const isSniperOriented = useMemo(() => {
    return isSniperOrientedTeam(training?.team?.specialty as any);
  }, [training?.team?.specialty]);

  // Load data
  const loadData = useCallback(async () => {
    if (!params.trainingId) {
      setError(t('training.noTrainingId'));
      setLoading(false);
      return;
    }

    try {
      const [trainingData, sessionsData] = await Promise.all([
        getTrainingById(params.trainingId),
        getTrainingSessionsWithStats(params.trainingId),
      ]);

      if (!trainingData) {
        setError(t('training.notFound'));
      } else {
        const typedTraining = trainingData as TrainingWithDrills;
        setTraining(typedTraining);

        // Initialize debrief fields from loaded data
        setTrainingFlowNotes(typedTraining.training_flow_notes || '');
        setImprovementPoints(typedTraining.improvement_points || '');
        setPreservationPoints(typedTraining.preservation_points || '');
        setLessonsLearned(typedTraining.lessons_learned || '');
        setNextTrainingFocus(typedTraining.next_training_focus || '');

        // Expand squad/group engagement sessions to include all participants
        // For squad mode, there's ONE session shared by multiple participants
        // We need to create "virtual" session entries for each participant
        const expandedSessions: SessionWithDetails[] = [];

        for (const session of sessionsData) {
          const engagementMode = session.engagement?.engagement_mode;

          if ((engagementMode === 'squad' || engagementMode === 'group') && session.engagement?.id) {
            // Fetch all participants for this engagement
            try {
              const participants = await getEngagementParticipants(session.engagement.id);

              if (participants.length > 0) {
                // Create a session entry for each participant
                for (const participant of participants) {
                  // Only include joined participants
                  if (participant.state !== 'joined') continue;

                  // Create a virtual session for this participant
                  const participantSession: SessionWithDetails = {
                    ...session,
                    // Override user info with participant info
                    user_id: participant.user_id,
                    user_full_name: participant.user_full_name || 'Unknown',
                    // Override stats with participant's contribution
                    stats:
                      participant.shots_fired != null
                        ? {
                            shots_fired: participant.shots_fired || 0,
                            hits_total: participant.hits || 0,
                            accuracy_pct:
                              participant.shots_fired && participant.shots_fired > 0
                                ? Math.round(((participant.hits || 0) / participant.shots_fired) * 100)
                                : 0,
                            target_count: 0,
                            best_dispersion_cm: null,
                            avg_distance_m: session.drill_config?.distance_m || null,
                          }
                        : undefined,
                  };
                  expandedSessions.push(participantSession);
                }
              } else {
                // No participants found, add original session
                expandedSessions.push(session);
              }
            } catch (e) {
              console.warn('[TrainingReport] Failed to fetch engagement participants:', e);
              expandedSessions.push(session);
            }
          } else {
            // Solo session or no engagement - add as-is
            expandedSessions.push(session);
          }
        }

        setSessions(expandedSessions);
        setError(null);

        // Fetch verdicts for all original sessions (not expanded)
        const verdictPromises = sessionsData.map((s: SessionWithDetails) =>
          getSessionVerdict(s.id)
            .then((v) => [s.id, v] as const)
            .catch(() => [s.id, null] as const)
        );
        const verdictResults = await Promise.all(verdictPromises);
        const verdictMap = new Map<string, SessionVerdict>();
        for (const [id, verdict] of verdictResults) {
          if (verdict) verdictMap.set(id, verdict);
        }
        setVerdicts(verdictMap);
      }
    } catch (err: any) {
      console.error('[TrainingReport] Failed to load:', err);
      setError(err.message || t('training.failedLoadReport'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.trainingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // Save debrief notes
  const saveDebrief = useCallback(async () => {
    if (!params.trainingId || !canManageTraining) return;

    setSaving(true);
    try {
      const debrief: UpdateTrainingDebriefInput = {
        training_flow_notes: trainingFlowNotes,
        improvement_points: improvementPoints,
        preservation_points: preservationPoints,
        lessons_learned: lessonsLearned,
        next_training_focus: nextTrainingFocus,
      };

      await updateTrainingDebrief(params.trainingId, debrief);
      setHasUnsavedChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error('[TrainingReport] Failed to save debrief:', err);
      Alert.alert('Error', err.message || 'Failed to save debrief notes');
    } finally {
      setSaving(false);
    }
  }, [
    params.trainingId,
    canManageTraining,
    trainingFlowNotes,
    improvementPoints,
    preservationPoints,
    lessonsLearned,
    nextTrainingFocus,
  ]);

  // Auto-save with debounce
  const scheduleAutoSave = useCallback(() => {
    setHasUnsavedChanges(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDebrief().catch(console.error);
      return undefined;
    }, 2000) as unknown as NodeJS.Timeout; // Auto-save after 2 seconds of inactivity
  }, [saveDebrief]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Track changes to debrief fields
  const handleDebriefChange = useCallback(
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  // Calculate unique participants
  const participantCount = useMemo(() => {
    const uniqueUsers = new Set(sessions.map((s) => s.user_id));
    return uniqueUsers.size;
  }, [sessions]);

  // Generate shareable report text
  const generateReportText = useCallback(() => {
    if (!training || sessions.length === 0) return '';

    const uniqueUsers = new Set(sessions.map((s) => s.user_id));
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const totalShots = sessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
    const totalHits = sessions.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);
    const avgAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

    return `📊 Training Report: ${training.title}
━━━━━━━━━━━━━━━━━━━━━
📅 ${format(new Date(training.scheduled_at), 'EEE, MMM d, yyyy')}
${training.team?.name ? `👥 Team: ${training.team.name}` : ''}

📈 Summary:
• ${uniqueUsers.size} Participants
• ${training.drills.length} Drills
• ${completedSessions.length} Sessions Completed
• ${totalShots} Total Shots
• ${avgAccuracy}% Team Accuracy

Generated by ReticleIQ`;
  }, [training, sessions]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const reportText = generateReportText();

    if (!reportText) {
      Alert.alert(t('training.noData'), t('training.noReportData'));
      return;
    }

    try {
      await Share.share({
        message: reportText,
        title: `Training Report: ${training?.title}`,
      });
    } catch (err: any) {
      console.error('[TrainingReport] Share failed:', err);
    }
  }, [generateReportText, training?.title]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('training.report')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('training.loadingReport')}</Text>
        </View>
      </View>
    );
  }

  // Error state - check BEFORE access (training must exist first)
  if (error || !training) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('training.report')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>{error || t('training.notFound')}</Text>
          <TouchableOpacity style={[styles.errorBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
            <Text style={[styles.errorBtnText, { color: colors.text }]}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Access check - commander/creator only (after we know training exists)
  if (!canManageTraining) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('training.report')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <AccessDenied colors={colors} />
      </View>
    );
  }

  // No sessions
  const hasSessions = sessions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 40 }} />

        <View style={styles.headerCenter}>
          <FileText size={16} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('training.trainingReport')}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <RefreshCw size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          {hasSessions && (
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]} onPress={handleShare}>
              <Share2 size={18} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
      >
        {/* Hebrew Military Format Header (only for sniper-oriented teams) */}
        {isSniperOriented ? (
          <HebrewReportHeader training={training} participantCount={participantCount} colors={colors} />
        ) : (
          <TrainingOverviewCard training={training} sessionCount={sessions.length} colors={colors} />
        )}

        {/* Debrief Sections (Editable) - only for sniper-oriented teams */}
        {isSniperOriented && (
          <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.debriefContainer}>
            <View style={styles.debriefHeader}>
              <Edit3 size={16} color={colors.text} />
              <Text style={[styles.debriefTitle, { color: colors.text }]}>
                {t('training.militaryDebrief.debriefSummary')}
              </Text>
              {hasUnsavedChanges && (
                <View style={[styles.unsavedBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.unsavedText, { color: colors.primary }]}>
                    {t('training.militaryDebrief.unsaved')}
                  </Text>
                </View>
              )}
              {saving && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            <View style={[styles.debriefCard, { backgroundColor: colors.card }]}>
              <DebriefSection
                label={t('training.militaryDebrief.trainingFlow')}
                value={trainingFlowNotes}
                onChange={handleDebriefChange(setTrainingFlowNotes)}
                placeholder={t('training.militaryDebrief.trainingFlowPlaceholder')}
                colors={colors}
              />
              <DebriefSection
                label={t('training.militaryDebrief.improvementPoints')}
                value={improvementPoints}
                onChange={handleDebriefChange(setImprovementPoints)}
                placeholder={t('training.militaryDebrief.improvementPlaceholder')}
                colors={colors}
              />
              <DebriefSection
                label={t('training.militaryDebrief.preservationPoints')}
                value={preservationPoints}
                onChange={handleDebriefChange(setPreservationPoints)}
                placeholder={t('training.militaryDebrief.preservationPlaceholder')}
                colors={colors}
              />
              <DebriefSection
                label={t('training.militaryDebrief.lessonsLearned')}
                value={lessonsLearned}
                onChange={handleDebriefChange(setLessonsLearned)}
                placeholder={t('training.militaryDebrief.lessonsPlaceholder')}
                colors={colors}
              />
              <DebriefSection
                label={t('training.militaryDebrief.nextTrainingFocus')}
                value={nextTrainingFocus}
                onChange={handleDebriefChange(setNextTrainingFocus)}
                placeholder={t('training.militaryDebrief.nextFocusPlaceholder')}
                colors={colors}
              />
            </View>

            {/* Manual Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: hasUnsavedChanges ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                saveDebrief();
              }}
              disabled={saving || !hasUnsavedChanges}
            >
              <Save size={16} color={hasUnsavedChanges ? colors.background : colors.textMuted} />
              <Text
                style={[styles.saveButtonText, { color: hasUnsavedChanges ? colors.background : colors.textMuted }]}
              >
                {saving ? t('training.militaryDebrief.saving') : t('training.militaryDebrief.saveDebrief')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* No Sessions State */}
        {!hasSessions && (
          <Animated.View entering={FadeIn.delay(100).duration(300)}>
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Users size={24} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('training.noParticipantData')}</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                {training.status === 'planned' ? t('training.notStartedYet') : t('training.noSessionsRecorded')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Standards Verdicts - only show if there are verdicts with actual standards */}
        {(() => {
          const evaluatedVerdicts = Array.from(verdicts.entries()).filter(([_, v]) => v.base_standard_id);
          if (!hasSessions || evaluatedVerdicts.length === 0) return null;

          const passedCount = evaluatedVerdicts.filter(([_, v]) => v.passed).length;
          const failedCount = evaluatedVerdicts.length - passedCount;
          const passRate = Math.round((passedCount / evaluatedVerdicts.length) * 100);

          return (
            <Animated.View entering={FadeIn.delay(50).duration(300)} style={styles.insightsSection}>
              <View style={styles.sectionHeader}>
                <CheckCircle2 size={16} color={colors.textMuted} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('training.performanceStandards')}</Text>
              </View>

              {/* Summary Card */}
              <View style={[styles.standardsSummary, { backgroundColor: colors.card }]}>
                <View style={styles.standardsSummaryRow}>
                  <View style={styles.standardsStat}>
                    <Text style={[styles.standardsStatValue, { color: colors.green }]}>{passedCount}</Text>
                    <Text style={[styles.standardsStatLabel, { color: colors.textMuted }]}>{t('training.passed')}</Text>
                  </View>
                  <View style={[styles.standardsDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.standardsStat}>
                    <Text style={[styles.standardsStatValue, { color: colors.red }]}>{failedCount}</Text>
                    <Text style={[styles.standardsStatLabel, { color: colors.textMuted }]}>{t('training.failed')}</Text>
                  </View>
                  <View style={[styles.standardsDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.standardsStat}>
                    <Text style={[styles.standardsStatValue, { color: passRate >= 50 ? colors.green : colors.red }]}>
                      {passRate}%
                    </Text>
                    <Text style={[styles.standardsStatLabel, { color: colors.textMuted }]}>
                      {t('training.passRate')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Individual Verdicts */}
              <View style={styles.verdictsGrid}>
                {evaluatedVerdicts.map(([sessionId, verdict]) => {
                  const session = sessions.find((s) => s.id === sessionId);
                  const participantName = session?.user_full_name || t('common.unknown');
                  const drillName = session?.drill_name || session?.drill_config?.name || t('training.unknownDrill');

                  return (
                    <View
                      key={sessionId}
                      style={[
                        styles.verdictCard,
                        {
                          backgroundColor: colors.card,
                          borderLeftColor: verdict.passed ? colors.green : colors.red,
                        },
                      ]}
                    >
                      <View style={styles.verdictCardHeader}>
                        <View style={styles.verdictCardInfo}>
                          <Text style={[styles.verdictCardName, { color: colors.text }]} numberOfLines={1}>
                            {participantName}
                          </Text>
                          <Text style={[styles.verdictCardDrill, { color: colors.textMuted }]} numberOfLines={1}>
                            {drillName}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.verdictBadge,
                            { backgroundColor: verdict.passed ? colors.green + '20' : colors.red + '20' },
                          ]}
                        >
                          {verdict.passed ? (
                            <CheckCircle2 size={14} color={colors.green} />
                          ) : (
                            <XCircle size={14} color={colors.red} />
                          )}
                          <Text
                            style={[styles.verdictBadgeText, { color: verdict.passed ? colors.green : colors.red }]}
                          >
                            {verdict.passed ? t('training.pass') : t('training.fail')}
                          </Text>
                        </View>
                      </View>

                      {/* Metrics Row */}
                      <View style={styles.verdictMetrics}>
                        {verdict.effective_grouping_cm && (
                          <Text style={[styles.verdictMetric, { color: colors.textMuted }]}>
                            {verdict.actual_grouping_cm}cm / {verdict.effective_grouping_cm}cm
                          </Text>
                        )}
                        {verdict.effective_accuracy_pct && (
                          <Text style={[styles.verdictMetric, { color: colors.textMuted }]}>
                            {verdict.actual_accuracy_pct}% / {verdict.effective_accuracy_pct}%
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          );
        })()}

        {/* Participant Insights */}
        {hasSessions && (
          <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.insightsSection}>
            <View style={styles.sectionHeader}>
              <Trophy size={16} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('training.participantPerformance')}</Text>
            </View>
            <ParticipantInsights teamSessions={sessions} drills={training.drills} />
          </Animated.View>
        )}

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {t('training.reportGenerated', { time: formatDistanceToNow(new Date(), { addSuffix: true }) })}
        </Text>
      </ScrollView>

      {/* Bottom Actions - RETURN TO TRAINING is primary */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        {/* Primary: Return to Training */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.text }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Use dismissAll + replace to clear any stacked screens
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace({
              pathname: '/(protected)/trainingDetail',
              params: { id: training.id },
            });
          }}
          activeOpacity={0.85}
        >
          <ArrowRight size={18} color={colors.background} />
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>{t('training.returnToTraining')}</Text>
        </TouchableOpacity>

        {/* Secondary: Exit to Home (small, subtle) */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Clear stack and go to home
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace('/(protected)/(tabs)');
          }}
          activeOpacity={0.6}
        >
          <Home size={14} color={colors.textMuted} />
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>{t('training.exitToHome')}</Text>
        </TouchableOpacity>
      </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },

  // Hebrew Military Format Card
  hebrewCard: {
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  hebrewTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoGrid: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  // Debrief Section
  debriefContainer: {
    gap: 12,
  },
  debriefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debriefTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unsavedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unsavedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  debriefCard: {
    padding: 16,
    borderRadius: 14,
    gap: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Overview Card (Legacy)
  overviewCard: {
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trainingTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
  quickStats: {
    flexDirection: 'row',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
  },

  // Insights Section
  insightsSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    padding: 32,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
  },
  errorBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Access Denied
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  accessIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  accessTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  accessDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  accessBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  accessBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Standards Summary
  standardsSummary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  standardsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  standardsStat: {
    alignItems: 'center',
    flex: 1,
  },
  standardsStatValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  standardsStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  standardsDivider: {
    width: 1,
    height: 32,
  },

  // Verdicts Grid
  verdictsGrid: {
    gap: 8,
  },
  verdictCard: {
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
  },
  verdictCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  verdictCardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  verdictCardDrill: {
    fontSize: 12,
    marginTop: 2,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verdictMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  verdictMetric: {
    fontSize: 11,
  },

  // Footer
  footer: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 16,
  },

  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
