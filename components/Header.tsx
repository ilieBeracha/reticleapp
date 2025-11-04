import { useColors } from "@/hooks/useColors";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOrganizationsStore } from "@/store/organizationsStore";
import ProfileDropdown from "./ProfileDropdown";
import { OrganizationSwitcherModal } from "./organization-switcher";

interface HeaderProps {
  onNotificationPress: () => void;
  notificationCount?: number;
}

export default function Header({
  onNotificationPress,
  notificationCount = 0,
}: HeaderProps) {
  const { user } = useUser();
  const { userOrgs, selectedOrgId } = useOrganizationsStore();
  const selectedOrg = userOrgs.find((org) => org.org_id === selectedOrgId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const userName =
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "User";
  const isPersonalMode = !selectedOrg;

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
        },
        {
          paddingTop: insets.top + 8,
        },
      ]}
    >
      {/* User Info Section - Opens Org Switcher */}
      <TouchableOpacity
        style={styles.userSection}
        onPress={handleOrgSwitcherPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isPersonalMode
                ? colors.indigo + "20"
                : colors.orange + "20",
            },
          ]}
        >
          <Ionicons
            name="person"
            size={24}
            color={isPersonalMode ? colors.indigo : colors.orange}
          />
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {userName}
          </Text>
          <Text style={[styles.userBadge, { color: colors.textMuted }]}>
            {isPersonalMode ? "Personal Account" : selectedOrg?.org_name}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right Side Actions */}
      <View style={styles.actions}>
        {notificationCount > 0 && (
          <TouchableOpacity
            style={[
              styles.notificationButton,
              {
                backgroundColor: colors.red,
                boxShadow: `0 0 10px 0 ${colors.red}`,
                borderColor: colors.red + "40",
              },
            ]}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Text style={styles.notificationText}>{notificationCount}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: colors.card }]}
          onPress={() => setProfileOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

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
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    gap: 2,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
  },
  userBadge: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  notificationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
