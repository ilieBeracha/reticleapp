// components/organizations/OrgListItem.tsx
import { useColors } from "@/hooks/ui/useColors";
import type { FlatOrganization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Depth-based color keys for visual hierarchy
const DEPTH_COLOR_KEYS = [
  "purple",   // Level 0 (Root)
  "blue",     // Level 1
  "teal",     // Level 2
  "green",    // Level 3
  "yellow",   // Level 4
] as const;

interface OrgListItemProps {
  org: FlatOrganization;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  isRoot?: boolean;
  depth?: number;
  isContextOnly?: boolean;
}

export function OrgListItem({
  org,
  isSelected,
  isFavorite,
  onPress,
  onToggleFavorite,
  isRoot = false,
  depth = 0,
  isContextOnly = false,
}: OrgListItemProps) {
  const colors = useColors();

  const roleColors = {
    commander: colors.orange,
    member: colors.blue,
    viewer: colors.textMuted,
  };

  // Get icon color from depth-based hierarchy (cycles after 5 levels)
  const colorKey = DEPTH_COLOR_KEYS[depth % DEPTH_COLOR_KEYS.length];
  const iconColor = colors[colorKey];

  // Helper: Format breadcrumb for mobile (compressed for long paths)
  const formatBreadcrumb = (breadcrumb: string[]): string => {
    if (breadcrumb.length <= 2) {
      return breadcrumb.join(" → ");
    }
    // Show: "Root → ⋯ → Current"
    return `${breadcrumb[0]} → ⋯ → ${breadcrumb[breadcrumb.length - 1]}`;
  };

  // Helper: Get clear permission label
  const getPermissionLabel = (): string => {
    if (isContextOnly) return "VIEW ONLY";
    
    if (org.role === "commander") {
      return isRoot ? "ROOT ADMIN" : "COMMANDER";
    }
    
    return org.role.toUpperCase();
  };

  // Helper: Get depth label for hierarchy
  const getDepthLabel = (depth: number): string => {
    const labels = ["Root", "Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4"];
    return labels[depth] || `L${depth}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.orgItem,
        { backgroundColor: colors.cardBackground },
        isSelected && styles.selectedItem,
        isContextOnly && styles.contextOnlyItem,
      ]}
      onPress={onPress}
      disabled={isContextOnly}
      activeOpacity={isContextOnly ? 1 : 0.7}
    >
      <View style={styles.orgItemLeft}>
        {/* Depth indicator */}
        <View style={[styles.depthIndicator, { backgroundColor: iconColor + "20" }]}>
          <Text style={[styles.depthText, { color: iconColor }]}>
            {getDepthLabel(depth)}
          </Text>
        </View>

        <Ionicons
          name={isRoot ? "business" : "git-branch"}
          size={20}
          color={iconColor}
          style={isContextOnly && { opacity: 0.4 }}
        />
        
        <View style={styles.orgItemText}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.orgName, { color: colors.text }, isContextOnly && { opacity: 0.5 }]}>
              {org.name}
            </Text>
            {isContextOnly && (
              <View style={[styles.contextBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.contextBadgeText, { color: colors.textMuted }]}>
                  CONTEXT
                </Text>
              </View>
            )}
          </View>
          {org.breadcrumb.length > 1 && (
            <Text style={[styles.orgPath, { color: colors.textMuted }, isContextOnly && { opacity: 0.4 }]} numberOfLines={1}>
              {formatBreadcrumb(org.breadcrumb)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.orgItemRight}>
        {!isContextOnly && (
          <>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: roleColors[org.role] + "20", borderColor: roleColors[org.role] },
              ]}
            >
              <Text
                style={[styles.roleBadgeText, { color: roleColors[org.role] }]}
                numberOfLines={1}
              >
                {getPermissionLabel()}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? "star" : "star-outline"}
                size={16}
                color={isFavorite ? colors.yellow : colors.textMuted}
              />
            </TouchableOpacity>

            {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.green} />}
          </>
        )}
        {isContextOnly && (
          <Ionicons name="eye-outline" size={16} color={colors.textMuted} style={{ opacity: 0.4 }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  orgItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 0,
    marginBottom: 6,
    borderRadius: 10,
    gap: 10,
  },
  selectedItem: {
    opacity: 0.9,
  },
  contextOnlyItem: {
    opacity: 0.6,
  },
  depthIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 42,
    alignItems: "center",
  },
  depthText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  contextBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contextBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  orgItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  orgItemText: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  orgPath: {
    fontSize: 12,
    marginTop: 2,
  },
  orgItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

