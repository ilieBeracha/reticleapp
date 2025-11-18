import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createInvitation, getPendingInvitations, cancelInvitation } from "@/services/invitationService";
import type { WorkspaceInvitationWithDetails, WorkspaceRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { forwardRef, useState, useCallback, useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import * as Clipboard from 'expo-clipboard';
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface InviteMembersSheetProps {
  onMemberInvited?: () => void;
}

interface RoleOption {
  value: WorkspaceRole;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'member',
    label: 'Member',
    description: 'Can participate in sessions and view team activities',
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
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full access to workspace settings',
    icon: 'shield-checkmark',
    color: '#FF6B35',
  },
];

export const InviteMembersSheet = forwardRef<BaseBottomSheetRef, InviteMembersSheetProps>(
  ({ onMemberInvited }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, activeWorkspace } = useAppContext();
    
    const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('member');
    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Load pending invitations
    const loadInvitations = useCallback(async () => {
      if (!activeWorkspaceId || activeWorkspace?.workspace_type !== 'org') return;
      
      setLoadingInvites(true);
      try {
        const invites = await getPendingInvitations(activeWorkspaceId);
        setPendingInvites(invites);
      } catch (error: any) {
        console.error('Failed to load invitations:', error);
      } finally {
        setLoadingInvites(false);
      }
    }, [activeWorkspaceId, activeWorkspace]);

    // Load invitations when sheet opens
    useEffect(() => {
      loadInvitations();
    }, [loadInvitations]);

    const handleCreateInvite = async () => {
      if (!activeWorkspaceId) {
        Alert.alert("Error", "No active workspace");
        return;
      }

      setIsCreating(true);
      try {
        const invitation = await createInvitation(activeWorkspaceId, selectedRole);
        setGeneratedCode(invitation.invite_code);
        
        // Copy to clipboard automatically
        await Clipboard.setStringAsync(invitation.invite_code);
        Alert.alert(
          "Invite Created!",
          `Code ${invitation.invite_code} has been copied to your clipboard.\n\nShare it with the person you want to invite. It expires in 7 days.`
        );
        
        // Reload invitations list
        await loadInvitations();
        onMemberInvited?.();
      } catch (error: any) {
        console.error("Failed to create invitation:", error);
        Alert.alert("Error", error.message || "Failed to create invitation");
      } finally {
        setIsCreating(false);
      }
    };

    const handleCopyCode = async (code: string) => {
      await Clipboard.setStringAsync(code);
      Alert.alert("Copied!", `Invite code ${code} copied to clipboard`);
    };

    const handleCancelInvite = async (inviteId: string, code: string) => {
      Alert.alert(
        "Cancel Invitation",
        `Are you sure you want to cancel invite code ${code}? This cannot be undone.`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              try {
                await cancelInvitation(inviteId);
                Alert.alert("Success", "Invitation cancelled");
                await loadInvitations();
              } catch (error: any) {
                Alert.alert("Error", error.message || "Failed to cancel invitation");
              }
            },
          },
        ]
      );
    };

    const getRoleColor = (role: WorkspaceRole) => {
      return ROLE_OPTIONS.find(r => r.value === role)?.color || '#6B8FA3';
    };

    const getTimeRemaining = (expiresAt: string) => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return 'Soon';
      }
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['85%']} backdropOpacity={0.7}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="person-add" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Invite Members
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Generate an invite code to share
            </Text>
          </View>

          {/* Create New Invitation Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Create New Invite</Text>
            
            {/* Role Selection */}
            <Text style={[styles.label, { color: colors.text }]}>Select Role</Text>
            <View style={styles.rolesGrid}>
              {ROLE_OPTIONS.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: selectedRole === role.value ? role.color : colors.border,
                      borderWidth: selectedRole === role.value ? 2 : 1,
                    }
                  ]}
                  onPress={() => setSelectedRole(role.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.roleIcon,
                    { backgroundColor: role.color + '20' }
                  ]}>
                    <Ionicons name={role.icon} size={20} color={role.color} />
                  </View>
                  <Text style={[styles.roleLabel, { color: colors.text }]}>{role.label}</Text>
                  <Text style={[styles.roleDescription, { color: colors.textMuted }]} numberOfLines={2}>
                    {role.description}
                  </Text>
                  {selectedRole === role.value && (
                    <View style={[styles.checkmark, { backgroundColor: role.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                { 
                  backgroundColor: isCreating ? colors.secondary : colors.primary,
                  opacity: isCreating ? 0.7 : 1,
                }
              ]}
              onPress={handleCreateInvite}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Invite Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pending Invitations Section */}
          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Pending Invites
              </Text>
              {pendingInvites.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {pendingInvites.length}
                  </Text>
                </View>
              )}
            </View>

            {loadingInvites ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Loading invitations...
                </Text>
              </View>
            ) : pendingInvites.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.secondary }]}>
                <Ionicons name="mail-open-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No pending invites
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Create an invite code to get started
                </Text>
              </View>
            ) : (
              <View style={styles.invitesList}>
                {pendingInvites.map((invite) => (
                  <View
                    key={invite.id}
                    style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.inviteHeader}>
                      <TouchableOpacity
                        style={[styles.codeButton, { backgroundColor: getRoleColor(invite.role) + '15' }]}
                        onPress={() => handleCopyCode(invite.invite_code)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.codeText, { color: getRoleColor(invite.role) }]}>
                          {invite.invite_code}
                        </Text>
                        <Ionicons name="copy-outline" size={16} color={getRoleColor(invite.role)} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelInvite(invite.id, invite.invite_code)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={22} color={colors.red} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inviteDetails}>
                      <View style={styles.inviteDetailRow}>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(invite.role) + '20' }]}>
                          <Text style={[styles.roleBadgeText, { color: getRoleColor(invite.role) }]}>
                            {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                          </Text>
                        </View>
                        
                        <View style={styles.expiryInfo}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                            Expires in {getTimeRemaining(invite.expires_at)}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.inviteDate, { color: colors.textMuted }]}>
                        Created {new Date(invite.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Invite codes expire after 7 days. Share them via any messaging app.
            </Text>
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

InviteMembersSheet.displayName = 'InviteMembersSheet';

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

  // Section
  section: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  // Roles Grid
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    position: 'relative',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  roleDescription: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    letterSpacing: -0.1,
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Generate Button
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Pending Section
  pendingSection: {
    marginBottom: 20,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Invites List
  invitesList: {
    gap: 12,
  },
  inviteCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    flex: 1,
  },
  cancelButton: {
    padding: 4,
  },
  inviteDetails: {
    gap: 8,
  },
  inviteDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  inviteDate: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
});

