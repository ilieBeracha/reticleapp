import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useUser } from "@clerk/clerk-expo";
import { SignOutButton } from "./SignOutButton";

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

export default function ProfileDropdown({
  visible,
  onClose,
  menuItems,
  onMenuAction,
}: ProfileDropdownProps) {
  const cardBackground = useThemeColor({}, "cardBackground");
  const text = useThemeColor({}, "text");
  const icon = useThemeColor({}, "icon");
  const border = useThemeColor({}, "border");
  const { user } = useUser();
  const userName = user?.fullName || "User";
  const userEmail =
    user?.primaryEmailAddress?.emailAddress || "user@example.com";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.dropdownContainer}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: cardBackground,
                borderColor: border,
                borderWidth: 1,
              },
            ]}
            accessibilityRole="menu"
            accessibilityLabel="Profile menu"
          >
            <View style={styles.dropdownHeader}>
              <View
                style={[styles.dropdownAvatar, { backgroundColor: border }]}
              >
                <Text style={[styles.avatarText, { color: text }]}>
                  {userEmail?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.dropdownUserInfo}>
                <Text style={[styles.dropdownName, { color: text }]}>
                  {userName}
                </Text>
                <Text style={[styles.dropdownEmail, { color: icon }]}>
                  {userEmail || "user@example.com"}
                </Text>
              </View>
            </View>
            <View
              style={[styles.dropdownDivider, { backgroundColor: border }]}
            />
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dropdownItem}
                onPress={() => {
                  onMenuAction(item.action);
                  onClose();
                }}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.danger ? "#ef4444" : text}
                />
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: item.danger ? "#ef4444" : text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <SignOutButton />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownContainer: {
    position: "absolute",
    top: 100,
    right: 20,
    minWidth: 280,
  },
  dropdown: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  dropdownAvatar: {
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
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  dropdownEmail: {
    fontSize: 13,
  },
  dropdownDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
