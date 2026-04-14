/**
 * useRealtimeChannel
 *
 * Core hook for managing a Supabase Realtime channel.
 * Handles connection lifecycle, reconnection, and cleanup.
 *
 * This is infrastructure - domain hooks build on top of this.
 *
 * IMPORTANT: Only reconnects when channel name changes (team/user ID).
 * Callback updates are handled via refs to avoid unnecessary reconnections.
 */

import { supabase } from '@/services/supabase';
import type {
  ChannelChangePayload,
  ChannelConfig,
  ChannelStatus,
  UseRealtimeChannelReturn,
} from '@/types/realtime.channel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Monotonic counter so concurrent hook instances can share a logical channel
// name (e.g. `notifications:<user>`) without colliding on the underlying
// Supabase channel. Supabase throws if `.on('postgres_changes', ...)` is called
// after a channel with the same name has already been subscribed, which can
// happen when expo-router mounts multiple Headers (one per stack screen) that
// each call a realtime hook with the same logical name.
let channelInstanceCounter = 0;

export function useRealtimeChannel(config: ChannelConfig): UseRealtimeChannelReturn {
  const { name, subscriptions, onStatusChange, onError } = config;

  // Stable per-instance suffix so each hook instance gets its own Supabase
  // channel, avoiding "cannot add postgres_changes callbacks after subscribe()"
  // when the same logical name is used by multiple mounted components.
  const instanceSuffix = useMemo(() => `#${++channelInstanceCounter}`, []);
  const uniqueName = `${name}${instanceSuffix}`;

  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Store subscriptions and callbacks in refs - updates don't trigger reconnection
  const subscriptionsRef = useRef(subscriptions);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  const nameRef = useRef(uniqueName);

  // Update refs when props change (no reconnection needed for callbacks)
  subscriptionsRef.current = subscriptions;
  onStatusChangeRef.current = onStatusChange;
  onErrorRef.current = onError;
  nameRef.current = uniqueName;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const updateStatus = useCallback((newStatus: ChannelStatus) => {
    if (!isMountedRef.current) return;
    setStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);

    if (newStatus === 'SUBSCRIBED') {
      reconnectAttempts.current = 0;
      setError(null);
    }
  }, []);

  const handleError = useCallback((err: Error, isFatal = false) => {
    if (!isMountedRef.current) return;
    const channelName = nameRef.current;
    if (isFatal) {
      console.error(`[Realtime:${channelName}] Error:`, err.message);
    } else {
      console.warn(`[Realtime:${channelName}] Reconnecting after:`, err.message);
    }
    setError(err);
    onErrorRef.current?.(err);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL MANAGEMENT (refs used to avoid stale closures)
  // ═══════════════════════════════════════════════════════════════════════════

  // Ref to hold connect function for async callbacks
  const connectRef = useRef<() => void>(() => {});

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (channelRef.current) {
      console.log(`[Realtime:${nameRef.current}] Disconnecting...`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      handleError(new Error('Max reconnection attempts reached'), true);
      return;
    }

    reconnectAttempts.current += 1;
    const delay = RECONNECT_DELAY_MS * reconnectAttempts.current;

    console.log(`[Realtime:${nameRef.current}] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

    reconnectTimeout.current = setTimeout(() => {
      if (isMountedRef.current) {
        connectRef.current();
      }
    }, delay);
  }, [handleError]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    const channelName = nameRef.current;
    const subs = subscriptionsRef.current;

    // Don't connect if no subscriptions
    if (subs.length === 0) {
      console.log(`[Realtime:${channelName}] Skipping connection (no subscriptions)`);
      return;
    }

    disconnect();

    console.log(`[Realtime:${channelName}] Connecting... (subscriptions: ${subs.length})`);

    const channel = supabase.channel(channelName);

    // Attach each subscription - use ref for callbacks
    subs.forEach((sub) => {
      const eventType = sub.event || '*';

      (channel as any).on(
        'postgres_changes',
        {
          event: eventType,
          schema: 'public',
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload: any) => {
          if (!isMountedRef.current) return;

          const changePayload: ChannelChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
            errors: payload.errors,
            schema: payload.schema,
            table: payload.table,
            commit_timestamp: payload.commit_timestamp,
          };

          console.log(`[Realtime:${nameRef.current}] ${payload.eventType} on ${sub.table}`);

          // Find matching subscription in current ref and call its callback
          const currentSub = subscriptionsRef.current.find(
            (s) => s.table === sub.table && s.filter === sub.filter
          );
          currentSub?.onData(changePayload);
        }
      );
    });

    // Subscribe with status callback
    channel.subscribe((subscribeStatus, err) => {
      if (!isMountedRef.current) return;

      if (subscribeStatus === 'SUBSCRIBED') {
        console.log(`[Realtime:${nameRef.current}] ✓ Subscribed successfully`);
        updateStatus('SUBSCRIBED');
      } else if (subscribeStatus === 'TIMED_OUT') {
        console.warn(`[Realtime:${nameRef.current}] ⚠ Subscription timed out`);
        updateStatus('TIMED_OUT');
        scheduleReconnect();
      } else if (subscribeStatus === 'CLOSED') {
        console.log(`[Realtime:${nameRef.current}] Channel closed`);
        updateStatus('CLOSED');
      } else if (subscribeStatus === 'CHANNEL_ERROR') {
        console.warn(`[Realtime:${nameRef.current}] Channel error, will reconnect:`, err?.message || 'unknown');
        updateStatus('CHANNEL_ERROR');
        handleError(new Error(err?.message || 'Channel error'), false);
        scheduleReconnect();
      }
    });

    channelRef.current = channel;
  }, [disconnect, updateStatus, handleError, scheduleReconnect]);

  // Keep connectRef updated
  connectRef.current = connect;

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE - Only reconnect when channel name changes
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttempts.current = 0; // Reset attempts on name change
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueName]); // Only depend on name - this triggers reconnect on team/user switch

  return {
    channel: channelRef.current,
    status,
    isConnected: status === 'SUBSCRIBED',
    error,
    reconnect,
    disconnect,
  };
}
