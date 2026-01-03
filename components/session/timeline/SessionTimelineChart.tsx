/**
 * SessionTimelineChart
 * 
 * Visualizes time-series biometric data from Garmin watch sessions.
 * Shows heart rate over time with shot markers and stress indicators.
 * 
 * Data flow:
 * 1. Session completes → TIMELINE_CHUNK messages received
 * 2. Data assembled and saved to session_timelines table
 * 3. This component fetches and visualizes the data
 */

import { useColors } from '@/hooks/ui/useColors';
import type { ShotDetail, TimelinePoint, TimelineSummary } from '@/services/session/timelineService';
import { Activity, AlertTriangle, ArrowDown, ArrowUp, Clock, Heart, Target, TrendingDown, TrendingUp, Wind, Zap } from 'lucide-react-native';
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
  customDataPoint?: () => React.ReactNode;
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

function getBreathPhaseColor(phase: 'inhale' | 'exhale' | 'pause'): string {
  switch (phase) {
    case 'pause': return '#10B981'; // Green - optimal
    case 'exhale': return '#F59E0B'; // Amber
    case 'inhale': return '#EF4444'; // Red - not ideal
  }
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

  // Calculate chart width (subtract padding)
  const chartWidth = containerWidth > 0 ? containerWidth - 32 : 300;

  // Sample points for chart (max ~50 for performance)
  const chartData = useMemo(() => {
    const maxPoints = compact ? 30 : 50;
    let sampledPoints = points;
    
    if (points.length > maxPoints) {
      const step = Math.ceil(points.length / maxPoints);
      sampledPoints = points.filter((_, i) => i % step === 0);
    }

    // Find shot timestamps for markers
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

  // Stress line data
  const stressData = useMemo(() => {
    const maxPoints = compact ? 30 : 50;
    let sampledPoints = points;
    
    if (points.length > maxPoints) {
      const step = Math.ceil(points.length / maxPoints);
      sampledPoints = points.filter((_, i) => i % step === 0);
    }

    return sampledPoints.map((point): ChartPoint => ({
      value: point.stress,
    }));
  }, [points, compact]);

  // Calculate optimal shot percentage
  const optimalShotPct = useMemo(() => {
    if (shotDetails.length === 0) return 0;
    const optimal = shotDetails.filter(s => 
      s.breathPhase === 'pause' && 
      s.steadiness >= 70 && 
      !s.flinch
    ).length;
    return Math.round((optimal / shotDetails.length) * 100);
  }, [shotDetails]);

  const flinchCount = useMemo(() => 
    shotDetails.filter(s => s.flinch).length
  , [shotDetails]);

  // ============================================================================
  // COMPUTED INSIGHTS - What actually matters for improvement
  // ============================================================================
  
  const insights = useMemo(() => {
    if (shotDetails.length < 2) return null;
    
    const result: {
      performanceTrend: 'improving' | 'declining' | 'stable';
      avgPerformance: number;
      bestShot: { num: number; score: number } | null;
      worstShot: { num: number; score: number } | null;
      breathQuality: { pausePct: number; exhalePct: number; inhalePct: number };
      splitAnalysis: { avg: number; fastest: number; slowest: number; consistency: number } | null;
      rushPattern: string | null;
      fatigueIndicator: 'none' | 'mild' | 'significant';
      usingStress: boolean; // True if we're using stress (inverted) instead of steadiness
    } = {
      performanceTrend: 'stable',
      avgPerformance: 0,
      bestShot: null,
      worstShot: null,
      breathQuality: { pausePct: 0, exhalePct: 0, inhalePct: 0 },
      splitAnalysis: null,
      rushPattern: null,
      fatigueIndicator: 'none',
      usingStress: false,
    };
    
    // Check if we have real steadiness data or need to use stress
    const steadinessSum = shotDetails.reduce((sum, s) => sum + s.steadiness, 0);
    const hasRealSteadiness = steadinessSum > 0;
    
    // Performance scores: use steadiness if available, otherwise invert stress (low stress = good)
    // Stress: 0-100 where HIGH = stressed = worse
    // Steadiness: 0-100 where HIGH = steady = better
    // When using stress, invert it: calmness = 100 - stress
    const performanceScores = hasRealSteadiness 
      ? shotDetails.map(s => s.steadiness)
      : shotDetails.map(s => Math.max(0, 100 - s.stress)); // Invert stress to "calmness"
    
    result.usingStress = !hasRealSteadiness;
    result.avgPerformance = Math.round(performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length);
    
    // Find best/worst shots (highest/lowest performance score)
    const maxScore = Math.max(...performanceScores);
    const minScore = Math.min(...performanceScores);
    const bestIdx = performanceScores.indexOf(maxScore);
    const worstIdx = performanceScores.indexOf(minScore);
    result.bestShot = { num: shotDetails[bestIdx].shotNumber, score: maxScore };
    result.worstShot = { num: shotDetails[worstIdx].shotNumber, score: minScore };
    
    // Trend: compare first half to second half
    const half = Math.floor(performanceScores.length / 2);
    const firstHalfAvg = performanceScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = performanceScores.slice(half).reduce((a, b) => a + b, 0) / (performanceScores.length - half);
    const trendDiff = secondHalfAvg - firstHalfAvg;
    if (trendDiff > 5) result.performanceTrend = 'improving';
    else if (trendDiff < -5) result.performanceTrend = 'declining';
    
    // Breath quality
    const pauseCount = shotDetails.filter(s => s.breathPhase === 'pause').length;
    const exhaleCount = shotDetails.filter(s => s.breathPhase === 'exhale').length;
    const inhaleCount = shotDetails.filter(s => s.breathPhase === 'inhale').length;
    result.breathQuality = {
      pausePct: Math.round((pauseCount / shotDetails.length) * 100),
      exhalePct: Math.round((exhaleCount / shotDetails.length) * 100),
      inhalePct: Math.round((inhaleCount / shotDetails.length) * 100),
    };
    
    // Split time analysis (from timestamps)
    const timestamps = shotDetails.map(s => s.timestamp);
    if (timestamps.length >= 2) {
      const splits = [];
      for (let i = 1; i < timestamps.length; i++) {
        splits.push(timestamps[i] - timestamps[i - 1]);
      }
      if (splits.length > 0) {
        const avgSplit = splits.reduce((a, b) => a + b, 0) / splits.length;
        const fastest = Math.min(...splits);
        const slowest = Math.max(...splits);
        const variance = splits.reduce((sum, s) => sum + Math.pow(s - avgSplit, 2), 0) / splits.length;
        const stdDev = Math.sqrt(variance);
        const consistency = Math.max(0, 100 - (stdDev / avgSplit) * 100);
        
        result.splitAnalysis = {
          avg: Math.round(avgSplit * 1000), // to ms
          fastest: Math.round(fastest * 1000),
          slowest: Math.round(slowest * 1000),
          consistency: Math.round(consistency),
        };
        
        // Detect rushing pattern (3+ consecutive fast splits)
        let rushCount = 0;
        let rushStart = 0;
        for (let i = 0; i < splits.length; i++) {
          if (splits[i] < avgSplit * 0.7) {
            if (rushCount === 0) rushStart = i + 1;
            rushCount++;
          } else {
            if (rushCount >= 3) {
              result.rushPattern = `Rushed shots ${rushStart + 1}-${rushStart + rushCount + 1}`;
              break;
            }
            rushCount = 0;
          }
        }
      }
    }
    
    // Fatigue indicator: compare last 3 shots to first 3
    if (shotDetails.length >= 6) {
      const first3Avg = performanceScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const last3Avg = performanceScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const fatigueDrop = first3Avg - last3Avg;
      if (fatigueDrop > 15) result.fatigueIndicator = 'significant';
      else if (fatigueDrop > 8) result.fatigueIndicator = 'mild';
    }
    
    return result;
  }, [shotDetails]);

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
            <Text style={[styles.title, { color: colors.text }]}>
              Session Timeline
            </Text>
          </View>
          <Text style={[styles.duration, { color: colors.textMuted }]}>
            {formatTime(summary.durationSeconds)}
          </Text>
        </View>

        {/* Summary Stats Row */}
        <View style={styles.summaryRow}>
          <SummaryPill
            icon={<Heart size={12} color="#EF4444" />}
            value={`${summary.hrMin}-${summary.hrMax}`}
            label="HR Range"
            colors={colors}
          />
          <SummaryPill
            icon={<Zap size={12} color="#F59E0B" />}
            value={`${summary.stressAvg}`}
            label="Avg Stress"
            colors={colors}
          />
          <SummaryPill
            icon={<Target size={12} color="#10B981" />}
            value={`${optimalShotPct}%`}
            label="Optimal"
            colors={colors}
            highlight={optimalShotPct >= 70}
          />
          {flinchCount > 0 && (
            <SummaryPill
              icon={<Wind size={12} color="#EF4444" />}
              value={`${flinchCount}`}
              label="Flinch"
              colors={colors}
              warning
            />
          )}
        </View>

        {/* Chart */}
        <View style={[styles.chartContainer, { maxHeight }]}>
          {containerWidth > 0 && (
          <LineChart
            data={chartData}
            data2={stressData}
            height={compact ? 120 : 180}
            width={chartWidth}
            spacing={Math.max(4, Math.floor(chartWidth / (chartData.length || 1)))}
            initialSpacing={10}
            endSpacing={10}
            // Line styling
            color="#EF4444"
            color2="#F59E0B"
            thickness={2}
            thickness2={1}
            // Area styling
            areaChart
            startFillColor="rgba(239,68,68,0.2)"
            endFillColor="rgba(239,68,68,0.02)"
            startFillColor2="rgba(245,158,11,0.1)"
            endFillColor2="rgba(245,158,11,0.01)"
            // Axis styling
            hideYAxisText={compact}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            // Grid
            hideRules={compact}
            rulesColor={colors.border}
            rulesType="dashed"
            // Curve
            curved
            curvature={0.15}
            // Data points
            dataPointsColor="#EF4444"
            dataPointsRadius={3}
            // Pointer
            pointerConfig={{
              pointerStripColor: colors.border,
              pointerStripWidth: 1,
              pointerColor: colors.text,
              radius: 4,
              pointerLabelWidth: 100,
              pointerLabelHeight: 40,
              pointerLabelComponent: (items: { value: number }[]) => {
                const hr = items[0]?.value ?? 0;
                return (
                  <View style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.tooltipValue, { color: colors.text }]}>
                      {hr} BPM
                    </Text>
                  </View>
                );
              },
            }}
            // No animation for performance
            isAnimated={false}
          />
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Heart Rate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Stress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.shotMarker]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Shot</Text>
          </View>
        </View>

        {/* COMPACT INSIGHTS - Unique per-shot visualization for home page */}
        {compact && insights && shotDetails.length > 0 && (
          <View style={styles.compactInsights}>
            {/* Key metrics row */}
            <View style={styles.compactMetricsRow}>
              <View style={styles.compactMetric}>
                <Text style={[styles.compactMetricValue, { 
                  color: insights.avgPerformance >= 50 ? '#10B981' : 
                         insights.avgPerformance >= 30 ? '#F59E0B' : '#EF4444' 
                }]}>
                  {insights.avgPerformance}%
                </Text>
                <Text style={[styles.compactMetricLabel, { color: colors.textMuted }]}>
                  {insights.usingStress ? 'Calm' : 'Steady'}
                </Text>
              </View>
              
              {insights.performanceTrend !== 'stable' && (
                <View style={[styles.compactTrend, { 
                  backgroundColor: insights.performanceTrend === 'improving' 
                    ? 'rgba(16,185,129,0.15)' 
                    : 'rgba(239,68,68,0.15)' 
                }]}>
                  {insights.performanceTrend === 'improving' ? (
                    <TrendingUp size={12} color="#10B981" />
                  ) : (
                    <TrendingDown size={12} color="#EF4444" />
                  )}
                </View>
              )}
              
              <View style={styles.compactMetric}>
                <Text style={[styles.compactMetricValue, { 
                  color: insights.breathQuality.pausePct >= 50 ? '#10B981' : '#F59E0B'
                }]}>
                  {insights.breathQuality.pausePct}%
                </Text>
                <Text style={[styles.compactMetricLabel, { color: colors.textMuted }]}>Pause</Text>
              </View>
              
              {insights.splitAnalysis && (
                <View style={styles.compactMetric}>
                  <Text style={[styles.compactMetricValue, { color: colors.text }]}>
                    {(insights.splitAnalysis.avg / 1000).toFixed(1)}s
                  </Text>
                  <Text style={[styles.compactMetricLabel, { color: colors.textMuted }]}>Avg Split</Text>
                </View>
              )}
            </View>
            
            {/* Shot-by-shot bars - THE UNIQUE PART */}
            <View style={styles.compactShotBars}>
              {shotDetails.slice(0, 15).map((shot) => {
                const score = insights.usingStress 
                  ? Math.max(0, 100 - shot.stress) 
                  : shot.steadiness;
                const barHeight = Math.max(4, (score / 100) * 32);
                const barColor = score >= 50 ? '#10B981' : score >= 30 ? '#F59E0B' : '#EF4444';
                const breathColor = shot.breathPhase === 'pause' ? '#10B981' : 
                                   shot.breathPhase === 'exhale' ? '#F59E0B' : '#EF4444';
                return (
                  <View key={shot.shotNumber} style={styles.compactShotBar}>
                    <View 
                      style={[
                        styles.compactBar, 
                        { height: barHeight, backgroundColor: barColor }
                      ]} 
                    />
                    <View style={[styles.compactBreathDot, { backgroundColor: breathColor }]} />
                  </View>
                );
              })}
              {shotDetails.length > 15 && (
                <Text style={[styles.compactMoreShots, { color: colors.textMuted }]}>
                  +{shotDetails.length - 15}
                </Text>
              )}
            </View>
            
            {/* Best/worst shot callout */}
            {insights.bestShot && insights.worstShot && insights.bestShot.score !== insights.worstShot.score && (
              <View style={styles.compactCallout}>
                <Text style={[styles.compactCalloutText, { color: colors.textMuted }]}>
                  Best #{insights.bestShot.num} ({insights.bestShot.score}%) · Worst #{insights.worstShot.num} ({insights.worstShot.score}%)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* INSIGHTS SECTION - What actually matters */}
        {!compact && insights && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.insightsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Insights</Text>
            
            {/* Performance Card - Steadiness or Calmness (inverted stress) */}
            <View style={[styles.insightCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.insightHeader}>
                <View style={styles.insightTitleRow}>
                  <Target size={16} color={
                    insights.avgPerformance >= 60 ? '#10B981' : 
                    insights.avgPerformance >= 40 ? '#F59E0B' : '#EF4444'
                  } />
                  <Text style={[styles.insightTitle, { color: colors.text }]}>
                    {insights.usingStress ? 'Calmness' : 'Steadiness'}
                  </Text>
                  {insights.performanceTrend === 'improving' && (
                    <View style={[styles.trendBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                      <TrendingUp size={10} color="#10B981" />
                      <Text style={[styles.trendText, { color: '#10B981' }]}>Improving</Text>
                    </View>
                  )}
                  {insights.performanceTrend === 'declining' && (
                    <View style={[styles.trendBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                      <TrendingDown size={10} color="#EF4444" />
                      <Text style={[styles.trendText, { color: '#EF4444' }]}>Declining</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.insightValue, { 
                  color: insights.avgPerformance >= 60 ? '#10B981' : 
                         insights.avgPerformance >= 40 ? '#F59E0B' : '#EF4444' 
                }]}>
                  {insights.avgPerformance}%
                </Text>
              </View>
              
              {/* Best vs Worst Shot */}
              {insights.bestShot && insights.worstShot && insights.bestShot.score !== insights.worstShot.score && (
                <View style={styles.insightDetail}>
                  <View style={styles.insightDetailItem}>
                    <ArrowUp size={12} color="#10B981" />
                    <Text style={[styles.insightDetailText, { color: colors.textMuted }]}>
                      Best: Shot #{insights.bestShot.num} ({insights.bestShot.score}%)
                    </Text>
                  </View>
                  <View style={styles.insightDetailItem}>
                    <ArrowDown size={12} color="#EF4444" />
                    <Text style={[styles.insightDetailText, { color: colors.textMuted }]}>
                      Worst: Shot #{insights.worstShot.num} ({insights.worstShot.score}%)
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Explanation when using stress-based metric */}
              {insights.usingStress && (
                <Text style={[styles.metricNote, { color: colors.textMuted }]}>
                  Based on heart rate variability (HRV). Higher = calmer.
                </Text>
              )}
              
              {/* Shot-by-shot performance bars */}
              <View style={styles.shotBarsContainer}>
                {shotDetails.slice(0, 12).map((shot, idx) => {
                  // Use same logic as insights for consistency
                  const score = insights.usingStress 
                    ? Math.max(0, 100 - shot.stress) 
                    : shot.steadiness;
                  const barHeight = Math.max(8, (score / 100) * 40);
                  const barColor = score >= 60 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
                  return (
                    <View key={shot.shotNumber} style={styles.shotBarWrapper}>
                      <View 
                        style={[
                          styles.shotBar, 
                          { height: barHeight, backgroundColor: barColor }
                        ]} 
                      />
                      <Text style={[styles.shotBarLabel, { color: colors.textMuted }]}>
                        {shot.shotNumber}
                      </Text>
                    </View>
                  );
                })}
                {shotDetails.length > 12 && (
                  <Text style={[styles.shotBarMore, { color: colors.textMuted }]}>+{shotDetails.length - 12}</Text>
                )}
              </View>
            </View>

            {/* Breath Discipline Card */}
            <View style={[styles.insightCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.insightHeader}>
                <View style={styles.insightTitleRow}>
                  <Wind size={16} color="#3B82F6" />
                  <Text style={[styles.insightTitle, { color: colors.text }]}>Breath Discipline</Text>
                </View>
              </View>
              <View style={styles.breathBar}>
                {insights.breathQuality.pausePct > 0 && (
                  <View style={[styles.breathSegment, { 
                    flex: insights.breathQuality.pausePct, 
                    backgroundColor: '#10B981' 
                  }]}>
                    <Text style={styles.breathLabel}>{insights.breathQuality.pausePct}%</Text>
                  </View>
                )}
                {insights.breathQuality.exhalePct > 0 && (
                  <View style={[styles.breathSegment, { 
                    flex: insights.breathQuality.exhalePct, 
                    backgroundColor: '#F59E0B' 
                  }]}>
                    <Text style={styles.breathLabel}>{insights.breathQuality.exhalePct}%</Text>
                  </View>
                )}
                {insights.breathQuality.inhalePct > 0 && (
                  <View style={[styles.breathSegment, { 
                    flex: insights.breathQuality.inhalePct, 
                    backgroundColor: '#EF4444' 
                  }]}>
                    <Text style={styles.breathLabel}>{insights.breathQuality.inhalePct}%</Text>
                  </View>
                )}
              </View>
              <View style={styles.breathLegend}>
                <View style={styles.breathLegendItem}>
                  <View style={[styles.breathLegendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>Pause (optimal)</Text>
                </View>
                <View style={styles.breathLegendItem}>
                  <View style={[styles.breathLegendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>Exhale</Text>
                </View>
                <View style={styles.breathLegendItem}>
                  <View style={[styles.breathLegendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.breathLegendText, { color: colors.textMuted }]}>Inhale</Text>
                </View>
              </View>
            </View>

            {/* Split Analysis Card */}
            {insights.splitAnalysis && (
              <View style={[styles.insightCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightTitleRow}>
                    <Clock size={16} color="#8B5CF6" />
                    <Text style={[styles.insightTitle, { color: colors.text }]}>Split Timing</Text>
                  </View>
                  <View style={[styles.consistencyBadge, { 
                    backgroundColor: insights.splitAnalysis.consistency >= 70 
                      ? 'rgba(16,185,129,0.15)' 
                      : 'rgba(245,158,11,0.15)' 
                  }]}>
                    <Text style={[styles.consistencyText, { 
                      color: insights.splitAnalysis.consistency >= 70 ? '#10B981' : '#F59E0B' 
                    }]}>
                      {insights.splitAnalysis.consistency}% consistent
                    </Text>
                  </View>
                </View>
                <View style={styles.splitStats}>
                  <View style={styles.splitStat}>
                    <Text style={[styles.splitLabel, { color: colors.textMuted }]}>Avg</Text>
                    <Text style={[styles.splitValue, { color: colors.text }]}>
                      {(insights.splitAnalysis.avg / 1000).toFixed(1)}s
                    </Text>
                  </View>
                  <View style={styles.splitDivider} />
                  <View style={styles.splitStat}>
                    <Text style={[styles.splitLabel, { color: colors.textMuted }]}>Fastest</Text>
                    <Text style={[styles.splitValue, { color: '#10B981' }]}>
                      {(insights.splitAnalysis.fastest / 1000).toFixed(1)}s
                    </Text>
                  </View>
                  <View style={styles.splitDivider} />
                  <View style={styles.splitStat}>
                    <Text style={[styles.splitLabel, { color: colors.textMuted }]}>Slowest</Text>
                    <Text style={[styles.splitValue, { color: '#EF4444' }]}>
                      {(insights.splitAnalysis.slowest / 1000).toFixed(1)}s
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Warnings/Alerts */}
            {(insights.rushPattern || insights.fatigueIndicator !== 'none') && (
              <View style={[styles.alertCard, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                <AlertTriangle size={16} color="#EF4444" />
                <View style={styles.alertContent}>
                  {insights.rushPattern && (
                    <Text style={[styles.alertText, { color: '#EF4444' }]}>
                      ⚡ {insights.rushPattern}
                    </Text>
                  )}
                  {insights.fatigueIndicator === 'significant' && (
                    <Text style={[styles.alertText, { color: '#EF4444' }]}>
                      🔋 Significant fatigue detected - steadiness dropped in final shots
                    </Text>
                  )}
                  {insights.fatigueIndicator === 'mild' && (
                    <Text style={[styles.alertText, { color: '#F59E0B' }]}>
                      🔋 Mild fatigue detected - consider pacing
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* Shot Details (if not compact) */}
        {!compact && shotDetails.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.shotDetailsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Shot Biometrics</Text>
            <View style={styles.shotGrid}>
              {shotDetails.slice(0, 8).map((shot) => (
                <ShotBiometricCard key={shot.shotNumber} shot={shot} colors={colors} />
              ))}
            </View>
            {shotDetails.length > 8 && (
              <Text style={[styles.moreShots, { color: colors.textMuted }]}>
                +{shotDetails.length - 8} more shots
              </Text>
            )}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
});

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryPillProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
  warning?: boolean;
}

function SummaryPill({ icon, value, label, colors, highlight, warning }: SummaryPillProps) {
  const bgColor = warning 
    ? 'rgba(239,68,68,0.1)' 
    : highlight 
      ? 'rgba(16,185,129,0.1)' 
      : colors.background;
      
  return (
    <View style={[styles.summaryPill, { backgroundColor: bgColor, borderColor: colors.border }]}>
      {icon}
      <Text style={[styles.pillValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

interface ShotBiometricCardProps {
  shot: ShotDetail;
  colors: ReturnType<typeof useColors>;
}

function ShotBiometricCard({ shot, colors }: ShotBiometricCardProps) {
  // Use steadiness if available, otherwise use calmness (100 - stress)
  const performanceScore = shot.steadiness > 0 ? shot.steadiness : Math.max(0, 100 - shot.stress);
  const { grade, color: gradeColor } = getSteadinessGrade(performanceScore);
  const breathColor = getBreathPhaseColor(shot.breathPhase);
  
  return (
    <View style={[styles.shotCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.shotHeader}>
        <Text style={[styles.shotNumber, { color: colors.text }]}>#{shot.shotNumber}</Text>
        <View style={[styles.gradeTag, { backgroundColor: gradeColor + '20' }]}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
        </View>
      </View>
      
      <View style={styles.shotStats}>
        <View style={styles.shotStat}>
          <Heart size={10} color="#EF4444" />
          <Text style={[styles.shotStatValue, { color: colors.text }]}>{shot.heartRate}</Text>
        </View>
        <View style={styles.shotStat}>
          <Wind size={10} color={breathColor} />
          <Text style={[styles.shotStatValue, { color: colors.text }]}>
            {shot.breathPhase.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      
      {shot.flinch && (
        <View style={styles.flinchBadge}>
          <Text style={styles.flinchText}>⚡</Text>
        </View>
      )}
    </View>
  );
}

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
  
  // Summary row
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Chart
  chartContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  
  // Tooltip
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
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
  
  // Shot details section
  shotDetailsSection: {
    padding: 14,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  shotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shotCard: {
    width: 72,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    position: 'relative',
  },
  shotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shotNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  gradeTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gradeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  shotStats: {
    flexDirection: 'row',
    gap: 6,
  },
  shotStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  shotStatValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  flinchBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flinchText: {
    fontSize: 10,
  },
  moreShots: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Insights Section
  insightsSection: {
    padding: 14,
    paddingTop: 8,
    gap: 10,
  },
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  insightDetail: {
    marginTop: 10,
    gap: 4,
  },
  insightDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightDetailText: {
    fontSize: 12,
  },
  
  // Breath Bar
  breathBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 10,
  },
  breathSegment: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  breathLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  breathLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  breathLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breathLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breathLegendText: {
    fontSize: 10,
  },
  
  // Split Analysis
  consistencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  consistencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  splitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  splitStat: {
    alignItems: 'center',
    flex: 1,
  },
  splitLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  splitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  
  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  metricNote: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  // Compact insights (for home page)
  compactInsights: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  compactMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  compactMetric: {
    alignItems: 'center',
  },
  compactMetricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  compactMetricLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  compactTrend: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactShotBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: 44,
    paddingBottom: 6,
  },
  compactShotBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 12,
  },
  compactBar: {
    width: 8,
    borderRadius: 2,
    marginBottom: 3,
  },
  compactBreathDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  compactMoreShots: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
  },
  compactCallout: {
    alignItems: 'center',
    marginTop: 4,
  },
  compactCalloutText: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Shot bars visualization
  shotBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    height: 56,
  },
  shotBarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 18,
  },
  shotBar: {
    width: 14,
    borderRadius: 3,
    marginBottom: 2,
  },
  shotBarLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  shotBarMore: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default SessionTimelineChart;

