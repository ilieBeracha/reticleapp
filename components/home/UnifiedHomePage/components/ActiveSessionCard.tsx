/**
 * ActiveSessionCard Component
 * 
 * Displays the currently active session with live indicator.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { styles } from '../UnifiedHomePage.styles';
import type { ActiveSessionCardProps } from '../UnifiedHomePage.types';

export function ActiveSessionCard({ session, colors, onPress }: ActiveSessionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.green }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.activeCardLeft}>
        <View style={styles.liveIndicator}>
          <View style={styles.livePulse} />
          <Text style={styles.liveLabel}>IN PROGRESS</Text>
        </View>
        <Text style={[styles.activeTitle, { color: colors.text }]} numberOfLines={1}>
          {session.drillName || 'Practice Session'}
        </Text>
        {session.stats && session.stats.shots > 0 && (
          <Text style={[styles.activeMeta, { color: colors.textMuted }]}>
            {session.stats.shots} shots · {session.stats.accuracy || 0}%
          </Text>
        )}
      </View>
      <View style={[styles.activeArrow, { backgroundColor: colors.green }]}>
        <ArrowRight size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

