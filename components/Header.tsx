import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { usePathname } from 'expo-router';
import { BellIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BaseAvatar } from './BaseAvatar';
import { Text } from './ui/text';
  
interface HeaderProps {
  onNotificationPress?: () => void;
  onUserPress?: () => void;
  onTeamPress?: () => void;
}

export function Header({ onNotificationPress, onUserPress, onTeamPress }: HeaderProps) {
  const { user, profileAvatarUrl } = useAuth();
  const colors = useColors();
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch pending notification count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        setNotificationCount(pending.length);
      } catch (error) {
        console.error('Failed to get notification count:', error);
      }
    };

    fetchCount();
    
    // Refresh count when screen focuses
    const interval = setInterval(fetchCount, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);
  
  // Check if we're on the personal tab - show "Personal" regardless of activeTeamId
  const isPersonalRoute = pathname?.startsWith('/personal');
  
  // Get team name from store
  const teamName = useTeamStore(state => {
    if (!state.activeTeamId) return null;
    const team = state.teams.find(t => t.id === state.activeTeamId);
    return team?.name || null;
  });
  
  // Show "Personal" on personal routes, or when no team is active
  const displayName = isPersonalRoute ? 'Personal' : (teamName || 'Personal');

  const email = user?.email;
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url;
  const fallbackInitial = email?.charAt(0)?.toUpperCase() ?? '?';


  return (
    <View style={styles.wrapper}>
      <View style={[styles.container]}>
        {/* Left Section */}
        <View style={styles.left}>
          <TouchableOpacity onPress={onUserPress} style={[styles.avatar, { opacity:1 }]}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '20' }]}>
              <BaseAvatar
                source={avatarUrl ? { uri: avatarUrl } : undefined}
                fallbackText={fallbackInitial}
                size="sm"
                borderWidth={0}
              />
            </View>
          </TouchableOpacity>

      <TouchableOpacity style={styles.workspaceContainer} onPress={onTeamPress}  > 
          <Text style={[styles.workspaceText, { color: colors.text}]}>
            {displayName}
          </Text> 
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text} />
        </TouchableOpacity> 
      </View>


        {/* Right Section - Notification Bell */}
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.notification}
        >
          <BellIcon size={18} color={colors.tint} strokeWidth={2} />
          {notificationCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.divider]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  },
  divider: {
    height: 0.5,
    opacity: 0.3,
  },

  // Left Section
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspace: {
    display: 'flex',
    flexDirection: 'row',
  },
  workspaceText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  chevronWrapper: {
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',

    gap: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  notification: {
    padding: 10,
  },

  workspaceContainer: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
