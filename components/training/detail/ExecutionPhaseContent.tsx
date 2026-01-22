/**
 * ExecutionPhaseContent Component
 * 
 * Content for the execution phase showing drills in a spread-out
 * timeline layout where each drill fills significant vertical space.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, BookOpen } from 'lucide-react-native';
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
  userWeapon,
  similarStatsMap,
}: ExecutionPhaseContentProps) {
  const drills = training.drills || [];
  const isOngoing = training.status === 'ongoing';
  const hasWeapon = !!userWeapon;

  if (drills.length === 0) {
    return (
      <View style={[styles.emptyDrills, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <BookOpen size={32} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Drills Scheduled
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          {canManageTraining 
            ? 'Use the menu (⋯) to add drills' 
            : 'Wait for your commander to add drills'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      {/* No weapon banner - prominent when ongoing */}
      {isOngoing && !hasWeapon && (
        <View style={[styles.noWeaponBanner, { backgroundColor: colors.orange + '10', borderColor: colors.orange + '25' }]}>
          <View style={[styles.noWeaponIcon, { backgroundColor: colors.orange + '20' }]}>
            <AlertCircle size={20} color={colors.orange} />
          </View>
          <View style={styles.noWeaponContent}>
            <Text style={[styles.noWeaponTitle, { color: colors.orange }]}>
              Weapon Required
            </Text>
            <Text style={[styles.noWeaponHint, { color: colors.textMuted }]}>
              A weapon is required to start drills
            </Text>
          </View>
        </View>
      )}

      {/* Drills - Timeline Layout */}
      <View style={styles.drillsTimeline}>
        {drills.map((drill: any, index: number) => {
          const progress = drillProgress.find(p => p.drillId === drill.id);
          const isCompleted = progress?.completed || false;
          const similarStats = similarStatsMap?.get(drill.id);
          
          // Determine if this drill can be started
          // (only if ongoing, not completed, and previous drills are done)
          const previousDrillsCompleted = drillProgress
            .slice(0, index)
            .every(p => p.completed);
          const canStartThisDrill = isOngoing && !isCompleted && previousDrillsCompleted;

          return (
            <DrillChapter
              key={drill.id}
              drill={drill}
              chapterNumber={index + 1}
              totalChapters={drills.length}
              isCompleted={isCompleted}
              canStart={canStartThisDrill}
              onStart={() => onStartDrill(drill)}
              isStarting={startingDrillId === drill.id}
              colors={colors}
              hasWeapon={hasWeapon}
              similarStats={similarStats}
            />
          );
        })}
      </View>

      {/* Commander can add drills via the actions menu (⋯) in header */}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  noWeaponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  noWeaponIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWeaponContent: {
    flex: 1,
    gap: 4,
  },
  noWeaponTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  noWeaponHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  drillsTimeline: {
    gap: 0, // DrillChapter has its own margin
  },
  emptyDrills: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
