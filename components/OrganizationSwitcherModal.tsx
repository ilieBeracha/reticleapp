import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
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
  const { orgId } = useAuth();
  const { isLoaded, userMemberships } = useOrganizationList({
    userMemberships: { pageSize: 50 },
  });
  const { switchOrganization } = useOrganizationSwitch();

  const colorScheme = useColorScheme();
  const descriptionColor =
    colorScheme === "dark" ? Colors.dark.description : Colors.light.description;
  const backgroundColor =
    colorScheme === "dark" ? Colors.dark.background : Colors.light.background;
  const [createOrgVisible, setCreateOrgVisible] = useState(false);

  // Refetch organizations when modal opens
  useEffect(() => {
    if (visible && isLoaded && userMemberships?.revalidate) {
      userMemberships.revalidate();
    }
  }, [visible, isLoaded, userMemberships]);

  const handleCreateOrg = () => setCreateOrgVisible(true);

  const handleCreateOrgSuccess = () => {
    // Organization creation was successful, the modal will close automatically
    // The organization list will be refreshed automatically by the useCreateOrg hook
  };

  const handleSwitch = async (
    organizationId: string | null,
    organizationName: string
  ) => {
    // Close modal immediately when switch is initiated
    onClose();

    // Trigger the organization switch using the context
    await switchOrganization(organizationId, organizationName);
  };

  const userName = user?.fullName || user?.firstName || "Personal";
  const isPersonalActive = !orgId;

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        keyboardBehavior="interactive"
        snapPoints={["90%"]}
        keyboardSnapPoint={0}
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
                  style={[styles.orgRow]}
                  activeOpacity={0.7}
                  onPress={() =>
                    handleSwitch(
                      item.id === "personal" ? null : item.id,
                      item.name
                    )
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
                  <Text style={[styles.orgName, { color: descriptionColor }]}>
                    {item.name}
                  </Text>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
