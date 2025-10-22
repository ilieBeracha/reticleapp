import BaseBottomSheet from "@/components/BaseBottomSheet";
import { LoadingOverlay } from "@/components/organizations/OrganizationSwitcher/components/LoadingOverlay";
import { SwitcherHeader } from "@/components/organizations/OrganizationSwitcher/components/SwitcherHeader";
import { useAuth, useOrganizationList, useUser } from "@clerk/clerk-expo";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CreateOrgModal } from "./CreateOrg";

interface OrganizationSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationSwitcherModal({
  visible,
  onClose,
}: OrganizationSwitcherModalProps) {
  const { user } = useUser();
  const { orgId } = useAuth();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { pageSize: 50 },
  });

  const [createOrgVisible, setCreateOrgVisible] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);

  // Refetch organizations when modal opens
  useEffect(() => {
    if (visible && isLoaded && userMemberships?.revalidate) {
      userMemberships.revalidate();
    }
  }, [visible, isLoaded, userMemberships]);

  // Reset switching state when modal closes
  useEffect(() => {
    if (!visible) {
      setSwitchingToId(null);
    }
  }, [visible]);

  const handleSwitch = async (organizationId: string | null) => {
    setSwitchingToId(organizationId ?? "personal");
    try {
      await setActive?.({ organization: organizationId });
      // Reset after a short delay to show the loading state
      setTimeout(() => {
        setSwitchingToId(null);
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      setSwitchingToId(null);
    }
  };

  const handleCreateOrg = () => setCreateOrgVisible(true);

  const handleCreateOrgSuccess = () => {
    // Organization creation was successful, the modal will close automatically
    // The organization list will be refreshed automatically by the useCreateOrg hook
  };

  const userName = user?.fullName || user?.firstName || "Personal";
  const isPersonalActive = !orgId;

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        keyboardBehavior="interactive"
        snapPoints={["50%", "60%"]}
        enablePanDownToClose
        backdropOpacity={0.45}
      >
        <BottomSheetView style={styles.sheetBackground}>
          <SwitcherHeader />
          {!isLoaded ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#888" />
            </View>
          ) : (
            <FlatList
              data={[
                {
                  id: "personal",
                  name: `${userName} (Personal)`,
                  active: isPersonalActive,
                  imageUrl: user?.imageUrl,
                },
                ...(userMemberships?.data ?? []).map((m) => ({
                  id: m.organization.id,
                  name: m.organization.name,
                  active: orgId === m.organization.id,
                  imageUrl: m.organization.imageUrl,
                })),
              ]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.orgRow, item.active && styles.activeOrgRow]}
                  activeOpacity={0.7}
                  onPress={() =>
                    handleSwitch(item.id === "personal" ? null : item.id)
                  }
                >
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.placeholderAvatar} />
                  )}
                  <Text style={styles.orgName}>{item.name}</Text>
                  {item.active && <View style={styles.activeDot} />}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.addOrgButton}
                  onPress={handleCreateOrg}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addOrgText}>+ Create organization</Text>
                </TouchableOpacity>
              }
            />
          )}
        </BottomSheetView>
      </BaseBottomSheet>

      <LoadingOverlay visible={!!switchingToId} />
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
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activeOrgRow: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 14,
  },
  placeholderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  orgName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  activeDot: {
    marginLeft: "auto",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  addOrgButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  addOrgText: {
    color: "#4da3ff",
    fontSize: 15,
    fontWeight: "500",
  },
});
