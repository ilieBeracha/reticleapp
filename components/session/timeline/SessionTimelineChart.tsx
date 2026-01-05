/**
 * SessionTimelineChart
 * 
 * Visualizes time-series biometric data from Garmin watch sessions.
 * 
 * RELIABLE DATA (shown prominently):
 * - Heart Rate (direct from sensor)
 * - Shot timestamps / Splits (real timestamps)
 * - Steadiness (when auto-detect is on - accelerometer based)
 * - Flinch detection (when auto-detect is on - accelerometer based)
 * 
 * UNRELIABLE DATA (hidden/removed):
 * - Breath rate (estimated, always shows ~4)
 * - Breath phase (guessed from HR trend - not real)
 * - Stress (based on fake R-R intervals)
 */

import { useColors } from '@/hooks/ui/useColors';
import type { ShotDetail, TimelinePoint, TimelineSummary } from '@/services/session/timelineService';
import { Activity, AlertTriangle, Clock, Heart, Target, TrendingDown, TrendingUp, Zap } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// ============================================================================
// TYPES
// ============================================================================

interface SessionTimelineChartProps {
  /** Timeline points from database */
  points: TimelinePoint[];
  /** Shot details with markers */
  shotDetails: ShotDetail[];
  /** Pre-computed summary stats */
  summary: TimelineSummary;
  /** Optional: Compact mode for smaller displays */
  compact?: boolean;
  /** Optional: Maximum height */
  maxHeight?: number;
  /** Optional: Transparent mode - no border/background (for embedding in cards) */
  transparent?: boolean;
}

