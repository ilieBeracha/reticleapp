import { useEffect, useState } from "react";

import BaseBottomSheet from "@/components/BaseBottomSheet";
import { SignOutButton } from "@/components/SignOutButton";
import { EnterInviteCodeForm } from "@/components/profile/EnterInviteCodeForm";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const userEmail = user?.email || "user@example.com";
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [hasStoredInviteCode, setHasStoredInviteCode] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    AsyncStorage.getItem("pending_invite_code")
      .then((stored) => {
        if (!isMounted) {
          return;
        }
        setPendingInviteCode(stored);
        setHasStoredInviteCode(Boolean(stored));
      })
      .catch(() => {
        if (isMounted) {
          setPendingInviteCode(null);
          setHasStoredInviteCode(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleMenuAction = (action: string) => {
    if (action === "join-org") {
      setIsJoinOpen(true);
      return;
    }
    onMenuAction(action);
    onClose();
  };

  const handleJoinCancel = () => {
    setIsJoinOpen(false);
  };

  const handlePendingInviteCleared = () => {
    setPendingInviteCode(null);
    setHasStoredInviteCode(false);
  };

  const handleJoinSuccess = () => {
    handlePendingInviteCleared();
    setIsJoinOpen(false);
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

        {!isJoinOpen && menuItems.length > 0 && (
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

            {hasStoredInviteCode && (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: colors.tint + "20",
                    borderColor: colors.tint + "35",
                  },
                ]}
              >
                <Text style={[styles.noticeTitle, { color: colors.tint }]}>
                  Invite code saved
                </Text>
                <Text
                  style={[styles.noticeText, { color: colors.textMuted }]}
                >
                  Tap “Enter invite code” to join your organization.
                </Text>
              </View>
            )}
          </>
        )}

        {isJoinOpen && (
          <EnterInviteCodeForm
            initialInviteCode={pendingInviteCode ?? ""}
            onCancel={handleJoinCancel}
            onSuccess={handleJoinSuccess}
            onPendingInviteCleared={handlePendingInviteCleared}
          />
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
  notice: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
