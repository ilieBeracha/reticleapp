// components/organizations/OrgListView.tsx
// List view for switching between organizations

import { OrgListItem } from "@/components/organizations/OrgListItem";
import { OrgTreeItem } from "@/components/organizations/OrgTreeItem";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationPreferencesStore } from "@/store/organizationPreferencesStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { groupOrgsByParent, getRootOrgs } from "@/utils/organizationHelpers";
import type { FlatOrganization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface OrgListViewProps {
  onBack: () => void;
  onClose: () => void;
  onCreateRoot: () => void;
  onCreateChild: () => void;
  onInviteMembers: () => void;
}

export function OrgListView({
  onBack,
  onClose,
  onCreateRoot,
  onCreateChild,
  onInviteMembers,
}: OrgListViewProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, switchOrganization, accessibleOrgs, loading } = useOrganizationsStore();
  const { trackOrgSwitch, favoriteOrgIds, toggleFavorite } = useOrganizationPreferencesStore();

  const [filteredOrgs, setFilteredOrgs] = useState<FlatOrganization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (searchQuery) {
      const filtered = accessibleOrgs.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.breadcrumb.join(" ").toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(accessibleOrgs);
    }
  }, [searchQuery, accessibleOrgs]);

  useEffect(() => {
    // Expand roots by default
    const rootOrgIds = accessibleOrgs.filter((o) => o.isRoot).map((o) => o.id);
    setExpandedOrgs(new Set(rootOrgIds));
  }, [accessibleOrgs]);

  const handleSwitch = async (orgId: string | null, orgName?: string) => {
    if (orgId) {
      trackOrgSwitch(orgId, orgName || "");
    }
    await switchOrganization(orgId);
    onBack(); // Go back to info view after switching
  };

  const toggleExpand = (orgId: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const rootOrgs = getRootOrgs(filteredOrgs);
  const childOrgsByParent = groupOrgsByParent(filteredOrgs);
  const currentOrg = accessibleOrgs.find((o) => o.id === selectedOrgId);

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Switch Organization
        </Text>
        <TouchableOpacity 
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search organizations..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
      ) : (
        <>
          {/* Personal Workspace */}
          <TouchableOpacity
            style={[
              styles.orgItem,
              { backgroundColor: colors.cardBackground },
              !selectedOrgId && styles.selectedItem,
            ]}
            onPress={() => handleSwitch(null)}
          >
            <View style={styles.orgItemLeft}>
              <Ionicons name="person" size={20} color={colors.blue} />
              <Text style={[styles.orgName, { color: colors.text }]}>
                Personal Workspace
              </Text>
            </View>
            {!selectedOrgId && (
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
            )}
          </TouchableOpacity>

          {/* Favorites */}
          {favoriteOrgIds.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                FAVORITES
              </Text>
              {favoriteOrgIds.map((favId) => {
                const org = accessibleOrgs.find((o) => o.id === favId);
                if (!org) return null;
                return (
                  <OrgListItem
                    key={org.id}
                    org={org}
                    isSelected={selectedOrgId === org.id}
                    isFavorite={true}
                    onPress={() => handleSwitch(org.id, org.name)}
                    onToggleFavorite={() => toggleFavorite(org.id)}
                    depth={org.depth}
                    isContextOnly={org.isContextOnly}
                  />
                );
              })}
            </View>
          )}

          {/* All Organizations */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              ALL ORGANIZATIONS
            </Text>

            {rootOrgs.map((rootOrg) => (
              <OrgTreeItem
                key={rootOrg.id}
                org={rootOrg}
                childOrgsByParent={childOrgsByParent}
                selectedOrgId={selectedOrgId}
                favoriteOrgIds={favoriteOrgIds}
                expandedOrgs={expandedOrgs}
                handleSwitch={handleSwitch}
                toggleFavorite={toggleFavorite}
                toggleExpand={toggleExpand}
                depth={0}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loader: {
    marginVertical: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  orgItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 0,
    marginBottom: 4,
    borderRadius: 10,
    gap: 10,
  },
  selectedItem: {
    borderWidth: 1,
    borderColor: "#10b981",
  },
  orgItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});

