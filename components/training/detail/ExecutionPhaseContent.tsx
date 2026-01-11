/**
 * ExecutionPhaseContent Component
 * Content for the execution phase showing drills in vertical column
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BookOpen, Plus } from 'lucide-react-native';
import { DrillChapter } from './DrillChapter';
import type { ExecutionPhaseContentProps } from './types';

export function ExecutionPhaseContent({
  training,
  drillProgress,
  colors,
  canManageTraining,
  startingDrillId,
  onStartDrill,
  onAddDrill,
}: ExecutionPhaseContentProps) {
  const drills = training.drills || [];
  const isOngoing = training.status === 'ongoing';

  if (drills.length === 0) {
    return (
      <View style={[styles.emptyDrills, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <BookOpen size={28} color={colors.textMuted} />
        <Text style={[styles.emptyDrillsText, { color: colors.textMuted }]}>
          No drills yet
        </Text>
        {canManageTraining && isOngoing && (
          <TouchableOpacity
            style={[styles.addDrillBtn, { backgroundColor: colors.text }]}
            onPress={onAddDrill}
          >
            <Plus size={14} color={colors.background} strokeWidth={2.5} />
            <Text style={[styles.addDrillBtnText, { color: colors.background }]}>Add Drill</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.content}>
      {/* Drills - Vertical Column */}
      <View style={styles.drillsColumn}>
        {drills.map((drill: any, index: number) => {
          const progress = drillProgress.find(p => p.drillId === drill.id);
          const isCompleted = progress?.completed || false;

          return (
            <DrillChapter
              key={drill.id}
              drill={drill}
              chapterNumber={index + 1}
              totalChapters={drills.length}
              isCompleted={isCompleted}
              canStart={isOngoing && !isCompleted}
              onStart={() => onStartDrill(drill)}
              isStarting={startingDrillId === drill.id}
              colors={colors}
            />
          );
        })}
      </View>

      {/* Add More Button (Commander only, ongoing) */}
      {canManageTraining && isOngoing && (
        <TouchableOpacity
          style={[styles.addMoreBtn, { borderColor: colors.border }]}
          onPress={onAddDrill}
        >
          <Plus size={14} color={colors.textMuted} strokeWidth={2.5} />
          <Text style={[styles.addMoreText, { color: colors.textMuted }]}>Add Drill</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  drillsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  emptyDrills: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  emptyDrillsText: {
    fontSize: 13,
    opacity: 0.6,
  },
  addDrillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginTop: 4,
  },
  addDrillBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
});
