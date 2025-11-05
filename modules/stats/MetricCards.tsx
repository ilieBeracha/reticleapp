import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface MetricCardData {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  unit: string;
  change: number;
  color: string;
}

interface MetricCardsProps {
  metrics: MetricCardData[];
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {metrics.map((metric, index) => {
        const isPositive = metric.change >= 0;
        const changeColor = isPositive ? colors.green : colors.red;

        return (
          <View
            key={index}
            style={[
              styles.card,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: metric.color + "15" }]}>
                <Ionicons name={metric.icon} size={20} color={metric.color} />
              </View>
              <Text style={[styles.label, { color: colors.text }]}>{metric.label}</Text>
            </View>

            {/* Change Indicator */}
            <View style={styles.changeRow}>
              <Ionicons
                name={isPositive ? "trending-up" : "trending-down"}
                size={12}
                color={changeColor}
              />
              <Text style={[styles.changeText, { color: changeColor }]}>
                {Math.abs(metric.change).toFixed(1)}%
              </Text>
            </View>

            {/* Value */}
            <View style={styles.valueRow}>
              <Text style={[styles.value, { color: colors.text }]}>{metric.value}</Text>
              <Text style={[styles.unit, { color: colors.textMuted }]}>{metric.unit}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    fontWeight: "500",
  },
});
