/**
 * Team Training Hub
 * Drills-focused training management
 */
import { EnhancedDrillModal } from '@/components/drills/EnhancedDrillModal';
import { useColors } from '@/hooks/ui/useColors';
import {
    createDrillTemplate,
    deleteDrillTemplate,
    getTeamDrillTemplates
} from '@/services/drillTemplateService';
import { useCanManageTeam, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { CreateDrillInput, CreateDrillTemplateInput, DrillTemplate, TargetType, TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
    ChevronRight,
    Clock,
    Crosshair,
    Plus,
    Target,
    Trash2
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// HELPERS
// ============================================================================
function formatTrainingDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (isTomorrow) return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// DRILL CHIP (inline in training card)
// ============================================================================
function DrillChip({ name, type, colors }: { name: string; type: TargetType; colors: any }) {
  const isPaper = type === 'paper';
  return (
    <View style={[styles.drillChip, { backgroundColor: isPaper ? 'rgba(147,197,253,0.12)' : 'rgba(156,163,175,0.12)' }]}>
      {isPaper ? <Target size={12} color="#93C5FD" /> : <Crosshair size={12} color={colors.textMuted} />}
      <Text style={[styles.drillChipText, { color: isPaper ? '#93C5FD' : colors.textMuted }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

// ============================================================================
// TRAINING CARD (Drill-focused)
// ============================================================================
function TrainingCard({
  training,
  colors,
  onPress,
  index,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  index: number;
}) {
  const isLive = training.status === 'ongoing';
  const isPlanned = training.status === 'planned';
  const drills = training.drills || [];

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <TouchableOpacity
        style={[
          styles.trainingCard,
          { backgroundColor: colors.card, borderColor: isLive ? colors.text : colors.border },
          isLive && styles.trainingCardLive,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {isLive && (
          <LinearGradient
            colors={['rgba(147,197,253,0.1)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* Header Row */}
        <View style={styles.trainingCardHeader}>
          <View style={styles.trainingCardTitleRow}>
            {isLive && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            <Text style={[styles.trainingCardTitle, { color: colors.text }]} numberOfLines={1}>
              {training.title}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>

        {/* Date */}
        <View style={styles.trainingCardMeta}>
          <Clock size={13} color={colors.textMuted} />
          <Text style={[styles.trainingCardMetaText, { color: colors.textMuted }]}>
            {formatTrainingDate(training.scheduled_at)}
          </Text>
        </View>

        {/* Drills Preview */}
        {drills.length > 0 && (
          <View style={styles.drillsPreview}>
            <Text style={[styles.drillsLabel, { color: colors.textMuted }]}>
              {drills.length} DRILL{drills.length !== 1 ? 'S' : ''}
            </Text>
            <View style={styles.drillChips}>
              {drills.slice(0, 3).map((drill) => (
                <DrillChip key={drill.id} name={drill.name} type={drill.target_type} colors={colors} />
              ))}
              {drills.length > 3 && (
                <View style={[styles.moreChip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.moreChipText, { color: colors.textMuted }]}>+{drills.length - 3}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* No Drills */}
        {drills.length === 0 && isPlanned && (
          <View style={[styles.noDrillsBanner, { backgroundColor: colors.secondary }]}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.noDrillsText, { color: colors.textMuted }]}>No drills added yet</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// DRILL TEMPLATE CARD (for library)
// ============================================================================
function DrillTemplateCard({
  drill,
  colors,
  canManage,
  onDelete,
  index,
}: {
  drill: DrillTemplate;
  colors: ReturnType<typeof useColors>;
  canManage: boolean;
  onDelete: () => void;
  index: number;
}) {
  const isPaper = drill.target_type === 'paper';

  return (
    <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
      <View style={[styles.drillTemplateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.drillTemplateIcon, { backgroundColor: isPaper ? 'rgba(147,197,253,0.12)' : 'rgba(156,163,175,0.12)' }]}>
          {isPaper ? <Target size={22} color="#93C5FD" /> : <Crosshair size={22} color={colors.textMuted} />}
        </View>

        <View style={styles.drillTemplateInfo}>
          <Text style={[styles.drillTemplateName, { color: colors.text }]}>{drill.name}</Text>
          <Text style={[styles.drillTemplateMeta, { color: colors.textMuted }]}>
            {drill.distance_m}m • {drill.strings_count ?? 1} rounds • {drill.rounds_per_shooter} shots/round
            {drill.time_limit_seconds ? ` • ${drill.time_limit_seconds}s` : ''}
          </Text>
        </View>

        {canManage && (
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.secondary }]}
            onPress={onDelete}
          >
            <Trash2 size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
type TabType = 'trainings' | 'drills';

export default function TeamTrainingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeTeamId, activeTeam } = useTeamStore();
  const { teamTrainings, loadingTeamTrainings, loadTeamTrainings } = useTrainingStore();
  const canManage = useCanManageTeam();

  const [activeTab, setActiveTab] = useState<TabType>('trainings');
  const [refreshing, setRefreshing] = useState(false);
  const [drills, setDrills] = useState<DrillTemplate[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(true);
  const [showCreateDrillModal, setShowCreateDrillModal] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!activeTeamId) return;
    await Promise.all([
      loadTeamTrainings(activeTeamId),
      getTeamDrillTemplates(activeTeamId).then(setDrills).finally(() => setLoadingDrills(false)),
    ]);
  }, [activeTeamId, loadTeamTrainings]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoadingDrills(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Group trainings
  const { liveTrainings, upcomingTrainings, pastTrainings } = useMemo(() => {
    const live: TrainingWithDetails[] = [];
    const upcoming: TrainingWithDetails[] = [];
    const past: TrainingWithDetails[] = [];

    for (const t of teamTrainings) {
      if (t.status === 'ongoing') live.push(t);
      else if (t.status === 'planned') upcoming.push(t);
      else past.push(t);
    }

    upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    past.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return { liveTrainings: live, upcomingTrainings: upcoming, pastTrainings: past };
  }, [teamTrainings]);

  const handleCreateTraining = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTraining' as any);
  };

  const handleTrainingPress = (trainingId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${trainingId}` as any);
  };

  const handleCreateDrill = async (input: CreateDrillInput & { id?: string }) => {
    if (!activeTeamId) return;
    // Remove the id field (it's only used for local state)
    const { id, ...templateInput } = input;
    await createDrillTemplate(activeTeamId, templateInput as CreateDrillTemplateInput);
    const updated = await getTeamDrillTemplates(activeTeamId);
    setDrills(updated);
    setShowCreateDrillModal(false);
  };

  const handleDeleteDrill = (drillId: string, drillName: string) => {
    Alert.alert('Delete Drill', `Delete "${drillName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await deleteDrillTemplate(drillId);
            setDrills(prev => prev.filter(d => d.id !== drillId));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const totalDrillsInTrainings = teamTrainings.reduce((sum, t) => sum + (t.drill_count || 0), 0);
  const isLoading = loadingTeamTrainings && teamTrainings.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* ════════════════════════════════════════════════════════════════════
            HEADER WITH TABS
        ════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{activeTeam?.name}</Text>
          
          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'trainings' && styles.tabActive,
                activeTab === 'trainings' && { backgroundColor: colors.card },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('trainings');
              }}
            >
              <Text style={[styles.tabText, { color: activeTab === 'trainings' ? colors.text : colors.textMuted }]}>
                Trainings
              </Text>
              {teamTrainings.length > 0 && (
                <Text style={[styles.tabCount, { color: activeTab === 'trainings' ? colors.text : colors.textMuted }]}>
                  {teamTrainings.length}
                </Text>
              )}
            </TouchableOpacity>
            
            {canManage && (
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'drills' && styles.tabActive,
                  activeTab === 'drills' && { backgroundColor: colors.card },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('drills');
                }}
              >
                <Text style={[styles.tabText, { color: activeTab === 'drills' ? colors.text : colors.textMuted }]}>
                  Drills
                </Text>
                {drills.length > 0 && (
                  <Text style={[styles.tabCount, { color: activeTab === 'drills' ? colors.text : colors.textMuted }]}>
                    {drills.length}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════════════
            TRAININGS TAB CONTENT
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trainings' && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{liveTrainings.length + upcomingTrainings.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Scheduled</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{pastTrainings.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalDrillsInTrainings}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Drills</Text>
              </View>
            </View>

            {/* Create Training Button */}
            {canManage && (
              <Animated.View entering={FadeIn.delay(100)}>
                <TouchableOpacity
                  style={styles.createBtnWrapper}
                  onPress={handleCreateTraining}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(147,197,253,0.85)', 'rgba(156,163,175,0.9)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createBtnGradient}
                  >
                    <Plus size={18} color="#000" />
                    <Text style={styles.createBtnText}>New Training</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Loading / Empty */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {!isLoading && teamTrainings.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                  <Target size={40} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No trainings yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                  {canManage ? 'Create a training and add drills to get started' : 'Your commander will schedule trainings'}
                </Text>
              </View>
            )}

            {/* Live Trainings */}
            {liveTrainings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.liveHeaderIndicator}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveHeaderText}>LIVE NOW</Text>
                  </View>
                </View>
                <View style={styles.cardList}>
                  {liveTrainings.map((t, i) => (
                    <TrainingCard key={t.id} training={t} colors={colors} onPress={() => handleTrainingPress(t.id)} index={i} />
                  ))}
                </View>
              </View>
            )}

            {/* Upcoming Trainings */}
            {upcomingTrainings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UPCOMING</Text>
                  <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{upcomingTrainings.length}</Text>
                </View>
                <View style={styles.cardList}>
                  {upcomingTrainings.map((t, i) => (
                    <TrainingCard key={t.id} training={t} colors={colors} onPress={() => handleTrainingPress(t.id)} index={i} />
                  ))}
                </View>
              </View>
            )}

            {/* Past Trainings */}
            {pastTrainings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>COMPLETED</Text>
                  <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{pastTrainings.length}</Text>
                </View>
                <View style={styles.cardList}>
                  {pastTrainings.slice(0, 5).map((t, i) => (
                    <TrainingCard key={t.id} training={t} colors={colors} onPress={() => handleTrainingPress(t.id)} index={i} />
                  ))}
                </View>
                {pastTrainings.length > 5 && (
                  <Text style={[styles.moreText, { color: colors.textMuted }]}>+{pastTrainings.length - 5} more</Text>
                )}
              </View>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            DRILLS TAB CONTENT
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'drills' && canManage && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{drills.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Templates</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{drills.filter(d => d.target_type === 'paper').length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Paper</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{drills.filter(d => d.target_type === 'tactical').length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tactical</Text>
              </View>
            </View>

            {/* Create Drill Button */}
            <TouchableOpacity
              style={styles.createBtnWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowCreateDrillModal(true);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(147,197,253,0.85)', 'rgba(156,163,175,0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtnGradient}
              >
                <Plus size={18} color="#000" />
                <Text style={styles.createBtnText}>New Drill</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Loading */}
            {loadingDrills && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {/* Empty State */}
            {!loadingDrills && drills.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                  <Target size={40} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No drill templates</Text>
                <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                  Create reusable drills to add to your trainings
                </Text>
              </View>
            )}

            {/* Drill List */}
            {!loadingDrills && drills.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEMPLATES</Text>
                  <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{drills.length}</Text>
                </View>
                <View style={styles.cardList}>
                  {drills.map((d, i) => (
                    <DrillTemplateCard
                      key={d.id}
                      drill={d}
                      colors={colors}
                      canManage={canManage}
                      onDelete={() => handleDeleteDrill(d.id, d.name)}
                      index={i}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Drill Modal */}
      <EnhancedDrillModal
        visible={showCreateDrillModal}
        onClose={() => setShowCreateDrillModal(false)}
        onSave={handleCreateDrill}
        mode="add"
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  headerSubtitle: { fontSize: 13, fontWeight: '500' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Drill Template Card
  drillTemplateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  drillTemplateIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillTemplateInfo: { flex: 1 },
  drillTemplateName: { fontSize: 15, fontWeight: '600' },
  drillTemplateMeta: { fontSize: 13, marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Create Button
  createBtnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 8,
  },
  createBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sectionCount: { fontSize: 12, fontWeight: '600' },

  // Live Header
  liveHeaderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#93C5FD',
  },
  liveHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#93C5FD' },

  // Card List
  cardList: { gap: 12 },

  // Training Card
  trainingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  trainingCardLive: { borderWidth: 2 },
  trainingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingCardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trainingCardTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  trainingCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainingCardMetaText: { fontSize: 14 },

  // Live Indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(147,197,253,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#93C5FD',
  },
  liveText: { fontSize: 10, fontWeight: '700', color: '#93C5FD' },

  // Drills Preview
  drillsPreview: { gap: 8, marginTop: 4 },
  drillsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  drillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  drillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  drillChipText: { fontSize: 12, fontWeight: '600', maxWidth: 100 },
  moreChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moreChipText: { fontSize: 12, fontWeight: '600' },

  // No Drills Banner
  noDrillsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  noDrillsText: { fontSize: 13 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Loading
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },

  // More Text
  moreText: { fontSize: 13, textAlign: 'center', paddingVertical: 12, fontWeight: '500' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalCancel: { fontSize: 16 },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  // Form
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  formInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeBtnText: { fontSize: 15, fontWeight: '600' },
});
