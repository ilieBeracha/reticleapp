import BaseBottomSheet from "@/components/BaseBottomSheet";
import { CreateOrgModal } from "@/components/CreateOrg";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Organization, UserOrg } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SwitcherHeader } from "../SwitcherHeader";
import { ChildOrganizationsList } from "./ChildOrganizationsList";
import { CreateOrgButton } from "./CreateOrgButton";
import { CurrentLocationCard } from "./CurrentLocationCard";
import { OrganizationHierarchyBreadcrumb } from "./OrganizationHierarchyBreadcrumb";
import { OrganizationListItem } from "./OrganizationListItem";
import { OrganizationSearchBar } from "./OrganizationSearchBar";
import { ParentNavigationCard } from "./ParentNavigationCard";
import { TabButtons } from "./TabButtons";
import { UserManagementModal } from "./UserManagementModal";

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
  const [userManagementVisible, setUserManagementVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"hierarchy" | "all">("hierarchy");

  // Get current org
  const currentOrg = selectedOrgId
    ? allOrgs.find((org: Organization) => org.id === selectedOrgId)
    : null;

  const currentMembership = selectedOrgId
    ? userOrgs.find((org: UserOrg) => org.org_id === selectedOrgId)
    : null;

  // Get immediate parent
  const immediateParent =
    currentOrg && currentOrg.parent_id
      ? allOrgs.find((o: Organization) => o.id === currentOrg.parent_id)
      : null;
  const parentMembership = immediateParent
    ? userOrgs.find((org: UserOrg) => org.org_id === immediateParent.id)
    : null;
  useEffect(() => {
    console.log("visible", visible);
    if (visible && user?.id) {
      fetchUserOrgs(user?.id);
      fetchAllOrgs(user?.id);
      if (selectedOrgId) {
        fetchOrgChildren(selectedOrgId);
      }
    }
    // Zustand actions are stable, so we don't need them in deps
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
    ...userOrgs.map((org: UserOrg) => ({
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
      const org = allOrgs.find((o: Organization) => o.id === orgId);
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

  const handleManagePress = () => {
    setUserManagementVisible(true);
  };

  const handleSettingsPress = () => {
    onClose();
    router.push("/(protected)/(tabs)/settings");
  };

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={["80%", "92%"]}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropOpacity={0.5}
        scrollable
      >
        <View style={styles.container}>
          {/* Compact Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <SwitcherHeader />
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.tint + '15' }]}
                  onPress={handleManagePress}
                >
                  <Ionicons name="people" size={20} color={colors.tint} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.tint + '15' }]}
                  onPress={handleSettingsPress}
                >
                  <Ionicons name="settings-sharp" size={20} color={colors.tint} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Search & Tabs Combined */}
          <View style={styles.controlsSection}>
            <OrganizationSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!searchQuery && (
              <TabButtons activeTab={activeTab} onTabChange={setActiveTab} />
            )}
          </View>

          {/* Compact Content */}
          <ScrollView 
            style={styles.contentArea}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.indigo} />
              </View>
            ) : (
              <>
                {searchQuery ? (
                  // Compact Search Results
                  <View style={styles.compactSection}>
                    {filteredOrgs.length > 0 ? (
                      <>
                        <Text style={[styles.resultCount, { color: colors.textMuted }]}>
                          {filteredOrgs.length} result{filteredOrgs.length !== 1 ? "s" : ""}
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
                        <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                          No results
                        </Text>
                      </View>
                    )}
                  </View>
                ) : activeTab === "hierarchy" ? (
                  // Compact Hierarchy
                  <View style={styles.compactSection}>
                    <OrganizationHierarchyBreadcrumb
                      breadcrumbs={breadcrumbs}
                      onNavigate={handleSwitch}
                    />

                    {immediateParent && (
                      <ParentNavigationCard
                        parentName={immediateParent.name}
                        isCommander={parentMembership?.role === "commander"}
                        onPress={() =>
                          handleSwitch(immediateParent.id, immediateParent.name)
                        }
                      />
                    )}

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

                    <ChildOrganizationsList
                      childOrgs={orgChildren}
                      userMemberships={userOrgs.map((uo) => ({
                        org_id: uo.org_id,
                        role: uo.role,
                      }))}
                      onSelectChild={handleSwitch}
                    />

                    <CreateOrgButton
                      onPress={() => setCreateOrgVisible(true)}
                      isChild={canCreateChild && !!selectedOrgId}
                    />
                  </View>
                ) : (
                  // Compact All Orgs List
                  <View style={styles.compactSection}>
                    <Text style={[styles.resultCount, { color: colors.textMuted }]}>
                      {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? "s" : ""}
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

                    <CreateOrgButton
                      onPress={() => setCreateOrgVisible(true)}
                      isChild={false}
                    />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
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

      <UserManagementModal
        visible={userManagementVisible}
        onClose={() => setUserManagementVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsSection: {
    gap: 12,
    marginBottom: 16,
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  compactSection: {
    gap: 10,
  },
  resultCount: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    opacity: 0.6,
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },
});
