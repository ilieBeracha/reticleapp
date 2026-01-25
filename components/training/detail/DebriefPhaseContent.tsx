/**
 * DebriefPhaseContent Component
 * Content for the debrief phase showing summary and report link
 */

import { format } from 'date-fns';
import { router } from 'expo-router';
import { ChevronRight, Clock, Trophy } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { calculateTrainingDuration } from './helpers';
import type { DebriefPhaseContentProps } from './types';

export function DebriefPhaseContent({ training, drillProgress, colors, canManageTraining }: DebriefPhaseContentProps) {
  const drills = training.drills || [];
  const completedCount = drillProgress.filter((p) => p.completed).length;
  const isFinished = training.status === 'finished';

  const duration = useMemo(() => {
    return calculateTrainingDuration(training.started_at, training.ended_at);
  }, [training.started_at, training.ended_at]);

  const handleViewReport = useCallback(() => {
    router.push({
      pathname: '/(protected)/trainingReport',
      params: { trainingId: training.id },
    });
  }, [training.id]);

  return (
    <View style={styles.content}>
      {/* Summary Stats */}
      <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.summaryHeader}>
          <Trophy size={18} color={colors.green} />
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Training Summary</Text>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryStatValue, { color: colors.text }]}>
              {completedCount}/{drills.length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>Drills Done</Text>
          </View>

          {duration && (
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.text }]}>{duration}</Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>Duration</Text>
            </View>
          )}

          {training.ended_at && (
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                {format(new Date(training.ended_at), 'HH:mm')}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>Ended</Text>
            </View>
          )}
        </View>
      </View>

      {/* View Full Report Button */}
      {isFinished && canManageTraining && (
        <TouchableOpacity
          style={[styles.viewReportBtn, { backgroundColor: colors.primary }]}
          onPress={handleViewReport}
          activeOpacity={0.8}
        >
          <Trophy size={18} color="#fff" />
          <Text style={styles.viewReportBtnText}>View Training Report</Text>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Not finished message */}
      {!isFinished && (
        <View style={[styles.notFinishedCard, { backgroundColor: colors.card }]}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={[styles.notFinishedText, { color: colors.textMuted }]}>
            Complete the training to see your full report
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 20,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryStatLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.6,
  },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewReportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  notFinishedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  notFinishedText: {
    flex: 1,
    fontSize: 13,
    opacity: 0.7,
  },
});
