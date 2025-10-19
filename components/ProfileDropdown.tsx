import { useColors } from "@/hooks/useColors";
import { useUser } from "@clerk/clerk-expo";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { MenuList } from "./ProfileDropdown/components/MenuList";
import { ProfileHeader } from "./ProfileDropdown/components/ProfileHeader";

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
  const colors = useColors();
  const { user } = useUser();
  const userName = user?.fullName || "User";
  const userEmail =
    user?.primaryEmailAddress?.emailAddress || "user@example.com";

  const handleMenuAction = (action: string) => {
    onMenuAction(action);
    onClose();
  };

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
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            accessibilityRole="menu"
            accessibilityLabel="Profile menu"
          >
            <ProfileHeader userName={userName} userEmail={userEmail} />
            <MenuList items={menuItems} onMenuAction={handleMenuAction} />
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
});
