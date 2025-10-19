import { useColors } from "@/hooks/useColors";
import { StyleSheet, Text, View } from "react-native";

export function FormHeader() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        Complete your account
      </Text>
      <Text style={[styles.description, { color: colors.description }]}>
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
