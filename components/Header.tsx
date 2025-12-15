import { useColors } from '@/hooks/ui/useColors';
import { deleteSession, getMyActivePersonalSession } from '@/services/sessionService';
import { Button, ContextMenu, Host } from '@expo/ui/swift-ui';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Bell, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
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
 * - Add button (native context menu with Session/Training options)
 * - Notification bell with badge
 */
export function Header({ onNotificationPress }: HeaderProps) {
  const colors = useColors();
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

  const handleStartSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Check for existing active session first
      const existing = await getMyActivePersonalSession();
      if (existing) {
        Alert.alert(
          'Active Session',
          `You have an active session${existing.drill_name ? ` for "${existing.drill_name}"` : ''}. What would you like to do?`,
          [
            {
              text: 'Continue',
              onPress: () => {
                router.push(`/(protected)/activeSession?sessionId=${existing.id}` as any);
              },
            },
            {
              text: 'Delete & Start New',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteSession(existing.id);
                  router.push('/(protected)/createSession' as any);
                } catch (err) {
                  console.error('Failed to delete session:', err);
                  Alert.alert('Error', 'Failed to delete session');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
      // Drill-first: route to drill selection screen
      router.push('/(protected)/createSession' as any);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, []);

  const handleCreateTraining = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/createTraining' as any);
  }, []);

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNotificationPress?.();
  };

  // Native add button with context menu (iOS only)
  const AddButtonWithMenu = () => {
    if (Platform.OS === 'ios') {
      return (
        <Host style={styles.addButtonHost}>
          <ContextMenu>
            <ContextMenu.Items>
              <Button 
                systemImage="target" 
                onPress={handleStartSession}
              >
                Start Session
              </Button>
              <Button 
                systemImage="calendar.badge.plus" 
                onPress={handleCreateTraining}
              >
                New Training
              </Button>
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <View style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Plus size={18} color={colors.text} strokeWidth={2} />
              </View>
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      );
    }

    // Android fallback - simple button that opens training
    return (
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleCreateTraining}
        activeOpacity={0.7}
      >
        <Plus size={18} color={colors.text} strokeWidth={2} />
      </TouchableOpacity>
    );
  };

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
        <AddButtonWithMenu />

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
  addButtonHost: {
    width: 38,
    height: 38,
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
