import { useColors } from "@/hooks/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrgHierarchyBreadcrumbProps {
  onNavigateToOrg?: (orgId: string) => void;
}

export function OrgHierarchyBreadcrumb({
  onNavigateToOrg,
}: OrgHierarchyBreadcrumbProps) {
  const colors = useColors();
  const { selectedOrgId, allOrgs } = useOrganizationsStore();

  // If no org selected, show "Personal Workspace"
  if (!selectedOrgId) {
    return (
      <View style={styles.container}>
        <Ionicons name="person" size={14} color={colors.textMuted} />
        <Text style={[styles.currentText, { color: colors.text }]}>
          Personal Workspace
        </Text>
      </View>
    );
  }

  // Find the selected org
  const selectedOrg = allOrgs.find((org) => org.id === selectedOrgId);
  if (!selectedOrg) return null;

  // Build the hierarchy path using the org's path array
  const hierarchyPath: Array<{ id: string; name: string }> = [];

  // The path array contains UUIDs from root to current org
  selectedOrg.path.forEach((orgId) => {
    const org = allOrgs.find((o) => o.id === orgId);
    if (org) {
      hierarchyPath.push({ id: org.id, name: org.name });
    }
  });

  return (
    <View style={styles.container}>
      <Ionicons name="business" size={14} color={colors.textMuted} />

      <View style={styles.breadcrumbRow}>
        {hierarchyPath.map((item, index) => {
          const isLast = index === hierarchyPath.length - 1;
          const isClickable = !isLast && onNavigateToOrg;

          return (
            <View key={item.id} style={styles.breadcrumbItem}>
              {isClickable ? (
                <TouchableOpacity
                  onPress={() => onNavigateToOrg(item.id)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[styles.breadcrumbLink, { color: colors.indigo }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text
                  style={[
                    isLast ? styles.currentText : styles.breadcrumbText,
                    { color: isLast ? colors.text : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              )}

              {!isLast && (
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={colors.textMuted}
                  style={styles.separator}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  breadcrumbRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 3,
  },
  breadcrumbItem: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 140,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: "500",
  },
  breadcrumbLink: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  currentText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  separator: {
    marginHorizontal: 3,
  },
});
