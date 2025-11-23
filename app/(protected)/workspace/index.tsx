import EmptyState from '@/components/shared/EmptyState';
import GroupedList from '@/components/shared/GroupedList';
import QuickActionCard from '@/components/shared/QuickActionCard';
import SessionCard from '@/components/shared/SessionCard';
import TrainingChart from '@/components/shared/TrainingChart';
import WelcomeCard from '@/components/shared/WelcomeCard';
import { Colors } from '@/constants/Colors';
import { useModals } from '@/contexts/ModalContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useSessionStats } from '@/hooks/useSessionStats';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ============================================================================
// PERSONAL MODE COMPONENT (Original workspace/index.tsx)
// ============================================================================
function PersonalHomePage() {
  const colors = useColors();
  const router = useRouter();
  const { fullName, activeWorkspace, workspaces } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { chartDetailsSheetRef, createSessionSheetRef, createTeamSheetRef, setOnSessionCreated, setOnTeamCreated } = useModals();
  const { teams, loadingTeams, sessions, sessionsLoading, sessionsError, loadTeams, refreshSessions } = useWorkspaceData();
  
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
    personalStyles.container,
    { backgroundColor: colors.background }
  ], [colors.background]);

  const sectionTitleStyle = useMemo(() => [
    personalStyles.sectionTitle,
    { color: colors.text }
  ], [colors.text]);

  const loadingTextStyle = useMemo(() => [
    personalStyles.loadingText,
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
        style={personalStyles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={personalStyles.content}
        removeClippedSubviews={true}
      >
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
        <View style={personalStyles.actionsSection}>
          <View style={personalStyles.sectionHeader}>
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
        <View style={personalStyles.activitySection}>
          <View style={personalStyles.sectionHeader}>
            <Text style={sectionTitleStyle}>Recent Activity</Text>
          </View>

          {sessionsLoading ? (
            <View style={personalStyles.loadingState}>
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
            <View style={personalStyles.sessionList}>
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

// ============================================================================
// ORGANIZATION MODE COMPONENT (Original organization/index.tsx)
// ============================================================================
interface StatCardProps {
  icon: string;
  title: string;
  count: string;
  iconFamily: 'feather' | 'material' | 'ionicons';
}

interface TaskCardProps {
  title: string;
  date: string;
  hours: string;
  progress: number;
  status: string;
  statusColor: string;
  percentage: number;
  attachments: number;
  subtasks: string;
  comments: number;
  likes: number;
  teamMembers: string[];
}

function OrganizationHomePage() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');

  // KPI Data
  const kpiData = [
    { label: 'Stuck', value: 2, color: colors.red, percentage: 8 },
    { label: 'In Progress', value: 3, color: colors.yellow, percentage: 26 },
    { label: 'In Review', value: 3, color: colors.blue, percentage: 12 },
    { label: 'Done', value: 3, color: colors.green, percentage: 54 },
  ];

  const totalTasks = 250;

  // Today's Tasks
  const tasks: TaskCardProps[] = [
    {
      title: 'Create mood boards and visual references mobile apps.',
      date: '12/06/2024',
      hours: '09 hrs',
      progress: 26,
      status: 'On Progress',
      statusColor: '#FFD93D',
      percentage: 26,
      attachments: 2,
      subtasks: '02 / 12',
      comments: 2,
      likes: 12,
      teamMembers: ['👨‍💼', '👩‍💼', '10+'],
    },
    {
      title: 'Create mood boards and visual references mobile apps.',
      date: '12/06/2024',
      hours: '09 hrs',
      progress: 26,
      status: 'On Progress',
      statusColor: '#FFD93D',
      percentage: 26,
      attachments: 2,
      subtasks: '02 / 12',
      comments: 2,
      likes: 12,
      teamMembers: ['👨‍💼', '👩‍💼'],
    },
  ];

  const StatCard = ({ icon, title, count, iconFamily }: StatCardProps) => {
    const IconComponent =
      iconFamily === 'feather'
        ? Feather
        : iconFamily === 'material'
        ? MaterialCommunityIcons
        : Ionicons;

    return (
      <View style={[orgStyles.statCard, { backgroundColor: colors.card }]}>
        <View style={[orgStyles.statIconContainer, { backgroundColor: colors.secondary }]}>
          <IconComponent name={icon as any} size={24} color={colors.icon} />
        </View>
        <Text style={[orgStyles.statTitle, { color: colors.textMuted }]}>{title}</Text>
        <Text style={[orgStyles.statCount, { color: colors.text }]}>{count}</Text>
      </View>
    );
  };

  const DonutChart = () => {
    const radius = 70;
    const strokeWidth = 20;
    const center = 90;
    const circumference = 2 * Math.PI * radius;

    let currentAngle = -90; // Start from top

    return (
      <View style={orgStyles.chartContainer}>
        <Svg width={180} height={180}>
          <G rotation={0} origin={`${center}, ${center}`}>
            {kpiData.map((item, index) => {
              const percentage = item.percentage;
              const strokeDashoffset =
                circumference - (percentage / 100) * circumference;
              const rotation = currentAngle;
              currentAngle += (percentage / 100) * 360;

              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  rotation={rotation}
                  origin={`${center}, ${center}`}
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>
        <View style={orgStyles.chartCenter}>
          <Text style={[orgStyles.chartCenterLabel, { color: colors.textMuted }]}>Task Done</Text>
          <Text style={[orgStyles.chartCenterValue, { color: colors.text }]}>{totalTasks} Tasks</Text>
        </View>
      </View>
    );
  };

  const TaskCard = (task: TaskCardProps) => (
    <View style={[orgStyles.taskCard, { backgroundColor: colors.card }]}>
      <Text style={[orgStyles.taskTitle, { color: colors.text }]}>{task.title}</Text>
      
      <View style={orgStyles.taskMeta}>
        <View style={orgStyles.taskMetaItem}>
          <Feather name="calendar" size={12} color={colors.textMuted} />
          <Text style={[orgStyles.taskMetaText, { color: colors.textMuted }]}>{task.date}</Text>
        </View>
        <View style={orgStyles.taskMetaItem}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <Text style={[orgStyles.taskMetaText, { color: colors.textMuted }]}>{task.hours}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={orgStyles.progressContainer}>
        <View style={[orgStyles.progressBar, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              orgStyles.progressFill,
              {
                width: `${task.progress}%`,
                backgroundColor: task.statusColor,
              },
            ]}
          />
        </View>
        <Text style={[orgStyles.progressText, { color: colors.icon }]}>{task.percentage}%</Text>
      </View>

      {/* Status Badge */}
      <View
        style={[
          orgStyles.statusBadge,
          { backgroundColor: `${task.statusColor}20` },
        ]}
      >
        <Text style={[orgStyles.statusText, { color: task.statusColor }]}>
          {task.status}
        </Text>
      </View>

      {/* Footer */}
      <View style={orgStyles.taskFooter}>
        <View style={orgStyles.taskStats}>
          <View style={orgStyles.taskStatItem}>
            <Feather name="paperclip" size={14} color={colors.textMuted} />
            <Text style={[orgStyles.taskStatText, { color: colors.icon }]}>{task.attachments}</Text>
          </View>
          <View style={orgStyles.taskStatItem}>
            <Feather name="check-square" size={14} color={colors.textMuted} />
            <Text style={[orgStyles.taskStatText, { color: colors.icon }]}>{task.subtasks}</Text>
          </View>
          <View style={orgStyles.taskStatItem}>
            <Feather name="message-circle" size={14} color={colors.textMuted} />
            <Text style={[orgStyles.taskStatText, { color: colors.icon }]}>{task.comments}</Text>
          </View>
          <View style={orgStyles.taskStatItem}>
            <Feather name="heart" size={14} color={colors.textMuted} />
            <Text style={[orgStyles.taskStatText, { color: colors.icon }]}>{task.likes}</Text>
          </View>
        </View>

        <View style={orgStyles.teamMembers}>
          {task.teamMembers.map((member, idx) => (
            <View
              key={idx}
              style={[
                orgStyles.teamMemberAvatar,
                { 
                  marginLeft: idx > 0 ? -8 : 0,
                  backgroundColor: colors.secondary,
                  borderColor: colors.card,
                },
              ]}
            >
              <Text style={orgStyles.teamMemberText}>{member}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[orgStyles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={orgStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat Cards */}
        <ScrollView horizontal style={orgStyles.statsGrid} showsHorizontalScrollIndicator={false}>
          <StatCard
            icon="file-text"
            title="Recent Task"
            count="08 tasks"
            iconFamily="feather"
          />
          <StatCard
            icon="hourglass-half"
            title="Due Projects"
            count="03 Projects"
            iconFamily="material"
          />
          <StatCard
            icon="at"
            title="Discussions"
            count="04 Messages"
            iconFamily="feather"
          />
          <StatCard
            icon="message-circle"
            title="Comments"
            count="03 Comments"
            iconFamily="feather"
          />
        </ScrollView>

        {/* Productivity KPIs */}
        <View style={orgStyles.section}>
          <View style={orgStyles.sectionHeader}>
            <Text style={[orgStyles.sectionTitle, { color: colors.text }]}>Productivity KPIs</Text>
            <TouchableOpacity style={[orgStyles.periodSelector, { backgroundColor: colors.secondary }]}>
              <Text style={[orgStyles.periodText, { color: colors.text }]}>{selectedPeriod}</Text>
              <Feather name="chevron-down" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[orgStyles.kpiContent, { backgroundColor: colors.card }]}>
            <DonutChart />
            
            <View style={orgStyles.kpiLegend}>
              {kpiData.map((item, index) => (
                <View key={index} style={orgStyles.legendItem}>
                  <View
                    style={[
                      orgStyles.legendDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={[orgStyles.legendLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[orgStyles.legendValue, { color: colors.icon }]}>({item.value.toString().padStart(2, '0')})</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Today Task */}
        <View style={orgStyles.section}>
          <View style={orgStyles.sectionHeader}>
            <Text style={[orgStyles.sectionTitle, { color: colors.text }]}>Today Task</Text>
            <TouchableOpacity>
              <Text style={[orgStyles.seeAllText, { color: colors.indigo }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {tasks.map((task, index) => (
            <TaskCard key={index} {...task} />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT - Conditionally renders Personal or Organization mode
// ============================================================================
export default function HomePage() {
  const { activeWorkspace } = useAppContext();
  
  // If activeWorkspace is null, show Personal mode
  // If activeWorkspace exists, show Organization mode
  const isOrganizationMode = activeWorkspace !== null;

  return isOrganizationMode ? <OrganizationHomePage /> : <PersonalHomePage />;
}

// ============================================================================
// PERSONAL MODE STYLES
// ============================================================================
const personalStyles = StyleSheet.create({
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

// ============================================================================
// ORGANIZATION MODE STYLES
// ============================================================================
const orgStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    display: 'flex',
    width: '100%',
    overflow: 'scroll',
    paddingTop: 16,
    paddingHorizontal: 14,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  statCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  kpiContent: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 24,
  },
  chartContainer: {
    position: 'relative',
    width: 180,
    height: 180,
  },
  chartCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCenterLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  chartCenterValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  kpiLegend: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskMetaText: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskStats: {
    flexDirection: 'row',
    gap: 12,
  },
  taskStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskStatText: {
    fontSize: 12,
  },
  teamMembers: {
    flexDirection: 'row',
  },
  teamMemberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  teamMemberText: {
    fontSize: 10,
  },
});
