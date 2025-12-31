/**
 * Watch Session Result - Full Page
 * 
 * Full-screen page that shows when Garmin watch sends session data.
 * User can review detailed stats, charts, and save the watch data to their session.
 * Cannot be accidentally dismissed - requires explicit action.
 * 
 * Displays:
 * - Shot summary (shots, duration, distance)
 * - Split times (fastest/slowest/avg)
 * - HR timeline chart with shot markers
 * - Breathing data with phase indicators
 * - Per-shot biometrics
 * - Steadiness scores
 */

import { useColors } from '@/hooks/ui/useColors';
import type { GarminBiometrics, ShotBiometrics } from '@/services/garminService';
import { endSession, saveWatchSessionData } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  CheckCircle,
  Clock,
  Crosshair,
  Heart,
  MapPin,
  Target,
  Timer,
  TrendingUp,
  Watch,
  Wind,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

interface SteadinessShotData {
  shotNumber: number;
  score: number;
  grade: string;
  tremor?: number;
  drift?: number;
  sway?: number;
  samples?: number;
  anomaly?: boolean;
  // Flinch detection
  flinch?: boolean;
  flinchMag?: number;
  // Recoil analysis
  recoilMag?: number;
  recoilDev?: number;
}

interface SteadinessData {
  enabled?: boolean;
  avgScore?: number;
  shotCount?: number;
  trend?: string;
  // Flinch summary
  flinchCount?: number;
  flinchRate?: number;
  // Recoil consistency
  recoilConsistency?: number;
  // Best/worst shots
  bestShot?: number;
  bestScore?: number;
  worstShot?: number;
  worstScore?: number;
  // Per-shot data
  shots?: SteadinessShotData[];
  gradeDistribution?: Record<string, number>;
  // Legacy format support
  shotScores?: number[];
  timeline?: [number, number, number][];
}

interface PerformanceData {
  firstShotTime?: number;
  bestSplit?: number;
  worstSplit?: number;
  splitStdDev?: number;
  shotsPerMinute?: number;
  parDelta?: number;
  warmupAvg?: number;
  restAvg?: number;
  lastThreeAvg?: number;
}

