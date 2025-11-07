// components/OrgBreadcrumb.tsx
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function OrgBreadcrumb() {
  const colors = useColors();
  const { selectedOrgId, userOrgs, switchOrganization } = useOrganizationsStore();

  if (!selectedOrgId) {
    // Personal mode
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <Ionicons name="person-circle" size={18} color={colors.blue} />
        <Text style={[styles.personalText, { color: colors.text }]}>Personal Workspace</Text>
      </View>
    );
  }

  // Find current org
  const currentOrg = userOrgs.find((o) => o.org_id === selectedOrgId);
  if (!currentOrg) return null;

  // Build breadcrumb from full_path
  const pathParts = currentOrg.full_path
    .split(" / ")
    .map((s) => s.trim())
    .filter(Boolean);

  // Get role for badge
  const roleColors = {
    commander: colors.orange,
    member: colors.blue,
    viewer: colors.textMuted,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <Ionicons name="business" size={18} color={colors.tint} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pathParts.map((part, index) => {
          const isLast = index === pathParts.length - 1;

          return (
            <View key={`${part}-${index}`} style={styles.crumbContainer}>
              <TouchableOpacity disabled={isLast} style={styles.crumb}>
                <Text
                  style={[
                    styles.crumbText,
                    { color: isLast ? colors.text : colors.textMuted },
                    isLast && styles.crumbTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {part}
                </Text>
              </TouchableOpacity>

              {!isLast && (
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.textMuted}
                  style={styles.separator}
                />
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Role Badge */}
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: roleColors[currentOrg.role] + "20",
            borderColor: roleColors[currentOrg.role],
          },
        ]}
      >
        <Text
          style={[styles.roleBadgeText, { color: roleColors[currentOrg.role] }]}
          numberOfLines={1}
        >
          {currentOrg.role.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  personalText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  scrollContent: {
    alignItems: "center",
    gap: 4,
  },
  crumbContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  crumb: {
    paddingHorizontal: 4,
  },
  crumbText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  crumbTextActive: {
    fontWeight: "700",
  },
  separator: {
    marginHorizontal: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
