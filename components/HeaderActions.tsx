import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeaderActionsProps {
  notificationCount: number;
  onNotificationPress: () => void;
  onProfilePress: () => void;
}

export function HeaderActions({
  notificationCount,
  onNotificationPress,
  onProfilePress,
}: HeaderActionsProps) {
  const textColor = useThemeColor({}, "text");

  return (
    <View style={styles.container}>
      {notificationCount > 0 && (
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Text style={styles.notificationText}>{notificationCount}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onProfilePress}>
        <Ionicons name="person-outline" size={20} color={textColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
