/**
 * Schedule Screen
 * Shows team trainings or session history for solo users
 */
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getSessions, type SessionWithDetails } from '@/services/sessionService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Plus, Target, Zap } from 'lucide-react-native';
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
  const statusColor = isLive ? colors.green : training.status === 'planned' ? colors.primary : colors.textMuted;

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
      <View style={[styles.rowIcon, { backgroundColor: `${statusColor}18` }]}>
        {isLive ? <Zap size={18} color={statusColor} /> : <Calendar size={18} color={statusColor} />}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
          {formatDate(training.scheduled_at)} · {training.team?.name || 'Team'}
        </Text>
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
// SESSION ROW
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
      <View style={[styles.rowIcon, { backgroundColor: `${statusColor}18` }]}>
        {isActive ? <Zap size={18} color={statusColor} /> : <Target size={18} color={statusColor} />}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {session.drill_name || session.training_title || 'Solo Practice'}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
          {formatDate(session.started_at)}
        </Text>
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
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  colors,
  hasTeams,
  title,
  description,
}: {
  colors: ReturnType<typeof useColors>;
  hasTeams: boolean;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
        {hasTeams ? <Calendar size={32} color={colors.textMuted} /> : <Target size={32} color={colors.textMuted} />}
      </View>
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
  const { teams, initialized: teamsInitialized } = useTeamStore();
  const { myUpcomingTrainings, myTrainingsInitialized, loadMyUpcomingTrainings } = useTrainingStore();
  const { canManageTraining } = usePermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const hasTeams = teams.length > 0;

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

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (hasTeams) {
        loadMyUpcomingTrainings();
      } else {
        loadSessions();
      }
    }, [hasTeams, loadMyUpcomingTrainings, loadSessions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hasTeams) {
      await loadMyUpcomingTrainings();
    } else {
      await loadSessions();
    }
    setRefreshing(false);
  }, [hasTeams, loadMyUpcomingTrainings, loadSessions]);

  // Sort trainings: live first, then by date
  const sortedTrainings = useMemo(() => {
    return [...myUpcomingTrainings].sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });
  }, [myUpcomingTrainings]);

  // Sort sessions: active first, then by date
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [sessions]);

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

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTraining' as any);
  };

  const isLoading = hasTeams ? !myTrainingsInitialized : loadingSessions;
  const items = hasTeams ? sortedTrainings : sortedSessions;

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
              {hasTeams ? `${teams.length} team${teams.length !== 1 ? 's' : ''}` : 'Your sessions'}
            </Text>
          </View>
          {hasTeams && canManageTraining && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <EmptyState
            colors={colors}
            hasTeams={hasTeams}
            title={hasTeams ? 'No trainings yet' : 'No sessions yet'}
            description={hasTeams ? 'Schedule a training to get started' : 'Start a practice session from Home'}
          />
        )}

        {/* List */}
        {!isLoading && items.length > 0 && (
          <View style={styles.list}>
            {hasTeams
              ? sortedTrainings.map((t) => (
                  <TrainingRow key={t.id} training={t} colors={colors} onPress={() => handleTrainingPress(t)} />
                ))
              : sortedSessions.map((s) => (
                  <SessionRow key={s.id} session={s} colors={colors} onPress={() => handleSessionPress(s)} />
                ))}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  list: { gap: 10 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 13, marginTop: 2 },

  // Live badge
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

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },

  // Loading
  loading: { paddingVertical: 60 },
});
