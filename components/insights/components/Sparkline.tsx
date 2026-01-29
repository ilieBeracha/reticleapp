/**
 * Sparkline - Compact inline chart
 *
 * Lightweight SVG-based sparkline for compact trend display.
 */

import { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { TrendDataPoint } from '@/types/insights';

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
// SPARKLINE COMPONENT
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
