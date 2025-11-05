import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

export function HeaderSearchBar({
  onSearch,
  style,
}: {
  onSearch: (q: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [query, setQuery] = useState("");
  const colors = useColors();
  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.searchBox,
          {
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={colors.description}
          style={styles.icon}
        />
        <TextInput
          placeholder="Search..."
          placeholderTextColor={colors.description}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => onSearch(query)}
          style={styles.input}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    color: "#222",
  },
});
