import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { CreateChildOrgModal } from "@/modules/manage/CreateChildOrgModal";
import { CreateRootOrgModal } from "@/modules/manage/CreateRootOrgModal";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { OrgChild, Organization, UserOrg } from "@/types/organizations";
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
  const [exploringOrgId, setExploringOrgId] = useState<string | null>(null);
  const [navigationStack, setNavigationStack] = useState<Array<{ id: string; name: string }>>([]);
  const [exploringChildren, setExploringChildren] = useState<OrgChild[]>([]);

  // Get current org
  const currentOrg = selectedOrgId
    ? allOrgs.find((org: Organization) => org.id === selectedOrgId)
    : null;

  const currentMembership = selectedOrgId
    ? userOrgs.find((org: UserOrg) => org.org_id === selectedOrgId)
    : null;

  // Find root organization for current org (to calculate relative depth)
  const findRootOrg = (org: Organization | null | undefined): Organization | null => {
    if (!org) return null;
    if (!org.parent_id) return org; // This is the root
    const parent = allOrgs.find((o: Organization) => o.id === org.parent_id);
    return findRootOrg(parent);
  };
  
  // Calculate relative depth from root (0 = root, 1 = first child, etc.)
  const getRelativeDepth = (org: Organization | null | undefined): number => {
    if (!org || !org.parent_id) return 0;
    const parent = allOrgs.find((o: Organization) => o.id === org.parent_id);
    return 1 + getRelativeDepth(parent);
  };

  const relativeDepth = currentOrg ? getRelativeDepth(currentOrg) : 0;

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
    // Switch without closing modal
    await switchOrganization(organizationId, organizationName);
    
    // Refresh data for new context
    if (user?.id) {
      fetchUserOrgs(user.id);
      fetchAllOrgs(user.id);
      if (organizationId) {
        fetchOrgChildren(organizationId);
      }
    }
  };

  const handleExploreOrg = async (orgId: string, orgName: string) => {
    // Navigate deeper into hierarchy without switching context
    setNavigationStack([...navigationStack, { id: orgId, name: orgName }]);
    setExploringOrgId(orgId);
    
    // Fetch children for this org
    try {
      const client = await import("@/lib/authenticatedClient").then(m => m.AuthenticatedClient.getClient());
      const { data } = await client
        .from("organizations")
        .select("*")
        .eq("parent_id", orgId)
        .order("name");
      
      setExploringChildren((data as OrgChild[]) || []);
    } catch (error) {
      console.error("Error fetching children:", error);
    }
  };

  const handleNavigateBack = () => {
    if (navigationStack.length > 0) {
      const newStack = [...navigationStack];
      const poppedOrg = newStack.pop();
      setNavigationStack(newStack);
      
      const previousOrg = newStack[newStack.length - 1];
      if (previousOrg) {
        setExploringOrgId(previousOrg.id);
        handleExploreOrg(previousOrg.id, previousOrg.name);
      } else {
        setExploringOrgId(null);
        setExploringChildren([]);
      }
    }
  };

  const handleCloseModal = () => {
    // Clear all nested modals and exploration state
    setCreateOrgVisible(false);
    setUserManagementVisible(false);
    setExploringOrgId(null);
    setNavigationStack([]);
    setExploringChildren([]);
    onClose();
  };

  const userName = user?.user_metadata?.full_name || "Personal";
  // All orgs for search/list
  const allUserOrgs = [
    {
      id: "personal",
      name: `${userName} (Personal)`,
      active: true,
      role: null,
      depth: 0,
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
    // Open Manage page (organization flow builder)
    onClose();
    router.push("/(protected)/(tabs)/manage");
  };

  const handleInvitePress = () => {
    if (!userManagementVisible) {
      setUserManagementVisible(true);
    }
  };

  const handleSettingsPress = () => {
    onClose();
    router.push("/(protected)/(tabs)/settings");
  };

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={handleCloseModal}
        snapPoints={["80%", "92%"]}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropOpacity={0.5}
        scrollable
      >
        <View style={styles.container}>
          {/* Header with Close Button */}
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <SwitcherHeader />
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.indigo + '15' }]}
                  onPress={handleManagePress}
                >
                  <Ionicons name="git-network" size={20} color={colors.indigo} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.teal + '15' }]}
                  onPress={handleInvitePress}
                >
                  <Ionicons name="person-add" size={20} color={colors.teal} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.red + '15' }]}
                  onPress={handleCloseModal}
                >
                  <Ionicons name="close" size={22} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Navigation Breadcrumb - Show when exploring */}
          {exploringOrgId && navigationStack.length > 0 && (
            <View style={styles.exploringHeader}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleNavigateBack}
              >
                <Ionicons name="arrow-back" size={20} color={colors.tint} />
                <Text style={[styles.backText, { color: colors.tint }]}>Back</Text>
              </TouchableOpacity>
              <View style={styles.breadcrumb}>
                <Ionicons name="navigate" size={14} color={colors.textMuted} />
                <Text style={[styles.breadcrumbText, { color: colors.text }]} numberOfLines={1}>
                  {navigationStack.map(n => n.name).join(" > ")}
                </Text>
              </View>
            </View>
          )}

          {/* Search & Tabs Combined */}
          {!exploringOrgId && (
            <View style={styles.controlsSection}>
              <OrganizationSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {!searchQuery && (
                <TabButtons activeTab={activeTab} onTabChange={setActiveTab} />
              )}
            </View>
          )}

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
            ) : exploringOrgId ? (
              // Exploring Mode - Show children of explored org
              <View style={styles.compactSection}>
                <View style={styles.exploringCard}>
                  <View style={[styles.exploringIcon, { backgroundColor: colors.indigo + "20" }]}>
                    <Ionicons name="business" size={24} color={colors.indigo} />
                  </View>
                  <View style={styles.exploringInfo}>
                    <Text style={[styles.exploringName, { color: colors.text }]}>
                      {navigationStack[navigationStack.length - 1]?.name}
                    </Text>
                    <Text style={[styles.exploringMeta, { color: colors.description }]}>
                      {exploringChildren.length} child organizations
                    </Text>
                  </View>
                </View>

                {exploringChildren.length > 0 ? (
                  exploringChildren.slice(0, 3).map((child: OrgChild) => (
                    <View key={child.id} style={styles.exploredChildWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.exploredChildCard,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        ]}
                        onPress={() => handleSwitch(child.id, child.name)}
                      >
                        <Ionicons name="business" size={18} color={colors.indigo} />
                        <View style={styles.exploredChildInfo}>
                          <Text style={[styles.exploredChildName, { color: colors.text }]}>
                            {child.name}
                          </Text>
                          <Text style={[styles.exploredChildMeta, { color: colors.description }]}>
                            {child.org_type} • {child.member_count || 0} members
                          </Text>
                        </View>
                        <Ionicons name="log-in" size={18} color={colors.tint} />
                      </TouchableOpacity>

                      {(child.child_count || 0) > 0 && child.depth < 5 && (
                        <TouchableOpacity
                          style={[styles.exploreDeeper, { borderColor: colors.border }]}
                          onPress={() => handleExploreOrg(child.id, child.name)}
                        >
                          <Ionicons name="chevron-down" size={14} color={colors.tint} />
                          <Text style={[styles.exploreDeeperText, { color: colors.tint }]}>
                            Explore ({child.child_count} children)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.noChildren}>
                    <Ionicons name="git-branch-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.noChildrenText, { color: colors.textMuted }]}>
                      No child organizations
                    </Text>
                  </View>
                )}
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
                      onExplore={handleExploreOrg}
                      currentDepth={relativeDepth}
                      maxDepth={5}
                      maxChildren={3}
                    />

                    <CreateOrgButton
                      onPress={() => setCreateOrgVisible(true)}
                      isChild={canCreateChild && !!selectedOrgId}
                    />
                  </View>
                ) : (
                  // All Organizations View
                  <View style={styles.compactSection}>
                    <View style={styles.allOrgHeader}>
                      <View style={[styles.allOrgIcon, { backgroundColor: colors.indigo + "15" }]}>
                        <Ionicons name="apps" size={24} color={colors.indigo} />
                      </View>
                      <View style={styles.allOrgInfo}>
                        <Text style={[styles.allOrgTitle, { color: colors.text }]}>
                          All Organizations
                        </Text>
                        <Text style={[styles.allOrgSubtitle, { color: colors.description }]}>
                          {filteredOrgs.length} total • Switch to any
                        </Text>
                      </View>
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

      {/* Nested Modals - Only render when parent is visible */}
      {visible && (
        <>
          {canCreateChild && selectedOrgId && currentOrg ? (
            <CreateChildOrgModal
              visible={createOrgVisible}
              onClose={() => setCreateOrgVisible(false)}
              parentId={selectedOrgId}
              parentName={currentOrg.name}
              onSuccess={() => {
                setCreateOrgVisible(false);
                if (user?.id) {
                  fetchUserOrgs(user?.id);
                  fetchAllOrgs(user?.id);
                  if (selectedOrgId) fetchOrgChildren(selectedOrgId);
                }
              }}
            />
          ) : (
            <CreateRootOrgModal
              visible={createOrgVisible}
              onClose={() => setCreateOrgVisible(false)}
              onSuccess={() => {
                setCreateOrgVisible(false);
                if (user?.id) {
                  fetchUserOrgs(user?.id);
                  fetchAllOrgs(user?.id);
                }
              }}
            />
          )}

          <UserManagementModal
            visible={userManagementVisible}
            onClose={() => setUserManagementVisible(false)}
          />
        </>
      )}
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
  closeButton: {
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
  exploringHeader: {
    gap: 10,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  exploringCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  exploringIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exploringInfo: {
    flex: 1,
    gap: 4,
  },
  exploringName: {
    fontSize: 17,
    fontWeight: "700",
  },
  exploringMeta: {
    fontSize: 13,
  },
  exploredChildWrapper: {
    gap: 8,
    marginBottom: 10,
  },
  exploredChildCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  exploredChildInfo: {
    flex: 1,
    gap: 4,
  },
  exploredChildName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exploredChildMeta: {
    fontSize: 12,
  },
  exploreDeeper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    marginLeft: 30,
  },
  exploreDeeperText: {
    fontSize: 13,
    fontWeight: "600",
  },
  noChildren: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  noChildrenText: {
    fontSize: 14,
    fontWeight: "500",
  },
  allOrgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
  },
  allOrgIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  allOrgInfo: {
    flex: 1,
    gap: 4,
  },
  allOrgTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  allOrgSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
});
