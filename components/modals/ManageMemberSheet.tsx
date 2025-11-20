/**
 * ManageMemberSheet - Assign existing org members to teams and manage roles
 * Only 'member' role users can be assigned to teams
 */

import { BaseBottomSheet, type BaseBottomSheetRef } from '@/components/modals/BaseBottomSheet';
import { useColors } from '@/hooks/ui/useColors';
import { addTeamMember, removeTeamMember, updateTeamMemberRole } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import type { TeamMemberShip, TeamWithMembers, WorkspaceAccess } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type WorkspaceMember = WorkspaceAccess & { profile?: any };

export interface ManageMemberSheetRef {
  open: (member: WorkspaceMember, teams: TeamWithMembers[]) => void;
  close: () => void;
}

interface ManageMemberSheetProps {
  onMemberUpdated?: () => void;
}

const TEAM_ROLE_OPTIONS: TeamMemberShip[] = ['commander', 'squad_commander', 'soldier'];

export const ManageMemberSheet = forwardRef<ManageMemberSheetRef, ManageMemberSheetProps>(
  ({ onMemberUpdated }, ref) => {
    const colors = useColors();
    const sheetRef = useRef<BaseBottomSheetRef>(null);
    
    const [member, setMember] = useState<WorkspaceMember | null>(null);
    const [teams, setTeams] = useState<TeamWithMembers[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [selectedTeamRole, setSelectedTeamRole] = useState<TeamMemberShip>('soldier');
    const [selectedSquadName, setSelectedSquadName] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (workspaceMember: WorkspaceMember, availableTeams: TeamWithMembers[]) => {
        setMember(workspaceMember);
        setTeams(availableTeams);
        
        // Find if member is already in a team
        const memberTeam = availableTeams.find(team =>
          team.members?.some(m => m.user_id === workspaceMember.member_id)
        );
        
        if (memberTeam) {
          const memberData = memberTeam.members?.find(m => m.user_id === workspaceMember.member_id);
          setSelectedTeamId(memberTeam.id);
          setSelectedTeamRole(memberData?.role || 'soldier');
          setSelectedSquadName(memberData?.details?.squad_id || '');
        } else {
          setSelectedTeamId(null);
          setSelectedTeamRole('soldier');
          setSelectedSquadName('');
        }
        
        sheetRef.current?.open();
      },
      close: () => {
        sheetRef.current?.close();
      },
    }));

    const handleSave = async () => {
      if (!member) return;

      // Check if user is 'member' role
      if (member.role !== 'member') {
        Alert.alert(
          'Cannot Assign to Team',
          `Only users with "member" role can be assigned to teams. This user is ${member.role}.`
        );
        return;
      }

      // Validate squad for soldiers and squad commanders
      if (selectedTeamId && (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander')) {
        if (!selectedSquadName.trim()) {
          Alert.alert(
            'Squad Required',
            selectedTeamRole === 'soldier'
              ? 'Soldiers must be assigned to a squad.'
              : 'Squad commanders must be assigned to a squad to command.'
          );
          return;
        }
      }

      setIsUpdating(true);
      try {
        const currentTeam = teams.find(t => t.members?.some(m => m.user_id === member.member_id));
        const squadDetails = (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander') && selectedSquadName
          ? { squad_id: selectedSquadName.trim() }
          : undefined;

        // Case 1: Member is not in any team, and we're assigning them to one
        if (!currentTeam && selectedTeamId) {
          await addTeamMember({
            team_id: selectedTeamId,
            user_id: member.member_id,
            role: selectedTeamRole,
            details: squadDetails,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success', `${member.profile?.full_name || 'Member'} has been added to the team`);
        }
        // Case 2: Member is in a team, and we're moving them to a different team
        else if (currentTeam && selectedTeamId && currentTeam.id !== selectedTeamId) {
          await removeTeamMember(currentTeam.id, member.member_id);
          await addTeamMember({
            team_id: selectedTeamId,
            user_id: member.member_id,
            role: selectedTeamRole,
            details: squadDetails,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success', `${member.profile?.full_name || 'Member'} has been moved to the new team`);
        }
        // Case 3: Member is in a team, and we're updating their role/squad
        else if (currentTeam && selectedTeamId && currentTeam.id === selectedTeamId) {
          await updateTeamMemberRole(
            selectedTeamId,
            member.member_id,
            selectedTeamRole,
            squadDetails
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success', `${member.profile?.full_name || 'Member'}'s role has been updated`);
        }
        // Case 4: Member is in a team, and we're removing them (selectedTeamId is null)
        else if (currentTeam && !selectedTeamId) {
          await removeTeamMember(currentTeam.id, member.member_id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Success', `${member.profile?.full_name || 'Member'} has been removed from the team`);
        }

        onMemberUpdated?.();
        sheetRef.current?.close();
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('Failed to update member:', error);
        Alert.alert('Error', error.message || 'Failed to update member');
      } finally {
        setIsUpdating(false);
      }
    };

    if (!member) return null;

    const currentTeam = teams.find(t => t.members?.some(m => m.user_id === member.member_id));
    const currentMemberData = currentTeam?.members?.find(m => m.user_id === member.member_id);
    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const availableSquads = selectedTeam?.squads || [];

    // Check if user can be assigned to teams
    const canAssignToTeam = member.role === 'member';

    return (
      <BaseBottomSheet ref={sheetRef} snapPoints={['85%']} backdropOpacity={0.6}>
        <BottomSheetScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(member.profile?.full_name || member.profile?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {member.profile?.full_name || 'Unknown User'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {member.profile?.email}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.roleBadgeText, { color: colors.textMuted }]}>
                  {member.role.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Cannot assign warning */}
            {!canAssignToTeam && (
              <View style={[styles.warningCard, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}>
                <Ionicons name="alert-circle" size={20} color={colors.accent} />
                <Text style={[styles.warningText, { color: colors.accent }]}>
                  Only users with "member" role can be assigned to teams. This user is {member.role}.
                </Text>
              </View>
            )}

            {/* Current Assignment */}
            {currentTeam && (
              <View style={[styles.currentCard, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  CURRENT ASSIGNMENT
                </Text>
                <View style={styles.currentTeamRow}>
                  <Ionicons name="people" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.currentTeamName, { color: colors.text }]}>
                      {currentTeam.name}
                    </Text>
                    <Text style={[styles.currentTeamSubtext, { color: colors.primary }]}>
                      {currentMemberData?.role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      {currentMemberData?.details?.squad_id && ` • Squad ${currentMemberData.details.squad_id}`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Team Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                ASSIGN TO TEAM
              </Text>
              
              {/* No Team Option */}
              <TouchableOpacity
                style={[
                  styles.teamOption,
                  {
                    backgroundColor: selectedTeamId === null ? colors.primary + '15' : colors.card,
                    borderColor: selectedTeamId === null ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  setSelectedTeamId(null);
                  setSelectedSquadName('');
                }}
                disabled={!canAssignToTeam}
              >
                <Ionicons 
                  name="close-circle" 
                  size={20} 
                  color={selectedTeamId === null ? colors.primary : colors.textMuted} 
                />
                <Text style={[
                  styles.teamOptionText,
                  { color: selectedTeamId === null ? colors.primary : colors.text }
                ]}>
                  No Team
                </Text>
              </TouchableOpacity>

              {/* Team Options */}
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    {
                      backgroundColor: selectedTeamId === team.id ? colors.primary + '15' : colors.card,
                      borderColor: selectedTeamId === team.id ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => {
                    setSelectedTeamId(team.id);
                    setSelectedSquadName('');
                  }}
                  disabled={!canAssignToTeam}
                >
                  <Ionicons 
                    name="people" 
                    size={20} 
                    color={selectedTeamId === team.id ? colors.primary : colors.textMuted} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.teamOptionText,
                      { color: selectedTeamId === team.id ? colors.primary : colors.text }
                    ]}>
                      {team.name}
                    </Text>
                    {team.squads && team.squads.length > 0 && (
                      <Text style={[styles.teamSquadsHint, { color: colors.textMuted }]}>
                        {team.squads.length} squad{team.squads.length !== 1 ? 's' : ''}: {team.squads.join(', ')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Role Selection - Only if team selected */}
            {selectedTeamId && canAssignToTeam && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  TEAM ROLE
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.roleChipsContainer}
                >
                  {TEAM_ROLE_OPTIONS.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: selectedTeamRole === role ? colors.primary : colors.card,
                          borderColor: selectedTeamRole === role ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => {
                        setSelectedTeamRole(role);
                        if (role === 'commander') {
                          setSelectedSquadName('');
                        }
                      }}
                    >
                      <Text style={[
                        styles.roleChipText,
                        { color: selectedTeamRole === role ? '#fff' : colors.text }
                      ]}>
                        {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Squad Selection - Only for soldiers and squad commanders */}
            {selectedTeamId && canAssignToTeam && (selectedTeamRole === 'soldier' || selectedTeamRole === 'squad_commander') && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  SQUAD {availableSquads.length > 0 ? '(SELECT OR CREATE NEW)' : '*'}
                </Text>
                
                {/* Available Squads */}
                {availableSquads.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 12 }}
                    contentContainerStyle={styles.squadChipsContainer}
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
                          color={selectedSquadName === squad ? '#fff' : colors.primary} 
                        />
                        <Text style={[
                          styles.squadChipText,
                          { color: selectedSquadName === squad ? '#fff' : colors.text }
                        ]}>
                          {squad}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {/* Custom Squad Input */}
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={availableSquads.length > 0 ? "Or enter a new squad name..." : "e.g. Alpha, Bravo, Squad 1"}
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={selectedSquadName}
                    onChangeText={setSelectedSquadName}
                  />
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: isUpdating || !canAssignToTeam ? colors.secondary : colors.primary,
                    opacity: isUpdating || !canAssignToTeam ? 0.5 : 1,
                  }
                ]}
                onPress={handleSave}
                disabled={isUpdating || !canAssignToTeam}
                activeOpacity={0.8}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      Save Changes
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

ManageMemberSheet.displayName = 'ManageMemberSheet';

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
    paddingVertical: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  currentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  currentTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentTeamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentTeamSubtext: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  teamOptionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  teamSquadsHint: {
    fontSize: 12,
    marginTop: 2,
  },
  roleChipsContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  squadChipsContainer: {
    gap: 8,
    paddingVertical: 4,
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
  squadChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '400',
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

