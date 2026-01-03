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
      <Animated.View
        style={[styles.pulseDotOuter, { backgroundColor: color, opacity: pulseAnim }]}
      />
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
}: {
  training: TrainingWithDetails;
  showDate?: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const statusConfig = getStatusConfig(training.status);
  const date = new Date(training.scheduled_at);
  const isLive = training.status === 'ongoing';

  return (
    <TouchableOpacity
      style={[localStyles.row, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Status badge - only colorful element */}
      <View style={[localStyles.statusBadge, { backgroundColor: statusConfig.bg }]}>
        {isLive && <PulseDot color={statusConfig.color} />}
        <Text style={[localStyles.statusText, { color: statusConfig.color }]}>
          {statusConfig.label}
        </Text>
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

      <ChevronRight size={16} color={colors.border} />
    </TouchableOpacity>
  );
}

// Compact inline styles for training row
const localStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
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
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
  },
  newBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

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
  const hasAny = trainings.length > 0;

  const renderGroup = useCallback(
    (title: string, items: TrainingWithDetails[], showDate = false, isLive = false) => {
      if (items.length === 0) return null;

      return (
        <View style={styles.scheduleGroup}>
          <View style={styles.scheduleGroupHeader}>
            {isLive && <PulseDot color={COLORS.live} />}
            <Text style={[styles.scheduleGroupTitle, { color: isLive ? COLORS.live : colors.textMuted }]}>
              {title.toUpperCase()}
            </Text>
            <Text style={[styles.scheduleGroupCount, { color: colors.border }]}>
              {items.length}
            </Text>
          </View>
          {items.map(training => (
            <TrainingRow
              key={training.id}
              training={training}
              showDate={showDate}
              colors={colors}
              onPress={() => onPress(training)}
            />
          ))}
        </View>
      );
    },
    [colors, onPress]
  );

  return (
    <View style={styles.scheduleContainer}>
      {/* Header - simple */}
      <View style={styles.scheduleHeader}>
        <Text style={[styles.scheduleHeaderTitle, { color: colors.text }]}>Schedule</Text>
        {canSchedule && (
          <TouchableOpacity
            style={[localStyles.newBtn, { backgroundColor: colors.text }]}
            onPress={onCreateNew}
          >
            <Plus size={14} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>

      {!hasAny ? (
        <View style={[localStyles.empty, { backgroundColor: colors.card }]}>
          <Calendar size={24} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[localStyles.emptyTitle, { color: colors.text }]}>No Trainings</Text>
          <Text style={[localStyles.emptyText, { color: colors.textMuted }]}>
            {canSchedule ? 'Schedule a training for your team' : 'No trainings scheduled yet'}
          </Text>
          {canSchedule && (
            <TouchableOpacity
              style={[localStyles.emptyBtn, { backgroundColor: colors.text }]}
              onPress={onCreateNew}
            >
              <Plus size={16} color={colors.background} />
              <Text style={[localStyles.emptyBtnText, { color: colors.background }]}>Create Training</Text>
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
          
          {/* Team Members tab for soldiers */}
          {!canManage && (
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'team' && { backgroundColor: colors.card }]}
              onPress={() => handleTabChange('team')}
            >
              <Users size={16} color={activeTab === 'team' ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, { color: activeTab === 'team' ? colors.primary : colors.textMuted }]}>
                Team
              </Text>
            </TouchableOpacity>
          )}

          {/* Manage tab for commanders */}
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

            {/* TEAM MEMBERS TAB (for soldiers) */}
            {activeTab === 'team' && !canManage && (
              <TeamMembersTab
                colors={colors}
                members={members}
                activeTeam={activeTeam}
              />
            )}

            {/* MANAGE TAB (for commanders) */}
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
  const progressPct = Math.min(100, (teamStats.totalShots / teamStats.weeklyGoal) * 100);

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
            <Text style={manageStyles.liveBannerMeta}>
              {memberStats.training} active • Tap to view
            </Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* Quick Actions - Top level for easy access */}
      <View style={manageStyles.quickActions}>
        <TouchableOpacity
          style={[manageStyles.primaryAction, { backgroundColor: colors.text }]}
          onPress={onCreateTraining}
          activeOpacity={0.85}
        >
          <Plus size={20} color={colors.background} strokeWidth={2.5} />
          <Text style={[manageStyles.primaryActionText, { color: colors.background }]}>
            New Training
          </Text>
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
          <View style={[manageStyles.goalPill, { backgroundColor: progressPct >= 100 ? '#10B98115' : colors.secondary }]}>
            <Text style={[manageStyles.goalPillText, { color: progressPct >= 100 ? '#10B981' : colors.textMuted }]}>
              {Math.round(progressPct)}% of goal
            </Text>
          </View>
        </View>
        
        <View style={manageStyles.statsRow}>
          <View style={[manageStyles.statCard, { backgroundColor: colors.card }]}>
            <Activity size={16} color="#3B82F6" />
            <Text style={[manageStyles.statCardValue, { color: colors.text }]}>
              {teamStats.sessionsThisWeek}
            </Text>
            <Text style={[manageStyles.statCardLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
          <View style={[manageStyles.statCard, { backgroundColor: colors.card }]}>
            <Zap size={16} color="#F59E0B" />
            <Text style={[manageStyles.statCardValue, { color: colors.text }]}>
              {teamStats.totalShots >= 1000 
                ? `${(teamStats.totalShots / 1000).toFixed(1)}k`
                : teamStats.totalShots}
            </Text>
            <Text style={[manageStyles.statCardLabel, { color: colors.textMuted }]}>Shots</Text>
          </View>
          <View style={[manageStyles.statCard, { backgroundColor: colors.card }]}>
            <Target size={16} color="#10B981" />
            <Text style={[manageStyles.statCardValue, { color: colors.text }]}>
              {teamStats.avgAccuracy}%
            </Text>
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
                <View style={[manageStyles.stackedAvatar, manageStyles.moreAvatar, { backgroundColor: colors.secondary, marginLeft: -10 }]}>
                  <Text style={[manageStyles.stackedAvatarText, { color: colors.textMuted, fontSize: 10 }]}>
                    +{members.length - 4}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={[manageStyles.teamCardTitle, { color: colors.text }]}>
                {members.length} Members
              </Text>
              <View style={manageStyles.statusDots}>
                {memberStats.training > 0 && (
                  <View style={manageStyles.statusDotItem}>
                    <View style={[manageStyles.miniDot, { backgroundColor: COLORS.training }]} />
                    <Text style={[manageStyles.statusDotText, { color: colors.textMuted }]}>{memberStats.training}</Text>
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
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* Management Menu - Clean list */}
      <View style={manageStyles.menuSection}>
        <Text style={[manageStyles.menuSectionTitle, { color: colors.textMuted }]}>MANAGE</Text>
        
        <View style={[manageStyles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={manageStyles.menuItem}
            onPress={onViewMembers}
            activeOpacity={0.6}
          >
            <View style={[manageStyles.menuIcon, { backgroundColor: colors.primary + '12' }]}>
              <Users size={16} color={colors.primary} />
            </View>
            <Text style={[manageStyles.menuItemText, { color: colors.text }]}>Members & Roles</Text>
            <ChevronRight size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={[manageStyles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={manageStyles.menuItem}
            onPress={onOpenLibrary}
            activeOpacity={0.6}
          >
            <View style={[manageStyles.menuIcon, { backgroundColor: '#3B82F612' }]}>
              <BookOpen size={16} color="#3B82F6" />
            </View>
            <Text style={[manageStyles.menuItemText, { color: colors.text }]}>Drill Library</Text>
            <ChevronRight size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={[manageStyles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={manageStyles.menuItem}
            onPress={onTeamSettings}
            activeOpacity={0.6}
          >
            <View style={[manageStyles.menuIcon, { backgroundColor: colors.secondary }]}>
              <Settings size={16} color={colors.textMuted} />
            </View>
            <Text style={[manageStyles.menuItemText, { color: colors.text }]}>Settings</Text>
            <ChevronRight size={16} color={colors.border} />
          </TouchableOpacity>
        </View>
      </View>

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

// Elegant manage tab styles
const manageStyles = StyleSheet.create({
  container: {
    gap: 20,
  },

  // Live Banner
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.live,
    borderWidth: 1,
    overflow: 'hidden',
  },
  liveBannerGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  liveBannerContent: {
    flex: 1,
  },
  liveBannerTitle: {
    fontSize: 15,
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
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryAction: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Stats Section
  statsSection: {
    gap: 12,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Team Card
  teamCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memberAvatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stackedAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  moreAvatar: {
    borderWidth: 0,
  },
  teamCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 10,
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
    gap: 10,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  menuCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },

  // Team Footer
  teamFooter: {
    alignItems: 'center',
    marginTop: 8,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  teamBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

// ============================================================================
// TEAM MEMBERS TAB (for soldiers - shows team roster)
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
    
    members.forEach(member => {
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
          <Text style={[teamMembersStyles.avatarText, { color: colors.primary }]}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={teamMembersStyles.memberInfo}>
          <Text style={[teamMembersStyles.memberName, { color: colors.text }]}>{name}</Text>
          <View style={teamMembersStyles.memberMeta}>
            <View style={[teamMembersStyles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[teamMembersStyles.roleBadgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
            {squad && (
              <Text style={[teamMembersStyles.squadName, { color: colors.textMuted }]}>
                • {squad}
              </Text>
            )}
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
            <Users size={24} color={colors.primary} />
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
          <Users size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[teamMembersStyles.emptyText, { color: colors.textMuted }]}>
            No team members yet
          </Text>
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
    gap: 16,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
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
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  squadName: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});
