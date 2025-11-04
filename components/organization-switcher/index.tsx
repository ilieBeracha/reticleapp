import BaseBottomSheet from "@/components/BaseBottomSheet";
import { CreateOrgModal } from "@/components/CreateOrg";
import { SwitcherHeader } from "@/components/SwitcherHeader";
import { useColors } from "@/hooks/useColors";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChildOrganizationsList } from "./ChildOrganizationsList";
import { CreateOrgButton } from "./CreateOrgButton";
import { CurrentLocationCard } from "./CurrentLocationCard";
import { OrganizationListItem } from "./OrganizationListItem";
import { OrganizationSearchBar } from "./OrganizationSearchBar";
import { ParentNavigationCard } from "./ParentNavigationCard";

interface OrganizationSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationSwitcherModal({
  visible,
  onClose,
}: OrganizationSwitcherModalProps) {
  const { user } = useUser();
  const { userId } = useAuth();

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
    if (visible && userId) {
      fetchUserOrgs(userId);
      fetchAllOrgs(userId);
      if (selectedOrgId) {
        fetchOrgChildren(selectedOrgId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, userId, selectedOrgId]);

  const handleSwitch = async (
    organizationId: string | null,
    organizationName: string
  ) => {
    onClose();
    await switchOrganization(organizationId, organizationName);
  };

  const userName = user?.fullName || user?.firstName || "Personal";

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

  const filteredChildren = searchQuery
    ? orgChildren.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orgChildren;

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={["75%", "95%"]}
        enableDynamicSizing={false}
        enablePanDownToClose

        backdropOpacity={0.5}
      >
        <View style={styles.container}>
          <SwitcherHeader />

          <OrganizationSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.indigo} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!searchQuery && (
                <>
                  {/* Parent */}
                  {immediateParent && (
                    <ParentNavigationCard
                      parentName={immediateParent.name}
                      isCommander={parentMembership?.role === "commander"}
                      onPress={() =>
                        handleSwitch(immediateParent.id, immediateParent.name)
                      }
                    />
                  )}

                  {/* Current */}
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

                  {/* Children */}
                  <ChildOrganizationsList
                    childOrgs={orgChildren}
                    userMemberships={userOrgs.map((uo) => ({
                      org_id: uo.org_id,
                      role: uo.role,
                    }))}
                    onSelectChild={handleSwitch}
                  />

                  {/* Divider */}
                  {(immediateParent || filteredChildren.length > 0) && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border }]}
                    />
                  )}
                </>
              )}

              {/* All Orgs List */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {searchQuery ? "Search Results" : "All Organizations"}
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

              {/* Create Button */}
              {!searchQuery && (
                <CreateOrgButton
                  onPress={() => setCreateOrgVisible(true)}
                  isChild={canCreateChild && !!selectedOrgId}
                />
              )}
            </ScrollView>
          )}
        </View>
      </BaseBottomSheet>

      <CreateOrgModal
        visible={createOrgVisible}
        onClose={() => setCreateOrgVisible(false)}
        onSuccess={() => {
          if (userId) {
            fetchUserOrgs(userId);
            fetchAllOrgs(userId);
            if (selectedOrgId) fetchOrgChildren(selectedOrgId);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});
