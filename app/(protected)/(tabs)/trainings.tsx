/**
 * Team Tab - with internal Calendar/Manage tabs
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * OWNERSHIP CONTRACT (DO NOT VIOLATE)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This screen is CALENDAR + MANAGEMENT only.
 * 
 * MAY SHOW:
 * - Calendar with scheduled sessions
 * - Team switcher (for multi-team users)
 * - Live session indicators (informational)
 * - Management actions (create team, schedule session)
 * 
 * MUST NOT:
 * - Provide primary "Join" / "Start" session CTAs
 * - Route directly to trainingLive (session execution)
 * - Be the entry point for session execution
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
import { useTeamContext, useTeamPermissions, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import {
  addDays,
  format,
  isSameDay,
  isToday,
  startOfWeek,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  Plus,
  Settings,
  Shield,
  Target,
  Users,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
// WEEK CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

function WeekCalendar({
  selectedDate,
  onSelectDate,
  trainings,
  colors,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  trainings: TrainingWithDetails[];
  colors: ReturnType<typeof useColors>;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getTrainingsForDate = (date: Date) => {
    return trainings.filter(t => isSameDay(new Date(t.scheduled_at), date));
  };

  const goToPrevWeek = () => {
    Haptics.selectionAsync();
    setWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    Haptics.selectionAsync();
    setWeekStart(prev => addDays(prev, 7));
  };

  return (
    <View style={[styles.weekCalendar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Month Header */}
      <View style={styles.weekHeader}>
        <TouchableOpacity onPress={goToPrevWeek} style={styles.weekNavBtn}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.weekMonth, { color: colors.text }]}>
          {format(weekStart, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavBtn}>
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Days Row */}
      <View style={styles.weekDays}>
        {weekDays.map((day) => {
          const dayTrainings = getTrainingsForDate(day);
          const hasTrainings = dayTrainings.length > 0;
          const hasLive = dayTrainings.some(t => t.status === 'ongoing');
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: colors.primary },
                isTodayDate && !isSelected && { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectDate(day);
              }}
            >
              <Text style={[
                styles.dayName,
                { color: isSelected ? '#fff' : colors.textMuted },
              ]}>
                {format(day, 'EEE')}
              </Text>
              <Text style={[
                styles.dayNumber,
                { color: isSelected ? '#fff' : colors.text },
                isTodayDate && !isSelected && { color: colors.primary },
              ]}>
                {format(day, 'd')}
              </Text>
              {/* Event Dots */}
              {hasTrainings && (
                <View style={styles.dotRow}>
                  {hasLive ? (
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  ) : (
                    <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : colors.primary }]} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────

function EventCard({
  training,
  colors,
  onPress,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isLive = training.status === 'ongoing';
  const time = format(new Date(training.scheduled_at), 'HH:mm');

  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        isLive && { borderLeftColor: '#F59E0B', borderLeftWidth: 3 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.eventTime}>
        <Text style={[styles.eventTimeText, { color: isLive ? '#F59E0B' : colors.textMuted }]}>
          {time}
        </Text>
        {isLive && (
          <View style={styles.liveIndicator}>
            <View style={[styles.livePulse, { backgroundColor: '#F59E0B' }]} />
          </View>
        )}
      </View>
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <Text style={[styles.eventMeta, { color: colors.textMuted }]}>
          {training.drill_count ? `${training.drill_count} drills` : 'No drills'}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
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
  const { teamTrainings, loadTeamTrainings } = useTrainingStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<InternalTab>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [switcherOpen, setSwitcherOpen] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeams();
    if (activeTeamId) {
      await loadTeamTrainings(activeTeamId);
    }
    setRefreshing(false);
  }, [loadTeams, loadTeamTrainings, activeTeamId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED DATA (for active team only)
  // ─────────────────────────────────────────────────────────────────────────────

  // Filter trainings for active team
  const activeTeamTrainings = useMemo(() => {
    if (!activeTeamId) return [];
    return teamTrainings.filter(t => t.team_id === activeTeamId);
  }, [teamTrainings, activeTeamId]);

  // Trainings for selected date
  const selectedDateTrainings = useMemo(() => {
    return activeTeamTrainings
      .filter(t => isSameDay(new Date(t.scheduled_at), selectedDate))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [activeTeamTrainings, selectedDate]);

  // All trainings sorted (for Manage tab)
  const allTrainingsSorted = useMemo(() => {
    return [...activeTeamTrainings].sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
  }, [activeTeamTrainings]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleTeamPress = () => {
    if (!activeTeamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamWorkspace?id=${activeTeamId}` as any);
  };

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
          <View style={styles.headerRight}>
            {showSwitcher ? (
              <TeamSwitcherPill onPress={() => setSwitcherOpen(true)} />
            ) : activeTeam && (
              <TouchableOpacity 
                style={[styles.singleTeamPill, { backgroundColor: colors.secondary }]}
                onPress={handleTeamPress}
                activeOpacity={0.7}
              >
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
              </TouchableOpacity>
            )}
            
            {/* Add Team button - opens switcher sheet with Create/Join options */}
            <TouchableOpacity
              style={[styles.addTeamBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setSwitcherOpen(true)}
              activeOpacity={0.7}
            >
              <Plus size={18} color={colors.primary} />
            </TouchableOpacity>
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            CALENDAR TAB
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <>
            {/* Week Calendar */}
            <WeekCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              trainings={activeTeamTrainings}
              colors={colors}
            />

            {/* Selected Date Label */}
            <View style={styles.selectedDateHeader}>
              <Text style={[styles.selectedDateText, { color: colors.text }]}>
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
              </Text>
              {canSchedule && (
                <TouchableOpacity
                  style={[styles.addEventBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateTraining}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={styles.addEventBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Events for Selected Date */}
            {selectedDateTrainings.length > 0 ? (
              <View style={styles.eventsList}>
                {selectedDateTrainings.map(training => (
                  <EventCard
                    key={training.id}
                    training={training}
                    colors={colors}
                    onPress={() => handleTrainingPress(training)}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.noEvents, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Calendar size={24} color={colors.textMuted} />
                <Text style={[styles.noEventsText, { color: colors.textMuted }]}>
                  No sessions scheduled
                </Text>
              </View>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MANAGE TAB (Commanders only)
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'manage' && canManage && (
          <>
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

            {/* Active Team Card */}
            {activeTeam && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACTIVE TEAM</Text>
                <TouchableOpacity
                  style={[styles.teamRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleTeamPress}
                  activeOpacity={0.7}
                >
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
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Upcoming Sessions */}
            {allTrainingsSorted.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UPCOMING SESSIONS</Text>
                <View style={styles.eventsList}>
                  {allTrainingsSorted.slice(0, 5).map(training => (
                    <EventCard
                      key={training.id}
                      training={training}
                      colors={colors}
                      onPress={() => handleTrainingPress(training)}
                    />
                  ))}
                </View>
              </View>
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

  // Week Calendar
  weekCalendar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekNavBtn: {
    padding: 4,
  },
  weekMonth: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Selected Date Header
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addEventBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Events List
  eventsList: {
    gap: 10,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  eventTime: {
    alignItems: 'center',
    minWidth: 44,
  },
  eventTimeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  liveIndicator: {
    marginTop: 4,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventMeta: {
    fontSize: 12,
    marginTop: 2,
  },

  // No Events
  noEvents: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  noEventsText: {
    fontSize: 14,
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

  // Team Row
  teamRow: {
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

  // Loading
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
