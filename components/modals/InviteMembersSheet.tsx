import { useOrgRole } from "@/contexts/OrgRoleContext";
import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { cancelInvitation, createInvitation, getPendingInvitations } from "@/services/invitationService";
import type { TeamMemberShip, WorkspaceInvitationWithDetails, WorkspaceRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Clipboard from 'expo-clipboard';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Org-level roles (for non-team invites)
const ORG_ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'instructor',
    label: 'Instructor',
    description: 'Create trainings and manage sessions',
    icon: 'school',
    color: '#7C3AED',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage teams and invite members',
    icon: 'shield-half',
    color: '#5B7A8C',
  },
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full workspace access',
    icon: 'shield-checkmark',
    color: '#5B6B8C',
  },
];

const TEAM_ROLE_OPTIONS: TeamMemberShip[] = ['commander', 'squad_commander', 'soldier'];

export const InviteMembersSheet = forwardRef<BaseBottomSheetRef, InviteMembersSheetProps>(
  ({ onMemberInvited }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, activeWorkspace } = useAppContext();
    const { teams } = useWorkspaceData();
    const { orgRole, isCommander, teamInfo, allTeams } = useOrgRole();
    
    // Permission checks
    const isAdminOrOwner = orgRole === 'owner' || orgRole === 'admin';
    
    // Team commanders can only invite to their team
    const availableTeams = useMemo(() => {
      if (isAdminOrOwner) {
        return teams; // Admin/Owner can invite to any team
      }
      if (isCommander && allTeams.length > 0) {
        // Team commander can only see their teams
        return teams.filter(t => allTeams.some(ut => ut.teamId === t.id && ut.teamRole === 'commander'));
      }
      return []; // Others can't invite
    }, [teams, isAdminOrOwner, isCommander, allTeams]);
    
    // Team commanders can only invite squad_commander or soldier (not commander)
    const availableTeamRoles = useMemo((): TeamMemberShip[] => {
      if (isAdminOrOwner) {
        return ['commander', 'squad_commander', 'soldier']; // Full access
      }
      if (isCommander) {
        return ['squad_commander', 'soldier']; // Can't invite other commanders
      }
      return [];
    }, [isAdminOrOwner, isCommander]);
    
    // Team commanders can't create org-level invites
    const canCreateOrgInvites = isAdminOrOwner;
    
    // Invite type: 'team' or 'org' - team commanders default to team
    const [inviteType, setInviteType] = useState<'team' | 'org'>(
      availableTeams.length > 0 ? 'team' : (canCreateOrgInvites ? 'org' : 'team')
    );
    
    // Team invite states - default to commander's team if they're a commander
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
      isCommander && teamInfo ? teamInfo.teamId : (availableTeams.length > 0 ? availableTeams[0]?.id : null)
    );
    const [selectedTeamRole, setSelectedTeamRole] = useState<TeamMemberShip>(
      availableTeamRoles.includes('soldier') ? 'soldier' : availableTeamRoles[0] || 'soldier'
    );
    const [selectedSquadName, setSelectedSquadName] = useState<string>('');
    
    // Org invite states
    const [selectedOrgRole, setSelectedOrgRole] = useState<WorkspaceRole>('instructor');
    
    // Ensure team commanders stay on 'team' mode
    useEffect(() => {
      if (isCommander && !isAdminOrOwner) {
        setInviteType('team');
      }
    }, [isCommander, isAdminOrOwner]);

    // Update selected team when available teams change
    useEffect(() => {
      if (isCommander && teamInfo) {
        setSelectedTeamId(teamInfo.teamId);
      } else if (availableTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(availableTeams[0].id);
      }
    }, [availableTeams, isCommander, teamInfo, selectedTeamId]);

    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

    // Load pending invitations
    const loadInvitations = useCallback(async () => {
      if (!activeWorkspaceId) return;
      
      setLoadingInvites(true);
      try { 
        const invites = await getPendingInvitations(activeWorkspaceId);
        setPendingInvites(invites);
      } catch (error) {
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

      // Validate based on invite type
      if (inviteType === 'team') {
        if (!selectedTeamId) {
          Alert.alert("Team Required", "Please select a team to invite to.");
          return;
        }
        
        // Validate squad name for soldiers and squad commanders
        if (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander') {
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
      }

      setIsCreating(true);
      try {
        // Determine role and team info based on invite type
        const role = inviteType === 'team' ? 'member' : selectedOrgRole;
        const teamId = inviteType === 'team' ? selectedTeamId : null;
        const teamRole = inviteType === 'team' ? selectedTeamRole : null;
        const metadata = inviteType === 'team' && selectedSquadName ? { squad_id: selectedSquadName } : undefined;
        
        const invitation = await createInvitation(
          activeWorkspaceId, 
          role, 
          teamId, 
          teamRole,
          metadata
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
        
        // Reset selections
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
      if (role === 'member') return '#6B8FA3';
      return ORG_ROLE_OPTIONS.find(r => r.value === role)?.color || '#6B8FA3';
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
              Create a code to join {activeWorkspace?.workspace_name}
            </Text>
          </View>

          {/* Role-based Permission Banner */}
          {isCommander && !isAdminOrOwner && (
            <View style={[styles.permissionBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.permissionTitle, { color: '#F59E0B' }]}>
                  Team Commander Access
                </Text>
                <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>
                  You can invite squad commanders and soldiers to your team
                </Text>
              </View>
            </View>
          )}

          {/* Invite Type Selector - Only show both options for admins/owners */}
          {canCreateOrgInvites && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>INVITE TO</Text>
              <View style={styles.inviteTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.inviteTypeButton,
                    {
                      backgroundColor: inviteType === 'team' ? colors.primary : colors.card,
                      borderColor: inviteType === 'team' ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setInviteType('team')}
                  disabled={availableTeams.length === 0}
                >
                  <Ionicons 
                    name="people" 
                    size={22} 
                    color={inviteType === 'team' ? colors.primaryForeground : colors.text} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.inviteTypeLabel,
                      { color: inviteType === 'team' ? colors.primaryForeground : colors.text }
                    ]}>
                      Team
                    </Text>
                    <Text style={[
                      styles.inviteTypeDesc,
                      { color: inviteType === 'team' ? colors.primaryForeground + 'CC' : colors.textMuted }
                    ]}>
                      Member with team role
                    </Text>
                  </View>
                  {inviteType === 'team' && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primaryForeground} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inviteTypeButton,
                    {
                      backgroundColor: inviteType === 'org' ? colors.primary : colors.card,
                      borderColor: inviteType === 'org' ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setInviteType('org')}
                >
                  <Ionicons 
                    name="business" 
                    size={22} 
                    color={inviteType === 'org' ? colors.primaryForeground : colors.text} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.inviteTypeLabel,
                      { color: inviteType === 'org' ? colors.primaryForeground : colors.text }
                    ]}>
                      Organization
                    </Text>
                    <Text style={[
                      styles.inviteTypeDesc,
                      { color: inviteType === 'org' ? colors.primaryForeground + 'CC' : colors.textMuted }
                    ]}>
                      Instructor, admin, or owner
                    </Text>
                  </View>
                  {inviteType === 'org' && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primaryForeground} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Team Invite Flow - Show for commanders even if loading */}
          {inviteType === 'team' && (availableTeams.length > 0 || (isCommander && !isAdminOrOwner)) && (
            <>
              {/* Loading state when teams haven't loaded */}
              {availableTeams.length === 0 && isCommander && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LOADING TEAM...</Text>
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
                </View>
              )}
              
              {/* Team Selection - Only show if multiple teams available */}
              {availableTeams.length > 1 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT TEAM</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {availableTeams.map(team => (
                      <TouchableOpacity
                        key={team.id}
                        style={[
                          styles.teamChip,
                          { 
                            backgroundColor: selectedTeamId === team.id ? colors.primary : colors.card,
                            borderColor: selectedTeamId === team.id ? colors.primary : colors.border,
                          }
                        ]}
                        onPress={() => setSelectedTeamId(team.id)}
                      >
                        <Ionicons 
                          name="shield" 
                          size={16} 
                          color={selectedTeamId === team.id ? colors.primaryForeground : colors.text} 
                        />
                        <Text style={[
                          styles.teamChipText, 
                          { color: selectedTeamId === team.id ? colors.primaryForeground : colors.text }
                        ]}>
                          {team.name}
                        </Text>
                        {selectedTeamId === team.id && (
                          <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Show selected team if only one available (e.g., for team commanders) */}
              {availableTeams.length === 1 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM</Text>
                  <View style={[styles.selectedTeamBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="shield" size={20} color={colors.primary} />
                    <Text style={[styles.selectedTeamName, { color: colors.text }]}>
                      {availableTeams[0].name}
                    </Text>
                  </View>
                </View>
              )}

              {/* Team Role Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM ROLE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {availableTeamRoles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip, 
                        { 
                          backgroundColor: selectedTeamRole === role ? colors.primary + '20' : colors.card,
                          borderWidth: 1,
                          borderColor: selectedTeamRole === role ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => setSelectedTeamRole(role)}
                    >
                      <Ionicons 
                        name={role === 'commander' ? 'star' : role === 'squad_commander' ? 'star-half' : 'person'}
                        size={14}
                        color={selectedTeamRole === role ? colors.primary : colors.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={{ 
                        fontSize: 14,
                        fontWeight: '600',
                        color: selectedTeamRole === role ? colors.primary : colors.text
                      }}>
                        {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Text>
                      {selectedTeamRole === role && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Squad Selection - Only for soldiers and squad commanders */}
              {(selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander') && (() => {
                const selectedTeam = teams.find(t => t.id === selectedTeamId);
                const availableSquads = selectedTeam?.squads || [];
                
                return (
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                      {selectedTeamRole === 'soldier' ? 'SQUAD (REQUIRED)' : 'SQUAD TO COMMAND (REQUIRED)'}
                    </Text>
                    
                    {/* Show available squads as chips */}
                    {availableSquads.length > 0 && (
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 10 }}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {availableSquads.map((squad) => (
                          <TouchableOpacity
                            key={squad}
                            style={[
                              styles.squadChip,
                              {
                                backgroundColor: selectedSquadName === squad ? colors.primary : colors.card,
                                borderColor: selectedSquadName === squad ? colors.primary : colors.border,
                              }
                            ]}
                            onPress={() => setSelectedSquadName(squad)}
                          >
                            <Ionicons 
                              name="shield" 
                              size={14} 
                              color={selectedSquadName === squad ? colors.primaryForeground : colors.primary} 
                            />
                            <Text style={{ 
                              fontSize: 13,
                              fontWeight: '600',
                              color: selectedSquadName === squad ? colors.primaryForeground : colors.text
                            }}>
                              {squad}
                            </Text>
                            {selectedSquadName === squad && (
                              <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    
                    {/* Input for custom squad name */}
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          backgroundColor: colors.card, 
                          color: colors.text,
                          borderColor: colors.border
                        }
                      ]}
                      placeholder={availableSquads.length > 0 ? "Or enter new squad name..." : "e.g. Alpha, Bravo, Squad 1"}
                      placeholderTextColor={colors.textMuted}
                      value={selectedSquadName}
                      onChangeText={setSelectedSquadName}
                    />
                  </View>
                );
              })()}
            </>
          )}

          {/* Org Invite Flow - ONLY for admin/owner */}
          {inviteType === 'org' && canCreateOrgInvites && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ORGANIZATION ROLE</Text>
              <View style={styles.orgRolesGrid}>
                {ORG_ROLE_OPTIONS.map((role) => {
                  const isSelected = selectedOrgRole === role.value;
                  return (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.orgRoleCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: isSelected ? role.color : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        }
                      ]}
                      onPress={() => setSelectedOrgRole(role.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.orgRoleHeader}>
                        <View style={[
                          styles.orgRoleIcon,
                          { backgroundColor: isSelected ? role.color + '20' : colors.secondary }
                        ]}>
                          <Ionicons name={role.icon} size={20} color={isSelected ? role.color : colors.textMuted} />
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={22} color={role.color} />
                        )}
                      </View>
                      
                      <Text style={[styles.orgRoleLabel, { color: colors.text }]}>
                        {role.label}
                      </Text>
                      <Text style={[styles.orgRoleDesc, { color: colors.textMuted }]}>
                        {role.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
                  <Ionicons name="ticket" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.generateButtonText, { color: colors.primaryForeground }]}>
                    Generate Invite Code
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pending Invitations */}
          <View style={styles.pendingSection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 12 }]}>
              PENDING INVITES ({pendingInvites.length})
            </Text>

            {loadingInvites ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            ) : pendingInvites.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.secondary + '50' }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={{ marginBottom: 4 }} />
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  No active codes
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
                        borderColor: colors.border,
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
                        <Text style={[styles.roleMetaText, { color: colors.text }]}>
                          {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                          {invite.team_name && (
                            <Text style={{ color: colors.textMuted, fontWeight: '500' }}> • {invite.team_name}</Text>
                          )}
                        </Text>
                        <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                          {getTimeRemaining(invite.expires_at)}
                        </Text>
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
          
          <View style={{ height: 12 }} />
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
    marginTop: 4,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  inviteTypeContainer: {
    gap: 10,
  },
  inviteTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  inviteTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  inviteTypeDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  orgRolesGrid: {
    gap: 10,
  },
  orgRoleCard: {
    padding: 16,
    borderRadius: 14,
  },
  orgRoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orgRoleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgRoleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  orgRoleDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
  },
  teamChipText: {
    fontWeight: '600',
    fontSize: 14,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 70,
  },
  actionContainer: {
    marginBottom: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pendingSection: {
    marginBottom: 20,
  },
  emptyState: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  invitesList: {
    gap: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  inviteInfo: {
    flex: 1,
    marginRight: 10,
  },
  inviteMain: {
    gap: 4,
  },
  codeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    letterSpacing: 1,
  },
  roleMetaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  expiryText: {
    fontSize: 11,
    marginTop: 1,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  squadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 12,
  },
  selectedTeamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  selectedTeamName: {
    fontSize: 16,
    fontWeight: '600',
  },
});