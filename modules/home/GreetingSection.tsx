import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { SessionStats } from "@/services/sessionService";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionStatsStore } from "@/store/sessionsStore";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

interface GreetingSectionProps {
  userName: string;
  organizationName?: string;
  isPersonalWorkspace?: boolean;
}

export function GreetingSection({
  isPersonalWorkspace = false,
}: GreetingSectionProps) {
  const colors = useColors();
  const { user } = useAuth();

  const currentHour = new Date().getHours();
  let greeting = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good Afternoon";
  if (currentHour >= 17) greeting = "Good Evening";

  // Today's date
  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      {/* Minimal Date */}
      <Text style={[styles.dateText, { color: colors.textMuted }]}>{today}</Text>

      {/* Profile Picture - Subtle */}
      {user?.user_metadata?.avatar_url ? (
        <Image
          source={{ uri: user.user_metadata.avatar_url }}
          style={styles.profileImage}
        />
      ) : (
        <View
          style={[
            styles.profilePlaceholder,
            { backgroundColor: colors.border },
          ]}
        >
          <Ionicons name="person" size={26} color={colors.textMuted} />
        </View>
      )}

      {/* Greeting - Clean Typography */}
      <Text style={[styles.greeting, { color: colors.description }]}>{greeting}</Text>
      <Text style={[styles.userName, { color: colors.text }]}>
        {user?.user_metadata?.full_name || "User"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 20,
    opacity: 0.6,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    opacity: 0.95,
  },
  profilePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: 0.2,
    marginBottom: 4,
    opacity: 0.7,
  },
  userName: {
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1,
    marginBottom: 6,
  },
  orgSection: {
    marginTop: 24,
  },
  orgTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orgName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  divider: {
    height: 1,
    marginBottom: 16,
    opacity: 0.3,
  },
  insights: {
    gap: 14,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
    letterSpacing: 0.1,
    opacity: 0.85,
  },
});
