// components/OrgBreadcrumb.tsx
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

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
    .split(" → ")
    .map((s) => s.trim())
    .filter(Boolean);

  // Get role for badge
  const roleColors = {
    commander: colors.orange,
    member: colors.blue,
    viewer: colors.textMuted,
  };

  const getDepthIcon = (depth: number): any => {
    if (depth === 0) return "business";
    if (depth === 1) return "people";
    if (depth === 2) return "shield";
    return "business";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pathParts.map((part, index) => {
          const isLast = index === pathParts.length - 1;
          const depth = index;

          return (
            <View key={`${part}-${index}`} style={styles.crumbContainer}>
              {/* Icon (subtle for parents, prominent for current) */}
              <View style={[
                styles.iconBadge,
                {
                  backgroundColor: isLast 
                    ? colors.tint + '20'
                    : 'transparent',
                }
              ]}>
                <Ionicons
                  name={getDepthIcon(depth)}
                  size={isLast ? 16 : 14}
                  color={isLast ? colors.tint : colors.textMuted}
                />
              </View>

              {/* Text */}
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

              {/* Separator - Subtle slash */}
              {!isLast && (
                <Text style={[styles.separator, { color: colors.border }]}>
                  /
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Role Badge - Minimal */}
      {currentOrg.role === 'commander' && (
        <View style={[styles.roleBadge, { backgroundColor: colors.orange + '15' }]}>
          <Ionicons name="star" size={10} color={colors.orange} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  personalText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  scrollContent: {
    alignItems: "center",
    gap: 10,
  },
  crumbContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  crumbText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.3,
    maxWidth: 140,
  },
  crumbTextActive: {
    fontWeight: "700",
    fontSize: 16,
  },
  separator: {
    fontSize: 16,
    fontWeight: "300",
    opacity: 0.4,
  },
  roleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
