import {
    areNotificationsEnabled,
    NotificationData,
    registerForPushNotificationsAsync,
} from '@/services/notificationService';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// USE NOTIFICATIONS HOOK
// Handles permission, listeners, and notification responses
// ═══════════════════════════════════════════════════════════════════════════

interface UseNotificationsResult {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isEnabled: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useNotifications(): UseNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Check initial permission status
  useEffect(() => {
    areNotificationsEnabled().then(setIsEnabled);
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        setIsEnabled(true);
      }
    });

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      console.log('[Notification] Received:', notification);
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log('[Notification] Tapped:', data);

      // Handle navigation based on notification data
      handleNotificationNavigation(data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Request permission manually
  const requestPermission = async (): Promise<boolean> => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      setIsEnabled(true);
      return true;
    }
    return false;
  };

  return {
    expoPushToken,
    notification,
    isEnabled,
    requestPermission,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION HANDLER
// Routes user to appropriate screen based on notification data
// ═══════════════════════════════════════════════════════════════════════════

function handleNotificationNavigation(data: NotificationData) {
  if (!data?.screen) return;

  switch (data.screen) {
    case 'trainingDetail':
      if (data.id) {
        router.push(`/(protected)/trainingDetail?id=${data.id}`);
      }
      break;

    case 'activeSession':
      if (data.id) {
        router.push(`/(protected)/activeSession?sessionId=${data.id}`);
      }
      break;

    case 'team':
      router.push('/(protected)/team');
      break;

    case 'personal':
      router.push('/(protected)/personal');
      break;

    default:
      console.log('[Notification] Unknown screen:', data.screen);
  }
}

export default useNotifications;