export default function WatchSessionResultPage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadPersonalSessions, loadTeamSessions } = useSessionStore();
  
  const params = useLocalSearchParams<{
    sessionId: string;
    shots?: string;
    duration?: string;
    distance?: string;
    completed?: string;
    teamId?: string;
    trainingId?: string;
    autoSaved?: string;
    splitTimes?: string;
    avgSplitMs?: string;
    heartRateAvg?: string;
    heartRateMax?: string;
    heartRateMin?: string;
    drillName?: string;
    weaponName?: string;
    performance?: string;
    biometrics?: string;
    steadiness?: string;
  }>();
  
  const {
    sessionId,
    shots,
    duration,
    distance,
    completed,
    teamId,
    trainingId,
    autoSaved,
    splitTimes: splitTimesJson,
    avgSplitMs,
    heartRateAvg,
    heartRateMax,
    heartRateMin,
    drillName,
    weaponName,
    performance: performanceJson,
    biometrics: biometricsJson,
    steadiness: steadinessJson,
  } = params;
  
  const isAutoSaved = autoSaved === '1';

  const [saving, setSaving] = useState(false);
  const [hitsInput, setHitsInput] = useState('');

  // Parse basic values
  const shotsCount = parseInt(shots || '0');
  const durationSec = parseInt(duration || '0');
  const distanceM = parseInt(distance || '0');
  const isCompleted = completed === '1';
  const avgSplit = avgSplitMs ? parseInt(avgSplitMs) : null;
  
  // Parse split times array (from watch directly)
  const splitTimes = useMemo(() => {
    if (!splitTimesJson) return [];
    try {
      return JSON.parse(splitTimesJson) as number[];
    } catch {
      return [];
    }
  }, [splitTimesJson]);
  
  // Parse performance analytics
  const performance = useMemo((): PerformanceData | null => {
    if (!performanceJson) return null;
    try {
      return JSON.parse(performanceJson) as PerformanceData;
    } catch {
      return null;
    }
  }, [performanceJson]);
  
  // Parse biometrics data
  const biometrics = useMemo((): GarminBiometrics | null => {
    if (!biometricsJson) return null;
    try {
      return JSON.parse(biometricsJson) as GarminBiometrics;
    } catch {
      return null;
    }
  }, [biometricsJson]);
  
  // Parse steadiness data
  const steadiness = useMemo((): SteadinessData | null => {
    if (!steadinessJson) return null;
    try {
      return JSON.parse(steadinessJson) as SteadinessData;
    } catch {
      return null;
    }
  }, [steadinessJson]);
  
  // Legacy heart rate (backwards compatible)
  const legacyHeartRate = useMemo(() => {
    if (!heartRateAvg) return null;
    return {
      avg: parseInt(heartRateAvg),
      max: heartRateMax ? parseInt(heartRateMax) : undefined,
      min: heartRateMin ? parseInt(heartRateMin) : undefined,
    };
  }, [heartRateAvg, heartRateMax, heartRateMin]);
  
  // Combined heart rate (prefer biometrics, fallback to legacy)
  const heartRate = useMemo(() => {
    if (biometrics?.summary) {
      return {
        avg: biometrics.summary.avgHR ?? 0,
        max: biometrics.summary.maxHR,
        min: biometrics.summary.minHR,
      };
    }
    return legacyHeartRate;
  }, [biometrics, legacyHeartRate]);
  
  // Use watch's split times directly, no need to calculate
  const splits = splitTimes;
  
  // Use performance data from watch if available, otherwise calculate
  const splitStats = useMemo(() => {
    // Prefer watch's performance data
    if (performance) {
      return {
        fastest: performance.bestSplit ?? 0,
        slowest: performance.worstSplit ?? 0,
        avg: avgSplit ?? Math.round(((performance.bestSplit ?? 0) + (performance.worstSplit ?? 0)) / 2),
        stdDev: performance.splitStdDev,
        firstShotTime: performance.firstShotTime,
      };
    }
    // Fallback to calculating from split times
    if (splits.length === 0) return null;
    const sorted = [...splits].sort((a, b) => a - b);
    return {
      fastest: sorted[0],
      slowest: sorted[sorted.length - 1],
      avg: Math.round(splits.reduce((a, b) => a + b, 0) / splits.length),
    };
  }, [splits, performance, avgSplit]);
  
  // Prepare chart data for splits
  const splitChartData = useMemo(() => {
    return splits.map((split, index) => ({
      value: split,
      label: `${index + 1}`,
      frontColor: split === splitStats?.fastest 
        ? colors.green 
        : split === splitStats?.slowest 
          ? colors.orange 
          : colors.primary,
    }));
  }, [splits, splitStats, colors]);
  
  // HR Timeline chart data with shot markers
  const hrTimelineData = useMemo(() => {
    if (!biometrics?.hrTimeline || biometrics.hrTimeline.length === 0) return [];
    return biometrics.hrTimeline.map(([timestamp, hr, shotNum]) => ({
      value: hr,
      dataPointColor: shotNum > 0 ? colors.orange : colors.primary,
      dataPointRadius: shotNum > 0 ? 6 : 3,
      // Add label for shots
      ...(shotNum > 0 && { dataPointText: `${shotNum}` }),
    }));
  }, [biometrics, colors]);
  
  // Breathing timeline chart data
  const breathTimelineData = useMemo(() => {
    if (!biometrics?.breathTimeline || biometrics.breathTimeline.length === 0) return [];
    return biometrics.breathTimeline.map(([timestamp, br, shotNum]) => ({
      value: br,
      dataPointColor: shotNum > 0 ? colors.green : colors.blue,
      dataPointRadius: shotNum > 0 ? 5 : 2,
    }));
  }, [biometrics, colors]);
  
  // Steadiness chart data - supports both new format (shots array) and legacy (shotScores)
  const steadinessChartData = useMemo(() => {
    // New format: shots array with objects (includes flinch and recoil data)
    if (steadiness?.shots && steadiness.shots.length > 0) {
      return steadiness.shots.map((shot) => ({
        value: shot.score,
        label: `${shot.shotNumber}`,
        frontColor: shot.flinch 
          ? colors.red  // Red border for flinch shots
          : shot.score >= 80 ? colors.green : shot.score >= 50 ? colors.orange : colors.red,
        // Additional data for tooltips
        grade: shot.grade,
        tremor: shot.tremor,
        drift: shot.drift,
        sway: shot.sway,
        flinch: shot.flinch,
        flinchMag: shot.flinchMag,
        recoilMag: shot.recoilMag,
        recoilDev: shot.recoilDev,
      }));
    }
    // Legacy format: shotScores number array
    if (steadiness?.shotScores && steadiness.shotScores.length > 0) {
      return steadiness.shotScores.map((score, index) => ({
        value: score,
        label: `${index + 1}`,
        frontColor: score >= 80 ? colors.green : score >= 50 ? colors.orange : colors.red,
      }));
    }
    return [];
  }, [steadiness, colors]);
  
  // Per-shot biometrics with breath phase colors
  const shotBiometricsWithColors = useMemo(() => {
    if (!biometrics?.shotBiometrics) return [];
    return biometrics.shotBiometrics.map((sb: ShotBiometrics) => ({
      ...sb,
      phaseColor: sb.breathPhase === 'pause' ? colors.green 
        : sb.breathPhase === 'exhale' ? colors.blue 
        : colors.orange,
      trendIcon: sb.hrTrend === 'rising' ? '↑' 
        : sb.hrTrend === 'falling' ? '↓' 
        : '→',
    }));
  }, [biometrics, colors]);
  
  // Parse hits
  const hitsCount = hitsInput.trim() ? parseInt(hitsInput) : shotsCount;
  const accuracy = shotsCount > 0 ? Math.round((hitsCount / shotsCount) * 100) : 0;

  // Format helpers
  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleSave = useCallback(async (shouldEndSession: boolean) => {
    if (!sessionId) return;
    
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (isAutoSaved) {
        // Data already saved - just end session if requested
        if (shouldEndSession) {
          console.log('[WatchResult] Auto-saved: just ending session...');
          await endSession(sessionId);
        }
        // If not ending, nothing to do - data is already saved
      } else {
        // Not auto-saved - save everything
        const validHits = Math.min(Math.max(0, hitsCount), shotsCount);
        await saveWatchSessionData({
          sessionId,
          shotsRecorded: shotsCount,
          hitsRecorded: validHits,
          durationMs: durationSec * 1000,
          distance: distanceM,
          completed: shouldEndSession,
          splitTimes: splitTimes.length > 0 ? splitTimes : undefined,
          avgSplitMs: avgSplit ?? undefined,
          performance: performance ?? undefined,
          biometrics: biometrics ?? undefined,
          steadiness: steadiness ?? undefined,
        }, shouldEndSession);
      }

      if (shouldEndSession) {
        if (teamId) {
          await loadTeamSessions();
        } else {
          await loadPersonalSessions();
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (trainingId) {
          router.replace({
            pathname: '/(protected)/trainingDetail',
            params: { id: trainingId },
          });
        } else {
          router.replace('/(protected)/(tabs)');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (error: any) {
      console.error('[WatchResult] Failed to save:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to save watch data');
      setSaving(false);
    }
  }, [sessionId, isAutoSaved, shotsCount, hitsCount, durationSec, distanceM, teamId, trainingId, splitTimes, avgSplit, performance, biometrics, steadiness, loadPersonalSessions, loadTeamSessions]);

  if (!sessionId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Missing session data
        </Text>
      </View>
    );
  }

  const hasChartData = splitTimes.length > 0;
  const hasHRTimeline = hrTimelineData.length > 0;
  const hasBreathTimeline = breathTimelineData.length > 0;
  const hasSteadiness = steadinessChartData.length > 0;
  const hasShotBiometrics = shotBiometricsWithColors.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
    <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { 
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
        }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.sourceTag, { backgroundColor: `${colors.green}22` }]}>
              <Watch size={14} color={colors.green} />
              <Text style={[styles.sourceText, { color: colors.green }]}>Garmin Watch</Text>
          </View>
          {isCompleted && (
            <View style={[styles.statusBadge, { backgroundColor: `${colors.green}22` }]}>
                <CheckCircle size={12} color={colors.green} />
              <Text style={[styles.statusText, { color: colors.green }]}>Completed</Text>
            </View>
          )}
        </View>
          <Text style={[styles.title, { color: colors.text }]}>Session Data</Text>
          {(drillName || weaponName) && (
            <View style={styles.headerMeta}>
              {drillName && (
                <Text style={[styles.drillName, { color: colors.textMuted }]}>{drillName}</Text>
              )}
              {drillName && weaponName && (
                <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
              )}
              {weaponName && (
                <Text style={[styles.weaponName, { color: colors.textMuted }]}>{weaponName}</Text>
              )}
      </View>
          )}
        </Animated.View>

        {/* Primary Stats Grid */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
        <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${colors.indigo}22` }]}>
                <Target size={22} color={colors.indigo} />
              </View>
              <Text style={[styles.statValue, styles.statValueLarge, { color: colors.text }]}>{shotsCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots Fired</Text>
          </View>

            <View style={[styles.statCard, styles.statCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
                <Clock size={22} color={colors.orange} />
              </View>
              <Text style={[styles.statValue, styles.statValueLarge, { color: colors.text }]}>{formatDuration(durationSec)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
          </View>

            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${colors.green}22` }]}>
              <MapPin size={18} color={colors.green} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{distanceM}m</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
          </View>

            {avgSplit && (
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.primary}22` }]}>
                  <Timer size={18} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatMs(avgSplit)}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Split</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Heart Rate Summary */}
        {heartRate && heartRate.avg > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Heart Rate</Text>
            <View style={[styles.heartRateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.heartIconBg, { backgroundColor: `${colors.red}22` }]}>
                <Heart size={24} color={colors.red} fill={colors.red} />
              </View>
              <View style={styles.heartRateStats}>
                <View style={styles.heartRateStat}>
                  <Text style={[styles.heartRateValue, { color: colors.text }]}>{heartRate.avg}</Text>
                  <Text style={[styles.heartRateLabel, { color: colors.textMuted }]}>Avg BPM</Text>
                </View>
                {heartRate.max && (
                  <View style={styles.heartRateStat}>
                    <Text style={[styles.heartRateValue, { color: colors.orange }]}>{heartRate.max}</Text>
                    <Text style={[styles.heartRateLabel, { color: colors.textMuted }]}>Max</Text>
                  </View>
                )}
                {heartRate.min && (
                  <View style={styles.heartRateStat}>
                    <Text style={[styles.heartRateValue, { color: colors.green }]}>{heartRate.min}</Text>
                    <Text style={[styles.heartRateLabel, { color: colors.textMuted }]}>Min</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* HR Timeline Chart - Simplified: Only show if explicitly requested */}
        {/* Timeline charts removed for faster display - data still saved */}

        {/* Breathing Summary */}
        {biometrics?.summary?.avgBreathRate && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Breathing</Text>
            <View style={[styles.breathCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.breathIconBg, { backgroundColor: `${colors.blue}22` }]}>
                <Wind size={24} color={colors.blue} />
              </View>
              <View style={styles.breathStats}>
                <Text style={[styles.breathValue, { color: colors.text }]}>
                  {biometrics.summary.avgBreathRate} <Text style={styles.breathUnit}>breaths/min</Text>
                </Text>
                <Text style={[styles.breathLabel, { color: colors.textMuted }]}>Average Breathing Rate</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Breathing Timeline Chart - Simplified: Removed for faster display */}

        {/* Per-Shot Biometrics */}
        {hasShotBiometrics && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Per-Shot Biometrics</Text>
            <View style={styles.shotBiometricsGrid}>
              {shotBiometricsWithColors.map((sb) => (
                <View 
                  key={sb.shot} 
                  style={[styles.shotBioCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.shotBioHeader}>
                    <Text style={[styles.shotNumber, { color: colors.text }]}>#{sb.shot}</Text>
                    <View style={[styles.phaseBadge, { backgroundColor: `${sb.phaseColor}22` }]}>
                      <Text style={[styles.phaseText, { color: sb.phaseColor }]}>
                        {sb.breathPhase || 'unknown'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.shotBioStats}>
                    <View style={styles.shotBioStat}>
                      <Heart size={12} color={colors.red} />
                      <Text style={[styles.shotBioValue, { color: colors.text }]}>
                        {sb.hr ?? '-'}
                        <Text style={{ fontSize: 10, color: colors.textMuted }}> {sb.trendIcon}</Text>
                      </Text>
                    </View>
                    {sb.br !== undefined && sb.br !== null && (
                      <View style={styles.shotBioStat}>
                        <Wind size={12} color={colors.blue} />
                        <Text style={[styles.shotBioValue, { color: colors.text }]}>{sb.br}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Steadiness - Summary Only (chart removed for speed) */}
        {steadiness?.avgScore && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Steadiness</Text>
            <View style={[styles.steadinessHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.steadinessIconBg, { 
                backgroundColor: steadiness.avgScore >= 70 ? `${colors.green}22` : `${colors.orange}22` 
              }]}>
                <Activity size={22} color={steadiness.avgScore >= 70 ? colors.green : colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.steadinessValue, { color: colors.text }]}>
                  {steadiness.avgScore.toFixed(0)}%
                </Text>
                <Text style={[styles.steadinessLabel, { color: colors.textMuted }]}>Average Steadiness</Text>
              </View>
              {steadiness.flinchCount !== undefined && steadiness.flinchCount > 0 && (
                <View style={[styles.flinchBadge, { backgroundColor: `${colors.red}22` }]}>
                  <Text style={[styles.flinchText, { color: colors.red }]}>
                    {steadiness.flinchCount} flinch
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Split Stats */}
        {splitStats && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Times</Text>
            <View style={styles.splitStatsRow}>
              <View style={[styles.splitStatCard, { backgroundColor: `${colors.green}15`, borderColor: `${colors.green}30` }]}>
                <Zap size={16} color={colors.green} />
                <Text style={[styles.splitStatValue, { color: colors.green }]}>{formatMs(splitStats.fastest)}</Text>
                <Text style={[styles.splitStatLabel, { color: colors.green }]}>Fastest</Text>
              </View>
              <View style={[styles.splitStatCard, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                <Activity size={16} color={colors.primary} />
                <Text style={[styles.splitStatValue, { color: colors.primary }]}>{formatMs(splitStats.avg)}</Text>
                <Text style={[styles.splitStatLabel, { color: colors.primary }]}>Average</Text>
              </View>
              <View style={[styles.splitStatCard, { backgroundColor: `${colors.orange}15`, borderColor: `${colors.orange}30` }]}>
                <TrendingUp size={16} color={colors.orange} />
                <Text style={[styles.splitStatValue, { color: colors.orange }]}>{formatMs(splitStats.slowest)}</Text>
                <Text style={[styles.splitStatLabel, { color: colors.orange }]}>Slowest</Text>
        </View>
      </View>
          </Animated.View>
        )}

        {/* Split Chart - Removed for faster display (data still saved) */}

      {/* Hits Input */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Record Hits</Text>
          <View style={[styles.hitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.hitsInputRow}>
          <View style={[styles.hitsIconBg, { backgroundColor: `${colors.green}22` }]}>
                <Crosshair size={22} color={colors.green} />
          </View>
          <TextInput
            style={[styles.hitsInput, { color: colors.text }]}
            placeholder={`${shotsCount}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={hitsInput}
            onChangeText={setHitsInput}
            maxLength={3}
          />
          <Text style={[styles.hitsLabel, { color: colors.textMuted }]}>
            of {shotsCount} shots
          </Text>
        </View>
            {hitsInput.trim() !== '' && (
              <View style={[styles.accuracyBadge, { 
                backgroundColor: accuracy >= 80 ? `${colors.green}22` : accuracy >= 50 ? `${colors.orange}22` : `${colors.red}22` 
              }]}>
                <Text style={[styles.accuracyText, { 
                  color: accuracy >= 80 ? colors.green : accuracy >= 50 ? colors.orange : colors.red 
                }]}>
                  {accuracy}% Accuracy
                </Text>
              </View>
            )}
            <Text style={[styles.hitsHint, { color: colors.textMuted }]}>
              Leave empty to assume all shots hit
            </Text>
          </View>
        </Animated.View>

        {/* Raw Data Debug */}
        {(hasChartData || biometrics || steadiness) && (
          <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.section}>
            <View style={[styles.rawDataCard, { backgroundColor: `${colors.text}08` }]}>
              <Ionicons name="code-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.rawDataText, { color: colors.textMuted }]} numberOfLines={3}>
                {biometrics ? `Biometrics: ${biometrics.hrTimeline?.length ?? 0} HR samples, ${biometrics.shotBiometrics?.length ?? 0} shot records` : ''}
                {steadiness ? `\nSteadiness: ${steadiness.shotScores?.length ?? 0} scores` : ''}
                {splitTimes.length > 0 ? `\nSplits: [${splitTimes.join(', ')}]` : ''}
          </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Fixed Footer Actions */}
      <View style={[styles.footer, { 
        paddingBottom: insets.bottom + 16,
        backgroundColor: colors.background,
        borderTopColor: colors.border,
      }]}>
        {/* Auto-saved indicator */}
        {isAutoSaved && (
          <View style={[styles.autoSavedBadge, { backgroundColor: colors.green + '20' }]}>
            <CheckCircle size={14} color={colors.green} />
            <Text style={[styles.autoSavedText, { color: colors.green }]}>
              Data saved automatically
            </Text>
      </View>
        )}

        <TouchableOpacity
          onPress={() => handleSave(true)}
          disabled={saving}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isAutoSaved ? 'End Session' : 'Save & End Session'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={saving}
            style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {isAutoSaved ? 'Continue Shooting' : 'Save & Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
            onPress={() => router.back()}
          disabled={saving}
            style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
              Cancel
          </Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { marginBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sourceText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  drillName: { fontSize: 14, fontWeight: '500' },
  weaponName: { fontSize: 14, fontWeight: '500' },
  metaDot: { width: 4, height: 4, borderRadius: 2 },
  
  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, letterSpacing: -0.3 },
  
  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  statCardLarge: { minWidth: '45%' },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  statValueLarge: { fontSize: 22 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  
  // Heart Rate
  heartRateCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 14 },
  heartIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heartRateStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  heartRateStat: { alignItems: 'center' },
  heartRateValue: { fontSize: 20, fontWeight: '700' },
  heartRateLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  
  // Breathing
  breathCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 14 },
  breathIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  breathStats: { flex: 1 },
  breathValue: { fontSize: 22, fontWeight: '700' },
  breathUnit: { fontSize: 14, fontWeight: '500' },
  breathLabel: { fontSize: 12, marginTop: 2 },
  
  // Charts
  chartCard: { padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', overflow: 'hidden' },
  chartHint: { fontSize: 10, marginTop: 10, textAlign: 'center' },
  
  // Shot Biometrics Grid
  shotBiometricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shotBioCard: { width: '30%', minWidth: 100, padding: 10, borderRadius: 10, borderWidth: 1 },
  shotBioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  shotNumber: { fontSize: 14, fontWeight: '700' },
  phaseBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  phaseText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  shotBioStats: { flexDirection: 'row', gap: 10 },
  shotBioStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shotBioValue: { fontSize: 12, fontWeight: '600' },
  
  // Steadiness
  steadinessHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 14, marginBottom: 10 },
  steadinessIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  steadinessValue: { fontSize: 24, fontWeight: '700' },
  steadinessLabel: { fontSize: 12 },
  flinchBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  flinchText: { fontSize: 12, fontWeight: '600' },
  
  // Split Stats
  splitStatsRow: { flexDirection: 'row', gap: 8 },
  splitStatCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  splitStatValue: { fontSize: 14, fontWeight: '700' },
  splitStatLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Hits Input
  hitsCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  hitsInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hitsIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hitsInput: { flex: 1, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  hitsLabel: { fontSize: 13, fontWeight: '500' },
  accuracyBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  accuracyText: { fontSize: 12, fontWeight: '700' },
  hitsHint: { fontSize: 11, fontStyle: 'italic' },
  
  // Raw Data
  rawDataCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8 },
  rawDataText: { flex: 1, fontSize: 10, fontFamily: 'SpaceMono', lineHeight: 14 },
  
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  autoSavedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10 },
  autoSavedText: { fontSize: 12, fontWeight: '600' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 8 },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 13, fontWeight: '600' },
  
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
});
