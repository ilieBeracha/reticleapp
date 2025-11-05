import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrganizationListItemProps {
  id: string;
  name: string;
  role?: string | null;
  isActive: boolean;
  isPersonal?: boolean;
  onPress: () => void;
}

export function OrganizationListItem({
  id,
  name,
  role,
  isActive,
  isPersonal = false,
  onPress,
}: OrganizationListItemProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isActive ? colors.indigo + "10" : colors.card,
          borderColor: isActive ? colors.indigo : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isPersonal ? "person" : "business"}
        size={22}
        color={isActive ? colors.indigo : colors.textMuted}
      />
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            {
              color: colors.text,
              fontWeight: isActive ? "700" : "500",
            },
          ]}
        >
          {name}
        </Text>
        {role && (
          <Text style={[styles.role, { color: colors.textMuted }]}>
            {role === "commander" ? "Commander" : role}
          </Text>
        )}
      </View>
      {isActive && (
        <Ionicons name="checkmark-circle" size={22} color={colors.indigo} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
  },
  role: {
    fontSize: 12,
    fontWeight: "500",
  },
});
