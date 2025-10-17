import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface MenuItemProps {
  icon: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}

export function MenuItem({ icon, label, danger, onPress }: MenuItemProps) {
  const text = useThemeColor({}, "text");

  return (
    <TouchableOpacity
      style={styles.item}
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
      <Text style={[styles.itemText, { color: danger ? "#ef4444" : text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
