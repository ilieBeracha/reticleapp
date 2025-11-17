import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useSessionStore } from '@/store/sessionStore';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../components/shared/EmptyState';
import QuickActionCard from '../../components/shared/QuickActionCard';
import TrainingChart from '../../components/shared/TrainingChart';
import WelcomeCard from '../../components/shared/WelcomeCard';

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'In progress';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PersonalWorkspaceView() {
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

  // Pie chart data - elegant muted tones with depth
  const pieData = [
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
  ];

  const quickActions = [
    { 
      icon: 'add-circle' as const, 
      title: 'Start New Session', 
      subtitle: 'Begin your training', 
      isPrimary: true,
      onPress: () => createSessionSheetRef.current?.open()
    },
    { 
      icon: 'bar-chart-outline' as const, 
      title: 'View Progress', 
      subtitle: 'Track your stats', 
      color: '#5B7A8C',
      onPress: () => chartDetailsSheetRef.current?.open()
    },
    { 
      icon: 'calendar' as const, 
      title: 'Schedule Training', 
      subtitle: 'Plan your sessions', 
      color: '#5A8473',
      onPress: () => chartDetailsSheetRef.current?.open()
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {/* User Welcome Card */}
        <WelcomeCard 
          fullName={fullName || ''}
          stats={{
            totalSessions,
            totalAbg,
            totalCompletedSessions,
            totalTime: '0h',
          }}
        />

        {/* Training Distribution Chart */}
        <TrainingChart 
          data={pieData}
          onDoubleTap={() => chartDetailsSheetRef.current?.open()}
        />

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          </View>

          {quickActions.map((action, index) => (
            <QuickActionCard
              key={index}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              isPrimary={action.isPrimary}
              color={action.color}
              onPress={action.onPress}
            />
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading sessions...</Text>
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
              {sessions.map((session) => {
                const sessionPayload = session.session_data as Record<string, any> | null;
                const environment = sessionPayload?.environment ?? null;
                const trainingId = sessionPayload?.training_id ?? null;
                const drillId = sessionPayload?.drill_id ?? null;

                const statusColors: Record<string, { bg: string; text: string }> = {
                  active: { bg: colors.blue + '20', text: colors.blue },
                  completed: { bg: colors.green + '25', text: colors.green },
                  cancelled: { bg: colors.red + '20', text: colors.red },
                };
                const statusColor = statusColors[session.status] ?? { bg: colors.muted + '20', text: colors.mutedForeground };

                return (
                  <View
                    key={session.id}
                    style={[
                      styles.sessionCard,
                      { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                  >
                    <View style={styles.sessionHeader}>
                      <View>
                        <Text style={[styles.sessionTitle, { color: colors.text }]}>
                          {session.session_mode === 'group' ? 'Group Session' : 'Solo Session'}
                        </Text>
                        <Text style={[styles.sessionSubtitle, { color: colors.textMuted }]}>
                          {formatDateTime(session.started_at)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.sessionStatusBadge,
                          { backgroundColor: statusColor.bg }
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionStatusText,
                            { color: statusColor.text }
                          ]}
                        >
                          {formatLabel(session.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sessionMetaRow}>
                      <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
                        Mode
                      </Text>
                      <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
                        {formatLabel(session.session_mode)}
                      </Text>
                    </View>

                    {session.ended_at && (
                      <View style={styles.sessionMetaRow}>
                        <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
                          Ended
                        </Text>
                        <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
                          {formatDateTime(session.ended_at)}
                        </Text>
                      </View>
                    )}

                    {session.team_name && (
                      <View style={styles.sessionMetaRow}>
                        <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
                          Team
                        </Text>
                        <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
                          {session.team_name}
                        </Text>
                      </View>
                    )}

                    {trainingId && (
                      <View style={styles.sessionMetaRow}>
                        <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
                          Training ID
                        </Text>
                        <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
                          {trainingId}
                        </Text>
                      </View>
                    )}

                    {drillId && (
                      <View style={styles.sessionMetaRow}>
                        <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
                          Drill ID
                        </Text>
                        <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
                          {drillId}
                        </Text>
                      </View>
                    )}

                    {environment && Object.keys(environment).length > 0 && (
                      <View style={styles.sessionEnvironment}>
                        <Text style={[styles.environmentTitle, { color: colors.text }]}>
                          Environment
                        </Text>
                        {Object.entries(environment).map(([key, value]) => (
                          <Text
                            key={key}
                            style={[styles.environmentItem, { color: colors.textMuted }]}
                          >
                            {formatLabel(key)}: {String(value)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
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
  sessionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  sessionStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
    textTransform: 'uppercase',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sessionMetaLabel: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  sessionMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  sessionEnvironment: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  environmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  environmentItem: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
});

