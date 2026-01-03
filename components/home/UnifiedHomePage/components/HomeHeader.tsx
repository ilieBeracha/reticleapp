/**
 * HomeHeader Component
 * 
 * Displays user greeting, avatar, and Garmin connection status.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseAvatar } from '@/components/BaseAvatar';
import { styles } from '../UnifiedHomePage.styles';
import type { HomeHeaderProps } from '../UnifiedHomePage.types';

export function HomeHeader({
  greeting,
  firstName,
  avatarUrl,
  fallbackInitial,
  isGarminConnected,
  colors,
}: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          {avatarUrl ? (
            <BaseAvatar 
              source={{ uri: avatarUrl }} 
              fallbackText={fallbackInitial} 
              size="sm" 
              borderWidth={0} 
            />
          ) : (
            <Text style={[styles.avatarText, { color: colors.text }]}>
              {fallbackInitial}
            </Text>
          )}
        </View>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {greeting}
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {firstName}
          </Text>
        </View>
      </View>
      {isGarminConnected && (
        <View style={[styles.watchBadge, { backgroundColor: `${colors.green}15` }]}>
          <Ionicons name="watch" size={14} color={colors.green} />
        </View>
      )}
    </View>
  );
}

