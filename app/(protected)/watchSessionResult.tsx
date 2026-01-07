/**
 * Watch Session Result - Full Page
 * 
 * Two-step flow:
 * 1. Hits Input - Elegant prompt for accuracy data
 * 2. Session Details - Full stats and charts
 * 
 * The hits input is prioritized as it's essential for learning patterns.
 */

import { WeatherCard } from '@/components/session/WeatherDisplay';
import { useColors } from '@/hooks/ui/useColors';
import type { GarminBiometrics, ShotBiometrics } from '@/services/garminService';
import type { DecodedWeather } from '@/services/session/watchTypes';
import { decodeWeather } from '@/services/session/weatherDecoder';
import { endSession, saveWatchSessionData, updateSessionHits } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  CheckCircle,
  Clock,
  Crosshair,
  MapPin,
  Target,
  Timer,
  TrendingUp,
  Watch,
  Wind,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


interface SteadinessShotData {
  shotNumber: number;
  score: number;
  grade: string;
  tremor?: number;
  drift?: number;
  sway?: number;
  samples?: number;
  anomaly?: boolean;
  flinch?: boolean;
  flinchMag?: number;
  recoilMag?: number;
  recoilDev?: number;
}

interface SteadinessData {
  enabled?: boolean;
  avgScore?: number;
  shotCount?: number;
  trend?: string;
  flinchCount?: number;
  flinchRate?: number;
  recoilConsistency?: number;
  bestShot?: number;
  bestScore?: number;
  worstShot?: number;
  worstScore?: number;
  shots?: SteadinessShotData[];
  gradeDistribution?: Record<string, number>;
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WatchSessionResultPage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadPersonalSessions, loadTeamSessions } = useSessionStore();
  const inputRef = useRef<TextInput>(null);
  
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
    drillName?: string;
    weaponName?: string;
    drillGoal?: string;
    performance?: string;
    biometrics?: string;
    steadiness?: string;
    weather?: string;
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
    drillName,
    weaponName,
    drillGoal,
    performance: performanceJson,
    biometrics: biometricsJson,
    steadiness: steadinessJson,
    weather: weatherJson,
  } = params;
  
  const isGroupingDrill = drillGoal === 'grouping';
  
  const isAutoSaved = autoSaved === '1';

  // ============================================================================
  // STATE
  // ============================================================================
  
  // For engagement: hits input, for grouping: group size input
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [saving, setSaving] = useState(false);
  const [hitsInput, setHitsInput] = useState('');
  const [groupSizeInput, setGroupSizeInput] = useState('');
  const [inputConfirmed, setInputConfirmed] = useState(false);

  // ============================================================================
  // PARSED DATA
  // ============================================================================

  const shotsCount = parseInt(shots || '0');
  const durationSec = parseInt(duration || '0');
  const distanceM = parseInt(distance || '0');
  const isCompleted = completed === '1';
  const avgSplit = avgSplitMs ? parseInt(avgSplitMs) : null;
  
  const splitTimes = useMemo(() => {
    if (!splitTimesJson) return [];
    try {
      return JSON.parse(splitTimesJson) as number[];
    } catch {
      return [];
    }
  }, [splitTimesJson]);
  
  const performance = useMemo((): PerformanceData | null => {
    if (!performanceJson) return null;
    try {
      return JSON.parse(performanceJson) as PerformanceData;
    } catch {
      return null;
    }
  }, [performanceJson]);
  
  const biometrics = useMemo((): GarminBiometrics | null => {
    if (!biometricsJson) return null;
    try {
      return JSON.parse(biometricsJson) as GarminBiometrics;
    } catch {
      return null;
    }
  }, [biometricsJson]);
  
  const steadiness = useMemo((): SteadinessData | null => {
    if (!steadinessJson) return null;
    try {
      return JSON.parse(steadinessJson) as SteadinessData;
    } catch {
      return null;
    }
  }, [steadinessJson]);
  
  const weather = useMemo((): DecodedWeather | null => {
    if (!weatherJson) return null;
    try {
      const parsed = JSON.parse(weatherJson);
      if (parsed.temperatureC !== undefined) {
        return parsed as DecodedWeather;
      }
      return decodeWeather(parsed);
    } catch {
      return null;
    }
  }, [weatherJson]);
  
  const splits = splitTimes;
  
  const splitStats = useMemo(() => {
    if (performance) {
      return {
        fastest: performance.bestSplit ?? 0,
        slowest: performance.worstSplit ?? 0,
        avg: avgSplit ?? Math.round(((performance.bestSplit ?? 0) + (performance.worstSplit ?? 0)) / 2),
        stdDev: performance.splitStdDev,
        firstShotTime: performance.firstShotTime,
      };
    }
    if (splits.length === 0) return null;
    const sorted = [...splits].sort((a, b) => a - b);
    return {
      fastest: sorted[0],
      slowest: sorted[sorted.length - 1],
      avg: Math.round(splits.reduce((a, b) => a + b, 0) / splits.length),
    };
  }, [splits, performance, avgSplit]);

  const steadinessChartData = useMemo(() => {
    if (steadiness?.shots && steadiness.shots.length > 0) {
      return steadiness.shots.map((shot) => ({
        value: shot.score,
        label: `${shot.shotNumber}`,
        frontColor: shot.flinch 
          ? colors.red
          : shot.score >= 80 ? colors.green : shot.score >= 50 ? colors.orange : colors.red,
        grade: shot.grade,
        flinch: shot.flinch,
      }));
    }
    if (steadiness?.shotScores && steadiness.shotScores.length > 0) {
      return steadiness.shotScores.map((score, index) => ({
        value: score,
        label: `${index + 1}`,
        frontColor: score >= 80 ? colors.green : score >= 50 ? colors.orange : colors.red,
      }));
    }
    return [];
  }, [steadiness, colors]);
  
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
  
  // Computed values for engagement - clamp hits to max of shotsCount
  const rawHits = hitsInput.trim() ? parseInt(hitsInput) : shotsCount;
  const hitsCount = Math.min(Math.max(0, rawHits || 0), shotsCount);
  const accuracy = shotsCount > 0 ? Math.round((hitsCount / shotsCount) * 100) : 0;
  const isHitsInputValid = !hitsInput.trim() || (rawHits >= 0 && rawHits <= shotsCount);
  const isOverMax = rawHits > shotsCount;
  
  // Computed values for grouping - group size in cm
  const groupSizeCm = groupSizeInput.trim() ? parseFloat(groupSizeInput) : null;
  const isGroupSizeValid = !groupSizeInput.trim() || (groupSizeCm !== null && groupSizeCm > 0 && groupSizeCm <= 100);

  // ============================================================================
  // HELPERS
  // ============================================================================

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

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleHitsChange = useCallback((text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    
    // Clamp to max shots if input exceeds
    if (cleaned) {
      const num = parseInt(cleaned);
      if (num > shotsCount) {
        setHitsInput(String(shotsCount));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
    }
    
    setHitsInput(cleaned);
  }, [shotsCount]);

  const handleGroupSizeChange = useCallback((text: string) => {
    // Allow digits and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setGroupSizeInput(formatted);
  }, []);

  const handleConfirmInput = useCallback(() => {
    Keyboard.dismiss();
    // Small delay to ensure keyboard is dismissed
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInputConfirmed(true);
      setStep('results');
    }, 100);
  }, []);

  const handleSkipInput = useCallback(() => {
    Keyboard.dismiss();
    if (isGroupingDrill) {
      // Skip group size - will leave it empty/unknown
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStep('results');
      }, 100);
    } else {
      // Default to all hits for engagement
      setHitsInput(String(shotsCount));
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setInputConfirmed(true);
        setStep('results');
      }, 100);
    }
  }, [shotsCount, isGroupingDrill]);

  const handleSave = useCallback(async (shouldEndSession: boolean) => {
    if (!sessionId) return;
    
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (isGroupingDrill) {
        // Grouping: save group size in cm
        if (isAutoSaved) {
          if (inputConfirmed && groupSizeCm) {
            await updateSessionGroupSize(sessionId, groupSizeCm);
          }
          if (shouldEndSession) {
            await endSession(sessionId);
          }
        } else {
          await saveWatchSessionData({
            sessionId,
            shotsRecorded: shotsCount,
            hitsRecorded: shotsCount, // For grouping, all shots count
            groupSizeCm: groupSizeCm ?? undefined,
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
      } else {
        // Engagement: save hits
        const validHits = Math.min(Math.max(0, hitsCount), shotsCount);
        
        if (isAutoSaved) {
          if (inputConfirmed) {
            await updateSessionHits(sessionId, validHits);
          }
          if (shouldEndSession) {
            await endSession(sessionId);
          }
        } else {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to save watch data');
      setSaving(false);
    }
  }, [sessionId, isAutoSaved, isGroupingDrill, shotsCount, hitsCount, groupSizeCm, inputConfirmed, durationSec, distanceM, teamId, trainingId, splitTimes, avgSplit, performance, biometrics, steadiness, loadPersonalSessions, loadTeamSessions]);

  // ============================================================================
  // RENDER - STEP 1: INPUT (Hits for Engagement, Group Size for Grouping)
  // ============================================================================

  if (step === 'input') {
    // Grouping: Show group size input
    if (isGroupingDrill) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={[styles.hitsContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}
          >
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.hitsHeader}>
              <Text style={[styles.hitsTitle, { color: colors.text }]}>
                Group Size
              </Text>
              <Text style={[styles.hitsSubtitle, { color: colors.textMuted }]}>
                {shotsCount} shots • {distanceM}m • {formatDuration(durationSec)}
              </Text>
            </Animated.View>

            {/* Input area */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.hitsInputArea}>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.bigInput, { color: colors.text }]}
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  value={groupSizeInput}
                  onChangeText={handleGroupSizeChange}
                  onSubmitEditing={handleConfirmInput}
                  blurOnSubmit={false}
                  autoFocus
                  selectTextOnFocus
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>
                  cm
                </Text>
              </View>

              {/* Group quality indicator */}
              {groupSizeInput.trim() !== '' && groupSizeCm && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.accuracyPreview}>
                  <Text style={[styles.accuracyPreviewText, { 
                    color: groupSizeCm <= 3 ? colors.green : groupSizeCm <= 6 ? colors.orange : colors.textMuted 
                  }]}>
                    {groupSizeCm <= 2 ? 'Excellent' : groupSizeCm <= 4 ? 'Good' : groupSizeCm <= 6 ? 'Average' : 'Practice more'}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* Hint */}
            <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.hintRow}>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Measure the widest spread between shots
              </Text>
            </Animated.View>

            {/* Action buttons */}
            <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.hitsActions}>
              <TouchableOpacity
                style={[styles.continueBtn, { 
                  backgroundColor: groupSizeInput.trim() ? colors.primary : colors.card,
                  borderWidth: groupSizeInput.trim() ? 0 : 1,
                  borderColor: colors.border,
                }]}
                onPress={handleConfirmInput}
                disabled={!groupSizeInput.trim() || !isGroupSizeValid}
                activeOpacity={0.8}
              >
                <Text style={[styles.continueBtnText, { 
                  color: groupSizeInput.trim() ? '#fff' : colors.textMuted 
                }]}>
                  Confirm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkipInput}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
                  Skip — add later via scan
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      );
    }

    // Engagement: Show hits input
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={[styles.hitsContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.hitsHeader}>
            <Text style={[styles.hitsTitle, { color: colors.text }]}>
              Hits Recorded
            </Text>
            <Text style={[styles.hitsSubtitle, { color: colors.textMuted }]}>
              {shotsCount} shots • {formatDuration(durationSec)}
            </Text>
          </Animated.View>

          {/* Input area */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.hitsInputArea}>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                ref={inputRef}
                style={[styles.bigInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                returnKeyType="done"
                value={hitsInput}
                onChangeText={handleHitsChange}
                onSubmitEditing={handleConfirmInput}
                blurOnSubmit={false}
                maxLength={String(shotsCount).length}
                autoFocus
                selectTextOnFocus
              />
              <View style={styles.inputDivider} />
              <Text style={[styles.inputTotal, { color: colors.textMuted }]}>
                {shotsCount}
              </Text>
            </View>

            {/* Live accuracy */}
            {hitsInput.trim() !== '' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.accuracyPreview}>
                <Text style={[styles.accuracyPreviewText, { 
                  color: accuracy >= 80 ? colors.green : accuracy >= 50 ? colors.orange : colors.textMuted 
                }]}>
                  {accuracy}%
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Hint */}
          <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.hintRow}>
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              Best estimate is fine — this helps track your progress
            </Text>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.hitsActions}>
            <TouchableOpacity
              style={[styles.continueBtn, { 
                backgroundColor: hitsInput.trim() ? colors.primary : colors.card,
                borderWidth: hitsInput.trim() ? 0 : 1,
                borderColor: colors.border,
              }]}
              onPress={handleConfirmInput}
              disabled={!hitsInput.trim()}
              activeOpacity={0.8}
            >
              <Text style={[styles.continueBtnText, { 
                color: hitsInput.trim() ? '#fff' : colors.textMuted 
              }]}>
                Confirm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkipInput}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
                Skip — assume all hit
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  // ============================================================================
  // RENDER - STEP 2: FULL RESULTS
  // ============================================================================

  if (!sessionId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Missing session data
        </Text>
      </View>
    );
  }

  const hasSteadiness = steadinessChartData.length > 0;
  const hasShotBiometrics = shotBiometricsWithColors.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        entering={SlideInRight.duration(300)}
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
          <Text style={[styles.title, { color: colors.text }]}>Session Results</Text>
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

        {/* Accuracy Highlight */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.section}>
          <View style={[styles.accuracyCard, { 
            backgroundColor: accuracy >= 80 ? `${colors.green}12` : accuracy >= 50 ? `${colors.orange}12` : `${colors.red}12`,
            borderColor: accuracy >= 80 ? `${colors.green}30` : accuracy >= 50 ? `${colors.orange}30` : `${colors.red}30`,
          }]}>
            <View style={styles.accuracyMain}>
              <Crosshair size={28} color={accuracy >= 80 ? colors.green : accuracy >= 50 ? colors.orange : colors.red} />
              <Text style={[styles.accuracyValue, { 
                color: accuracy >= 80 ? colors.green : accuracy >= 50 ? colors.orange : colors.red 
              }]}>
                {accuracy}%
              </Text>
              <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>Accuracy</Text>
            </View>
            <View style={styles.accuracyDetails}>
              <Text style={[styles.accuracyDetailText, { color: colors.text }]}>
                {hitsCount} hits / {shotsCount} shots
              </Text>
            </View>
          </View>
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
        {biometrics?.summary?.avgHR && (
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Heart Rate</Text>
            <View style={[styles.breathCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.breathIconBg, { backgroundColor: `${colors.red}22` }]}>
                <Activity size={24} color={colors.red} />
              </View>
              <View style={styles.breathStats}>
                <Text style={[styles.breathValue, { color: colors.text }]}>
                  {biometrics.summary.avgHR} <Text style={styles.breathUnit}>bpm avg</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  {biometrics.summary.minHR && (
                    <Text style={[styles.breathLabel, { color: colors.textMuted }]}>
                      Min: {biometrics.summary.minHR}
                    </Text>
                  )}
                  {biometrics.summary.maxHR && (
                    <Text style={[styles.breathLabel, { color: colors.textMuted }]}>
                      Max: {biometrics.summary.maxHR}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        )}

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

        {/* Weather Conditions */}
        {weather && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weather Conditions</Text>
            <WeatherCard weather={weather} />
          </Animated.View>
        )}

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
                    {sb.hr !== undefined && sb.hr !== null && (
                      <View style={styles.shotBioStat}>
                        <Activity size={12} color={colors.red} />
                        <Text style={[styles.shotBioValue, { color: colors.text }]}>{sb.hr}</Text>
                      </View>
                    )}
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

        {/* Steadiness */}
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

        {/* Raw Data Debug */}
        {(splitTimes.length > 0 || biometrics || steadiness) && (
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
      </Animated.ScrollView>

      {/* Fixed Footer Actions */}
      <View style={[styles.footer, { 
        paddingBottom: insets.bottom + 16,
        backgroundColor: colors.background,
        borderTopColor: colors.border,
      }]}>
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // ============================================================================
  // STEP 1: HITS INPUT STYLES
  // ============================================================================
  
  hitsContainer: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  hitsHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  hitsTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  hitsSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  hitsInputArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  bigInput: {
    fontSize: 56,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 70,
    letterSpacing: -2,
  },
  inputDivider: {
    width: 2,
    height: 40,
    backgroundColor: '#888',
    marginHorizontal: 16,
    opacity: 0.3,
    transform: [{ rotate: '15deg' }],
  },
  inputTotal: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
    opacity: 0.4,
  },
  accuracyPreview: {
    marginTop: 20,
  },
  accuracyPreviewText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  hintRow: {
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  encourageTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  encourageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  hitsActions: {
    width: '100%',
    gap: 16,
  },
  continueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ============================================================================
  // STEP 2: RESULTS STYLES
  // ============================================================================

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
  
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, letterSpacing: -0.3 },
  
  // Accuracy highlight
  accuracyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  accuracyMain: {
    alignItems: 'center',
    gap: 4,
  },
  accuracyValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  accuracyLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accuracyDetails: {},
  accuracyDetailText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  statCardLarge: { minWidth: '45%' },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  statValueLarge: { fontSize: 22 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  
  // Breathing
  breathCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 14 },
  breathIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  breathStats: { flex: 1 },
  breathValue: { fontSize: 22, fontWeight: '700' },
  breathUnit: { fontSize: 14, fontWeight: '500' },
  breathLabel: { fontSize: 12, marginTop: 2 },
  
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
