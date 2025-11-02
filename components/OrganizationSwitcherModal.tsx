// components/OrganizationSwitcherModal.tsx
import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { CreateOrgModal } from "./CreateOrg";
import { SwitcherHeader } from "./SwitcherHeader";
import { Colors } from "./Themed";

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

  const { userOrgs, selectedOrgId, loading, fetchUserOrgs } =
    useOrganizationsStore();

  const { switchOrganization } = useOrganizationSwitch();

  const colorScheme = useColorScheme();
  const descriptionColor =
    colorScheme === "dark" ? Colors.dark.description : Colors.light.description;
  const [createOrgVisible, setCreateOrgVisible] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      fetchUserOrgs(userId);
    }
  }, [visible, userId]);

  const handleCreateOrg = () => setCreateOrgVisible(true);

  const handleCreateOrgSuccess = () => {
    if (userId) {
      fetchUserOrgs(userId);
    }
  };

  const handleSwitch = async (
    organizationId: string | null,
    organizationName: string
  ) => {
    onClose();
    await switchOrganization(organizationId, organizationName);
  };

  const userName = user?.fullName || user?.firstName || "Personal";
  const isPersonalActive = !selectedOrgId;

  // ✅ Filter to show ONLY root organizations (depth = 0)
  const rootOrgs = userOrgs.filter((org) => org.depth === 0);

  // ✅ Build list with personal + root orgs only
  const orgList = [
    {
      id: "personal",
      name: `${userName} (Personal)`,
      active: isPersonalActive,
      role: null,
    },
    ...rootOrgs.map((org) => ({
      id: org.org_id,
      name: org.org_name,
      active: selectedOrgId === org.org_id,
      role: org.role,
    })),
  ];

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        keyboardBehavior="interactive"
        snapPoints={["60%"]} // ✅ Smaller since showing fewer orgs
        keyboardSnapPoint={0}
        enablePanDownToClose
        backdropOpacity={0.45}
      >
        <BottomSheetView style={styles.sheetBackground}>
          <SwitcherHeader />
          {loading && rootOrgs.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#888" />
            </View>
          ) : (
            <FlatList
              data={orgList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.orgRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    handleSwitch(
                      item.id === "personal" ? null : item.id,
                      item.name
                    )
                  }
                >
                  <View style={styles.orgContent}>
                    <View style={styles.orgInfo}>
                      <View style={styles.orgNameRow}>
                        <Text
                          style={[
                            styles.orgName,
                            { color: descriptionColor },
                            item.active && styles.activeOrgName,
                          ]}
                        >
                          {item.name}
                        </Text>

                        {/* Role badge */}
                        {item.role && (
                          <View
                            style={[
                              styles.roleBadge,
                              item.role === "commander" &&
                                styles.commanderBadge,
                            ]}
                          >
                            <Text style={styles.roleText}>
                              {item.role.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Active indicator */}
                    {item.active && <View style={styles.activeDot} />}
                  </View>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.addOrgButton}
                  onPress={handleCreateOrg}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addOrgText}>
                    + Create root organization
                  </Text>
                </TouchableOpacity>
              }
            />
          )}
        </BottomSheetView>
      </BaseBottomSheet>

      <CreateOrgModal
        visible={createOrgVisible}
        onClose={() => setCreateOrgVisible(false)}
        onSuccess={handleCreateOrgSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  orgRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  orgContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  orgInfo: {
    flex: 1,
  },
  orgNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeOrgName: {
    fontWeight: "600",
  },
  roleBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  commanderBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#60a5fa",
  },
  activeDot: {
    marginLeft: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  addOrgButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  addOrgText: {
    color: "#4da3ff",
    fontSize: 15,
    fontWeight: "500",
  },
});
