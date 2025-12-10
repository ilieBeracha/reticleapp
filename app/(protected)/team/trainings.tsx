import { useColors } from '@/hooks/ui/useColors';
import { useCanManageTeam, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Clock, Plus, Target, Users } from 'lucide-react-native';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Status configuration
const STATUS_CONFIG = {
  planned: { color: '#3B82F6', bg: '#3B82F620', icon: 'calendar-outline' as const, label: 'Scheduled' },
  ongoing: { color: '#10B981', bg: '#10B98120', icon: 'play-circle' as const, label: 'Live' },
  finished: { color: '#6B7280', bg: '#6B728020', icon: 'checkmark-circle' as const, label: 'Completed' },
  cancelled: { color: '#EF4444', bg: '#EF444420', icon: 'close-circle' as const, label: 'Cancelled' },
};

// Format date nicely
function formatTrainingDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (isTomorrow) return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Training Card Component
function TrainingCard({
  training,
  colors,
  onPress,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[training.status] || STATUS_CONFIG.planned;
  const isLive = training.status === 'ongoing';
  const isPast = training.status === 'finished' || training.status === 'cancelled';

  return (
    <TouchableOpacity
      style={[
        styles.trainingCard,
        {
          backgroundColor: colors.card,
          borderColor: isLive ? status.color : colors.border,
          borderWidth: isLive ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Left: Icon */}
        <View style={[styles.cardIcon, { backgroundColor: status.bg }]}>
          <Target size={20} color={status.color} />
        </View>

        {/* Middle: Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {training.title}
            </Text>
            {isLive && (
              <View style={[styles.liveBadge, { backgroundColor: '#10B981' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          
          <View style={styles.cardMeta}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>
              {formatTrainingDate(training.scheduled_at)}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={12} color={status.color} />
              <Text style={[styles.statChipText, { color: status.color }]}>{status.label}</Text>
            </View>
            {training.drill_count > 0 && (
              <View style={[styles.statChip, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.statChipText, { color: colors.textMuted }]}>
                  {training.drill_count} drills
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right: Chevron */}
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Team Trainings Screen
 */
export default function TeamTrainingsScreen() {
  const colors = useColors();
  const { activeTeamId, activeTeam } = useTeamStore();
  const { teamTrainings, loadingTeamTrainings, loadTeamTrainings } = useTrainingStore();
  const canManage = useCanManageTeam();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (activeTeamId) {
        loadTeamTrainings(activeTeamId);
      }
    }, [activeTeamId, loadTeamTrainings])
  );

  const onRefresh = useCallback(async () => {
    if (!activeTeamId) return;
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeamTrainings(activeTeamId);
    setRefreshing(false);
  }, [activeTeamId, loadTeamTrainings]);

  const handleCreateTraining = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTraining' as any);
  }, []);

  const handleTrainingPress = useCallback((trainingId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${trainingId}` as any);
  }, []);

  // Group trainings
  const { liveTrainings, upcomingTrainings, pastTrainings } = useMemo(() => {
    const live: TrainingWithDetails[] = [];
    const upcoming: TrainingWithDetails[] = [];
    const past: TrainingWithDetails[] = [];

    for (const t of teamTrainings) {
      if (t.status === 'ongoing') {
        live.push(t);
      } else if (t.status === 'planned') {
        upcoming.push(t);
      } else {
        past.push(t);
      }
    }

    // Sort upcoming by date (soonest first)
    upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    // Sort past by date (most recent first)
    past.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return { liveTrainings: live, upcomingTrainings: upcoming, pastTrainings: past };
  }, [teamTrainings]);

  const totalCount = teamTrainings.length;
  const hasAny = totalCount > 0;

  if (loadingTeamTrainings && teamTrainings.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {/* ══════════════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Trainings</Text>
              <View style={styles.headerMeta}>
                <Users size={14} color={colors.textMuted} />
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  {activeTeam?.name || 'Team'}
                </Text>
              </View>
            </View>
            {hasAny && (
              <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.countText, { color: colors.text }]}>{totalCount}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            CREATE BUTTON (for managers)
        ══════════════════════════════════════════════════════════════════════ */}
        {canManage && (
          <Animated.View entering={FadeIn.delay(100)}>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateTraining}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.createBtnText}>Schedule Training</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            EMPTY STATE
        ══════════════════════════════════════════════════════════════════════ */}
        {!hasAny && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Calendar size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trainings yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              {canManage
                ? 'Schedule a training to get your team practicing'
                : 'Your commander will schedule trainings here'}
            </Text>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            LIVE TRAININGS
        ══════════════════════════════════════════════════════════════════════ */}
        {liveTrainings.length > 0 && (
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLabelRow}>
                <View style={styles.liveDotLarge} />
                <Text style={[styles.sectionLabel, { color: '#10B981' }]}>LIVE NOW</Text>
              </View>
            </View>
            <View style={styles.trainingsList}>
              {liveTrainings.map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  colors={colors}
                  onPress={() => handleTrainingPress(training.id)}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            UPCOMING TRAININGS
        ══════════════════════════════════════════════════════════════════════ */}
        {upcomingTrainings.length > 0 && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UPCOMING</Text>
              <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                {upcomingTrainings.length}
              </Text>
            </View>
            <View style={styles.trainingsList}>
              {upcomingTrainings.map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  colors={colors}
                  onPress={() => handleTrainingPress(training.id)}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PAST TRAININGS
        ══════════════════════════════════════════════════════════════════════ */}
        {pastTrainings.length > 0 && (
          <Animated.View entering={FadeIn.delay(250)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PAST</Text>
              <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                {pastTrainings.length}
              </Text>
            </View>
            <View style={styles.trainingsList}>
              {pastTrainings.slice(0, 10).map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  colors={colors}
                  onPress={() => handleTrainingPress(training.id)}
                />
              ))}
              {pastTrainings.length > 10 && (
                <Text style={[styles.moreText, { color: colors.textMuted }]}>
                  +{pastTrainings.length - 10} more trainings
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerSubtitle: { fontSize: 14 },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countText: { fontSize: 14, fontWeight: '700' },

  // Create Button
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginBottom: 24,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  liveDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  // Training Card
  trainingsList: { gap: 12 },
  trainingCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 6 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statChipText: { fontSize: 11, fontWeight: '600' },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // More Text
  moreText: { fontSize: 13, textAlign: 'center', paddingVertical: 12, fontWeight: '500' },
});
