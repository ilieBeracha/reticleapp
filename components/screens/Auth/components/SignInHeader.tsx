import { useColors } from "@/hooks/useColors";
import { StyleSheet, Text, View } from "react-native";

export function SignInHeader() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        Login on Dev Inteprid
      </Text>
      <Text style={[styles.description, { color: colors.description }]}>
        Start your journey with thousands of developers around the world.
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
