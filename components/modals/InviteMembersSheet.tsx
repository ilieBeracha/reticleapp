import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { cancelInvitation, createInvitation, getPendingInvitations } from "@/services/invitationService";
import type { TeamMemberShip, WorkspaceInvitationWithDetails, WorkspaceRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Clipboard from 'expo-clipboard';
import { forwardRef, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

const TEAM_ROLE_OPTIONS: TeamMemberShip[] = ['commander', 'squad_commander', 'soldier'];

export const InviteMembersSheet = forwardRef<BaseBottomSheetRef, InviteMembersSheetProps>(
  ({ onMemberInvited }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, activeWorkspace } = useAppContext();
    const { teams } = useWorkspaceData();
    
    const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('member');
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [selectedTeamRole, setSelectedTeamRole] = useState<TeamMemberShip>('soldier');
    const [selectedSquadName, setSelectedSquadName] = useState<string>('');

    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

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

    // Reset team selection if role changes from member
    useEffect(() => {
      if (selectedRole !== 'member') {
        setSelectedTeamId(null);
      }
    }, [selectedRole]);

    const handleCreateInvite = async () => {
      if (!activeWorkspaceId) {
        Alert.alert("Error", "No active workspace");
        return;
      }

      // Validate squad name for soldiers and squad commanders
      if (selectedTeamId && (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander')) {
        if (!selectedSquadName.trim()) {
          Alert.alert(
            "Squad Required",
            selectedTeamRole === 'soldier' 
              ? "Soldiers must be assigned to a squad. Please enter a squad name."
              : "Squad commanders must be assigned to a squad to command. Please enter a squad name."
          );
          return;
        }
      }

      setIsCreating(true);
      try {
        // Pass team info if selected
        const invitation = await createInvitation(
          activeWorkspaceId, 
          selectedRole, 
          selectedTeamId, 
          selectedTeamId ? selectedTeamRole : null,
          selectedTeamId && selectedSquadName ? { squad_id: selectedSquadName } : undefined
        );
        
        // Copy to clipboard automatically
        await Clipboard.setStringAsync(invitation.invite_code);
        Alert.alert(
          "Invite Created!",
          `Code ${invitation.invite_code} has been copied to your clipboard.\n\nShare it with the person you want to invite.`
        );
        
        // Reload invitations list
        await loadInvitations();
        onMemberInvited?.();
        
        // Reset selection
        setSelectedTeamId(null);
        setSelectedSquadName('');
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
        "Revoke Invitation",
        `Are you sure you want to revoke code ${code}?`,
        [
          { text: "Keep", style: "cancel" },
          {
            text: "Revoke",
            style: "destructive",
            onPress: async () => {
              try {
                await cancelInvitation(inviteId);
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
      
      if (days > 0) return `${days}d left`;
      if (hours > 0) return `${hours}h left`;
      return 'Expiring soon';
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['92%']} backdropOpacity={0.5}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Invite Member
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Create a temporary code to join {activeWorkspace?.workspace_name}
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ORG ROLE</Text>
            <View style={styles.rolesGrid}>
              {ROLE_OPTIONS.map((role) => {
                const isSelected = selectedRole === role.value;
                return (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? role.color : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                      }
                    ]}
                    onPress={() => setSelectedRole(role.value)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.roleCardHeader}>
                       <View style={[
                        styles.roleIconContainer,
                        { backgroundColor: isSelected ? role.color + '20' : colors.secondary }
                      ]}>
                        <Ionicons name={role.icon} size={18} color={isSelected ? role.color : colors.textMuted} />
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={role.color} />
                      )}
                    </View>
                    
                    <Text style={[
                      styles.roleLabel, 
                      { color: colors.text }
                    ]}>
                      {role.label}
                    </Text>
                    <Text style={[styles.roleDescription, { color: colors.textMuted }]}>
                      {role.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Team Selection (Optional) */}
          {teams.length > 0 && selectedRole === 'member' && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ASSIGN TO TEAM (OPTIONAL)</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 8 }}>
                <TouchableOpacity
                  key="no-team"
                  style={[
                    styles.teamChip,
                    { 
                      backgroundColor: selectedTeamId === null ? colors.primary : colors.card,
                      borderColor: selectedTeamId === null ? 'transparent' : colors.border,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => setSelectedTeamId(null)}
                >
                  <Text style={[styles.teamChipText, { color: selectedTeamId === null ? colors.primaryForeground : colors.text }]}>
                    No Team
                  </Text>
                </TouchableOpacity>
                
                {teams.map(team => (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamChip,
                      { 
                        backgroundColor: selectedTeamId === team.id ? colors.primary : colors.card,
                        borderColor: selectedTeamId === team.id ? 'transparent' : colors.border,
                        borderWidth: 1,
                      }
                    ]}
                    onPress={() => setSelectedTeamId(team.id)}
                  >
                    <Text style={[styles.teamChipText, { color: selectedTeamId === team.id ? colors.primaryForeground : colors.text }]}>
                      {team.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Team Role Selection (only if team selected) */}
              {selectedTeamId && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted, fontSize: 11 }]}>
                    TEAM ROLE & SQUAD
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {TEAM_ROLE_OPTIONS.map((role) => (
                       <TouchableOpacity
                          key={role}
                          style={[
                            styles.teamRoleChip, 
                            { 
                              backgroundColor: selectedTeamRole === role ? colors.primary + '20' : colors.card,
                              borderWidth: 1,
                              borderColor: selectedTeamRole === role ? colors.primary : colors.border
                            }
                          ]}
                          onPress={() => setSelectedTeamRole(role)}
                       >
                         <Text style={{ 
                           fontSize: 13,
                           fontWeight: '600',
                           color: selectedTeamRole === role ? colors.primary : colors.text
                         }}>
                           {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                         </Text>
                       </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Squad Name Input - Only for soldiers and squad commanders */}
                  {(selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander') && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                        {selectedTeamRole === 'soldier' ? 'SQUAD NAME (REQUIRED FOR SOLDIER)' : 'SQUAD TO COMMAND (REQUIRED)'}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { 
                            backgroundColor: colors.card, 
                            color: colors.text,
                            borderColor: colors.border
                          }
                        ]}
                        placeholder={selectedTeamRole === 'soldier' ? "e.g. Alpha, Bravo, Squad 1" : "Which squad will you command?"}
                        placeholderTextColor={colors.textMuted}
                        value={selectedSquadName}
                        onChangeText={setSelectedSquadName}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Generate Action */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                { 
                  backgroundColor: isCreating ? colors.muted : colors.primary,
                }
              ]}
              onPress={handleCreateInvite}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <>
                  <Text style={[styles.generateButtonText, { color: colors.primaryForeground }]}>
                    Generate Invite Code
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pending Invitations */}
          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                PENDING INVITES ({pendingInvites.length})
              </Text>
            </View>

            {loadingInvites ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : pendingInvites.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.secondary + '50' }]}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  No active invite codes
                </Text>
              </View>
            ) : (
              <View style={styles.invitesList}>
                {pendingInvites.map((invite) => (
                  <View
                    key={invite.id}
                    style={[
                      styles.inviteRow, 
                      { 
                        backgroundColor: colors.card,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 1,
                      }
                    ]}
                  >
                    <View style={styles.inviteInfo}>
                      <View style={styles.inviteMain}>
                        <View style={[
                          styles.codeContainer,
                          { backgroundColor: getRoleColor(invite.role) + '15' }
                        ]}>
                          <Text style={[styles.codeText, { color: getRoleColor(invite.role) }]}>
                            {invite.invite_code}
                          </Text>
                        </View>
                        <View style={styles.inviteMeta}>
                          <Text style={[styles.roleMetaText, { color: colors.text }]}>
                            {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                            {invite.team_name && (
                              <Text style={{ color: colors.textMuted }}> • {invite.team_name} ({invite.team_role})</Text>
                            )}
                          </Text>
                          <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                             • {getTimeRemaining(invite.expires_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                        onPress={() => handleCopyCode(invite.invite_code)}
                      >
                        <Ionicons name="copy-outline" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.destructive + '15' }]}
                        onPress={() => handleCancelInvite(invite.id, invite.invite_code)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={{ height: 20 }} />
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 0,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  roleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  teamChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  teamChipText: {
    fontWeight: '600',
    fontSize: 14,
  },
  teamRoleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContainer: {
    marginBottom: 32,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  invitesList: {
    gap: 12,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    justifyContent: 'space-between',
  },
  inviteInfo: {
    flex: 1,
    marginRight: 12,
  },
  inviteMain: {
    gap: 6,
  },
  codeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceMono', // Using the mono font for the code if available
    letterSpacing: 1,
  },
  inviteMeta: {
    flexDirection: 'column', // Stacked meta info
    alignItems: 'flex-start',
  },
  roleMetaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  expiryText: {
    fontSize: 12,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});