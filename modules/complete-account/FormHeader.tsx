import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";

export function FormHeader() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, { backgroundColor: colors.indigo }]} />
        <View
          style={[
            styles.progressLine,
            { backgroundColor: colors.indigo + "40" },
          ]}
        />
        <View
          style={[
            styles.progressDot,
            { backgroundColor: colors.indigo + "40" },
          ]}
        />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        Complete Your Profile
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]}>
        Just a few more details to get you started
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLine: {
    width: 40,
    height: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
});
