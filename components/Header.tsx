import { useColors } from "@/hooks/useColors";
import { useOrganization } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderActions } from "./Header/components/HeaderActions";
import { OrganizationBadge } from "./Header/components/OrganizationBadge";
import { OrganizationSwitcherModal } from "./modals/OrganizationSwitcherModal";
import ProfileDropdown from "./ProfileDropdown";

interface HeaderProps {
  onNotificationPress: () => void;
  notificationCount?: number;
}

export default function Header({
  onNotificationPress,
  notificationCount = 0,
}: HeaderProps) {
  const { organization } = useOrganization();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleOrgSwitcherPress = () => {
    // Prevent multiple rapid clicks
    if (orgSwitcherOpen) return;
    setOrgSwitcherOpen(true);
  };

  const handleMenuAction = (action: string) => {
    if (action === "settings") {
      router.push("/(home)/settings");
    }
  };

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.background },
        {
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <OrganizationBadge
        organizationName={organization?.name}
        onPress={handleOrgSwitcherPress}
      />

      <HeaderActions
        notificationCount={notificationCount}
        onNotificationPress={onNotificationPress}
        onProfilePress={() => setProfileOpen(true)}
      />

      <ProfileDropdown
        onClose={() => setProfileOpen(false)}
        visible={profileOpen}
        menuItems={[
          {
            icon: "settings-outline",
            label: "settings",
            action: "settings",
          },
        ]}
        onMenuAction={handleMenuAction}
      />

      <OrganizationSwitcherModal
        visible={orgSwitcherOpen}
        onClose={() => setOrgSwitcherOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 26,
  },
});
