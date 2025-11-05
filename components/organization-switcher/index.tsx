import BaseBottomSheet from "@/components/BaseBottomSheet";
import { CreateOrgModal } from "@/components/CreateOrg";
import { SwitcherHeader } from "@/components/SwitcherHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChildOrganizationsList } from "./ChildOrganizationsList";
import { CreateOrgButton } from "./CreateOrgButton";
import { CurrentLocationCard } from "./CurrentLocationCard";
import { OrganizationHierarchyBreadcrumb } from "./OrganizationHierarchyBreadcrumb";
import { OrganizationListItem } from "./OrganizationListItem";
import { OrganizationSearchBar } from "./OrganizationSearchBar";
import { ParentNavigationCard } from "./ParentNavigationCard";
import { TabButtons } from "./TabButtons";

interface OrganizationSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationSwitcherModal({
  visible,
  onClose,
}: OrganizationSwitcherModalProps) {
  const { user } = useAuth();

  const {
    userOrgs,
    selectedOrgId,
    allOrgs,
    orgChildren,
    loading,
    fetchUserOrgs,
    fetchAllOrgs,
    fetchOrgChildren,
  } = useOrganizationsStore();

  const { switchOrganization } = useOrganizationSwitch();
  const { canCreateChild } = useOrgPermissions();

  const colors = useColors();
  const [createOrgVisible, setCreateOrgVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"hierarchy" | "all">("hierarchy");

  // Get current org
  const currentOrg = selectedOrgId
    ? allOrgs.find((org) => org.id === selectedOrgId)
    : null;

  const currentMembership = selectedOrgId
    ? userOrgs.find((org) => org.org_id === selectedOrgId)
    : null;

  // Get immediate parent
  const immediateParent =
    currentOrg && currentOrg.parent_id
      ? allOrgs.find((o) => o.id === currentOrg.parent_id)
      : null;

  const parentMembership = immediateParent
    ? userOrgs.find((uo) => uo.org_id === immediateParent.id)
    : null;

  useEffect(() => {
    if (visible && user?.id) {
      fetchUserOrgs(user?.id);
      fetchAllOrgs(user?.id);
      if (selectedOrgId) {
        fetchOrgChildren(selectedOrgId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user?.id, selectedOrgId]);

  const handleSwitch = async (
    organizationId: string | null,
    organizationName: string
  ) => {
    onClose();
    await switchOrganization(organizationId, organizationName);
  };

  const userName = user?.user_metadata?.full_name || "Personal";

  // All orgs for search/list
  const allUserOrgs = [
    {
      id: "personal",
      name: `${userName} (Personal)`,
      active: !selectedOrgId,
      role: null,
      depth: -1,
    },
    ...userOrgs.map((org) => ({
      id: org.org_id,
      name: org.org_name,
      active: selectedOrgId === org.org_id,
      role: org.role,
      depth: org.depth,
    })),
  ];

  const filteredOrgs = searchQuery
    ? allUserOrgs.filter((o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUserOrgs;

  // Build breadcrumb path from root to current
  const buildBreadcrumbPath = () => {
    const path: { id: string; name: string; isActive: boolean }[] = [];
    
    if (!selectedOrgId) {
      // Personal mode
      path.push({
        id: "personal",
        name: `${userName} (Personal)`,
        isActive: true,
      });
      return path;
    }

    // Build path from root to current
    const buildPath = (orgId: string): void => {
      const org = allOrgs.find((o) => o.id === orgId);
      if (!org) return;

      if (org.parent_id) {
        buildPath(org.parent_id);
      }

      path.push({
        id: org.id,
        name: org.name,
        isActive: org.id === selectedOrgId,
      });
    };

    buildPath(selectedOrgId);
    return path;
  };

  const breadcrumbs = buildBreadcrumbPath();

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={["75%", "90%"]}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropOpacity={0.5}
        scrollable
      >
        <View style={styles.header}>
          <SwitcherHeader />
        </View>

        <View style={styles.searchContainer}>
          <OrganizationSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {!searchQuery && (
          <TabButtons activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.indigo} />
          </View>
        ) : (
          <>
            {searchQuery ? (
              // Search Results
              <>
                {filteredOrgs.length > 0 ? (
                  <>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                      {filteredOrgs.length} Result{filteredOrgs.length !== 1 ? "s" : ""}
                    </Text>
                    {filteredOrgs.map((org) => (
                      <OrganizationListItem
                        key={org.id}
                        id={org.id}
                        name={org.name}
                        role={org.role}
                        isActive={org.active}
                        isPersonal={org.id === "personal"}
                        onPress={() =>
                          handleSwitch(
                            org.id === "personal" ? null : org.id,
                            org.name
                          )
                        }
                      />
                    ))}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      No organizations found
                    </Text>
                  </View>
                )}
              </>
            ) : activeTab === "hierarchy" ? (
              // Hierarchy Tab
              <>
                {/* Breadcrumb Path */}
                <OrganizationHierarchyBreadcrumb
                  breadcrumbs={breadcrumbs}
                  onNavigate={handleSwitch}
                />

                {/* Parent Navigation */}
                {immediateParent && (
                  <ParentNavigationCard
                    parentName={immediateParent.name}
                    isCommander={parentMembership?.role === "commander"}
                    onPress={() =>
                      handleSwitch(immediateParent.id, immediateParent.name)
                    }
                  />
                )}

                {/* Current Location */}
                <CurrentLocationCard
                  name={
                    !selectedOrgId
                      ? `${userName} (Personal)`
                      : currentOrg?.name || ""
                  }
                  role={currentMembership?.role}
                  depth={currentOrg?.depth}
                  isPersonal={!selectedOrgId}
                />

                {/* Children Organizations */}
                <ChildOrganizationsList
                  childOrgs={orgChildren}
                  userMemberships={userOrgs.map((uo) => ({
                    org_id: uo.org_id,
                    role: uo.role,
                  }))}
                  onSelectChild={handleSwitch}
                />

                {/* Create Child Button */}
                <CreateOrgButton
                  onPress={() => setCreateOrgVisible(true)}
                  isChild={canCreateChild && !!selectedOrgId}
                />
              </>
            ) : (
              // All Organizations Tab
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    {filteredOrgs.length} Organization{filteredOrgs.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                {filteredOrgs.map((org) => (
                  <OrganizationListItem
                    key={org.id}
                    id={org.id}
                    name={org.name}
                    role={org.role}
                    isActive={org.active}
                    isPersonal={org.id === "personal"}
                    onPress={() =>
                      handleSwitch(
                        org.id === "personal" ? null : org.id,
                        org.name
                      )
                    }
                  />
                ))}

                <View style={styles.createButtonWrapper}>
                  <CreateOrgButton
                    onPress={() => setCreateOrgVisible(true)}
                    isChild={false}
                  />
                </View>
              </>
            )}
          </>
        )}
      </BaseBottomSheet>

      <CreateOrgModal
        visible={createOrgVisible}
        onClose={() => setCreateOrgVisible(false)}
        onSuccess={() => {
          if (user?.id) {
            fetchUserOrgs(user?.id);
            fetchAllOrgs(user?.id);
            if (selectedOrgId) fetchOrgChildren(selectedOrgId);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  searchContainer: {
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.7,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
  },
  createButtonWrapper: {
    marginTop: 16,
  },
});
