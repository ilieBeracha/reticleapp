/**
 * Session Detail Sheet
 * 
 * Shows session summary, stats, image previews, and timeline.
 * Opens as a formSheet modal above tabs.
 */
import { useColors } from '@/hooks/ui/useColors';
import { getSessionTimeline, type SessionTimeline } from '@/services/session/timelineService';
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
  ArrowDown,
  ArrowUp,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Crosshair,
  Heart,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 64) / 3;

export default function SessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
  const [loading, setLoading] = useState(true);

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
        
        // Load timeline data (separate try-catch so it doesn't fail the whole load)
        try {
          const timelineData = await getSessionTimeline(sessionId);
          setTimeline(timelineData);
        } catch {
          // No timeline data available - that's okay
        }
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

  // Count scan vs manual entries
  const entryBreakdown = useMemo(() => {
    let scanned = 0;
    let manual = 0;
    targets.forEach((t) => {
      if (t.target_type === 'paper' && t.paper_result?.paper_type === 'achievement') {
        if (t.paper_result?.scanned_image_url) scanned++;
        else manual++;
      }
    });
    return { scanned, manual };
  }, [targets]);

  // Extract watch/biometrics data from targets
  const watchData = useMemo(() => {
    const watchTarget = targets.find(
      (t) => t.target_data && (t.target_data as any).source === 'garmin_watch'
    );
    if (!watchTarget) return null;
    
    const data = watchTarget.target_data as any;
    return {
      heartRate: data.heart_rate as { avg?: number; max?: number; min?: number } | undefined,
      avgBreathRate: data.avg_breath_rate as number | undefined,
      biometrics: data.biometrics as {
        summary?: any;
        hr_timeline?: [number, number, number][];
        breath_timeline?: [number, number, number][];
        shot_biometrics?: any[];
      } | undefined,
      steadiness: data.steadiness as {
        avg_score?: number;
        shot_count?: number;
        trend?: string;
        shots?: any[];
      } | undefined,
      splits: data.splits as number[] | undefined,
      avgSplitMs: data.avg_split_ms as number | undefined,
      fastestSplitMs: data.fastest_split_ms as number | undefined,
      slowestSplitMs: data.slowest_split_ms as number | undefined,
      shotTimestamps: data.shot_timestamps as number[] | undefined,
      durationMs: data.duration_ms as number | undefined,
    };
  }, [targets]);

  // ============================================================================
  // COMPUTED INSIGHTS FROM TIMELINE DATA
  // ============================================================================
  const insights = useMemo(() => {
    if (!timeline || !timeline.shotDetails || timeline.shotDetails.length < 2) {
      return null;
    }
    
    const shots = timeline.shotDetails;
    const steadinessSum = shots.reduce((sum, s) => sum + (s.steadiness || 0), 0);
    const hasRealSteadiness = steadinessSum > 0;
    
    // Performance scores (use steadiness or inverted stress as calmness)
    const scores = hasRealSteadiness 
      ? shots.map(s => s.steadiness)
      : shots.map(s => Math.max(0, 100 - s.stress));
    
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    // Trend analysis (compare first half vs second half)
    const half = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalf = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half);
    const trend: 'improving' | 'declining' | 'stable' = 
      secondHalf - firstHalf > 5 ? 'improving' : 
      secondHalf - firstHalf < -5 ? 'declining' : 'stable';
    
    // Breath quality
    const pauseCount = shots.filter(s => s.breathPhase === 'pause').length;
    const exhaleCount = shots.filter(s => s.breathPhase === 'exhale').length;
    const inhaleCount = shots.filter(s => s.breathPhase === 'inhale').length;
    const pausePct = Math.round((pauseCount / shots.length) * 100);
    const exhalePct = Math.round((exhaleCount / shots.length) * 100);
    const inhalePct = Math.round((inhaleCount / shots.length) * 100);
    
    // Best/worst shots
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const bestIdx = scores.indexOf(maxScore);
    const worstIdx = scores.indexOf(minScore);
    
    // Flinch count
    const flinchCount = shots.filter(s => s.flinch).length;
    
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
        {/* Header */}
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
                <Zap size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{getDuration()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        {stats && stats.targetCount > 0 ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
            
            {/* Entry breakdown indicator */}
            {(entryBreakdown.scanned > 0 || entryBreakdown.manual > 0) && (
              <View style={[styles.entryBreakdown, { backgroundColor: colors.card }]}>
                {entryBreakdown.scanned > 0 && (
                  <View style={styles.entryBreakdownItem}>
                    <View style={[styles.entryBreakdownDot, { backgroundColor: '#A78BFA' }]} />
                    <Text style={[styles.entryBreakdownText, { color: colors.textMuted }]}>
                      {entryBreakdown.scanned} scanned
                    </Text>
                  </View>
                )}
                {entryBreakdown.manual > 0 && (
                  <View style={styles.entryBreakdownItem}>
                    <View style={[styles.entryBreakdownDot, { backgroundColor: '#60A5FA' }]} />
                    <Text style={[styles.entryBreakdownText, { color: colors.textMuted }]}>
                      {entryBreakdown.manual} manual
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.statsGrid}>
              {/* Accuracy - only show if we have meaningful data */}
              {stats.accuracyPct > 0 ? (
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.indigo}22` }]}>
                    <Crosshair size={18} color={colors.indigo} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.accuracyPct}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    Accuracy{hasScannedWithoutDeclaration ? '*' : ''}
                  </Text>
                </View>
              ) : hasScannedWithoutDeclaration ? (
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                    <Crosshair size={18} color={colors.orange} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.orange }]}>—</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>No shot count</Text>
                </View>
              ) : null}
              
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.green}22` }]}>
                  <Target size={18} color={colors.green} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.totalHits}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {hasScannedWithoutDeclaration ? 'Holes detected' : 'Hits'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                  <Award size={18} color={colors.orange} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.targetCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Targets</Text>
              </View>
              {stats.bestDispersionCm !== null && (
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIconBg, { backgroundColor: `${colors.red}22` }]}>
                    <TrendingUp size={18} color={colors.red} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stats.bestDispersionCm}cm</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best Group</Text>
                </View>
              )}
            </View>
            
            {/* Accuracy note if scanned without declaration */}
            {hasScannedWithoutDeclaration && stats.accuracyPct > 0 && (
              <Text style={[styles.accuracyNote, { color: colors.textMuted }]}>
                * Accuracy excludes scanned targets without declared shots
              </Text>
            )}
          </Animated.View>
        ) : stats?.targetCount === 0 ? (
          <View style={[styles.emptyStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Target size={32} color={colors.textMuted} />
            <Text style={[styles.emptyStatsText, { color: colors.textMuted }]}>No targets recorded</Text>
          </View>
        ) : null}

        {/* Watch Data / Biometrics Section */}
        {watchData && (watchData.heartRate || watchData.steadiness || watchData.splits) && (
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.biometricsSection}>
            <View style={styles.biometricsHeader}>
              <Watch size={14} color={colors.green} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Watch Data</Text>
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
                      <Text style={[styles.bioLabel, { color: colors.textMuted }]}>Heart Rate</Text>
                      <View style={styles.bioValues}>
                        <Text style={[styles.bioValue, { color: colors.text }]}>{watchData.heartRate.avg}</Text>
                        <Text style={[styles.bioUnit, { color: colors.textMuted }]}>avg</Text>
                        {watchData.heartRate.max != null && (
                          <>
                            <Text style={[styles.bioValue, { color: colors.orange }]}>{watchData.heartRate.max}</Text>
                            <Text style={[styles.bioUnit, { color: colors.textMuted }]}>max</Text>
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
                      <Text style={[styles.bioLabel, { color: colors.textMuted }]}>Breathing</Text>
                      <View style={styles.bioValues}>
                        <Text style={[styles.bioValue, { color: colors.text }]}>{watchData.avgBreathRate}</Text>
                        <Text style={[styles.bioUnit, { color: colors.textMuted }]}>breaths/min</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
            
            {/* Steadiness */}
            {watchData.steadiness?.avg_score !== undefined && (
              <View style={[styles.steadinessCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.bioIconBg, { 
                  backgroundColor: watchData.steadiness.avg_score >= 70 ? `${colors.green}22` : `${colors.orange}22` 
                }]}>
                  <Activity size={18} color={watchData.steadiness.avg_score >= 70 ? colors.green : colors.orange} />
                </View>
                <View style={styles.steadinessContent}>
                  <Text style={[styles.bioLabel, { color: colors.textMuted }]}>Steadiness</Text>
                  <Text style={[styles.steadinessValue, { 
                    color: watchData.steadiness.avg_score >= 70 ? colors.green : colors.orange 
                  }]}>
                    {watchData.steadiness.avg_score.toFixed(0)}%
                  </Text>
                </View>
                {!!watchData.steadiness.trend && (
                  <View style={[styles.trendBadge, { backgroundColor: `${colors.text}10` }]}>
                    <Text style={[styles.trendText, { color: colors.textMuted }]}>
                      {watchData.steadiness.trend}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Split Times */}
            {watchData.splits && watchData.splits.length > 0 && (
              <View style={styles.splitsSection}>
                <View style={styles.splitsHeader}>
                  <Timer size={14} color={colors.primary} />
                  <Text style={[styles.splitsTitle, { color: colors.text }]}>Split Times</Text>
                </View>
                <View style={styles.splitsRow}>
                  {watchData.fastestSplitMs != null && (
                    <View style={[styles.splitCard, { backgroundColor: `${colors.green}15` }]}>
                      <Text style={[styles.splitValue, { color: colors.green }]}>
                        {watchData.fastestSplitMs < 1000 
                          ? `${watchData.fastestSplitMs}ms` 
                          : `${(watchData.fastestSplitMs / 1000).toFixed(2)}s`}
                      </Text>
                      <Text style={[styles.splitLabel, { color: colors.green }]}>fastest</Text>
                    </View>
                  )}
                  {watchData.avgSplitMs != null && (
                    <View style={[styles.splitCard, { backgroundColor: `${colors.primary}15` }]}>
                      <Text style={[styles.splitValue, { color: colors.primary }]}>
                        {watchData.avgSplitMs < 1000 
                          ? `${watchData.avgSplitMs}ms` 
                          : `${(watchData.avgSplitMs / 1000).toFixed(2)}s`}
                      </Text>
                      <Text style={[styles.splitLabel, { color: colors.primary }]}>average</Text>
                    </View>
                  )}
                  {watchData.slowestSplitMs != null && (
                    <View style={[styles.splitCard, { backgroundColor: `${colors.orange}15` }]}>
                      <Text style={[styles.splitValue, { color: colors.orange }]}>
                        {watchData.slowestSplitMs < 1000 
                          ? `${watchData.slowestSplitMs}ms` 
                          : `${(watchData.slowestSplitMs / 1000).toFixed(2)}s`}
                      </Text>
                      <Text style={[styles.splitLabel, { color: colors.orange }]}>slowest</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            
            {/* Per-Shot Biometrics Preview */}
            {watchData.biometrics?.shot_biometrics && watchData.biometrics.shot_biometrics.length > 0 && (
              <View style={styles.shotBioSection}>
                <Text style={[styles.shotBioTitle, { color: colors.textMuted }]}>Per-Shot Data</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shotBioScroll}>
                  {watchData.biometrics.shot_biometrics.slice(0, 10).map((sb: any, idx: number) => {
                    const shotNum = sb.shot ?? idx + 1;
                    const hrValue = sb.hr ?? null;
                    const phase = sb.breathPhase ?? null;
                    const phaseColor = phase === 'pause' ? colors.green 
                      : phase === 'exhale' ? colors.blue 
                      : colors.orange;
                    
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
                        {phase !== null && (
                          <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BIOMETRIC INSIGHTS - Unique per-session analysis */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {insights && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.insightsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Insights</Text>
            
            {/* Main Metrics Row */}
            <View style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.insightsRow}>
                {/* Calmness/Steadiness Score */}
                <View style={styles.insightMetric}>
                  <Text style={[styles.insightValue, { 
                    color: insights.avgScore >= 50 ? colors.green : insights.avgScore >= 30 ? colors.orange : colors.red 
                  }]}>
                    {insights.avgScore}%
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>
                    {insights.usingStress ? 'Calmness' : 'Steadiness'}
                  </Text>
                </View>

                {/* Trend */}
                {insights.trend !== 'stable' && (
                  <View style={[styles.insightTrendBadge, { 
                    backgroundColor: insights.trend === 'improving' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' 
                  }]}>
                    {insights.trend === 'improving' ? (
                      <TrendingUp size={16} color={colors.green} />
                    ) : (
                      <TrendingDown size={16} color={colors.red} />
                    )}
                    <Text style={[styles.insightTrendText, { 
                      color: insights.trend === 'improving' ? colors.green : colors.red 
                    }]}>
                      {insights.trend === 'improving' ? 'Improving' : 'Declining'}
                    </Text>
                  </View>
                )}

                {/* Breath Pause % */}
                <View style={styles.insightMetric}>
                  <Text style={[styles.insightValue, { 
                    color: insights.pausePct >= 50 ? colors.green : colors.orange 
                  }]}>
                    {insights.pausePct}%
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Breath Pause</Text>
                </View>

                {/* Flinch Count */}
                {insights.flinchCount > 0 && (
                  <View style={styles.insightMetric}>
                    <Text style={[styles.insightValue, { color: colors.red }]}>
                      {insights.flinchCount}
                    </Text>
                    <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Flinches</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Shot-by-Shot Performance Bars */}
            <View style={[styles.shotBarsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.shotBarsTitle, { color: colors.textMuted }]}>Shot-by-Shot Performance</Text>
              <View style={styles.shotBarsContainer}>
                {insights.shots.slice(0, 25).map((shot, idx) => {
                  const score = insights.scores[idx];
                  const barHeight = Math.max(6, (score / 100) * 48);
                  const barColor = score >= 50 ? colors.green : score >= 30 ? colors.orange : colors.red;
                  const breathColor = shot.breathPhase === 'pause' ? colors.green : 
                                     shot.breathPhase === 'exhale' ? colors.orange : colors.red;
                  return (
                    <View key={shot.shotNumber} style={styles.shotBarColumn}>
                      <View style={[styles.shotBarFill, { height: barHeight, backgroundColor: barColor }]} />
                      <View style={[styles.breathDot, { backgroundColor: breathColor }]} />
                      <Text style={[styles.shotBarLabel, { color: colors.textMuted }]}>{shot.shotNumber}</Text>
                    </View>
                  );
                })}
              </View>
              {insights.shots.length > 25 && (
                <Text style={[styles.shotBarsMore, { color: colors.textMuted }]}>
                  +{insights.shots.length - 25} more shots
                </Text>
              )}
              
              {/* Legend */}
              <View style={styles.barsLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Pause</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.orange }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Exhale</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Inhale</Text>
                </View>
              </View>
            </View>

            {/* Best/Worst Shots */}
            {insights.bestScore !== insights.worstScore && (
              <View style={styles.bestWorstRow}>
                <View style={[styles.bestWorstCard, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }]}>
                  <ArrowUp size={16} color={colors.green} />
                  <View>
                    <Text style={[styles.bestWorstValue, { color: colors.green }]}>
                      Shot #{insights.bestShot}
                    </Text>
                    <Text style={[styles.bestWorstScore, { color: colors.green }]}>
                      {insights.bestScore}% {insights.usingStress ? 'calm' : 'steady'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.bestWorstCard, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                  <ArrowDown size={16} color={colors.red} />
                  <View>
                    <Text style={[styles.bestWorstValue, { color: colors.red }]}>
                      Shot #{insights.worstShot}
                    </Text>
                    <Text style={[styles.bestWorstScore, { color: colors.red }]}>
                      {insights.worstScore}% {insights.usingStress ? 'calm' : 'steady'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Breath Discipline Breakdown */}
            <View style={[styles.breathBreakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.breathBreakdownTitle, { color: colors.text }]}>Breath Discipline</Text>
              <View style={styles.breathBar}>
                {insights.pausePct > 0 && (
                  <View style={[styles.breathSegment, { flex: insights.pausePct, backgroundColor: colors.green }]}>
                    {insights.pausePct >= 15 && (
                      <Text style={styles.breathSegmentText}>{insights.pausePct}%</Text>
                    )}
                  </View>
                )}
                {insights.exhalePct > 0 && (
                  <View style={[styles.breathSegment, { flex: insights.exhalePct, backgroundColor: colors.orange }]}>
                    {insights.exhalePct >= 15 && (
                      <Text style={styles.breathSegmentText}>{insights.exhalePct}%</Text>
                    )}
                  </View>
                )}
                {insights.inhalePct > 0 && (
                  <View style={[styles.breathSegment, { flex: insights.inhalePct, backgroundColor: colors.red }]}>
                    {insights.inhalePct >= 15 && (
                      <Text style={styles.breathSegmentText}>{insights.inhalePct}%</Text>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.breathBreakdownLegend}>
                <View style={styles.breathLegendItem}>
                  <View style={[styles.breathLegendDot, { backgroundColor: colors.green }]} />
                  <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>Pause (optimal)</Text>
                </View>
                <View style={styles.breathLegendItem}>
                  <View style={[styles.breathLegendDot, { backgroundColor: colors.orange }]} />
                  <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>Exhale</Text>
                </View>
                <View style={styles.breathLegendItem}>
                  <View style={[styles.breathLegendDot, { backgroundColor: colors.red }]} />
                  <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>Inhale</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Image Gallery */}
        {targetImages.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.imagesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Target Scans</Text>
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
                          ? `${img.hits}/${img.actualShotsDeclared} (${Math.round((img.hits / img.actualShotsDeclared) * 100)}%)`
                          : `${img.hits} detected`
                      }
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Timeline</Text>
            <View style={styles.timeline}>
              {targets.map((target, index) => {
                const isPaper = target.target_type === 'paper';
                const result = isPaper ? target.paper_result : target.tactical_result;
                const shots = result?.bullets_fired ?? 0;
                const hits = isPaper ? (target.paper_result?.hits_total ?? 0) : (target.tactical_result?.hits ?? 0);
                
                // Determine if this is a grouping or achievement target
                const isGroupingTarget = isPaper && target.paper_result?.paper_type === 'grouping';
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
                const accuracy = !isGroupingTarget && canShowAccuracy && effectiveShots > 0 
                  ? Math.round((hits / effectiveShots) * 100) 
                  : null;

                return (
                  <View key={target.id} style={styles.timelineItem}>
                    {/* Connector line */}
                    {index < targets.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}

                    {/* Dot */}
                    <View style={[styles.timelineDot, { backgroundColor: isGroupingTarget ? colors.green : colors.indigo }]}>
                      <Text style={styles.timelineDotText}>{index + 1}</Text>
                    </View>

                    {/* Content */}
                    <View
                      style={[styles.timelineContent, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={styles.timelineHeader}>
                        <View style={styles.timelineBadges}>
                          <View
                            style={[
                              styles.targetTypeBadge,
                              { backgroundColor: isGroupingTarget ? `${colors.green}22` : (isPaper ? `${colors.indigo}22` : `${colors.orange}22`) },
                            ]}
                          >
                            <Text
                              style={[styles.targetTypeText, { color: isGroupingTarget ? colors.green : (isPaper ? colors.indigo : colors.orange) }]}
                            >
                              {isGroupingTarget ? 'Grouping' : (isPaper ? 'Achievement' : 'Tactical')}
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
                              <Text
                                style={[styles.entryMethodText, { color: isScanned ? '#A78BFA' : '#60A5FA' }]}
                              >
                                {isScanned ? 'Scan' : 'Manual'}
                              </Text>
                            </View>
                          )}
                        </View>
                        {target.distance_m && (
                          <Text style={[styles.distanceText, { color: colors.textMuted }]}>
                            {target.distance_m}m
                          </Text>
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
                                  <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>group</Text>
                                </View>
                              )}
                              <View style={styles.timelineStat}>
                                <Text style={[styles.timelineStatValue, { color: colors.text }]}>{shots}</Text>
                                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>shots</Text>
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
                                    <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>fired</Text>
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
                                    <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>acc</Text>
                                  </View>
                                </>
                              )}
                            </>
                          ) : (
                            // MANUAL ENTRY: Shots + hits + accuracy
                            <>
                              <View style={styles.timelineStat}>
                                <Text style={[styles.timelineStatValue, { color: colors.text }]}>{shots}</Text>
                                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>shots</Text>
                              </View>
                              <View style={styles.timelineStat}>
                                <Text style={[styles.timelineStatValue, { color: colors.text }]}>{hits}</Text>
                                <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>hits</Text>
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
                                  <Text style={[styles.timelineStatLabel, { color: colors.textMuted }]}>acc</Text>
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

        
          <LinearGradient
            style={[styles.viewFullButton, { backgroundColor: colors.indigo }]}
            colors={[colors.ring, colors.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.viewFullButtonText}>Analyze Session</Text>
            <ChevronRight size={18} color="#fff" />
          </LinearGradient>
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
    marginBottom: 24,
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

  // ═══════════════════════════════════════════════════════════════════
  // INSIGHTS STYLES
  // ═══════════════════════════════════════════════════════════════════
  insightsSection: {
    marginBottom: 24,
    gap: 12,
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
    fontSize: 24,
    fontWeight: '800',
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  insightTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  insightTrendText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Shot Bars
  shotBarsCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  shotBarsTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  shotBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 70,
  },
  shotBarColumn: {
    alignItems: 'center',
    gap: 4,
  },
  shotBarFill: {
    width: 10,
    borderRadius: 3,
  },
  breathDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shotBarLabel: {
    fontSize: 8,
    fontWeight: '500',
  },
  shotBarsMore: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  barsLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
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
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bestWorstValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  bestWorstScore: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Breath Breakdown
  breathBreakdownCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  breathBreakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  breathBar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },
  breathSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathSegmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  breathBreakdownLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  breathLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breathLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breathLegendText: {
    fontSize: 11,
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
