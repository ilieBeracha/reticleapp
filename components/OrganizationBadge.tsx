import { useColors } from "@/hooks/useColors";
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
  const colors = useColors();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {organizationName !== "Personal" ? (
        <>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.orange + "20",
                borderWidth: 1.5,
                borderColor: colors.orange + "50",
              },
            ]}
          >
            <Ionicons name="business" size={16} color={colors.orange} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {organizationName}
          </Text>
        </>
      ) : (
        <>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.indigo + "20",
                borderWidth: 1.5,
                borderColor: colors.indigo + "50",
              },
            ]}
          >
            <Ionicons name="person" size={16} color={colors.indigo} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Personal</Text>
        </>
      )}
      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
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
