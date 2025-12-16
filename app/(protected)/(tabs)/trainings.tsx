/**
 * Training Tab
 * 
 * Simple training list showing all trainings from all teams.
 * Clean, focused view of scheduled and past trainings.
 */
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BookOpen, Calendar, ChevronRight, Plus } from 'lucide-react-native';
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
      <View style={[styles.trainingIcon, { backgroundColor: isLive ? '#10B98115' : colors.secondary }]}>
        <Calendar size={18} color={isLive ? '#10B981' : colors.textMuted} />
      </View>
      <View style={styles.trainingContent}>
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams } = useTeamStore();
  const { myUpcomingTrainings, myTrainingsInitialized, loadMyUpcomingTrainings } = useTrainingStore();

  const [refreshing, setRefreshing] = useState(false);

  const hasTeams = teams.length > 0;
  const canCreateTraining = teams.some(t => t.my_role === 'owner' || t.my_role === 'commander');

  // Load trainings on focus
  useFocusEffect(
    useCallback(() => {
      if (hasTeams) {
        loadMyUpcomingTrainings();
      }
    }, [hasTeams, loadMyUpcomingTrainings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMyUpcomingTrainings();
    setRefreshing(false);
  }, [loadMyUpcomingTrainings]);

  // Sort trainings: live first, then by date
  const sortedTrainings = useMemo(() => {
    return [...myUpcomingTrainings].sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
  }, [myUpcomingTrainings]);

  // Group trainings by status
  const liveTrainings = sortedTrainings.filter(t => t.status === 'ongoing');
  const upcomingTrainings = sortedTrainings.filter(t => t.status === 'planned');

  const handleTrainingPress = (training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (training.status === 'ongoing') {
      router.push(`/(protected)/trainingLive?trainingId=${training.id}` as any);
    } else {
      router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
    }
  };

  const handleCreateTraining = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTraining' as any);
  };

  const handleOpenLibrary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/drillLibrary' as any);
  };

  const isLoading = hasTeams && !myTrainingsInitialized;

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
          <Text style={[styles.title, { color: colors.text }]}>Trainings</Text>
          {canCreateTraining && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateTraining}
            >
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Access: Drill Library */}
        <TouchableOpacity
          style={[styles.libraryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleOpenLibrary}
          activeOpacity={0.7}
        >
          <View style={[styles.libraryIcon, { backgroundColor: '#3B82F615' }]}>
            <BookOpen size={20} color="#3B82F6" />
          </View>
          <View style={styles.libraryContent}>
            <Text style={[styles.libraryTitle, { color: colors.text }]}>Drill Library</Text>
            <Text style={[styles.libraryDesc, { color: colors.textMuted }]}>
              Browse prebuilt drills and templates
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Live Trainings */}
        {!isLoading && liveTrainings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Now</Text>
            <View style={styles.trainingList}>
              {liveTrainings.map(training => (
                <TrainingRow
                  key={training.id}
                  training={training}
                  colors={colors}
                  onPress={() => handleTrainingPress(training)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Trainings */}
        {!isLoading && upcomingTrainings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
            <View style={styles.trainingList}>
              {upcomingTrainings.map(training => (
                <TrainingRow
                  key={training.id}
                  training={training}
                  colors={colors}
                  onPress={() => handleTrainingPress(training)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && sortedTrainings.length === 0 && hasTeams && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Trainings</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              No trainings scheduled yet
            </Text>
            {canCreateTraining && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateTraining}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Schedule Training</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* No Teams State */}
        {!isLoading && !hasTeams && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Join a Team</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Create or join a team to see training events
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(protected)/(tabs)/teams' as any)}
            >
              <Text style={styles.emptyBtnText}>Go to Teams</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Library Card
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  libraryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryContent: {
    flex: 1,
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  libraryDesc: {
    fontSize: 13,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Training List
  trainingList: {
    gap: 10,
  },

  // Training Row
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  trainingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingContent: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trainingMeta: {
    fontSize: 13,
    marginTop: 2,
  },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },

  // Loading
  loading: {
    paddingVertical: 60,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
