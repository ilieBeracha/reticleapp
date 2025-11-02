import { useColors } from "@/hooks/useColors";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOrganizationsStore } from "@/store/organizationsStore";
import { HeaderActions } from "./HeaderActions";
import { OrganizationBadge } from "./OrganizationBadge";
import { OrganizationSwitcherModal } from "./OrganizationSwitcherModal";
import ProfileDropdown from "./ProfileDropdown";

interface HeaderProps {
  onNotificationPress: () => void;
  notificationCount?: number;
}

export default function Header({
  onNotificationPress,
  notificationCount = 0,
}: HeaderProps) {
  const { userOrgs, selectedOrgId } = useOrganizationsStore();
  const selectedOrg = userOrgs.find((org) => org.org_id === selectedOrgId);
  console.log("selectedOrg", selectedOrg);
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
      router.push("/(protected)/(tabs)/settings");
    } else if (action === "loadout") {
      router.push("/(protected)/(tabs)/loadout");
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <OrganizationBadge
        organizationName={selectedOrg?.org_name || "Personal"}
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
            icon: "telescope-outline",
            label: "loadout",
            action: "loadout",
          },
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
});
