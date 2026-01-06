/**
 * HomeHeader Component
 * 
 * Clean header with user greeting and status.
 */

import { BaseAvatar } from '@/components/BaseAvatar';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
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
    <View style={s.header}>
      <View style={s.left}>
        <View style={[s.avatar, { backgroundColor: colors.secondary }]}>
          {avatarUrl ? (
            <BaseAvatar 
              source={{ uri: avatarUrl }} 
              fallbackText={fallbackInitial} 
              size="sm" 
              borderWidth={0} 
            />
          ) : (
            <Text style={[s.avatarText, { color: colors.text }]}>
              {fallbackInitial}
            </Text>
          )}
        </View>
        <View>
          <Text style={[s.greeting, { color: colors.textMuted }]}>
            {greeting}
          </Text>
          <Text style={[s.name, { color: colors.text }]}>
            {firstName}
          </Text>
        </View>
      </View>
      
      {isGarminConnected && (
        <View style={[s.watchBadge, { backgroundColor: `${colors.green}12` }]}>
          <View style={s.watchDot} />
          <Ionicons name="watch" size={15} color={colors.green} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  watchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
});
