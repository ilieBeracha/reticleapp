import { useModals } from '@/contexts/ModalContext';
import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { getOrgTrainings } from '@/services/trainingService';
import type { TrainingStatus, TrainingWithDetails } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type FilterType = 'upcoming' | 'ongoing' | 'completed';

// Map filter to status
const FILTER_TO_STATUS: Record<FilterType, TrainingStatus[]> = {
  upcoming: ['planned'],
  ongoing: ['ongoing'],
  completed: ['finished', 'cancelled'],
};

// Get icon for training type based on drills
function getTrainingIcon(training: TrainingWithDetails): keyof typeof Ionicons.glyphMap {
  if (training.drill_count === 0) return 'calendar';
  // Could be extended based on drill types
  return 'fitness';
}

// Get color scheme for training status
function getStatusColor(status: TrainingStatus) {
  const colors = {
    planned: { color: '#3B82F6', bg: '#3B82F615' },     // Blue
    ongoing: { color: '#22C55E', bg: '#22C55E15' },     // Green
    finished: { color: '#6B7280', bg: '#6B728015' },    // Gray
    cancelled: { color: '#EF4444', bg: '#EF444415' },   // Red
  };
  return colors[status] || colors.planned;
}

// Format date for display
function formatTrainingDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTrainingTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Memoized training card component
const TrainingCard = React.memo(function TrainingCard({
  training,
  onPress,
  colors,
}: {
  training: TrainingWithDetails;
  onPress: (training: TrainingWithDetails) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor = getStatusColor(training.status);
  
  return (
    <TouchableOpacity
      style={[styles.trainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(training)}
      activeOpacity={0.7}
    >
      <View style={[styles.trainingIcon, { backgroundColor: statusColor.bg }]}>
        <Ionicons name={getTrainingIcon(training)} size={24} color={statusColor.color} />
      </View>

      <View style={styles.trainingInfo}>
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <View style={styles.trainingMeta}>
          <View style={styles.trainingMetaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.trainingMetaText, { color: colors.textMuted }]}>
              {formatTrainingDate(training.scheduled_at)}
            </Text>
          </View>
          <View style={styles.trainingMetaItem}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.trainingMetaText, { color: colors.textMuted }]}>
              {formatTrainingTime(training.scheduled_at)}
            </Text>
          </View>
          {training.team && (
            <View style={styles.trainingMetaItem}>
              <Ionicons name="people-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.trainingMetaText, { color: colors.textMuted }]}>
                {training.team.name}
              </Text>
            </View>
          )}
        </View>
        {Boolean(training.drill_count) && (
          <View style={styles.drillsInfo}>
            <Text style={[styles.drillsText, { color: colors.textMuted }]}>
              {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
        <Text style={[styles.statusText, { color: statusColor.color }]}>
          {training.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

/**
 * TRAININGS PAGE
 * Organization training management - view, create, and manage trainings
 */
const TrainingsPage = React.memo(function TrainingsPage() {
  const colors = useColors();
  const { activeWorkspaceId } = useAppContext();
  const { teamInfo, orgRole } = useOrgRole();
  const { 
    setSelectedTraining,
    setOnTrainingCreated,
    setOnTrainingUpdated,
  } = useModals();
  
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [trainings, setTrainings] = useState<TrainingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Can user create trainings? (owner, admin, instructor, or team commander)
  const canCreateTraining = useMemo(() => {
    // Workspace roles that can create
    if (['owner', 'admin', 'instructor'].includes(orgRole || '')) {
      return true;
    }
    // Team commanders can also create trainings
    if (teamInfo?.teamRole === 'commander') {
      return true;
    }
    return false;
  }, [orgRole, teamInfo?.teamRole]);

  // Fetch trainings
  const fetchTrainings = useCallback(async (showRefresh = false) => {
    if (!activeWorkspaceId) return;
    
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await getOrgTrainings(activeWorkspaceId);
      setTrainings(data);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  // Register callbacks for modal context
  useEffect(() => {
    setOnTrainingCreated(() => fetchTrainings);
    setOnTrainingUpdated(() => fetchTrainings);
    
    return () => {
      setOnTrainingCreated(null);
      setOnTrainingUpdated(null);
    };
  }, [fetchTrainings, setOnTrainingCreated, setOnTrainingUpdated]);

  // Filter trainings based on selected filter
  const filteredTrainings = useMemo(() => {
    const statuses = FILTER_TO_STATUS[filter];
    
    return trainings.filter(t => {
      const matchesStatus = statuses.includes(t.status);
      return matchesStatus;
    }).sort((a, b) => {
      // Sort by scheduled_at
      const dateA = new Date(a.scheduled_at);
      const dateB = new Date(b.scheduled_at);
      
      // Upcoming: ascending (soonest first)
      // Completed: descending (most recent first)
      return filter === 'completed' 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });
  }, [trainings, filter]);

  const handleTrainingPress = useCallback((training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTraining(training);
    router.push('/(protected)/trainingDetail' as any);
  }, [setSelectedTraining]);

  const handleCreateTraining = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTraining' as any);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchTrainings(true);
  }, [fetchTrainings]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Compact Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
        <View style={[styles.tabsContainer, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tab, filter === 'upcoming' && { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('upcoming');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: filter === 'upcoming' ? colors.text : colors.textMuted }]}>
              Upcoming
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, filter === 'ongoing' && { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('ongoing');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: filter === 'ongoing' ? colors.text : colors.textMuted }]}>
              Live
            </Text>
            {trainings.filter(t => t.status === 'ongoing').length > 0 && (
              <View style={styles.liveDot} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, filter === 'completed' && { backgroundColor: colors.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('completed');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: filter === 'completed' ? colors.text : colors.textMuted }]}>
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {canCreateTraining && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateTraining}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filteredTrainings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons 
                name={filter === 'upcoming' ? 'calendar-outline' : filter === 'ongoing' ? 'play-circle-outline' : 'checkmark-circle-outline'} 
                size={48} 
                color={colors.textMuted} 
                style={styles.emptyIcon} 
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No {filter} trainings
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {filter === 'upcoming' && 'Schedule a new training to get started'}
                {filter === 'ongoing' && 'No trainings are currently in progress'}
                {filter === 'completed' && 'Completed trainings will appear here'}
              </Text>
              {filter === 'upcoming' && canCreateTraining && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateTraining}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>Schedule Training</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.trainingsList}>
              {filteredTrainings.map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  onPress={handleTrainingPress}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
});

export default TrainingsPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    height: 36,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Training List
  trainingsList: {
    gap: 8,
  },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  trainingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingInfo: {
    flex: 1,
    gap: 2,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  trainingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trainingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trainingMetaText: {
    fontSize: 13,
  },
  drillsInfo: {
    marginTop: 2,
  },
  drillsText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyIcon: {
    opacity: 0.4,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
