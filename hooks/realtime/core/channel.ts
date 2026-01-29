/**
 * useRealtimeChannel
 *
 * Core hook for managing a Supabase Realtime channel.
 * Handles connection lifecycle, reconnection, and cleanup.
 *
 * This is infrastructure - domain hooks build on top of this.
 */

import { supabase } from '@/services/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChannelChangePayload,
  ChannelConfig,
  ChannelStatus,
  UseRealtimeChannelReturn,
} from './channel.types';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeChannel(config: ChannelConfig): UseRealtimeChannelReturn {
  const { name, subscriptions, onStatusChange, onError } = config;

  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const updateStatus = useCallback(
    (newStatus: ChannelStatus) => {
      if (!isMountedRef.current) return;
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      if (newStatus === 'SUBSCRIBED') {
        reconnectAttempts.current = 0;
        setError(null);
      }
    },
    [onStatusChange]
  );

  const handleError = useCallback(
    (err: Error) => {
      if (!isMountedRef.current) return;
      console.error(`[Realtime:${name}] Error:`, err.message);
      setError(err);
      onError?.(err);
    },
    [name, onError]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RECONNECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[Realtime:${name}] Max reconnect attempts reached`);
      handleError(new Error('Max reconnection attempts reached'));
      return;
    }

    reconnectAttempts.current += 1;
    const delay = RECONNECT_DELAY_MS * reconnectAttempts.current;

    console.log(`[Realtime:${name}] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

    reconnectTimeout.current = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, delay);
  }, [name, handleError]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (channelRef.current) {
      console.log(`[Realtime:${name}] Disconnecting...`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [name]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    disconnect();

    console.log(`[Realtime:${name}] Connecting... (subscriptions: ${subscriptions.length})`);

    const channel = supabase.channel(name);

    // Attach each subscription
    subscriptions.forEach((sub) => {
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

          console.log(`[Realtime:${name}] ${payload.eventType} on ${sub.table}`);
          sub.onData(changePayload);
        }
      );
    });

    // Subscribe with status callback
    channel.subscribe((subscribeStatus, err) => {
      if (!isMountedRef.current) return;

      if (subscribeStatus === 'SUBSCRIBED') {
        console.log(`[Realtime:${name}] ✓ Subscribed successfully`);
        updateStatus('SUBSCRIBED');
      } else if (subscribeStatus === 'TIMED_OUT') {
        console.warn(`[Realtime:${name}] ⚠ Subscription timed out`);
        updateStatus('TIMED_OUT');
        scheduleReconnect();
      } else if (subscribeStatus === 'CLOSED') {
        console.log(`[Realtime:${name}] Channel closed`);
        updateStatus('CLOSED');
      } else if (subscribeStatus === 'CHANNEL_ERROR') {
        console.error(`[Realtime:${name}] ✕ Channel error:`, err);
        updateStatus('CHANNEL_ERROR');
        handleError(new Error(err?.message || 'Channel error'));
        scheduleReconnect();
      }
    });

    channelRef.current = channel;
  }, [name, subscriptions, disconnect, updateStatus, handleError, scheduleReconnect]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    channel: channelRef.current,
    status,
    isConnected: status === 'SUBSCRIBED',
    error,
    reconnect,
    disconnect,
  };
}
