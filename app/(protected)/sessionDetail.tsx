/**
 * Session Detail Sheet
 *
 * Shows session summary, stats, and image previews.
 * Opens as a formSheet modal above tabs.
 */
import { useSessionTimeline } from '@/components/session/useSessionTimeline';
import { WeatherStrip } from '@/components/session/WeatherDisplay';
import { isEngagementPaper, isGroupingPaper, isPaperTarget } from '@/constants/drill';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { getSessionInsights, triggerInsightGeneration, type SessionInsight } from '@/services/insights/insightService';
import type { ShotDetail } from '@/services/session/timelineService';
import type { DecodedWeather } from '@/types/session.watch';
import {
  calculateSessionStats,
  getSessionById,
  getSessionTargetsWithResults,
  type SessionStats,
  type SessionTargetWithResults,
  type SessionWithDetails,
} from '@/services/sessionService';
import { isGroupingSession } from '@/utils/drillGoal';
import { format, intervalToDuration } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Crosshair as AimIcon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Crosshair,
  Focus,
  Heart,
  Lightbulb,
  Ruler,
  Scan,
  Settings2,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Watch,
  Wind,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 64) / 3;

export default function SessionDetailScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuth();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<SessionInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Load timeline data from DB (saved independently by garminStore)
  const {
    timeline,
    hasTimeline,
    loading: timelineLoading,
  } = useSessionTimeline({
    sessionId: sessionId ?? '',
  });

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [sessionData, sessionStats, sessionTargets] = await Promise.all([
          getSessionById(sessionId),
          calculateSessionStats(sessionId),
          getSessionTargetsWithResults(sessionId),
        ]);
        setSession(sessionData);
        setStats(sessionStats);
        setTargets(sessionTargets);
      } catch (error) {
        console.error('Failed to load session details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  // Load insights (separate call - generates on-demand if none exist)
  useEffect(() => {
    if (!sessionId || !session || session.status !== 'completed') return;

    const loadInsights = async () => {
      setInsightsLoading(true);
      try {
        // First try to get existing insights
        let sessionInsights = await getSessionInsights(sessionId);
        console.log('[SessionDetail] Existing insights:', sessionInsights.length);

        // If no insights exist, trigger Edge Function to generate them
        if (sessionInsights.length === 0) {
          console.log('[SessionDetail] No insights found, triggering Edge Function...');
          const result = await triggerInsightGeneration(sessionId);
          console.log('[SessionDetail] Edge Function result:', result);

          if (result.success) {
            // Wait briefly for DB to sync, then reload insights
            await new Promise((resolve) => setTimeout(resolve, 500));
            sessionInsights = await getSessionInsights(sessionId);
          }
        }

        setInsights(sessionInsights);
      } catch (error) {
        console.error('[SessionDetail] Failed to load/generate insights:', error);
      } finally {
        setInsightsLoading(false);
      }
    };

    loadInsights();
  }, [sessionId, session?.status]);

  // Get images from targets
  const targetImages = useMemo(() => {
    return targets
      .filter((t) => t.paper_result?.scanned_image_url)
      .map((t) => ({
        id: t.id,
        url: t.paper_result!.scanned_image_url!,
        sequence: t.sequence_in_session,
        hits: t.paper_result?.hits_total ?? 0,
        shots: t.paper_result?.bullets_fired ?? 0,
        isGrouping: isGroupingPaper(t.paper_result?.paper_type),
        dispersion: t.paper_result?.dispersion_cm,
        actualShotsDeclared: t.paper_result?.actual_shots_declared ?? null,
      }));
  }, [targets]);

  // Check if any scanned targets are missing actual shots declaration
  const hasScannedWithoutDeclaration = useMemo(() => {
    return targets.some(
      (t) =>
        isPaperTarget(t.target_type) &&
        isEngagementPaper(t.paper_result?.paper_type) &&
        !!t.paper_result?.scanned_image_url &&
        !t.paper_result?.actual_shots_declared
    );
  }, [targets]);

  // Count scan vs manual entries
  const entryBreakdown = useMemo(() => {
    let scanned = 0;
    let manual = 0;
    targets.forEach((t) => {
      if (isPaperTarget(t.target_type) && isEngagementPaper(t.paper_result?.paper_type)) {
        if (t.paper_result?.scanned_image_url) scanned++;
        else manual++;
      }
    });
    return { scanned, manual };
  }, [targets]);

  // Extract watch/biometrics data from targets
  const watchData = useMemo(() => {
    const watchTarget = targets.find((t) => t.target_data && (t.target_data as any).source === 'garmin_watch');
    if (!watchTarget) return null;

    const data = watchTarget.target_data as any;
    return {
      heartRate: data.heart_rate as { avg?: number; max?: number; min?: number } | undefined,
      avgBreathRate: data.avg_breath_rate as number | undefined,
      biometrics: data.biometrics as
        | {
            summary?: any;
            hr_timeline?: [number, number, number][];
            breath_timeline?: [number, number, number][];
            shot_biometrics?: any[];
          }
        | undefined,
      steadiness: data.steadiness as
        | {
            avg_score?: number;
            shot_count?: number;
            trend?: string;
            shots?: any[];
          }
        | undefined,
      splits: data.splits as number[] | undefined,
      avgSplitMs: data.avg_split_ms as number | undefined,
      fastestSplitMs: data.fastest_split_ms as number | undefined,
      slowestSplitMs: data.slowest_split_ms as number | undefined,
      shotTimestamps: data.shot_timestamps as number[] | undefined,
      durationMs: data.duration_ms as number | undefined,
    };
  }, [targets]);

  // Decode weather from session (OpenWeatherMap or stored data)
  const weather: DecodedWeather | null = useMemo(() => {
    if (!session?.weather) return null;

    const sessionWeather = session.weather as any;
    // If it's SessionWeatherData format (snake_case), convert to DecodedWeather
    if (sessionWeather.temperature_c !== undefined) {
      return {
        temperatureC: sessionWeather.temperature_c,
        temperatureF: sessionWeather.temperature_f,
        humidity: sessionWeather.humidity,
        windSpeedMps: sessionWeather.wind_speed_mps,
        windSpeedMph: sessionWeather.wind_speed_mph,
        windSpeedKph: sessionWeather.wind_speed_kph,
        windDirection: sessionWeather.wind_direction,
        windBearing: sessionWeather.wind_bearing,
        pressureHpa: sessionWeather.pressure_hpa,
        condition: sessionWeather.condition,
        windImpact: sessionWeather.wind_impact,
        conditionSeverity: sessionWeather.condition_severity,
      } as DecodedWeather;
    }
    // If already in DecodedWeather format (camelCase)
    if (sessionWeather.temperatureC !== undefined) {
      return sessionWeather as DecodedWeather;
    }
    return null;
  }, [session?.weather]);

  // ============================================================================
  // TIMELINE INSIGHTS (from saved timeline data)
  // ============================================================================
  const timelineInsights = useMemo(() => {
    if (!timeline || !timeline.shotDetails || timeline.shotDetails.length < 2) {
      return null;
    }

    const shots = timeline.shotDetails;
    const steadinessSum = shots.reduce((sum: number, s: ShotDetail) => sum + (s.steadiness || 0), 0);
    const hasRealSteadiness = steadinessSum > 0;

    // Performance scores (use steadiness or inverted stress as calmness)
    const scores = hasRealSteadiness
      ? shots.map((s: ShotDetail) => s.steadiness)
      : shots.map((s: ShotDetail) => Math.max(0, 100 - s.stress));

    const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);

    // Trend analysis (compare first half vs second half)
    const half = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, half).reduce((a: number, b: number) => a + b, 0) / half;
    const secondHalf = scores.slice(half).reduce((a: number, b: number) => a + b, 0) / (scores.length - half);
    const trend: 'improving' | 'declining' | 'stable' =
      secondHalf - firstHalf > 5 ? 'improving' : secondHalf - firstHalf < -5 ? 'declining' : 'stable';

    // Breath quality
    const pauseCount = shots.filter((s: ShotDetail) => s.breathPhase === 'pause').length;
    const exhaleCount = shots.filter((s: ShotDetail) => s.breathPhase === 'exhale').length;
    const inhaleCount = shots.filter((s: ShotDetail) => s.breathPhase === 'inhale').length;
    const pausePct = Math.round((pauseCount / shots.length) * 100);
    const exhalePct = Math.round((exhaleCount / shots.length) * 100);
    const inhalePct = Math.round((inhaleCount / shots.length) * 100);

    // Best/worst shots
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const bestIdx = scores.indexOf(maxScore);
    const worstIdx = scores.indexOf(minScore);

    // Flinch count
    const flinchCount = shots.filter((s: ShotDetail) => s.flinch).length;

    return {
      scores,
      avgScore,
      trend,
      pausePct,
      exhalePct,
      inhalePct,
      usingStress: !hasRealSteadiness,
      bestShot: shots[bestIdx].shotNumber,
      worstShot: shots[worstIdx].shotNumber,
      bestScore: maxScore,
      worstScore: minScore,
      flinchCount,
      shots,
    };
  }, [timeline]);

  // Calculate session duration
  const getDuration = useCallback(() => {
    if (!session) return null;
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const duration = intervalToDuration({ start, end });

    const parts = [];
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    if (duration.seconds && !duration.hours) parts.push(`${duration.seconds}s`);

    return parts.join(' ') || '< 1m';
  }, [session]);

  const handleViewFullSession = () => {
    if (session) {
      router.back();
      setTimeout(() => {
        router.push(`/(protected)/activeSession?sessionId=${session.id}`);
      }, 100);
    }
  };

  if (loading) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.card }]}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('session.loadingSession')}</Text>
        </View>
      </ScrollView>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('session.sessionNotFound')}</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const title = session.drill_name || session.training_title || t('session.soloPractice');
  const source = session.team_name || t('session.personal');
  const sessionDate = format(new Date(session.started_at), 'MMM d, yyyy');
  const sessionTime = format(new Date(session.started_at), 'HH:mm');
  const isCompleted = session.status === 'completed';

  // Determine if this is a grouping or engagement session
  const isGroupingDrill = isGroupingSession(session);

  // Check if this is a squad/group engagement (hide certain config fields for these)
  const engagementMode = session.engagement?.engagement_mode;
  const isSquadOrGroup = engagementMode === 'squad' || engagementMode === 'group';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View
            style={[
              styles.sourceTag,
              { backgroundColor: session.team_id ? `${colors.green}22` : `${colors.indigo}22` },
            ]}
          >
            {session.team_id ? <Users size={12} color={colors.green} /> : <Target size={12} color={colors.indigo} />}
            <Text style={[styles.sourceText, { color: session.team_id ? colors.green : colors.indigo }]}>{source}</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: isCompleted ? `${colors.green}22` : `${colors.orange}22` }]}
          >
            <Text style={[styles.statusText, { color: isCompleted ? colors.green : colors.orange }]}>
              {isCompleted ? t('session.completed') : t('session.inProgress')}
            </Text>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{sessionDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{sessionTime}</Text>
          </View>
          {getDuration() && (
            <View style={styles.metaItem}>
              <Zap size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{getDuration()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Weather Conditions Strip (compact, top of page) */}
      {weather && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.weatherStripSection}>
          <WeatherStrip weather={weather} />
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SESSION CONTEXT - What was being done */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.duration(250)} style={styles.contextSection}>
        <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Row 1: Weapon & Position */}
          <View style={styles.contextRow}>
            {session.weapon_name && (
              <View style={styles.contextItem}>
                <View style={[styles.contextIconBg, { backgroundColor: `${colors.orange}15` }]}>
                  <AimIcon size={14} color={colors.orange} />
                </View>
                <View style={styles.contextItemContent}>
                  <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.weapon')}</Text>
                  <Text style={[styles.contextValue, { color: colors.text }]} numberOfLines={1}>
                    {session.weapon_name}
                  </Text>
                </View>
              </View>
            )}

            {/* Hide position for squad/group - often just defaults */}
            {!isSquadOrGroup && session.drill_config?.position && (
              <View style={styles.contextItem}>
                <View style={[styles.contextIconBg, { backgroundColor: `${colors.blue}15` }]}>
                  <Focus size={14} color={colors.blue} />
                </View>
                <View style={styles.contextItemContent}>
                  <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.position')}</Text>
                  <Text style={[styles.contextValue, { color: colors.text }]} numberOfLines={1}>
                    {session.drill_config.position.charAt(0).toUpperCase() + session.drill_config.position.slice(1)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Row 2: Distance & Drill Goal - hide distance for squad/group (often defaults) */}
          <View style={styles.contextRow}>
            {!isSquadOrGroup && session.drill_config?.distance_m && (
              <View style={styles.contextItem}>
                <View style={[styles.contextIconBg, { backgroundColor: `${colors.indigo}15` }]}>
                  <Ruler size={14} color={colors.indigo} />
                </View>
                <View style={styles.contextItemContent}>
                  <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.distance')}</Text>
                  <Text style={[styles.contextValue, { color: colors.text }]}>
                    {t('session.distanceMeters', { distance: session.drill_config.distance_m })}
                  </Text>
                </View>
              </View>
            )}

            {session.drill_config?.drill_goal && (
              <View style={styles.contextItem}>
                <View
                  style={[
                    styles.contextIconBg,
                    {
                      backgroundColor: isGroupingDrill ? `${colors.green}15` : `${colors.primary}15`,
                    },
                  ]}
                >
                  <Target size={14} color={isGroupingDrill ? colors.green : colors.primary} />
                </View>
                <View style={styles.contextItemContent}>
                  <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.sessionType')}</Text>
                  <Text style={[styles.contextValue, { color: colors.text }]}>
                    {isGroupingDrill ? t('session.grouping') : t('session.engagement')}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Row 3: Measurement Method & Time Limit */}
          <View style={styles.contextRow}>
            <View style={styles.contextItem}>
              <View
                style={[
                  styles.contextIconBg,
                  {
                    backgroundColor: session.watch_controlled ? `${colors.green}15` : `${colors.textMuted}15`,
                  },
                ]}
              >
                {session.watch_controlled ? (
                  <Watch size={14} color={colors.green} />
                ) : (
                  <Scan size={14} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.contextItemContent}>
                <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.measured')}</Text>
                <Text style={[styles.contextValue, { color: colors.text }]}>
                  {session.watch_controlled ? t('session.watchAssisted') : t('session.manualEntry')}
                </Text>
              </View>
            </View>

            {session.drill_config?.time_limit_seconds && (
              <View style={styles.contextItem}>
                <View style={[styles.contextIconBg, { backgroundColor: `${colors.red}15` }]}>
                  <Timer size={14} color={colors.red} />
                </View>
                <View style={styles.contextItemContent}>
                  <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.timeLimit')}</Text>
                  <Text style={[styles.contextValue, { color: colors.text }]}>
                    {session.drill_config.time_limit_seconds >= 60
                      ? `${Math.floor(session.drill_config.time_limit_seconds / 60)}m ${session.drill_config.time_limit_seconds % 60 > 0 ? `${session.drill_config.time_limit_seconds % 60}s` : ''}`
                      : `${session.drill_config.time_limit_seconds}s`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Bullets per shooter - hide for squad/group engagements (often just defaults) */}
          {!isSquadOrGroup &&
            session.drill_config?.rounds_per_shooter &&
            session.drill_config.rounds_per_shooter > 0 && (
              <View style={styles.contextRow}>
                <View style={styles.contextItem}>
                  <View style={[styles.contextIconBg, { backgroundColor: `${colors.textMuted}15` }]}>
                    <Target size={14} color={colors.textMuted} />
                  </View>
                  <View style={styles.contextItemContent}>
                    <Text style={[styles.contextLabel, { color: colors.textMuted }]}>{t('session.bullets')}</Text>
                    <Text style={[styles.contextValue, { color: colors.text }]}>
                      {session.drill_config.rounds_per_shooter} {t('session.perShooter')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {/* Input Method Preference (if set) */}
          {session.drill_config?.input_method && (
            <View
              style={[
                styles.inputMethodBadge,
                {
                  backgroundColor:
                    session.drill_config.input_method === 'scan' ? `${colors.primary}12` : `${colors.blue}12`,
                },
              ]}
            >
              <Settings2
                size={12}
                color={session.drill_config.input_method === 'scan' ? colors.primary : colors.blue}
              />
              <Text
                style={[
                  styles.inputMethodText,
                  {
                    color: session.drill_config.input_method === 'scan' ? colors.primary : colors.blue,
                  },
                ]}
              >
                {session.drill_config.input_method === 'scan' ? 'AI Scan preferred' : 'Manual entry preferred'}
              </Text>
            </View>
          )}

          {/* Training Context (if part of a training) */}
          {session.training_id && session.training_title && (
            <TouchableOpacity
              style={[
                styles.trainingContextBadge,
                { backgroundColor: `${colors.green}10`, borderColor: `${colors.green}30` },
              ]}
              onPress={() => router.push(`/(protected)/trainingDetail?id=${session.training_id}`)}
              activeOpacity={0.7}
            >
              <Users size={14} color={colors.green} />
              <View style={styles.trainingContextContent}>
                <Text style={[styles.trainingContextLabel, { color: colors.green }]}>{t('session.partOfTeamTraining')}</Text>
                <Text style={[styles.trainingContextTitle, { color: colors.text }]} numberOfLines={1}>
                  {session.training_title}
                </Text>
              </View>
              <ChevronRight size={14} color={colors.green} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Stats Grid */}
      {stats && stats.targetCount > 0 ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('session.performance')}</Text>

          {/* Entry breakdown indicator */}
          {(entryBreakdown.scanned > 0 || entryBreakdown.manual > 0) && (
            <View style={[styles.entryBreakdown, { backgroundColor: colors.card }]}>
              {entryBreakdown.scanned > 0 && (
                <View style={styles.entryBreakdownItem}>
                  <View style={[styles.entryBreakdownDot, { backgroundColor: '#A78BFA' }]} />
                  <Text style={[styles.entryBreakdownText, { color: colors.textMuted }]}>
                    {entryBreakdown.scanned} {t('session.scanned')}
                  </Text>
                </View>
              )}
              {entryBreakdown.manual > 0 && (
                <View style={styles.entryBreakdownItem}>
                  <View style={[styles.entryBreakdownDot, { backgroundColor: '#60A5FA' }]} />
                  <Text style={[styles.entryBreakdownText, { color: colors.textMuted }]}>
                    {entryBreakdown.manual} {t('session.manual')}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.statsGrid}>
            {isGroupingDrill ? (
              // GROUPING: Show shots + group size - NO accuracy or hits
              <>
                {/* Shots Fired */}
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.indigo}22` }]}>
                    <Target size={18} color={colors.indigo} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalShotsFired}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
                </View>

                {/* Best Group Size */}
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                    <Ruler size={18} color={colors.orange} />
                  </View>
                  <Text
                    style={[
                      styles.statValue,
                      { color: stats.bestDispersionCm !== null ? colors.orange : colors.textMuted },
                    ]}
                  >
                    {stats.bestDispersionCm !== null ? `${stats.bestDispersionCm}cm` : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('session.bestGroup')}</Text>
                </View>
              </>
            ) : (
              // ENGAGEMENT: Show hits, shots, accuracy
              <>
                {/* Accuracy - only show if we have meaningful data */}
                {stats.accuracyPct > 0 ? (
                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconBg, { backgroundColor: `${colors.indigo}22` }]}>
                      <Crosshair size={18} color={colors.indigo} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{stats.accuracyPct}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      {t('session.accuracy')}
                      {hasScannedWithoutDeclaration ? '*' : ''}
                    </Text>
                  </View>
                ) : hasScannedWithoutDeclaration ? (
                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                      <Crosshair size={18} color={colors.orange} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.orange }]}>—</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('session.noShotCount')}</Text>
                  </View>
                ) : null}

                {/* Hits */}
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.green}22` }]}>
                    <Target size={18} color={colors.green} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stats.totalHits}/{stats.totalShotsFired}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {hasScannedWithoutDeclaration ? t('session.holesDetected', { count: stats.totalHits }) : t('session.hits')}
                  </Text>
                </View>

                {/* Targets */}
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                    <Award size={18} color={colors.orange} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.targetCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('session.targets')}</Text>
                </View>
              </>
            )}
          </View>

          {/* Accuracy note if scanned without declaration - only for engagement */}
          {!isGroupingDrill && hasScannedWithoutDeclaration && stats.accuracyPct > 0 && (
            <Text style={[styles.accuracyNote, { color: colors.textMuted }]}>{t('session.accuracyExcludes')}</Text>
          )}
        </Animated.View>
      ) : stats?.targetCount === 0 && !isSquadOrGroup ? (
        // Only show "no targets" for solo sessions - squad/group track differently
        <View style={[styles.emptyStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Target size={32} color={colors.textMuted} />
          <Text style={[styles.emptyStatsText, { color: colors.textMuted }]}>{t('session.noTargetsRecorded')}</Text>
        </View>
      ) : null}

      {/* Participants Section - Squad/Group engagements only */}
      {session.engagement?.engagement_participants && session.engagement.engagement_participants.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.participantsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('training.participants')}</Text>
          <View style={[styles.participantsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {session.engagement.engagement_participants
              .filter((p) => p.state === 'joined')
              .map((participant, idx, arr) => {
                const isSelf = participant.user_id === user?.id;
                const shots = participant.shots_fired ?? 0;
                const displayName = isSelf ? t('common.you') : participant.user_full_name || `${t('squads.shooter')} ${idx + 1}`;
                const initial = isSelf ? 'Y' : (participant.user_full_name?.charAt(0) || `${idx + 1}`).toUpperCase();
                return (
                  <View
                    key={participant.id}
                    style={[
                      styles.participantRow,
                      idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.participantInfo}>
                      <View
                        style={[
                          styles.participantAvatar,
                          { backgroundColor: isSelf ? colors.primary + '20' : colors.secondary },
                        ]}
                      >
                        <Text
                          style={[styles.participantInitial, { color: isSelf ? colors.primary : colors.textMuted }]}
                        >
                          {initial}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.participantName, { color: colors.text }]}>{displayName}</Text>
                        <Text style={[styles.participantRole, { color: colors.textMuted }]}>
                          {participant.role === 'spotter' ? t('squads.spotter') : t('squads.shooter')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.participantStats}>
                      {shots > 0 ? (
                        <Text style={[styles.participantShotCount, { color: colors.text }]}>
                          {t('session.shotsCount', { count: shots })}
                        </Text>
                      ) : (
                        <Text style={[styles.participantShotCount, { color: colors.textMuted }]}>—</Text>
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        </Animated.View>
      )}

      {/* Watch Data / Biometrics Section */}
      {watchData && (watchData.heartRate || watchData.steadiness || watchData.splits) && (
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.biometricsSection}>
          <View style={styles.biometricsHeader}>
            <Watch size={14} color={colors.green} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('biometrics.title')}</Text>
          </View>

          {/* Heart Rate & Breathing Row */}
          {(watchData.heartRate?.avg != null || watchData.avgBreathRate != null) && (
            <View style={styles.bioRow}>
              {watchData.heartRate?.avg && (
                <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.bioIconBg, { backgroundColor: `${colors.red}22` }]}>
                    <Heart size={18} color={colors.red} />
                  </View>
                  <View style={styles.bioContent}>
                    <Text style={[styles.bioLabel, { color: colors.textMuted }]}>{t('biometrics.heartRate')}</Text>
                    <View style={styles.bioValues}>
                      <Text style={[styles.bioValue, { color: colors.text }]}>{watchData.heartRate.avg}</Text>
                      <Text style={[styles.bioUnit, { color: colors.textMuted }]}>{t('biometrics.avg')}</Text>
                      {watchData.heartRate.max != null && (
                        <>
                          <Text style={[styles.bioValue, { color: colors.orange }]}>{watchData.heartRate.max}</Text>
                          <Text style={[styles.bioUnit, { color: colors.textMuted }]}>{t('biometrics.max')}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {watchData.avgBreathRate != null && (
                <View style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.bioIconBg, { backgroundColor: `${colors.blue}22` }]}>
                    <Wind size={18} color={colors.blue} />
                  </View>
                  <View style={styles.bioContent}>
                    <Text style={[styles.bioLabel, { color: colors.textMuted }]}>{t('biometrics.breathing')}</Text>
                    <View style={styles.bioValues}>
                      <Text style={[styles.bioValue, { color: colors.text }]}>{watchData.avgBreathRate}</Text>
                      <Text style={[styles.bioUnit, { color: colors.textMuted }]}>{t('biometrics.breathsPerMin')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Steadiness */}
          {watchData.steadiness?.avg_score !== undefined && (
            <View style={[styles.steadinessCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.bioIconBg,
                  {
                    backgroundColor: watchData.steadiness.avg_score >= 70 ? `${colors.green}22` : `${colors.orange}22`,
                  },
                ]}
              >
                <Activity size={18} color={watchData.steadiness.avg_score >= 70 ? colors.green : colors.orange} />
              </View>
              <View style={styles.steadinessContent}>
                <Text style={[styles.bioLabel, { color: colors.textMuted }]}>{t('biometrics.steadiness')}</Text>
                <Text
                  style={[
                    styles.steadinessValue,
                    {
                      color: watchData.steadiness.avg_score >= 70 ? colors.green : colors.orange,
                    },
                  ]}
                >
                  {watchData.steadiness.avg_score.toFixed(0)}%
                </Text>
              </View>
              {!!watchData.steadiness.trend && (
                <View style={[styles.trendBadge, { backgroundColor: `${colors.text}10` }]}>
                  <Text style={[styles.trendText, { color: colors.textMuted }]}>{watchData.steadiness.trend}</Text>
                </View>
              )}
            </View>
          )}

          {/* Split Times */}
          {watchData.splits && watchData.splits.length > 0 && (
            <View style={styles.splitsSection}>
              <View style={styles.splitsHeader}>
                <Timer size={14} color={colors.primary} />
                <Text style={[styles.splitsTitle, { color: colors.text }]}>{t('session.splitTimes')}</Text>
              </View>
              <View style={styles.splitsRow}>
                {watchData.fastestSplitMs != null && (
                  <View style={[styles.splitCard, { backgroundColor: `${colors.green}15` }]}>
                    <Text style={[styles.splitValue, { color: colors.green }]}>
                      {watchData.fastestSplitMs < 1000
                        ? `${watchData.fastestSplitMs}ms`
                        : `${(watchData.fastestSplitMs / 1000).toFixed(2)}s`}
                    </Text>
                    <Text style={[styles.splitLabel, { color: colors.green }]}>{t('session.fastest')}</Text>
                  </View>
                )}
                {watchData.avgSplitMs != null && (
                  <View style={[styles.splitCard, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.splitValue, { color: colors.primary }]}>
                      {watchData.avgSplitMs < 1000
                        ? `${watchData.avgSplitMs}${t('units.ms')}`
                        : `${(watchData.avgSplitMs / 1000).toFixed(2)}${t('units.seconds')}`}
                    </Text>
                    <Text style={[styles.splitLabel, { color: colors.primary }]}>{t('session.average')}</Text>
                  </View>
                )}
                {watchData.slowestSplitMs != null && (
                  <View style={[styles.splitCard, { backgroundColor: `${colors.orange}15` }]}>
                    <Text style={[styles.splitValue, { color: colors.orange }]}>
                      {watchData.slowestSplitMs < 1000
                        ? `${watchData.slowestSplitMs}${t('units.ms')}`
                        : `${(watchData.slowestSplitMs / 1000).toFixed(2)}${t('units.seconds')}`}
                    </Text>
                    <Text style={[styles.splitLabel, { color: colors.orange }]}>{t('session.slowest')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Per-Shot Biometrics Preview */}
          {watchData.biometrics?.shot_biometrics && watchData.biometrics.shot_biometrics.length > 0 && (
            <View style={styles.shotBioSection}>
              <Text style={[styles.shotBioTitle, { color: colors.textMuted }]}>{t('session.perShotData')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shotBioScroll}
              >
                {watchData.biometrics.shot_biometrics.slice(0, 10).map((sb: any, idx: number) => {
                  const shotNum = sb.shot ?? idx + 1;
                  const hrValue = sb.hr ?? null;
                  const phase = sb.breathPhase ?? null;
                  const phaseColor =
                    phase === 'pause' ? colors.green : phase === 'exhale' ? colors.blue : colors.orange;

                  return (
                    <View
                      key={idx}
                      style={[styles.shotBioChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Text style={[styles.shotBioNum, { color: colors.text }]}>#{shotNum}</Text>
                      {hrValue !== null && (
                        <View style={styles.shotBioStat}>
                          <Heart size={10} color={colors.red} />
                          <Text style={[styles.shotBioValue, { color: colors.text }]}>{hrValue}</Text>
                        </View>
                      )}
                      {phase !== null && <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SESSION INSIGHTS (only show notable insights - anomalies & high-score) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        // Filter to only show notable insights:
        // - Anomalies (anomaly_high, anomaly_low) - immediate insights for exceptional sessions
        // - High-score LLM insights (score > 70)
        // - Achievement insights that are genuinely notable
        // Exclude: summary, building baseline, routine insights
        const notableInsights = insights.filter((i) => {
          // Always show anomaly insights
          if (i.insight_type === 'anomaly_high' || i.insight_type === 'anomaly_low') {
            return true;
          }
          // Show LLM insights with high score
          if (i.insight_type === 'llm_insight' && i.score > 70) {
            return true;
          }
          // Show achievements with high score
          if (i.insight_type === 'achievement' && i.score > 70) {
            return true;
          }
          // Skip summary, building baseline, and low-score insights
          return false;
        });

        if (notableInsights.length === 0) return null;

        return (
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.insightsSection}>
            <View style={styles.insightsHeader}>
              <Lightbulb size={14} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Session Insight</Text>
            </View>

            <View style={{ gap: 10 }}>
              {notableInsights.slice(0, 2).map((insight) => {
                // Determine icon and colors based on insight type
                const isPositive =
                  insight.insight_type === 'anomaly_high' ||
                  insight.insight_type === 'achievement' ||
                  insight.tags?.includes('positive');
                const isWarning = insight.insight_type === 'anomaly_low' || insight.tags?.includes('negative');

                const iconColor = isPositive ? colors.green : isWarning ? colors.orange : colors.primary;
                const bgColor = isPositive
                  ? 'rgba(16,185,129,0.08)'
                  : isWarning
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(99,102,241,0.08)';

                return (
                  <View
                    key={insight.id}
                    style={[
                      styles.insightsCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        gap: 12,
                        alignItems: 'flex-start',
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: bgColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isPositive ? (
                        <CheckCircle size={16} color={iconColor} />
                      ) : isWarning ? (
                        <AlertTriangle size={16} color={iconColor} />
                      ) : (
                        <Lightbulb size={16} color={iconColor} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.insightCardTitle, { color: colors.text }]}>{insight.title}</Text>
                      <Text style={[styles.insightCardSummary, { color: colors.textMuted }]}>{insight.summary}</Text>
                      {insight.primary_factor && (
                        <View style={styles.insightTagsRow}>
                          <View style={[styles.insightTag, { backgroundColor: bgColor }]}>
                            <Text style={[styles.insightTagText, { color: iconColor }]}>{insight.primary_factor}</Text>
                          </View>
                          {insight.secondary_factor && (
                            <View style={[styles.insightTag, { backgroundColor: 'rgba(107,114,128,0.1)' }]}>
                              <Text style={[styles.insightTagText, { color: colors.textMuted }]}>
                                {insight.secondary_factor}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        );
      })()}

      {/* Note: No loading state for insights - routine sessions don't need insight analysis */}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PERFORMANCE INSIGHTS (from saved timeline data) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {hasTimeline && timelineInsights && (
        <Animated.View entering={FadeInDown.delay(175).duration(300)} style={styles.insightsSection}>
          <View style={styles.insightsHeader}>
            <Activity size={14} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t('insights.title')}</Text>
          </View>

          {/* Main Metrics Row */}
          <View style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.insightsRow}>
              {/* Calmness/Steadiness Score */}
              <View style={styles.insightMetric}>
                <Text
                  style={[
                    styles.insightValue,
                    {
                      color:
                        timelineInsights.avgScore >= 50
                          ? colors.green
                          : timelineInsights.avgScore >= 30
                            ? colors.orange
                            : colors.red,
                    },
                  ]}
                >
                  {timelineInsights.avgScore}%
                </Text>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>
                  {timelineInsights.usingStress ? t('biometrics.calm') : t('biometrics.steadiness')}
                </Text>
              </View>

              {/* Trend */}
              {timelineInsights.trend !== 'stable' && (
                <View
                  style={[
                    styles.insightTrendBadge,
                    {
                      backgroundColor:
                        timelineInsights.trend === 'improving' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    },
                  ]}
                >
                  {timelineInsights.trend === 'improving' ? (
                    <TrendingUp size={14} color={colors.green} />
                  ) : (
                    <TrendingDown size={14} color={colors.red} />
                  )}
                  <Text
                    style={[
                      styles.insightTrendText,
                      {
                        color: timelineInsights.trend === 'improving' ? colors.green : colors.red,
                      },
                    ]}
                  >
                    {timelineInsights.trend === 'improving' ? t('insights.improving') : t('insights.declining')}
                  </Text>
                </View>
              )}

              {/* Breath Pause % */}
              <View style={styles.insightMetric}>
                <Text
                  style={[
                    styles.insightValue,
                    {
                      color: timelineInsights.pausePct >= 50 ? colors.green : colors.orange,
                    },
                  ]}
                >
                  {timelineInsights.pausePct}%
                </Text>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>{t('biometrics.breathPause')}</Text>
              </View>

              {/* Flinch Count */}
              {timelineInsights.flinchCount > 0 && (
                <View style={styles.insightMetric}>
                  <Text style={[styles.insightValue, { color: colors.red }]}>{timelineInsights.flinchCount}</Text>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>{t('biometrics.flinches')}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Shot-by-Shot Performance Bars */}
          <View style={[styles.shotBarsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.shotBarsTitle, { color: colors.textMuted }]}>{t('session.shotByShotPerformance')}</Text>
            <View style={styles.shotBarsContainer}>
              {timelineInsights.shots.slice(0, 25).map((shot: any, idx: number) => {
                const score = timelineInsights.scores[idx] as number;
                const barHeight = Math.max(6, (score / 100) * 48);
                const barColor = score >= 50 ? colors.green : score >= 30 ? colors.orange : colors.red;
                const breathColor =
                  shot.breathPhase === 'pause'
                    ? colors.green
                    : shot.breathPhase === 'exhale'
                      ? colors.orange
                      : colors.red;
                return (
                  <View key={shot.shotNumber} style={styles.shotBarColumn}>
                    <View style={[styles.shotBarFill, { height: barHeight, backgroundColor: barColor }]} />
                    <View style={[styles.breathDot, { backgroundColor: breathColor }]} />
                    <Text style={[styles.shotBarLabel, { color: colors.textMuted }]}>{shot.shotNumber}</Text>
                  </View>
                );
              })}
            </View>
            {timelineInsights.shots.length > 25 && (
              <Text style={[styles.shotBarsMore, { color: colors.textMuted }]}>
                +{timelineInsights.shots.length - 25} {t('session.moreShots')}
              </Text>
            )}

            {/* Legend */}
            <View style={styles.barsLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('biometrics.pauseOptimal')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.orange }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('biometrics.exhale')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('biometrics.inhale')}</Text>
              </View>
            </View>
          </View>

          {/* Best/Worst Shots */}
          {timelineInsights.bestScore !== timelineInsights.worstScore && (
            <View style={styles.bestWorstRow}>
              <View
                style={[
                  styles.bestWorstCard,
                  { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
                ]}
              >
                <ArrowUp size={14} color={colors.green} />
                <View>
                  <Text style={[styles.bestWorstValue, { color: colors.green }]}>
                    {t('session.shot')} #{timelineInsights.bestShot}
                  </Text>
                  <Text style={[styles.bestWorstScore, { color: colors.green }]}>
                    {timelineInsights.bestScore}% {timelineInsights.usingStress ? t('biometrics.calm') : t('biometrics.steady')}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.bestWorstCard,
                  { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
                ]}
              >
                <ArrowDown size={14} color={colors.red} />
                <View>
                  <Text style={[styles.bestWorstValue, { color: colors.red }]}>
                    {t('session.shot')} #{timelineInsights.worstShot}
                  </Text>
                  <Text style={[styles.bestWorstScore, { color: colors.red }]}>
                    {timelineInsights.worstScore}% {timelineInsights.usingStress ? t('biometrics.calm') : t('biometrics.steady')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Breath Discipline Breakdown */}
          <View style={[styles.breathBreakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.breathBreakdownTitle, { color: colors.text }]}>{t('biometrics.breathDiscipline')}</Text>
            <View style={styles.breathBar}>
              {timelineInsights.pausePct > 0 && (
                <View
                  style={[styles.breathSegment, { flex: timelineInsights.pausePct, backgroundColor: colors.green }]}
                >
                  {timelineInsights.pausePct >= 15 && (
                    <Text style={styles.breathSegmentText}>{timelineInsights.pausePct}%</Text>
                  )}
                </View>
              )}
              {timelineInsights.exhalePct > 0 && (
                <View
                  style={[styles.breathSegment, { flex: timelineInsights.exhalePct, backgroundColor: colors.orange }]}
                >
                  {timelineInsights.exhalePct >= 15 && (
                    <Text style={styles.breathSegmentText}>{timelineInsights.exhalePct}%</Text>
                  )}
                </View>
              )}
              {timelineInsights.inhalePct > 0 && (
                <View style={[styles.breathSegment, { flex: timelineInsights.inhalePct, backgroundColor: colors.red }]}>
                  {timelineInsights.inhalePct >= 15 && (
                    <Text style={styles.breathSegmentText}>{timelineInsights.inhalePct}%</Text>
                  )}
                </View>
              )}
            </View>
            <View style={styles.breathBreakdownLegend}>
              <View style={styles.breathLegendItem}>
                <View style={[styles.breathLegendDot, { backgroundColor: colors.green }]} />
                <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>{t('biometrics.pauseOptimal')}</Text>
              </View>
              <View style={styles.breathLegendItem}>
                <View style={[styles.breathLegendDot, { backgroundColor: colors.orange }]} />
                <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>{t('biometrics.exhale')}</Text>
              </View>
              <View style={styles.breathLegendItem}>
                <View style={[styles.breathLegendDot, { backgroundColor: colors.red }]} />
                <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>{t('biometrics.inhale')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Timeline data loading indicator */}
      {session?.watch_controlled && !hasTimeline && timelineLoading && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.insightsSection}>
          <View
            style={[
              styles.insightsCard,
              { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingInsightsText, { color: colors.textMuted }]}>{t('biometrics.loadingBiometrics')}</Text>
          </View>
        </Animated.View>
      )}

      {/* Image Gallery */}
      {targetImages.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.imagesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('session.targetScans')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesScroll}>
            {targetImages.map((img, index) => (
              <TouchableOpacity
                key={img.id}
                style={[styles.imageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageLabel}>#{img.sequence || index + 1}</Text>
                  <Text style={styles.imageHits}>
                    {img.isGrouping
                      ? img.dispersion != null
                        ? `${img.dispersion.toFixed(1)}cm`
                        : `${img.shots} shots`
                      : img.actualShotsDeclared
                        ? `${img.hits}/${img.actualShotsDeclared} (${Math.round((img.hits / img.actualShotsDeclared) * 100)}%)`
                        : `${img.hits} detected`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Timeline */}
      {targets.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('session.sessionTimeline')}</Text>
          <View style={styles.timeline}>
            {targets.map((target, index) => {
              const isPaper = isPaperTarget(target.target_type);
              const result = isPaper ? target.paper_result : target.tactical_result;
              const shots = result?.bullets_fired ?? 0;
              const hits = isPaper ? (target.paper_result?.hits_total ?? 0) : (target.tactical_result?.hits ?? 0);

              // Determine if this is a grouping or achievement target
              const isGroupingTarget = isPaper && isGroupingPaper(target.paper_result?.paper_type);
              const dispersion = target.paper_result?.dispersion_cm;

              // Check if scanned (AI detection) vs manual
              const isScanned = isPaper && !!target.paper_result?.scanned_image_url;
              const actualShotsDeclared = target.paper_result?.actual_shots_declared ?? null;

              // Calculate accuracy only when meaningful:
              // - Manual entries: always meaningful
              // - Scanned entries: only if user declared actual shots
              // - Tactical: always meaningful (manual)
              const canShowAccuracy = !isPaper || !isScanned || actualShotsDeclared != null;
              const effectiveShots = isScanned && actualShotsDeclared ? actualShotsDeclared : shots;
              const accuracy =
                !isGroupingTarget && canShowAccuracy && effectiveShots > 0
                  ? Math.round((hits / effectiveShots) * 100)
                  : null;

              return (
                <View key={target.id} style={styles.timelineItem}>
                  {/* Connector line */}
                  {index < targets.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}

                  {/* Dot */}
                  <View
                    style={[styles.timelineDot, { backgroundColor: isGroupingTarget ? colors.green : colors.indigo }]}
                  >
                    <Text style={styles.timelineDotText}>{index + 1}</Text>
                  </View>

                  {/* Content */}
                  <View style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.timelineHeader}>
                      <View style={styles.timelineBadges}>
                        <View
                          style={[
                            styles.targetTypeBadge,
                            {
                              backgroundColor: isGroupingTarget
                                ? `${colors.green}22`
                                : isPaper
                                  ? `${colors.indigo}22`
                                  : `${colors.orange}22`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.targetTypeText,
                              { color: isGroupingTarget ? colors.green : isPaper ? colors.indigo : colors.orange },
                            ]}
                          >
                            {isGroupingTarget ? t('session.grouping') : isPaper ? t('session.achievement') : t('session.tactical')}
                          </Text>
                        </View>
                        {/* Entry method badge for paper targets */}
                        {isPaper && !isGroupingTarget && (
                          <View
                            style={[
                              styles.entryMethodBadge,
                              { backgroundColor: isScanned ? '#8B5CF622' : '#3B82F622' },
                            ]}
                          >
                            <Text style={[styles.entryMethodText, { color: isScanned ? '#A78BFA' : '#60A5FA' }]}>
                              {isScanned ? t('session.scanned') : t('session.manual')}
                            </Text>
                          </View>
                        )}
                      </View>
                      {target.distance_m && (
                        <Text style={[styles.distanceText, { color: colors.textMuted }]}>{target.distance_m}m</Text>
                      )}
                    </View>

                    {result && (
                      <View style={styles.timelineStats}>
                        {/* Different display based on target type and entry method */}
                        {isGroupingTarget ? (
                          // GROUPING: Dispersion + shot count
                          <>
                            {dispersion != null && (
                              <View style={styles.timelineStat}>
                                <Text style={[styles.timelineStatValue, { color: colors.green }]}>
                                  {dispersion.toFixed(1)}cm
                                </Text>
                                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.grouping')}</Text>
                              </View>
                            )}
                            <View style={styles.timelineStat}>
                              <Text style={[styles.timelineStatValue, { color: colors.text }]}>{shots}</Text>
                              <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
                            </View>
                          </>
                        ) : isScanned ? (
                          // SCANNED ACHIEVEMENT: Holes detected + optional accuracy
                          <>
                            <View style={styles.timelineStat}>
                              <Text style={[styles.timelineStatValue, { color: colors.indigo }]}>{hits}</Text>
                              <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>holes</Text>
                            </View>
                            {actualShotsDeclared && (
                              <>
                                <View style={styles.timelineStat}>
                                  <Text style={[styles.timelineStatValue, { color: colors.text }]}>
                                    {actualShotsDeclared}
                                  </Text>
                                  <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.fired')}</Text>
                                </View>
                                <View style={styles.timelineStat}>
                                  <Text
                                    style={[
                                      styles.timelineStatValue,
                                      {
                                        color:
                                          accuracy! >= 70 ? colors.green : accuracy! >= 50 ? colors.orange : colors.red,
                                      },
                                    ]}
                                  >
                                    {accuracy}%
                                  </Text>
                                  <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.accuracy')}</Text>
                                </View>
                              </>
                            )}
                          </>
                        ) : (
                          // MANUAL ENTRY: Shots + hits + accuracy
                          <>
                            <View style={styles.timelineStat}>
                              <Text style={[styles.timelineStatValue, { color: colors.text }]}>{shots}</Text>
                              <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
                            </View>
                            <View style={styles.timelineStat}>
                              <Text style={[styles.timelineStatValue, { color: colors.text }]}>{hits}</Text>
                              <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.hits')}</Text>
                            </View>
                            {accuracy !== null && (
                              <View style={styles.timelineStat}>
                                <Text
                                  style={[
                                    styles.timelineStatValue,
                                    {
                                      color:
                                        accuracy >= 70 ? colors.green : accuracy >= 50 ? colors.orange : colors.red,
                                    },
                                  ]}
                                >
                                  {accuracy}%
                                </Text>
                                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>{t('session.accuracy')}</Text>
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    )}

                    {target.notes && (
                      <Text style={[styles.targetNotes, { color: colors.textMuted }]} numberOfLines={2}>
                        {target.notes}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  scrollView: {
    flex: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  // Weather Strip
  weatherStripSection: {
    marginBottom: 16,
  },

  // Session Context
  contextSection: {
    marginBottom: 20,
  },
  contextCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contextItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contextIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextItemContent: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  contextValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  inputMethodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trainingContextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  trainingContextContent: {
    flex: 1,
  },
  trainingContextLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  trainingContextTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  entryBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  entryBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryBreakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryBreakdownText: {
    fontSize: 12,
    fontWeight: '500',
  },
  accuracyNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStats: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  emptyStatsText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Images Section
  imagesSection: {
    marginBottom: 24,
  },
  imagesScroll: {
    gap: 12,
  },
  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  targetImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  imageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  imageHits: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },

  // Timeline Section
  timelineSection: {
    marginBottom: 24,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 32,
    bottom: -16,
    width: 2,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  timelineContent: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryMethodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  entryMethodText: {
    fontSize: 10,
    fontWeight: '600',
  },
  targetTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineStats: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineStat: {
    alignItems: 'center',
  },
  timelineStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  targetNotes: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Participants Section (Squad/Group)
  participantsSection: {
    marginBottom: 24,
    gap: 12,
  },
  participantsList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantRole: {
    fontSize: 11,
    marginTop: 1,
  },
  participantStats: {
    alignItems: 'flex-end',
  },
  participantShotCount: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Biometrics Section
  biometricsSection: {
    marginBottom: 24,
    gap: 12,
  },
  biometricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bioCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bioIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioContent: {
    flex: 1,
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  bioValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bioValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  bioUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  steadinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  steadinessContent: {
    flex: 1,
  },
  steadinessValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  splitsSection: {
    gap: 8,
  },
  splitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  splitsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  splitValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  splitLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  shotBioSection: {
    gap: 8,
  },
  shotBioTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  shotBioScroll: {
    gap: 8,
  },
  shotBioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  shotBioNum: {
    fontSize: 11,
    fontWeight: '700',
  },
  shotBioStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  shotBioValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Performance Insights Section
  insightsSection: {
    marginBottom: 24,
    gap: 12,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  insightsCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  insightMetric: {
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  insightTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  insightTrendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingInsightsText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },

  // Insight Cards (from pipeline)
  insightCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightCardSummary: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  insightTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  insightTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  insightTagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Shot Bars
  shotBarsCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  shotBarsTitle: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  shotBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: 60,
  },
  shotBarColumn: {
    alignItems: 'center',
    gap: 3,
  },
  shotBarFill: {
    width: 8,
    borderRadius: 2,
  },
  breathDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  shotBarLabel: {
    fontSize: 7,
    fontWeight: '500',
  },
  shotBarsMore: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 6,
  },
  barsLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '500',
  },

  // Best/Worst
  bestWorstRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bestWorstCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bestWorstValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  bestWorstScore: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Breath Breakdown
  breathBreakdownCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  breathBreakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  breathBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
  },
  breathSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathSegmentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  breathBreakdownLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  breathLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  breathLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breathLegendText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // View Full Button
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  viewFullButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
