import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface CreateOrgButtonProps {
  onPress: () => void;
  isChild?: boolean;
}

export function CreateOrgButton({
  onPress,
  isChild = false,
}: CreateOrgButtonProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.indigo }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add-circle" size={24} color="#fff" />
      <Text style={styles.text}>
        {isChild ? "Create Child Organization" : "Create Organization"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 14,
    gap: 10,
    marginTop: 12,
  },
  text: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
