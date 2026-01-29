/**
 * Watch Session Result - Clean single-page overview
 *
 * Shows session stats from watch with an inline input for hits/group size.
 * Saves and navigates to recent sessions on completion.
 */

import { WeatherCard } from '@/components/session/WeatherDisplay';
import { useColors } from '@/hooks/ui/useColors';
import type { GarminBiometrics } from '@/services/garminService';
import type { DecodedWeather } from '@/types/session.watch';
import { decodeWeather } from '@/services/session/weatherDecoder';
import { endSession, saveWatchSessionData } from '@/services/session/mutations';
import { updateSessionHits } from '@/services/session/targets';
import { useSessionStore } from '@/stores/sessionStore';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Activity, CheckCircle, Clock, Crosshair, MapPin, Target, Timer, Watch, Wind, Zap } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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

  // State
  const [saving, setSaving] = useState(false);
  const [hitsInput, setHitsInput] = useState('');
  const [groupSizeInput, setGroupSizeInput] = useState('');

  // Parsed data
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

  const performance = useMemo(() => {
    if (!performanceJson) return null;
    try {
      return JSON.parse(performanceJson);
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

  const steadiness = useMemo(() => {
    if (!steadinessJson) return null;
    try {
      return JSON.parse(steadinessJson);
    } catch {
      return null;
    }
  }, [steadinessJson]);

  const weather = useMemo((): DecodedWeather | null => {
    if (!weatherJson) return null;
    try {
      const parsed = JSON.parse(weatherJson);
      if (parsed.temperatureC !== undefined) return parsed as DecodedWeather;
      return decodeWeather(parsed);
    } catch {
      return null;
    }
  }, [weatherJson]);

  const splitStats = useMemo(() => {
    if (performance) {
      return {
        fastest: performance.bestSplit ?? 0,
        slowest: performance.worstSplit ?? 0,
        avg: avgSplit ?? Math.round(((performance.bestSplit ?? 0) + (performance.worstSplit ?? 0)) / 2),
      };
    }
    if (splitTimes.length === 0) return null;
    const sorted = [...splitTimes].sort((a, b) => a - b);
    return {
      fastest: sorted[0],
      slowest: sorted[sorted.length - 1],
      avg: Math.round(splitTimes.reduce((a, b) => a + b, 0) / splitTimes.length),
    };
  }, [splitTimes, performance, avgSplit]);

  // Computed values
  const rawHits = hitsInput.trim() ? parseInt(hitsInput) : shotsCount;
  const hitsCount = Math.min(Math.max(0, rawHits || 0), shotsCount);
  const accuracy = shotsCount > 0 ? Math.round((hitsCount / shotsCount) * 100) : 0;
  const groupSizeCm = groupSizeInput.trim() ? parseFloat(groupSizeInput) : null;

  // Helpers
  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  };

  const formatMs = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`);

  // Handlers
  const handleHitsChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned) {
        const num = parseInt(cleaned);
        if (num > shotsCount) {
          setHitsInput(String(shotsCount));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
      }
      setHitsInput(cleaned);
    },
    [shotsCount]
  );

  const handleGroupSizeChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    setGroupSizeInput(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned);
  }, []);

  const handleSave = useCallback(
    async (shouldEnd: boolean) => {
      if (!sessionId) return;
      setSaving(true);
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const validHits = isGroupingDrill ? shotsCount : Math.min(Math.max(0, hitsCount), shotsCount);

        if (isAutoSaved) {
          if (hitsInput.trim() || groupSizeInput.trim()) {
            await updateSessionHits(sessionId, validHits);
          }
          if (shouldEnd) await endSession(sessionId);
        } else {
          await saveWatchSessionData(
            {
              sessionId,
              shotsRecorded: shotsCount,
              hitsRecorded: validHits,
              durationMs: durationSec * 1000,
              distance: distanceM,
              completed: shouldEnd,
              splitTimes: splitTimes.length > 0 ? splitTimes : undefined,
              avgSplitMs: avgSplit ?? undefined,
              performance: performance ?? undefined,
              biometrics: biometrics ?? undefined,
              steadiness: steadiness ?? undefined,
            },
            shouldEnd
          );
        }

        if (shouldEnd) {
          if (teamId) await loadTeamSessions();
          else await loadPersonalSessions();

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (trainingId) {
            router.replace({ pathname: '/(protected)/trainingDetail', params: { id: trainingId } });
          } else {
            router.replace('/(protected)/(tabs)');
          }
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        }
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', error.message || 'Failed to save session data');
        setSaving(false);
      }
    },
    [
      sessionId,
      isAutoSaved,
      isGroupingDrill,
      shotsCount,
      hitsCount,
      hitsInput,
      groupSizeInput,
      durationSec,
      distanceM,
      teamId,
      trainingId,
      splitTimes,
      avgSplit,
      performance,
      biometrics,
      steadiness,
      loadPersonalSessions,
      loadTeamSessions,
    ]
  );

  if (!sessionId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Missing session data</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View style={styles.headerBadges}>
            <View style={[styles.badge, { backgroundColor: `${colors.green}18` }]}>
              <Watch size={14} color={colors.green} />
              <Text style={[styles.badgeText, { color: colors.green }]}>Watch</Text>
            </View>
            {isCompleted && (
              <View style={[styles.badge, { backgroundColor: `${colors.green}18` }]}>
                <CheckCircle size={12} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>Done</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Session Complete</Text>
          {(drillName || weaponName) && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {[drillName, weaponName].filter(Boolean).join(' • ')}
            </Text>
          )}
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.quickStats}>
          <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Target size={18} color={colors.primary} />
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{shotsCount}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Shots</Text>
          </View>
          <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Clock size={18} color={colors.orange} />
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{formatDuration(durationSec)}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Duration</Text>
          </View>
          <View style={[styles.quickStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MapPin size={18} color={colors.green} />
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{distanceM}m</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Distance</Text>
          </View>
        </Animated.View>

        {/* Inline Input — Hits or Group Size */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
          {isGroupingDrill ? (
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputCardHeader}>
                <Crosshair size={18} color={colors.primary} />
                <Text style={[styles.inputCardTitle, { color: colors.text }]}>Group Size (cm)</Text>
              </View>
              <TextInput
                style={[styles.inlineInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Optional — measure widest spread"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={groupSizeInput}
                onChangeText={handleGroupSizeChange}
              />
              {groupSizeCm && (
                <Text
                  style={[
                    styles.inputHint,
                    { color: groupSizeCm <= 3 ? colors.green : groupSizeCm <= 6 ? colors.orange : colors.textMuted },
                  ]}
                >
                  {groupSizeCm <= 2 ? 'Excellent' : groupSizeCm <= 4 ? 'Good' : groupSizeCm <= 6 ? 'Average' : 'Keep practicing'}
                </Text>
              )}
            </View>
          ) : (
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inputCardHeader}>
                <Crosshair size={18} color={colors.primary} />
                <Text style={[styles.inputCardTitle, { color: colors.text }]}>Hits on Target</Text>
              </View>
              <View style={styles.hitsRow}>
                <TextInput
                  style={[styles.inlineInput, styles.hitsInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder={String(shotsCount)}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={hitsInput}
                  onChangeText={handleHitsChange}
                  maxLength={String(shotsCount).length}
                />
                <Text style={[styles.hitsTotal, { color: colors.textMuted }]}>/ {shotsCount}</Text>
                {hitsInput.trim() !== '' && (
                  <Animated.View entering={FadeIn.duration(200)} style={[styles.accuracyBadge, { backgroundColor: `${accuracy >= 80 ? colors.green : accuracy >= 50 ? colors.orange : colors.red}18` }]}>
                    <Text style={[styles.accuracyText, { color: accuracy >= 80 ? colors.green : accuracy >= 50 ? colors.orange : colors.red }]}>
                      {accuracy}%
                    </Text>
                  </Animated.View>
                )}
              </View>
              <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                Leave empty to assume all hit
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Avg Split */}
        {avgSplit && (
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.section}>
            <View style={[styles.metricRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.metricIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Timer size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.metricValue, { color: colors.text }]}>{formatMs(avgSplit)}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Avg Split Time</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Split Stats */}
        {splitStats && (
          <Animated.View entering={FadeInDown.delay(180).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Times</Text>
            <View style={styles.splitRow}>
              <View style={[styles.splitCard, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}25` }]}>
                <Zap size={14} color={colors.green} />
                <Text style={[styles.splitValue, { color: colors.green }]}>{formatMs(splitStats.fastest)}</Text>
                <Text style={[styles.splitLabel, { color: colors.green }]}>Fastest</Text>
              </View>
              <View style={[styles.splitCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
                <Activity size={14} color={colors.primary} />
                <Text style={[styles.splitValue, { color: colors.primary }]}>{formatMs(splitStats.avg)}</Text>
                <Text style={[styles.splitLabel, { color: colors.primary }]}>Average</Text>
              </View>
              <View style={[styles.splitCard, { backgroundColor: `${colors.orange}12`, borderColor: `${colors.orange}25` }]}>
                <Activity size={14} color={colors.orange} />
                <Text style={[styles.splitValue, { color: colors.orange }]}>{formatMs(splitStats.slowest)}</Text>
                <Text style={[styles.splitLabel, { color: colors.orange }]}>Slowest</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Steadiness */}
        {steadiness?.avgScore && (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
            <View style={[styles.metricRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.metricIcon,
                  { backgroundColor: `${steadiness.avgScore >= 70 ? colors.green : colors.orange}18` },
                ]}
              >
                <Activity size={18} color={steadiness.avgScore >= 70 ? colors.green : colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.metricValue, { color: colors.text }]}>{steadiness.avgScore.toFixed(0)}%</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Steadiness</Text>
              </View>
              {steadiness.flinchCount > 0 && (
                <View style={[styles.flinchBadge, { backgroundColor: `${colors.red}18` }]}>
                  <Text style={[styles.flinchText, { color: colors.red }]}>{steadiness.flinchCount} flinch</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Breathing */}
        {biometrics?.summary?.avgBreathRate && (
          <Animated.View entering={FadeInDown.delay(220).duration(300)} style={styles.section}>
            <View style={[styles.metricRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.metricIcon, { backgroundColor: `${colors.blue}18` }]}>
                <Wind size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {biometrics.summary.avgBreathRate} <Text style={styles.metricUnit}>bpm</Text>
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Breathing Rate</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Weather */}
        {weather && (
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Conditions</Text>
            <WeatherCard weather={weather} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {isAutoSaved && (
          <View style={[styles.autoSavedRow, { backgroundColor: `${colors.green}15` }]}>
            <CheckCircle size={13} color={colors.green} />
            <Text style={[styles.autoSavedText, { color: colors.green }]}>Data saved automatically</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={() => handleSave(true)}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{isAutoSaved ? 'End Session' : 'Save & Finish'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSave(false)}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              {isAutoSaved ? 'Continue' : 'Save & Continue'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Cancel</Text>
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

  // Header
  header: { marginBottom: 20 },
  headerBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Quick Stats
  quickStats: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  quickStatValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  quickStatLabel: { fontSize: 11, fontWeight: '500' },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, letterSpacing: -0.2 },

  // Input card
  inputCard: { padding: 16, borderRadius: 14, borderWidth: 1 },
  inputCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inputCardTitle: { fontSize: 15, fontWeight: '600' },
  inlineInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
  },
  hitsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hitsInput: { width: 80, textAlign: 'center' },
  hitsTotal: { fontSize: 18, fontWeight: '600' },
  accuracyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 'auto' },
  accuracyText: { fontSize: 16, fontWeight: '700' },
  inputHint: { fontSize: 12, marginTop: 8 },

  // Metric row
  metricRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  metricIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  metricLabel: { fontSize: 12, marginTop: 1 },
  metricUnit: { fontSize: 13, fontWeight: '500' },

  // Flinch badge
  flinchBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  flinchText: { fontSize: 12, fontWeight: '600' },

  // Split times
  splitRow: { flexDirection: 'row', gap: 8 },
  splitCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  splitValue: { fontSize: 13, fontWeight: '700' },
  splitLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  autoSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
  },
  autoSavedText: { fontSize: 12, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 13,
    marginBottom: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },

  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
});
