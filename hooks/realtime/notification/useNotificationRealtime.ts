/**
 * useNotificationRealtime
 *
 * Subscribe to notification_history INSERT events for the current user.
 * Fires a callback whenever a new notification is inserted by the Edge Function,
 * enabling instant badge updates and live notification lists without polling.
 *
 * @example
 * ```tsx
 * useNotificationRealtime({
 *   userId: user?.id,
 *   onNewNotification: (n) => setCount((c) => c + 1),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { ChannelChangePayload } from '@/types/realtime.channel';
import type { NotificationHistoryItem } from '@/services/notifications';

interface UseNotificationRealtimeOptions {
  userId: string | undefined;
  onNewNotification: (notification: NotificationHistoryItem) => void;
  enabled?: boolean;
}

export function useNotificationRealtime(options: UseNotificationRealtimeOptions) {
  const { userId, onNewNotification, enabled = true } = options;

  const isEnabled = enabled && !!userId;

  const handleInsert = useCallback(
    (payload: ChannelChangePayload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        onNewNotification(payload.new as unknown as NotificationHistoryItem);
      }
    },
    [onNewNotification]
  );

  const subscriptions = useMemo(() => {
    if (!isEnabled) return [];

    return [
      {
        table: 'notification_history',
        event: 'INSERT' as const,
        filter: `user_id=eq.${userId}`,
        onData: handleInsert,
      },
    ];
  }, [isEnabled, userId, handleInsert]);

  const channelName = `notifications:${userId || 'none'}`;

  const { isConnected, status, error, reconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
  });

  return {
    isConnected: isEnabled && isConnected,
    status,
    error,
    reconnect,
  };
}
