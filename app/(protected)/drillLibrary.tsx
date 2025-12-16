/**
 * DRILL LIBRARY SCREEN
 *
 * Browse and manage drill templates organized by type.
 * - Library: Prebuilt read-only templates
 * - Team: Templates created by team commanders
 * - Personal: User's own templates
 */

import { DrillDetailModal } from '@/components/drills/DrillDetailModal';
import { DrillTypeSection } from '@/components/drills/DrillTypeSection';
import { getTemplatesGroupedByType } from '@/constants/drillLibrary';
import { useColors } from '@/hooks/ui/useColors';
import { duplicateTemplateToTeam, getTeamDrills } from '@/services/drillService';
import { useTeamStore } from '@/store/teamStore';
import type { DrillTemplate } from '@/types/drillTypes';
import { getAllDrillTypes } from '@/types/drillTypes';
import type { Drill, TeamWithRole } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TAB TYPES
// ============================================================================

type LibraryTab = 'library' | 'team' | 'personal';

// ============================================================================
// TEAM SELECTOR MODAL
// ============================================================================

interface TeamSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (team: TeamWithRole) => void;
  teams: TeamWithRole[];
  title: string;
}

function TeamSelectorModal({ visible, onClose, onSelect, teams, title }: TeamSelectorModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[teamStyles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[teamStyles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={teamStyles.headerBtn} onPress={onClose}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[teamStyles.headerTitle, { color: colors.text }]}>{title}</Text>
          <View style={teamStyles.headerSpacer} />
        </View>

        {/* Team List */}
        <ScrollView
          style={teamStyles.body}
          contentContainerStyle={[teamStyles.bodyContent, { paddingBottom: insets.bottom + 20 }]}
        >
          <Text style={[teamStyles.subtitle, { color: colors.textMuted }]}>
            Select a team to add the drill to:
          </Text>

          {teams.map((team, index) => (
            <Animated.View key={team.id} entering={FadeInDown.delay(index * 50)}>
              <TouchableOpacity
                style={[teamStyles.teamRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(team);
                }}
                activeOpacity={0.7}
              >
                <View style={[teamStyles.teamIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Users size={20} color={colors.primary} />
                </View>
                <View style={teamStyles.teamInfo}>
                  <Text style={[teamStyles.teamName, { color: colors.text }]}>{team.name}</Text>
                  <Text style={[teamStyles.teamRole, { color: colors.textMuted }]}>
                    {team.my_role === 'owner' ? 'Owner' : team.my_role === 'commander' ? 'Commander' : 'Member'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const teamStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerSpacer: { width: 40 },
  body: { flex: 1 },
  bodyContent: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  teamIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '600' },
  teamRole: { fontSize: 13, marginTop: 2 },
});

// ============================================================================
// TEAM DRILL CARD (for displaying team drills)
// ============================================================================

interface TeamDrillCardProps {
  drill: Drill;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function TeamDrillCard({ drill, onPress, colors }: TeamDrillCardProps) {
  const isGrouping = drill.drill_goal === 'grouping';
  const accentColor = isGrouping ? '#10B981' : '#3B82F6';

  return (
    <TouchableOpacity
      style={[styles.teamDrillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.teamDrillIcon, { backgroundColor: accentColor + '15' }]}>
        <BookOpen size={18} color={accentColor} />
      </View>
      <View style={styles.teamDrillContent}>
        <Text style={[styles.teamDrillName, { color: colors.text }]} numberOfLines={1}>
          {drill.name}
        </Text>
        <Text style={[styles.teamDrillMeta, { color: colors.textMuted }]}>
          {drill.distance_m}m · {drill.rounds_per_shooter} shots
        </Text>
      </View>
      <View style={[styles.teamDrillBadge, { backgroundColor: accentColor + '20' }]}>
        <Text style={[styles.teamDrillBadgeText, { color: accentColor }]}>
          {isGrouping ? 'Grouping' : 'Achievement'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DrillLibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams } = useTeamStore();

  // Filter to teams where user can create drills (owner/commander)
  const editableTeams = useMemo(
    () => teams.filter((t) => t.my_role === 'owner' || t.my_role === 'commander'),
    [teams]
  );

  // State
  const [activeTab, setActiveTab] = useState<LibraryTab>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<DrillTemplate | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Team selector state
  const [teamSelectorVisible, setTeamSelectorVisible] = useState(false);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<DrillTemplate | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  // Team drills state
  const [teamDrills, setTeamDrills] = useState<Record<string, Drill[]>>({});
  const [loadingTeamDrills, setLoadingTeamDrills] = useState(false);

  // Get library templates grouped by type
  const libraryByType = useMemo(() => getTemplatesGroupedByType(), []);
  const drillTypes = useMemo(() => getAllDrillTypes(), []);

  // Load team drills when switching to team tab
  useEffect(() => {
    if (activeTab === 'team' && teams.length > 0) {
      loadTeamDrills();
    }
  }, [activeTab, teams]);

  const loadTeamDrills = async () => {
    setLoadingTeamDrills(true);
    try {
      const drillsByTeam: Record<string, Drill[]> = {};
      await Promise.all(
        teams.map(async (team) => {
          const drills = await getTeamDrills(team.id);
          drillsByTeam[team.id] = drills;
        })
      );
      setTeamDrills(drillsByTeam);
    } catch (error) {
      console.error('Failed to load team drills:', error);
    } finally {
      setLoadingTeamDrills(false);
    }
  };

  // Filter templates by search
  const filterTemplates = useCallback(
    (templates: DrillTemplate[]) => {
      if (!searchQuery.trim()) return templates;
      const query = searchQuery.toLowerCase();
      return templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    },
    [searchQuery]
  );

  // Filter drills by search
  const filterDrills = useCallback(
    (drills: Drill[]) => {
      if (!searchQuery.trim()) return drills;
      const query = searchQuery.toLowerCase();
      return drills.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          (d.description && d.description.toLowerCase().includes(query))
      );
    },
    [searchQuery]
  );

  // Count total team drills
  const totalTeamDrills = useMemo(
    () => Object.values(teamDrills).reduce((sum, drills) => sum + drills.length, 0),
    [teamDrills]
  );

  // Handlers
  const handleViewTemplate = (template: DrillTemplate) => {
    setSelectedTemplate(template);
    setDetailModalVisible(true);
  };

  const handleDuplicateTemplate = (template: DrillTemplate) => {
    if (editableTeams.length === 0) {
      Alert.alert('No Teams', 'You need to be an owner or commander of a team to duplicate drills.');
      return;
    }

    // If only one team, duplicate directly
    if (editableTeams.length === 1) {
      performDuplication(template, editableTeams[0]);
    } else {
      // Show team selector
      setTemplateToDuplicate(template);
      setTeamSelectorVisible(true);
    }
  };

  const performDuplication = async (template: DrillTemplate, team: TeamWithRole) => {
    setDuplicating(true);
    try {
      await duplicateTemplateToTeam(template, team.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `"${template.name}" added to ${team.name}`);

      // Refresh team drills
      loadTeamDrills();

      // Switch to team tab to show the new drill
      setActiveTab('team');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to duplicate template');
    } finally {
      setDuplicating(false);
      setTeamSelectorVisible(false);
      setTemplateToDuplicate(null);
    }
  };

  const handleTeamSelect = (team: TeamWithRole) => {
    if (templateToDuplicate) {
      performDuplication(templateToDuplicate, team);
    }
  };

  const handleUseTemplate = (template: DrillTemplate) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/createTraining',
      params: { templateId: template.id },
    });
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'team') {
      await loadTeamDrills();
    }
    setRefreshing(false);
  }, [activeTab]);

  const handleCreateTemplate = () => {
    Haptics.selectionAsync();
    Alert.alert('Coming Soon', 'Custom template creation will be available soon.');
  };

  // Render tab button
  const TabButton = ({
    tab,
    icon: Icon,
    label,
    count,
  }: {
    tab: LibraryTab;
    icon: any;
    label: string;
    count?: number;
  }) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          {
            backgroundColor: isActive ? colors.primary + '15' : colors.card,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveTab(tab);
        }}
        activeOpacity={0.7}
      >
        <Icon size={18} color={isActive ? colors.primary : colors.textMuted} />
        <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.text }]}>{label}</Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.primary : colors.textMuted }]}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render team drills section
  const renderTeamDrills = () => {
    if (loadingTeamDrills) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (teams.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Users size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Teams</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Join or create a team to manage drills
          </Text>
        </View>
      );
    }

    if (totalTeamDrills === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Users size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Team Drills</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Duplicate from Library to create team drills
          </Text>
          {editableTeams.length > 0 && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('library')}
            >
              <BookOpen size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Library</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Single team - no header needed
    if (teams.length === 1) {
      const drills = filterDrills(teamDrills[teams[0].id] || []);
      return (
        <View style={styles.teamDrillsList}>
          {drills.map((drill) => (
            <TeamDrillCard
              key={drill.id}
              drill={drill}
              onPress={() => {
                // TODO: Open drill detail/edit modal
                Alert.alert(drill.name, drill.description || 'No description');
              }}
              colors={colors}
            />
          ))}
          {drills.length === 0 && searchQuery && (
            <Text style={[styles.noResults, { color: colors.textMuted }]}>No drills match your search</Text>
          )}
        </View>
      );
    }

    // Multiple teams - show headers
    return (
      <View>
        {teams.map((team) => {
          const drills = filterDrills(teamDrills[team.id] || []);
          if (drills.length === 0 && !searchQuery) return null;

          return (
            <View key={team.id} style={styles.teamSection}>
              <View style={styles.teamSectionHeader}>
                <View style={[styles.teamSectionIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Users size={16} color={colors.primary} />
                </View>
                <Text style={[styles.teamSectionName, { color: colors.text }]}>{team.name}</Text>
                <Text style={[styles.teamSectionCount, { color: colors.textMuted }]}>
                  {drills.length} {drills.length === 1 ? 'drill' : 'drills'}
                </Text>
              </View>

              {drills.length > 0 ? (
                <View style={styles.teamDrillsList}>
                  {drills.map((drill) => (
                    <TeamDrillCard
                      key={drill.id}
                      drill={drill}
                      onPress={() => {
                        Alert.alert(drill.name, drill.description || 'No description');
                      }}
                      colors={colors}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.noResults, { color: colors.textMuted }]}>
                  {searchQuery ? 'No drills match your search' : 'No drills yet'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Drill Library',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleCreateTemplate} style={styles.headerBtn}>
              <Plus size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search drills..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.tabsRow}>
          <TabButton tab="library" icon={BookOpen} label="Library" />
          <TabButton tab="team" icon={Users} label="Team" count={totalTeamDrills} />
          <TabButton tab="personal" icon={BookOpen} label="My Drills" />
        </Animated.View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {activeTab === 'library' && (
            <>
              {drillTypes.map((type) => {
                const templates = filterTemplates(libraryByType[type.id] || []);
                if (templates.length === 0) return null;
                return (
                  <DrillTypeSection
                    key={type.id}
                    drillType={type}
                    templates={templates}
                    defaultExpanded={true}
                    onViewTemplate={handleViewTemplate}
                    onDuplicateTemplate={handleDuplicateTemplate}
                    onUseTemplate={handleUseTemplate}
                  />
                );
              })}
            </>
          )}

          {activeTab === 'team' && renderTeamDrills()}

          {activeTab === 'personal' && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <BookOpen size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Personal Drills</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Create custom drills or duplicate from Library
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateTemplate}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Drill</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Team Selector Modal */}
      <TeamSelectorModal
        visible={teamSelectorVisible}
        onClose={() => {
          setTeamSelectorVisible(false);
          setTemplateToDuplicate(null);
        }}
        onSelect={handleTeamSelect}
        teams={editableTeams}
        title="Select Team"
      />

      {/* Detail Modal */}
      {selectedTemplate && (
        <DrillDetailModal
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          drill={{
            id: selectedTemplate.id,
            team_id: '',
            created_by: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            name: selectedTemplate.name,
            description: selectedTemplate.description,
            drill_goal:
              selectedTemplate.drillType === 'grouping' || selectedTemplate.drillType === 'zeroing'
                ? 'grouping'
                : 'achievement',
            target_type: selectedTemplate.drillType === 'timed' ? 'tactical' : 'paper',
            distance_m: (selectedTemplate.defaults.distance as number) || 25,
            rounds_per_shooter: (selectedTemplate.defaults.shots as number) || 5,
            time_limit_seconds: (selectedTemplate.defaults.timeLimit as number) || null,
            strings_count: (selectedTemplate.defaults.strings as number) || 1,
          }}
        />
      )}

      {/* Duplicating Overlay */}
      {duplicating && (
        <View style={styles.overlay}>
          <View style={[styles.overlayContent, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.overlayText, { color: colors.text }]}>Adding to team...</Text>
          </View>
        </View>
      )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  backBtn: {
    padding: 8,
    marginLeft: Platform.OS === 'ios' ? 0 : -8,
  },
  headerBtn: {
    padding: 8,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Loading State
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Team Section (for multiple teams)
  teamSection: {
    marginBottom: 24,
  },
  teamSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  teamSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamSectionName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  teamSectionCount: {
    fontSize: 13,
  },

  // Team Drill Card
  teamDrillsList: {
    gap: 10,
  },
  teamDrillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  teamDrillIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamDrillContent: {
    flex: 1,
  },
  teamDrillName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamDrillMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  teamDrillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teamDrillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  noResults: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
