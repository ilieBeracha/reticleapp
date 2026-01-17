/**
 * Team Tab - Unified Team Workspace
 *
 * If an activeTeam is selected, the Team tab IS the team workspace.
 * There is NO additional "team page" required to see team content.
 */

import { NoTeamsEmptyState } from '@/components/teams/NoTeamsEmptyState';
import { TeamSwitcherPill, TeamSwitcherSheet } from '@/components/teams/TeamSwitcherSheet';
import { getStatusConfig } from '@/components/training';
import { COLORS, PULSE_ANIMATION } from '@/components/training/trainings.constants';
import { groupTrainingsByTimeframe } from '@/components/training/trainings.helpers';
import { styles } from '@/components/training/trainings.styles';
import { useTrainings } from '@/components/training/useTrainings';
import { useColors } from '@/hooks/ui/useColors';
import type { TrainingWithDetails } from '@/types/workspace';
import { format } from 'date-fns';
import { router } from 'expo-router';
import {
    Activity,
    BarChart3,
    BookOpen,
    Calendar,
    ChevronRight,
    Plus,
    Settings,
    Target,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// PULSE DOT - Animated live indicator
// ============================================================================
function PulseDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: PULSE_ANIMATION.minOpacity,
          duration: PULSE_ANIMATION.duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: PULSE_ANIMATION.maxOpacity,
          duration: PULSE_ANIMATION.duration,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.pulseDotContainer}>
      <Animated.View style={[styles.pulseDotOuter, { backgroundColor: color, opacity: pulseAnim }]} />
      <View style={[styles.pulseDotInner, { backgroundColor: color }]} />
    </View>
  );
}

