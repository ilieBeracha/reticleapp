// app/(auth)/accept-invitation.tsx
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

export default function AcceptInvitationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { userId } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations (id, name, description, type)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Invalid or expired invitation');
        router.replace('/(protected)/(tabs)');
        return;
      }

      // Check if invitation has expired (7 days)
      const createdAt = new Date(data.created_at);
      const now = new Date();
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        // Mark as expired
        await supabase
          .from('organization_invitations')
          .update({ status: 'expired' })
          .eq('id', data.id);
        
        Alert.alert('Error', 'This invitation has expired');
        router.replace('/(protected)/(tabs)');
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error('Error fetching invitation:', error);
      Alert.alert('Error', 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!userId || !invitation) return;
  
    try {
      setAccepting(true);
  
      // Check if user is already a member - USING CORRECT COLUMN NAMES
      const { data: existingMember } = await supabase
        .from('org_memberships')
        .select('id')
        .eq('user_id', userId)  // ✅ FIXED: user_id not clerk_user_id
        .eq('org_id', invitation.organization_id)  // ✅ FIXED: org_id not organization_id
        .maybeSingle();
  
      if (existingMember) {
        Alert.alert('Already a Member', 'You are already a member of this organization');
        router.replace('/(protected)/(tabs)');
        return;
      }
  
      // Update invitation status to accepted
      const { error: invError } = await supabase
        .from('organization_invitations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);
  
      if (invError) throw invError;
  
      // Add user to the organization - USING CORRECT COLUMN NAMES
      const { error: memberError } = await supabase
        .from('org_memberships')
        .insert({
          user_id: userId,  // ✅ FIXED: user_id not clerk_user_id
          org_id: invitation.organization_id,  // ✅ FIXED: org_id not organization_id
          role: invitation.role,
        });
  
      if (memberError) throw memberError;
  
      Alert.alert(
        'Welcome! 🎉',
        `You've successfully joined ${invitation.organizations.name} as a ${invitation.role}`,
        [
          {
            text: 'View Organization',
            onPress: () => router.replace('/(protected)/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('organization_invitations')
                .update({ status: 'revoked' })
                .eq('id', invitation.id);
              
              router.replace('/(protected)/(tabs)');
            } catch (error) {
              console.error('Error declining invitation:', error);
              router.replace('/(protected)/(tabs)');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open" size={64} color="#667eea" />
        </View>

        <ThemedText style={styles.title}>You're Invited!</ThemedText>
        <ThemedText style={styles.subtitle}>
          Join {invitation.organizations.name}
        </ThemedText>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="business" size={20} color="#667eea" />
            <View style={styles.detailText}>
              <ThemedText style={styles.detailLabel}>Organization</ThemedText>
              <ThemedText style={styles.detailValue}>
                {invitation.organizations.name}
              </ThemedText>
              <ThemedText style={styles.detailSubvalue}>
                {invitation.organizations.type}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark" size={20} color="#667eea" />
            <View style={styles.detailText}>
              <ThemedText style={styles.detailLabel}>Your Role</ThemedText>
              <ThemedText style={styles.detailValue}>
                {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </ThemedText>
            </View>
          </View>

          {invitation.organizations.description && (
            <View style={styles.detailRow}>
              <Ionicons name="information-circle" size={20} color="#667eea" />
              <View style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>About</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {invitation.organizations.description}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="time" size={16} color="#f59e0b" />
          <ThemedText style={styles.warningText}>
            This invitation expires in 7 days
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          onPress={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <ThemedText style={styles.buttonText}>Accept & Join</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={handleDecline}
          disabled={accepting}
        >
          <ThemedText style={styles.declineButtonText}>Decline</ThemedText>
        </TouchableOpacity>
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
    padding: 24,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 32,
  },
  detailsCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailSubvalue: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 13,
    color: "#92400e",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: "#667eea",
  },
  declineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.6,
  },
});