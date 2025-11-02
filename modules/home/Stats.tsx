import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface StatsProps {
  sessionsCount: number;
}

interface StatItemProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}

function StatItem({ icon, value, label, color }: StatItemProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.statItem,
        {
          backgroundColor: colors.card,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: color + "15",
          },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export function Stats({ sessionsCount }: StatsProps) {
  const colors = useColors();

  return (
    <View style={styles.statsRow}>
      <StatItem
        icon="people"
        value={sessionsCount}
        label="Sessions"
        color={colors.blue}
      />
      <StatItem icon="time" value="24m" label="Avg Time" color={colors.green} />
      <StatItem
        icon="trending-up"
        value="85%"
        label="Progress"
        color={colors.purple}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 28,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
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
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
