/**
 * Schedule Screen - Redesigned
 * 
 * Simplified architecture:
 * - Single view with team filter (no confusing tabs)
 * - Drill Library visible to everyone (role-based edit)
 * - Quick Practice from templates
 * - Upcoming trainings from all teams
 */
import { EnhancedDrillModal } from '@/components/drills/EnhancedDrillModal';
import { useColors } from '@/hooks/ui/useColors';
import {
  createDrillTemplate,
  deleteDrillTemplate,
  getTeamDrillTemplates,
  updateDrillTemplate,
} from '@/services/drillTemplateService';
import { getSessions, startQuickPractice, type SessionWithDetails } from '@/services/sessionService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type {
  CreateDrillInput,
  DrillTemplate,
  TeamRole,
  TeamWithRole,
  TrainingWithDetails,
} from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Play,
  Plus,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRoleBadge(role: TeamRole | null): { label: string; color: string; icon: string } {
  switch (role) {
    case 'owner':
      return { label: 'Owner', color: '#F59E0B', icon: 'crown' };
    case 'commander':
      return { label: 'Commander', color: '#10B981', icon: 'star' };
    case 'squad_commander':
      return { label: 'Squad Cmdr', color: '#6366F1', icon: 'ribbon' };
    case 'soldier':
    default:
      return { label: 'Soldier', color: '#6B7280', icon: 'person' };
  }
}

