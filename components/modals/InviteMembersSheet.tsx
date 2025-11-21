import { useColors } from "@/hooks/ui/useColors";
import { useProfileContext } from "@/hooks/useProfileContext";
import { cancelOrgInvitation, createOrgInvitation, getPendingOrgInvitations, type OrgRole } from "@/services/orgInvitationService";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Clipboard from 'expo-clipboard';
import { forwardRef, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface InviteMembersSheetProps {
  onMemberInvited?: () => void;
}

interface RoleOption {
  value: OrgRole;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'member',
    label: 'Member',
    description: 'Can participate in sessions',
    icon: 'person',
    color: '#6B8FA3',
  },
  {
    value: 'instructor',
    label: 'Instructor',
    description: 'Can create trainings and manage sessions',
    icon: 'school',
    color: '#E76925',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage teams and invite members',
    icon: 'shield-half',
    color: '#5B7A8C',
  },
];

export const InviteMembersSheet = forwardRef<BaseBottomSheetRef, InviteMembersSheetProps>(
  ({ onMemberInvited }, ref) => {
    const colors = useColors();
    const { currentOrgId, isPersonalOrg, canManageMembers } = useProfileContext();
    
    const [selectedRole, setSelectedRole] = useState<OrgRole>('member');
    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

    // Load pending invitations
    const loadInvitations = useCallback(async () => {
      if (!currentOrgId || isPersonalOrg) return;
      
      setLoadingInvites(true);
      try {
        const invites = await getPendingOrgInvitations(currentOrgId);
        setPendingInvites(invites);
      } catch (error: any) {
        console.error('Failed to load invitations:', error);
      } finally {
        setLoadingInvites(false);
      }
    }, [currentOrgId, isPersonalOrg]);

    useEffect(() => {
      loadInvitations();
    }, [loadInvitations]);

    const handleCreateInvite = async () => {
      if (!currentOrgId) {
        Alert.alert("Error", "No organization selected");
        return;
      }

      if (!canManageMembers) {
        Alert.alert("Error", "You don't have permission to invite members");
        return;
      }

      setIsCreating(true);
      try {
        const invitation = await createOrgInvitation(
          currentOrgId,
          selectedRole,
          null, // team_id - simplified for now
          null, // team_role
          undefined // details
        );
        
        // Copy to clipboard
        await Clipboard.setStringAsync(invitation.invite_code);
        
        // Reload invitations
        await loadInvitations();
        
        // Callback
        onMemberInvited?.();
        
        Alert.alert(
          "Invitation Created!",
          `Code ${invitation.invite_code} copied to clipboard.\n\nShare this code with the person you want to invite.`,
          [{ text: "OK" }]
        );
      } catch (error: any) {
        console.error("Failed to create invitation:", error);
        Alert.alert("Error", error.message || "Failed to create invitation");
      } finally {
        setIsCreating(false);
      }
    };

    const handleCancelInvite = async (inviteId: string) => {
      try {
        await cancelOrgInvitation(inviteId);
        await loadInvitations();
        Alert.alert("Success", "Invitation cancelled");
      } catch (error: any) {
        console.error("Failed to cancel invitation:", error);
        Alert.alert("Error", "Failed to cancel invitation");
      }
    };

    const handleCopyCode = async (code: string) => {
      await Clipboard.setStringAsync(code);
      Alert.alert("Copied!", `Code ${code} copied to clipboard`);
    };

    // Don't show for personal orgs
    if (isPersonalOrg) {
      return null;
    }

    return (
      <BaseBottomSheet ref={ref} snapPoints={['85%']}>
        <BottomSheetScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="person-add" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Invite Members</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Create an invite code to add members to your organization
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Role</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: selectedRole === option.value ? option.color : colors.border,
                      borderWidth: selectedRole === option.value ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedRole(option.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.roleIconContainer,
                      { backgroundColor: `${option.color}20` },
                    ]}
                  >
                    <Ionicons name={option.icon} size={24} color={option.color} />
                  </View>
                  <Text style={[styles.roleLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.roleDescription, { color: colors.textMuted }]}>
                    {option.description}
                  </Text>
                  {selectedRole === option.value && (
                    <View style={[styles.selectedBadge, { backgroundColor: option.color }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Create Button */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: colors.primary },
                isCreating && styles.createButtonDisabled,
              ]}
              onPress={handleCreateInvite}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>
                {isCreating ? "Creating..." : "Create Invite Code"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending Invitations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Pending Invitations
              </Text>
              {loadingInvites && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            
            {pendingInvites.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="mail-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No pending invitations
                </Text>
              </View>
            ) : (
              pendingInvites.map((invite) => (
                <View
                  key={invite.id}
                  style={[styles.inviteCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <View style={styles.inviteHeader}>
                    <View
                      style={[
                        styles.inviteIconContainer,
                        { backgroundColor: `${colors.primary}20` },
                      ]}
                    >
                      <Ionicons name="ticket" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.inviteDetails}>
                      <TouchableOpacity onPress={() => handleCopyCode(invite.invite_code)}>
                        <Text style={[styles.inviteCode, { color: colors.primary }]}>
                          {invite.invite_code}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.inviteRole, { color: colors.textMuted }]}>
                        Role: {invite.role}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: `${colors.destructive}20` }]}
                      onPress={() => handleCancelInvite(invite.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.inviteFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.inviteExpiry, { color: colors.textMuted }]}>
                      Expires: {new Date(invite.expires_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

InviteMembersSheet.displayName = 'InviteMembersSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  roleGrid: {
    gap: 12,
  },
  roleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  inviteCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inviteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteDetails: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  inviteRole: {
    fontSize: 13,
    textTransform: "capitalize",
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inviteExpiry: {
    fontSize: 12,
  },
});
