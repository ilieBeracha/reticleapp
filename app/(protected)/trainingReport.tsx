/**
 * Training Report Screen
 *
 * Displays training summary and participant performance after training execution.
 * Includes weather conditions, biometrics data, and PDF export functionality.
 */

import { ParticipantInsights } from '@/components/training/ParticipantInsights';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { shareTrainingReportPDF, type TrainingReportData } from '@/services/report/pdfGenerator';
import { getEngagementParticipants } from '@/services/session/participants';
import {
  aggregateTrainingWeather,
  getTrainingBiometrics,
  getTrainingSessionsWithStats,
  type TrainingBiometricsSummary,
  type TrainingWeatherSummary,
} from '@/services/session/queries';
import { getSessionVerdict, type SessionVerdict } from '@/services/standards/standardsService';
import { getTrainingById } from '@/services/trainingService';
import { useTeamStore } from '@/stores/teamStore';
import type { SessionWithDetails } from '@/types/session';
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
  CloudRain,
  FileDown,
  FileText,
  Heart,
  Home,
  RefreshCw,
  Share2,
  Target,
  Thermometer,
  Trophy,
  Users,
  Wind,
  XCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
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
  team?: { name: string };
  creator?: { id: string; full_name: string | null; avatar_url: string | null };
  drills: Array<{
    id: string;
    name: string;
    drill_goal?: 'grouping' | 'engagement';
    distance_m?: number;
    rounds_per_shooter?: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER STATS CARD
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
// WEATHER CONDITIONS CARD
// ═══════════════════════════════════════════════════════════════════════════

function WeatherConditionsCard({
  weather,
  colors,
}: {
  weather: TrainingWeatherSummary;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();

  const getWindImpactColor = (impact: string | null) => {
    switch (impact) {
      case 'calm':
        return colors.green;
      case 'light':
        return '#22C55E';
      case 'moderate':
        return '#F59E0B';
      case 'strong':
        return colors.red;
      default:
        return colors.textMuted;
    }
  };

  const getWindImpactLabel = (impact: string | null) => {
    switch (impact) {
      case 'calm':
        return t('training.windCalm');
      case 'light':
        return t('training.windLight');
      case 'moderate':
        return t('training.windModerate');
      case 'strong':
        return t('training.windStrong');
      default:
        return '-';
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'ideal':
        return colors.green;
      case 'good':
        return '#22C55E';
      case 'challenging':
        return '#F59E0B';
      case 'difficult':
        return '#F97316';
      case 'extreme':
        return colors.red;
      default:
        return colors.textMuted;
    }
  };

  const getSeverityLabel = (severity: string | null) => {
    switch (severity) {
      case 'ideal':
        return t('training.conditionIdeal');
      case 'good':
        return t('training.conditionGood');
      case 'challenging':
        return t('training.conditionChallenging');
      case 'difficult':
        return t('training.conditionDifficult');
      case 'extreme':
        return t('training.conditionExtreme');
      default:
        return '-';
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(50).duration(300)}>
      <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
        <View style={styles.weatherHeader}>
          <View style={styles.weatherTitleRow}>
            <CloudRain size={16} color={colors.textMuted} />
            <Text style={[styles.weatherTitle, { color: colors.text }]}>{t('training.weatherConditions')}</Text>
          </View>
          <Text style={[styles.weatherSubtitle, { color: colors.textMuted }]}>
            {t('training.sessionsWithData', { count: weather.sessionsWithWeather })}
          </Text>
        </View>

        <View style={styles.weatherGrid}>
          {/* Temperature */}
          <View style={styles.weatherItem}>
            <View style={[styles.weatherIconBg, { backgroundColor: colors.primary + '15' }]}>
              <Thermometer size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.weatherValue, { color: colors.text }]}>
                {weather.avgTemperatureC !== null ? `${weather.avgTemperatureC}°C` : '-'}
              </Text>
              <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>{t('training.temperature')}</Text>
            </View>
          </View>

          {/* Humidity */}
          <View style={styles.weatherItem}>
            <View style={[styles.weatherIconBg, { backgroundColor: '#3B82F6' + '15' }]}>
              <CloudRain size={18} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.weatherValue, { color: colors.text }]}>
                {weather.avgHumidity !== null ? `${weather.avgHumidity}%` : '-'}
              </Text>
              <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>{t('training.humidity')}</Text>
            </View>
          </View>

          {/* Wind */}
          <View style={styles.weatherItem}>
            <View style={[styles.weatherIconBg, { backgroundColor: getWindImpactColor(weather.maxWindImpact) + '15' }]}>
              <Wind size={18} color={getWindImpactColor(weather.maxWindImpact)} />
            </View>
            <View>
              <Text style={[styles.weatherValue, { color: colors.text }]}>
                {weather.avgWindSpeedMps !== null ? `${weather.avgWindSpeedMps} m/s` : '-'}
                {weather.dominantWindDirection ? ` ${weather.dominantWindDirection}` : ''}
              </Text>
              <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>{t('training.wind')}</Text>
            </View>
          </View>

          {/* Wind Impact */}
          <View style={styles.weatherItem}>
            <View style={[styles.weatherIconBg, { backgroundColor: getWindImpactColor(weather.maxWindImpact) + '15' }]}>
              <Target size={18} color={getWindImpactColor(weather.maxWindImpact)} />
            </View>
            <View>
              <View
                style={[styles.weatherBadge, { backgroundColor: getWindImpactColor(weather.maxWindImpact) + '20' }]}
              >
                <Text style={[styles.weatherBadgeText, { color: getWindImpactColor(weather.maxWindImpact) }]}>
                  {getWindImpactLabel(weather.maxWindImpact)}
                </Text>
              </View>
              <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>{t('training.windImpact')}</Text>
            </View>
          </View>
        </View>

        {/* Condition Summary */}
        {weather.dominantCondition && (
          <View style={[styles.weatherConditionRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.weatherConditionLabel, { color: colors.textMuted }]}>{weather.dominantCondition}</Text>
            <View
              style={[styles.weatherBadge, { backgroundColor: getSeverityColor(weather.maxConditionSeverity) + '20' }]}
            >
              <Text style={[styles.weatherBadgeText, { color: getSeverityColor(weather.maxConditionSeverity) }]}>
                {getSeverityLabel(weather.maxConditionSeverity)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOMETRICS SUMMARY CARD
// ═══════════════════════════════════════════════════════════════════════════

function BiometricsSummaryCard({
  biometrics,
  colors,
}: {
  biometrics: TrainingBiometricsSummary;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(300)}>
      <View style={[styles.biometricsCard, { backgroundColor: colors.card }]}>
        <View style={styles.biometricsHeader}>
          <View style={styles.biometricsTitleRow}>
            <Heart size={16} color={colors.red} />
            <Text style={[styles.biometricsTitle, { color: colors.text }]}>{t('training.teamBiometrics')}</Text>
          </View>
          <Text style={[styles.biometricsSubtitle, { color: colors.textMuted }]}>
            {t('training.sessionsWithData', { count: biometrics.sessionsWithBiometrics })}
          </Text>
        </View>

        <View style={styles.biometricsGrid}>
          {/* Avg Heart Rate */}
          <View style={styles.biometricsStat}>
            <Text style={[styles.biometricsStatValue, { color: colors.red }]}>{biometrics.teamAvgHR ?? '-'}</Text>
            <Text style={[styles.biometricsStatUnit, { color: colors.textMuted }]}>bpm</Text>
            <Text style={[styles.biometricsStatLabel, { color: colors.textMuted }]}>{t('training.avgHeartRate')}</Text>
          </View>

          {/* HR Range */}
          <View style={styles.biometricsStat}>
            <Text style={[styles.biometricsStatValue, { color: colors.text }]}>
              {biometrics.teamHRRange ? `${biometrics.teamHRRange.min}-${biometrics.teamHRRange.max}` : '-'}
            </Text>
            <Text style={[styles.biometricsStatUnit, { color: colors.textMuted }]}>bpm</Text>
            <Text style={[styles.biometricsStatLabel, { color: colors.textMuted }]}>
              {t('training.heartRateRange')}
            </Text>
          </View>

          {/* Breath Rate */}
          <View style={styles.biometricsStat}>
            <Text style={[styles.biometricsStatValue, { color: '#3B82F6' }]}>
              {biometrics.teamAvgBreathRate ?? '-'}
            </Text>
            <Text style={[styles.biometricsStatUnit, { color: colors.textMuted }]}>/min</Text>
            <Text style={[styles.biometricsStatLabel, { color: colors.textMuted }]}>{t('training.avgBreathRate')}</Text>
          </View>

          {/* Steadiness */}
          <View style={styles.biometricsStat}>
            <Text style={[styles.biometricsStatValue, { color: colors.green }]}>
              {biometrics.teamAvgSteadiness ?? '-'}
            </Text>
            <Text style={[styles.biometricsStatUnit, { color: colors.textMuted }]}>/100</Text>
            <Text style={[styles.biometricsStatLabel, { color: colors.textMuted }]}>{t('training.avgSteadiness')}</Text>
          </View>
        </View>

        {/* Flinches Row */}
        {biometrics.totalFlinches > 0 && (
          <View style={[styles.flinchRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.flinchLabel, { color: colors.textMuted }]}>{t('training.totalFlinches')}</Text>
            <View style={[styles.flinchBadge, { backgroundColor: colors.red + '15' }]}>
              <Text style={[styles.flinchValue, { color: colors.red }]}>{biometrics.totalFlinches}</Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT MENU MODAL
// ═══════════════════════════════════════════════════════════════════════════

function ExportMenuModal({
  visible,
  onClose,
  onShareText,
  onExportPDF,
  exporting,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onShareText: () => void;
  onExportPDF: () => void;
  exporting: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.exportMenu, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.exportMenuTitle, { color: colors.text }]}>{t('training.exportOptions')}</Text>

          <TouchableOpacity
            style={[styles.exportMenuItem, { borderBottomColor: colors.border }]}
            onPress={onShareText}
            disabled={exporting}
          >
            <Share2 size={20} color={colors.text} />
            <Text style={[styles.exportMenuItemText, { color: colors.text }]}>{t('training.shareText')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportMenuItem} onPress={onExportPDF} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FileDown size={20} color={colors.primary} />
            )}
            <Text style={[styles.exportMenuItemText, { color: exporting ? colors.textMuted : colors.primary }]}>
              {exporting ? t('training.generatingPDF') : t('training.exportPDF')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
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
  const [weather, setWeather] = useState<TrainingWeatherSummary | null>(null);
  const [biometrics, setBiometrics] = useState<TrainingBiometricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate permissions based on loaded training (not active team)
  const canManageTraining = useMemo(() => {
    if (!training) return false;
    // Check if user is creator
    const isCreator = training.created_by === session?.user?.id;
    // Check if active team matches training team and user has manage role
    const activeTeamMatchesTraining = !training.team_id || training.team_id === activeTeamId;
    return isCreator || (canManageByRole && activeTeamMatchesTraining);
  }, [training, session?.user?.id, canManageByRole, activeTeamId]);

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

        // Aggregate weather data from sessions
        const weatherSummary = aggregateTrainingWeather(sessionsData);
        setWeather(weatherSummary);

        // Fetch biometrics data from session targets
        const sessionIds = sessionsData.map((s: SessionWithDetails) => s.id);
        const biometricsSummary = await getTrainingBiometrics(sessionIds);
        setBiometrics(biometricsSummary);

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

  const handleShareText = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExportMenu(false);
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
  }, [generateReportText, training?.title, t]);

  const handleExportPDF = useCallback(async () => {
    if (!training || !weather || !biometrics) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExportMenu(false);
    setExportingPDF(true);

    try {
      const reportData: TrainingReportData = {
        training: {
          id: training.id,
          title: training.title,
          status: training.status,
          scheduled_at: training.scheduled_at,
          started_at: training.started_at,
          ended_at: training.ended_at,
          team_name: training.team?.name,
          drills: training.drills,
        },
        sessions,
        weather,
        biometrics,
        verdicts,
      };

      await shareTrainingReportPDF(reportData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error('[TrainingReport] PDF export failed:', err);
      Alert.alert(t('common.error'), err.message || t('training.failedLoadReport'));
    } finally {
      setExportingPDF(false);
    }
  }, [training, sessions, weather, biometrics, verdicts, t]);

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
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.card }]}
              onPress={() => setShowExportMenu(true)}
            >
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
        {/* Training Overview */}
        <TrainingOverviewCard training={training} sessionCount={sessions.length} colors={colors} />

        {/* Weather Conditions */}
        {weather && weather.sessionsWithWeather > 0 && <WeatherConditionsCard weather={weather} colors={colors} />}

        {/* Biometrics Summary */}
        {biometrics && biometrics.sessionsWithBiometrics > 0 && (
          <BiometricsSummaryCard biometrics={biometrics} colors={colors} />
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

      {/* Export Menu Modal */}
      <ExportMenuModal
        visible={showExportMenu}
        onClose={() => setShowExportMenu(false)}
        onShareText={handleShareText}
        onExportPDF={handleExportPDF}
        exporting={exportingPDF}
        colors={colors}
      />
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

  // Overview Card
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

  // Weather Card
  weatherCard: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  weatherSubtitle: {
    fontSize: 12,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '47%',
  },
  weatherIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  weatherLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  weatherBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  weatherBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weatherConditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  weatherConditionLabel: {
    fontSize: 13,
  },

  // Biometrics Card
  biometricsCard: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  biometricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biometricsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biometricsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  biometricsSubtitle: {
    fontSize: 12,
  },
  biometricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  biometricsStat: {
    alignItems: 'center',
    flex: 1,
  },
  biometricsStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  biometricsStatUnit: {
    fontSize: 11,
    marginTop: -2,
  },
  biometricsStatLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  flinchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flinchLabel: {
    fontSize: 13,
  },
  flinchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  flinchValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Export Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportMenu: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 14,
    padding: 20,
  },
  exportMenuTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exportMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
