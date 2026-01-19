/**
 * useTableSubscription
 * 
 * Simple hook for subscribing to changes on a single database table.
 * Provides convenient callbacks for INSERT, UPDATE, DELETE events.
 * 
 * @example
 * ```tsx
 * // Subscribe to all changes
 * useTableSubscription({
 *   table: 'sessions',
 *   filter: 'training_id=eq.abc123',
 *   onInsert: (session) => console.log('New session:', session),
 *   onUpdate: (newSession, oldSession) => console.log('Updated:', newSession),
 *   onDelete: (session) => console.log('Deleted:', session),
 * });
 * 
 * // Or use onChange for all events
 * useTableSubscription({
 *   table: 'sessions',
 *   onChange: (payload) => {
 *     if (payload.eventType === 'UPDATE') {
 *       refetchData();
 *     }
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { ChangePayload, UseTableSubscriptionOptions } from './types';
import { useRealtimeChannel } from './useRealtimeChannel';

export function useTableSubscription<T = Record<string, unknown>>(
  options: UseTableSubscriptionOptions<T>
) {
  const {
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = options;

  // Build unique channel name based on subscription parameters
  const channelName = useMemo(() => {
    const parts = ['table', table];
    if (filter) parts.push(filter.replace(/[^a-zA-Z0-9]/g, '_'));
    return parts.join(':');
  }, [table, filter]);

  // Handle incoming changes and route to appropriate callbacks
  const handleData = useCallback(
    (payload: ChangePayload<T>) => {
      // Always call onChange if provided
      onChange?.(payload);

      // Route to specific callbacks
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

  // Use the core channel hook
  const { status, isConnected, error, reconnect, disconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
  });

  return {
    /** Current connection status */
    status,
    /** Whether successfully subscribed */
    isConnected,
    /** Any subscription error */
    error,
    /** Force reconnection */
    reconnect,
    /** Disconnect channel */
    disconnect,
  };
}