function canManageTeam(role: TeamRole | null): boolean {
  return role === 'owner' || role === 'commander';
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM FILTER DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

function TeamFilterDropdown({
  teams,
  selectedTeamId,
  onSelect,
  colors,
}: {
  teams: TeamWithRole[];
  selectedTeamId: string | null;
  onSelect: (teamId: string | null) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const label = selectedTeam?.name || 'All Teams';

  return (
    <>
      <TouchableOpacity
        style={[styles.filterBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => {
          Haptics.selectionAsync();
          setVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterBtnText, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View
            style={[
              styles.dropdownContent,
              { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.dropdownTitle, { color: colors.text }]}>Filter by Team</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {/* All Teams option */}
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  { backgroundColor: selectedTeamId === null ? colors.primary + '10' : 'transparent' },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(null);
                  setVisible(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: selectedTeamId === null ? colors.primary : colors.text }]}>
                  All Teams
                </Text>
                {selectedTeamId === null && <Check size={18} color={colors.primary} />}
              </TouchableOpacity>

              {/* Individual teams */}
              {teams.map((team) => {
                const isActive = team.id === selectedTeamId;
                const badge = getRoleBadge(team.my_role);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[styles.dropdownItem, { backgroundColor: isActive ? colors.primary + '10' : 'transparent' }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelect(team.id);
                      setVisible(false);
                    }}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={[styles.dropdownItemText, { color: isActive ? colors.primary : colors.text }]}>
                        {team.name}
                      </Text>
                      <View style={[styles.roleBadge, { backgroundColor: badge.color + '20' }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>
                    {isActive && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING ROW
// ─────────────────────────────────────────────────────────────────────────────

function TrainingRow({
  training,
  colors,
  userRole,
  onPress,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  userRole?: TeamRole | null;
  onPress: () => void;
}) {
  const isLive = training.status === 'ongoing';
  const statusColor = isLive ? colors.green : training.status === 'planned' ? colors.primary : colors.textMuted;
  const badge = getRoleBadge(userRole || null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <View style={styles.rowMetaRow}>
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
            {formatDate(training.scheduled_at)}
          </Text>
          {training.team?.name && (
            <>
              <Text style={[styles.rowMetaDot, { color: colors.border }]}>•</Text>
              <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{training.team.name}</Text>
            </>
          )}
        </View>
      </View>
      {isLive && (
        <View style={[styles.liveBadge, { backgroundColor: `${colors.green}18` }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.liveText, { color: colors.green }]}>Live</Text>
        </View>
      )}
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRILL TEMPLATE CARD (with Quick Practice)
// ─────────────────────────────────────────────────────────────────────────────

function DrillTemplateCard({
  template,
  colors,
  userRole,
  onEdit,
  onDelete,
  onPractice,
  practicing,
}: {
  template: DrillTemplate;
  colors: ReturnType<typeof useColors>;
  userRole?: TeamRole | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onPractice: () => void;
  practicing: boolean;
}) {
  const isGrouping = template.drill_goal === 'grouping';
  const goalColor = isGrouping ? '#10B981' : '#93C5FD';
  const canEdit = canManageTeam(userRole ?? null);

  return (
    <View style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Content */}
      <TouchableOpacity
        style={styles.drillCardContent}
        onPress={canEdit && onEdit ? onEdit : onPractice}
        onLongPress={() => {
          if (!canEdit) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(template.name, 'What would you like to do?', [
            { text: 'Edit', onPress: onEdit },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.drillMainRow}>
          <View style={[styles.drillTypeBadge, { backgroundColor: `${goalColor}15` }]}>
            <Text style={[styles.drillTypeLetter, { color: goalColor }]}>
              {isGrouping ? 'G' : 'A'}
            </Text>
          </View>
          <View style={styles.drillInfo}>
            <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
              {template.distance_m}m • {template.rounds_per_shooter} shots
              {template.time_limit_seconds ? ` • ${template.time_limit_seconds}s` : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Practice Button */}
      <TouchableOpacity
        style={[styles.practiceBtn, { backgroundColor: goalColor }]}
        onPress={onPractice}
        disabled={practicing}
        activeOpacity={0.8}
      >
        {practicing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Play size={16} color="#fff" fill="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION ROW (for solo users without teams)
// ─────────────────────────────────────────────────────────────────────────────

function SessionRow({
  session,
  colors,
  onPress,
}: {
  session: SessionWithDetails;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isActive = session.status === 'active';
  const statusColor = isActive ? colors.green : colors.primary;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {session.drill_name || session.training_title || 'Solo Practice'}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{formatDate(session.started_at)}</Text>
      </View>
      {isActive && (
        <View style={[styles.liveBadge, { backgroundColor: `${colors.green}18` }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.liveText, { color: colors.green }]}>Active</Text>
        </View>
      )}
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  action,
  actionLabel,
  colors,
}: {
  title: string;
  count?: number;
  action?: () => void;
  actionLabel?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
        {count !== undefined && count > 0 && (
          <Text style={{ color: colors.textMuted }}> ({count})</Text>
        )}
      </Text>
      {action && actionLabel && (
        <TouchableOpacity
          style={[styles.sectionAction, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            action();
          }}
        >
          <Plus size={12} color="#fff" />
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  title,
  description,
  colors,
}: {
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{description}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams } = useTeamStore();
  const { myUpcomingTrainings, myTrainingsInitialized, loadMyUpcomingTrainings } = useTrainingStore();

  // Filter state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Sessions for solo users
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Drill templates (from all teams or filtered team)
  const [allDrillTemplates, setAllDrillTemplates] = useState<Map<string, DrillTemplate[]>>(new Map());
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Drill modal
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DrillTemplate | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Quick practice
  const [practicingDrillId, setPracticingDrillId] = useState<string | null>(null);

  const hasTeams = teams.length > 0;

  // Find user's role for each team
  const getTeamRole = useCallback(
    (teamId: string): TeamRole | null => {
      const team = teams.find((t) => t.id === teamId);
      return team?.my_role || null;
    },
    [teams]
  );

  // Check if user can manage ANY team
  const canManageAnyTeam = useMemo(() => {
    return teams.some((t) => canManageTeam(t.my_role));
  }, [teams]);

  // Load sessions for solo users
  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions(null);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Load drill templates for all teams
  const loadAllDrillTemplates = useCallback(async () => {
    if (teams.length === 0) return;

    setLoadingTemplates(true);
    try {
      const templatesMap = new Map<string, DrillTemplate[]>();
      await Promise.all(
        teams.map(async (team) => {
          try {
            const templates = await getTeamDrillTemplates(team.id);
            templatesMap.set(team.id, templates);
          } catch (error) {
            console.error(`Failed to load templates for ${team.name}:`, error);
            templatesMap.set(team.id, []);
          }
        })
      );
      setAllDrillTemplates(templatesMap);
    } finally {
      setLoadingTemplates(false);
    }
  }, [teams]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (hasTeams) {
        loadMyUpcomingTrainings();
        loadAllDrillTemplates();
      } else {
        loadSessions();
      }
    }, [hasTeams, loadMyUpcomingTrainings, loadSessions, loadAllDrillTemplates])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hasTeams) {
      await Promise.all([loadMyUpcomingTrainings(), loadAllDrillTemplates()]);
    } else {
      await loadSessions();
    }
    setRefreshing(false);
  }, [hasTeams, loadMyUpcomingTrainings, loadSessions, loadAllDrillTemplates]);

  // Filter trainings by selected team
  const filteredTrainings = useMemo(() => {
    let trainings = [...myUpcomingTrainings];
    if (selectedTeamId) {
      trainings = trainings.filter((t) => t.team_id === selectedTeamId);
    }
    return trainings.sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
  }, [myUpcomingTrainings, selectedTeamId]);

  // Filter drill templates by selected team
  const filteredDrillTemplates = useMemo(() => {
    const result: { team: TeamWithRole; templates: DrillTemplate[] }[] = [];

    if (selectedTeamId) {
      const team = teams.find((t) => t.id === selectedTeamId);
      const templates = allDrillTemplates.get(selectedTeamId) || [];
      if (team) {
        result.push({ team, templates });
      }
    } else {
      teams.forEach((team) => {
        const templates = allDrillTemplates.get(team.id) || [];
        if (templates.length > 0) {
          result.push({ team, templates });
        }
      });
    }

    return result;
  }, [teams, allDrillTemplates, selectedTeamId]);

  const totalTemplateCount = useMemo(() => {
    return filteredDrillTemplates.reduce((sum, group) => sum + group.templates.length, 0);
  }, [filteredDrillTemplates]);

  // Sort sessions: active first, then by date
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [sessions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleTrainingPress = (training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (training.status === 'ongoing') {
      router.push(`/(protected)/trainingLive?trainingId=${training.id}` as any);
    } else {
      router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
    }
  };

  const handleSessionPress = (session: SessionWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/activeSession?sessionId=${session.id}` as any);
  };

  const handleCreateTraining = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTraining' as any);
  };

  const handleCreateDrill = (teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingTeamId(teamId);
    setEditingTemplate(null);
    setDrillModalVisible(true);
  };

  const handleEditTemplate = (template: DrillTemplate) => {
    setEditingTeamId(template.team_id);
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
            await loadAllDrillTemplates();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete template');
          }
        },
      },
    ]);
  };

  const handleSaveDrillTemplate = async (drill: CreateDrillInput & { id?: string }) => {
    if (!editingTeamId) return;

    try {
      if (editingTemplate) {
        await updateDrillTemplate(editingTemplate.id, drill);
      } else {
        await createDrillTemplate(editingTeamId, drill as any);
      }
      await loadAllDrillTemplates();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save drill template');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleQuickPractice = async (template: DrillTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPracticingDrillId(template.id);

    try {
      const session = await startQuickPractice(template.id);
      router.push(`/(protected)/activeSession?sessionId=${session.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start practice session');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPracticingDrillId(null);
    }
  };

  const isLoading = hasTeams ? !myTrainingsInitialized || loadingTemplates : loadingSessions;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {hasTeams ? 'Trainings & drill library' : 'Your practice sessions'}
            </Text>
          </View>
          {hasTeams && teams.length > 1 && (
            <TeamFilterDropdown
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelect={setSelectedTeamId}
              colors={colors}
            />
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* TEAM USERS */}
        {hasTeams && !isLoading && (
          <>
            {/* Upcoming Trainings */}
            <SectionHeader
              title="Upcoming"
              count={filteredTrainings.length}
              action={canManageAnyTeam ? handleCreateTraining : undefined}
              actionLabel="New"
              colors={colors}
            />

            {filteredTrainings.length === 0 ? (
              <EmptyState
                title="No upcoming trainings"
                description={selectedTeamId ? 'No trainings for this team' : "You're all caught up!"}
                colors={colors}
              />
            ) : (
              <View style={styles.list}>
                {filteredTrainings.map((t) => (
                  <TrainingRow
                    key={t.id}
                    training={t}
                    colors={colors}
                    userRole={getTeamRole(t.team_id!)}
                    onPress={() => handleTrainingPress(t)}
                  />
                ))}
              </View>
            )}

            {/* Drill Library */}
            <View style={styles.sectionSpacer} />
            <SectionHeader
              title="Drill Library"
              count={totalTemplateCount}
              colors={colors}
            />

            {filteredDrillTemplates.length === 0 ? (
              <EmptyState
                title="No drills yet"
                description={canManageAnyTeam ? 'Create reusable drills for your teams' : 'No drills available'}
                colors={colors}
              />
            ) : (
              filteredDrillTemplates.map(({ team, templates }) => (
                <View key={team.id} style={styles.drillGroup}>
                  <View style={styles.drillGroupHeader}>
                    <Text style={[styles.drillGroupTeam, { color: colors.textMuted }]}>{team.name}</Text>
                    {canManageTeam(team.my_role) && (
                      <TouchableOpacity
                        style={[styles.drillGroupAdd, { backgroundColor: colors.secondary }]}
                        onPress={() => handleCreateDrill(team.id)}
                      >
                        <Plus size={12} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.drillList}>
                    {templates.map((t) => (
                      <DrillTemplateCard
                        key={t.id}
                        template={t}
                        colors={colors}
                        userRole={team.my_role}
                        onEdit={canManageTeam(team.my_role) ? () => handleEditTemplate(t) : undefined}
                        onDelete={canManageTeam(team.my_role) ? () => handleDeleteTemplate(t) : undefined}
                        onPractice={() => handleQuickPractice(t)}
                        practicing={practicingDrillId === t.id}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* SOLO USERS (no teams) */}
        {!hasTeams && !isLoading && (
          <>
            <SectionHeader
              title="Recent Sessions"
              count={sortedSessions.length}
              colors={colors}
            />

            {sortedSessions.length === 0 ? (
              <EmptyState
                title="No sessions yet"
                description="Start a practice session from Home"
                colors={colors}
              />
            ) : (
              <View style={styles.list}>
                {sortedSessions.map((s) => (
                  <SessionRow key={s.id} session={s} colors={colors} onPress={() => handleSessionPress(s)} />
                ))}
              </View>
            )}

            {/* Join Team Prompt */}
            <View style={[styles.joinTeamCard, { backgroundColor: colors.secondary }]}>
              <View style={styles.joinTeamContent}>
                <Text style={[styles.joinTeamTitle, { color: colors.text }]}>Join a Team</Text>
                <Text style={[styles.joinTeamDesc, { color: colors.textMuted }]}>
                  Access team trainings and drills
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.joinTeamBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(protected)/acceptInvite' as any)}
              >
                <Text style={styles.joinTeamBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Drill Template Modal */}
      <EnhancedDrillModal
        visible={drillModalVisible}
        onClose={() => {
          setDrillModalVisible(false);
          setEditingTemplate(null);
          setEditingTeamId(null);
        }}
        onSave={handleSaveDrillTemplate}
        initialData={
          editingTemplate
            ? {
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
              }
            : undefined
        }
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
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 2 },

  // Team Filter
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 150,
  },
  filterBtnText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Dropdown
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  dropdownTitle: { fontSize: 18, fontWeight: '700' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  dropdownItemContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownItemText: { fontSize: 16, fontWeight: '500' },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionActionText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  sectionSpacer: { height: 24 },

  // List & Rows
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rowMeta: { fontSize: 13 },
  rowMetaDot: { fontSize: 8 },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '700' },

  // Drill Cards
  drillGroup: { marginBottom: 16 },
  drillGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  drillGroupTeam: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  drillGroupAdd: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillList: { gap: 8 },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  drillCardContent: { flex: 1 },
  drillMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drillTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillTypeLetter: { fontSize: 16, fontWeight: '700' },
  drillInfo: { flex: 1, gap: 2 },
  drillName: { fontSize: 15, fontWeight: '600' },
  drillMeta: { fontSize: 12 },
  practiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptyDesc: { fontSize: 13, textAlign: 'center' },

  // Loading
  loading: { paddingVertical: 60 },

  // Join Team Card
  joinTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginTop: 24,
  },
  joinTeamContent: { flex: 1 },
  joinTeamTitle: { fontSize: 15, fontWeight: '600' },
  joinTeamDesc: { fontSize: 12, marginTop: 2 },
  joinTeamBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinTeamBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
