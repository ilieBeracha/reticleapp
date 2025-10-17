import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, View } from "react-native";

interface GreetingSectionProps {
  userName: string;
}

export function GreetingSection({ userName }: GreetingSectionProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.greeting, { color: mutedColor }]}>
        {getGreeting()}
      </ThemedText>
      <ThemedText style={[styles.userName, { color: textColor }]}>
        {userName}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
