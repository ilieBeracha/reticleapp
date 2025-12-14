/**
 * Schedule Screen - Exercise Library Style
 * 
 * Two main sections:
 * - Trainings: Scheduled team events
 * - Drill Library: Browsable exercise catalog
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
  DrillCategory,
  DrillTemplate,
  TeamRole,
  TeamWithRole,
  TrainingWithDetails,
} from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, ChevronDown, ChevronRight, Play, Plus, Search, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type MainTab = 'trainings' | 'library';
type LibraryFilter = 'all' | 'grouping' | 'achievement';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function canManageTeam(role: TeamRole | null): boolean {
  return role === 'owner' || role === 'commander';
}

function getCategoryLabel(category: DrillCategory | null | undefined): string {
  switch (category) {
    case 'fundamentals': return 'Fundamentals';
    case 'speed': return 'Speed';
    case 'accuracy': return 'Accuracy';
    case 'stress': return 'Stress';
    case 'tactical': return 'Tactical';
    case 'competition': return 'Competition';
    case 'qualification': return 'Qualification';
    default: return 'General';
  }
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
// MAIN TAB SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function MainTabSelector({
  activeTab,
  onTabChange,
  colors,
  libraryCount,
}: {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  colors: ReturnType<typeof useColors>;
  libraryCount: number;
}) {
  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.secondary }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'trainings' && [styles.tabActive, { backgroundColor: colors.card }]]}
        onPress={() => {
          Haptics.selectionAsync();
          onTabChange('trainings');
        }}
      >
        <Text style={[styles.tabText, { color: activeTab === 'trainings' ? colors.text : colors.textMuted }]}>
          Trainings
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'library' && [styles.tabActive, { backgroundColor: colors.card }]]}
        onPress={() => {
          Haptics.selectionAsync();
          onTabChange('library');
        }}
      >
        <Text style={[styles.tabText, { color: activeTab === 'library' ? colors.text : colors.textMuted }]}>
          Drill Library
        </Text>
        {libraryCount > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.tabBadgeText}>{libraryCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────

function LibraryFilterChips({
  activeFilter,
  onFilterChange,
  colors,
}: {
  activeFilter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const filters: { key: LibraryFilter; label: string; color?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'grouping', label: 'Grouping', color: '#10B981' },
    { key: 'achievement', label: 'Achievement', color: '#93C5FD' },
  ];

  return (
    <View style={styles.filterChips}>
      {filters.map(({ key, label, color }) => {
        const isActive = activeFilter === key;
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterChip,
              {
                backgroundColor: isActive ? (color || colors.primary) + '20' : colors.secondary,
                borderColor: isActive ? (color || colors.primary) : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onFilterChange(key);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: isActive ? (color || colors.primary) : colors.textMuted },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM DROPDOWN (for Library)
// ─────────────────────────────────────────────────────────────────────────────

function TeamDropdown({
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

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const label = selectedTeam?.name || 'All Teams';

  return (
    <>
      <TouchableOpacity
        style={[styles.teamDropdownBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => {
          Haptics.selectionAsync();
          setVisible(true);
        }}
      >
        <Text style={[styles.teamDropdownText, { color: colors.text }]} numberOfLines={1}>
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
              <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Team</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
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

              {teams.map((team) => {
                const isActive = team.id === selectedTeamId;
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
                    <Text style={[styles.dropdownItemText, { color: isActive ? colors.primary : colors.text }]}>
                      {team.name}
                    </Text>
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
  onPress,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isLive = training.status === 'ongoing';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, HH:mm');
  };

  return (
    <TouchableOpacity
      style={[styles.trainingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.trainingRowContent}>
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
          {formatDate(training.scheduled_at)} · {training.team?.name || 'Team'}
          {training.drill_count ? ` · ${training.drill_count} drills` : ''}
        </Text>
      </View>
      {isLive && (
        <View style={[styles.liveBadge, { backgroundColor: '#10B98120' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      )}
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE CARD (Drill Template)
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseCard({
  drill,
  teamName,
  colors,
  canEdit,
  onEdit,
  onDelete,
  onPractice,
  practicing,
}: {
  drill: DrillTemplate;
  teamName: string;
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
  const category = getCategoryLabel(drill.category);

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
      {/* Header with type badge */}
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

      {/* Name */}
      <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
        {drill.name}
      </Text>

      {/* Stats Row */}
      <View style={styles.exerciseStats}>
        <Text style={[styles.exerciseStat, { color: colors.textMuted }]}>
          {drill.distance_m}m
        </Text>
        <Text style={[styles.exerciseStatDot, { color: colors.border }]}>·</Text>
        <Text style={[styles.exerciseStat, { color: colors.textMuted }]}>
          {drill.rounds_per_shooter} shots
        </Text>
        {drill.time_limit_seconds && (
          <>
            <Text style={[styles.exerciseStatDot, { color: colors.border }]}>·</Text>
            <Text style={[styles.exerciseStat, { color: colors.textMuted }]}>
              {drill.time_limit_seconds}s
            </Text>
          </>
        )}
      </View>

      {/* Footer */}
      <View style={styles.exerciseFooter}>
        <Text style={[styles.exerciseTeam, { color: colors.textMuted }]} numberOfLines={1}>
          {teamName}
        </Text>
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
// SESSION ROW (for solo users)
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <TouchableOpacity
      style={[styles.trainingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.trainingRowContent}>
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
          {session.drill_name || session.training_title || 'Solo Practice'}
        </Text>
        <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>{formatDate(session.started_at)}</Text>
      </View>
      {isActive && (
        <View style={[styles.liveBadge, { backgroundColor: '#10B98120' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Active</Text>
        </View>
      )}
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  title,
  description,
  action,
  actionLabel,
  colors,
}: {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{description}</Text>
      {action && actionLabel && (
        <TouchableOpacity
          style={[styles.emptyAction, { backgroundColor: colors.primary }]}
          onPress={action}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
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

  // Tab state
  const [activeTab, setActiveTab] = useState<MainTab>('library');
  
  // Library filters
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [allDrillTemplates, setAllDrillTemplates] = useState<Map<string, DrillTemplate[]>>(new Map());
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Modal state
  const [drillModalVisible, setDrillModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DrillTemplate | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [practicingDrillId, setPracticingDrillId] = useState<string | null>(null);

  const hasTeams = teams.length > 0;

  // Get user's role for a team
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

  // Load sessions
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

  // Load all drill templates
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

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    return [...myUpcomingTrainings].sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
  }, [myUpcomingTrainings]);

  // Flatten and filter drill templates
  const filteredDrills = useMemo(() => {
    const allDrills: { drill: DrillTemplate; teamName: string; teamId: string }[] = [];

    teams.forEach((team) => {
      const templates = allDrillTemplates.get(team.id) || [];
      templates.forEach((drill) => {
        allDrills.push({ drill, teamName: team.name, teamId: team.id });
      });
    });

    return allDrills.filter(({ drill }) => {
      // Team filter
      if (selectedTeamId && drill.team_id !== selectedTeamId) return false;

      // Type filter
      if (libraryFilter === 'grouping' && drill.drill_goal !== 'grouping') return false;
      if (libraryFilter === 'achievement' && drill.drill_goal !== 'achievement') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = drill.name.toLowerCase().includes(query);
        const matchesCategory = (drill.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCategory) return false;
      }

      return true;
    });
  }, [teams, allDrillTemplates, selectedTeamId, libraryFilter, searchQuery]);

  // Total drill count (unfiltered)
  const totalDrillCount = useMemo(() => {
    let count = 0;
    allDrillTemplates.forEach((templates) => {
      count += templates.length;
    });
    return count;
  }, [allDrillTemplates]);

  // Sort sessions
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

  const handleCreateDrill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Use selected team or first manageable team
    const targetTeam = selectedTeamId
      ? teams.find((t) => t.id === selectedTeamId)
      : teams.find((t) => canManageTeam(t.my_role));
    if (!targetTeam) {
      Alert.alert('No Team', 'You need commander access to create drills.');
      return;
    }
    setEditingTeamId(targetTeam.id);
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
            Alert.alert('Error', error.message || 'Failed to delete');
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
          <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
        </View>

        {/* Main Tabs (only for team users) */}
        {hasTeams && (
          <MainTabSelector
            activeTab={activeTab}
            onTabChange={setActiveTab}
            colors={colors}
            libraryCount={totalDrillCount}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TRAININGS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {hasTeams && activeTab === 'trainings' && !isLoading && (
          <>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Trainings</Text>
              {canManageAnyTeam && (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateTraining}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={styles.addBtnText}>New</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredTrainings.length === 0 ? (
              <EmptyState
                title="No upcoming trainings"
                description="You're all caught up!"
                action={canManageAnyTeam ? handleCreateTraining : undefined}
                actionLabel="Schedule Training"
                colors={colors}
              />
            ) : (
              <View style={styles.list}>
                {filteredTrainings.map((t) => (
                  <TrainingRow key={t.id} training={t} colors={colors} onPress={() => handleTrainingPress(t)} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DRILL LIBRARY TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {hasTeams && activeTab === 'library' && !isLoading && (
          <>
            {/* Filters Row */}
            <View style={styles.libraryFilters}>
              <LibraryFilterChips
                activeFilter={libraryFilter}
                onFilterChange={setLibraryFilter}
                colors={colors}
              />
              {teams.length > 1 && (
                <TeamDropdown
                  teams={teams}
                  selectedTeamId={selectedTeamId}
                  onSelect={setSelectedTeamId}
                  colors={colors}
                />
              )}
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

            {/* Results Header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {filteredDrills.length} {filteredDrills.length === 1 ? 'exercise' : 'exercises'}
              </Text>
              {canManageAnyTeam && (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreateDrill}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={styles.addBtnText}>New</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Exercise Grid */}
            {filteredDrills.length === 0 ? (
              <EmptyState
                title="No drills found"
                description={searchQuery ? 'Try a different search' : 'Create your first drill exercise'}
                action={canManageAnyTeam ? handleCreateDrill : undefined}
                actionLabel="Create Drill"
                colors={colors}
              />
            ) : (
              <View style={styles.exerciseGrid}>
                {filteredDrills.map(({ drill, teamName, teamId }) => (
                  <ExerciseCard
                    key={drill.id}
                    drill={drill}
                    teamName={teamName}
                    colors={colors}
                    canEdit={canManageTeam(getTeamRole(teamId))}
                    onEdit={() => handleEditTemplate(drill)}
                    onDelete={() => handleDeleteTemplate(drill)}
                    onPractice={() => handleQuickPractice(drill)}
                    practicing={practicingDrillId === drill.id}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SOLO USER (no teams) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!hasTeams && !isLoading && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Sessions ({sortedSessions.length})
              </Text>
            </View>

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

            {/* Join Team Card */}
            <View style={[styles.joinTeamCard, { backgroundColor: colors.secondary }]}>
              <View style={styles.joinTeamContent}>
                <Text style={[styles.joinTeamTitle, { color: colors.text }]}>Join a Team</Text>
                <Text style={[styles.joinTeamDesc, { color: colors.textMuted }]}>
                  Access team drill library and trainings
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

      {/* Drill Modal */}
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
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },

  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Library Filters
  libraryFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },

  // Team Dropdown
  teamDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  teamDropdownText: { fontSize: 13, fontWeight: '500' },

  // Dropdown Modal
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
  dropdownItemText: { fontSize: 16, fontWeight: '500' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // List
  list: { gap: 10 },

  // Training Row
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  trainingRowContent: { flex: 1 },
  trainingTitle: { fontSize: 15, fontWeight: '600' },
  trainingMeta: { fontSize: 13, marginTop: 2 },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#10B981' },

  // Exercise Grid
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Exercise Card
  exerciseCard: {
    width: CARD_WIDTH,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exerciseTypeText: { fontSize: 10, fontWeight: '700' },
  exerciseDifficulty: { fontSize: 10, fontWeight: '600' },
  exerciseName: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  exerciseStat: { fontSize: 12 },
  exerciseStatDot: { fontSize: 8, marginHorizontal: 4 },
  exerciseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  exerciseTeam: { fontSize: 11, flex: 1 },
  exercisePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: { fontSize: 14, fontWeight: '600', color: '#fff' },

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
