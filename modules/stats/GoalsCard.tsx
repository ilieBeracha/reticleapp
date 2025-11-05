import { useColors } from "@/hooks/ui/useColors";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

interface GoalsCardProps {
  percentage: number;
  title?: string;
  subtitle?: string;
}

export function GoalsCard({
  percentage,
  title = "My Goals",
  subtitle = "Keep it up, you can achieve your goals.",
}: GoalsCardProps) {
  const colors = useColors();

  return (
    <LinearGradient
      colors={[colors.purple, colors.indigo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <Text style={styles.percentage}>{percentage}%</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContent: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FFFFFF",
    opacity: 0.8,
  },
  progressContainer: {
    marginLeft: 16,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  percentage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
