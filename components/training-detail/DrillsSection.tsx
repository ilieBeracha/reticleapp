import { Ionicons } from '@expo/vector-icons';
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

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Drills</Text>
        {drills.length > 0 && (
          <View style={[styles.progressBadge, { backgroundColor: hasProgress ? '#22C55E20' : colors.secondary }]}>
            <Text style={[styles.progressText, { color: hasProgress ? '#22C55E' : colors.textMuted }]}>
              {completedCount}/{drills.length}
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {drills.length > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(completedCount / drills.length) * 100}%` }
            ]} 
          />
        </View>
      )}

      {drills.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.secondary }]}>
          <Ionicons name="list-outline" size={24} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No drills scheduled</Text>
        </View>
      ) : (
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

      {trainingStatus === 'ongoing' && drills.length > 0 && completedCount < drills.length && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Tap a drill to start your session
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  list: {
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
