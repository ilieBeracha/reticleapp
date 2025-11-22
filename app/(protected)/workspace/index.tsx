import EmptyState from '@/components/shared/EmptyState';
import GroupedList from '@/components/shared/GroupedList';
import QuickActionCard from '@/components/shared/QuickActionCard';
import SessionCard from '@/components/shared/SessionCard';
import TrainingChart from '@/components/shared/TrainingChart';
import WelcomeCard from '@/components/shared/WelcomeCard';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useSessionStats } from '@/hooks/useSessionStats';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomePage() {
  const colors = useColors();
  const router = useRouter();
  const { fullName, activeWorkspace, workspaces } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { chartDetailsSheetRef, createSessionSheetRef, createTeamSheetRef, setOnSessionCreated, setOnTeamCreated } = useModals();
  const { teams, loadingTeams, sessions, sessionsLoading, sessionsError, loadTeams, refreshSessions } = useWorkspaceData();
  
  // Show "no organization" state if user has no workspaces
  const hasNoOrganization = workspaces.length === 0;
  
  // Computed stats
  const stats = useSessionStats(sessions);

  useEffect(() => {
    setOnSessionCreated(() => refreshSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [refreshSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // Actions
  const { onStartSession, onCreateTeam } = useWorkspaceActions();

  // Memoized callbacks for quick actions
  const handleStartSession = useCallback(() => {
    onStartSession();
  }, [onStartSession]);

  const handleViewProgress = useCallback(() => {
    chartDetailsSheetRef.current?.open();
  }, [chartDetailsSheetRef]);

  const handleCreateTeam = useCallback(() => {
    onCreateTeam();
  }, [onCreateTeam]);

  const handleChartDoubleTap = useCallback(() => {
    chartDetailsSheetRef.current?.open();
  }, [chartDetailsSheetRef]);

  // Pie chart data - elegant muted tones with depth
  const pieData = useMemo(() => [
    { 
      value: 40, 
      color: '#6B8FA3', 
      gradientCenterColor: '#8BADC1',
      focused: true,
    },
    { 
      value: 30, 
      color: '#FF8A5C',
      gradientCenterColor: '#FFA880',
    },
    { 
      value: 20, 
      color: '#7AA493',
      gradientCenterColor: '#98C2B1',
    },
    { 
      value: 10, 
      color: '#8A8A8A',
      gradientCenterColor: '#A8A8A8',
    },
  ], []);

  const quickActions = useMemo(() => {
    const actions = [
      { 
        icon: 'add-circle' as const, 
        title: 'Start New Session', 
        subtitle: 'Begin training', 
        onPress: handleStartSession
      },
      { 
        icon: 'bar-chart-outline' as const, 
        title: 'View Progress', 
        subtitle: 'Track stats', 
        color: '#5B7A8C',
        onPress: handleViewProgress
      },
    ];

    // Only show create team if user has permission
    if (permissions.canManageTeams) {
      actions.push({ 
        icon: 'add-circle' as const, 
        title: 'Create Team', 
        subtitle: 'Manage teams', 
        onPress: handleCreateTeam
      });
    }
    return actions;
  }, [handleStartSession, handleViewProgress, handleCreateTeam, permissions.canManageTeams]);
  // Memoize all dynamic styles
  const containerStyle = useMemo(() => [
    styles.container,
    { backgroundColor: colors.background }
  ], [colors.background]);

  const sectionTitleStyle = useMemo(() => [
    styles.sectionTitle,
    { color: colors.text }
  ], [colors.text]);

  const loadingTextStyle = useMemo(() => [
    styles.loadingText,
    { color: colors.textMuted }
  ], [colors.textMuted]);

  // Memoize stats for welcome card
  const welcomeStats = useMemo(() => ({
    totalSessions: stats.totalSessions,
    totalAbg: 0,
    totalCompletedSessions: stats.completedSessions,
    totalTime: '0h',
  }), [stats.totalSessions, stats.completedSessions]);

  return (
    <View style={containerStyle}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        removeClippedSubviews={true}
      >
       
          <>
            {/* User Welcome Card */}
            <WelcomeCard 
              fullName={fullName || ''}
              stats={welcomeStats}
              loading={sessionsLoading}
            />

        {/* Training Distribution Chart */}
        <TrainingChart 
          data={pieData}
          onDoubleTap={handleChartDoubleTap}
        />

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={sectionTitleStyle}>Quick Actions</Text>
          </View>

          <GroupedList
            data={quickActions}
            renderItem={(action, isFirst, isLast) => (
              <QuickActionCard
                icon={action.icon}
                title={action.title}
                subtitle={action.subtitle}
                color={action.color}
                onPress={action.onPress}
                isFirst={isFirst}
                isLast={isLast}
              />
            )}
            keyExtractor={(action, index) => `action-${index}`}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={sectionTitleStyle}>Recent Activity</Text>
          </View>

          {sessionsLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={loadingTextStyle}>Loading sessions...</Text>
            </View>
          ) : sessionsError ? (
            <EmptyState
              icon="warning-outline"
              title="Unable to load sessions"
              subtitle={sessionsError}
              size="small"
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon="fitness-outline"
              title="No recent activity"
              subtitle="Start your first training session to see your activity here"
              size="small"
            />
          ) : (
            <View style={styles.sessionList}>
              {sessions.map((session) => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                />
              ))}
            </View>
          )}
        </View>
          </>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  actionsSection: {
    marginBottom: 24,
  },
  activitySection: {
    marginBottom: 20,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  sessionList: {},
  noOrgContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  createOrgButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createOrgButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
