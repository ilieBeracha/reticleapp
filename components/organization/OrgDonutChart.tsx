import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export interface KPIItem {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface OrgDonutChartProps {
  data: KPIItem[];
  totalTasks: number;
  colors: {
    text: string;
    textMuted: string;
  };
}

const RADIUS = 70;
const STROKE_WIDTH = 20;
const CENTER = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Donut chart component for displaying training session data.
 * Memoizes arc calculations for performance.
 */
export const OrgDonutChart = React.memo(function OrgDonutChart({
  data,
  totalTasks,
  colors,
}: OrgDonutChartProps) {
  // Pre-calculate all arc data once - avoids recalculation on every render
  const arcs = useMemo(() => {
    let currentAngle = -90; // Start from top
    return data.map((item) => {
      const strokeDashoffset = CIRCUMFERENCE - (item.percentage / 100) * CIRCUMFERENCE;
      const rotation = currentAngle;
      currentAngle += (item.percentage / 100) * 360;
      return { ...item, strokeDashoffset, rotation };
    });
  }, [data]);

  return (
    <View style={styles.container}>
      <Svg width={180} height={180}>
        <G rotation={0} origin={`${CENTER}, ${CENTER}`}>
          {arcs.map((arc, index) => (
            <Circle
              key={index}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={arc.color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={arc.strokeDashoffset}
              rotation={arc.rotation}
              origin={`${CENTER}, ${CENTER}`}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.centerLabel, { color: colors.textMuted }]}>Sessions Done</Text>
        <Text style={[styles.centerValue, { color: colors.text }]}>{totalTasks} Sessions</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 180,
    height: 180,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  centerValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OrgDonutChart;
