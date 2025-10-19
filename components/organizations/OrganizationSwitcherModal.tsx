import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth, useOrganizationList, useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import CreateOrg from "./CreateOrg";
import { LoadingOverlay } from "./OrganizationSwitcher/components/LoadingOverlay";
import { SwitcherHeader } from "./OrganizationSwitcher/components/SwitcherHeader";
import { WorkspaceList } from "./OrganizationSwitcher/components/WorkspaceList";

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
    userMemberships: {
      pageSize: 50,
    },
  });

  const [createOrgVisible, setCreateOrgVisible] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);

  // Refetch organizations when modal becomes visible
  useEffect(() => {
    if (visible && isLoaded && userMemberships?.revalidate) {
      userMemberships.revalidate();
    }
  }, [visible, isLoaded, userMemberships]);

  const handleSwitchToPersonal = async () => {
    setSwitchingToId("personal");
    try {
      await setActive?.({ organization: null });
      setTimeout(() => {
        onClose();
        setSwitchingToId(null);
        // Clear confirmation
        setTimeout(() => {
          Alert.alert(
            "Workspace Switched ✓",
            "You are now in your Personal workspace",
            [{ text: "OK" }]
          );
        }, 100);
      }, 300);
    } catch (error) {
      setSwitchingToId(null);
      Alert.alert("Error", "Failed to switch workspace", [{ text: "OK" }]);
    }
  };

  const handleSwitchToOrg = async (organizationId: string) => {
    setSwitchingToId(organizationId);
    try {
      await setActive?.({ organization: organizationId });
      const orgName = userMemberships?.data?.find(
        (m) => m.organization.id === organizationId
      )?.organization.name;

      setTimeout(() => {
        onClose();
        setSwitchingToId(null);
        // Clear confirmation
        setTimeout(() => {
          Alert.alert(
            "Workspace Switched ✓",
            `You are now in ${orgName || "the organization"}`,
            [{ text: "OK" }]
          );
        }, 100);
      }, 300);
      
    } catch (error) {
      setSwitchingToId(null);
      Alert.alert("Error", "Failed to switch workspace", [{ text: "OK" }]);
    }
  };

  const handleCreateOrg = () => {
    setCreateOrgVisible(true);
  };

  const userName = user?.fullName || user?.firstName || "Personal";
  const isPersonalActive = !orgId;

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={["70%"]}
        enablePanDownToClose={true}
        backdropOpacity={0.5}
      >
        <SwitcherHeader />

        {!isLoaded ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : (
          <WorkspaceList
            userName={userName}
            isPersonalActive={isPersonalActive}
            organizations={userMemberships?.data ?? []}
            activeOrgId={orgId}
            switchingToId={switchingToId}
            onSwitchToPersonal={handleSwitchToPersonal}
            onSwitchToOrg={handleSwitchToOrg}
            onCreateOrg={handleCreateOrg}
          />
        )}
      </BaseBottomSheet>

      <LoadingOverlay visible={!!switchingToId} />
      <CreateOrg visible={createOrgVisible} setVisible={setCreateOrgVisible} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
