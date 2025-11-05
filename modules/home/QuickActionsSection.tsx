import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export function QuickActionsSection() {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
        Quick Actions
      </ThemedText>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
          onPress={() => router.push("/(protected)/(tabs)/settings")}
        >
          <Ionicons name="settings-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
            Settings
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {}}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.tint} />
          <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
            Create New
          </ThemedText>
        </TouchableOpacity>
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
    minHeight: 70,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
