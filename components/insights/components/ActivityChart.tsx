/**
 * ActivityChart - Weekly activity bar chart
 *
 * Beautiful animated bar chart showing training frequency.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityDataPoint {
  label: string;      // Day name or week label
  sessions: number;
  rounds: number;
}

interface ActivityChartProps {
  data: ActivityDataPoint[];
  height?: number;
  title?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const screenWidth = Dimensions.get('window').width;

export function ActivityChart({ data, height = 140, title = 'This Week' }: ActivityChartProps) {
  const colors = useColors();
  // Parent ScrollView paddingHorizontal: 14, container padding: 14
  // Total: 14 + 14 = 28px each side = 56px total
  const width = screenWidth - 56;
  const padding = { top: 16, bottom: 24, left: 0, right: 0 };

  // Calculate max for scaling
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);
  const totalSessions = data.reduce((sum, d) => sum + d.sessions, 0);
  const totalRounds = data.reduce((sum, d) => sum + d.rounds, 0);

  // Bar dimensions
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barGap = 8;
  const barWidth = (plotWidth - barGap * (data.length - 1)) / data.length;

  // Find today (last bar with sessions, or last bar)
  const todayIndex = useMemo(() => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].sessions > 0) return i;
    }
    return data.length - 1;
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.noData, { color: colors.textMuted }]}>
          No activity data
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.totals}>
          <Text style={[styles.totalValue, { color: colors.text }]}>{totalSessions}</Text>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>sessions</Text>
          <View style={[styles.totalDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.totalValue, { color: colors.text }]}>{totalRounds}</Text>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>rounds</Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={1} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.7} />
          </LinearGradient>
          <LinearGradient id="barGradientMuted" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.textMuted} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={colors.textMuted} stopOpacity={0.1} />
          </LinearGradient>
        </Defs>

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.sessions / maxSessions) * (plotHeight - 20);
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + (plotHeight - 20) - barHeight;
          const isToday = i === todayIndex;
          const hasData = d.sessions > 0;

          return (
            <React.Fragment key={i}>
              {/* Bar */}
              <Rect
                x={x}
                y={hasData ? y : padding.top + plotHeight - 24}
                width={barWidth}
                height={hasData ? barHeight : 4}
                rx={barWidth / 2}
                ry={barWidth / 2}
                fill={hasData ? 'url(#barGradient)' : 'url(#barGradientMuted)'}
                opacity={isToday ? 1 : 0.7}
              />

              {/* Value label (only for bars with data) */}
              {hasData && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  fontSize={10}
                  fontWeight="600"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  {d.sessions}
                </SvgText>
              )}

              {/* Day label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 6}
                fontSize={10}
                fontWeight={isToday ? '700' : '500'}
                fill={isToday ? colors.primary : colors.textMuted}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// React import for Fragment
import React from 'react';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  totals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  totalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
  noData: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default ActivityChart;
