import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { invitationStore } from "@/store/invitationStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useStore } from "zustand";

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const { acceptInvitation } = useStore(invitationStore);
  const { fetchAllOrgs, switchOrganization } = useStore(useOrganizationsStore);
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [newOrgId, setNewOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (token && user?.id) {
      handleAccept();
    }
  }, [token, user?.id]);

  const handleAccept = async () => {
    if (!user?.id || !token) {
      console.log("Missing user or token:", { user: !!user?.id, token });
      return;
    }

    try {
      console.log("🎯 Accepting invite with code:", token);
      
      // Token is already the invite code (from URL param)
      const inviteCode = token.toUpperCase();
      
      // Accept invitation - creates membership and updates status
      const result = await acceptInvitation(inviteCode, user.id);
      
      console.log("✅ Successfully joined:", result);
      
      // Extract org ID from the result
      const joinedOrgId = result.invitation?.organization_id || (result as any).org_id;
      setNewOrgId(joinedOrgId);
      
      setStatus("success");
      setMessage(`Welcome to ${result.orgName}!`);
      
      // Refresh organization list to include newly joined org
      console.log("🔄 Refreshing organization list...");
      await fetchAllOrgs(user.id);
      console.log("✅ Organization list refreshed");
      
      // Switch to the newly joined organization
      if (joinedOrgId) {
        console.log("🔄 Switching to newly joined org:", joinedOrgId);
        await switchOrganization(joinedOrgId);
        console.log("✅ Switched to new organization");
      }
      
      // Wait a bit longer to ensure everything syncs
      setTimeout(() => {
        console.log("🏠 Redirecting to home with new org active");
        router.replace("/(protected)/(tabs)");
      }, 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setMessage(error.message || "Failed to join organization");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === "loading" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + "15" }]}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Joining organization...
            </Text>
            <Text style={[styles.subtitle, { color: colors.description }]}>
              Please wait
            </Text>
          </>
        )}
        
        {status === "success" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: colors.green + "15" }]}>
              <Ionicons name="checkmark-circle" size={56} color={colors.green} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Welcome!</Text>
            <Text style={[styles.subtitle, { color: colors.description }]}>
              {message}
            </Text>
          </>
        )}
        
        {status === "error" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: colors.red + "15" }]}>
              <Ionicons name="close-circle" size={56} color={colors.red} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Unable to Join
            </Text>
            <Text style={[styles.subtitle, { color: colors.description }]}>
              {message}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={() => router.replace("/(protected)/(tabs)")}
            >
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});