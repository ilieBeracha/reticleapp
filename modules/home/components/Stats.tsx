import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface StatsProps {
  sessionsCount: number;
}

interface StatItemProps {
  icon: string;
  value: string | number;
  label: string;
  tint: string;
}

function StatItem({ icon, value, label, tint }: StatItemProps) {
  const text = useThemeColor({}, "text");
  const description = useThemeColor({}, "description");

  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={22} color={tint} />
      <Text style={[styles.statValue, { color: text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: description }]}>{label}</Text>
    </View>
  );
}

export function Stats({ sessionsCount }: StatsProps) {
  const tint = useThemeColor({}, "tint");

return (
    <View style={styles.statsRow}>
      <StatItem
        icon="people"
        value={sessionsCount}
        label="Sessions"
        tint={tint}
      />
      <StatItem icon="time" value="24m" label="Avg" tint={tint} />
      <StatItem icon="trending-up" value="85%" label="Progress" tint={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 24,
    marginBottom: 32,
  },
  statItem: {
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
