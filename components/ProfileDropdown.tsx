import BaseBottomSheet from "@/components/BaseBottomSheet";
import { SignOutButton } from "@/components/SignOutButton";
import { useColors } from "@/hooks/ui/useColors";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";

interface ProfileMenuItem {
  icon: string;
  label: string;
  action: string;
  danger?: boolean;
}

interface ProfileDropdownProps {
  visible: boolean;
  onClose: () => void;
  menuItems: ProfileMenuItem[];
  onMenuAction: (action: string) => void;
}

function ProfileHeader({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const border = useThemeColor({}, "border");

  return (
    <View style={styles.header}>
      <View style={[styles.avatar, { backgroundColor: border }]}>
        <Text style={[styles.avatarText, { color: text }]}>
          {userEmail?.[0]?.toUpperCase() || "U"}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.name, { color: text }]}>{userName}</Text>
        <Text style={[styles.email, { color: icon }]}>{userEmail}</Text>
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const text = useThemeColor({}, "text");

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={danger ? "#ef4444" : text}
      />
      <Text style={[styles.menuItemText, { color: danger ? "#ef4444" : text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileDropdown({
  visible,
  onClose,
  menuItems,
  onMenuAction,
}: ProfileDropdownProps) {
  const colors = useColors();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name || "User";
  const userEmail =
    user?.email || "user@example.com";

  const handleMenuAction = (action: string) => {
    onMenuAction(action);
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      enableDynamicSizing={true}
      enablePanDownToClose={true}
    >
      <View
        style={styles.content}
        accessibilityRole="menu"
        accessibilityLabel="Profile menu"
      >
        <ProfileHeader userName={userName} userEmail={userEmail} />

        {menuItems.length > 0 && (
          <>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            {menuItems.map((item, idx) => (
              <MenuItem
                key={idx}
                icon={item.icon}
                label={item.label}
                danger={item.danger}
                onPress={() => handleMenuAction(item.action)}
              />
            ))}
          </>
        )}

        <SignOutButton />
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
