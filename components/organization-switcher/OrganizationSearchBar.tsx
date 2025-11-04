import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface OrganizationSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function OrganizationSearchBar({
  value,
  onChangeText,
}: OrganizationSearchBarProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Search organizations..."
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
});
