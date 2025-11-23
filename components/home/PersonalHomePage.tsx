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
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Personal mode home page - displays personal training stats, quick actions, and recent sessions.
 * Extracted from workspace/index.tsx for better code organization.
 */
export const PersonalHomePage = React.memo(function PersonalHomePage() {
  const colors = useColors();
  const { fullName } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { chartDetailsSheetRef, setOnSessionCreated, setOnTeamCreated } = useModals();
  const { sessions, sessionsLoading, sessionsError, loadTeams, refreshSessions } = useWorkspaceData();

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

  // Pie chart data - memoized to avoid recreation
  const pieData = useMemo(
    () => [
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
    ],
    []
  );

  const quickActions = useMemo(() => {
    const actions = [
      {
        icon: 'add-circle' as const,
        title: 'Start New Session',
        subtitle: 'Begin training',
        onPress: handleStartSession,
      },
      {
        icon: 'bar-chart-outline' as const,
        title: 'View Progress',
        subtitle: 'Track stats',
        color: '#5B7A8C',
        onPress: handleViewProgress,
      },
    ];

    // Only show create team if user has permission
    if (permissions.canManageTeams) {
      actions.push({
        icon: 'add-circle' as const,
        title: 'Create Team',
        subtitle: 'Manage teams',
        onPress: handleCreateTeam,
      });
    }
    return actions;
  }, [handleStartSession, handleViewProgress, handleCreateTeam, permissions.canManageTeams]);

  // Memoize stats for welcome card
  const welcomeStats = useMemo(
    () => ({
      totalSessions: stats.totalSessions,
      totalAbg: 0,
      totalCompletedSessions: stats.completedSessions,
      totalTime: '0h',
    }),
    [stats.totalSessions, stats.completedSessions]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        removeClippedSubviews={true}
      >
        {/* User Welcome Card */}
        <WelcomeCard fullName={fullName || ''} stats={welcomeStats} loading={sessionsLoading} />

        {/* Training Distribution Chart */}
        <TrainingChart data={pieData} onDoubleTap={handleChartDoubleTap} />

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
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
            keyExtractor={(_, index) => `action-${index}`}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          </View>

          {sessionsLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading sessions...</Text>
            </View>
          ) : sessionsError ? (
            <EmptyState icon="warning-outline" title="Unable to load sessions" subtitle={sessionsError} size="small" />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon="fitness-outline"
              title="No recent activity"
              subtitle="Start your first training session to see your activity here"
              size="small"
            />
          ) : (
            <View>
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

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
  section: {
    marginBottom: 24,
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
});

export default PersonalHomePage;
