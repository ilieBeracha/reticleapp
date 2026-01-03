/**
 * TeamTrainingCard Component
 * 
 * Displays a team training with live status indicator.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, Users } from 'lucide-react-native';
import { styles } from '../UnifiedHomePage.styles';
import type { TeamTrainingCardProps } from '../UnifiedHomePage.types';

export function TeamTrainingCard({ training, colors, onPress }: TeamTrainingCardProps) {
  const isLive = training.status === 'ongoing';
  const drillCount = training.drill_count || 0;

  return (
    <TouchableOpacity
      style={[
        styles.trainingCard,
        { backgroundColor: colors.card, borderColor: isLive ? colors.orange : colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.trainingCardContent}>
        <View style={styles.trainingHeader}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDotSmall} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
        </View>
        <View style={styles.trainingMeta}>
          <Users size={12} color={colors.textMuted} />
          <Text style={[styles.trainingTeam, { color: colors.textMuted }]}>
            {training.team?.name || 'Team Training'}
          </Text>
          {drillCount > 0 && (
            <>
              <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.trainingDrills, { color: colors.textMuted }]}>
                {drillCount} drills
              </Text>
            </>
          )}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

