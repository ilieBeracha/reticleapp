import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

interface StatsSectionProps {
  organizationCount: number;
}

export function StatsSection({ organizationCount }: StatsSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
        Overview
      </ThemedText>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="business-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.statValue, { color: colors.text }]}>
            {organizationCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.description }]}>
            Organizations
          </ThemedText>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="people-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.statValue, { color: colors.text }]}>
            12
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.description }]}>
            Team Members
          </ThemedText>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="analytics-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.statValue, { color: colors.text }]}>
            24
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: colors.description }]}>
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
