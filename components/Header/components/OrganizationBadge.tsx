import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrganizationBadgeProps {
  organizationName?: string;
  onPress: () => void;
}

export function OrganizationBadge({
  organizationName,
  onPress,
}: OrganizationBadgeProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "icon");

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {organizationName ? (
        <>
          <View style={[styles.iconContainer, { backgroundColor: mutedColor }]}>
            <Ionicons name="business-outline" size={16} color={textColor} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>
            {organizationName}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="person-circle-outline" size={24} color={textColor} />
          <Text style={[styles.title, { color: textColor }]}>Personal</Text>
        </>
      )}
      <Ionicons name="chevron-down" size={16} color={mutedColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
});