interface ChartPoint {
  value: number;
  label?: string;
  dataPointColor?: string;
  dataPointRadius?: number;
  showDataPoint?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getSteadinessGrade(score: number): { grade: string; color: string } {
  if (score >= 85) return { grade: 'A+', color: '#10B981' };
  if (score >= 75) return { grade: 'A', color: '#22C55E' };
  if (score >= 65) return { grade: 'B', color: '#84CC16' };
  if (score >= 50) return { grade: 'C', color: '#F59E0B' };
  return { grade: 'D', color: '#EF4444' };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SessionTimelineChart = memo(function SessionTimelineChart({
  points,
  shotDetails,
  summary,
  compact = false,
  maxHeight = 300,
  transparent = false,
}: SessionTimelineChartProps) {
  const colors = useColors();
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const chartWidth = containerWidth > 0 ? containerWidth - 32 : 300;

  // ============================================================================
  // CHART DATA (HR only - stress line removed as it's fake)
  // ============================================================================
  
  const chartData = useMemo(() => {
    const maxPoints = compact ? 30 : 50;
    let sampledPoints = points;
    
    if (points.length > maxPoints) {
      const step = Math.ceil(points.length / maxPoints);
      sampledPoints = points.filter((_, i) => i % step === 0);
    }

    const shotTimestamps = new Set(shotDetails.map(s => s.timestamp));

    return sampledPoints.map((point): ChartPoint => {
      const isShot = shotTimestamps.has(point.timestamp) || point.eventType === 'shot';
      
      return {
        value: point.heartRate,
        label: point.timestamp % 30 === 0 ? formatTime(point.timestamp) : '',
        showDataPoint: isShot,
        dataPointColor: isShot ? '#EF4444' : undefined,
        dataPointRadius: isShot ? 6 : 3,
      };
    });
  }, [points, shotDetails, compact]);

  // ============================================================================
  // COMPUTED INSIGHTS (only from reliable data)
  // ============================================================================
  
  const insights = useMemo(() => {
    if (shotDetails.length < 2) return null;
    
    // Check if we have REAL steadiness data (from accelerometer)
    const hasRealSteadiness = shotDetails.some(s => s.steadiness > 0);
    
    // Steadiness scores (only if real data exists)
    const steadinessScores = hasRealSteadiness 
      ? shotDetails.map(s => s.steadiness)
      : null;
    
    const avgSteadiness = steadinessScores 
      ? Math.round(steadinessScores.reduce((a, b) => a + b, 0) / steadinessScores.length)
      : null;
    
    // Trend analysis (only if we have real steadiness)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (steadinessScores && steadinessScores.length >= 4) {
      const half = Math.floor(steadinessScores.length / 2);
      const firstHalf = steadinessScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const secondHalf = steadinessScores.slice(half).reduce((a, b) => a + b, 0) / (steadinessScores.length - half);
      if (secondHalf - firstHalf > 5) trend = 'improving';
      else if (secondHalf - firstHalf < -5) trend = 'declining';
    }
    
    // Flinch count (real - from accelerometer)
    const flinchCount = shotDetails.filter(s => s.flinch).length;
    
    // Best/worst shots (only if real steadiness)
    let bestShot: { num: number; score: number } | null = null;
    let worstShot: { num: number; score: number } | null = null;
    if (steadinessScores) {
      const max = Math.max(...steadinessScores);
      const min = Math.min(...steadinessScores);
      const bestIdx = steadinessScores.indexOf(max);
      const worstIdx = steadinessScores.indexOf(min);
      bestShot = { num: shotDetails[bestIdx].shotNumber, score: max };
      worstShot = { num: shotDetails[worstIdx].shotNumber, score: min };
    }
    
    // Split timing (REAL - from timestamps)
    const timestamps = shotDetails.map(s => s.timestamp);
    let splitAnalysis: {
      avg: number;
      fastest: number;
      slowest: number;
      consistency: number;
      splits: number[];
    } | null = null;
    
    if (timestamps.length >= 2) {
      const splits: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        splits.push((timestamps[i] - timestamps[i - 1]) * 1000); // Convert to ms
      }
      
      if (splits.length > 0) {
        const avg = splits.reduce((a, b) => a + b, 0) / splits.length;
        const fastest = Math.min(...splits);
        const slowest = Math.max(...splits);
        const variance = splits.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / splits.length;
        const stdDev = Math.sqrt(variance);
        const consistency = Math.max(0, Math.round(100 - (stdDev / avg) * 100));
        
        splitAnalysis = { avg, fastest, slowest, consistency, splits };
      }
    }
    
    // Fatigue indicator (based on timing, not fake stress)
    let fatigue: 'none' | 'mild' | 'significant' = 'none';
    if (splitAnalysis && splitAnalysis.splits.length >= 4) {
      const firstThree = splitAnalysis.splits.slice(0, 3);
      const lastThree = splitAnalysis.splits.slice(-3);
      const avgFirst = firstThree.reduce((a, b) => a + b, 0) / 3;
      const avgLast = lastThree.reduce((a, b) => a + b, 0) / 3;
      // If last shots are 20%+ slower, fatigue detected
      if (avgLast > avgFirst * 1.2) fatigue = 'significant';
      else if (avgLast > avgFirst * 1.1) fatigue = 'mild';
    }
    
    return {
      hasRealSteadiness,
      avgSteadiness,
      trend,
      flinchCount,
      bestShot,
      worstShot,
      splitAnalysis,
      fatigue,
      steadinessScores,
    };
  }, [shotDetails]);

  // ============================================================================
  // EMPTY STATE
  // ============================================================================
  
  if (points.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Activity size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No biometric data available
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          Timeline data requires a Garmin watch
        </Text>
      </View>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <View 
        style={[
          styles.container,
          !transparent && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
          transparent && styles.containerTransparent,
          compact && styles.containerCompact,
        ]}
        onLayout={handleLayout}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Activity size={18} color={colors.text} />
            <Text style={[styles.title, { color: colors.text }]}>Session Timeline</Text>
          </View>
          <Text style={[styles.duration, { color: colors.textMuted }]}>
            {formatTime(summary.durationSeconds)}
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SPLIT TIMING - Featured prominently (this is REAL data)
        ══════════════════════════════════════════════════════════════════ */}
        {insights?.splitAnalysis && (
          <View style={[styles.splitCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
            <View style={styles.splitHeader}>
              <Clock size={16} color={colors.primary} />
              <Text style={[styles.splitTitle, { color: colors.text }]}>Split Times</Text>
              <View style={[styles.consistencyBadge, { 
                backgroundColor: insights.splitAnalysis.consistency >= 80 ? '#10B98120' : 
                                 insights.splitAnalysis.consistency >= 60 ? '#F59E0B20' : '#EF444420'
              }]}>
                <Text style={[styles.consistencyText, { 
                  color: insights.splitAnalysis.consistency >= 80 ? '#10B981' : 
                         insights.splitAnalysis.consistency >= 60 ? '#F59E0B' : '#EF4444'
                }]}>
                  {insights.splitAnalysis.consistency}% consistent
                </Text>
              </View>
            </View>
            
            <View style={styles.splitStats}>
              <View style={styles.splitStat}>
                <Text style={[styles.splitValue, { color: colors.text }]}>
                  {formatMs(Math.round(insights.splitAnalysis.avg))}
                </Text>
                <Text style={[styles.splitLabel, { color: colors.textMuted }]}>Average</Text>
              </View>
              <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />
              <View style={styles.splitStat}>
                <Text style={[styles.splitValue, { color: '#10B981' }]}>
                  {formatMs(Math.round(insights.splitAnalysis.fastest))}
                </Text>
                <Text style={[styles.splitLabel, { color: colors.textMuted }]}>Fastest</Text>
              </View>
              <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />
              <View style={styles.splitStat}>
                <Text style={[styles.splitValue, { color: '#EF4444' }]}>
                  {formatMs(Math.round(insights.splitAnalysis.slowest))}
                </Text>
                <Text style={[styles.splitLabel, { color: colors.textMuted }]}>Slowest</Text>
              </View>
            </View>
            
            {/* Visual split bars */}
            {!compact && (
              <View style={styles.splitBarsContainer}>
                {insights.splitAnalysis.splits.slice(0, 15).map((split, idx) => {
                  const maxSplit = insights.splitAnalysis!.slowest;
                  const barWidth = Math.max(20, (split / maxSplit) * 100);
                  const isFastest = split === insights.splitAnalysis!.fastest;
                  const isSlowest = split === insights.splitAnalysis!.slowest;
                  const barColor = isFastest ? '#10B981' : isSlowest ? '#EF4444' : colors.primary;
                  
                  return (
                    <View key={idx} style={styles.splitBarRow}>
                      <Text style={[styles.splitBarLabel, { color: colors.textMuted }]}>
                        {idx + 1}→{idx + 2}
                      </Text>
                      <View style={[styles.splitBarTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.splitBar, { width: `${barWidth}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.splitBarValue, { color: colors.text }]}>
                        {formatMs(Math.round(split))}
                      </Text>
                    </View>
                  );
                })}
                {insights.splitAnalysis.splits.length > 15 && (
                  <Text style={[styles.moreText, { color: colors.textMuted }]}>
                    +{insights.splitAnalysis.splits.length - 15} more
                  </Text>
                )}
              </View>
            )}
            
            {/* Fatigue warning */}
            {insights.fatigue !== 'none' && (
              <View style={[styles.fatigueWarning, { 
                backgroundColor: insights.fatigue === 'significant' ? '#EF444415' : '#F59E0B15' 
              }]}>
                <AlertTriangle size={14} color={insights.fatigue === 'significant' ? '#EF4444' : '#F59E0B'} />
                <Text style={[styles.fatigueText, { 
                  color: insights.fatigue === 'significant' ? '#EF4444' : '#F59E0B' 
                }]}>
                  {insights.fatigue === 'significant' 
                    ? 'Noticeable slowdown in final shots'
                    : 'Slight slowdown in final shots'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            HEART RATE CHART - Real data
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.hrSection}>
          <View style={styles.hrHeader}>
            <Heart size={14} color="#EF4444" />
            <Text style={[styles.hrTitle, { color: colors.text }]}>Heart Rate</Text>
            <Text style={[styles.hrRange, { color: colors.textMuted }]}>
              {summary.hrMin}-{summary.hrMax} BPM
            </Text>
          </View>
          
          <View style={[styles.chartContainer, { maxHeight: compact ? 100 : 150 }]}>
            {containerWidth > 0 && (
              <LineChart
                data={chartData}
                height={compact ? 80 : 120}
                width={chartWidth}
                spacing={Math.max(4, Math.floor(chartWidth / (chartData.length || 1)))}
                initialSpacing={10}
                endSpacing={10}
                color="#EF4444"
                thickness={2}
                areaChart
                startFillColor="rgba(239,68,68,0.2)"
                endFillColor="rgba(239,68,68,0.02)"
                hideYAxisText={compact}
                yAxisColor={colors.border}
                xAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                hideRules={compact}
                rulesColor={colors.border}
                rulesType="dashed"
                curved
                curvature={0.15}
                dataPointsColor="#EF4444"
                dataPointsRadius={3}
                isAnimated={false}
              />
            )}
          </View>
          
          <View style={styles.hrLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Heart Rate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.shotMarker]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Shot</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            STEADINESS SECTION (only if real data exists)
        ══════════════════════════════════════════════════════════════════ */}
        {!compact && insights?.hasRealSteadiness && insights.steadinessScores && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.steadinessSection}>
            <View style={styles.steadinessHeader}>
              <Target size={16} color={colors.primary} />
              <Text style={[styles.steadinessTitle, { color: colors.text }]}>Steadiness</Text>
              {insights.avgSteadiness && (
                <View style={[styles.avgBadge, { 
                  backgroundColor: insights.avgSteadiness >= 70 ? '#10B98120' : 
                                   insights.avgSteadiness >= 50 ? '#F59E0B20' : '#EF444420'
                }]}>
                  <Text style={[styles.avgText, { 
                    color: insights.avgSteadiness >= 70 ? '#10B981' : 
                           insights.avgSteadiness >= 50 ? '#F59E0B' : '#EF4444'
                  }]}>
                    {insights.avgSteadiness}% avg
                  </Text>
                </View>
              )}
              {insights.trend !== 'stable' && (
                <View style={[styles.trendBadge, { 
                  backgroundColor: insights.trend === 'improving' ? '#10B98115' : '#EF444415'
                }]}>
                  {insights.trend === 'improving' ? (
                    <TrendingUp size={12} color="#10B981" />
                  ) : (
                    <TrendingDown size={12} color="#EF4444" />
                  )}
                </View>
              )}
            </View>
            
            {/* Shot-by-shot steadiness bars */}
            <View style={styles.steadinessBars}>
              {shotDetails.slice(0, 15).map((shot, idx) => {
                const score = insights.steadinessScores![idx];
                const barHeight = Math.max(8, (score / 100) * 48);
                const { grade, color: gradeColor } = getSteadinessGrade(score);
                const isBest = shot.shotNumber === insights.bestShot?.num;
                const isWorst = shot.shotNumber === insights.worstShot?.num;
                
                return (
                  <View key={shot.shotNumber} style={styles.steadinessBarCol}>
                    <View style={[
                      styles.steadinessBar,
                      { height: barHeight, backgroundColor: gradeColor },
                      (isBest || isWorst) && { borderWidth: 2, borderColor: isBest ? '#10B981' : '#EF4444' }
                    ]} />
                    <Text style={[styles.steadinessBarLabel, { color: colors.textMuted }]}>
                      {shot.shotNumber}
                    </Text>
                    {shot.flinch && (
                      <View style={styles.flinchDot}>
                        <Zap size={8} color="#EF4444" />
                      </View>
                    )}
                  </View>
                );
              })}
              {shotDetails.length > 15 && (
                <Text style={[styles.moreText, { color: colors.textMuted }]}>
                  +{shotDetails.length - 15}
                </Text>
              )}
            </View>
            
            {/* Best/worst callout */}
            {insights.bestShot && insights.worstShot && insights.bestShot.score !== insights.worstShot.score && (
              <View style={styles.bestWorstRow}>
                <View style={[styles.bestWorstItem, { backgroundColor: '#10B98110' }]}>
                  <Text style={[styles.bestWorstLabel, { color: '#10B981' }]}>Best</Text>
                  <Text style={[styles.bestWorstValue, { color: '#10B981' }]}>
                    #{insights.bestShot.num} • {insights.bestShot.score}%
                  </Text>
                </View>
                <View style={[styles.bestWorstItem, { backgroundColor: '#EF444410' }]}>
                  <Text style={[styles.bestWorstLabel, { color: '#EF4444' }]}>Worst</Text>
                  <Text style={[styles.bestWorstValue, { color: '#EF4444' }]}>
                    #{insights.worstShot.num} • {insights.worstShot.score}%
                  </Text>
                </View>
              </View>
            )}
            
            {/* Flinch count */}
            {insights.flinchCount > 0 && (
              <View style={[styles.flinchAlert, { backgroundColor: '#EF444410' }]}>
                <Zap size={14} color="#EF4444" />
                <Text style={[styles.flinchAlertText, { color: '#EF4444' }]}>
                  {insights.flinchCount} flinch{insights.flinchCount > 1 ? 'es' : ''} detected
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Note when no steadiness data */}
        {!compact && !insights?.hasRealSteadiness && shotDetails.length > 0 && (
          <View style={[styles.noSteadinessNote, { backgroundColor: colors.background }]}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.noSteadinessText, { color: colors.textMuted }]}>
              No steadiness data for this session
            </Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            COMPACT MODE SUMMARY
        ══════════════════════════════════════════════════════════════════ */}
        {compact && insights && (
          <View style={styles.compactSummary}>
            {insights.splitAnalysis && (
              <View style={styles.compactMetric}>
                <Text style={[styles.compactValue, { color: colors.text }]}>
                  {formatMs(Math.round(insights.splitAnalysis.avg))}
                </Text>
                <Text style={[styles.compactLabel, { color: colors.textMuted }]}>Avg Split</Text>
              </View>
            )}
            {insights.hasRealSteadiness && insights.avgSteadiness && (
              <View style={styles.compactMetric}>
                <Text style={[styles.compactValue, { 
                  color: insights.avgSteadiness >= 70 ? '#10B981' : '#F59E0B'
                }]}>
                  {insights.avgSteadiness}%
                </Text>
                <Text style={[styles.compactLabel, { color: colors.textMuted }]}>Steadiness</Text>
              </View>
            )}
            {insights.flinchCount > 0 && (
              <View style={styles.compactMetric}>
                <Text style={[styles.compactValue, { color: '#EF4444' }]}>
                  {insights.flinchCount}
                </Text>
                <Text style={[styles.compactLabel, { color: colors.textMuted }]}>Flinches</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  containerCompact: {
    borderRadius: 12,
  },
  containerTransparent: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  
  // Empty state
  emptyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  duration: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Split Timing Card
  splitCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  splitTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  consistencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  consistencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  splitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  splitStat: {
    alignItems: 'center',
    flex: 1,
  },
  splitValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  splitLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  splitDivider: {
    width: 1,
    height: 30,
  },
  splitBarsContainer: {
    marginTop: 8,
    gap: 6,
  },
  splitBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitBarLabel: {
    fontSize: 10,
    width: 32,
    textAlign: 'right',
  },
  splitBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  splitBar: {
    height: 8,
    borderRadius: 4,
  },
  splitBarValue: {
    fontSize: 10,
    width: 50,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  fatigueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  fatigueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // HR Section
  hrSection: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  hrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hrTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  hrRange: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  chartContainer: {
    paddingVertical: 4,
  },
  hrLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 6,
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
  shotMarker: {
    backgroundColor: '#EF4444',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Steadiness Section
  steadinessSection: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  steadinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  steadinessTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  avgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  avgText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steadinessBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 64,
    marginBottom: 12,
  },
  steadinessBarCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  steadinessBar: {
    width: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  steadinessBarLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  flinchDot: {
    position: 'absolute',
    top: -4,
  },
  bestWorstRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  bestWorstItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bestWorstLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  bestWorstValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  flinchAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  flinchAlertText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // No steadiness note
  noSteadinessNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  noSteadinessText: {
    fontSize: 12,
  },
  
  // Compact summary
  compactSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  compactMetric: {
    alignItems: 'center',
  },
  compactValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default SessionTimelineChart;
