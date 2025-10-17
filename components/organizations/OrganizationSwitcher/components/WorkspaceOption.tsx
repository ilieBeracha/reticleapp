import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface WorkspaceOptionProps {
  name: string;
  isActive: boolean;
  isPrimary?: boolean;
  icon?: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function WorkspaceOption({
  name,
  isActive,
  isPrimary = false,
  icon = "business",
  onPress,
  isLoading = false,
}: WorkspaceOptionProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  return (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: isActive ? tintColor + "15" : cardBackground,
          borderColor: isActive ? tintColor : borderColor,
          opacity: isLoading ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isActive ? tintColor : borderColor,
          },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={isActive ? "#FFF" : textColor}
        />
      </View>

      <View style={styles.info}>
        <ThemedText style={[styles.name, { color: textColor }]}>
          {name}
        </ThemedText>
        {isPrimary && (
          <ThemedText style={[styles.label, { color: mutedColor }]}>
            Personal workspace
          </ThemedText>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={tintColor} />
      ) : isActive ? (
        <Ionicons name="checkmark-circle" size={24} color={tintColor} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
    fontWeight: "400",
  },
});
