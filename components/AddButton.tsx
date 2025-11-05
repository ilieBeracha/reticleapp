import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

interface AddButtonProps {
  onPress: () => void;
}

export function AddButton({ onPress }: AddButtonProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: colors.tint }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
