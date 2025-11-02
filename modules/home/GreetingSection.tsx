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
          style={[
            styles.contextBadge,
            {
              backgroundColor: colors.orange + "15",
              borderWidth: 1.5,
              borderColor: colors.orange + "40",
            },
          ]}
        >
          <Ionicons
            name={isPersonalWorkspace ? "person" : "business"}
            size={14}
            color={colors.orange}
          />
          <Text style={[styles.contextText, { color: colors.orange }]}>
            {organizationName}
          </Text>
        </View>
      )}

      {!organizationName && (
        <View
          style={[
            styles.contextBadge,
            {
              backgroundColor: colors.indigo + "15",
              borderWidth: 1.5,
              borderColor: colors.indigo + "40",
            },
          ]}
        >
          <Ionicons name="person" size={14} color={colors.indigo} />
          <Text style={[styles.contextText, { color: colors.indigo }]}>
            Personal Workspace
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.7,
  },
  userName: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  contextText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
