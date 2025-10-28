import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface OrganizationSectionProps {
  organizationName: string;
}

export function OrganizationSection({
  organizationName,
}: OrganizationSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
        Current Organization
      </ThemedText>

      <TouchableOpacity
        style={[
          styles.orgCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
        onPress={() => router.push("/(home)/settings")}
      >
        <View style={styles.orgHeader}>
          <View style={styles.orgInfo}>
            <Ionicons name="business" size={20} color={colors.tint} />
            <ThemedText style={[styles.orgName, { color: colors.text }]}>
              {organizationName}
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.description}
          />
        </View>
        <ThemedText
          style={[styles.orgDescription, { color: colors.description }]}
        >
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
