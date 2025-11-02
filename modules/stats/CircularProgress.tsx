import { useColors } from "@/hooks/useColors";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface SegmentData {
  value: number;
  label: string;
  color: string;
  sublabel?: string;
}

interface CircularProgressProps {
  segments: SegmentData[];
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ segments, size = 200, strokeWidth = 30 }: CircularProgressProps) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate total and percentages
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  let currentOffset = 0;

  return (
    <View style={styles.container}>
      {/* Circular Chart */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {segments.map((segment, index) => {
            const percentage = (segment.value / total) * 100;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const rotation = (currentOffset / 100) * 360 - 90;
            const segmentOffset = currentOffset;
            currentOffset += percentage;

            return (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                rotation={rotation}
                origin={`${center}, ${center}`}
              />
            );
          })}
        </Svg>

        {/* Center label */}
        <View style={styles.centerLabel}>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {total}
          </Text>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
            Total
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((segment, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <View style={styles.legendText}>
              <Text style={[styles.legendValue, { color: colors.text }]}>
                {segment.value} {segment.sublabel || ""}
              </Text>
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>
                {segment.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
  },
  chartContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  legend: {
    gap: 12,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    gap: 2,
  },
  legendValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.6,
  },
});
