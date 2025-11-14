import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BaseAvatar } from './BaseAvatar';
import { BellIcon, Icon } from './ui/icon';

interface HeaderProps {
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export function Header({ notificationCount = 0, onNotificationPress }: HeaderProps) {
  const { user } = useAuth();
  const colors = useColors();

  const avatarUri = user?.user_metadata?.avatar_url;
  const fallbackInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";
  
  const displayName = user?.user_metadata?.full_name || 
                      user?.email?.split('@')[0] || 
                      'User';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BaseAvatar
        source={avatarUri ? { uri: avatarUri } : undefined}
        fallbackText={fallbackInitial}
        size="md"
        borderWidth={2}
      />

      <View style={styles.textContainer}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome</Text>
        <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <Pressable
        onPress={onNotificationPress}
        style={({ pressed }) => [
          styles.notificationContainer,
          { backgroundColor: colors.card },
          pressed && styles.notificationPressed,
        ]}
      >
        <Icon as={BellIcon} size="md" color={colors.text} />
        {notificationCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.text, borderColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.background }]}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginVertical: 12,
    gap: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',

  },
  nameText: {
    fontSize: 18,
    fontWeight: '600',
  },
  notificationContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationPressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
