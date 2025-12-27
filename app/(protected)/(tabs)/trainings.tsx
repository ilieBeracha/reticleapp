/**
 * Team Tab - Unified Team Workspace
 * 
 * If an activeTeam is selected, the Team tab IS the team workspace.
 * There is NO additional "team page" required to see team content.
 */

import { NoTeamsEmptyState } from '@/components/team/NoTeamsEmptyState';
import { TeamSwitcherPill, TeamSwitcherSheet } from '@/components/team/TeamSwitcherSheet';
import {
  COLORS,
  calculateQuickStats,
  getStatusConfig,
  groupTrainingsByTimeframe,
  PULSE_ANIMATION,
  styles,
  useTrainings,
} from '@/components/trainings';
import { useColors } from '@/hooks/ui/useColors';
import type { TrainingWithDetails } from '@/types/workspace';
import { format } from 'date-fns';
import {
  Activity,
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
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
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
      <Animated.View
        style={[styles.pulseDotOuter, { backgroundColor: color, opacity: pulseAnim }]}
      />
      <View style={[styles.pulseDotInner, { backgroundColor: color }]} />
    </View>
  );
}

// ============================================================================
// SCHEDULE VIEW - Agenda style with status
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
  const grouped = useMemo(() => groupTrainingsByTimeframe(trainings), [trainings]);
  const stats = useMemo(() => calculateQuickStats(grouped), [grouped]);
  const hasAny = trainings.length > 0;

  const renderGroup = useCallback(
    (title: string, items: TrainingWithDetails[], showDate = false, isLive = false) => {
      if (items.length === 0) return null;

  return (
        <View style={styles.scheduleGroup}>
          <View style={styles.scheduleGroupHeader}>
            {isLive && <PulseDot color={COLORS.live} />}
            <Text style={[styles.scheduleGroupTitle, { color: isLive ? COLORS.live : colors.textMuted }]}>
              {title}
        </Text>
      </View>
          {items.map(training => {
            const statusConfig = getStatusConfig(training.status);
            const date = new Date(training.scheduled_at);
            const isLiveItem = training.status === 'ongoing';

          return (
            <TouchableOpacity
                key={training.id}
              style={[
                  styles.scheduleItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isLiveItem && styles.scheduleItemLive,
                ]}
                onPress={() => onPress(training)}
                activeOpacity={0.7}
              >
                <View style={[styles.scheduleStatus, { backgroundColor: statusConfig.bg }]}>
                  {isLiveItem && <PulseDot color={statusConfig.color} />}
                  <Text style={[styles.scheduleStatusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
              </Text>
                </View>
                <View style={styles.scheduleContent}>
                  <Text style={[styles.scheduleTitle, { color: colors.text }]} numberOfLines={1}>
                    {training.title}
              </Text>
                  <View style={styles.scheduleMeta}>
                    <Text style={[styles.scheduleTime, { color: colors.textMuted }]}>
                      {showDate ? format(date, 'EEE, MMM d') + ' · ' : ''}
                      {format(date, 'HH:mm')}
                    </Text>
                    {training.drill_count ? (
                      <>
                        <View style={[styles.scheduleMetaDot, { backgroundColor: colors.border }]} />
                        <Text style={[styles.scheduleDrills, { color: colors.textMuted }]}>
                          {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
                        </Text>
                      </>
                    ) : null}
                </View>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
    </View>
  );
    },
    [colors, onPress]
  );

  return (
    <View style={styles.scheduleContainer}>
      {/* Header with Quick Stats */}
      <View style={styles.scheduleHeader}>
        <View>
          <Text style={[styles.scheduleHeaderTitle, { color: colors.text }]}>Schedule</Text>
          {hasAny && (
            <View style={styles.quickStats}>
              {stats.live > 0 && (
                <View style={styles.quickStatItem}>
                  <PulseDot color={COLORS.live} />
                  <Text style={[styles.quickStatText, { color: COLORS.live }]}>{stats.live} Live</Text>
                </View>
              )}
              {stats.today > 0 && (
                <View style={styles.quickStatItem}>
                  <View style={[styles.quickStatDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.quickStatText, { color: colors.textMuted }]}>{stats.today} Today</Text>
                </View>
              )}
              {stats.thisWeek > 0 && (
                <View style={styles.quickStatItem}>
                  <View style={[styles.quickStatDot, { backgroundColor: colors.border }]} />
                  <Text style={[styles.quickStatText, { color: colors.textMuted }]}>{stats.thisWeek} This Week</Text>
                </View>
              )}
            </View>
          )}
        </View>
        {canSchedule && (
    <TouchableOpacity
            style={[styles.scheduleNewBtn, { backgroundColor: colors.primary }]}
            onPress={onCreateNew}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.scheduleNewBtnText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {!hasAny ? (
        <View style={[styles.scheduleEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Calendar size={32} color={colors.textMuted} />
          <Text style={[styles.scheduleEmptyTitle, { color: colors.text }]}>No Trainings</Text>
          <Text style={[styles.scheduleEmptyText, { color: colors.textMuted }]}>
            {canSchedule ? 'Schedule your first training session' : 'No sessions scheduled yet'}
        </Text>
          {canSchedule && (
            <TouchableOpacity
              style={[styles.scheduleEmptyBtn, { backgroundColor: colors.primary }]}
              onPress={onCreateNew}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.scheduleEmptyBtnText}>Create Training</Text>
    </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {renderGroup('Live Now', grouped.live, false, true)}
          {renderGroup('Today', grouped.today)}
          {renderGroup('Tomorrow', grouped.tomorrow)}
          {renderGroup('This Week', grouped.thisWeek, true)}
          {renderGroup('Upcoming', grouped.upcoming, true)}
          {grouped.past.length > 0 && renderGroup('Past', grouped.past.slice(0, 3), true)}
        </>
      )}
    </View>
  );
}

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
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
        
        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'calendar' && { backgroundColor: colors.card }]}
            onPress={() => handleTabChange('calendar')}
          >
            <Calendar size={16} color={activeTab === 'calendar' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'calendar' ? colors.primary : colors.textMuted }]}>
              Calendar
            </Text>
          </TouchableOpacity>
          
          {canManage && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'manage' && { backgroundColor: colors.card }]}
              onPress={() => handleTabChange('manage')}
            >
              <Settings size={16} color={activeTab === 'manage' ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, { color: activeTab === 'manage' ? colors.primary : colors.textMuted }]}>
                Manage
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
          loadingTeamTrainings && styles.contentCentered,
        ]}
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
            {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
              <ScheduleView
              trainings={activeTeamTrainings}
              colors={colors}
                onPress={handleTrainingPress}
                onCreateNew={handleCreateTraining}
                canSchedule={canSchedule}
              />
            )}

            {/* MANAGE TAB */}
            {activeTab === 'manage' && canManage && (
              <ManageTab
                    colors={colors}
                activeTeam={activeTeam}
                activeTeamId={activeTeamId}
                liveTraining={liveTraining}
                memberStats={memberStats}
                teamStats={teamStats}
                members={members}
                roleConfig={roleConfig}
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

// ============================================================================
// MANAGE TAB COMPONENT
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
  onTrainingPress,
  onCreateTraining,
  onOpenLibrary,
  onViewMembers,
  onInviteMember,
  onTeamSettings,
}: ManageTabProps) {
  return (
    <>
      {/* Live Session Status */}
            {liveTraining && (
              <TouchableOpacity
                style={[styles.liveStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onTrainingPress(liveTraining)}
                activeOpacity={0.7}
              >
                <View style={styles.liveStatusLeft}>
            <View style={[styles.liveStatusDot, { backgroundColor: COLORS.live }]}>
                    <View style={styles.liveStatusDotInner} />
                  </View>
                  <View style={styles.liveStatusContent}>
                    <Text style={[styles.liveStatusLabel, { color: colors.textMuted }]}>SESSION IN PROGRESS</Text>
                    <Text style={[styles.liveStatusTitle, { color: colors.text }]} numberOfLines={1}>
                      {liveTraining.title}
                    </Text>
                    <Text style={[styles.liveStatusMeta, { color: colors.textMuted }]}>
                      {memberStats.training} member{memberStats.training !== 1 ? 's' : ''} active
                    </Text>
                  </View>
                </View>
                <View style={[styles.liveStatusAction, { backgroundColor: colors.secondary }]}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            )}

      {/* Team Stats */}
            <View style={[styles.section, !liveTraining && { marginTop: 0 }]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
                      <Activity size={18} color="#3B82F6" />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{teamStats.sessionsThisWeek}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
                      <Zap size={18} color="#F59E0B" />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{teamStats.totalShots.toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
                      <Target size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{teamStats.avgAccuracy}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
                  </View>
                </View>
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Weekly Goal</Text>
                    <Text style={[styles.progressValue, { color: colors.text }]}>
                      {teamStats.totalShots.toLocaleString()} / {teamStats.weeklyGoal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, (teamStats.totalShots / teamStats.weeklyGoal) * 100)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Member Status */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM STATUS</Text>
          <TouchableOpacity onPress={onViewMembers}>
                  <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.memberStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onViewMembers}
                activeOpacity={0.7}
              >
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.training }]} />
                    <Text style={[styles.statusCount, { color: colors.text }]}>{memberStats.training}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Training</Text>
                  </View>
                  <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.online }]} />
                    <Text style={[styles.statusCount, { color: colors.text }]}>{memberStats.online}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Online</Text>
                  </View>
                  <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.idle }]} />
                    <Text style={[styles.statusCount, { color: colors.text }]}>{memberStats.idle}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Idle</Text>
                  </View>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: colors.textMuted }]} />
                    <Text style={[styles.statusCount, { color: colors.text }]}>{memberStats.offline}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Offline</Text>
                  </View>
                </View>
                <View style={[styles.memberRow, { borderTopColor: colors.border }]}>
                  <View style={styles.memberAvatars}>
                    {members.slice(0, 5).map((m, i) => (
                      <View
                        key={m.user_id}
                        style={[
                          styles.memberAvatar,
                          { backgroundColor: colors.primary, marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i },
                        ]}
                      >
                        <Text style={styles.memberAvatarText}>
                          {m.profile.full_name?.charAt(0) || m.profile.email.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                    {members.length > 5 && (
                      <View style={[styles.memberAvatar, { backgroundColor: colors.secondary, marginLeft: -8 }]}>
                        <Text style={[styles.memberAvatarText, { color: colors.textMuted }]}>+{members.length - 5}</Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACTIONS</Text>
              <View style={styles.manageGrid}>
                <TouchableOpacity
                  style={[styles.manageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onCreateTraining}
                  activeOpacity={0.7}
                >
                  <View style={[styles.manageIcon, { backgroundColor: '#10B98115' }]}>
                    <Plus size={22} color="#10B981" />
                  </View>
                  <Text style={[styles.manageTitle, { color: colors.text }]}>New Session</Text>
                  <Text style={[styles.manageDesc, { color: colors.textMuted }]}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onOpenLibrary}
                  activeOpacity={0.7}
                >
                  <View style={[styles.manageIcon, { backgroundColor: '#3B82F615' }]}>
                    <BookOpen size={22} color="#3B82F6" />
                  </View>
                  <Text style={[styles.manageTitle, { color: colors.text }]}>Drill Library</Text>
                  <Text style={[styles.manageDesc, { color: colors.textMuted }]}>Templates</Text>
                </TouchableOpacity>
              </View>
            </View>

      {/* Team Management */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM</Text>
              <TouchableOpacity
                style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onViewMembers}
                activeOpacity={0.7}
              >
                <View style={[styles.manageRowIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Users size={18} color={colors.primary} />
                </View>
                <View style={styles.manageRowContent}>
                  <Text style={[styles.manageRowTitle, { color: colors.text }]}>Members</Text>
            <Text style={[styles.manageRowDesc, { color: colors.textMuted }]}>View and manage team roster</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onInviteMember}
                activeOpacity={0.7}
              >
                <View style={[styles.manageRowIcon, { backgroundColor: '#A78BFA15' }]}>
                  <UserPlus size={18} color="#A78BFA" />
                </View>
                <View style={styles.manageRowContent}>
                  <Text style={[styles.manageRowTitle, { color: colors.text }]}>Invite Members</Text>
            <Text style={[styles.manageRowDesc, { color: colors.textMuted }]}>Add new members to the team</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onTeamSettings}
                activeOpacity={0.7}
              >
                <View style={[styles.manageRowIcon, { backgroundColor: colors.secondary }]}>
                  <Settings size={18} color={colors.textMuted} />
                </View>
                <View style={styles.manageRowContent}>
                  <Text style={[styles.manageRowTitle, { color: colors.text }]}>Team Settings</Text>
            <Text style={[styles.manageRowDesc, { color: colors.textMuted }]}>Configuration and preferences</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

      {/* Team Info Card */}
            {activeTeam && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CURRENT TEAM</Text>
                <View style={[styles.teamInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.teamRowIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Users size={18} color={colors.primary} />
                  </View>
                  <View style={styles.teamRowContent}>
                    <Text style={[styles.teamRowName, { color: colors.text }]}>{activeTeam.name}</Text>
                    {roleConfig && (
                <Text style={[styles.teamRowRole, { color: roleConfig.color }]}>{roleConfig.label}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </>
  );
}
