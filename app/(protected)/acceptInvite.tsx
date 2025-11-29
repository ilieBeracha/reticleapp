import { useColors } from "@/hooks/ui/useColors";
import { acceptInvitation, validateInviteCode } from "@/services/invitationService";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { WorkspaceInvitationWithDetails } from "@/types/workspace";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * ACCEPT INVITE SHEET - Native Form Sheet
 * 
 * Migrated from ref-based @gorhom/bottom-sheet to native iOS formSheet.
 * Benefits:
 * - Native gesture handling
 * - Better keyboard behavior
 * - Simpler code (no refs, no imperative API)
 * - Route-based navigation
 */
export default function AcceptInviteSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [inviteCode, setInviteCode] = useState("");
  const [validatedInvite, setValidatedInvite] = useState<WorkspaceInvitationWithDetails | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
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
      const invite = await validateInviteCode(code);
      if (invite) {
        setValidatedInvite(invite);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError("Invalid invite code");
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
      await acceptInvitation(validatedInvite.invite_code);
      
      // Reload workspaces to include the new one
      await useWorkspaceStore.getState().loadWorkspaces();
      
      // Show success state immediately
      setIsAccepted(true);
      setIsAccepting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "Welcome!",
        `You've successfully joined ${validatedInvite.workspace_name || 'the workspace'}!`,
        [
          {
            text: "Open Workspace",
            onPress: () => {
              // Set active workspace and navigate
              useWorkspaceStore.getState().setIsSwitching(true);
              useWorkspaceStore.getState().setActiveWorkspace(validatedInvite.org_workspace_id);
              setTimeout(() => {
                router.replace('/(protected)/org');
                setTimeout(() => {
                  useWorkspaceStore.getState().setIsSwitching(false);
                }, 300);
              }, 200);
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
      Alert.alert("Error", error.message || "Failed to join workspace");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAccepting(false);
    }
  }, [validatedInvite]);

  const handleDecline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Decline Invitation",
      "Are you sure you don't want to join this workspace?",
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

  const getRoleColor = (role: string) => {
    const roleColors = {
      owner: '#5B6B8C',
      admin: '#5B7A8C',
      instructor: '#7C3AED',
      member: '#6B8FA3',
    };
    return roleColors[role as keyof typeof roleColors] || '#6B8FA3';
  };

  const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
    const icons = {
      owner: 'shield-checkmark',
      admin: 'shield-half',
      instructor: 'school',
      member: 'person',
    };
    return (icons[role as keyof typeof icons] || 'person') as keyof typeof Ionicons.glyphMap;
  };

  // Success state - show while Alert is visible
  if (isAccepted && validatedInvite) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Welcome!</Text>
        <Text style={[styles.successWorkspace, { color: colors.text }]}>
          {validatedInvite.workspace_name}
        </Text>
        <View style={[styles.successBadge, { backgroundColor: getRoleColor(validatedInvite.role) + '20' }]}>
          <Ionicons name={getRoleIcon(validatedInvite.role)} size={16} color={getRoleColor(validatedInvite.role)} />
          <Text style={[styles.successRole, { color: getRoleColor(validatedInvite.role) }]}>
            Joined as {validatedInvite.role.charAt(0).toUpperCase() + validatedInvite.role.slice(1)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      {/* Native grabber takes ~20pt, add spacing */}
      <View style={styles.grabberSpacer} />
      
      {/* Fixed Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="enter" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Join Workspace</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {validatedInvite ? 'Review invitation' : 'Enter invite code'}
            </Text>
          </View>
        </View>
        
        {validatedInvite && (
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.secondary }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
                  Ask a workspace owner or admin to generate an invite code for you. They can share it via any messaging app.
                </Text>
              </View>
            </View>
          </>
        ) : (
          // Step 2: Review and Accept
          <>
            <View style={[styles.workspaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.workspaceIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="business" size={32} color={colors.primary} />
              </View>
              
              <Text style={[styles.workspaceName, { color: colors.text }]}>
                {validatedInvite.workspace_name || 'Workspace'}
              </Text>
              
              <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(validatedInvite.role) + '20' }]}>
                <Ionicons 
                  name={getRoleIcon(validatedInvite.role)} 
                  size={18} 
                  color={getRoleColor(validatedInvite.role)} 
                />
                <Text style={[styles.roleText, { color: getRoleColor(validatedInvite.role) }]}>
                  You'll join as {validatedInvite.role.charAt(0).toUpperCase() + validatedInvite.role.slice(1)}
                </Text>
              </View>

              {validatedInvite.invited_by_name && (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    Invited by {validatedInvite.invited_by_name}
                  </Text>
                </View>
              )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  
  grabberSpacer: {
    height: 12,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 1,
  },
  resetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    letterSpacing: -0.2,
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
    letterSpacing: -0.1,
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
    letterSpacing: -0.2,
  },

  // Help Card
  helpCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: -0.1,
  },

  // Workspace Card
  workspaceCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  workspaceIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  workspaceName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
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
    letterSpacing: -0.1,
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
    letterSpacing: -0.1,
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
    letterSpacing: -0.2,
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
    letterSpacing: -0.2,
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
  successWorkspace: {
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

