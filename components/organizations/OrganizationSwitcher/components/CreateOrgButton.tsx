import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

interface CreateOrgButtonProps {
  onPress: () => void;
}

export function CreateOrgButton({ onPress }: CreateOrgButtonProps) {
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="add-circle-outline" size={20} color={tintColor} />
      <ThemedText style={[styles.text, { color: textColor }]}>
        Create Organization
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 8,
    marginTop: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});