// ============================================================================
// TRAINING ROW - Compact training item (status badge is colorful)
// ============================================================================
function TrainingRow({
  training,
  showDate,
  colors,
  onPress,
  onViewReport,
}: {
  training: TrainingWithDetails;
  showDate?: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onViewReport?: () => void;
}) {
  const statusConfig = getStatusConfig(training.status);
  const date = new Date(training.scheduled_at);
  const isLive = training.status === 'ongoing';
  const isFinished = training.status === 'finished';

  return (
    <TouchableOpacity style={[localStyles.row, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
      {/* Status badge - only colorful element */}
      <View style={[localStyles.statusBadge, { backgroundColor: statusConfig.bg }]}>
        {isLive && <PulseDot color={statusConfig.color} />}
        <Text style={[localStyles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
      </View>

      {/* Content */}
      <View style={localStyles.rowContent}>
        <Text style={[localStyles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <Text style={[localStyles.rowMeta, { color: colors.textMuted }]}>
          {showDate ? format(date, 'EEE, MMM d') + ' • ' : ''}
          {format(date, 'HH:mm')}
          {(training.drill_count ?? 0) > 0 && ` • ${training.drill_count} drills`}
        </Text>
      </View>

      {/* Report button for finished trainings */}
      {isFinished && onViewReport && (
        <TouchableOpacity
          style={[localStyles.reportBtn, { backgroundColor: '#10B98115' }]}
          onPress={(e) => {
            e.stopPropagation();
            onViewReport();
          }}
          activeOpacity={0.7}
        >
          <BarChart3 size={14} color="#10B981" />
        </TouchableOpacity>
      )}

      <ChevronRight size={16} color={colors.border} />
    </TouchableOpacity>
  );
}

// Training row styles
const localStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    minWidth: 68,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontSize: 12,
  },
  reportBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================================================
// SCHEDULE VIEW - Clean two-section layout: Upcoming & Past
// ============================================================================
function ScheduleView({
  trainings,
  colors,
  onPress,
  onCreateNew,
  canSchedule,
}: {
  trainings: TrainingWithDetails[];
  colors: ReturnType<typeof useColors>;
  onPress: (training: TrainingWithDetails) => void;
  onCreateNew: () => void;
  canSchedule: boolean;
}) {
  const [showAllPast, setShowAllPast] = useState(false);
  const grouped = useMemo(() => groupTrainingsByTimeframe(trainings), [trainings]);

  // Combine all upcoming trainings into a single list (live, today, tomorrow, this week, upcoming)
  const upcomingTrainings = useMemo(
    () => [...grouped.live, ...grouped.today, ...grouped.tomorrow, ...grouped.thisWeek, ...grouped.upcoming],
    [grouped]
  );

  const pastTrainings = useMemo(() => grouped.past.filter((t) => t.status === 'finished'), [grouped.past]);

  // Navigate to training report
  const handleViewReport = useCallback((trainingId: string) => {
    router.push({
      pathname: '/(protected)/trainingReport',
      params: { trainingId },
    });
  }, []);

  // Get relative time label for training
  const getTimeLabel = (training: TrainingWithDetails) => {
    const date = new Date(training.scheduled_at);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (training.status === 'ongoing') return 'Now';
    if (date.toDateString() === now.toDateString()) return format(date, 'HH:mm');
    if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  return (
    <View style={scheduleStyles.container}>
      {/* Header with add button */}
      <View style={scheduleStyles.header}>
        <Text style={[scheduleStyles.headerTitle, { color: colors.text }]}>Training Schedule</Text>
        {canSchedule && (
          <TouchableOpacity
            style={[scheduleStyles.addBtn, { backgroundColor: colors.text }]}
            onPress={onCreateNew}
            activeOpacity={0.8}
          >
            <Plus size={17} color={colors.background} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* UPCOMING SECTION */}
      <View style={scheduleStyles.section}>
          <View style={scheduleStyles.sectionHeader}>
            <View style={scheduleStyles.sectionTitleRow}>
              <View style={[scheduleStyles.sectionDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[scheduleStyles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
            </View>
            {upcomingTrainings.length > 0 && (
              <Text style={[scheduleStyles.sectionCount, { color: colors.textMuted }]}>{upcomingTrainings.length}</Text>
            )}
          </View>

          {upcomingTrainings.length === 0 ? (
            <View style={[scheduleStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Calendar size={20} color={colors.textMuted} style={{ opacity: 0.6 }} />
              <Text style={[scheduleStyles.emptyCardText, { color: colors.textMuted }]}>No upcoming trainings</Text>
              {canSchedule && (
                <TouchableOpacity
                  style={[scheduleStyles.emptyCardBtn, { backgroundColor: colors.secondary }]}
                  onPress={onCreateNew}
                  activeOpacity={0.7}
                >
                  <Plus size={13} color={colors.text} strokeWidth={2.5} />
                  <Text style={[scheduleStyles.emptyCardBtnText, { color: colors.text }]}>Schedule</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={scheduleStyles.list}>
              {upcomingTrainings.map((training) => {
                const isLive = training.status === 'ongoing';
                const statusConfig = getStatusConfig(training.status);

                return (
                  <TouchableOpacity
                    key={training.id}
                    style={[
                      scheduleStyles.trainingRow,
                      { backgroundColor: colors.card, borderColor: isLive ? COLORS.live + '40' : colors.border },
                    ]}
                    onPress={() => onPress(training)}
                    activeOpacity={0.7}
                  >
                    {/* Time/Status indicator */}
                    <View
                      style={[
                        scheduleStyles.timeIndicator,
                        { backgroundColor: isLive ? COLORS.live : colors.secondary },
                      ]}
                    >
                      {isLive && <PulseDot color="#fff" />}
                      <Text style={[scheduleStyles.timeText, { color: isLive ? '#fff' : colors.textMuted }]}>
                        {getTimeLabel(training)}
                      </Text>
                    </View>

                    {/* Content */}
                    <View style={scheduleStyles.rowContent}>
                      <Text style={[scheduleStyles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                        {training.title}
                      </Text>
                      {(training.drill_count ?? 0) > 0 && (
                        <Text style={[scheduleStyles.rowMeta, { color: colors.textMuted }]}>
                          {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>

                    <ChevronRight size={16} color={colors.border} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

      {/* PAST SECTION */}
      <View style={scheduleStyles.section}>
        <View style={scheduleStyles.sectionHeader}>
          <View style={scheduleStyles.sectionTitleRow}>
            <View style={[scheduleStyles.sectionDot, { backgroundColor: colors.textMuted, opacity: 0.5 }]} />
            <Text style={[scheduleStyles.sectionTitle, { color: colors.text }]}>Completed</Text>
          </View>
          {pastTrainings.length > 0 && (
            <Text style={[scheduleStyles.sectionCount, { color: colors.textMuted }]}>{pastTrainings.length}</Text>
          )}
        </View>

        {pastTrainings.length === 0 ? (
          <View style={[scheduleStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <BarChart3 size={20} color={colors.textMuted} style={{ opacity: 0.6 }} />
            <Text style={[scheduleStyles.emptyCardText, { color: colors.textMuted }]}>No completed trainings yet</Text>
          </View>
        ) : (
          <>
            <View style={scheduleStyles.list}>
              {(showAllPast ? pastTrainings : pastTrainings.slice(0, 3)).map((training) => (
                <TouchableOpacity
                  key={training.id}
                  style={[scheduleStyles.trainingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onPress(training)}
                  activeOpacity={0.7}
                >
                  {/* Date indicator */}
                  <View style={[scheduleStyles.dateIndicator, { backgroundColor: colors.secondary }]}>
                    <Text style={[scheduleStyles.dateText, { color: colors.textMuted }]}>
                      {format(new Date(training.scheduled_at), 'MMM d')}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={scheduleStyles.rowContent}>
                    <Text style={[scheduleStyles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    {(training.drill_count ?? 0) > 0 && (
                      <Text style={[scheduleStyles.rowMeta, { color: colors.textMuted }]}>
                        {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>

                  {/* Report button */}
                  <TouchableOpacity
                    style={[scheduleStyles.reportBtn, { backgroundColor: '#10B98112' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleViewReport(training.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <BarChart3 size={14} color="#10B981" />
                  </TouchableOpacity>

                  <ChevronRight size={16} color={colors.border} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Show more/less */}
            {pastTrainings.length > 3 && (
              <TouchableOpacity
                style={[scheduleStyles.showMoreBtn, { borderColor: colors.border }]}
                onPress={() => setShowAllPast(!showAllPast)}
                activeOpacity={0.7}
              >
                <Text style={[scheduleStyles.showMoreText, { color: colors.textMuted }]}>
                  {showAllPast ? 'Show less' : `View all ${pastTrainings.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// Schedule section styles
const scheduleStyles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section styles
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Training list
  list: {
    gap: 8,
  },
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  timeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    minWidth: 58,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    minWidth: 58,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontSize: 12,
  },
  reportBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyCardText: {
    flex: 1,
    fontSize: 13,
  },
  emptyCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  emptyCardBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Show more
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    teamState,
    teams,
    activeTeamId,
    activeTeam,
    initialized,
    teamsLoading,
    canSchedule,
    canManage,
    activeTeamTrainings,
    liveTraining,
    members,
    memberStats,
    teamStats,
    refreshing,
    activeTab,
    switcherOpen,
    loadingTeamTrainings,
    showSwitcher,
    roleConfig,
    onRefresh,
    handleTabChange,
    handleTrainingPress,
    handleCreateTraining,
    handleOpenLibrary,
    handleViewMembers,
    handleInviteMember,
    handleTeamSettings,
    setSwitcherOpen,
  } = useTrainings();

  // Loading state
  if (!initialized || (teamsLoading && teams.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // No teams - Empty State
  if (teamState === 'no_teams') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NoTeamsEmptyState />
      </View>
    );
  }

  // Main render
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: 'transparent' }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Team</Text>
          <View style={styles.headerRight}>
            {showSwitcher ? (
              <TeamSwitcherPill onPress={() => setSwitcherOpen(true)} />
            ) : (
              activeTeam && (
                <View style={[styles.singleTeamPill, { backgroundColor: colors.secondary }]}>
                  <Users size={14} color={colors.primary} />
                  <Text style={[styles.singleTeamName, { color: colors.text }]} numberOfLines={1}>
                    {activeTeam.name}
                  </Text>
                  {roleConfig && (
                    <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
                      <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
                    </View>
                  )}
                </View>
              )
            )}
          </View>
        </View>

        {/* Tab Bar - Unified for all roles */}
        <View style={[headerStyles.tabBar, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[
              headerStyles.tabItem,
              activeTab === 'calendar' && [headerStyles.tabItemActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => handleTabChange('calendar')}
          >
            <Calendar size={16} color={activeTab === 'calendar' ? colors.text : colors.textMuted} />
            <Text
              style={[
                headerStyles.tabText,
                { color: activeTab === 'calendar' ? colors.text : colors.textMuted },
                activeTab === 'calendar' && headerStyles.tabTextActive,
              ]}
            >
              Schedule
            </Text>
          </TouchableOpacity>

          {/* Team tab - visible to all roles */}
          <TouchableOpacity
            style={[
              headerStyles.tabItem,
              activeTab === 'team' && [headerStyles.tabItemActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => handleTabChange('team')}
          >
            <Users size={16} color={activeTab === 'team' ? colors.text : colors.textMuted} />
            <Text
              style={[
                headerStyles.tabText,
                { color: activeTab === 'team' ? colors.text : colors.textMuted },
                activeTab === 'team' && headerStyles.tabTextActive,
              ]}
            >
              Team
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, loadingTeamTrainings && styles.contentCentered]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {loadingTeamTrainings ? (
          <View style={styles.switchingLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.switchingText, { color: colors.textMuted }]}>Loading team data...</Text>
          </View>
        ) : (
          <>
            {/* SCHEDULE TAB - Same for all roles */}
            {activeTab === 'calendar' && (
              <ScheduleView
                trainings={activeTeamTrainings}
                colors={colors}
                onPress={handleTrainingPress}
                onCreateNew={handleCreateTraining}
                canSchedule={canSchedule}
              />
            )}

            {/* TEAM TAB - Unified for all roles, with role-conditional actions */}
            {activeTab === 'team' && (
              <UnifiedTeamTab
                colors={colors}
                activeTeam={activeTeam}
                activeTeamId={activeTeamId}
                members={members}
                memberStats={memberStats}
                teamStats={teamStats}
                roleConfig={roleConfig}
                canManage={canManage}
                liveTraining={liveTraining}
                pastTrainings={groupTrainingsByTimeframe(activeTeamTrainings).past.filter(
                  (t) => t.status === 'finished'
                )}
                onTrainingPress={handleTrainingPress}
                onCreateTraining={handleCreateTraining}
                onOpenLibrary={handleOpenLibrary}
                onViewMembers={handleViewMembers}
                onInviteMember={handleInviteMember}
                onTeamSettings={handleTeamSettings}
              />
            )}
          </>
        )}
      </ScrollView>

      <TeamSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

// Header tab styles
const headerStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '600',
  },
});

// ============================================================================
// MANAGE TAB COMPONENT - Commander Dashboard
// ============================================================================
interface ManageTabProps {
  colors: ReturnType<typeof useColors>;
  activeTeam: any;
  activeTeamId: string | null;
  liveTraining: TrainingWithDetails | undefined;
  memberStats: any;
  teamStats: any;
  members: any[];
  roleConfig: any;
  pastTrainings: TrainingWithDetails[];
  onTrainingPress: (training: TrainingWithDetails) => void;
  onCreateTraining: () => void;
  onOpenLibrary: () => void;
  onViewMembers: () => void;
  onInviteMember: () => void;
  onTeamSettings: () => void;
}

function ManageTab({
  colors,
  activeTeam,
  liveTraining,
  memberStats,
  teamStats,
  members,
  roleConfig,
  pastTrainings,
  onTrainingPress,
  onCreateTraining,
  onOpenLibrary,
  onViewMembers,
  onInviteMember,
  onTeamSettings,
}: ManageTabProps) {
  const progressPct = Math.min(100, (teamStats.totalShots / teamStats.weeklyGoal) * 100);

  // Navigate to training report
  const handleViewReport = useCallback((trainingId: string) => {
    router.push({
      pathname: '/(protected)/trainingReport',
      params: { trainingId },
    });
  }, []);

  return (
    <View style={manageStyles.container}>
      {/* Live Session Banner - Full width, prominent */}
      {liveTraining && (
        <TouchableOpacity
          style={[manageStyles.liveBanner, { borderColor: COLORS.live + '40' }]}
          onPress={() => onTrainingPress(liveTraining)}
          activeOpacity={0.85}
        >
          <View style={manageStyles.liveBannerGlow} />
          <View style={manageStyles.liveIndicator}>
            <PulseDot color="#fff" />
            <Text style={manageStyles.liveLabel}>LIVE</Text>
          </View>
          <View style={manageStyles.liveBannerContent}>
            <Text style={manageStyles.liveBannerTitle} numberOfLines={1}>
              {liveTraining.title}
            </Text>
            <Text style={manageStyles.liveBannerMeta}>{memberStats.training} active • Tap to view</Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* Quick Actions - Top level for easy access */}
      <View style={manageStyles.quickActions}>
        <TouchableOpacity
          style={[manageStyles.primaryAction, { backgroundColor: colors.text }]}
          onPress={onCreateTraining}
          activeOpacity={0.85}
        >
          <Plus size={18} color={colors.background} strokeWidth={2.5} />
          <Text style={[manageStyles.primaryActionText, { color: colors.background }]}>New Training</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[manageStyles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onOpenLibrary}
          activeOpacity={0.7}
        >
          <BookOpen size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[manageStyles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onInviteMember}
          activeOpacity={0.7}
        >
          <UserPlus size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats Overview - Clean horizontal cards */}
      <View style={manageStyles.statsSection}>
        <View style={manageStyles.statsHeader}>
          <Text style={[manageStyles.statsSectionTitle, { color: colors.text }]}>This Week</Text>
          <View
            style={[manageStyles.goalPill, { backgroundColor: progressPct >= 100 ? '#10B98115' : colors.secondary }]}
          >
            <Text style={[manageStyles.goalPillText, { color: progressPct >= 100 ? '#10B981' : colors.textMuted }]}>
              {Math.round(progressPct)}% of goal
            </Text>
          </View>
        </View>

        <View style={manageStyles.statsRow}>
          <View style={[manageStyles.statCard, { backgroundColor: colors.card }]}>
            <Activity size={16} color="#3B82F6" />
            <Text style={[manageStyles.statCardValue, { color: colors.text }]}>{teamStats.sessionsThisWeek}</Text>
            <Text style={[manageStyles.statCardLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
          <View style={[manageStyles.statCard, { backgroundColor: colors.card }]}>
            <Zap size={16} color="#F59E0B" />
            <Text style={[manageStyles.statCardValue, { color: colors.text }]}>
              {teamStats.totalShots >= 1000 ? `${(teamStats.totalShots / 1000).toFixed(1)}k` : teamStats.totalShots}
            </Text>
            <Text style={[manageStyles.statCardLabel, { color: colors.textMuted }]}>Shots</Text>
          </View>
          <View style={[manageStyles.statCard, { backgroundColor: colors.card }]}>
            <Target size={16} color="#10B981" />
            <Text style={[manageStyles.statCardValue, { color: colors.text }]}>{teamStats.avgAccuracy}%</Text>
            <Text style={[manageStyles.statCardLabel, { color: colors.textMuted }]}>Accuracy</Text>
          </View>
        </View>
      </View>

      {/* Team Status - Compact member overview */}
      <TouchableOpacity
        style={[manageStyles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onViewMembers}
        activeOpacity={0.7}
      >
        <View style={manageStyles.teamCardHeader}>
          <View style={manageStyles.teamCardLeft}>
            <View style={manageStyles.memberAvatarStack}>
              {members.slice(0, 4).map((m, i) => (
                <View
                  key={m.user_id}
                  style={[
                    manageStyles.stackedAvatar,
                    {
                      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i % 4],
                      marginLeft: i > 0 ? -10 : 0,
                      zIndex: 4 - i,
                    },
                  ]}
                >
                  <Text style={manageStyles.stackedAvatarText}>
                    {(m.profile?.full_name?.charAt(0) || m.profile?.email?.charAt(0) || '?').toUpperCase()}
                  </Text>
                </View>
              ))}
              {members.length > 4 && (
                <View
                  style={[
                    manageStyles.stackedAvatar,
                    manageStyles.moreAvatar,
                    { backgroundColor: colors.secondary, marginLeft: -10 },
                  ]}
                >
                  <Text style={[manageStyles.stackedAvatarText, { color: colors.textMuted, fontSize: 10 }]}>
                    +{members.length - 4}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={[manageStyles.teamCardTitle, { color: colors.text }]}>{members.length} Members</Text>
              <View style={manageStyles.statusDots}>
                {memberStats.training > 0 && (
                  <View style={manageStyles.statusDotItem}>
                    <View style={[manageStyles.miniDot, { backgroundColor: COLORS.training }]} />
                    <Text style={[manageStyles.statusDotText, { color: colors.textMuted }]}>
                      {memberStats.training}
                    </Text>
                  </View>
                )}
                <View style={manageStyles.statusDotItem}>
                  <View style={[manageStyles.miniDot, { backgroundColor: COLORS.online }]} />
                  <Text style={[manageStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.online}</Text>
                </View>
                <View style={manageStyles.statusDotItem}>
                  <View style={[manageStyles.miniDot, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
                  <Text style={[manageStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.offline}</Text>
                </View>
              </View>
            </View>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* Management Menu - Clean list */}
      <View style={manageStyles.menuSection}>
        <Text style={[manageStyles.menuSectionTitle, { color: colors.textMuted }]}>MANAGE</Text>

        <View style={[manageStyles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={manageStyles.menuItem} onPress={onViewMembers} activeOpacity={0.6}>
            <View style={[manageStyles.menuIcon, { backgroundColor: colors.primary + '12' }]}>
              <Users size={15} color={colors.primary} />
            </View>
            <Text style={[manageStyles.menuItemText, { color: colors.text }]}>Members & Roles</Text>
            <ChevronRight size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={[manageStyles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={manageStyles.menuItem} onPress={onOpenLibrary} activeOpacity={0.6}>
            <View style={[manageStyles.menuIcon, { backgroundColor: '#3B82F612' }]}>
              <BookOpen size={15} color="#3B82F6" />
            </View>
            <Text style={[manageStyles.menuItemText, { color: colors.text }]}>Drill Library</Text>
            <ChevronRight size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={[manageStyles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={manageStyles.menuItem} onPress={onTeamSettings} activeOpacity={0.6}>
            <View style={[manageStyles.menuIcon, { backgroundColor: colors.secondary }]}>
              <Settings size={15} color={colors.textMuted} />
            </View>
            <Text style={[manageStyles.menuItemText, { color: colors.text }]}>Settings</Text>
            <ChevronRight size={16} color={colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Training Reports Section */}
      {pastTrainings.length > 0 && (
        <View style={manageStyles.menuSection}>
          <Text style={[manageStyles.menuSectionTitle, { color: colors.textMuted }]}>REPORTS</Text>

          <View style={[manageStyles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {pastTrainings.slice(0, 5).map((training, idx) => (
              <View key={training.id}>
                {idx > 0 && <View style={[manageStyles.menuDivider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  style={manageStyles.menuItem}
                  onPress={() => handleViewReport(training.id)}
                  activeOpacity={0.6}
                >
                  <View style={[manageStyles.menuIcon, { backgroundColor: '#10B98112' }]}>
                    <BarChart3 size={15} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[manageStyles.menuItemText, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    <Text style={[manageStyles.reportDate, { color: colors.textMuted }]}>
                      {format(new Date(training.scheduled_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.border} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Team Identity Footer */}
      {activeTeam && roleConfig && (
        <View style={manageStyles.teamFooter}>
          <View style={[manageStyles.teamBadge, { backgroundColor: colors.card }]}>
            <Users size={14} color={colors.textMuted} />
            <Text style={[manageStyles.teamBadgeText, { color: colors.text }]}>{activeTeam.name}</Text>
            <View style={[manageStyles.rolePill, { backgroundColor: roleConfig.color + '15' }]}>
              <Text style={[manageStyles.rolePillText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Manage tab styles
const manageStyles = StyleSheet.create({
  container: {
    gap: 20,
  },

  // Live Banner
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.live,
    borderWidth: 1,
    overflow: 'hidden',
  },
  liveBannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 11,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  liveBannerContent: {
    flex: 1,
  },
  liveBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  liveBannerMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 11,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryAction: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Stats Section
  statsSection: {
    gap: 10,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 11,
    gap: 5,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Team Card
  teamCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackedAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  moreAvatar: {
    borderWidth: 0,
  },
  teamCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 9,
  },
  statusDotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Menu Section
  menuSection: {
    gap: 8,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginLeft: 3,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 11,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 53,
  },
  reportDate: {
    fontSize: 12,
    marginTop: 2,
  },

  // Team Footer
  teamFooter: {
    alignItems: 'center',
    marginTop: 6,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});

// ============================================================================
// UNIFIED TEAM TAB - Same for all roles, with role-conditional actions
// ============================================================================
interface UnifiedTeamTabProps {
  colors: ReturnType<typeof useColors>;
  activeTeam: any;
  activeTeamId: string | null;
  members: any[];
  memberStats: any;
  teamStats: any;
  roleConfig: any;
  canManage: boolean;
  liveTraining: TrainingWithDetails | undefined;
  pastTrainings: TrainingWithDetails[];
  onTrainingPress: (training: TrainingWithDetails) => void;
  onCreateTraining: () => void;
  onOpenLibrary: () => void;
  onViewMembers: () => void;
  onInviteMember: () => void;
  onTeamSettings: () => void;
}

function UnifiedTeamTab({
  colors,
  activeTeam,
  activeTeamId,
  members,
  memberStats,
  teamStats,
  roleConfig,
  canManage,
  liveTraining,
  pastTrainings,
  onTrainingPress,
  onCreateTraining,
  onOpenLibrary,
  onViewMembers,
  onInviteMember,
  onTeamSettings,
}: UnifiedTeamTabProps) {
  const progressPct = Math.min(100, (teamStats.totalShots / teamStats.weeklyGoal) * 100);

  // Navigate to training report
  const handleViewReport = useCallback((trainingId: string) => {
    router.push({
      pathname: '/(protected)/trainingReport',
      params: { trainingId },
    });
  }, []);

  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, any[]> = {
      commanders: [],
      squad_commanders: [],
      soldiers: [],
    };

    members.forEach((member) => {
      const role = member.role?.role || 'soldier';
      if (role === 'owner' || role === 'commander') {
        groups.commanders.push(member);
      } else if (role === 'squad_commander') {
        groups.squad_commanders.push(member);
      } else {
        groups.soldiers.push(member);
      }
    });

    return groups;
  }, [members]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: '#F59E0B', bg: '#F59E0B20' };
      case 'commander':
        return { label: 'Commander', color: '#3B82F6', bg: '#3B82F620' };
      case 'squad_commander':
        return { label: 'Squad Cmdr', color: '#8B5CF6', bg: '#8B5CF620' };
      default:
        return { label: 'Soldier', color: colors.textMuted, bg: colors.secondary };
    }
  };

  const renderMember = (member: any) => {
    const role = member.role?.role || 'soldier';
    const badge = getRoleBadge(role);
    const name = member.profile?.full_name || 'Unknown';
    const squad = member.squad?.name;

    return (
      <View
        key={member.user_id}
        style={[unifiedStyles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[unifiedStyles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[unifiedStyles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={unifiedStyles.memberInfo}>
          <Text style={[unifiedStyles.memberName, { color: colors.text }]}>{name}</Text>
          <View style={unifiedStyles.memberMeta}>
            <View style={[unifiedStyles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[unifiedStyles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            {squad && <Text style={[unifiedStyles.squadName, { color: colors.textMuted }]}>• {squad}</Text>}
          </View>
        </View>
      </View>
    );
  };

  const renderMemberSection = (title: string, membersList: any[]) => {
    if (membersList.length === 0) return null;

    return (
      <View style={unifiedStyles.memberSection}>
        <Text style={[unifiedStyles.memberSectionTitle, { color: colors.textMuted }]}>
          {title.toUpperCase()} ({membersList.length})
        </Text>
        {membersList.map(renderMember)}
      </View>
    );
  };

  return (
    <View style={unifiedStyles.container}>
      {/* Live Session Banner - Visible to all */}
      {liveTraining && (
        <TouchableOpacity
          style={[unifiedStyles.liveBanner, { borderColor: COLORS.live + '40' }]}
          onPress={() => onTrainingPress(liveTraining)}
          activeOpacity={0.85}
        >
          <View style={unifiedStyles.liveBannerGlow} />
          <View style={unifiedStyles.liveIndicator}>
            <PulseDot color="#fff" />
            <Text style={unifiedStyles.liveLabel}>LIVE</Text>
          </View>
          <View style={unifiedStyles.liveBannerContent}>
            <Text style={unifiedStyles.liveBannerTitle} numberOfLines={1}>
              {liveTraining.title}
            </Text>
            <Text style={unifiedStyles.liveBannerMeta}>{memberStats.training} active • Tap to view</Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* Commander Quick Actions - Only visible to commanders */}
      {canManage && (
        <View style={unifiedStyles.quickActions}>
          <TouchableOpacity
            style={[unifiedStyles.primaryAction, { backgroundColor: colors.text }]}
            onPress={onCreateTraining}
            activeOpacity={0.85}
          >
            <Plus size={18} color={colors.background} strokeWidth={2.5} />
            <Text style={[unifiedStyles.primaryActionText, { color: colors.background }]}>New Training</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[unifiedStyles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onOpenLibrary}
            activeOpacity={0.7}
          >
            <BookOpen size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[unifiedStyles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onInviteMember}
            activeOpacity={0.7}
          >
            <UserPlus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Team Stats - Visible to commanders */}
      {canManage && (
        <View style={unifiedStyles.statsSection}>
          <View style={unifiedStyles.statsHeader}>
            <Text style={[unifiedStyles.statsSectionTitle, { color: colors.text }]}>This Week</Text>
            <View
              style={[unifiedStyles.goalPill, { backgroundColor: progressPct >= 100 ? '#10B98115' : colors.secondary }]}
            >
              <Text style={[unifiedStyles.goalPillText, { color: progressPct >= 100 ? '#10B981' : colors.textMuted }]}>
                {Math.round(progressPct)}% of goal
              </Text>
            </View>
          </View>

          <View style={unifiedStyles.statsRow}>
            <View style={[unifiedStyles.statCard, { backgroundColor: colors.card }]}>
              <Activity size={16} color="#3B82F6" />
              <Text style={[unifiedStyles.statCardValue, { color: colors.text }]}>{teamStats.sessionsThisWeek}</Text>
              <Text style={[unifiedStyles.statCardLabel, { color: colors.textMuted }]}>Sessions</Text>
            </View>
            <View style={[unifiedStyles.statCard, { backgroundColor: colors.card }]}>
              <Zap size={16} color="#F59E0B" />
              <Text style={[unifiedStyles.statCardValue, { color: colors.text }]}>
                {teamStats.totalShots >= 1000 ? `${(teamStats.totalShots / 1000).toFixed(1)}k` : teamStats.totalShots}
              </Text>
              <Text style={[unifiedStyles.statCardLabel, { color: colors.textMuted }]}>Shots</Text>
            </View>
            <View style={[unifiedStyles.statCard, { backgroundColor: colors.card }]}>
              <Target size={16} color="#10B981" />
              <Text style={[unifiedStyles.statCardValue, { color: colors.text }]}>{teamStats.avgAccuracy}%</Text>
              <Text style={[unifiedStyles.statCardLabel, { color: colors.textMuted }]}>Accuracy</Text>
            </View>
          </View>
        </View>
      )}

      {/* Team Header - Visible to all */}
      {activeTeam && (
        <TouchableOpacity
          style={[unifiedStyles.teamHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onViewMembers}
          activeOpacity={0.7}
        >
          <View style={unifiedStyles.teamHeaderLeft}>
            <View style={unifiedStyles.memberAvatarStack}>
              {members.slice(0, 4).map((m, i) => (
                <View
                  key={m.user_id}
                  style={[
                    unifiedStyles.stackedAvatar,
                    {
                      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i % 4],
                      marginLeft: i > 0 ? -10 : 0,
                      zIndex: 4 - i,
                    },
                  ]}
                >
                  <Text style={unifiedStyles.stackedAvatarText}>
                    {(m.profile?.full_name?.charAt(0) || m.profile?.email?.charAt(0) || '?').toUpperCase()}
                  </Text>
                </View>
              ))}
              {members.length > 4 && (
                <View
                  style={[
                    unifiedStyles.stackedAvatar,
                    unifiedStyles.moreAvatar,
                    { backgroundColor: colors.secondary, marginLeft: -10 },
                  ]}
                >
                  <Text style={[unifiedStyles.stackedAvatarText, { color: colors.textMuted, fontSize: 10 }]}>
                    +{members.length - 4}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={[unifiedStyles.teamCardTitle, { color: colors.text }]}>{members.length} Members</Text>
              <View style={unifiedStyles.statusDots}>
                {memberStats.training > 0 && (
                  <View style={unifiedStyles.statusDotItem}>
                    <View style={[unifiedStyles.miniDot, { backgroundColor: COLORS.training }]} />
                    <Text style={[unifiedStyles.statusDotText, { color: colors.textMuted }]}>
                      {memberStats.training}
                    </Text>
                  </View>
                )}
                <View style={unifiedStyles.statusDotItem}>
                  <View style={[unifiedStyles.miniDot, { backgroundColor: COLORS.online }]} />
                  <Text style={[unifiedStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.online}</Text>
                </View>
                <View style={unifiedStyles.statusDotItem}>
                  <View style={[unifiedStyles.miniDot, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
                  <Text style={[unifiedStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.offline}</Text>
                </View>
              </View>
            </View>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Members List - Visible to all */}
      {members.length > 0 ? (
        <>
          {renderMemberSection('Command', groupedMembers.commanders)}
          {renderMemberSection('Squad Commanders', groupedMembers.squad_commanders)}
          {renderMemberSection('Team', groupedMembers.soldiers)}
        </>
      ) : (
        <View style={unifiedStyles.emptyState}>
          <Users size={40} color={colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[unifiedStyles.emptyText, { color: colors.textMuted }]}>No team members yet</Text>
          {canManage && (
            <TouchableOpacity
              style={[unifiedStyles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={onInviteMember}
            >
              <UserPlus size={16} color="#fff" />
              <Text style={unifiedStyles.emptyButtonText}>Invite Member</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Commander Settings Menu */}
      {canManage && (
        <View style={unifiedStyles.menuSection}>
          <Text style={[unifiedStyles.menuSectionTitle, { color: colors.textMuted }]}>MANAGE</Text>
          <View style={[unifiedStyles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={unifiedStyles.menuItem} onPress={onViewMembers} activeOpacity={0.6}>
              <View style={[unifiedStyles.menuIcon, { backgroundColor: colors.primary + '12' }]}>
                <Users size={15} color={colors.primary} />
              </View>
              <Text style={[unifiedStyles.menuItemText, { color: colors.text }]}>Members & Roles</Text>
              <ChevronRight size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={[unifiedStyles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={unifiedStyles.menuItem} onPress={onOpenLibrary} activeOpacity={0.6}>
              <View style={[unifiedStyles.menuIcon, { backgroundColor: '#3B82F612' }]}>
                <BookOpen size={15} color="#3B82F6" />
              </View>
              <Text style={[unifiedStyles.menuItemText, { color: colors.text }]}>Drill Library</Text>
              <ChevronRight size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={[unifiedStyles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={unifiedStyles.menuItem} onPress={onTeamSettings} activeOpacity={0.6}>
              <View style={[unifiedStyles.menuIcon, { backgroundColor: colors.secondary }]}>
                <Settings size={15} color={colors.textMuted} />
              </View>
              <Text style={[unifiedStyles.menuItemText, { color: colors.text }]}>Settings</Text>
              <ChevronRight size={16} color={colors.border} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Training Reports - Visible to commanders */}
      {canManage && pastTrainings.length > 0 && (
        <View style={unifiedStyles.menuSection}>
          <Text style={[unifiedStyles.menuSectionTitle, { color: colors.textMuted }]}>REPORTS</Text>
          <View style={[unifiedStyles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {pastTrainings.slice(0, 5).map((training, idx) => (
              <View key={training.id}>
                {idx > 0 && <View style={[unifiedStyles.menuDivider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  style={unifiedStyles.menuItem}
                  onPress={() => handleViewReport(training.id)}
                  activeOpacity={0.6}
                >
                  <View style={[unifiedStyles.menuIcon, { backgroundColor: '#10B98112' }]}>
                    <BarChart3 size={15} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[unifiedStyles.menuItemText, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    <Text style={[unifiedStyles.reportDate, { color: colors.textMuted }]}>
                      {format(new Date(training.scheduled_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.border} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Team Identity Footer - Visible to all */}
      {activeTeam && roleConfig && (
        <View style={unifiedStyles.teamFooter}>
          <View style={[unifiedStyles.teamBadge, { backgroundColor: colors.card }]}>
            <Users size={14} color={colors.textMuted} />
            <Text style={[unifiedStyles.teamBadgeText, { color: colors.text }]}>{activeTeam.name}</Text>
            <View style={[unifiedStyles.rolePill, { backgroundColor: roleConfig.color + '15' }]}>
              <Text style={[unifiedStyles.rolePillText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Unified Team Tab styles
const unifiedStyles = StyleSheet.create({
  container: {
    gap: 20,
  },

  // Live Banner
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.live,
    borderWidth: 1,
    overflow: 'hidden',
  },
  liveBannerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 11,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  liveBannerContent: {
    flex: 1,
  },
  liveBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  liveBannerMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 11,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryAction: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Stats Section
  statsSection: {
    gap: 10,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 11,
    gap: 5,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Team Header
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackedAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  moreAvatar: {
    borderWidth: 0,
  },
  teamCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 9,
  },
  statusDotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Member Section
  memberSection: {
    gap: 8,
  },
  memberSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 3,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  squadName: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 14,
  },
  emptyText: {
    fontSize: 14,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Menu Section
  menuSection: {
    gap: 8,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginLeft: 3,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 11,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 53,
  },
  reportDate: {
    fontSize: 12,
    marginTop: 2,
  },

  // Team Footer
  teamFooter: {
    alignItems: 'center',
    marginTop: 6,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});

// ============================================================================
// TEAM MEMBERS TAB (DEPRECATED - kept for backwards compatibility)
// ============================================================================
interface TeamMembersTabProps {
  colors: ReturnType<typeof useColors>;
  members: any[];
  activeTeam: any;
}

function TeamMembersTab({ colors, members, activeTeam }: TeamMembersTabProps) {
  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, any[]> = {
      commanders: [],
      squad_commanders: [],
      soldiers: [],
    };

    members.forEach((member) => {
      // Role is nested: member.role.role
      const role = member.role?.role || 'soldier';
      if (role === 'owner' || role === 'commander') {
        groups.commanders.push(member);
      } else if (role === 'squad_commander') {
        groups.squad_commanders.push(member);
      } else {
        groups.soldiers.push(member);
      }
    });

    return groups;
  }, [members]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: '#F59E0B', bg: '#F59E0B20' };
      case 'commander':
        return { label: 'Commander', color: '#3B82F6', bg: '#3B82F620' };
      case 'squad_commander':
        return { label: 'Squad Cmdr', color: '#8B5CF6', bg: '#8B5CF620' };
      default:
        return { label: 'Soldier', color: colors.textMuted, bg: colors.secondary };
    }
  };

  const renderMember = (member: any) => {
    // Role is nested: member.role.role
    const role = member.role?.role || 'soldier';
    const badge = getRoleBadge(role);
    const name = member.profile?.full_name || 'Unknown';
    const squad = member.squad?.name;

    return (
      <View
        key={member.user_id}
        style={[teamMembersStyles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[teamMembersStyles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[teamMembersStyles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={teamMembersStyles.memberInfo}>
          <Text style={[teamMembersStyles.memberName, { color: colors.text }]}>{name}</Text>
          <View style={teamMembersStyles.memberMeta}>
            <View style={[teamMembersStyles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[teamMembersStyles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            {squad && <Text style={[teamMembersStyles.squadName, { color: colors.textMuted }]}>• {squad}</Text>}
          </View>
        </View>
      </View>
    );
  };

  const renderSection = (title: string, membersList: any[]) => {
    if (membersList.length === 0) return null;

    return (
      <View style={teamMembersStyles.section}>
        <Text style={[teamMembersStyles.sectionTitle, { color: colors.textMuted }]}>
          {title.toUpperCase()} ({membersList.length})
        </Text>
        {membersList.map(renderMember)}
      </View>
    );
  };

  return (
    <View style={teamMembersStyles.container}>
      {/* Team Header */}
      {activeTeam && (
        <View style={[teamMembersStyles.teamHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[teamMembersStyles.teamIcon, { backgroundColor: colors.primary + '15' }]}>
            <Users size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[teamMembersStyles.teamName, { color: colors.text }]}>{activeTeam.name}</Text>
            <Text style={[teamMembersStyles.memberCount, { color: colors.textMuted }]}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <View style={teamMembersStyles.emptyState}>
          <Users size={40} color={colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[teamMembersStyles.emptyText, { color: colors.textMuted }]}>No team members yet</Text>
        </View>
      ) : (
        <>
          {renderSection('Command', groupedMembers.commanders)}
          {renderSection('Squad Commanders', groupedMembers.squad_commanders)}
          {renderSection('Team', groupedMembers.soldiers)}
        </>
      )}
    </View>
  );
}

const teamMembersStyles = StyleSheet.create({
  container: {
    gap: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  memberCount: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 3,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  squadName: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 14,
  },
  emptyText: {
    fontSize: 14,
  },
});
