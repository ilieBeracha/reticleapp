import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/ui/useColors";
import { acceptOrgInvitation, validateInviteCode } from "@/services/invitationService";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { forwardRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface ValidatedInvite {
  valid: boolean;
  orgName?: string;
  role?: string;
  expiresAt?: string;
}

interface AcceptInviteSheetProps {
  onInviteAccepted?: () => void;
}

export const AcceptInviteSheet = forwardRef<BaseBottomSheetRef, AcceptInviteSheetProps>(
  ({ onInviteAccepted }, ref) => {
    const colors = useColors();
    const { reloadProfiles } = useProfile();
    
    const [inviteCode, setInviteCode] = useState("");
    const [validatedInvite, setValidatedInvite] = useState<ValidatedInvite | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
      setInviteCode("");
      setValidatedInvite(null);
      setError(null);
      setIsValidating(false);
      setIsAccepting(false);
    };

    const handleValidate = async () => {
      if (!inviteCode.trim()) {
        setError("Please enter an invite code");
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validateInviteCode(inviteCode.trim());
        
        if (result.valid) {
          setValidatedInvite(result);
        } else {
          setError("Invalid or expired invite code");
        }
      } catch (error: any) {
        console.error("Validation error:", error);
        setError("Failed to validate invite code");
      } finally {
        setIsValidating(false);
      }
    };

    const handleAccept = async () => {
      if (!inviteCode.trim()) return;

      setIsAccepting(true);
      
      try {
        await acceptOrgInvitation(inviteCode.trim());
        
        // Reload profiles to get the new organization
        await reloadProfiles();
        
        Alert.alert(
          "Success!",
          `Welcome to ${validatedInvite?.orgName || 'the organization'}!`,
          [
            {
              text: "OK",
              onPress: () => {
                resetForm();
                onInviteAccepted?.();
                (ref as any)?.current?.close();
              }
            }
          ]
        );
      } catch (error: any) {
        console.error("Accept error:", error);
        Alert.alert("Error", error.message || "Failed to accept invitation");
      } finally {
        setIsAccepting(false);
      }
    };

    const handleDecline = () => {
      Alert.alert(
        "Decline Invitation",
        "Are you sure you don't want to join this organization?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Decline",
            style: "destructive",
            onPress: () => {
              resetForm();
            },
          },
        ]
      );
    };

    const getRoleColor = (role: string) => {
      const colors = {
        owner: '#FF6B35',
        admin: '#5B7A8C',
        instructor: '#E76925',
        member: '#6B8FA3',
      };
      return colors[role as keyof typeof colors] || '#6B8FA3';
    };

    const getRoleIcon = (role: string) => {
      const icons = {
        owner: 'shield-checkmark',
        admin: 'shield-half',
        instructor: 'school',
        member: 'person',
      };
      return icons[role as keyof typeof icons] || 'person';
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['70%']}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="enter" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Join Organization
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Enter the invite code you received
            </Text>
          </View>

          {!validatedInvite ? (
            // Step 1: Enter and Validate Code
            <>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  <Ionicons name="key-outline" size={14} color={colors.text} /> Invite Code
                </Text>
                <View style={[styles.inputWrapper, { borderColor: error ? colors.red : colors.border, backgroundColor: colors.card }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="e.g. ABC123XY"
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={inviteCode}
                    onChangeText={(text) => {
                      setInviteCode(text.toUpperCase());
                      setError(null);
                    }}
                    autoCapitalize="characters"
                    maxLength={8}
                    returnKeyType="go"
                  />
                </View>
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color={colors.red} />
                    <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
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
                disabled={isValidating || !inviteCode.trim()}
                onPress={handleValidate}
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
                    Ask an organization owner or admin to generate an invite code for you. They can share it via any messaging app.
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
                  {validatedInvite.orgName || 'Organization'}
                </Text>
                
                <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(validatedInvite.role!) + '20' }]}>
                  <Ionicons 
                    name={getRoleIcon(validatedInvite.role!) as any} 
                    size={18} 
                    color={getRoleColor(validatedInvite.role!)} 
                  />
                  <Text style={[styles.roleText, { color: getRoleColor(validatedInvite.role!) }]}>
                    You'll join as {validatedInvite.role!.charAt(0).toUpperCase() + validatedInvite.role!.slice(1)}
                  </Text>
                </View>

                {validatedInvite.expiresAt && (
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                      Expires {new Date(validatedInvite.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
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
                  disabled={isAccepting}
                  onPress={handleAccept}
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
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

AcceptInviteSheet.displayName = 'AcceptInviteSheet';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.2,
  },

  // Input
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    borderRadius: 12,
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
    marginTop: 8,
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
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 24,
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
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  workspaceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  workspaceName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  invitedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  invitedByText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryText: {
    fontSize: 12,
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
    paddingVertical: 16,
    borderRadius: 14,
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
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

