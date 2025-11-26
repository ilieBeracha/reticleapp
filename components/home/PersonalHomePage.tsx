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
import { useSessionStore } from '@/store/sessionStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Personal mode home page - displays personal training stats, quick actions, and recent sessions.
 * Now with REAL DATA from trainings and sessions.
 */
export const PersonalHomePage = React.memo(function PersonalHomePage() {
  const colors = useColors();
  const { fullName } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { chartDetailsSheetRef, setOnSessionCreated, setOnTeamCreated, trainingDetailSheetRef } = useModals();
  const { sessions, sessionsLoading, sessionsError, loadTeams, refreshSessions } = useWorkspaceData();
  const { loadSessions } = useSessionStore();
  // Training data
  const { 
    myUpcomingTrainings, 
    myStats, 
    loadingMyTrainings,
    loadMyUpcomingTrainings,
    loadMyStats,
  } = useTrainingStore();

  // Load data on mount - empty deps is intentional (one-time load)
  useEffect(() => {
    loadSessions();
    loadMyUpcomingTrainings();
    loadMyStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Computed stats
  const stats = useSessionStats(sessions);

  useEffect(() => {
    setOnSessionCreated(() => loadSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

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

  const handleTrainingPress = useCallback((training: TrainingWithDetails) => {
    trainingDetailSheetRef.current?.open(training.id);
  }, [trainingDetailSheetRef]);

  // REAL pie chart data based on session status
  const pieData = useMemo(() => {
    const completed = stats.completedSessions;
    const active = stats.activeSessions;
    const total = stats.totalSessions;
    const cancelled = total - completed - active;

    // If no data, show placeholder
    if (total === 0) {
      return [
        { value: 1, color: colors.border, gradientCenterColor: colors.border },
      ];
    }

    const data = [];
    
    if (completed > 0) {
      data.push({
        value: completed,
        color: '#7AA493', // Green for completed
        gradientCenterColor: '#98C2B1',
        focused: true,
      });
    }
    
    if (active > 0) {
      data.push({
        value: active,
        color: '#6B8FA3', // Blue for active
        gradientCenterColor: '#8BADC1',
      });
    }
    
    if (cancelled > 0) {
      data.push({
        value: cancelled,
        color: '#FF8A5C', // Orange for cancelled
        gradientCenterColor: '#FFA880',
      });
    }

    return data.length > 0 ? data : [{ value: 1, color: colors.border, gradientCenterColor: colors.border }];
  }, [stats, colors.border]);

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

  // REAL stats for welcome card
  const welcomeStats = useMemo(() => {
    // Calculate total training time from sessions
    const totalMinutes = sessions.reduce((acc, session) => {
      if (session.started_at && session.ended_at) {
        const start = new Date(session.started_at);
        const end = new Date(session.ended_at);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60);
      }
      return acc;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      totalSessions: stats.totalSessions,
      totalAbg: myStats.upcoming, // Upcoming trainings count
      totalCompletedSessions: stats.completedSessions,
      totalTime: timeStr,
    };
  }, [stats, myStats, sessions]);

  // Format training date
  const formatTrainingDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        removeClippedSubviews={true}
      >
        {/* User Welcome Card */}
        <View style={styles.welcomeSection}>
          <WelcomeCard fullName={fullName || ''} stats={welcomeStats} loading={sessionsLoading} />
        </View>

        {/* Training Distribution Chart */}
        <View style={styles.chartSection}>
          <TrainingChart data={pieData} onDoubleTap={handleChartDoubleTap} centerValue={sessions.length} />
        </View>

        <Button title="Go to Liquid Glass Sheet" onPress={() => router.push('/(protected)/liquidGlassSheet')} />
        {/* Upcoming Trainings Section */}
        {myUpcomingTrainings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Trainings</Text>
            <View style={styles.trainingsList}>
              {myUpcomingTrainings.slice(0, 3).map((training) => (
                <Pressable
                  key={training.id}
                  style={[styles.trainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleTrainingPress(training)}
                >
                  <View style={styles.trainingHeader}>
                    <View style={[styles.statusDot, { 
                      backgroundColor: training.status === 'ongoing' ? '#7AA493' : colors.primary 
                    }]} />
                    <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                  </View>
                  <View style={styles.trainingMeta}>
                    <View style={styles.trainingMetaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.trainingMetaText, { color: colors.textMuted }]}>
                        {formatTrainingDate(training.scheduled_at)}
                      </Text>
                    </View>
                    <View style={styles.trainingMetaItem}>
                      <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.trainingMetaText, { color: colors.textMuted }]}>
                        {training.team?.name || 'Unknown Team'}
                      </Text>
                    </View>
                  </View>
                  {(training.drill_count ?? 0) > 0 && (
                    <View style={[styles.drillBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.drillBadgeText, { color: colors.primary }]}>
                        {training.drill_count} drill{(training.drill_count ?? 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
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
            <View style={styles.sessionsList}>
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
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
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  chartSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sessionsList: {
    gap: 12,
  },
  trainingsList: {
    gap: 12,
  },
  trainingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  trainingMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  trainingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trainingMetaText: {
    fontSize: 13,
  },
  drillBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  drillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});

export default PersonalHomePage;
