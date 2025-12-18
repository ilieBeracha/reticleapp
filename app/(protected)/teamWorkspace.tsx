/**
 * Team Command Center
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️  DEPRECATED - DO NOT USE FOR PRIMARY NAVIGATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This screen has been superseded by the unified Team Tab (`trainings.tsx`).
 * 
 * As of the Team Tab Unified Workspace update:
 * - The Team tab IS the team workspace when an activeTeam is selected
 * - There should be NO additional "team page" click required to see team content
 * - Team switching happens ONLY through the pill/sheet
 * 
 * This screen is kept for:
 * - Deep links (e.g., notifications that link directly to team)
 * - Backward compatibility during transition
 * - Rare/advanced team views that don't fit in the main tab
 * 
 * PRIMARY USER FLOW should use:
 * - Team Tab → Calendar (scheduled sessions for activeTeamId)
 * - Team Tab → Manage (members, settings, library for activeTeamId)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * OWNERSHIP CONTRACT (DO NOT VIOLATE)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This screen is STATUS + CONTEXT only.
 * 
 * MAY SHOW:
 * - Live session status (informational)
 * - Team performance stats
 * - Squad breakdown
 * - Member status
 * - Scheduled sessions
 * - Drill library
 * 
 * MUST NOT:
 * - Provide primary "Join" / "Start" CTAs for session entry
 * - Route directly to trainingLive (session execution)
 * - Be the entry point for session execution
 * 
 * Home owns session entry. Team pages explain what exists.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { DrillDetailModal } from '@/components/drills/DrillDetailModal';
import { DrillEditorModal } from '@/components/drills/DrillEditorModal';
import { useColors } from '@/hooks/ui/useColors';
import {
  createDrill,
  deleteDrill,
  getTeamDrills,
  updateDrill,
} from '@/services/drillService';
import { getTeamMembers } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type {
  CreateDrillInput,
  Drill,
  TeamMemberWithProfile,
  TrainingWithDetails,
} from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  Layers,
  Plus,
  Search,
  Settings,
  Shield,
  Target,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES & HELPERS
// ============================================================================

type WorkspaceView = 'command' | 'library';

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

function canManageTeam(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'commander';
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

// Simulate member activity status (in real app, this would come from presence service)
function getMemberStatus(_member: TeamMemberWithProfile): 'training' | 'online' | 'idle' | 'offline' {
  // This would be real-time in production based on member's last activity
  const random = Math.random();
  if (random < 0.1) return 'training';
  if (random < 0.3) return 'online';
  if (random < 0.6) return 'idle';
  return 'offline';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TeamWorkspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const { teams, activeTeamId, setActiveTeam } = useTeamStore();
  const { teamTrainings, loadTeamTrainings } = useTrainingStore();

  // Use param id if provided, otherwise fall back to activeTeamId from store
  const id = paramId || activeTeamId;

  const team = useMemo(() => teams.find((t) => t.id === id), [teams, id]);
  const roleConfig = getRoleConfig(team?.my_role);
  const canManage = canManageTeam(team?.my_role);

  // State
  const [activeView, setActiveView] = useState<WorkspaceView>('command');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);

  // Library state
  const [searchQuery, setSearchQuery] = useState('');
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setActiveTeam(id);
      const [membersData, drillsData] = await Promise.all([
        getTeamMembers(id),
        getTeamDrills(id),
      ]);
      setMembers(membersData);
      setDrills(drillsData);
      loadTeamTrainings(id);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, setActiveTeam, loadTeamTrainings]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  const upcomingTrainings = useMemo(() => {
    return teamTrainings
      .filter((t) => t.team_id === id && (t.status === 'planned' || t.status === 'ongoing'))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 3);
  }, [teamTrainings, id]);

  const liveTraining = useMemo(() => {
    return upcomingTrainings.find((t) => t.status === 'ongoing');
  }, [upcomingTrainings]);

  const filteredDrills = useMemo(() => {
    if (!searchQuery.trim()) return drills;
    return drills.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [drills, searchQuery]);

  // Member stats with activity
  const memberStats = useMemo(() => {
    const stats = {
      total: members.length,
      training: 0,
      online: 0,
      idle: 0,
      offline: 0,
    };
    members.forEach((m) => {
      const status = getMemberStatus(m);
      stats[status]++;
    });
    return stats;
  }, [members]);

  // Squad breakdown (if team has squads)
  const squadBreakdown = useMemo(() => {
    if (!team?.squads || team.squads.length === 0) return null;

    const breakdown: Record<string, { name: string; members: number; sessions: number }> = {};
    team.squads.forEach((squad) => {
      breakdown[squad] = { name: squad, members: 0, sessions: 0 };
    });

    members.forEach((m) => {
      const squadId = m.details?.squad_id || m.role?.squad_id;
      if (squadId && breakdown[squadId]) {
        breakdown[squadId].members++;
      }
    });

    return Object.values(breakdown);
  }, [team?.squads, members]);

  // Team stats (mock data - in real app from analytics service)
  const teamStats = useMemo(() => {
    // In production, this would come from a team analytics service
    return {
      sessionsThisWeek: Math.floor(Math.random() * 20) + 5,
      totalShots: Math.floor(Math.random() * 3000) + 500,
      avgAccuracy: Math.floor(Math.random() * 30) + 60,
      weeklyGoal: 5000,
    };
  }, [id]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSettings = () => router.push(`/(protected)/teamSettings?teamId=${id}` as any);
  const handleInvite = () => router.push(`/(protected)/inviteTeamMember?teamId=${id}` as any);
  const handleMembers = () => router.push(`/(protected)/teamMembers?teamId=${id}` as any);
  const handleCreateTraining = () => router.push(`/(protected)/createTraining?teamId=${id}` as any);

  // Navigate to session details (context view), NOT session execution
  // Home owns session entry - this screen only shows status/context
  const handleTraining = (t: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Always navigate to trainingDetail for context/status
    // Never route directly to trainingLive (session execution) from Team screens
    router.push(`/(protected)/trainingDetail?id=${t.id}` as any);
  };

  // Drill handlers
  const handleCreateDrill = () => {
    setEditingDrill(null);
    setDrillModalVisible(true);
  };

  const handleEditDrill = (d: Drill) => {
    setEditingDrill(d);
    setDrillModalVisible(true);
  };

  const handleDeleteDrill = (d: Drill) => {
    Alert.alert('Delete Drill', `Delete "${d.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDrill(d.id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleSaveDrill = async (drill: CreateDrillInput & { id?: string }) => {
    if (!id) return;
    try {
      editingDrill ? await updateDrill(editingDrill.id, drill) : await createDrill(id, drill);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleViewDrill = (drill: Drill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDrill(drill);
  };

  // ============================================================================
  // RENDER: NOT FOUND
  // ============================================================================

  if (!team) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Users size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.text }]}>Team not found</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleBack}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================================
  // RENDER: COMMAND CENTER VIEW
  // ============================================================================

  const renderCommandView = () => (
    <View style={styles.page}>
      {/* Live Session Status (informational only - NOT action CTA) */}
      {liveTraining && (
        <Animated.View entering={FadeIn.duration(400)}>
          <TouchableOpacity
            style={[styles.liveStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleTraining(liveTraining)}
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
            {/* Secondary action - view details, not join */}
            <View style={[styles.liveStatusAction, { backgroundColor: colors.secondary }]}>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Team Stats */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
          <TouchableOpacity>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>Details</Text>
          </TouchableOpacity>
        </View>

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
      </Animated.View>

      {/* Squad Breakdown */}
      {squadBreakdown && squadBreakdown.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Squads</Text>
          <View style={styles.squadGrid}>
            {squadBreakdown.map((squad, index) => (
              <View
                key={squad.name}
                style={[styles.squadCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.squadIndicator, { backgroundColor: `hsl(${index * 60}, 70%, 50%)` }]} />
                <Text style={[styles.squadName, { color: colors.text }]}>{squad.name}</Text>
                <Text style={[styles.squadMeta, { color: colors.textMuted }]}>{squad.members} members</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Members Status */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Status</Text>
          <TouchableOpacity onPress={handleMembers}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.memberStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleMembers}
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
            <View style={[styles.memberAvatars]}>
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
      </Animated.View>

      {/* Upcoming Trainings */}
      <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
          {canManage && (
            <TouchableOpacity onPress={handleCreateTraining}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>+ Schedule</Text>
            </TouchableOpacity>
          )}
        </View>

        {upcomingTrainings.filter((t) => t.status === 'planned').length > 0 ? (
          upcomingTrainings
            .filter((t) => t.status === 'planned')
            .map((training) => {
              const date = new Date(training.scheduled_at);
              return (
                <TouchableOpacity
                  key={training.id}
                  style={[styles.trainingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleTraining(training)}
                >
                  <View style={[styles.trainingDate, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.trainingDay, { color: colors.text }]}>{format(date, 'd')}</Text>
                    <Text style={[styles.trainingMonth, { color: colors.textMuted }]}>{format(date, 'MMM')}</Text>
                  </View>
                  <View style={styles.trainingInfo}>
                    <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    <View style={styles.trainingMeta}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={[styles.trainingTime, { color: colors.textMuted }]}>
                        {formatDateLabel(date)} at {format(date, 'HH:mm')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
        ) : (
          <View style={[styles.emptyTraining, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={24} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No upcoming trainings</Text>
            {canManage && (
              <TouchableOpacity style={[styles.scheduleBtn, { backgroundColor: colors.primary }]} onPress={handleCreateTraining}>
                <Plus size={14} color="#fff" />
                <Text style={styles.scheduleBtnText}>Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setActiveView('library')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#93C5FD20' }]}>
              <Target size={20} color="#93C5FD" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Drills</Text>
            <Text style={[styles.quickActionCount, { color: colors.textMuted }]}>{drills.length}</Text>
          </TouchableOpacity>

          {canManage && (
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleInvite}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#A78BFA20' }]}>
                <UserPlus size={20} color="#A78BFA" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Invite</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleSettings}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary }]}>
              <Settings size={20} color={colors.textMuted} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Settings</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );

  // ============================================================================
  // RENDER: LIBRARY VIEW
  // ============================================================================

  const renderLibraryView = () => (
    <View style={styles.page}>
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search drills..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Add Drill Button */}
      {canManage && (
        <TouchableOpacity style={[styles.addDrillButton, { backgroundColor: colors.primary }]} onPress={handleCreateDrill}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addDrillText}>Create New Drill</Text>
        </TouchableOpacity>
      )}

      {/* Drill List */}
      {filteredDrills.length > 0 ? (
        <View style={styles.drillList}>
          {filteredDrills.map((drill) => {
            const isGrouping = drill.drill_goal === 'grouping';
            const typeColor = isGrouping ? '#10B981' : '#3B82F6';
            return (
              <TouchableOpacity
                key={drill.id}
                style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleViewDrill(drill)}
                onLongPress={() => {
                  if (!canManage) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(drill.name, 'Options', [
                    { text: 'Edit', onPress: () => handleEditDrill(drill) },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteDrill(drill) },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <View style={[styles.drillAccent, { backgroundColor: typeColor }]} />
                <View style={styles.drillContent}>
                  <View style={styles.drillHeader}>
                    <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                      {drill.name}
                    </Text>
                    <View style={[styles.drillBadge, { backgroundColor: typeColor + '20' }]}>
                      <Text style={[styles.drillBadgeText, { color: typeColor }]}>
                        {isGrouping ? 'Grouping' : 'Achievement'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
                    {drill.distance_m}m · {drill.rounds_per_shooter} shots
                    {drill.time_limit_seconds ? ` · ${drill.time_limit_seconds}s` : ''}
                  </Text>
                </View>
                <ArrowRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={[styles.emptyDrills, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Target size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {searchQuery ? 'No drills found' : 'No drills in library'}
          </Text>
          {canManage && !searchQuery && (
            <TouchableOpacity style={[styles.scheduleBtn, { backgroundColor: colors.primary }]} onPress={handleCreateDrill}>
              <Plus size={14} color="#fff" />
              <Text style={styles.scheduleBtnText}>Create Drill</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
            <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {canManage && (
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.primary }]} onPress={handleInvite}>
              <UserPlus size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View Switcher */}
      <View style={[styles.viewSwitcher, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'command' && { borderBottomColor: colors.primary }]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveView('command');
          }}
        >
          <Layers size={18} color={activeView === 'command' ? colors.primary : colors.textMuted} />
          <Text style={[styles.viewTabText, { color: activeView === 'command' ? colors.primary : colors.textMuted }]}>
            Command
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'library' && { borderBottomColor: colors.primary }]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveView('library');
          }}
        >
          <Target size={18} color={activeView === 'library' ? colors.primary : colors.textMuted} />
          <Text style={[styles.viewTabText, { color: activeView === 'library' ? colors.primary : colors.textMuted }]}>
            Library ({drills.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
        ) : activeView === 'command' ? (
          renderCommandView()
        ) : (
          renderLibraryView()
        )}
      </ScrollView>

      {/* Modals */}
      <DrillEditorModal
        visible={drillModalVisible}
        onClose={() => {
          setDrillModalVisible(false);
          setEditingDrill(null);
        }}
        onSave={handleSaveDrill}
        initialData={
          editingDrill
            ? {
                name: editingDrill.name,
                description: editingDrill.description || undefined,
                icon: editingDrill.icon || undefined,
                drill_goal: editingDrill.drill_goal,
                target_type: editingDrill.target_type,
                scoring_mode: editingDrill.scoring_mode || undefined,
                points_per_hit: editingDrill.points_per_hit || undefined,
                penalty_per_miss: editingDrill.penalty_per_miss || undefined,
                position: editingDrill.position || undefined,
                start_position: editingDrill.start_position || undefined,
                weapon_category: editingDrill.weapon_category || undefined,
                reload_required: editingDrill.reload_required || undefined,
                movement_type: editingDrill.movement_type || undefined,
                difficulty: editingDrill.difficulty || undefined,
                category: editingDrill.category || undefined,
                instructions: editingDrill.instructions || undefined,
                safety_notes: editingDrill.safety_notes || undefined,
                default_distance_m: editingDrill.default_distance_m ?? editingDrill.distance_m,
                default_rounds_per_shooter: editingDrill.default_rounds_per_shooter ?? editingDrill.rounds_per_shooter,
                default_time_limit_seconds: editingDrill.default_time_limit_seconds ?? editingDrill.time_limit_seconds ?? undefined,
                default_par_time_seconds: editingDrill.default_par_time_seconds ?? editingDrill.par_time_seconds ?? undefined,
                default_strings_count: editingDrill.default_strings_count ?? editingDrill.strings_count ?? undefined,
                default_min_accuracy_percent: editingDrill.default_min_accuracy_percent ?? editingDrill.min_accuracy_percent ?? undefined,
              }
            : undefined
        }
        mode={editingDrill ? 'edit' : 'create'}
      />

      <DrillDetailModal visible={selectedDrill !== null} onClose={() => setSelectedDrill(null)} drill={selectedDrill} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  page: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  errorText: { fontSize: 18, fontWeight: '600' },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1, alignItems: 'center' },
  teamName: { fontSize: 18, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  roleText: { fontSize: 11, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // View Switcher
  viewSwitcher: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewTabText: { fontSize: 14, fontWeight: '600' },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionLink: { fontSize: 14, fontWeight: '600' },

  // Live Session Status (informational, not action CTA)
  liveStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  liveStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
  liveStatusContent: { flex: 1 },
  liveStatusLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  liveStatusTitle: { fontSize: 15, fontWeight: '600' },
  liveStatusMeta: { fontSize: 12, marginTop: 2 },
  liveStatusAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Card
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center', gap: 6 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },

  progressSection: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13 },
  progressValue: { fontSize: 13, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Squad Grid
  squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  squadCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  squadIndicator: { width: 4, height: 24, borderRadius: 2 },
  squadName: { fontSize: 14, fontWeight: '600' },
  squadMeta: { fontSize: 12 },

  // Member Status Card
  memberStatusCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  statusItem: { alignItems: 'center', gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusCount: { fontSize: 18, fontWeight: '700' },
  statusLabel: { fontSize: 11 },

  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderTopWidth: 1 },
  memberAvatars: { flexDirection: 'row' },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  memberAvatarText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Training Item
  trainingItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  trainingDate: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trainingDay: { fontSize: 18, fontWeight: '700' },
  trainingMonth: { fontSize: 11, fontWeight: '500' },
  trainingInfo: { flex: 1 },
  trainingTitle: { fontSize: 15, fontWeight: '600' },
  trainingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trainingTime: { fontSize: 12 },

  emptyTraining: { alignItems: 'center', padding: 28, borderRadius: 14, borderWidth: 1, gap: 10 },
  emptyText: { fontSize: 14 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  scheduleBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 13, fontWeight: '600' },
  quickActionCount: { fontSize: 12 },

  // Library View
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },

  addDrillButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 20 },
  addDrillText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  drillList: { gap: 10 },
  drillCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  drillAccent: { width: 4, alignSelf: 'stretch' },
  drillContent: { flex: 1, padding: 14 },
  drillHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  drillName: { flex: 1, fontSize: 15, fontWeight: '600' },
  drillBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  drillBadgeText: { fontSize: 10, fontWeight: '700' },
  drillMeta: { fontSize: 13 },

  emptyDrills: { alignItems: 'center', padding: 40, borderRadius: 14, borderWidth: 1, gap: 12 },
});
