import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganization } from "@clerk/clerk-expo";
import { useState } from "react";
import ProfileDropdown from "./ProfileDropdown";
import { ThemedView } from "./ThemedView";

interface HeaderProps {
  onNotificationPress: () => void;
  notificationCount?: number;
}

export default function Header({
  onNotificationPress,
  notificationCount = 0,
}: HeaderProps) {
  const { organization } = useOrganization();
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "icon");
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <ThemedView style={[styles.header, { backgroundColor: "transparent" }]}>
      {/* Left: App/Organization indicator */}
      <View style={styles.leftSection}>
        {organization ? (
          <>
            <View
              style={[styles.iconContainer, { backgroundColor: mutedColor }]}
            >
              <Ionicons name="business-outline" size={16} color={textColor} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>
              {organization.name}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="analytics-outline" size={20} color={textColor} />
            <Text style={[styles.title, { color: textColor }]}>Scopes</Text>
          </>
        )}
      </View>

      {/* Right: Actions */}
      <View style={styles.rightSection}>
        {notificationCount > 0 && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Text style={styles.notificationText}>{notificationCount}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setProfileOpen(true)}>
          <Ionicons name="person-outline" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      <ProfileDropdown
        onClose={() => setProfileOpen(false)}
        visible={profileOpen}
        menuItems={[
          {
            icon: "settings-outline",
            label: "Organization settings",
            action: "organization_settings",
          },
        ]}
        onMenuAction={(action) => {
          if (action === "organization_settings") {
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
