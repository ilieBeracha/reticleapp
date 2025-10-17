import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";

interface ProfileHeaderProps {
  userName: string;
  userEmail: string;
}

export function ProfileHeader({ userName, userEmail }: ProfileHeaderProps) {
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
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
});
