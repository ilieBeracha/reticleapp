// components/OrganizationSwitcherModal.tsx
import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/useColors";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CreateOrgModal } from "./CreateOrg";
import { SwitcherHeader } from "./SwitcherHeader";

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

  const colors = useColors();
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
        enableDynamicSizing={true}
        enablePanDownToClose
        backdropOpacity={0.5}
      >
        <BottomSheetView style={styles.sheetBackground}>
          <SwitcherHeader />
          {loading && rootOrgs.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.indigo} />
            </View>
          ) : (
            <>
              <View style={styles.listContainer}>
                {orgList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.orgCard,
                      {
                        backgroundColor: item.active
                          ? colors.indigo + "15"
                          : colors.card,
                        borderColor: item.active
                          ? colors.indigo
                          : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      handleSwitch(
                        item.id === "personal" ? null : item.id,
                        item.name
                      )
                    }
                  >
                    {/* Icon */}
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: item.active
                            ? colors.indigo + "20"
                            : colors.background,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.id === "personal" ? "person" : "business"}
                        size={20}
                        color={item.active ? colors.indigo : colors.textMuted}
                      />
                    </View>

                    {/* Content */}
                    <View style={styles.orgInfo}>
                      <Text
                        style={[
                          styles.orgName,
                          {
                            color: item.active ? colors.text : colors.text,
                            fontWeight: item.active ? "600" : "500",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      {/* Role badge */}
                      {item.role && (
                        <View
                          style={[
                            styles.roleBadge,
                            {
                              backgroundColor:
                                item.role === "commander"
                                  ? "#f59e0b20"
                                  : colors.indigo + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleText,
                              {
                                color:
                                  item.role === "commander"
                                    ? "#f59e0b"
                                    : colors.indigo,
                              },
                            ]}
                          >
                            {item.role.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Active checkmark */}
                    {item.active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.indigo}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Create Organization Button */}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor: colors.indigo,
                  },
                ]}
                onPress={handleCreateOrg}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Organization</Text>
              </TouchableOpacity>
            </>
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
    paddingHorizontal: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    // padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    gap: 10,
    paddingBottom: 16,
  },
  orgCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  orgInfo: {
    flex: 1,
    gap: 6,
  },
  orgName: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
