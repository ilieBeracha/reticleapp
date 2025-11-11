import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";

export function SessionInfo({ 
  title, 
  subtitle,
}: { 
  title: string; 
  subtitle: string;
}) {
  const colors = useColors();
  
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.description }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
});