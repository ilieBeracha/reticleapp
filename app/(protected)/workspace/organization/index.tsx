import QuickActions from '@/components/organization/QuickActions';
import RecentSessions from '@/components/organization/RecentSessions';
import StatsOverview from '@/components/organization/StatsOverview';
import TeamsSection from '@/components/organization/TeamsSection';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { getWorkspaceTeams } from '@/services/workspaceService';
import { useSessionStore } from '@/store/sessionStore';
import type { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrganizationWorkspacePage() {
  const colors = useColors();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { createTeamSheetRef, setOnTeamCreated, createSessionSheetRef, setOnSessionCreated, inviteMembersSheetRef } = useModals();
  const { sessions, loading: sessionsLoading, error: sessionsError, loadWorkspaceSessions } = useSessionStore();

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingTeams(true);
    try {
      const fetchedTeams = await getWorkspaceTeams('org', activeWorkspaceId);
      setTeams(fetchedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  }, [activeWorkspaceId]);

  // Load sessions
  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceSessions();
    }
  }, [activeWorkspaceId]);

  // Load teams on mount
  useEffect(() => {
    if (activeWorkspaceId) {
      loadTeams();
    }
  }, [activeWorkspaceId, loadTeams]);

  // Register callbacks
  const refreshSessions = useMemo(() => () => {
    if (activeWorkspaceId) loadWorkspaceSessions();
  }, [activeWorkspaceId, loadWorkspaceSessions]);

  useEffect(() => {
    setOnTeamCreated(() => loadTeams);
    setOnSessionCreated(() => refreshSessions);
    return () => {
      setOnTeamCreated(null);
      setOnSessionCreated(null);
    };
  }, [loadTeams, refreshSessions, setOnTeamCreated, setOnSessionCreated]);

  // Calculate stats
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  // Role display
  const roleDisplay = permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1);
  const roleConfig = {
    owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
    admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
    member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
  };
  const currentRole = roleConfig[permissions.role] || roleConfig.member;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* Workspace Header */}
      <View style={styles.header}>
        <Text style={[styles.workspaceName, { color: colors.text }]}>
          {activeWorkspace?.workspace_name || 'Organization'}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: currentRole.bg }]}>
          <Ionicons name={currentRole.icon} size={12} color={currentRole.color} />
          <Text style={[styles.roleBadgeText, { color: currentRole.color }]}>
            {roleDisplay}
          </Text>
        </View>
      </View>

      <StatsOverview 
        totalSessions={totalSessions} 
        activeSessions={activeSessions} 
        completedSessions={completedSessions} 
        teams={teams}
        loading={sessionsLoading || loadingTeams}
      />

      <QuickActions
        onStartSession={() => createSessionSheetRef.current?.open()}
        onCreateTeam={() => createTeamSheetRef.current?.open()}
        canManageTeams={permissions.canManageTeams}
      />

      <TeamsSection
        teams={teams}
        loading={loadingTeams}
        canManageTeams={permissions.canManageTeams}
        onCreateTeam={() => createTeamSheetRef.current?.open()}
      />

      <RecentSessions
        sessions={sessions}
        loading={sessionsLoading}
        error={sessionsError}
      />

      {/* Management Section (Owner/Admin Only) */}
      {permissions.canManageWorkspace && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Management</Text>
          </View>

          <View style={[styles.managementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {permissions.canInviteMembers && (
              <TouchableOpacity
                style={[styles.managementItem, { borderBottomColor: colors.border }]}
                onPress={() => inviteMembersSheetRef.current?.open()}
                activeOpacity={0.7}
              >
                <View style={styles.managementLeft}>
                  <View style={[styles.managementIcon, { backgroundColor: '#5B7A8C15' }]}>
                    <Ionicons name="person-add" size={20} color="#5B7A8C" />
                  </View>
                  <View>
                    <Text style={[styles.managementTitle, { color: colors.text }]}>Invite Members</Text>
                    <Text style={[styles.managementSubtitle, { color: colors.textMuted }]}>
                      Add people to your workspace
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {permissions.canManageTeams && (
              <TouchableOpacity
                style={[styles.managementItem, { borderBottomColor: colors.border }]}
                onPress={() => createTeamSheetRef.current?.open()}
                activeOpacity={0.7}
              >
                <View style={styles.managementLeft}>
                  <View style={[styles.managementIcon, { backgroundColor: '#E7692515' }]}>
                    <Ionicons name="people" size={20} color="#E76925" />
                  </View>
                  <View>
                    <Text style={[styles.managementTitle, { color: colors.text }]}>Manage Teams</Text>
                    <Text style={[styles.managementSubtitle, { color: colors.textMuted }]}>
                      Create and organize teams
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {permissions.isOwner && (
              <TouchableOpacity
                style={styles.managementItem}
                onPress={() => {}}
                activeOpacity={0.7}
              >
                <View style={styles.managementLeft}>
                  <View style={[styles.managementIcon, { backgroundColor: '#5A847315' }]}>
                    <Ionicons name="settings" size={20} color="#5A8473" />
                  </View>
                  <View>
                    <Text style={[styles.managementTitle, { color: colors.text }]}>Workspace Settings</Text>
                    <Text style={[styles.managementSubtitle, { color: colors.textMuted }]}>
                      Configure workspace preferences
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Role Info Banner */}
      {!permissions.canManageWorkspace && (
        <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
            {permissions.isInstructor 
              ? "As an instructor, you can create trainings and view team progress"
              : "You can participate in sessions and view team activities"}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  workspaceName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Section (for Management section)
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Management Card
  managementCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  managementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  managementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  managementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  managementSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
});

