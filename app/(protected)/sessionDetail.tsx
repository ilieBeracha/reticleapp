/**
 * Session Detail Sheet
 * 
 * Redesigned to focus on actionable insights from reliable watch data.
 * Opens as a formSheet modal above tabs.
 */
import {
  calculateHRInsights,
  formatTimeMs,
  SessionTimelineChart,
  useSessionTimeline,
} from '@/components/session/timeline';
import { useColors } from '@/hooks/ui/useColors';
import {
  calculateSessionStats,
  getSessionById,
  getSessionTargetsWithResults,
  type SessionStats,
  type SessionTargetWithResults,
  type SessionWithDetails,
} from '@/services/sessionService';
import { format, intervalToDuration } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  Crosshair as AimIcon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronRight,
  Clock,
  Focus,
  Heart,
  Ruler,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Watch,
  Wind,
  Zap
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 64) / 3;

export default function SessionDetailScreen() {
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load timeline data from DB (saved independently by garminStore)
  const { timeline, hasTimeline, loading: timelineLoading } = useSessionTimeline({ 
    sessionId: sessionId ?? '' 
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
        isGrouping: t.paper_result?.paper_type === 'grouping',
        dispersion: t.paper_result?.dispersion_cm,
        actualShotsDeclared: t.paper_result?.actual_shots_declared ?? null,
      }));
  }, [targets]);

  // Check if any scanned targets are missing actual shots declaration
  const hasScannedWithoutDeclaration = useMemo(() => {
    return targets.some(
      (t) => 
        t.target_type === 'paper' && 
        t.paper_result?.paper_type === 'achievement' &&
        !!t.paper_result?.scanned_image_url && 
        !t.paper_result?.actual_shots_declared
    );
  }, [targets]);

  // Extract watch/biometrics data from targets
  const watchData = useMemo(() => {
    const watchTarget = targets.find(
      (t) => t.target_data && (t.target_data as any).source === 'garmin_watch'
    );
    if (!watchTarget) return null;
    
    const data = watchTarget.target_data as any;
    
    // Get breathing source - only show if native sensor
    const breathSource = data.breathing_source ?? data.biometrics?.summary?.breathingSource ?? 'estimated';
    const hasReliableBreathing = breathSource === 'native';
    
    return {
      // Heart Rate (reliable)
      heartRate: data.heart_rate as { avg?: number; max?: number; min?: number } | undefined,
      hrStart: data.biometrics?.summary?.startHR as number | undefined,
      hrEnd: data.biometrics?.summary?.endHR as number | undefined,
      
      // Stress (reliable - HRV based)
      stress: data.stress as { avg?: number; min?: number; max?: number; trend?: string } | undefined,
      
      // Breathing (only if native sensor)
      avgBreathRate: hasReliableBreathing ? (data.avg_breath_rate as number | undefined) : undefined,
      breathingSource: breathSource as 'native' | 'estimated' | 'none',
      hasReliableBreathing,
      
      // Steadiness (reliable)
      steadiness: data.steadiness as {
        avg_score?: number;
        shot_count?: number;
        trend?: string;
        flinch_count?: number;
        flinch_rate?: number;
        recoil_consistency?: number;
        best_shot?: number;
        best_score?: number;
        worst_shot?: number;
        worst_score?: number;
      } | undefined,
      
      // Performance (reliable)
      splits: data.splits as number[] | undefined,
      avgSplitMs: data.avg_split_ms as number | undefined,
      fastestSplitMs: data.fastest_split_ms as number | undefined,
      slowestSplitMs: data.slowest_split_ms as number | undefined,
      firstShotTimeMs: data.performance?.first_shot_time as number | undefined,
      shotsPerMinute: data.performance?.spm ? (data.performance.spm as number) / 10 : undefined,
      
      // Detection info
      autoDetected: data.auto_detected as boolean | undefined,
      sensitivity: data.detection_sensitivity as number | undefined,
      
      // Duration
      durationMs: data.duration_ms as number | undefined,
      shotCount: data.shots_recorded as number | undefined,
    };
  }, [targets]);

  // ============================================================================
  // COMPUTED INSIGHTS (using shared analytics helpers)
  // ============================================================================
  
  const hrInsights = useMemo(() => {
    if (!watchData?.heartRate) return null;
    return calculateHRInsights(watchData.heartRate, watchData.hrStart, watchData.hrEnd);
  }, [watchData]);

  const steadinessInsights = useMemo(() => {
    if (!watchData?.steadiness?.avg_score) return null;
    
    const s = watchData.steadiness;
    const grade = (s.avg_score ?? 0) >= 80 ? 'Excellent' :
                  (s.avg_score ?? 0) >= 60 ? 'Good' :
                  (s.avg_score ?? 0) >= 40 ? 'Fair' : 'Needs Work';
    
    return {
      avgScore: s.avg_score,
      grade,
      trend: s.trend,
      flinchCount: s.flinch_count ?? 0,
      flinchRate: s.flinch_rate ?? 0,
      recoilConsistency: s.recoil_consistency ?? 0,
      bestShot: s.best_shot,
      bestScore: s.best_score,
      worstShot: s.worst_shot,
      worstScore: s.worst_score,
    };
  }, [watchData]);

  const timingInsights = useMemo(() => {
    if (!watchData?.splits || watchData.splits.length === 0) return null;
    
    const splits = watchData.splits;
    const firstThree = splits.slice(0, 3);
    const lastThree = splits.slice(-3);
    
    const avgFirst = firstThree.length > 0 ? firstThree.reduce((a, b) => a + b, 0) / firstThree.length : 0;
    const avgLast = lastThree.length > 0 ? lastThree.reduce((a, b) => a + b, 0) / lastThree.length : 0;
    
    // Fatigue indicator: are last shots slower?
    let fatigue: 'none' | 'mild' | 'significant' = 'none';
    if (avgLast > avgFirst * 1.2) fatigue = 'significant';
    else if (avgLast > avgFirst * 1.1) fatigue = 'mild';
    
    // Consistency (coefficient of variation)
    const mean = splits.reduce((a, b) => a + b, 0) / splits.length;
    const variance = splits.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / splits.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
    const consistency = cv < 15 ? 'Very consistent' : cv < 30 ? 'Consistent' : 'Variable';
    
    return {
      firstShot: watchData.firstShotTimeMs,
      avgSplit: watchData.avgSplitMs,
      fastest: watchData.fastestSplitMs,
      slowest: watchData.slowestSplitMs,
      spm: watchData.shotsPerMinute,
      fatigue,
      consistency,
      cv: Math.round(cv),
    };
  }, [watchData]);

  // Note: Timeline analytics are now handled by SessionTimelineChart component

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

  // Use formatTimeMs from shared helpers

  if (loading) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24}]}
        showsVerticalScrollIndicator={false}
      > 
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading session...</Text>
        </View>
      </ScrollView>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Session not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const title = session.drill_name || session.training_title || 'Solo Practice';
  const source = session.team_name || 'Personal';
  const sessionDate = format(new Date(session.started_at), 'MMM d, yyyy');
  const sessionTime = format(new Date(session.started_at), 'HH:mm');
  const isCompleted = session.status === 'completed';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 24}]}
      showsVerticalScrollIndicator={false}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View
            style={[
              styles.sourceTag,
              { backgroundColor: session.team_id ? `${colors.green}22` : `${colors.indigo}22` },
            ]}
          >
            {session.team_id ? (
              <Users size={12} color={colors.green} />
            ) : (
              <Target size={12} color={colors.indigo} />
            )}
            <Text style={[styles.sourceText, { color: session.team_id ? colors.green : colors.indigo }]}>
              {source}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isCompleted ? `${colors.green}22` : `${colors.orange}22` },
            ]}
          >
            <Text style={[styles.statusText, { color: isCompleted ? colors.green : colors.orange }]}>
              {isCompleted ? 'Completed' : 'In Progress'}
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
              <Timer size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{getDuration()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          SESSION CONTEXT
      ══════════════════════════════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.duration(250)} style={styles.contextSection}>
        <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contextGrid}>
            {session.weapon_name && (
              <View style={styles.contextChip}>
                <AimIcon size={14} color={colors.orange} />
                <Text style={[styles.contextChipText, { color: colors.text }]} numberOfLines={1}>
                  {session.weapon_name}
                </Text>
              </View>
            )}
            {session.drill_config?.distance_m && (
              <View style={styles.contextChip}>
                <Ruler size={14} color={colors.indigo} />
                <Text style={[styles.contextChipText, { color: colors.text }]}>
                  {session.drill_config.distance_m}m
                </Text>
              </View>
            )}
            {session.drill_config?.position && (
              <View style={styles.contextChip}>
                <Focus size={14} color={colors.blue} />
                <Text style={[styles.contextChipText, { color: colors.text }]}>
                  {session.drill_config.position.charAt(0).toUpperCase() + session.drill_config.position.slice(1)}
                </Text>
              </View>
            )}
            {session.watch_controlled && (
              <View style={styles.contextChip}>
                <Watch size={14} color={colors.green} />
                <Text style={[styles.contextChipText, { color: colors.text }]}>Watch</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════════════════════
          QUICK STATS (Target Results)
      ══════════════════════════════════════════════════════════════════════ */}
      {stats && stats.targetCount > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.statsSection}>
          <View style={styles.quickStatsRow}>
            <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.quickStatValue, { color: colors.green }]}>{stats.totalHits}</Text>
              <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Hits</Text>
            </View>
            <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.quickStatValue, { color: colors.text }]}>{stats.totalShotsFired}</Text>
              <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Shots</Text>
            </View>
            {stats.accuracyPct > 0 && (
              <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.quickStatValue, { 
                  color: stats.accuracyPct >= 80 ? colors.green : stats.accuracyPct >= 60 ? colors.orange : colors.red 
                }]}>
                  {stats.accuracyPct}%
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Accuracy</Text>
              </View>
            )}
            {stats.bestDispersionCm !== null && (
              <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.quickStatValue, { color: colors.primary }]}>{stats.bestDispersionCm}cm</Text>
                <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Best Group</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          WATCH INSIGHTS - The Three Pillars
      ══════════════════════════════════════════════════════════════════════ */}
      {watchData && (hrInsights || steadinessInsights || timingInsights) && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.insightsSection}>
          <View style={styles.sectionHeader}>
            <Watch size={16} color={colors.green} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Watch Insights</Text>
          </View>

          {/* ═══════════════════════════════════════════════════════════════
              PILLAR 1: PHYSIOLOGY (Heart Rate + Stress)
          ═══════════════════════════════════════════════════════════════ */}
          {hrInsights && (
            <View style={[styles.pillarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.pillarHeader}>
                <View style={[styles.pillarIcon, { backgroundColor: `${colors.red}20` }]}>
                  <Heart size={16} color={colors.red} />
                </View>
                <Text style={[styles.pillarTitle, { color: colors.text }]}>Physiology</Text>
                {hrInsights.hrChange && hrInsights.hrChange !== 'stable' && (
                  <View style={[styles.trendPill, { 
                    backgroundColor: hrInsights.hrChange === 'increased' ? `${colors.orange}20` : `${colors.green}20` 
                  }]}>
                    {hrInsights.hrChange === 'increased' ? (
                      <TrendingUp size={12} color={colors.orange} />
                    ) : (
                      <TrendingDown size={12} color={colors.green} />
                    )}
                    <Text style={[styles.trendPillText, { 
                      color: hrInsights.hrChange === 'increased' ? colors.orange : colors.green 
                    }]}>
                      {Math.abs(hrInsights.hrChangePct)}%
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.pillarMetrics}>
                <View style={styles.metricBlock}>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{hrInsights.avg}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>avg BPM</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricBlock}>
                  <Text style={[styles.metricValue, { color: colors.blue }]}>{hrInsights.min}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>min</Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={[styles.metricValue, { color: colors.orange }]}>{hrInsights.max}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>max</Text>
                </View>
              </View>
              
              {(hrInsights.start && hrInsights.end) && (
                <View style={styles.pillarFooter}>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    {hrInsights.start} BPM → {hrInsights.end} BPM ({hrInsights.rangeLabel})
                  </Text>
                </View>
              )}
              
              {/* Stress info if available */}
              {watchData.stress?.avg !== undefined && (
                <View style={[styles.subMetric, { borderTopColor: colors.border }]}>
                  <Text style={[styles.subMetricLabel, { color: colors.textMuted }]}>Stress Level</Text>
                  <Text style={[styles.subMetricValue, { 
                    color: (watchData.stress.avg ?? 50) < 40 ? colors.green : 
                           (watchData.stress.avg ?? 50) < 60 ? colors.orange : colors.red 
                  }]}>
                    {watchData.stress.avg < 40 ? 'Low' : watchData.stress.avg < 60 ? 'Moderate' : 'High'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PILLAR 2: STEADINESS & CONTROL
          ═══════════════════════════════════════════════════════════════ */}
          {steadinessInsights && (
            <View style={[styles.pillarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.pillarHeader}>
                <View style={[styles.pillarIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Activity size={16} color={colors.primary} />
                </View>
                <Text style={[styles.pillarTitle, { color: colors.text }]}>Steadiness</Text>
                <View style={[styles.gradePill, { 
                  backgroundColor: (steadinessInsights.avgScore ?? 0) >= 60 ? `${colors.green}20` : `${colors.orange}20` 
                }]}>
                  <Text style={[styles.gradePillText, { 
                    color: (steadinessInsights.avgScore ?? 0) >= 60 ? colors.green : colors.orange 
                  }]}>
                    {steadinessInsights.grade}
                  </Text>
                </View>
              </View>
              
              <View style={styles.steadinessMain}>
                <View style={styles.steadinessScore}>
                  <Text style={[styles.bigScore, { 
                    color: (steadinessInsights.avgScore ?? 0) >= 60 ? colors.green : 
                           (steadinessInsights.avgScore ?? 0) >= 40 ? colors.orange : colors.red 
                  }]}>
                    {steadinessInsights.avgScore ?? 0}
                  </Text>
                  <Text style={[styles.bigScoreUnit, { color: colors.textMuted }]}>%</Text>
                </View>
                
                <View style={styles.steadinessDetails}>
                  {steadinessInsights.flinchCount > 0 && (
                    <View style={styles.detailRow}>
                      <AlertTriangle size={12} color={colors.red} />
                      <Text style={[styles.detailText, { color: colors.text }]}>
                        {steadinessInsights.flinchCount} flinch{steadinessInsights.flinchCount > 1 ? 'es' : ''} detected
                      </Text>
                    </View>
                  )}
                  {steadinessInsights.recoilConsistency > 0 && (
                    <View style={styles.detailRow}>
                      <Zap size={12} color={colors.blue} />
                      <Text style={[styles.detailText, { color: colors.text }]}>
                        {steadinessInsights.recoilConsistency}% recoil consistency
                      </Text>
                    </View>
                  )}
                  {steadinessInsights.trend && steadinessInsights.trend !== 'stable' && (
                    <View style={styles.detailRow}>
                      {steadinessInsights.trend === 'improving' ? (
                        <TrendingUp size={12} color={colors.green} />
                      ) : (
                        <TrendingDown size={12} color={colors.red} />
                      )}
                      <Text style={[styles.detailText, { 
                        color: steadinessInsights.trend === 'improving' ? colors.green : colors.red 
                      }]}>
                        {steadinessInsights.trend === 'improving' ? 'Improving' : 'Declining'} through session
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Best/Worst Shot */}
              {steadinessInsights.bestShot !== undefined && steadinessInsights.worstShot !== undefined && (
                <View style={styles.bestWorstRow}>
                  <View style={[styles.bestWorstItem, { backgroundColor: `${colors.green}10` }]}>
                    <ArrowUp size={12} color={colors.green} />
                    <Text style={[styles.bestWorstText, { color: colors.green }]}>
                      Shot #{steadinessInsights.bestShot} ({steadinessInsights.bestScore}%)
                    </Text>
                  </View>
                  <View style={[styles.bestWorstItem, { backgroundColor: `${colors.red}10` }]}>
                    <ArrowDown size={12} color={colors.red} />
                    <Text style={[styles.bestWorstText, { color: colors.red }]}>
                      Shot #{steadinessInsights.worstShot} ({steadinessInsights.worstScore}%)
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PILLAR 3: TIMING & RHYTHM
          ═══════════════════════════════════════════════════════════════ */}
          {timingInsights && (
            <View style={[styles.pillarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.pillarHeader}>
                <View style={[styles.pillarIcon, { backgroundColor: `${colors.indigo}20` }]}>
                  <Timer size={16} color={colors.indigo} />
                </View>
                <Text style={[styles.pillarTitle, { color: colors.text }]}>Timing</Text>
                <View style={[styles.consistencyPill, { backgroundColor: `${colors.text}10` }]}>
                  <Text style={[styles.consistencyPillText, { color: colors.textMuted }]}>
                    {timingInsights.consistency}
                  </Text>
                </View>
              </View>
              
              <View style={styles.timingGrid}>
                {timingInsights.firstShot !== undefined && (
                  <View style={styles.timingCell}>
                    <Text style={[styles.timingValue, { color: colors.text }]}>
                      {formatTimeMs(timingInsights.firstShot)}
                    </Text>
                    <Text style={[styles.timingLabel, { color: colors.textMuted }]}>First Shot</Text>
                  </View>
                )}
                <View style={styles.timingCell}>
                  <Text style={[styles.timingValue, { color: colors.primary }]}>
                    {formatTimeMs(timingInsights.avgSplit)}
                  </Text>
                  <Text style={[styles.timingLabel, { color: colors.textMuted }]}>Avg Split</Text>
                </View>
                <View style={styles.timingCell}>
                  <Text style={[styles.timingValue, { color: colors.green }]}>
                    {formatTimeMs(timingInsights.fastest)}
                  </Text>
                  <Text style={[styles.timingLabel, { color: colors.textMuted }]}>Fastest</Text>
                </View>
                <View style={styles.timingCell}>
                  <Text style={[styles.timingValue, { color: colors.orange }]}>
                    {formatTimeMs(timingInsights.slowest)}
                  </Text>
                  <Text style={[styles.timingLabel, { color: colors.textMuted }]}>Slowest</Text>
                </View>
              </View>
              
              {/* SPM and Fatigue */}
              <View style={styles.timingFooter}>
                {timingInsights.spm !== undefined && (
                  <Text style={[styles.spmText, { color: colors.textMuted }]}>
                    {timingInsights.spm.toFixed(1)} shots/min
                  </Text>
                )}
                {timingInsights.fatigue !== 'none' && (
                  <View style={[styles.fatigueBadge, { backgroundColor: `${colors.orange}15` }]}>
                    <Text style={[styles.fatigueBadgeText, { color: colors.orange }]}>
                      {timingInsights.fatigue === 'significant' ? 'Fatigue detected' : 'Slight slowdown'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              BREATHING (Only if native sensor)
          ═══════════════════════════════════════════════════════════════ */}
          {watchData.hasReliableBreathing && watchData.avgBreathRate && (
            <View style={[styles.pillarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.pillarHeader}>
                <View style={[styles.pillarIcon, { backgroundColor: `${colors.blue}20` }]}>
                  <Wind size={16} color={colors.blue} />
                </View>
                <Text style={[styles.pillarTitle, { color: colors.text }]}>Breathing</Text>
                <View style={[styles.nativeBadge, { backgroundColor: `${colors.green}20` }]}>
                  <Text style={[styles.nativeBadgeText, { color: colors.green }]}>Native Sensor</Text>
                </View>
              </View>
              <View style={styles.breathingContent}>
                <Text style={[styles.breathingValue, { color: colors.text }]}>
                  {watchData.avgBreathRate}
                </Text>
                <Text style={[styles.breathingUnit, { color: colors.textMuted }]}>breaths/min</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SESSION TIMELINE CHART (from watch biometrics)
          Uses SessionTimelineChart which has all analytics built-in
      ══════════════════════════════════════════════════════════════════════ */}
      {hasTimeline && timeline && timeline.points.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.timelineSection}>
          <SessionTimelineChart
            points={timeline.points}
            shotDetails={timeline.shotDetails}
            summary={timeline.summary}
            compact={false}
            maxHeight={350}
          />
        </Animated.View>
      )}

      {/* Timeline loading */}
      {session?.watch_controlled && !hasTimeline && timelineLoading && (
        <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingCardText, { color: colors.textMuted }]}>Loading watch data...</Text>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TARGET IMAGES
      ══════════════════════════════════════════════════════════════════════ */}
      {targetImages.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.imagesSection}>
          <Text style={[styles.sectionTitleSimple, { color: colors.text }]}>Target Scans</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesScroll}
          >
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
                      ? (img.dispersion != null ? `${img.dispersion.toFixed(1)}cm` : `${img.shots} shots`)
                      : img.actualShotsDeclared 
                        ? `${img.hits}/${img.actualShotsDeclared}`
                        : `${img.hits} holes`
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SESSION TIMELINE (Targets)
      ══════════════════════════════════════════════════════════════════════ */}
      {targets.length > 0 && (
        <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.timelineSection}>
          <Text style={[styles.sectionTitleSimple, { color: colors.text }]}>Timeline</Text>
          <View style={styles.timeline}>
            {targets.slice(0, 5).map((target, index) => {
              const isPaper = target.target_type === 'paper';
              const result = isPaper ? target.paper_result : target.tactical_result;
              const shots = result?.bullets_fired ?? 0;
              const hits = isPaper ? (target.paper_result?.hits_total ?? 0) : (target.tactical_result?.hits ?? 0);
              const isGrouping = isPaper && target.paper_result?.paper_type === 'grouping';
              const dispersion = target.paper_result?.dispersion_cm;

              return (
                <View key={target.id} style={styles.timelineItem}>
                  {index < Math.min(targets.length, 5) - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                  <View style={[styles.timelineDot, { backgroundColor: isGrouping ? colors.green : colors.indigo }]}>
                    <Text style={styles.timelineDotText}>{index + 1}</Text>
                  </View>
                  <View style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.timelineRow}>
                      <Text style={[styles.timelineType, { 
                        color: isGrouping ? colors.green : colors.indigo 
                      }]}>
                        {isGrouping ? 'Grouping' : 'Achievement'}
                      </Text>
                      {target.distance_m && (
                        <Text style={[styles.timelineDistance, { color: colors.textMuted }]}>
                          {target.distance_m}m
                        </Text>
                      )}
                    </View>
                    <View style={styles.timelineStats}>
                      {isGrouping && dispersion != null ? (
                        <Text style={[styles.timelineStatText, { color: colors.text }]}>
                          {dispersion.toFixed(1)}cm group • {shots} shots
                        </Text>
                      ) : (
                        <Text style={[styles.timelineStatText, { color: colors.text }]}>
                          {hits}/{shots} hits ({shots > 0 ? Math.round((hits/shots)*100) : 0}%)
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            {targets.length > 5 && (
              <Text style={[styles.moreTargets, { color: colors.textMuted }]}>
                +{targets.length - 5} more targets
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ACTION BUTTON
      ══════════════════════════════════════════════════════════════════════ */}
      <TouchableOpacity activeOpacity={0.85}>
        <LinearGradient
          style={styles.actionButton}
          colors={[colors.ring, colors.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.actionButtonText}>Analyze Session</Text>
          <ChevronRight size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },

  // Loading & Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 100 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  backButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  backButtonText: { fontSize: 15, fontWeight: '600' },

  // Header
  header: { marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sourceText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '500' },

  // Context Section
  contextSection: { marginBottom: 16 },
  contextCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contextChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  contextChipText: { fontSize: 13, fontWeight: '600' },

  // Quick Stats
  statsSection: { marginBottom: 16 },
  quickStatsRow: { flexDirection: 'row', gap: 10 },
  quickStat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  quickStatValue: { fontSize: 20, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, fontWeight: '500', marginTop: 2, textTransform: 'uppercase' },

  // Section Headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionTitleSimple: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Insights Section
  insightsSection: { marginBottom: 20, gap: 12 },

  // Pillar Cards
  pillarCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  pillarHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillarIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillarTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  trendPillText: { fontSize: 11, fontWeight: '700' },
  gradePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  gradePillText: { fontSize: 11, fontWeight: '700' },
  consistencyPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  consistencyPillText: { fontSize: 10, fontWeight: '600' },
  nativeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  nativeBadgeText: { fontSize: 10, fontWeight: '600' },

  // Pillar Metrics
  pillarMetrics: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metricBlock: { alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: '800' },
  metricLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  metricDivider: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.1)' },
  pillarFooter: { paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerText: { fontSize: 11, fontWeight: '500' },
  subMetric: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  subMetricLabel: { fontSize: 12, fontWeight: '500' },
  subMetricValue: { fontSize: 13, fontWeight: '700' },

  // Steadiness
  steadinessMain: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  steadinessScore: { flexDirection: 'row', alignItems: 'baseline' },
  bigScore: { fontSize: 42, fontWeight: '800' },
  bigScoreUnit: { fontSize: 18, fontWeight: '600', marginLeft: 2 },
  steadinessDetails: { flex: 1, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, fontWeight: '500' },
  bestWorstRow: { flexDirection: 'row', gap: 8 },
  bestWorstItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  bestWorstText: { fontSize: 11, fontWeight: '600' },

  // Timing
  timingGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  timingCell: { alignItems: 'center', flex: 1 },
  timingValue: { fontSize: 16, fontWeight: '700' },
  timingLabel: { fontSize: 9, fontWeight: '500', marginTop: 2, textTransform: 'uppercase' },
  timingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  spmText: { fontSize: 12, fontWeight: '600' },
  fatigueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  fatigueBadgeText: { fontSize: 10, fontWeight: '600' },

  // Breathing
  breathingContent: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  breathingValue: { fontSize: 28, fontWeight: '800' },
  breathingUnit: { fontSize: 14, fontWeight: '500' },

  // Shot Visualization
  shotVizSection: { marginBottom: 20 },
  shotVizCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  shotBarsContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 70, marginBottom: 12 },
  shotBarColumn: { alignItems: 'center', gap: 4 },
  shotBar: { width: 10, borderRadius: 3 },
  shotBarBest: { borderWidth: 2, borderColor: 'rgba(16,185,129,0.8)' },
  shotBarWorst: { borderWidth: 2, borderColor: 'rgba(239,68,68,0.8)' },
  shotNum: { fontSize: 8, fontWeight: '500' },
  moreShots: { fontSize: 10, textAlign: 'center', marginBottom: 12 },
  shotSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  shotSummaryItem: { alignItems: 'center' },
  shotSummaryValue: { fontSize: 18, fontWeight: '800' },
  shotSummaryLabel: { fontSize: 9, fontWeight: '500', marginTop: 2 },
  trendIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  trendIndicatorText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  // Loading Card
  loadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  loadingCardText: { fontSize: 13, fontWeight: '500' },

  // Images
  imagesSection: { marginBottom: 20 },
  imagesScroll: { gap: 12 },
  imageCard: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  imageLabel: { fontSize: 11, fontWeight: '600', color: '#fff' },
  imageHits: { fontSize: 11, fontWeight: '700', color: '#22C55E' },

  // Timeline
  timelineSection: { marginBottom: 20 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, position: 'relative' },
  timelineLine: { position: 'absolute', left: 11, top: 26, bottom: -10, width: 2 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  timelineContent: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timelineType: { fontSize: 12, fontWeight: '700' },
  timelineDistance: { fontSize: 11, fontWeight: '500' },
  timelineStats: {},
  timelineStatText: { fontSize: 13, fontWeight: '600' },
  moreTargets: { fontSize: 11, textAlign: 'center', marginTop: 4 },

  // Action Button
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginTop: 8 },
  actionButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
