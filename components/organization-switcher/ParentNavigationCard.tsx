import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ParentNavigationCardProps {
  parentName: string;
  isCommander: boolean;
  onPress: () => void;
}

export function ParentNavigationCard({
  parentName,
  isCommander,
  onPress,
}: ParentNavigationCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: `${colors.indigo}08`,
          borderColor: `${colors.indigo}25`,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[styles.iconBox, { backgroundColor: `${colors.indigo}20` }]}>
        <Ionicons name="arrow-up" size={20} color={colors.indigo} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Parent Organization
        </Text>
        <Text style={[styles.name, { color: colors.text }]}>{parentName}</Text>
      </View>
      {isCommander && (
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={16} color="#f59e0b" />
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f59e0b15",
    alignItems: "center",
    justifyContent: "center",
  },
});
