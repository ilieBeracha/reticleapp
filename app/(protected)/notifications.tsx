import { useColors } from '@/hooks/ui/useColors';
import {
  clearNotificationHistory,
  deleteNotificationFromHistory,
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationHistoryItem,
} from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  training: { icon: 'fitness', color: '#22C55E', label: 'Training' },
  session: { icon: 'timer', color: '#3B82F6', label: 'Session' },
  team: { icon: 'people', color: '#8B5CF6', label: 'Team' },
  reminder: { icon: 'alarm', color: '#F59E0B', label: 'Reminder' },
  achievement: { icon: 'trophy', color: '#EF4444', label: 'Achievement' },
  default: { icon: 'notifications', color: '#71717A', label: 'Update' },
};

/**
 * NOTIFICATIONS CENTER
 * Clean, elegant notification history
 */
export default function NotificationsSheet() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);

  const loadNotifications = useCallback(async () => {
    try {
      const history = await getNotificationHistory(100);
      setNotifications(history);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadNotifications();
  }, [loadNotifications]);

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await deleteNotificationFromHistory(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) return;

    Alert.alert('Clear All Notifications', 'This will delete your entire notification history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearNotificationHistory();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNotifications([]);
          } catch (error) {
            console.error('Failed to clear notifications:', error);
          }
        },
      },
    ]);
  }, [notifications.length]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleNotificationPress = useCallback(async (notification: NotificationHistoryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read
    if (!notification.read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    }

    // Navigate based on notification data
    const screen = notification.screen;
    const id = notification.reference_id;

    if (screen && router.canDismiss()) {
      router.dismiss();
      setTimeout(() => {
        switch (screen) {
          case 'trainingDetail':
            if (id) router.push({ pathname: '/(protected)/trainingDetail', params: { id } });
            break;
          case 'activeSession':
            if (id) router.push({ pathname: '/(protected)/activeSession', params: { sessionId: id } });
            break;
          case 'teamArmory':
            if (id) router.push({ pathname: '/(protected)/teamArmory', params: { teamId: id } });
            break;
          case 'team':
            router.push('/(protected)/(tabs)');
            break;
          case 'personal':
            router.push('/(protected)/(tabs)');
            break;
          case 'insights':
            router.push('/(protected)/(tabs)/insights');
            break;
          default:
            break;
        }
      }, 300);
    }
  }, []);

  const getTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      {/* Header Row */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {notifications.length > 0 && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          )}
        </View>

        {/* Actions */}
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.headerAction, { backgroundColor: colors.primary + '15' }]}
                onPress={handleMarkAllRead}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.headerAction, { backgroundColor: colors.secondary }]}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Notification List */}
      {notifications.length > 0 ? (
        <View style={styles.list}>
          {notifications.map((notification, index) => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
            const isUnread = !notification.read;

            return (
              <Animated.View key={notification.id} entering={FadeIn.delay(80 + index * 25)} layout={Layout.springify()}>
                <TouchableOpacity
                  style={[
                    styles.notificationItem,
                    {
                      backgroundColor: colors.background,
                      borderLeftColor: isUnread ? config.color : 'transparent',
                    },
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  {/* Icon */}
                  <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name={config.icon as any} size={18} color={config.color} />
                  </View>

                  {/* Content */}
                  <View style={styles.content}>
                    <View style={styles.topRow}>
                      <Text
                        style={[styles.notificationTitle, { color: colors.text, fontWeight: isUnread ? '600' : '500' }]}
                        numberOfLines={1}
                      >
                        {notification.title}
                      </Text>
                      <Text style={[styles.time, { color: colors.textMuted }]}>
                        {getTimeLabel(notification.created_at)}
                      </Text>
                    </View>

                    <Text style={[styles.body, { color: isUnread ? colors.text : colors.textMuted }]} numberOfLines={2}>
                      {notification.body}
                    </Text>
                  </View>

                  {/* Delete */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNotification(notification.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <Animated.View entering={FadeIn.delay(100)} style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="notifications-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            You'll see updates about trainings, weapon assignments, and team activity here.
          </Text>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  list: {
    gap: 8,
  },

  // Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 3,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
  },
  time: {
    fontSize: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 19,
  },
  deleteBtn: {
    padding: 4,
    marginTop: -2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
