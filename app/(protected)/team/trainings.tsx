import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * Team Trainings Screen
 * 
 * Shows all trainings for the active team
 */
export default function TeamTrainingsScreen() {
  const colors = useColors();
  const { activeTeamId, activeTeam } = useTeamStore();
  const { teamTrainings, loadingTeamTrainings, loadTeamTrainings } = useTrainingStore();
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

  if (loadingTeamTrainings && teamTrainings.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Trainings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {activeTeam?.name || 'Team'}
          </Text>
        </View>

        {/* Create Training Button */}
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreateTraining}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Schedule Training</Text>
        </TouchableOpacity>

        {/* Trainings List */}
        {teamTrainings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trainings yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Schedule a training to get your team practicing
            </Text>
          </View>
        ) : (
          <View style={styles.trainingsList}>
            {teamTrainings.map((training) => (
              <TouchableOpacity
                key={training.id}
                style={[styles.trainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/(protected)/trainingDetail?id=${training.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.trainingIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="fitness" size={20} color={colors.primary} />
                </View>
                <View style={styles.trainingInfo}>
                  <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
                    {training.title}
                  </Text>
                  <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
                    {new Date(training.scheduled_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: training.status === 'finished' ? '#10B98115' : 
                                   training.status === 'ongoing' ? colors.primary + '15' : 
                                   colors.secondary 
                }]}>
                  <Text style={[styles.statusText, { 
                    color: training.status === 'finished' ? '#10B981' : 
                           training.status === 'ongoing' ? colors.primary : 
                           colors.textMuted 
                  }]}>
                    {training.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  scrollContent: { paddingHorizontal: 16 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  trainingsList: { gap: 10 },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  trainingIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trainingInfo: { flex: 1, gap: 2 },
  trainingTitle: { fontSize: 16, fontWeight: '500' },
  trainingMeta: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});

