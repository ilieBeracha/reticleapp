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
      <Text style={[styles.greeting, { color: colors.description }]}>
        {getGreeting()},
      </Text>
      <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>

      {/* Organization Context Badge */}
      {organizationName && (
        <View
          style={[styles.contextBadge, { backgroundColor: colors.tint + "15" }]}
        >
          <Ionicons
            name={isPersonalWorkspace ? "person" : "business"}
            size={14}
            color={colors.tint}
          />
          <Text style={[styles.contextText, { color: colors.tint }]}>
            {organizationName}
          </Text>
        </View>
      )}

      {!organizationName && (
        <View
          style={[
            styles.contextBadge,
            { backgroundColor: colors.description + "15" },
          ]}
        >
          <Ionicons name="person" size={14} color={colors.description} />
          <Text style={[styles.contextText, { color: colors.description }]}>
            Personal Workspace
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 40,
    paddingTop: 8,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.8,
  },
  userName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  contextText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
