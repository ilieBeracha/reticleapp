import { useThemeColor } from "@/hooks/useThemeColor";
import { useAuth, useOrganizationList, useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CreateOrg from "./CreateOrg";
import { LoadingOverlay } from "./OrganizationSwitcher/components/LoadingOverlay";
import { ModalHandle } from "./OrganizationSwitcher/components/ModalHandle";
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
  const insets = useSafeAreaInsets();
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

  const backgroundColor = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  const handleSwitchToPersonal = async () => {
    setSwitchingToId("personal");
    try {
      await setActive?.({ organization: null });
      setTimeout(() => {
        onClose();
        setSwitchingToId(null);
      }, 300);
    } catch (error) {
      setSwitchingToId(null);
    }
  };

  const handleSwitchToOrg = async (organizationId: string) => {
    setSwitchingToId(organizationId);
    try {
      await setActive?.({ organization: organizationId });
      setTimeout(() => {
        onClose();
        setSwitchingToId(null);
      }, 300);
    } catch (error) {
      setSwitchingToId(null);
    }
  };

  const handleCreateOrg = () => {
    setCreateOrgVisible(true);
  };

  const userName = user?.fullName || user?.firstName || "Personal";
  const isPersonalActive = !orgId;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.container,
            {
              backgroundColor,
              paddingBottom: insets.bottom + 20,
              borderTopColor: borderColor,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ModalHandle />
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
        </Pressable>
      </Pressable>

      <LoadingOverlay visible={!!switchingToId} />
      <CreateOrg visible={createOrgVisible} setVisible={setCreateOrgVisible} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    minHeight: 400,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
