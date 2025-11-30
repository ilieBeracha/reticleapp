/**
 * PUSH NOTIFICATIONS HOOK
 * Handles Expo push notification registration, token management, and listeners
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Register for push notifications and get the Expo push token
   */
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    // Must be a physical device
    if (!Device.isDevice) {
      setError('Push notifications require a physical device');
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setError('Push notification permission not granted');
      console.log('Push notification permission not granted');
      return null;
    }

    // Get project ID for Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId 
      ?? Constants.easConfig?.projectId;

    if (!projectId) {
      setError('No Expo project ID found');
      console.error('No Expo project ID found in app config');
      return null;
    }

    try {
      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      
      console.log('Expo push token:', token);
      setExpoPushToken(token);
      setError(null);
      
      return token;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get push token';
      setError(message);
      console.error('Error getting push token:', err);
      return null;
    }
  }, []);

  /**
   * Save push token to Supabase
   */
  const savePushToken = useCallback(async (token: string) => {
    if (!user?.id) {
      console.log('No user ID, skipping token save');
      return;
    }

    try {
      // Upsert the token (update if exists, insert if not)
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            expo_push_token: token,
            device_name: Device.modelName ?? Device.deviceName ?? 'Unknown Device',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,expo_push_token',
          }
        );

      if (upsertError) {
        console.error('Error saving push token:', upsertError);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (err) {
      console.error('Error saving push token:', err);
    }
  }, [user?.id]);

  /**
   * Remove push token from Supabase (on logout)
   */
  const removePushToken = useCallback(async () => {
    if (!user?.id || !expoPushToken) return;

    try {
      const { error: deleteError } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('expo_push_token', expoPushToken);

      if (deleteError) {
        console.error('Error removing push token:', deleteError);
      } else {
        console.log('Push token removed');
      }
    } catch (err) {
      console.error('Error removing push token:', err);
    }
  }, [user?.id, expoPushToken]);

  /**
   * Set up Android notification channel
   */
  const setupAndroidChannel = useCallback(async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });

      // Training notifications channel
      await Notifications.setNotificationChannelAsync('trainings', {
        name: 'Trainings',
        description: 'Training schedules and updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      await setupAndroidChannel();
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    };

    init();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap - navigate to relevant screen
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id, registerForPushNotifications, savePushToken, setupAndroidChannel]);

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
    savePushToken,
    removePushToken,
  };
}

/**
 * Handle navigation when user taps a notification
 */
function handleNotificationNavigation(data: Record<string, unknown>) {
  // TODO: Implement navigation based on notification type
  // Example:
  // if (data.training_id) {
  //   router.push(`/trainingDetail?id=${data.training_id}`);
  // }
  console.log('Navigate based on notification data:', data);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  seconds: number = 1
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: true,
    },
    trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

