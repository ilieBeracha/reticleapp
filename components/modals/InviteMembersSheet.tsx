import { useProfile } from "@/contexts/ProfileContext";
import { useColors } from "@/hooks/ui/useColors";
import { cancelOrgInvitation, createOrgInvitation, getOrgInvitations, type OrgInvitation } from "@/services/invitationService";
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
  value: 'member' | 'instructor' | 'admin';
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
    const { currentOrg, isPersonalOrg, canManageMembers } = useProfile();

    const [selectedRole, setSelectedRole] = useState<'member' | 'instructor' | 'admin'>('member');
    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<OrgInvitation[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [lastLoadedOrgId, setLastLoadedOrgId] = useState<string | null>(null);

    // Load pending invitations
    const loadInvitations = useCallback(async () => {
      console.log('📋 InviteMembersSheet loadInvitations called:', {
        currentOrgId: currentOrg?.id,
        orgName: currentOrg?.name,
        orgType: currentOrg?.org_type,
        isPersonalOrg,
        canManageMembers,
        lastLoadedOrgId,
        isLoading: loadingInvites,
      });
      
      if (!currentOrg?.id) {
        console.log('❌ No currentOrg.id, skipping invitation load');
        return;
      }
      
      if (isPersonalOrg) {
        console.log('❌ Personal org detected, skipping invitation load');
        return;
      }
      
      // Prevent duplicate calls for the same org
      if (currentOrg.id === lastLoadedOrgId) {
        console.log('⏭️ Already loaded invitations for this org, skipping');
        return;
      }
      
      // Prevent multiple simultaneous calls
      if (loadingInvites) {
        console.log('⏳ Already loading invitations, skipping duplicate call');
        return;
      }
      
      setLoadingInvites(true);
      try {
        console.log('🔍 Loading invitations for org:', currentOrg.id);
        const invites = await getOrgInvitations(currentOrg.id);
        setPendingInvites(invites);
        setLastLoadedOrgId(currentOrg.id);
        console.log('✅ Successfully loaded invitations:', invites.length);
      } catch (error: any) {
        console.error('❌ Failed to load invitations:', error);
        // Only show alert for non-permission errors to avoid spam
        if (!error.message.includes('Access denied')) {
          Alert.alert('Error', 'Failed to load invitations: ' + error.message);
        }
      } finally {
        setLoadingInvites(false);
      }
    }, [currentOrg?.id, isPersonalOrg, canManageMembers, lastLoadedOrgId, loadingInvites]);

    // Clear last loaded org ID when org changes
    useEffect(() => {
      if (currentOrg?.id && currentOrg.id !== lastLoadedOrgId) {
        setLastLoadedOrgId(null);
        setPendingInvites([]); // Clear old invites
      }
    }, [currentOrg?.id, lastLoadedOrgId]);

    useEffect(() => {
      // Add a small delay to ensure profile context is fully loaded
      const timer = setTimeout(() => {
        if (currentOrg?.id && !isPersonalOrg && canManageMembers) {
          loadInvitations();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }, [currentOrg?.id, isPersonalOrg, canManageMembers, loadInvitations]);

    const handleCreateInvite = async () => {
      if (!currentOrg?.id) {
        Alert.alert("Error", "No organization selected");
        return;
      }

      if (!canManageMembers) {
        Alert.alert("Error", "You don't have permission to invite members");
        return;
      }

      setIsCreating(true);
      try {
        const invitation = await createOrgInvitation({
          orgId: currentOrg.id,
          role: selectedRole,
          // For now, we're not assigning to teams directly in invites
          // Users can be assigned to teams after they join
        });
        
        // Copy to clipboard
        await Clipboard.setStringAsync(invitation.invite_code);
        
        // Show success message
        Alert.alert(
          "Invitation Created!",
          `Invite code ${invitation.invite_code} has been copied to your clipboard.`,
          [{ text: "OK" }]
        );
        
        // Reload invitations by resetting the cache first
        setLastLoadedOrgId(null);
        await loadInvitations();
        
        // Callback
        onMemberInvited?.();
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
        // Reset cache and reload invitations
        setLastLoadedOrgId(null);
        await loadInvitations();
        Alert.alert("Success", "Invitation cancelled");
      } catch (error: any) {
        console.error("Failed to cancel invitation:", error);
        Alert.alert("Error", error.message || "Failed to cancel invitation");
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
