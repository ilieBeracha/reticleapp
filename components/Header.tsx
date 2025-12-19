import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface HeaderProps {
  onNotificationPress?: () => void;
}

/**
 * App Header Component
 * 
 * Brand header with:
 * - App icon + "Reticle" brand name
 * - Notification bell with badge
 * - Profile avatar (opens profile sheet)
 */
export function Header({ onNotificationPress }: HeaderProps) {
  const colors = useColors();
  const { fullName, avatarUrl } = useAppContext();
  const { profileAvatarUrl } = useAuth();
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
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNotificationPress?.();
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/profileSheet' as any);
  };

  // Use avatarUrl from context or auth
  const avatarSource = avatarUrl || profileAvatarUrl;

  return (
    <View style={styles.container}>
      {/* Left - Brand */}
      <View style={styles.left}>
        <Image 
          source={require('@/assets/images/icon.jpg')} 
          style={styles.appIcon}
        />
        <Text style={[styles.brandName, { color: colors.text }]}>Reticle</Text>
      </View>

      {/* Right - Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleNotificationPress}
          activeOpacity={0.7}
        >
          <Bell size={18} color={colors.text} strokeWidth={2} />
          {notificationCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.background }]}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <BaseAvatar
            source={avatarSource ? { uri: avatarSource } : undefined}
            fallbackText={fullName?.charAt(0) || 'U'}
            size="sm"
            borderWidth={1}
            borderColor={colors.border}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingRight: 8,
  },

  // Left section
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Right section
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
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
    color: '#FFF',
  },
});
