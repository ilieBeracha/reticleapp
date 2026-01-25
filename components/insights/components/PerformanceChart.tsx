/**
 * PerformanceChart - Beautiful dual-metric chart
 *
 * Shows accuracy and grouping trends together with smooth animations.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

// ============================================================================
// TYPES
// ============================================================================

export interface ChartDataPoint {
  date: string;
  accuracy?: number;
  grouping?: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  height?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSmoothPath(
  values: number[],
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number },
  minVal: number,
  maxVal: number,
  inverted = false // For metrics where lower is better (like grouping)
): string {
  if (values.length < 2) return '';

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const range = maxVal - minVal || 1;

  const points = values.map((val, i) => ({
    x: padding.left + (i / (values.length - 1)) * plotWidth,
    // Inverted: lower values at top (better), higher at bottom (worse)
    y: inverted
      ? padding.top + ((val - minVal) / range) * plotHeight
      : padding.top + plotHeight - ((val - minVal) / range) * plotHeight,
  }));

  // Catmull-Rom to Bezier conversion for smooth curves
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function generateAreaPath(
  linePath: string,
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number }
): string {
  if (!linePath) return '';
  const plotWidth = width - padding.left - padding.right;
  const bottom = height - padding.bottom;
  return `${linePath} L ${padding.left + plotWidth} ${bottom} L ${padding.left} ${bottom} Z`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const screenWidth = Dimensions.get('window').width;

export function PerformanceChart({ data, height = 180 }: PerformanceChartProps) {
  const colors = useColors();
  // Parent ScrollView paddingHorizontal: 14, container padding: 14
  // Total: 14 + 14 = 28px each side = 56px total
  const width = screenWidth - 56;
  const padding = { top: 20, bottom: 30, left: 20, right: 8 };

  // Extract values
  const accuracyValues = useMemo(() => data.map((d) => d.accuracy ?? 0).filter((v) => v > 0), [data]);
  const groupingValues = useMemo(() => data.map((d) => d.grouping ?? 0).filter((v) => v > 0), [data]);

  // Calculate ranges
  const accMin = Math.min(...accuracyValues) - 5;
  const accMax = Math.max(...accuracyValues) + 5;
  const grpMin = Math.min(...groupingValues) - 1;
  const grpMax = Math.max(...groupingValues) + 1;

  // Generate paths
  const accuracyPath = useMemo(
    () => generateSmoothPath(accuracyValues, width, height, padding, accMin, accMax),
    [accuracyValues, width, height, accMin, accMax]
  );

  const groupingPath = useMemo(
    () => generateSmoothPath(groupingValues, width, height, padding, grpMin, grpMax, true), // inverted: lower is better
    [groupingValues, width, height, grpMin, grpMax]
  );

  // Current values
  const currentAccuracy = accuracyValues.length > 0 ? accuracyValues[accuracyValues.length - 1] : 0;
  const currentGrouping = groupingValues.length > 0 ? groupingValues[groupingValues.length - 1] : 0;

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75];
  const plotHeight = height - padding.top - padding.bottom;

  if (data.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.noData, { color: colors.textMuted }]}>
          Need more sessions for chart
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Accuracy</Text>
          <Text style={[styles.legendValue, { color: colors.text }]}>{currentAccuracy.toFixed(0)}%</Text>
        </View>
        {groupingValues.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.orange || '#F59E0B' }]} />
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Grouping</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{currentGrouping.toFixed(1)}cm</Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="groupingGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.orange || '#F59E0B'} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={colors.orange || '#F59E0B'} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <G>
          {gridLines.map((pct, i) => (
            <Line
              key={i}
              x1={padding.left}
              y1={padding.top + plotHeight * pct}
              x2={width - padding.right}
              y2={padding.top + plotHeight * pct}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          ))}
        </G>

        {/* Y-axis labels */}
        <G>
          <SvgText
            x={padding.left - 8}
            y={padding.top + 4}
            fontSize={9}
            fill={colors.textMuted}
            textAnchor="end"
          >
            {accMax.toFixed(0)}%
          </SvgText>
          <SvgText
            x={padding.left - 8}
            y={height - padding.bottom}
            fontSize={9}
            fill={colors.textMuted}
            textAnchor="end"
          >
            {accMin.toFixed(0)}%
          </SvgText>
        </G>

        {/* Accuracy area + line */}
        {accuracyPath && (
          <G>
            <Path
              d={generateAreaPath(accuracyPath, width, height, padding)}
              fill="url(#accuracyGradient)"
            />
            <Path
              d={accuracyPath}
              stroke={colors.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* End dot */}
            <Circle
              cx={width - padding.right}
              cy={padding.top + plotHeight - ((currentAccuracy - accMin) / (accMax - accMin || 1)) * plotHeight}
              r={4}
              fill={colors.primary}
            />
          </G>
        )}

        {/* Grouping line (secondary) - inverted: lower values at top */}
        {groupingPath && groupingValues.length > 0 && (
          <G>
            <Path
              d={groupingPath}
              stroke={colors.orange || '#F59E0B'}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6,3"
            />
            {/* End dot - inverted Y position */}
            <Circle
              cx={width - padding.right}
              cy={padding.top + ((currentGrouping - grpMin) / (grpMax - grpMin || 1)) * plotHeight}
              r={3}
              fill={colors.orange || '#F59E0B'}
            />
          </G>
        )}

        {/* X-axis labels */}
        <G>
          <SvgText
            x={padding.left}
            y={height - 8}
            fontSize={9}
            fill={colors.textMuted}
            textAnchor="start"
          >
            {data.length > 0 ? new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </SvgText>
          <SvgText
            x={width - padding.right}
            y={height - 8}
            fontSize={9}
            fill={colors.textMuted}
            textAnchor="end"
          >
            {data.length > 0 ? new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  noData: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default PerformanceChart;
