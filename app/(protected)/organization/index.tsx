import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
    Feather,
    Ionicons,
    MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

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

const HomeScreen = () => {
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
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <View style={[styles.statIconContainer, { backgroundColor: colors.secondary }]}>
          <IconComponent name={icon as any} size={24} color={colors.icon} />
        </View>
        <Text style={[styles.statTitle, { color: colors.textMuted }]}>{title}</Text>
        <Text style={[styles.statCount, { color: colors.text }]}>{count}</Text>
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
      <View style={styles.chartContainer}>
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
        <View style={styles.chartCenter}>
          <Text style={[styles.chartCenterLabel, { color: colors.textMuted }]}>Task Done</Text>
          <Text style={[styles.chartCenterValue, { color: colors.text }]}>{totalTasks} Tasks</Text>
        </View>
      </View>
    );
  };

  const TaskCard = (task: TaskCardProps) => (
    <View style={[styles.taskCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
      
      <View style={styles.taskMeta}>
        <View style={styles.taskMetaItem}>
          <Feather name="calendar" size={12} color={colors.textMuted} />
          <Text style={[styles.taskMetaText, { color: colors.textMuted }]}>{task.date}</Text>
        </View>
        <View style={styles.taskMetaItem}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <Text style={[styles.taskMetaText, { color: colors.textMuted }]}>{task.hours}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${task.progress}%`,
                backgroundColor: task.statusColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.icon }]}>{task.percentage}%</Text>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: `${task.statusColor}20` },
        ]}
      >
        <Text style={[styles.statusText, { color: task.statusColor }]}>
          {task.status}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.taskFooter}>
        <View style={styles.taskStats}>
          <View style={styles.taskStatItem}>
            <Feather name="paperclip" size={14} color={colors.textMuted} />
            <Text style={[styles.taskStatText, { color: colors.icon }]}>{task.attachments}</Text>
          </View>
          <View style={styles.taskStatItem}>
            <Feather name="check-square" size={14} color={colors.textMuted} />
            <Text style={[styles.taskStatText, { color: colors.icon }]}>{task.subtasks}</Text>
          </View>
          <View style={styles.taskStatItem}>
            <Feather name="message-circle" size={14} color={colors.textMuted} />
            <Text style={[styles.taskStatText, { color: colors.icon }]}>{task.comments}</Text>
          </View>
          <View style={styles.taskStatItem}>
            <Feather name="heart" size={14} color={colors.textMuted} />
            <Text style={[styles.taskStatText, { color: colors.icon }]}>{task.likes}</Text>
          </View>
        </View>

        <View style={styles.teamMembers}>
          {task.teamMembers.map((member, idx) => (
            <View
              key={idx}
              style={[
                styles.teamMemberAvatar,
                { 
                  marginLeft: idx > 0 ? -8 : 0,
                  backgroundColor: colors.secondary,
                  borderColor: colors.card,
                },
              ]}
            >
              <Text style={styles.teamMemberText}>{member}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
       

        {/* Stat Cards */}
        <ScrollView horizontal style={styles.statsGrid}>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Productivity KPIs</Text>
            <TouchableOpacity style={[styles.periodSelector, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.periodText, { color: colors.text }]}>{selectedPeriod}</Text>
              <Feather name="chevron-down" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.kpiContent, { backgroundColor: colors.card }]}>
            <DonutChart />
            
            <View style={styles.kpiLegend}>
              {kpiData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.legendValue, { color: colors.icon }]}>({item.value.toString().padStart(2, '0')})</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Today Task */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today Task</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: colors.indigo }]}>See all</Text>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '500',
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
  bottomNav: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    // Color will be applied inline
  },
  addButton: {
    alignItems: 'center',
    marginTop: -24,
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default HomeScreen;