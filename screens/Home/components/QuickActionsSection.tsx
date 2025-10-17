import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export function QuickActionsSection() {
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
        Quick Actions
      </ThemedText>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
          onPress={() => router.push("/(home)/settings")}
        >
          <Ionicons name="settings-outline" size={24} color={tintColor} />
          <ThemedText style={[styles.actionLabel, { color: textColor }]}>
            Settings
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
          onPress={() => {}}
        >
          <Ionicons name="add-circle-outline" size={24} color={tintColor} />
          <ThemedText style={[styles.actionLabel, { color: textColor }]}>
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
