import { useColors } from "@/hooks/useColors";
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
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-up-circle" size={28} color={colors.indigo} />
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Go up to parent
        </Text>
        <Text style={[styles.name, { color: colors.text }]}>{parentName}</Text>
      </View>
      {isCommander && (
        <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
    marginBottom: 8,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
});
