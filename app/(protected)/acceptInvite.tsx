import { useColors } from "@/hooks/ui/useColors";
import { acceptTeamInvitation, getInvitationByCode } from "@/services/teamService";
import { useTeamStore } from "@/store/teamStore";
import type { TeamInvitation, TeamRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * ACCEPT INVITE SHEET - Team Invitations
 * 
 * Team-First Architecture: Users join teams directly via invite code.
 */
export default function AcceptInviteSheet() {
  const colors = useColors();
  
  const [inviteCode, setInviteCode] = useState("");
  const [validatedInvite, setValidatedInvite] = useState<(TeamInvitation & { team_name?: string }) | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [acceptedResult, setAcceptedResult] = useState<{ team_id: string; team_name: string; role: TeamRole } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = useCallback(async () => {
    const code = inviteCode.trim().toUpperCase();
    
    if (!code) {
      setError("Please enter an invite code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (code.length !== 8) {
      setError("Invite code must be 8 characters");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Keyboard.dismiss();
    setIsValidating(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const invite = await getInvitationByCode(code);
      if (invite) {
        setValidatedInvite(invite);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError("Invalid or expired invite code");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      console.error("Failed to validate invite:", error);
      setError(error.message || "Invalid or expired invite code");
      setValidatedInvite(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsValidating(false);
    }
  }, [inviteCode]);

  const handleAccept = useCallback(async () => {
    if (!validatedInvite) return;

    setIsAccepting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await acceptTeamInvitation(validatedInvite.invite_code);
      
      // Reload teams to include the new one
      await useTeamStore.getState().loadTeams();
      
      // Show success state
      setAcceptedResult(result);
      setIsAccepted(true);
      setIsAccepting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "Welcome!",
        `You've successfully joined ${result.team_name}!`,
        [
          {
            text: "Open Team",
            onPress: () => {
              useTeamStore.getState().setActiveTeam(result.team_id);
              router.replace('/(protected)/team');
            },
          },
          {
            text: "Stay Here",
            style: "cancel",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Failed to accept invitation:", error);
      Alert.alert("Error", error.message || "Failed to join team");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAccepting(false);
    }
  }, [validatedInvite]);

  const handleDecline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Decline Invitation",
      "Are you sure you don't want to join this team?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            setInviteCode("");
            setValidatedInvite(null);
            setError(null);
          },
        },
      ]
    );
  }, []);

  const handleReset = useCallback(() => {
    setInviteCode("");
    setValidatedInvite(null);
    setError(null);
  }, []);

  const getRoleColor = (role: TeamRole) => {
    const roleColors: Record<TeamRole, string> = {
      owner: '#5B6B8C',
      commander: '#7C3AED',
      squad_commander: '#3B82F6',
      soldier: '#6B8FA3',
    };
    return roleColors[role] || '#6B8FA3';
  };

  const getRoleIcon = (role: TeamRole): keyof typeof Ionicons.glyphMap => {
    const icons: Record<TeamRole, keyof typeof Ionicons.glyphMap> = {
      owner: 'shield-checkmark',
      commander: 'shield',
      squad_commander: 'shield-half',
      soldier: 'person',
    };
    return icons[role] || 'person';
  };

  const getRoleLabel = (role: TeamRole): string => {
    const labels: Record<TeamRole, string> = {
      owner: 'Owner',
      commander: 'Commander',
      squad_commander: 'Squad Commander',
      soldier: 'Soldier',
    };
    return labels[role] || role;
  };

  // Success state
  if (isAccepted && acceptedResult) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Welcome!</Text>
        <Text style={[styles.successTeam, { color: colors.text }]}>
          {acceptedResult.team_name}
        </Text>
        <View style={[styles.successBadge, { backgroundColor: getRoleColor(acceptedResult.role) + '20' }]}>
          <Ionicons name={getRoleIcon(acceptedResult.role)} size={16} color={getRoleColor(acceptedResult.role)} />
          <Text style={[styles.successRole, { color: getRoleColor(acceptedResult.role) }]}>
            Joined as {getRoleLabel(acceptedResult.role)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="enter" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Join Team</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {validatedInvite ? 'Review invitation' : 'Enter invite code to get started'}
        </Text>
        
        {validatedInvite && (
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.secondary, marginTop: 12 }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
            <Text style={[styles.resetBtnText, { color: colors.text }]}>Enter Different Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {!validatedInvite ? (
        // Step 1: Enter and Validate Code
        <>
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              <Ionicons name="key-outline" size={14} color={colors.text} /> Invite Code
            </Text>
            <View style={[styles.inputWrapper, { 
              backgroundColor: colors.background, 
              borderColor: error ? colors.destructive : colors.border 
            }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. ABC123XY"
                placeholderTextColor={colors.textMuted}
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text.toUpperCase());
                  setError(null);
                }}
                autoCapitalize="characters"
                maxLength={8}
                returnKeyType="go"
                onSubmitEditing={handleValidate}
                autoFocus
              />
            </View>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.validateButton,
              { 
                backgroundColor: isValidating ? colors.secondary : colors.primary,
                opacity: isValidating || !inviteCode.trim() ? 0.7 : 1,
              }
            ]}
            onPress={handleValidate}
            disabled={isValidating || !inviteCode.trim()}
            activeOpacity={0.8}
          >
            {isValidating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.validateButtonText}>Validate Code</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Help Section */}
          <View style={[styles.helpCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
            <View style={styles.helpContent}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>
                How to get an invite code?
              </Text>
              <Text style={[styles.helpText, { color: colors.textMuted }]}>
                Ask a team owner or commander to generate an invite code for you. They can share it via any messaging app.
              </Text>
            </View>
          </View>
        </>
      ) : (
        // Step 2: Review and Accept
        <>
          <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.teamIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={32} color={colors.primary} />
            </View>
            
            <Text style={[styles.teamName, { color: colors.text }]}>
              {validatedInvite.team_name || 'Team'}
            </Text>
            
            <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(validatedInvite.role) + '20' }]}>
              <Ionicons 
                name={getRoleIcon(validatedInvite.role)} 
                size={18} 
                color={getRoleColor(validatedInvite.role)} 
              />
              <Text style={[styles.roleText, { color: getRoleColor(validatedInvite.role) }]}>
                You'll join as {getRoleLabel(validatedInvite.role)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                Expires {new Date(validatedInvite.expires_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Accept/Decline Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.declineButton, { borderColor: colors.border }]}
              onPress={handleDecline}
              disabled={isAccepting}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text} />
              <Text style={[styles.declineButtonText, { color: colors.text }]}>
                Decline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                { 
                  backgroundColor: isAccepting ? colors.secondary : colors.primary,
                  opacity: isAccepting ? 0.7 : 1,
                }
              ]}
              onPress={handleAccept}
              disabled={isAccepting}
              activeOpacity={0.8}
            >
              {isAccepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept & Join</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  headerSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Input Card
  inputCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Validate Button
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Help Card
  helpCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  helpContent: { flex: 1 },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Team Card
  teamCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  teamIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  teamName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  successTeam: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  successRole: {
    fontSize: 14,
    fontWeight: '600',
  },
});
