import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, View } from "react-native";

export function FormHeader() {
  const textColor = useThemeColor({}, "text");
  const descriptionColor = useThemeColor({}, "description");

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>
        Complete your account
      </Text>
      <Text style={[styles.description, { color: descriptionColor }]}>
        Complete your account to start your journey with thousands of developers
        around the world.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 5,
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
  },
});
