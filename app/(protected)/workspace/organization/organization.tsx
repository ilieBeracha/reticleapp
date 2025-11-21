import { ManageMemberSheet, type ManageMemberSheetRef } from '@/components/modals/ManageMemberSheet';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useProfileContext } from '@/hooks/useProfileContext';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useProfileStore } from '@/store/useProfileStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrganizationPage() {
  const colors = useColors();
  const { currentOrg, currentOrgId, myRole, canManageMembers, isPersonalOrg } = useProfileContext();
  const { orgMembers, loadOrgMembers } = useProfileStore();
  const { teams, loadingTeams, loadTeams } = useWorkspaceData();
  const { inviteMembersSheetRef, createTeamSheetRef, setOnTeamCreated } = useModals();
  const manageMemberSheetRef = useRef<ManageMemberSheetRef>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Load data
  useEffect(() => {
    if (currentOrgId) {
      loadOrgMembers(currentOrgId);
      loadTeams();
    }
  }, [currentOrgId, loadOrgMembers, loadTeams]);

  // Register team creation callback
  useEffect(() => {
    setOnTeamCreated(() => loadTeams);
    return () => setOnTeamCreated(null);
  }, [loadTeams, setOnTeamCreated]);

  const onRefresh = useCallback(async () => {
    if (!currentOrgId) return;
    setRefreshing(true);
    await Promise.all([
      loadOrgMembers(currentOrgId),
      loadTeams()
    ]);
    setRefreshing(false);
  }, [currentOrgId, loadOrgMembers, loadTeams]);

  const handleOpenInviteMembers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inviteMembersSheetRef.current?.open();
  };

  const handleOpenCreateTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createTeamSheetRef.current?.open();
  };

  const handleManageMember = (member: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    manageMemberSheetRef.current?.open(member);
  };

  // Role badge styling
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#FFD700';
      case 'admin': return '#FF6B6B';
      case 'instructor': return '#4ECDC4';
      default: return colors.textMuted;
    }
  };

  if (isPersonalOrg) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.personalMessage}>
          <Ionicons name="person" size={48} color={colors.textMuted} />
          <Text style={[styles.personalText, { color: colors.text }]}>
            This is your personal workspace
          </Text>
          <Text style={[styles.personalSubtext, { color: colors.textMuted }]}>
            Create an organization to collaborate with teams
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.orgName, { color: colors.text }]}>
              {currentOrg?.name || 'Organization'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(myRole || '')}20` }]}>
              <Text style={[styles.roleBadgeText, { color: getRoleColor(myRole || '') }]}>
                {myRole}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        {canManageMembers && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleOpenInviteMembers}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Invite Members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleOpenCreateTeam}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Create Team</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Members ({orgMembers.length})
          </Text>
          {orgMembers.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No members yet
              </Text>
            </View>
          ) : (
            orgMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[styles.memberCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => canManageMembers && handleManageMember(member)}
                activeOpacity={0.7}
                disabled={!canManageMembers}
              >
                <View style={[styles.memberAvatar, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.memberDetails}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.display_name || 'Unknown'}
                  </Text>
                  <View style={[styles.memberRoleBadge, { backgroundColor: `${getRoleColor(member.role)}20` }]}>
                    <Text style={[styles.memberRoleText, { color: getRoleColor(member.role) }]}>
                      {member.role}
                    </Text>
                  </View>
                </View>
                {canManageMembers && (
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Teams Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Teams ({teams.length})
          </Text>
          {loadingTeams ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : teams.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No teams yet
              </Text>
            </View>
          ) : (
            teams.map((team) => (
              <View
                key={team.id}
                style={[styles.teamCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <View style={styles.teamHeader}>
                  <View style={[styles.teamIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name="people" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                    <Text style={[styles.teamMeta, { color: colors.textMuted }]}>
                      {team.member_count || 0} members
                      {team.team_type && ` • ${team.team_type}`}
                    </Text>
                  </View>
                </View>
                {team.squads && team.squads.length > 0 && (
                  <View style={[styles.squadsContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.squadsLabel, { color: colors.textMuted }]}>Squads:</Text>
                    <View style={styles.squadsList}>
                      {team.squads.map((squad, idx) => (
                        <View key={idx} style={[styles.squadBadge, { backgroundColor: `${colors.primary}15` }]}>
                          <Text style={[styles.squadText, { color: colors.primary }]}>{squad}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <ManageMemberSheet ref={manageMemberSheetRef} onMemberUpdated={() => currentOrgId && loadOrgMembers(currentOrgId)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orgName: {
    fontSize: 28,
    fontWeight: "700",
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
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
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberRoleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberRoleText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  teamCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  teamMeta: {
    fontSize: 13,
  },
  squadsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  squadsLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  squadsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  squadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  squadText: {
    fontSize: 11,
    fontWeight: "600",
  },
  personalMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
    gap: 16,
  },
  personalText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  personalSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
