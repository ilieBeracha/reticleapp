import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HANDLER CONFIGURATION
// Controls how notifications appear when app is in foreground
// ═══════════════════════════════════════════════════════════════════════════
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface NotificationData {
  screen?: string;
  id?: string;
  type?: 'training' | 'session' | 'team' | 'reminder';
  [key: string]: any;
}

export interface ScheduleNotificationOptions {
  title: string;
  body: string;
  data?: NotificationData;
  trigger?: Notifications.NotificationTriggerInput;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request notification permissions
 * Returns the Expo push token if granted
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Must be a physical device for push notifications
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });

    // Training reminders channel
    await Notifications.setNotificationChannelAsync('trainings', {
      name: 'Training Reminders',
      description: 'Reminders for upcoming team trainings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });

    // Session channel
    await Notifications.setNotificationChannelAsync('sessions', {
      name: 'Session Updates',
      description: 'Updates about your shooting sessions',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#3B82F6',
    });
  }

  // Get the push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Add this to your .env
    });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schedule a local notification
 */
export async function scheduleNotification({
  title,
  body,
  data,
  trigger,
}: ScheduleNotificationOptions): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });

  return id;
}

/**
 * Schedule a notification after X seconds
 */
export async function scheduleNotificationAfterSeconds(
  title: string,
  body: string,
  seconds: number,
  data?: NotificationData
): Promise<string> {
  return scheduleNotification({
    title,
    body,
    data,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: 'default',
    },
  });
}

/**
 * Schedule a notification at a specific date
 */
export async function scheduleNotificationAtDate(
  title: string,
  body: string,
  date: Date,
  data?: NotificationData
): Promise<string> {
  return scheduleNotification({
    title,
    body,
    data,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'default',
    },
  });
}

/**
 * Schedule a training reminder (30 min before)
 */
export async function scheduleTrainingReminder(
  trainingId: string,
  trainingName: string,
  teamName: string,
  scheduledAt: Date
): Promise<string | null> {
  // Schedule 30 minutes before
  const reminderTime = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
  
  // Don't schedule if it's in the past
  if (reminderTime <= new Date()) {
    return null;
  }

  return scheduleNotification({
    title: '🎯 Training Starting Soon',
    body: `${trainingName} with ${teamName} starts in 30 minutes`,
    data: {
      type: 'training',
      screen: 'trainingDetail',
      id: trainingId,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
      channelId: Platform.OS === 'android' ? 'trainings' : undefined,
    },
  });
}

/**
 * Send an immediate notification
 */
export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: NotificationData
): Promise<string> {
  return scheduleNotification({ title, body, data, trigger: null });
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all pending notifications
 */
export async function getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Set the badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all delivered notifications
 */
export async function clearDeliveredNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
