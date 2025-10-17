import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

interface StatsSectionProps {
  organizationCount: number;
}

export function StatsSection({ organizationCount }: StatsSectionProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
        Overview
      </ThemedText>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <Ionicons name="business-outline" size={24} color={tintColor} />
          <ThemedText style={[styles.statValue, { color: textColor }]}>
            {organizationCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: mutedColor }]}>
            Organizations
          </ThemedText>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <Ionicons name="people-outline" size={24} color={tintColor} />
          <ThemedText style={[styles.statValue, { color: textColor }]}>
            12
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: mutedColor }]}>
            Team Members
          </ThemedText>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <Ionicons name="analytics-outline" size={24} color={tintColor} />
          <ThemedText style={[styles.statValue, { color: textColor }]}>
            24
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: mutedColor }]}>
            Projects
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
    minHeight: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },
});
