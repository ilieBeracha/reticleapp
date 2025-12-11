import { useColors } from "@/hooks/ui/useColors";
import { cancelNotification, clearDeliveredNotifications, getPendingNotifications, sendTestNotification } from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

// ═══════════════════════════════════════════════════════════════════════════
// TYPE CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  training: { icon: 'fitness', color: '#22C55E', bg: '#22C55E20', label: 'Training' },
  session: { icon: 'timer', color: '#3B82F6', bg: '#3B82F620', label: 'Session' },
  team: { icon: 'people', color: '#8B5CF6', bg: '#8B5CF620', label: 'Team' },
  reminder: { icon: 'notifications', color: '#F59E0B', bg: '#F59E0B20', label: 'Reminder' },
  achievement: { icon: 'trophy', color: '#EF4444', bg: '#EF444420', label: 'Achievement' },
  default: { icon: 'notifications-outline', color: '#71717A', bg: '#71717A20', label: 'Notification' },
};

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  scheduledAt?: Date;
  data?: Record<string, any>;
}

/**
 * NOTIFICATIONS CENTER
 * Shows pending notifications and allows management
 */
export default function NotificationsSheet() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = useCallback(async () => {
    try {
      const pending = await getPendingNotifications();
      
      const mapped: NotificationItem[] = pending.map((n) => ({
        id: n.identifier,
        title: n.content.title || 'Notification',
        body: n.content.body || '',
        type: (n.content.data?.type as string) || 'default',
        scheduledAt: n.trigger && 'date' in n.trigger ? new Date(n.trigger.date) : undefined,
        data: n.content.data as Record<string, any>,
      }));

      // Sort by scheduled time (soonest first)
      mapped.sort((a, b) => {
        if (!a.scheduledAt && !b.scheduledAt) return 0;
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });

      setPendingNotifications(mapped);
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

  const handleCancelNotification = useCallback(async (id: string, title: string) => {
    Alert.alert(
      'Cancel Notification',
      `Cancel "${title}"?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelNotification(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadNotifications();
            } catch (error) {
              console.error('Failed to cancel notification:', error);
            }
          },
        },
      ]
    );
  }, [loadNotifications]);

  const handleClearAll = useCallback(() => {
    if (pendingNotifications.length === 0) return;
    
    Alert.alert(
      'Clear All',
      'Cancel all pending notifications?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPendingNotifications([]);
            } catch (error) {
              console.error('Failed to clear notifications:', error);
            }
          },
        },
      ]
    );
  }, [pendingNotifications.length]);

  const handleClearDelivered = useCallback(async () => {
    await clearDeliveredNotifications();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Cleared', 'Delivered notifications have been dismissed');
  }, []);

  const handleSendTest = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await sendTestNotification();
      Alert.alert('Sent', 'Test notification will arrive in 3 seconds');
      // Reload after a brief delay to show the new notification
      setTimeout(() => loadNotifications(), 500);
    } catch (error) {
      console.error('Failed to send test:', error);
    }
  }, [loadNotifications]);

  const handleNotificationPress = useCallback((notification: NotificationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Navigate based on notification data
    const screen = notification.data?.screen;
    const id = notification.data?.id;
    
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
          case 'team':
            router.push('/(protected)/team');
            break;
          case 'personal':
            router.push('/(protected)/personal');
            break;
          case 'insights':
            router.push('/(protected)/personal/insights');
            break;
          default:
            break;
        }
      }, 300);
    }
  }, []);

  const getTimeLabel = (date?: Date) => {
    if (!date) return 'Immediate';
    const now = new Date();
    if (date <= now) return 'Any moment';
    return formatDistanceToNow(date, { addSuffix: true });
  };

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="notifications" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {pendingNotifications.length > 0
            ? `${pendingNotifications.length} scheduled`
            : 'No pending notifications'}
        </Text>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={handleSendTest}
          activeOpacity={0.7}
        >
          <Ionicons name="paper-plane" size={18} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>Send Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={handleClearDelivered}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={18} color={colors.textMuted} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>Clear Badge</Text>
        </TouchableOpacity>

        {pendingNotifications.length > 0 && (
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
            <Text style={[styles.quickActionText, { color: '#EF4444' }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Pending Notifications */}
      {pendingNotifications.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SCHEDULED</Text>
          
          {pendingNotifications.map((notification, index) => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
            
            return (
              <Animated.View
                key={notification.id}
                entering={FadeIn.delay(150 + index * 50)}
                layout={Layout.springify()}
              >
                <TouchableOpacity
                  style={[styles.notificationCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleNotificationPress(notification)}
                  onLongPress={() => handleCancelNotification(notification.id, notification.title)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <View style={[styles.notificationIcon, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
                        {notification.title}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.notificationBody, { color: colors.textMuted }]} numberOfLines={2}>
                      {notification.body}
                    </Text>
                    
                    <View style={styles.notificationMeta}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
                        {getTimeLabel(notification.scheduledAt)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelNotification(notification.id, notification.title)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <Animated.View entering={FadeIn.delay(150)} style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            No scheduled notifications. We'll notify you about trainings, sessions, and team updates.
          </Text>
        </Animated.View>
      )}

      {/* Info */}
      <Animated.View entering={FadeInDown.delay(200)} style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Long press a notification to cancel it. Past notifications appear in your system notification center.
        </Text>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 11,
  },
  cancelButton: {
    padding: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});



