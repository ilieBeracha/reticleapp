import { BaseAvatar } from "@/components/BaseAvatar";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { useModals } from "@/contexts/ModalContext";
import { useColors } from "@/hooks/ui/useColors";
import { removeTeamMember, updateTeamMemberRole } from "@/services/teamService";
import { useTeamStore, useMyTeamRole, useCanManageTeam } from "@/store/teamStore";
import type { TeamRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';
import { useState, useMemo } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * MEMBER PREVIEW - Native Form Sheet (Team-First)
 * 
 * Permission Matrix:
 * - Team Owner/Commander: Can change team role, remove from team
 * - Everyone: Can view basic info
 */
export default function MemberPreviewSheet() {
  const colors = useColors();
  const { selectedMember: member, setSelectedMember } = useModals();
  const { activeTeamId, loadMembers } = useTeamStore();
  const myRole = useMyTeamRole();
  const canManage = useCanManageTeam();
  const [loading, setLoading] = useState(false);

  // Get current user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useMemo(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id);
      });
    });
  }, []);

  if (!member) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No member selected</Text>
      </View>
    );
  }

  // Permission checks (team-first)
  const isTargetOwner = member.role === 'owner';
  const isTargetSelf = member.member_id === currentUserId;
  
  // Determine what actions are available
  const canViewActivity = true; // Everyone can view
  const canManageTeamRole = canManage && !isTargetOwner && !isTargetSelf;
  const canRemoveFromTeam = canManage && !isTargetOwner && !isTargetSelf;

  // Team role options
  const teamRoleOptions: TeamRole[] = ['commander', 'squad_commander', 'soldier'];

  const handleViewActivity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/memberActivity',
      params: { memberId: member.member_id, memberName: member.profile_full_name || 'Member' }
    });
  };

  const handleChangeTeamRole = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentRole = member.role;
    const availableRoles = teamRoleOptions.filter(r => r !== currentRole);
    
    const options = [...availableRoles, 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: options.map(o => o === 'Cancel' ? o : o.replace('_', ' ')),
          cancelButtonIndex,
          title: 'Change Team Role',
          message: `Current role: ${currentRole.replace('_', ' ')}`,
        },
        async (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            const newRole = availableRoles[buttonIndex];
            await updateTeamRole(newRole);
          }
        }
      );
    } else {
      Alert.alert(
        'Change Team Role',
        `Current role: ${currentRole.replace('_', ' ')}\n\nSelect new role:`,
        [
          ...availableRoles.map(role => ({
            text: role.replace('_', ' '),
            onPress: () => updateTeamRole(role),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  };

  const updateTeamRole = async (newRole: TeamRole) => {
    if (!activeTeamId) return;
    try {
      setLoading(true);
      await updateTeamMemberRole(activeTeamId, member.member_id, newRole);
      await loadMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Role changed to ${newRole.replace('_', ' ')}`);
      router.back();
    } catch (error: any) {
      console.error('Failed to update team role:', error);
      Alert.alert('Error', error.message || 'Failed to update team role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromTeam = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove from Team',
      `Remove ${member.profile_full_name || 'this member'} from this team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              await removeTeamMember(activeTeamId, member.member_id);
              await loadMembers();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSelectedMember(null);
              router.back();
            } catch (error: any) {
              console.error('Failed to remove from team:', error);
              Alert.alert('Error', error.message || 'Failed to remove from team');
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 12 }]}>Processing...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
        {/* Header */}
        <View style={styles.header}>
          <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="lg" role={member.role} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{member.profile_full_name || 'Unknown'}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{member.profile_email}</Text>
            <View style={styles.roleBadgeContainer}>
              <RoleBadge role={member.role} />
            </View>
          </View>
        </View>

        {/* Teams Section */}
        {member.teams && member.teams.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Teams</Text>
            <View style={styles.teamsList}>
              {member.teams.map((team: any, index: number) => {
                // Check if current user can manage this team
                const canManageThisTeam = allTeams.some(
                  myTeam => myTeam.teamId === team.team_id && 
                  (myTeam.teamRole === 'commander' || myTeam.teamRole === 'squad_commander')
                ) || isOrgStaff;
                
                return (
                  <TouchableOpacity 
                    key={team.team_id || index} 
                    style={[styles.teamBadge, { backgroundColor: colors.secondary }]}
                    onPress={() => {
                      if (canManageThisTeam && !isTargetSelf) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const options = ['Change Role', 'Remove from Team', 'Cancel'];
                        if (Platform.OS === 'ios') {
                          ActionSheetIOS.showActionSheetWithOptions(
                            { options, cancelButtonIndex: 2, destructiveButtonIndex: 1, title: team.team_name },
                            (idx) => {
                              if (idx === 0) handleChangeTeamRole(team.team_id, team.team_name, team.team_role);
                              if (idx === 1) handleRemoveFromTeam(team.team_id, team.team_name);
                            }
                          );
                        } else {
                          Alert.alert(team.team_name, 'Select action:', [
                            { text: 'Change Role', onPress: () => handleChangeTeamRole(team.team_id, team.team_name, team.team_role) },
                            { text: 'Remove from Team', style: 'destructive', onPress: () => handleRemoveFromTeam(team.team_id, team.team_name) },
                            { text: 'Cancel', style: 'cancel' },
                          ]);
                        }
                      }
                    }}
                    activeOpacity={canManageThisTeam && !isTargetSelf ? 0.7 : 1}
                    disabled={!canManageThisTeam || isTargetSelf}
                  >
                    <Ionicons name="people" size={14} color={colors.text} style={{ marginRight: 4 }} />
                    <Text style={[styles.teamText, { color: colors.text }]}>{team.team_name || 'Unknown Team'}</Text>
                    {team.team_role && (
                      <Text style={[styles.teamRoleText, { color: colors.textMuted }]}> • {team.team_role.replace('_', ' ')}</Text>
                    )}
                    {canManageThisTeam && !isTargetSelf && (
                      <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions Section */}
        <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Actions</Text>
          <View style={styles.actionsList}>
            {/* View Activity - Available to everyone */}
            <TouchableOpacity 
              style={[styles.actionButton, { borderBottomColor: colors.border }]} 
              onPress={handleViewActivity} 
              activeOpacity={0.7}
            >
              <View style={styles.actionContent}>
                <Ionicons name="stats-chart" size={20} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>View Activity</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Change Team Role - Only for managers */}
            {canManageTeamRole && (
              <TouchableOpacity
                style={[styles.actionButton, { borderBottomColor: colors.border }]}
                onPress={handleChangeTeamRole}
                activeOpacity={0.7}
              >
                <View style={styles.actionContent}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Change Team Role</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Remove from Team - Only for managers */}
            {canRemoveFromTeam && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleRemoveFromTeam} 
                activeOpacity={0.7}
              >
                <View style={styles.actionContent}>
                  <Ionicons name="person-remove" size={20} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>Remove from Team</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info notes */}
        {isTargetOwner && (
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Team owners cannot be edited or removed
          </Text>
        )}
        {isTargetSelf && !isTargetOwner && (
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            You cannot modify your own role or remove yourself
          </Text>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 24 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  emptyText: { fontSize: 15, fontStyle: 'italic' },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  roleBadgeContainer: { marginTop: 8, alignSelf: 'flex-start' },

  section: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  teamsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  teamText: { fontSize: 14, fontWeight: '500' },
  teamRoleText: { fontSize: 12, fontWeight: '400' },

  actionsList: { gap: 0 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionText: { fontSize: 15, fontWeight: '500' },

  noteText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 16 },
});

