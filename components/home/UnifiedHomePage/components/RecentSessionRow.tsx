/**
 * RecentSessionRow Component
 * 
 * A single row in the recent sessions list.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, Crosshair, Heart, Users } from 'lucide-react-native';
import { styles } from '../UnifiedHomePage.styles';
import { formatTimeAgo } from '../UnifiedHomePage.helpers';
import type { RecentSessionRowProps } from '../UnifiedHomePage.types';

export function RecentSessionRow({ session, colors, onPress }: RecentSessionRowProps) {
  const isTeam = session.origin === 'team';
  const hasWatchData = session.sourceSession?.watch_controlled ?? false;
  
  const timeAgo = session.endedAt
    ? formatTimeAgo(session.endedAt)
    : session.startedAt
    ? formatTimeAgo(session.startedAt)
    : '';

  return (
    <TouchableOpacity 
      style={styles.recentRow} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View 
        style={[
          styles.recentIcon, 
          { backgroundColor: isTeam ? `${colors.blue}12` : `${colors.indigo}12` }
        ]}
      >
        {isTeam ? (
          <Users size={14} color={colors.blue} />
        ) : (
          <Crosshair size={14} color={colors.indigo} />
        )}
      </View>
      
      <View style={styles.recentContent}>
        <View style={styles.recentTitleRow}>
          <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drillName || (isTeam ? 'Team Session' : 'Practice Session')}
          </Text>
          {hasWatchData && (
            <View style={[styles.bioBadge, { backgroundColor: '#EF444415' }]}>
              <Heart size={10} color="#EF4444" />
            </View>
          )}
        </View>
        <Text style={[styles.recentMeta, { color: colors.textMuted }]}>
          {session.stats?.shots ? `${session.stats.shots} shots` : 'No shots'}
          {session.stats?.accuracy ? ` · ${session.stats.accuracy}%` : ''}
        </Text>
      </View>
      
      <View style={styles.recentRight}>
        <Text style={[styles.recentTime, { color: colors.textMuted }]}>{timeAgo}</Text>
        <ChevronRight size={14} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

