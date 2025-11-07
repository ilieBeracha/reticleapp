// components/OrganizationSwitcher.tsx
import BaseBottomSheet from "@/components/BaseBottomSheet";
import { InviteMemberModal } from "@/components/InviteMemberModal";
import { OrgListItem } from "@/components/organizations/OrgListItem";
import { OrgTreeItem } from "@/components/organizations/OrgTreeItem";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { CreateChildOrgModal } from "@/modules/manage/CreateChildOrgModal";
import { CreateRootOrgModal } from "@/modules/manage/CreateRootOrgModal";
import { useOrganizationPreferencesStore } from "@/store/organizationPreferencesStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import type { FlatOrganization } from "@/types/organizations";
import { getRootOrgs, groupOrgsByParent } from "@/utils/organizationHelpers";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface OrganizationSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationSwitcher({ visible, onClose }: OrganizationSwitcherProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, switchOrganization, accessibleOrgs, loading, fetchAccessibleOrgs } = useOrganizationsStore();
  const { trackOrgSwitch, favoriteOrgIds, toggleFavorite } =
    useOrganizationPreferencesStore();

  const [filteredOrgs, setFilteredOrgs] = useState<FlatOrganization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [showCreateRoot, setShowCreateRoot] = useState(false);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadOrganizations();
    }
  }, [visible, user]);

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

  const loadOrganizations = async () => {
    if (!user) return;
    
    console.log("🔄 OrganizationSwitcher: Loading organizations for user:", user.id);
    
    // ✅ Use store instead of calling service directly
    await fetchAccessibleOrgs(user.id);

    console.log(`✅ OrganizationSwitcher: Loaded ${accessibleOrgs.length} organizations`);

    // Expand ALL roots by default so child orgs are visible
    const rootOrgIds = accessibleOrgs.filter((o) => o.isRoot).map((o) => o.id);
    setExpandedOrgs(new Set(rootOrgIds));
  };

  const handleSwitch = async (orgId: string | null, orgName?: string) => {
    if (orgId) {
      trackOrgSwitch(orgId, orgName || "");
    }
    await switchOrganization(orgId);
    // Don't close - user can continue browsing
  };

  const toggleExpand = (orgId: string) => {
    setExpandedOrgs((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  // Use extracted helper functions
  const rootOrgs = getRootOrgs(filteredOrgs);
  const childOrgsByParent = groupOrgsByParent(filteredOrgs);

  const isPersonalMode = !selectedOrgId;
  const currentOrg = accessibleOrgs.find((o) => o.id === selectedOrgId);

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        scrollable={true}
        enableDynamicSizing={true}
        enableKeyboardAutoSnap={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Switch Organization</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

        {/* Quick Actions - At top for easy access */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, { borderColor: colors.tint }]}
            onPress={() => {
              onClose();
              setShowCreateRoot(true);
            }}
          >
            <Ionicons name="add-circle" size={18} color={colors.tint} />
            <Text style={[styles.quickActionText, { color: colors.tint }]}>
              New Organization
            </Text>
          </TouchableOpacity>

          {selectedOrgId && currentOrg && currentOrg.hasFullPermission && (
            <>
              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: colors.tint }]}
                onPress={() => {
                  onClose();
                  setShowCreateChild(true);
                }}
              >
                <Ionicons name="git-branch" size={18} color={colors.tint} />
                <Text style={[styles.quickActionText, { color: colors.tint }]}>
                  Add Sub-Org
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { borderColor: colors.green }]}
                onPress={() => {
                  onClose();
                  setShowInviteMember(true);
                }}
              >
                <Ionicons name="person-add" size={18} color={colors.green} />
                <Text style={[styles.quickActionText, { color: colors.green }]}>
                  Invite
                </Text>
              </TouchableOpacity>
            </>
          )}
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
                isPersonalMode && { borderColor: colors.green, borderWidth: 1 },
              ]}
              onPress={() => handleSwitch(null)}
            >
              <View style={styles.orgItemLeft}>
                <Ionicons name="person" size={20} color={colors.blue} />
                <Text style={[styles.orgName, { color: colors.text }]}>
                  Personal Workspace
                </Text>
              </View>
              {isPersonalMode && (
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              )}
            </TouchableOpacity>

            {/* Favorite Orgs */}
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
      </BaseBottomSheet>

      {/* Create Modals - Outside parent modal to prevent conflicts */}
      <CreateRootOrgModal
        visible={showCreateRoot}
        onClose={() => setShowCreateRoot(false)}
        onSuccess={() => {
          setShowCreateRoot(false);
          loadOrganizations();
        }}
      />

      {currentOrg && (
        <CreateChildOrgModal
          visible={showCreateChild}
          onClose={() => setShowCreateChild(false)}
          parentId={selectedOrgId!}
          parentName={currentOrg.name}
          onSuccess={() => {
            setShowCreateChild(false);
            loadOrganizations();
          }}
        />
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        visible={showInviteMember}
        onClose={() => setShowInviteMember(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: 10,
    marginHorizontal: 0,
    marginBottom: 4,
    borderRadius: 10,
    gap: 10,
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
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingBottom: 12,
    marginBottom: 8,
    gap: 8,
    flexWrap: "wrap",
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
