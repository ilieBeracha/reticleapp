/**
 * Team Workspace
 * 
 * Full-page team workspace with two tabs:
 * - Overview: Team dashboard, stats, members preview
 * - Library: Drill templates for this team
 */
import { EnhancedDrillModal } from '@/components/drills/EnhancedDrillModal';
import { useColors } from '@/hooks/ui/useColors';
import {
    createDrillTemplate,
    deleteDrillTemplate,
    getTeamDrillTemplates,
    updateDrillTemplate,
} from '@/services/drillTemplateService';
import { startQuickPractice } from '@/services/sessionService';
import { getTeamMembers } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type {
    CreateDrillInput,
    DrillTemplate,
    TeamMemberWithProfile,
    TrainingWithDetails
} from '@/types/workspace';
import { formatMaxShots } from '@/utils/drillShots';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Calendar,
    ChevronRight,
    Crown,
    Layers,
    Play,
    Plus,
    Search,
    Shield,
    Target,
    UserPlus,
    Users,
    X,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type WorkspaceTab = 'overview' | 'library';
type LibraryFilter = 'all' | 'grouping' | 'achievement';

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

function getDifficultyLabel(difficulty: string | null | undefined): { label: string; color: string } {
  switch (difficulty) {
    case 'beginner': return { label: 'Beginner', color: '#10B981' };
    case 'intermediate': return { label: 'Intermediate', color: '#F59E0B' };
    case 'advanced': return { label: 'Advanced', color: '#EF4444' };
    case 'expert': return { label: 'Expert', color: '#7C3AED' };
    default: return { label: '', color: '' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function TabSelector({
  activeTab,
  onTabChange,
  colors,
  libraryCount,
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  colors: ReturnType<typeof useColors>;
  libraryCount: number;
}) {
  const tabs: { key: WorkspaceTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <Layers size={16} /> },
    { key: 'library', label: 'Library', icon: <Target size={16} />, count: libraryCount },
  ];

  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {tabs.map(({ key, label, icon, count }) => {
        const isActive = activeTab === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onTabChange(key);
            }}
          >
            {isActive && (
              <LinearGradient
                colors={[colors.primary, colors.primary + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabActiveGradient}
              />
            )}
            <View style={[styles.tabIcon, { opacity: isActive ? 1 : 0.5 }]}>
              {React.cloneElement(icon as React.ReactElement<{ color: string }>, { 
                color: isActive ? '#fff' : colors.textMuted 
              })}
            </View>
            <Text style={[styles.tabText, { color: isActive ? '#fff' : colors.textMuted }]}>
              {label}
            </Text>
            {count !== undefined && count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.border }]}>
                <Text style={[styles.tabBadgeText, { color: isActive ? '#fff' : colors.textMuted }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE CARD
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseCard({
  drill,
  colors,
  canEdit,
  onEdit,
  onDelete,
  onPractice,
  practicing,
}: {
  drill: DrillTemplate;
  colors: ReturnType<typeof useColors>;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPractice: () => void;
  practicing: boolean;
}) {
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? '#10B981' : '#93C5FD';
  const difficulty = getDifficultyLabel(drill.difficulty);

  return (
    <TouchableOpacity
      style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPractice}
      onLongPress={() => {
        if (!canEdit) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(drill.name, 'What would you like to do?', [
          { text: 'Edit', onPress: onEdit },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.exerciseHeader}>
        <View style={[styles.exerciseTypeBadge, { backgroundColor: goalColor + '20' }]}>
          <Text style={[styles.exerciseTypeText, { color: goalColor }]}>
            {isGrouping ? 'Grouping' : 'Achievement'}
          </Text>
        </View>
        {difficulty.label && (
          <Text style={[styles.exerciseDifficulty, { color: difficulty.color }]}>
            {difficulty.label}
          </Text>
        )}
      </View>

      <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
        {drill.name}
      </Text>

      <View style={styles.exerciseStats}>
        <Text style={[styles.exerciseStat, { color: colors.textMuted }]}>{drill.distance_m}m</Text>
        <Text style={[styles.exerciseStatDot, { color: colors.border }]}>·</Text>
        <Text style={[styles.exerciseStat, { color: colors.textMuted }]}>
          {drill.target_type === 'paper'
            ? `Scan (max ${formatMaxShots(drill.rounds_per_shooter)})`
            : `${drill.rounds_per_shooter} shots`}
        </Text>
        {drill.time_limit_seconds && (
          <>
            <Text style={[styles.exerciseStatDot, { color: colors.border }]}>·</Text>
            <Text style={[styles.exerciseStat, { color: colors.textMuted }]}>{drill.time_limit_seconds}s</Text>
          </>
        )}
      </View>

      <View style={styles.exerciseFooter}>
        <TouchableOpacity
          style={[styles.exercisePlayBtn, { backgroundColor: goalColor }]}
          onPress={(e) => {
            e.stopPropagation?.();
            onPractice();
          }}
          disabled={practicing}
        >
          {practicing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Play size={14} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamWorkspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, setActiveTeam } = useTeamStore();
  const { teamTrainings, loadTeamTrainings } = useTrainingStore();

  // Find the team
  const team = useMemo(() => teams.find(t => t.id === id), [teams, id]);
  const roleConfig = getRoleConfig(team?.my_role);
  const canManage = canManageTeam(team?.my_role);

  // Tab state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  
  // Data state
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [drillTemplates, setDrillTemplates] = useState<DrillTemplate[]>([]);

  // Library state
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DrillTemplate | null>(null);
  const [practicingDrillId, setPracticingDrillId] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setActiveTeam(id);
      const [membersData, templatesData] = await Promise.all([
        getTeamMembers(id),
        getTeamDrillTemplates(id),
      ]);
      setMembers(membersData);
      setDrillTemplates(templatesData);
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

  // Team trainings
  const upcomingTrainings = useMemo(() => {
    return teamTrainings
      .filter(t => t.team_id === id && (t.status === 'planned' || t.status === 'ongoing'))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 3);
  }, [teamTrainings, id]);

  // Filter drills
  const filteredDrills = useMemo(() => {
    return drillTemplates.filter(drill => {
      if (libraryFilter === 'grouping' && drill.drill_goal !== 'grouping') return false;
      if (libraryFilter === 'achievement' && drill.drill_goal !== 'achievement') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!drill.name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [drillTemplates, libraryFilter, searchQuery]);

  // Handlers
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewAllMembers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamMembers?teamId=${id}` as any);
  };

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamSettings?teamId=${id}` as any);
  };

  const handleInvite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/inviteTeamMember?teamId=${id}` as any);
  };

  const handleCreateTraining = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/createTraining?teamId=${id}` as any);
  };

  const handleTrainingPress = (training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (training.status === 'ongoing') {
      router.push(`/(protected)/trainingLive?trainingId=${training.id}` as any);
    } else {
      router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
    }
  };

  const handleCreateDrill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingTemplate(null);
    setDrillModalVisible(true);
  };

  const handleEditTemplate = (template: DrillTemplate) => {
    setEditingTemplate(template);
    setDrillModalVisible(true);
  };

  const handleDeleteTemplate = async (template: DrillTemplate) => {
    Alert.alert('Delete Drill', `Are you sure you want to delete "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDrillTemplate(template.id);
            await loadData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleSaveDrillTemplate = async (drill: CreateDrillInput & { id?: string }) => {
    if (!id) return;
    try {
      if (editingTemplate) {
        await updateDrillTemplate(editingTemplate.id, drill);
      } else {
        await createDrillTemplate(id, drill as any);
      }
      await loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleQuickPractice = async (drill: DrillTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPracticingDrillId(drill.id);
    try {
      const session = await startQuickPractice(drill.id);
      router.push(`/(protected)/activeSession?sessionId=${session.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start practice');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPracticingDrillId(null);
    }
  };

  if (!team) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Users size={48} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.text }]}>Team not found</Text>
          <TouchableOpacity style={[styles.errorBtn, { backgroundColor: colors.primary }]} onPress={handleBack}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{team.name}</Text>
          <View style={[styles.headerRoleBadge, { backgroundColor: roleConfig.color + '15' }]}>
            <Text style={[styles.headerRoleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity style={[styles.headerActionBtn, { backgroundColor: colors.primary }]} onPress={handleInvite}>
              <UserPlus size={16} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.secondary }]} onPress={handleOpenSettings}>
            <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabWrapper}>
        <TabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          colors={colors}
          libraryCount={drillTemplates.length}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'overview' && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{members.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Members</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{upcomingTrainings.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Upcoming</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{drillTemplates.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Drills</Text>
              </View>
            </View>

            {/* Quick Actions */}
            {canManage && (
              <TouchableOpacity
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                onPress={handleCreateTraining}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.primaryActionText}>Schedule Training</Text>
              </TouchableOpacity>
            )}

            {/* Upcoming Trainings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Trainings</Text>
              {upcomingTrainings.length > 0 ? (
                <View style={styles.trainingList}>
                  {upcomingTrainings.map(training => (
                    <TouchableOpacity
                      key={training.id}
                      style={[styles.trainingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleTrainingPress(training)}
                    >
                      <View style={[styles.trainingIcon, { backgroundColor: training.status === 'ongoing' ? '#10B98115' : colors.secondary }]}>
                        <Calendar size={16} color={training.status === 'ongoing' ? '#10B981' : colors.textMuted} />
                      </View>
                      <View style={styles.trainingContent}>
                        <Text style={[styles.trainingTitle, { color: colors.text }]}>{training.title}</Text>
                        <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
                          {format(new Date(training.scheduled_at), 'MMM d, HH:mm')}
                        </Text>
                      </View>
                      {training.status === 'ongoing' && (
                        <View style={[styles.liveBadge, { backgroundColor: '#10B98120' }]}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>Live</Text>
                        </View>
                      )}
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Calendar size={24} color={colors.textMuted} />
                  <Text style={[styles.emptyCardText, { color: colors.textMuted }]}>No upcoming trainings</Text>
                </View>
              )}
            </View>

            {/* Members Preview */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Members</Text>
                <TouchableOpacity onPress={handleViewAllMembers}>
                  <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.membersCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleViewAllMembers}
                activeOpacity={0.7}
              >
                <Text style={[styles.membersCount, { color: colors.text }]}>{members.length}</Text>
                <Text style={[styles.membersLabel, { color: colors.textMuted }]}>team members</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LIBRARY TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'library' && (
          <>
            {/* Filters */}
            <View style={styles.filterRow}>
              {(['all', 'grouping', 'achievement'] as LibraryFilter[]).map(filter => {
                const isActive = libraryFilter === filter;
                const filterColor = filter === 'grouping' ? '#10B981' : filter === 'achievement' ? '#93C5FD' : colors.primary;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      { backgroundColor: isActive ? filterColor + '20' : colors.secondary, borderColor: isActive ? filterColor : colors.border },
                    ]}
                    onPress={() => setLibraryFilter(filter)}
                  >
                    <Text style={[styles.filterChipText, { color: isActive ? filterColor : colors.textMuted }]}>
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search drills..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Header */}
            <View style={styles.libraryHeader}>
              <Text style={[styles.libraryCount, { color: colors.text }]}>
                {filteredDrills.length} drill{filteredDrills.length !== 1 ? 's' : ''}
              </Text>
              {canManage && (
                <TouchableOpacity style={[styles.addDrillBtn, { backgroundColor: colors.primary }]} onPress={handleCreateDrill}>
                  <Plus size={14} color="#fff" />
                  <Text style={styles.addDrillBtnText}>New</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Drill Grid */}
            {filteredDrills.length > 0 ? (
              <View style={styles.drillGrid}>
                {filteredDrills.map(drill => (
                  <ExerciseCard
                    key={drill.id}
                    drill={drill}
                    colors={colors}
                    canEdit={canManage}
                    onEdit={() => handleEditTemplate(drill)}
                    onDelete={() => handleDeleteTemplate(drill)}
                    onPractice={() => handleQuickPractice(drill)}
                    practicing={practicingDrillId === drill.id}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Target size={24} color={colors.textMuted} />
                <Text style={[styles.emptyCardText, { color: colors.textMuted }]}>
                  {searchQuery ? 'No drills found' : 'No drills yet'}
                </Text>
                {canManage && !searchQuery && (
                  <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={handleCreateDrill}>
                    <Plus size={14} color="#fff" />
                    <Text style={styles.emptyBtnText}>Create Drill</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Drill Modal */}
      <EnhancedDrillModal
        visible={drillModalVisible}
        onClose={() => {
          setDrillModalVisible(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveDrillTemplate}
        initialData={editingTemplate ? {
          id: editingTemplate.id,
          name: editingTemplate.name,
          description: editingTemplate.description || undefined,
          drill_goal: editingTemplate.drill_goal,
          target_type: editingTemplate.target_type,
          distance_m: editingTemplate.distance_m,
          rounds_per_shooter: editingTemplate.rounds_per_shooter,
          time_limit_seconds: editingTemplate.time_limit_seconds || undefined,
          par_time_seconds: editingTemplate.par_time_seconds || undefined,
          scoring_mode: editingTemplate.scoring_mode || undefined,
          min_accuracy_percent: editingTemplate.min_accuracy_percent || undefined,
          position: editingTemplate.position || undefined,
          start_position: editingTemplate.start_position || undefined,
          weapon_category: editingTemplate.weapon_category || undefined,
          strings_count: editingTemplate.strings_count || undefined,
          reload_required: editingTemplate.reload_required || undefined,
          movement_type: editingTemplate.movement_type || undefined,
          difficulty: editingTemplate.difficulty || undefined,
          category: editingTemplate.category || undefined,
          instructions: editingTemplate.instructions || undefined,
          safety_notes: editingTemplate.safety_notes || undefined,
        } : undefined}
        mode={editingTemplate ? 'edit' : 'add'}
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
  content: { paddingHorizontal: 16 },

  // Error
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 18, fontWeight: '600' },
  errorBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  errorBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerRoleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  headerRoleText: { fontSize: 10, fontWeight: '600' },
  settingsBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabWrapper: { paddingHorizontal: 16, marginBottom: 16 },
  tabContainer: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabActiveGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 10 },
  tabIcon: { marginRight: 2 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, minWidth: 20, alignItems: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },

  // Loading
  loading: { paddingVertical: 60 },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },

  // Primary Action
  primaryAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 20 },
  primaryActionText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  sectionLink: { fontSize: 13, fontWeight: '600' },

  // Training List
  trainingList: { gap: 10 },
  trainingRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  trainingIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trainingContent: { flex: 1 },
  trainingTitle: { fontSize: 15, fontWeight: '600' },
  trainingMeta: { fontSize: 12, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#10B981' },

  // Empty Card
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 1, gap: 8 },
  emptyCardText: { fontSize: 14 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Members Card
  membersCard: { alignItems: 'center', padding: 20, borderRadius: 12, borderWidth: 1 },
  membersCount: { fontSize: 28, fontWeight: '700' },
  membersLabel: { fontSize: 13, marginTop: 4 },

  // Library
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  libraryCount: { fontSize: 15, fontWeight: '600' },
  addDrillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addDrillBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  drillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Exercise Card
  exerciseCard: { width: CARD_WIDTH, padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exerciseTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  exerciseTypeText: { fontSize: 10, fontWeight: '700' },
  exerciseDifficulty: { fontSize: 10, fontWeight: '600' },
  exerciseName: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  exerciseStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  exerciseStat: { fontSize: 12 },
  exerciseStatDot: { fontSize: 8, marginHorizontal: 4 },
  exerciseFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  exercisePlayBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Header Actions
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

