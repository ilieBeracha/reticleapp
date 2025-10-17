import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { OrganizationMembershipResource } from "@clerk/types";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface MemberItemProps {
  member: OrganizationMembershipResource;
}

export function MemberItem({ member }: MemberItemProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");
  const cardBackground = useThemeColor({}, "cardBackground");

  const isAdmin = member.role === "org:admin";
  const userName =
    member.publicUserData?.firstName ||
    member.publicUserData?.identifier ||
    "Unknown User";
  const userEmail = member.publicUserData?.identifier || "";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderColor },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: tintColor + "20" }]}>
        <Ionicons name="person" size={20} color={tintColor} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: textColor }]}>{userName}</Text>
        <Text style={[styles.email, { color: mutedColor }]}>{userEmail}</Text>
      </View>

      {/* Role Badge */}
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: isAdmin ? tintColor + "20" : borderColor,
          },
        ]}
      >
        <ThemedText
          style={[styles.roleText, { color: isAdmin ? tintColor : mutedColor }]}
        >
          {isAdmin ? "Admin" : "Member"}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  email: {
    fontSize: 13,
    fontWeight: "400",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
