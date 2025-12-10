import {
  DrillsSection,
  InfoCards,
  SessionsSection,
  TrainingActions,
  TrainingHeader,
  useTrainingActions,
  useTrainingDetail,
} from '@/components/training-detail';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TrainingDetailSheet() {
  const colors = useColors();
  const { canManageTraining } = usePermissions();
  const { id: trainingIdParam } = useLocalSearchParams<{ id?: string }>();
  const { selectedTraining: contextTraining, getOnTrainingUpdated } = useModals();

  const trainingId = trainingIdParam || contextTraining?.id;

  const { training, sessions, drillProgress, loading, loadingSessions, setTraining } = useTrainingDetail(
    trainingId,
    contextTraining
  );

  const {
    actionLoading,
    startingDrillId,
    handleStartTraining,
    handleFinishTraining,
    handleCancelTraining,
    handleStartDrill,
  } = useTrainingActions({
    training,
    setTraining,
    onTrainingUpdated: getOnTrainingUpdated() ?? undefined,
  });

  if (loading || !training) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const drills = training.drills || [];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <TrainingHeader
        title={training.title}
        description={training.description}
        status={training.status}
        colors={colors}
      />

      <InfoCards training={training} colors={colors} />

      <DrillsSection
        drills={drills}
        trainingStatus={training.status}
        colors={colors}
        onStartDrill={handleStartDrill}
        startingDrillId={startingDrillId}
        drillProgress={drillProgress}
      />

      <SessionsSection sessions={sessions} loading={loadingSessions} colors={colors} />

      <TrainingActions
        status={training.status}
        actionLoading={actionLoading}
        colors={colors}
        canManageTraining={canManageTraining}
        onStart={handleStartTraining}
        onFinish={handleFinishTraining}
        onCancel={handleCancelTraining}
      />

      {training.creator && (
        <View style={[styles.creatorSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.creatorLabel, { color: colors.textMuted }]}>
            Created by {training.creator.full_name || 'Unknown'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 200,
  },
  creatorSection: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginBottom: 20,
  },
  creatorLabel: {
    fontSize: 12,
  },
});
