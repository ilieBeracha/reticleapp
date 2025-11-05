import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
  };
  color: string;
}

function MetricCard({ icon, label, value, change, color }: MetricCardProps) {
  const colors = useColors();

  const getChangeIcon = () => {
    if (!change) return null;
    if (change.type === "neutral") return "remove";
    return change.type === "increase" ? "trending-up" : "trending-down";
  };

  const getChangeColor = () => {
    if (!change || change.type === "neutral") return colors.textMuted;
    return change.type === "increase" ? colors.green : colors.red;
  };

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: color + "15" },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
        {change && (
          <View style={styles.changeRow}>
            <Ionicons name={getChangeIcon()!} size={12} color={getChangeColor()} />
            <Text style={[styles.changeText, { color: getChangeColor() }]}>
              {change.type === "neutral" ? "No change" : `${Math.abs(change.value)}%`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface KeyMetricsProps {
  totalSessions: number;
  avgAccuracy: number;
  hoursSpent: number;
  currentStreak: number;
  isPersonalMode: boolean;
}

export function KeyMetrics({
  totalSessions,
  avgAccuracy,
  hoursSpent,
  currentStreak,
  isPersonalMode,
}: KeyMetricsProps) {
  const colors = useColors();

  const metrics: MetricCardProps[] = [
    {
      icon: "stats-chart",
      label: isPersonalMode ? "Total Sessions" : "Team Sessions",
      value: totalSessions,
      change: { value: 12, type: "increase" },
      color: colors.blue,
    },
    {
      icon: "target",
      label: "Avg Accuracy",
      value: `${avgAccuracy}%`,
      change: { value: 5, type: "increase" },
      color: colors.green,
    },
    {
      icon: "time",
      label: "Training Hours",
      value: `${hoursSpent}h`,
      change: { value: 8, type: "increase" },
      color: colors.orange,
    },
    {
      icon: "flame",
      label: "Current Streak",
      value: `${currentStreak} days`,
      change: currentStreak > 0 ? { value: currentStreak, type: "increase" } : undefined,
      color: colors.purple,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Key Metrics
      </Text>
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  metricContent: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
