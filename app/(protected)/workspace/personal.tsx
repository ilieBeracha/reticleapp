import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useSessionStore } from '@/store/sessionStore';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../../components/shared/EmptyState';
import GroupedList from '../../../components/shared/GroupedList';
import QuickActionCard from '../../../components/shared/QuickActionCard';
import SessionCard from '../../../components/shared/SessionCard';
import TrainingChart from '../../../components/shared/TrainingChart';
import WelcomeCard from '../../../components/shared/WelcomeCard';

export default function PersonalWorkspacePage() {
  const colors = useColors();
  const { fullName } = useAppContext();
  const { chartDetailsSheetRef, createSessionSheetRef, setOnSessionCreated } = useModals();
  const { sessions, loading, error, loadPersonalSessions } = useSessionStore();
  const totalSessions = sessions.length;
  const totalCompletedSessions = sessions.filter((session) => session.status === 'completed').length;
  const totalAbg = 0;

  useEffect(() => {
    loadPersonalSessions();
  }, []);

  const refreshSessions = useMemo(
    () => () => {
      loadPersonalSessions();
    },
    [loadPersonalSessions]
  );

  useEffect(() => {
    setOnSessionCreated(() => refreshSessions);
    return () => setOnSessionCreated(null);
  }, [refreshSessions, setOnSessionCreated]);

  // Memoized callbacks for quick actions
  const handleStartSession = useCallback(() => {
    createSessionSheetRef.current?.open();
  }, [createSessionSheetRef]);

  const handleViewProgress = useCallback(() => {
    chartDetailsSheetRef.current?.open();
  }, [chartDetailsSheetRef]);

  const handleScheduleTraining = useCallback(() => {
    chartDetailsSheetRef.current?.open();
  }, [chartDetailsSheetRef]);

  const handleChartDoubleTap = useCallback(() => {
    chartDetailsSheetRef.current?.open();
  }, [chartDetailsSheetRef]);

  // Memoize stats object
  const stats = useMemo(() => ({
    totalSessions,
    totalAbg,
    totalCompletedSessions,
    totalTime: '0h',
  }), [totalSessions, totalAbg, totalCompletedSessions]);

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

  const quickActions = useMemo(() => [
    { 
      icon: 'add-circle' as const, 
      title: 'Start New Session', 
      subtitle: 'Begin your training', 
      isPrimary: true,
      onPress: handleStartSession
    },
    { 
      icon: 'bar-chart-outline' as const, 
      title: 'View Progress', 
      subtitle: 'Track your stats', 
      color: '#5B7A8C',
      onPress: handleViewProgress
    },
    { 
      icon: 'calendar' as const, 
      title: 'Schedule Training', 
      subtitle: 'Plan your sessions', 
      color: '#5A8473',
      onPress: handleScheduleTraining
    },
  ], [handleStartSession, handleViewProgress, handleScheduleTraining]);

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

  return (
    <View style={containerStyle}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        removeClippedSubviews={true}
      >
        {/* User Welcome Card */}
        <WelcomeCard 
          fullName={fullName || ''}
          stats={stats}
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
                isPrimary={action.isPrimary}
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

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={loadingTextStyle}>Loading sessions...</Text>
            </View>
          ) : error ? (
            <EmptyState
              icon="warning-outline"
              title="Unable to load sessions"
              subtitle={error}
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
});

