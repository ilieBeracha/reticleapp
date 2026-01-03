/**
 * StartPracticeCard Component
 * 
 * Call-to-action card to start a new practice session.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight, Zap } from 'lucide-react-native';
import { styles } from '../UnifiedHomePage.styles';
import { getStartPracticeSubtitle } from '../UnifiedHomePage.helpers';
import type { StartPracticeCardProps } from '../UnifiedHomePage.types';

export function StartPracticeCard({ 
  colors, 
  onPress, 
  starting, 
  lastSessionDaysAgo 
}: StartPracticeCardProps) {
  const subtitle = getStartPracticeSubtitle(lastSessionDaysAgo);

  return (
    <TouchableOpacity
      style={[styles.startCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={starting}
    >
      <View style={[styles.startIcon, { backgroundColor: `${colors.primary}12` }]}>
        <Zap size={22} color={colors.primary} />
      </View>
      <View style={styles.startContent}>
        <Text style={[styles.startTitle, { color: colors.text }]}>Start Practice</Text>
        <Text style={[styles.startSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      {starting ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={[styles.startArrow, { backgroundColor: colors.primary }]}>
          <ChevronRight size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

