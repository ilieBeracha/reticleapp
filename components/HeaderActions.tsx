import { useColors } from "@/hooks/ui/useColors";
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
  const colors = useColors();

  return (
    <View style={styles.container}>
      {notificationCount > 0 && (
        <TouchableOpacity
          style={[
            styles.notificationButton,
            {
              backgroundColor: colors.red,
              borderWidth: 2,
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
        onPress={onProfilePress}
        style={[
          styles.profileButton,
          {
            backgroundColor: colors.indigo + "20",
            borderWidth: 1.5,
            borderColor: colors.indigo + "50",
          },
        ]}
        activeOpacity={0.7}
      >
        <Ionicons name="person" size={18} color={colors.indigo} />
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
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
