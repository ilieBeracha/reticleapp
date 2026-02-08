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
import { useCallback, useEffect, useRef, useState } from 'react';

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

  // Store subscriptions and callbacks in refs - updates don't trigger reconnection
  const subscriptionsRef = useRef(subscriptions);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  const nameRef = useRef(name);

  // Update refs when props change (no reconnection needed for callbacks)
  subscriptionsRef.current = subscriptions;
  onStatusChangeRef.current = onStatusChange;
  onErrorRef.current = onError;
  nameRef.current = name;

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

    reconnectTimeout.current = setTimeout(() => {
      if (isMountedRef.current) {
        connectRef.current();
      }
    }, delay);
  }, [handleError]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    const subs = subscriptionsRef.current;

    // Don't connect if no subscriptions
    if (subs.length === 0) return;

    disconnect();

    const channel = supabase.channel(nameRef.current);

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
        updateStatus('SUBSCRIBED');
      } else if (subscribeStatus === 'TIMED_OUT') {
        updateStatus('TIMED_OUT');
        scheduleReconnect();
      } else if (subscribeStatus === 'CLOSED') {
        updateStatus('CLOSED');
      } else if (subscribeStatus === 'CHANNEL_ERROR') {
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
  }, [name]); // Only depend on name - this triggers reconnect on team/user switch

  return {
    channel: channelRef.current,
    status,
    isConnected: status === 'SUBSCRIBED',
    error,
    reconnect,
    disconnect,
  };
}
