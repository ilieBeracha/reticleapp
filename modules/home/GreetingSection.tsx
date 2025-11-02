import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface GreetingSectionProps {
  userName: string;
  organizationName?: string;
  isPersonalWorkspace?: boolean;
}

export function GreetingSection({
  userName,
  organizationName,
  isPersonalWorkspace = false,
}: GreetingSectionProps) {
  const colors = useColors();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Burning the midnight oil";
    if (hour < 7) return "You're up early";
    if (hour < 12) return "Good morning";
    if (hour < 14) return "Good afternoon";
    if (hour < 18) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good evening";
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.greeting, { color: colors.textMuted }]}>
        {getGreeting()},
      </Text>
      <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>

      {organizationName && (
        <View
          style={[
            styles.contextBadge,
            { backgroundColor: colors.indigo + "18" },
          ]}
        >
          <Ionicons
            name={isPersonalWorkspace ? "person" : "business"}
            size={13}
            color={colors.indigo}
          />
          <Text style={[styles.contextText, { color: colors.indigo }]}>
            {organizationName}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.5,
  },
  userName: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -1,
    marginBottom: 8,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  contextText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
