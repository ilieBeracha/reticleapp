// components/organizations/OrgTreeItem.tsx
import { useColors } from "@/hooks/ui/useColors";
import type { FlatOrganization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { OrgListItem } from "./OrgListItem";

interface OrgTreeItemProps {
  org: FlatOrganization;
  childOrgsByParent: Record<string, FlatOrganization[]>;
  selectedOrgId: string | null;
  favoriteOrgIds: string[];
  expandedOrgs: Set<string>;
  handleSwitch: (orgId: string, orgName: string) => void;
  toggleFavorite: (orgId: string) => void;
  toggleExpand: (orgId: string) => void;
  depth: number;
}

export function OrgTreeItem({
  org,
  childOrgsByParent,
  selectedOrgId,
  favoriteOrgIds,
  expandedOrgs,
  handleSwitch,
  toggleFavorite,
  toggleExpand,
  depth,
}: OrgTreeItemProps) {
  const colors = useColors();
  const children = childOrgsByParent[org.id] || [];
  const isExpanded = expandedOrgs.has(org.id);
  const hasChildren = children.length > 0;

  return (
    <View>
      {/* Org Item */}
      <View style={styles.orgTreeItem}>
        {hasChildren && (
          <TouchableOpacity
            onPress={() => toggleExpand(org.id)}
            style={styles.expandButton}
          >
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {!hasChildren && depth > 0 && (
          <View style={styles.expandButton}>
            <Ionicons name="remove" size={16} color={colors.border} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <OrgListItem
            org={org}
            isSelected={selectedOrgId === org.id}
            isFavorite={favoriteOrgIds.includes(org.id)}
            onPress={() => handleSwitch(org.id, org.name)}
            onToggleFavorite={() => toggleFavorite(org.id)}
            isRoot={depth === 0}
            depth={depth}
            isContextOnly={org.isContextOnly}
          />
        </View>
      </View>

      {/* Recursively render children */}
      {isExpanded && hasChildren && (
        <View>
          {children.map((childOrg) => (
            <OrgTreeItem
              key={childOrg.id}
              org={childOrg}
              childOrgsByParent={childOrgsByParent}
              selectedOrgId={selectedOrgId}
              favoriteOrgIds={favoriteOrgIds}
              expandedOrgs={expandedOrgs}
              handleSwitch={handleSwitch}
              toggleFavorite={toggleFavorite}
              toggleExpand={toggleExpand}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  orgTreeItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 2,
  },
  expandButton: {
    padding: 4,
  },
});

