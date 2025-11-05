import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

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
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      {user?.user_metadata?.avatar_url ? (
        <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.profileImage} />
      ) : (
        <View
          style={[
            styles.profilePlaceholder,
            { backgroundColor: colors.indigo + "20" },
          ]}
        >
          <Ionicons name="person" size={24} color={colors.indigo} />
        </View>
      )}

      {/* Greeting Text */}
      <Text style={[styles.greeting, { color: colors.text }]}>Welcome</Text>
      <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingTop: 8,
    paddingBottom: 20,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
});
