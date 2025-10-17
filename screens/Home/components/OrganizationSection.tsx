import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface OrganizationSectionProps {
  organizationName: string;
}

export function OrganizationSection({
  organizationName,
}: OrganizationSectionProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
        Current Organization
      </ThemedText>

      <TouchableOpacity
        style={[
          styles.orgCard,
          { backgroundColor: cardBackground, borderColor },
        ]}
        onPress={() => router.push("/(home)/settings")}
      >
        <View style={styles.orgHeader}>
          <View style={styles.orgInfo}>
            <Ionicons name="business" size={20} color={tintColor} />
            <ThemedText style={[styles.orgName, { color: textColor }]}>
              {organizationName}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={mutedColor} />
        </View>
        <ThemedText style={[styles.orgDescription, { color: mutedColor }]}>
          Manage your organization settings and team
        </ThemedText>
      </TouchableOpacity>
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
  orgCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  orgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orgInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
  },
  orgDescription: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 16,
  },
});
