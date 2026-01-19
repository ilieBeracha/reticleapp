/**
 * TrendChart - Simple sparkline chart for insights
 *
 * Lightweight SVG-based chart showing trend over time.
 * No external chart library needed.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// ============================================================================
// TYPES
// ============================================================================

export interface TrendDataPoint {
  value: number;
  date: string; // ISO date string
}

interface TrendChartProps {
  /** Data points to display */
  data: TrendDataPoint[];
  /** Chart height */
  height?: number;
  /** Whether higher values are better (true for accuracy, false for grouping) */
  higherIsBetter?: boolean;
  /** Label to show */
  label?: string;
  /** Unit to display */
  unit?: string;
  /** Show the gradient fill under the line */
  showFill?: boolean;
  /** Compact mode (no labels, just chart) */
  compact?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function generatePath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  padding: number
): string {
  if (points.length < 2) return '';

  const plotHeight = height - padding * 2;
  const plotWidth = width - padding * 2;

  // Scale points to fit
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const range = maxY - minY || 1;

  const scaledPoints = points.map((p, i) => ({
    x: padding + (i / (points.length - 1)) * plotWidth,
    y: padding + plotHeight - ((p.y - minY) / range) * plotHeight,
  }));

  // Create smooth curve using quadratic bezier
  let path = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;

  for (let i = 1; i < scaledPoints.length; i++) {
    const prev = scaledPoints[i - 1];
    const curr = scaledPoints[i];
    const midX = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
  }
  
  // Final point
  const last = scaledPoints[scaledPoints.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}

function generateFillPath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  padding: number
): string {
  if (points.length < 2) return '';

  const linePath = generatePath(points, width, height, padding);
  const plotWidth = width - padding * 2;
  
  // Close the path to create a fill area
  return `${linePath} L ${padding + plotWidth} ${height - padding} L ${padding} ${height - padding} Z`;
}

// ============================================================================
// SPARKLINE (compact inline chart)
// ============================================================================

interface SparklineProps {
  data: TrendDataPoint[];
  width?: number;
  height?: number;
  color: string;
  showFill?: boolean;
}

export function Sparkline({ data, width = 80, height = 32, color, showFill = true }: SparklineProps) {
  const padding = 2;
  const points = useMemo(() => data.map((d, i) => ({ x: i, y: d.value })), [data]);
  
  if (data.length < 2) return null;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      
      {showFill && (
        <Path
          d={generateFillPath(points, width, height, padding)}
          fill={`url(#spark-${color})`}
        />
      )}
      
      <Path
        d={generatePath(points, width, height, padding)}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const screenWidth = Dimensions.get('window').width;

export function TrendChart({
  data,
  height = 80,
  higherIsBetter = true,
  label,
  unit = '',
  showFill = true,
  compact = false,
}: TrendChartProps) {
  const colors = useColors();
  const width = screenWidth - 60; // Full width minus padding
  const padding = 6;

  // Determine trend direction
  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const first = data.slice(0, Math.ceil(data.length / 3));
    const last = data.slice(-Math.ceil(data.length / 3));
    const firstAvg = first.reduce((s, p) => s + p.value, 0) / first.length;
    const lastAvg = last.reduce((s, p) => s + p.value, 0) / last.length;
    const diff = lastAvg - firstAvg;
    
    if (Math.abs(diff) < 2) return 'stable';
    if (higherIsBetter) {
      return diff > 0 ? 'improving' : 'declining';
    }
    return diff < 0 ? 'improving' : 'declining';
  }, [data, higherIsBetter]);

  const trendColor = trend === 'improving' 
    ? colors.green 
    : trend === 'declining' 
    ? colors.red 
    : colors.primary;

  // Convert data to points
  const points = useMemo(() => {
    return data.map((d, i) => ({ x: i, y: d.value }));
  }, [data]);

  // Current and change values
  const current = data.length > 0 ? data[data.length - 1].value : 0;
  const previous = data.length > 1 ? data[0].value : current;
  const change = current - previous;
  const changePrefix = change > 0 ? '+' : '';

  if (data.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.noData, { color: colors.textMuted }]}>
          Not enough data for chart
        </Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.card }]}>
        <View style={styles.compactHeader}>
          {label && <Text style={[styles.compactLabel, { color: colors.textMuted }]}>{label}</Text>}
          <View style={styles.compactValues}>
            <Text style={[styles.compactValue, { color: colors.text }]}>
              {current.toFixed(1)}{unit}
            </Text>
            <Text style={[styles.compactChange, { color: trendColor }]}>
              {changePrefix}{change.toFixed(1)}
            </Text>
          </View>
        </View>
        <Sparkline data={data} width={60} height={24} color={trendColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {label && (
            <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          )}
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: colors.text }]}>
              {current.toFixed(1)}{unit}
            </Text>
            <Text style={[styles.change, { color: trendColor }]}>
              {changePrefix}{change.toFixed(1)}{unit}
            </Text>
          </View>
        </View>
        <Text style={[styles.timeRange, { color: colors.textMuted }]}>
          Last {data.length} sessions
        </Text>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={trendColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          
          {/* Fill */}
          {showFill && (
            <Path
              d={generateFillPath(points, width, height, padding)}
              fill="url(#chartGradient)"
            />
          )}
          
          {/* Line */}
          <Path
            d={generatePath(points, width, height, padding)}
            stroke={trendColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeRange: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartContainer: {
    marginTop: 4,
  },
  noData: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // Compact mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 10,
  },
  compactHeader: {
    gap: 2,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  compactValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactChange: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default TrendChart;
