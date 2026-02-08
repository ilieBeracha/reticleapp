/**
 * useSessionRealtime
 *
 * Subscribe to changes on a specific session (targets, status changes).
 *
 * Use Cases:
 * - Active session screen watching for external updates
 * - Coordinator viewing a soldier's session progress
 * - Multi-device sync for the same session
 *
 * @example
 * ```tsx
 * const { isConnected } = useSessionRealtime({
 *   sessionId: session.id,
 *   onTargetAdded: (target) => loadTargets(),
 *   onStatusChange: (newStatus) => {
 *     if (newStatus === 'completed') navigateToResults();
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { ChangePayload } from '@/types/realtime.table';
import type { SessionRecord, SessionTargetRecord } from '../records/session';
import type { UseSessionRealtimeOptions, UseSessionRealtimeReturn } from '@/types/realtime.session';

export function useSessionRealtime(options: UseSessionRealtimeOptions): UseSessionRealtimeReturn {
  const {
    sessionId,
    onSessionUpdate,
    onStatusChange,
    onTargetAdded,
    onTargetUpdated,
    onTargetDeleted,
    enabled = true,
  } = options;

  const isEnabled = enabled && !!sessionId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSessionData = useCallback(
    (payload: ChangePayload<SessionRecord>) => {
      if (payload.eventType === 'UPDATE') {
        const newSession = payload.new;
        const oldSession = payload.old;

        onSessionUpdate?.(newSession);

        if (newSession.status !== oldSession.status) {
          onStatusChange?.(newSession.status, newSession);
        }
      }
    },
    [onSessionUpdate, onStatusChange]
  );

  const handleTargetData = useCallback(
    (payload: ChangePayload<SessionTargetRecord>) => {
      switch (payload.eventType) {
        case 'INSERT':
          onTargetAdded?.(payload.new);
          break;
        case 'UPDATE':
          onTargetUpdated?.(payload.new);
          break;
        case 'DELETE':
          onTargetDeleted?.(payload.old);
          break;
      }
    },
    [onTargetAdded, onTargetUpdated, onTargetDeleted]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const subscriptions = useMemo(() => {
    if (!isEnabled) return [];

    return [
      {
        table: 'sessions',
        event: 'UPDATE' as const,
        filter: `id=eq.${sessionId}`,
        onData: handleSessionData as any,
      },
      {
        table: 'session_targets',
        event: '*' as const,
        filter: `session_id=eq.${sessionId}`,
        onData: handleTargetData as any,
      },
    ];
  }, [isEnabled, sessionId, handleSessionData, handleTargetData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL
  // ═══════════════════════════════════════════════════════════════════════════

  const channelName = `session:${sessionId || 'none'}`;

  const { status, isConnected, error, reconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
    onStatusChange: (newStatus) => {},
  });

  return {
    isConnected: isEnabled && isConnected,
    status,
    error,
    reconnect,
  };
}
