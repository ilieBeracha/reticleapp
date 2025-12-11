import { Target } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { DrillCard } from './DrillCard';
import type { DrillProgress, ThemeColors, TrainingDrill, TrainingStatus } from './types';

interface DrillsSectionProps {
  drills: TrainingDrill[];
  trainingStatus: TrainingStatus;
  colors: ThemeColors;
  onStartDrill: (drill: TrainingDrill) => void;
  startingDrillId: string | null;
  drillProgress: DrillProgress[];
}

export function DrillsSection({
  drills,
  trainingStatus,
  colors,
  onStartDrill,
  startingDrillId,
  drillProgress,
}: DrillsSectionProps) {
  const completedCount = drillProgress.filter(p => p.completed).length;
  const hasProgress = completedCount > 0;
  const isOngoing = trainingStatus === 'ongoing';
  const allCompleted = completedCount === drills.length && drills.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Drills</Text>
          {drills.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: allCompleted ? 'rgba(147,197,253,0.2)' : colors.secondary }]}>
              <Text style={[styles.countText, { color: allCompleted ? '#93C5FD' : colors.textMuted }]}>
                {completedCount}/{drills.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      {drills.length > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(completedCount / drills.length) * 100}%`,
                backgroundColor: allCompleted ? '#93C5FD' : colors.textMuted,
              },
            ]}
          />
        </View>
      )}

      {/* Empty State */}
      {drills.length === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Target size={28} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No drills</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            This training has no drills scheduled
          </Text>
        </View>
      )}

      {/* Drill List */}
      {drills.length > 0 && (
        <View style={styles.list}>
          {drills.map((drill, index) => {
            const progress = drillProgress.find(p => p.drillId === drill.id);
            return (
              <DrillCard
                key={drill.id}
                drill={drill}
                index={index}
                colors={colors}
                trainingStatus={trainingStatus}
                onStartDrill={onStartDrill}
                isStarting={startingDrillId === drill.id}
                isCompleted={progress?.completed || false}
              />
            );
          })}
        </View>
      )}

      {/* Hint */}
      {isOngoing && drills.length > 0 && !allCompleted && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Tap a drill to start your session
        </Text>
      )}

      {allCompleted && (
        <View style={[styles.allDoneBanner, { backgroundColor: 'rgba(147,197,253,0.15)' }]}>
          <Text style={[styles.allDoneText, { color: '#93C5FD' }]}>All drills completed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  list: {
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
  },
  allDoneBanner: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  allDoneText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
