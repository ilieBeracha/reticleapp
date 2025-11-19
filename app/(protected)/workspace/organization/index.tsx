import QuickActions from '@/components/organization/QuickActions';
import RecentSessions from '@/components/organization/RecentSessions';
import RoleInfoBanner from '@/components/organization/RoleInfoBanner';
import StatsOverview from '@/components/organization/StatsOverview';
import TeamsSection from '@/components/organization/TeamsSection';
import WorkspaceHeader from '@/components/organization/WorkspaceHeader';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useModalCallbacks } from '@/hooks/useModalCallbacks';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useSessionStats } from '@/hooks/useSessionStats';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

const OrganizationWorkspacePage = memo(function OrganizationWorkspacePage() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const permissions = useWorkspacePermissions();

  // Data fetching
  const { teams, loadingTeams, sessions, sessionsLoading, sessionsError, loadTeams, refreshSessions } = useWorkspaceData();

  // Modal callbacks
  useModalCallbacks({
    onTeamCreated: loadTeams,
    onSessionCreated: refreshSessions,
  });

  // Actions
  const { onStartSession, onCreateTeam, onSettingsPress } = useWorkspaceActions();

  // Computed stats
  const stats = useSessionStats(sessions);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <WorkspaceHeader
        workspaceName={activeWorkspace?.workspace_name || 'Organization'}
        role={permissions.role}
        onSettingsPress={onSettingsPress}
      />

      <StatsOverview
        totalSessions={stats.totalSessions}
        activeSessions={stats.activeSessions}
        completedSessions={stats.completedSessions}
        teams={teams}
        loading={sessionsLoading || loadingTeams}
      />

      <View style={styles.divider} />

      <QuickActions
        onStartSession={onStartSession}
        onCreateTeam={onCreateTeam}
        canManageTeams={permissions.canManageTeams}
      />

      <TeamsSection
        teams={teams}
        loading={loadingTeams}
        canManageTeams={permissions.canManageTeams}
        onCreateTeam={onCreateTeam}
      />

      <RecentSessions
        sessions={sessions}
        loading={sessionsLoading}
        error={sessionsError}
      />

      <RoleInfoBanner
        isInstructor={permissions.isInstructor}
        canManageWorkspace={permissions.canManageWorkspace}
      />

      <View style={{ height: 20 }} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  divider: {
    height: 24,
  },
});

export default OrganizationWorkspacePage;
