/**
 * Session Results Screen
 *
 * Full-page display of session results including:
 * - Summary stats
 * - Shot timing chart (split times)
 * - Heart rate chart (if available)
 * - Watch data details
 */

import { WeatherCard } from '@/components/session/WeatherDisplay';
import { StandardsVerdict } from '@/components/standards';
import { useColors } from '@/hooks/ui/useColors';
import type { GarminSessionData } from '@/services/garminService';
import { getSessionById } from '@/services/session/queries';
import { getSessionTargetsWithResults } from '@/services/session/targets';
import type { SessionTargetWithResults, SessionWithDetails } from '@/services/session/types';
import type { DecodedWeather } from '@/services/session/watchTypes';
import { decodeWeather } from '@/services/session/weatherDecoder';
import { getSessionVerdict, type SessionVerdict } from '@/services/standards';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  CheckCircle,
  Clock,
  Crosshair,
  Focus,
  Heart,
  MapPin,
  Scan,
  Target,
  Timer,
  TrendingUp,
  Watch,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }
  return `${seconds}.${tenths}s`;
}

function formatSplitTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function calculateSplits(timestamps: number[]): number[] {
  if (timestamps.length < 2) return [];
  const splits: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    splits.push(timestamps[i] - timestamps[i - 1]);
  }
  return splits;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SessionResultsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    sessionId,
    watchData: watchDataParam,
    trainingId,
  } = useLocalSearchParams<{
    sessionId: string;
    watchData?: string;
    trainingId?: string;
  }>();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [verdict, setVerdict] = useState<SessionVerdict | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse watch data from params
  const watchData: GarminSessionData | null = watchDataParam ? JSON.parse(watchDataParam) : null;

  useEffect(() => {
    if (sessionId) {
      Promise.all([
        getSessionById(sessionId),
        getSessionTargetsWithResults(sessionId),
        getSessionVerdict(sessionId).catch(() => null),
      ])
        .then(([sessionData, targetData, verdictData]) => {
          setSession(sessionData);
          setTargets(targetData);
          setVerdict(verdictData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [sessionId]);

  // ============================================================================
  // COMPUTED TARGET STATS - Separate SCAN vs MANUAL
  // ============================================================================
  const targetStats = useMemo(() => {
    let manualShots = 0;
    let manualHits = 0;
    let scannedHoles = 0;
    let bestDispersion: number | null = null;
    let groupingCount = 0;
    let scanCount = 0;
    let manualCount = 0;

    for (const t of targets) {
      const isPaper = t.target_type === 'paper';
      const paperResult = t.paper_result;
      const tacticalResult = t.tactical_result;
      const isScanned = isPaper && !!paperResult?.scanned_image_url;
      const isGrouping = isPaper && paperResult?.paper_type === 'grouping';

      if (isGrouping) {
        groupingCount++;
        const disp = paperResult?.dispersion_cm;
        if (disp != null && (bestDispersion == null || disp < bestDispersion)) {
          bestDispersion = disp;
        }
      } else if (isScanned) {
        scanCount++;
        scannedHoles += paperResult?.hits_total ?? 0;
      } else if (isPaper || tacticalResult) {
        manualCount++;
        manualShots += paperResult?.bullets_fired ?? tacticalResult?.bullets_fired ?? 0;
        manualHits += paperResult?.hits_total ?? tacticalResult?.hits ?? 0;
      }
    }

    const manualAccuracy = manualShots > 0 ? Math.round((manualHits / manualShots) * 100) : 0;

    return {
      manualShots,
      manualHits,
      manualAccuracy,
      scannedHoles,
      bestDispersion,
      groupingCount,
      scanCount,
      manualCount,
      hasManual: manualCount > 0,
      hasScan: scanCount > 0,
      hasGrouping: groupingCount > 0,
    };
  }, [targets]);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const handleGoHome = useCallback(() => {
    // If this was a team training session, go back to training detail
    const targetTrainingId = trainingId || session?.training_id;
    if (targetTrainingId) {
      router.replace({
        pathname: '/(protected)/trainingDetail',
        params: { id: targetTrainingId },
      });
    } else {
      router.replace('/(protected)/(tabs)');
    }
  }, [trainingId, session?.training_id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const drill = session?.drill_config;
  const drillName = session?.drill_name || drill?.name || 'Practice Session';

  // Decode weather from session or watch data (if available)
  const weather: DecodedWeather | null = useMemo(() => {
    // 1. First check session.weather (from OpenWeatherMap or stored data)
    if (session?.weather) {
      const sessionWeather = session.weather as any;
      // If it's SessionWeatherData format, convert to DecodedWeather
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
      // If already in DecodedWeather format
      if (sessionWeather.temperatureC !== undefined) {
        return sessionWeather as DecodedWeather;
      }
    }

    // 2. Fall back to watchData weather
    const rawWeather = (watchData as any)?.weather;
    if (rawWeather) {
      // If already decoded (has temperatureC), use as-is
      if (rawWeather.temperatureC !== undefined) {
        return rawWeather as DecodedWeather;
      }
      // Otherwise decode from compact format
      return decodeWeather(rawWeather);
    }
    return null;
  }, [session?.weather, watchData]);

  // Calculate splits from timestamps
  const shotTimestamps = watchData?.shotTimestamps || [];
  const splits = calculateSplits(shotTimestamps);
  const avgSplit = splits.length > 0 ? splits.reduce((a, b) => a + b, 0) / splits.length : 0;
  const fastestSplit = splits.length > 0 ? Math.min(...splits) : 0;
  const slowestSplit = splits.length > 0 ? Math.max(...splits) : 0;

  // Chart data for splits
  const splitChartData = splits.map((split, index) => ({
    value: split,
    label: `${index + 1}`,
    frontColor: split === fastestSplit ? colors.green : split === slowestSplit ? colors.destructive : colors.primary,
  }));

  // Shot timeline data
  const timelineData = shotTimestamps.map((ts, index) => ({
    value: ts / 1000, // Convert to seconds
    dataPointText: `${index + 1}`,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.secondary }]} onPress={handleClose}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Session Complete</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        <View style={[styles.successBanner, { backgroundColor: `${colors.green}15` }]}>
          <CheckCircle size={32} color={colors.green} />
          <Text style={[styles.successTitle, { color: colors.green }]}>{drillName}</Text>
          <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>Session recorded successfully</Text>
        </View>

        {/* Standards Verdict (team sessions only) */}
        {session?.team_id && (
          <View style={styles.verdictContainer}>
            <StandardsVerdict verdict={verdict} />
          </View>
        )}

        {/* Quick Stats - Smart display based on entry type */}
        <View style={styles.statsGrid}>
          {targetStats.hasManual ? (
            // MANUAL: Show accuracy + hits/shots
            <>
              <StatCard
                icon={<Crosshair size={18} color={colors.green} />}
                label="Accuracy"
                value={`${targetStats.manualAccuracy}%`}
                colors={colors}
                valueColor={
                  targetStats.manualAccuracy >= 70
                    ? colors.green
                    : targetStats.manualAccuracy >= 50
                      ? colors.orange
                      : colors.destructive
                }
              />
              <StatCard
                icon={<Target size={18} color={colors.primary} />}
                label="Hits"
                value={`${targetStats.manualHits}/${targetStats.manualShots}`}
                colors={colors}
              />
            </>
          ) : targetStats.hasScan ? (
            // SCANNED: Show holes (NO accuracy)
            <>
              <StatCard
                icon={<Scan size={18} color="#A78BFA" />}
                label="Holes"
                value={String(targetStats.scannedHoles)}
                colors={colors}
                valueColor="#A78BFA"
              />
              <StatCard
                icon={<Ionicons name="alert-circle-outline" size={18} color={colors.textMuted} />}
                label="Accuracy"
                value="N/A"
                colors={colors}
                valueColor={colors.textMuted}
              />
            </>
          ) : targetStats.hasGrouping ? (
            // GROUPING: Show best dispersion
            <>
              <StatCard
                icon={<Focus size={18} color={colors.green} />}
                label="Best Group"
                value={targetStats.bestDispersion != null ? `${targetStats.bestDispersion.toFixed(1)}cm` : '-'}
                colors={colors}
                valueColor={colors.green}
              />
              <StatCard
                icon={<Target size={18} color={colors.primary} />}
                label="Groups"
                value={String(targetStats.groupingCount)}
                colors={colors}
              />
            </>
          ) : watchData ? (
            // WATCH ONLY: Show watch stats
            <>
              <StatCard
                icon={<Zap size={18} color={colors.primary} />}
                label="Shots"
                value={String(watchData.shotsRecorded || 0)}
                colors={colors}
              />
              <StatCard
                icon={<Timer size={18} color={colors.blue} />}
                label="Avg Split"
                value={avgSplit > 0 ? formatSplitTime(avgSplit) : '-'}
                colors={colors}
              />
            </>
          ) : (
            // NO DATA
            <StatCard
              icon={<Target size={18} color={colors.textMuted} />}
              label="Targets"
              value={String(targets.length)}
              colors={colors}
            />
          )}

          {/* Always show these */}
          <StatCard
            icon={<MapPin size={18} color={colors.textMuted} />}
            label="Distance"
            value={`${watchData?.distance || drill?.distance_m || '-'}m`}
            colors={colors}
          />
          {watchData?.durationMs ? (
            <StatCard
              icon={<Clock size={18} color={colors.orange} />}
              label="Duration"
              value={formatDuration(watchData.durationMs)}
              colors={colors}
            />
          ) : (
            <StatCard
              icon={<Target size={18} color={colors.textMuted} />}
              label="Targets"
              value={String(targets.length)}
              colors={colors}
            />
          )}
        </View>

        {/* Entry type indicator */}
        {(targetStats.hasManual || targetStats.hasScan || targetStats.hasGrouping) && (
          <View
            style={[
              styles.entryTypeBadge,
              {
                backgroundColor: targetStats.hasManual ? '#3B82F615' : targetStats.hasScan ? '#8B5CF615' : '#22C55E15',
              },
            ]}
          >
            {targetStats.hasManual ? (
              <>
                <Crosshair size={14} color="#60A5FA" />
                <Text style={[styles.entryTypeBadgeText, { color: '#60A5FA' }]}>
                  Manual entry • Accuracy calculated
                </Text>
              </>
            ) : targetStats.hasScan ? (
              <>
                <Scan size={14} color="#A78BFA" />
                <Text style={[styles.entryTypeBadgeText, { color: '#A78BFA' }]}>
                  Scanned • Accuracy unavailable (shots unknown)
                </Text>
              </>
            ) : (
              <>
                <Focus size={14} color="#22C55E" />
                <Text style={[styles.entryTypeBadgeText, { color: '#22C55E' }]}>Grouping • Measuring consistency</Text>
              </>
            )}
          </View>
        )}

        {/* Weapon Info */}
        {session?.weapon_name && (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Target size={18} color={colors.primary} />
            <View style={styles.infoCardContent}>
              <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>Weapon</Text>
              <Text style={[styles.infoCardValue, { color: colors.text }]}>{session.weapon_name}</Text>
            </View>
          </View>
        )}

        {/* Watch Data Badge */}
        {watchData && (
          <View style={[styles.watchBadge, { backgroundColor: `${colors.green}10` }]}>
            <Watch size={16} color={colors.green} />
            <Text style={[styles.watchBadgeText, { color: colors.green }]}>Data synced from watch</Text>
          </View>
        )}

        {/* Split Times Chart */}
        {splits.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <Activity size={18} color={colors.primary} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Split Times</Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>Time between shots (ms)</Text>

            <View style={styles.chartContainer}>
              <BarChart
                data={splitChartData}
                barWidth={Math.min(30, (300 - splits.length * 8) / splits.length)}
                spacing={8}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                noOfSections={4}
                maxValue={slowestSplit * 1.2}
                isAnimated
                animationDuration={500}
              />
            </View>

            {/* Split Stats */}
            <View style={styles.splitStats}>
              <View style={styles.splitStatItem}>
                <View style={[styles.splitDot, { backgroundColor: colors.green }]} />
                <Text style={[styles.splitStatLabel, { color: colors.textMuted }]}>Fastest</Text>
                <Text style={[styles.splitStatValue, { color: colors.text }]}>{formatSplitTime(fastestSplit)}</Text>
              </View>
              <View style={styles.splitStatItem}>
                <View style={[styles.splitDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.splitStatLabel, { color: colors.textMuted }]}>Average</Text>
                <Text style={[styles.splitStatValue, { color: colors.text }]}>{formatSplitTime(avgSplit)}</Text>
              </View>
              <View style={styles.splitStatItem}>
                <View style={[styles.splitDot, { backgroundColor: colors.destructive }]} />
                <Text style={[styles.splitStatLabel, { color: colors.textMuted }]}>Slowest</Text>
                <Text style={[styles.splitStatValue, { color: colors.text }]}>{formatSplitTime(slowestSplit)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Shot Timeline */}
        {shotTimestamps.length > 1 && (
          <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <TrendingUp size={18} color={colors.blue} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Shot Timeline</Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>When each shot was fired (seconds)</Text>

            <View style={styles.chartContainer}>
              <LineChart
                data={timelineData}
                height={150}
                spacing={Math.min(40, 280 / shotTimestamps.length)}
                color={colors.blue}
                thickness={2}
                hideDataPoints={false}
                dataPointsColor={colors.blue}
                dataPointsRadius={4}
                hideRules
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                isAnimated
                animationDuration={500}
                curved
              />
            </View>
          </View>
        )}

        {/* Heart Rate */}
        {watchData?.heartRate && (
          <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <Heart size={18} color={colors.destructive} />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Heart Rate</Text>
            </View>

            <View style={styles.hrStats}>
              <View style={styles.hrStatItem}>
                <Text style={[styles.hrStatValue, { color: colors.text }]}>{watchData.heartRate.avg}</Text>
                <Text style={[styles.hrStatLabel, { color: colors.textMuted }]}>Avg BPM</Text>
              </View>
              <View style={[styles.hrStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.hrStatItem}>
                <Text style={[styles.hrStatValue, { color: colors.destructive }]}>{watchData.heartRate.max}</Text>
                <Text style={[styles.hrStatLabel, { color: colors.textMuted }]}>Max BPM</Text>
              </View>
              <View style={[styles.hrStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.hrStatItem}>
                <Text style={[styles.hrStatValue, { color: colors.green }]}>{watchData.heartRate.min}</Text>
                <Text style={[styles.hrStatLabel, { color: colors.textMuted }]}>Min BPM</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weather Conditions */}
        {weather && <WeatherCard weather={weather} />}

        {/* Raw Data (Collapsible) */}
        {watchData && (
          <View style={[styles.rawDataSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.rawDataTitle, { color: colors.textMuted }]}>Raw Shot Timestamps (ms)</Text>
            <Text style={[styles.rawDataContent, { color: colors.text }]}>[{shotTimestamps.join(', ')}]</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.text }]} onPress={handleGoHome}>
          <Ionicons name={session?.training_id ? 'arrow-back' : 'home'} size={18} color={colors.background} />
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            {session?.training_id ? 'Back to Training' : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  colors,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  valueColor?: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {icon}
      <Text style={[styles.statValue, { color: valueColor || colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  verdictContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },

  // Success Banner
  successBanner: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  successSubtitle: {
    fontSize: 14,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },

  // Watch Badge
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 20,
  },
  watchBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Entry Type Badge
  entryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  entryTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Chart Section
  chartSection: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Split Stats
  splitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  splitStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitStatLabel: {
    fontSize: 11,
  },
  splitStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Heart Rate
  hrStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  hrStatItem: {
    alignItems: 'center',
  },
  hrStatValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  hrStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  hrStatDivider: {
    width: 1,
    height: 40,
  },

  // Raw Data
  rawDataSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rawDataTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rawDataContent: {
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
