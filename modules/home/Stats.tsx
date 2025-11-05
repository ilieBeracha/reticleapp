import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

/**
 * Configuration for individual stat items
 */
interface StatItemConfig {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
}

/**
 * Props for the Stats component
 */
interface StatsProps {
  /** Total number of sessions */
  sessionsCount: number;
  /** Average session time (optional) */
  avgTime?: string;
  /** Progress percentage (optional) */
  progress?: string;
}

/**
 * Individual stat card component with refined design
 */
function StatItem({ icon, value, label, color }: StatItemConfig) {
  const colors = useColors();

  return (
    <View style={[styles.statItem, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: color + "15" },
        ]}
      >
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Stats component displaying key metrics with modern card design
 */
export function Stats({ sessionsCount, avgTime = "24m", progress = "85%" }: StatsProps) {
  const colors = useColors();

  const stats: StatItemConfig[] = [
    {
      icon: "people",
      value: sessionsCount,
      label: "Sessions",
      color: colors.blue,
    },
    {
      icon: "time",
      value: avgTime,
      label: "Avg Time",
      color: colors.green,
    },
    {
      icon: "trending-up",
      value: progress,
      label: "Progress",
      color: colors.purple,
    },
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((stat, index) => (
        <StatItem key={`stat-${index}-${stat.label}`} {...stat} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
  },
});
