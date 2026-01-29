/**
 * useTableSubscription
 *
 * Simple hook for subscribing to changes on a single database table.
 * Provides convenient callbacks for INSERT, UPDATE, DELETE events.
 *
 * @example
 * ```tsx
 * useTableSubscription({
 *   table: 'sessions',
 *   filter: 'training_id=eq.abc123',
 *   onInsert: (session) => console.log('New session:', session),
 *   onUpdate: (newSession, oldSession) => console.log('Updated:', newSession),
 *   onDelete: (session) => console.log('Deleted:', session),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { ChangePayload, UseTableSubscriptionOptions, UseTableSubscriptionReturn } from './table.types';

export function useTableSubscription<T = Record<string, unknown>>(
  options: UseTableSubscriptionOptions<T>
): UseTableSubscriptionReturn {
  const { table, event = '*', filter, onInsert, onUpdate, onDelete, onChange, enabled = true } = options;

  // Build unique channel name
  const channelName = useMemo(() => {
    const parts = ['table', table];
    if (filter) parts.push(filter.replace(/[^a-zA-Z0-9]/g, '_'));
    return parts.join(':');
  }, [table, filter]);

  // Route incoming changes to appropriate callbacks
  const handleData = useCallback(
    (payload: ChangePayload<T>) => {
      onChange?.(payload);

      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new);
          break;
        case 'UPDATE':
          onUpdate?.(payload.new, payload.old);
          break;
        case 'DELETE':
          onDelete?.(payload.old);
          break;
      }
    },
    [onChange, onInsert, onUpdate, onDelete]
  );

  // Build subscriptions array
  const subscriptions = useMemo(
    () =>
      enabled
        ? [
            {
              table,
              event,
              filter,
              onData: handleData as (payload: ChangePayload) => void,
            },
          ]
        : [],
    [enabled, table, event, filter, handleData]
  );

  const { status, isConnected, error, reconnect, disconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
  });

  return {
    status,
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}
