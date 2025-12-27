/**
 * Team Tab - Unified Team Workspace
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIFIED TEAM WORKSPACE (v2)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * If an activeTeam is selected, the Team tab IS the team workspace.
 * There is NO additional "team page" required to see team content.
 * 
 * OWNERSHIP CONTRACT:
 * - This screen is CALENDAR + MANAGEMENT + TEAM WORKSPACE
 * - Team switching happens ONLY through the pill/sheet
 * - No "enter team page" click required
 * 
 * MAY SHOW:
 * - Calendar with scheduled sessions for active team
 * - Team switcher (for multi-team users)
 * - Live session indicators (informational)
 * - Management actions (create session, drill library, members, settings)
 * - Team member management
 * 
 * MUST NOT:
 * - Provide primary "Join" / "Start" session CTAs
 * - Route directly to trainingLive (session execution)
 * - Be the entry point for session execution
 * - Navigate to a separate "team workspace" page
 * 
 * Home owns session entry. This tab shows what exists and when.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * TEAM CONTEXT MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 0 teams → Show NoTeamsEmptyState (full screen)
 * 1 team  → Auto-selected, show Calendar/Manage directly (no chips row)
 * N teams → Show TeamSwitcherPill in header, Calendar/Manage for activeTeam
 * 
 * All queries use activeTeamId from store.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { NoTeamsEmptyState } from '@/components/team/NoTeamsEmptyState';
import { TeamSwitcherPill, TeamSwitcherSheet } from '@/components/team/TeamSwitcherSheet';
import { useColors } from '@/hooks/ui/useColors';
import { getTeamMembers } from '@/services/teamService';
import { useTeamContext, useTeamPermissions, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import {
  addDays,
  format,
  isSameDay,
  startOfWeek
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Activity,
  BookOpen,
  Calendar,
  ChevronRight,
  Crown,
  Plus,
  Settings,
  Shield,
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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type InternalTab = 'calendar' | 'manage';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: Crown },
  commander: { color: '#F87171', label: 'Commander', icon: Crown },
  team_commander: { color: '#F87171', label: 'Commander', icon: Crown },
  squad_commander: { color: '#FBBF24', label: 'Squad Lead', icon: Shield },
  soldier: { color: '#34D399', label: 'Soldier', icon: Target },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  ongoing: { color: '#F59E0B', label: 'Live', bg: '#F59E0B20' },
  scheduled: { color: '#3B82F6', label: 'Scheduled', bg: '#3B82F620' },
  completed: { color: '#10B981', label: 'Completed', bg: '#10B98120' },
  cancelled: { color: '#EF4444', label: 'Cancelled', bg: '#EF444420' },
};

function getStatusConfig(status: string | null | undefined) {
  return STATUS_CONFIG[status || 'scheduled'] || STATUS_CONFIG.scheduled;
}

// ─────────────────────────────────────────────────────────────────────────────
// PULSE DOT - Animated live indicator
// ─────────────────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
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
        style={[
          styles.pulseDotOuter,
          { backgroundColor: color, opacity: pulseAnim },
        ]}
      />
      <View style={[styles.pulseDotInner, { backgroundColor: color }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE VIEW - Agenda style with status
// ─────────────────────────────────────────────────────────────────────────────

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
  // Group trainings by timeframe
  const grouped = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = addDays(todayStart, 1);
    const weekEnd = addDays(todayStart, 7);

    const live: TrainingWithDetails[] = [];
    const today: TrainingWithDetails[] = [];
    const tomorrow: TrainingWithDetails[] = [];
    const thisWeek: TrainingWithDetails[] = [];
    const upcoming: TrainingWithDetails[] = [];
    const past: TrainingWithDetails[] = [];

    trainings.forEach(t => {
      const date = new Date(t.scheduled_at);
      
      if (t.status === 'ongoing') {
        live.push(t);
      } else if (date < todayStart) {
        past.push(t);
      } else if (isSameDay(date, todayStart)) {
        today.push(t);
      } else if (isSameDay(date, tomorrowStart)) {
        tomorrow.push(t);
      } else if (date < weekEnd) {
        thisWeek.push(t);
      } else {
        upcoming.push(t);
      }
    });

    // Sort each group by time
    const sortByTime = (a: TrainingWithDetails, b: TrainingWithDetails) => 
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();

    return {
      live: live.sort(sortByTime),
      today: today.sort(sortByTime),
      tomorrow: tomorrow.sort(sortByTime),
      thisWeek: thisWeek.sort(sortByTime),
      upcoming: upcoming.sort(sortByTime),
      past: past.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()),
    };
  }, [trainings]);

  const hasAny = trainings.length > 0;

  // Quick stats
  const stats = useMemo(() => ({
    live: grouped.live.length,
    today: grouped.today.length,
    thisWeek: grouped.today.length + grouped.tomorrow.length + grouped.thisWeek.length,
  }), [grouped]);

  const renderGroup = (title: string, items: TrainingWithDetails[], showDate = false, isLive = false) => {
    if (items.length === 0) return null;
    
    return (
      <View style={styles.scheduleGroup}>
        <View style={styles.scheduleGroupHeader}>
          {isLive && <PulseDot color="#F59E0B" />}
          <Text style={[
            styles.scheduleGroupTitle, 
            { color: isLive ? '#F59E0B' : colors.textMuted }
          ]}>
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
              {/* Status indicator */}
              <View style={[styles.scheduleStatus, { backgroundColor: statusConfig.bg }]}>
                {isLiveItem && <PulseDot color={statusConfig.color} />}
                <Text style={[styles.scheduleStatusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>

              {/* Content */}
              <View style={styles.scheduleContent}>
                <Text style={[styles.scheduleTitle, { color: colors.text }]} numberOfLines={1}>
                  {training.title}
                </Text>
                <View style={styles.scheduleMeta}>
                  <Text style={[styles.scheduleTime, { color: colors.textMuted }]}>
                    {showDate ? format(date, 'EEE, MMM d') + ' · ' : ''}{format(date, 'HH:mm')}
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

              {/* Arrow */}
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

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
                  <PulseDot color="#F59E0B" />
                  <Text style={[styles.quickStatText, { color: '#F59E0B' }]}>
                    {stats.live} Live
                  </Text>
                </View>
              )}
              {stats.today > 0 && (
                <View style={styles.quickStatItem}>
                  <View style={[styles.quickStatDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.quickStatText, { color: colors.textMuted }]}>
                    {stats.today} Today
                  </Text>
                </View>
              )}
              {stats.thisWeek > 0 && (
                <View style={styles.quickStatItem}>
                  <View style={[styles.quickStatDot, { backgroundColor: colors.border }]} />
                  <Text style={[styles.quickStatText, { color: colors.textMuted }]}>
                    {stats.thisWeek} This Week
                  </Text>
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
          {/* Live first - with pulse animation */}
          {grouped.live.length > 0 && renderGroup('Live Now', grouped.live, false, true)}
          
          {/* Today */}
          {renderGroup('Today', grouped.today)}
          
          {/* Tomorrow */}
          {renderGroup('Tomorrow', grouped.tomorrow)}
          
          {/* This Week */}
          {renderGroup('This Week', grouped.thisWeek, true)}
          
          {/* Upcoming */}
          {renderGroup('Upcoming', grouped.upcoming, true)}
          
          {/* Past (collapsed or limited) */}
          {grouped.past.length > 0 && renderGroup('Past', grouped.past.slice(0, 3), true)}
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  // Team context - single source of truth
  const { teamState, teams, activeTeamId, activeTeam, loading: teamsLoading, initialized } = useTeamContext();
  const { canSchedule, canManage } = useTeamPermissions();
  const { loadTeams } = useTeamStore();
  const { teamTrainings, loadTeamTrainings, loadingTeamTrainings } = useTrainingStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<InternalTab>('calendar');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams])
  );

  // Load trainings for active team
  useFocusEffect(
    useCallback(() => {
      if (activeTeamId) {
        loadTeamTrainings(activeTeamId);
      }
    }, [activeTeamId, loadTeamTrainings])
  );

  // Load team members for stats (only on Manage tab)
  useFocusEffect(
    useCallback(() => {
      if (activeTeamId && activeTab === 'manage') {
        getTeamMembers(activeTeamId)
          .then(setMembers)
          .catch(console.error);
      }
    }, [activeTeamId, activeTab])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeams();
    if (activeTeamId) {
      await loadTeamTrainings(activeTeamId);
      if (activeTab === 'manage') {
        try {
          const membersData = await getTeamMembers(activeTeamId);
          setMembers(membersData);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setRefreshing(false);
  }, [loadTeams, loadTeamTrainings, activeTeamId, activeTab]);

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED DATA (for active team only)
  // ─────────────────────────────────────────────────────────────────────────────

  // Filter trainings for active team
  const activeTeamTrainings = useMemo(() => {
    if (!activeTeamId) return [];
    return teamTrainings.filter(t => t.team_id === activeTeamId);
  }, [teamTrainings, activeTeamId]);

  // Live training detection
  const liveTraining = useMemo(() => {
    return activeTeamTrainings.find(t => t.status === 'ongoing');
  }, [activeTeamTrainings]);

  // Member stats (simulated activity status for now)
  const memberStats = useMemo(() => {
    const stats = { total: members.length, training: 0, online: 0, idle: 0, offline: 0 };
    members.forEach((_, i) => {
      // Simulate status distribution (in production, this comes from presence service)
      const rand = Math.random();
      if (rand < 0.1) stats.training++;
      else if (rand < 0.3) stats.online++;
      else if (rand < 0.6) stats.idle++;
      else stats.offline++;
    });
    return stats;
  }, [members]);

  // Team stats (this week) - simulated for now
  const teamStats = useMemo(() => {
    // In production, this would come from an analytics service
    const sessionsThisWeek = activeTeamTrainings.filter(t => {
      const trainingDate = new Date(t.scheduled_at);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);
      return trainingDate >= weekStart && trainingDate < weekEnd;
    }).length;

    return {
      sessionsThisWeek,
      totalShots: Math.floor(Math.random() * 3000) + 500, // Simulated
      avgAccuracy: Math.floor(Math.random() * 30) + 60,   // Simulated
      weeklyGoal: 5000,
    };
  }, [activeTeamTrainings]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Navigate to session details (context view), NOT session execution
  const handleTrainingPress = (training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
  };

  const handleCreateTraining = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/createTraining?teamId=${activeTeamId}` as any);
  };

  const handleOpenLibrary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/drillLibrary' as any);
  };

  // Team management handlers - integrated directly into Team tab
  const handleViewMembers = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamMembers?teamId=${activeTeamId}` as any);
  };

  const handleInviteMember = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/inviteTeamMember?teamId=${activeTeamId}` as any);
  };

  const handleTeamSettings = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamSettings?teamId=${activeTeamId}` as any);
  };

  const handleTabChange = (tab: InternalTab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  if (!initialized || (teamsLoading && teams.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: 0 TEAMS - Empty State
  // ─────────────────────────────────────────────────────────────────────────────

  if (teamState === 'no_teams') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NoTeamsEmptyState />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: 1 OR N TEAMS - Calendar/Manage with active team context
  // ─────────────────────────────────────────────────────────────────────────────

  const showSwitcher = teamState === 'multiple_teams';
  const roleConfig = activeTeam ? getRoleConfig(activeTeam.my_role) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Team</Text>
          
          {/* Team Switcher or Team Name + Add button */}
          {/* Note: Team switching happens ONLY through the pill/sheet, no separate "team page" */}
          <View style={styles.headerRight}>
            {showSwitcher ? (
              <TeamSwitcherPill onPress={() => setSwitcherOpen(true)} />
            ) : activeTeam && (
              <View style={[styles.singleTeamPill, { backgroundColor: colors.secondary }]}>
                <Users size={14} color={colors.primary} />
                <Text style={[styles.singleTeamName, { color: colors.text }]} numberOfLines={1}>
                  {activeTeam.name}
                </Text>
                {roleConfig && (
                  <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
                    <Text style={[styles.roleText, { color: roleConfig.color }]}>
                      {roleConfig.label}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
           
          </View>
        </View>
        
        {/* Internal Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'calendar' && { backgroundColor: colors.card },
            ]}
            onPress={() => handleTabChange('calendar')}
          >
            <Calendar size={16} color={activeTab === 'calendar' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'calendar' ? colors.primary : colors.textMuted }]}>
              Calendar
            </Text>
          </TouchableOpacity>
          
          {canManage && (
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'manage' && { backgroundColor: colors.card },
              ]}
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
        {/* Team Switching Loader */}
        {loadingTeamTrainings ? (
          <View style={styles.switchingLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.switchingText, { color: colors.textMuted }]}>
              Loading team data...
            </Text>
          </View>
        ) : (
        <>
        {/* ═══════════════════════════════════════════════════════════════════
            CALENDAR TAB - Now uses Schedule View
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <ScheduleView
            trainings={activeTeamTrainings}
            colors={colors}
            onPress={handleTrainingPress}
            onCreateNew={handleCreateTraining}
            canSchedule={canSchedule}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MANAGE TAB (Commanders only)
            
            This is the unified team workspace. No separate "team page" needed.
            - Live status, team stats, member status
            - Schedule sessions
            - Access drill library
            - Manage members, invite, settings
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'manage' && canManage && (
          <>
            {/* Live Session Status (if any) */}
            {liveTraining && (
              <TouchableOpacity
                style={[styles.liveStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleTrainingPress(liveTraining)}
                activeOpacity={0.7}
              >
                <View style={styles.liveStatusLeft}>
                  <View style={[styles.liveStatusDot, { backgroundColor: '#F59E0B' }]}>
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

            {/* Team Stats - This Week */}
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

                {/* Progress bar */}
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
                <TouchableOpacity onPress={handleViewMembers}>
                  <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.memberStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleViewMembers}
                activeOpacity={0.7}
              >
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.statusCount, { color: colors.text }]}>{memberStats.training}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Training</Text>
                  </View>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.statusCount, { color: colors.text }]}>{memberStats.online}</Text>
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Online</Text>
                  </View>
                  <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
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
                  onPress={handleCreateTraining}
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
                  onPress={handleOpenLibrary}
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

            {/* Team Management - Integrated directly, no separate "team page" */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM</Text>
              
              {/* Members Row */}
              <TouchableOpacity
                style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleViewMembers}
                activeOpacity={0.7}
              >
                <View style={[styles.manageRowIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Users size={18} color={colors.primary} />
                </View>
                <View style={styles.manageRowContent}>
                  <Text style={[styles.manageRowTitle, { color: colors.text }]}>Members</Text>
                  <Text style={[styles.manageRowDesc, { color: colors.textMuted }]}>
                    View and manage team roster
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Invite Row */}
              <TouchableOpacity
                style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleInviteMember}
                activeOpacity={0.7}
              >
                <View style={[styles.manageRowIcon, { backgroundColor: '#A78BFA15' }]}>
                  <UserPlus size={18} color="#A78BFA" />
                </View>
                <View style={styles.manageRowContent}>
                  <Text style={[styles.manageRowTitle, { color: colors.text }]}>Invite Members</Text>
                  <Text style={[styles.manageRowDesc, { color: colors.textMuted }]}>
                    Add new members to the team
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Settings Row */}
              <TouchableOpacity
                style={[styles.manageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleTeamSettings}
                activeOpacity={0.7}
              >
                <View style={[styles.manageRowIcon, { backgroundColor: colors.secondary }]}>
                  <Settings size={18} color={colors.textMuted} />
                </View>
                <View style={styles.manageRowContent}>
                  <Text style={[styles.manageRowTitle, { color: colors.text }]}>Team Settings</Text>
                  <Text style={[styles.manageRowDesc, { color: colors.textMuted }]}>
                    Configuration and preferences
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Team Info Card - Informational only, not a navigation entry point */}
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
                      <Text style={[styles.teamRowRole, { color: roleConfig.color }]}>
                        {roleConfig.label}
                      </Text>
                    )}
                  </View>
                  {/* No navigation chevron - this is informational only */}
                  {/* Team switching happens through the header pill */}
                </View>
              </View>
            )}
          </>
        )}
        </>
        )}
      </ScrollView>

      {/* Team Switcher Sheet */}
      <TeamSwitcherSheet 
        visible={switcherOpen} 
        onClose={() => setSwitcherOpen(false)} 
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  contentCentered: { flexGrow: 1, justifyContent: 'center' },
  
  // Team Switching Loader
  switchingLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  switchingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  singleTeamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 200,
  },
  singleTeamName: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 100,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTeamBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Pulse Dot
  pulseDotContainer: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotOuter: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pulseDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Schedule View
  scheduleContainer: {},
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scheduleHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quickStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scheduleNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  scheduleNewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Schedule groups
  scheduleGroup: {
    marginBottom: 20,
  },
  scheduleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  scheduleGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Schedule item
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  scheduleItemLive: {
    borderColor: '#F59E0B40',
    borderWidth: 1.5,
  },
  scheduleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
  },
  scheduleLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scheduleStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scheduleContent: {
    flex: 1,
    gap: 2,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  scheduleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleTime: {
    fontSize: 12,
  },
  scheduleMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  scheduleDrills: {
    fontSize: 12,
  },

  // Empty state
  scheduleEmpty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  scheduleEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  scheduleEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  scheduleEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  scheduleEmptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Section
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Live Session Status
  liveStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  liveStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  liveStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStatusDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveStatusContent: {
    flex: 1,
  },
  liveStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  liveStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  liveStatusMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  liveStatusAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Card
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Member Status Card
  memberStatusCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  statusItem: {
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 11,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
  },
  memberAvatars: {
    flexDirection: 'row',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Manage Grid
  manageGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  manageCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  manageIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  manageTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  manageDesc: {
    fontSize: 12,
  },

  // Team Info Card (informational only, not navigational)
  teamInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  teamRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamRowContent: {
    flex: 1,
  },
  teamRowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamRowRole: {
    fontSize: 12,
    marginTop: 2,
  },

  // Manage Row (for Members, Invite, Settings)
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  manageRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageRowContent: {
    flex: 1,
  },
  manageRowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  manageRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },

  // Loading
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
