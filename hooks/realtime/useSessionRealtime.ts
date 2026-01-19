/**
 * useSessionRealtime
 * 
 * Domain-specific hook for real-time session updates.
 * Subscribe to changes on a specific session (targets, status changes).
 * 
 * Use Cases:
 * - Active session screen watching for external updates
 * - Coordinator viewing a soldier's session progress
 * - Multi-device sync for the same session
 * 
 * @example
 * ```tsx
 * // In ActiveSession component
 * const { isConnected } = useSessionRealtime({
 *   sessionId: session.id,
 *   onTargetAdded: (target) => {
 *     // Refresh target list
 *     loadTargets();
 *   },
 *   onStatusChange: (newStatus) => {
 *     if (newStatus === 'completed') {
 *       navigateToResults();
 *     }
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { ChangePayload, SessionRecord, SessionTargetRecord } from './types';
import { useRealtimeChannel } from './useRealtimeChannel';

interface UseSessionRealtimeOptions {
  /** Session ID to subscribe to */
  sessionId: string | undefined | null;
  
  /** Called when session is updated */
  onSessionUpdate?: (session: SessionRecord) => void;
  
  /** Called when session status specifically changes */
  onStatusChange?: (status: SessionRecord['status'], session: SessionRecord) => void;
  
  /** Called when a target is added */
  onTargetAdded?: (target: SessionTargetRecord) => void;
  
  /** Called when a target is updated */
  onTargetUpdated?: (target: SessionTargetRecord) => void;
  
  /** Called when a target is deleted */
  onTargetDeleted?: (target: SessionTargetRecord) => void;
  
  /** Whether subscription is enabled */
  enabled?: boolean;
}

interface UseSessionRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}

export function useSessionRealtime(
  options: UseSessionRealtimeOptions
): UseSessionRealtimeReturn {
  const {
    sessionId,
    onSessionUpdate,
    onStatusChange,
    onTargetAdded,
    onTargetUpdated,
    onTargetDeleted,
    enabled = true,
  } = options;

  // Effective enabled state
  const isEnabled = enabled && !!sessionId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSessionData = useCallback(
    (payload: ChangePayload<SessionRecord>) => {
      if (payload.eventType === 'UPDATE') {
        const newSession = payload.new;
        const oldSession = payload.old;

        console.log(`[SessionRealtime] Session updated:`, newSession.id);
        onSessionUpdate?.(newSession);

        // Check for status change specifically
        if (newSession.status !== oldSession.status) {
          console.log(`[SessionRealtime] Status changed: ${oldSession.status} → ${newSession.status}`);
          onStatusChange?.(newSession.status, newSession);
        }
      }
    },
    [onSessionUpdate, onStatusChange]
  );

  const handleTargetData = useCallback(
    (payload: ChangePayload<SessionTargetRecord>) => {
      console.log(`[SessionRealtime] Target ${payload.eventType}:`, payload.new?.id || payload.old?.id);

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
      // Session record changes
      {
        table: 'sessions',
        event: 'UPDATE' as const,
        filter: `id=eq.${sessionId}`,
        onData: handleSessionData as any,
      },
      // Targets for this session
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
    onStatusChange: (newStatus) => {
      if (newStatus === 'SUBSCRIBED') {
        console.log(`[SessionRealtime] ✓ Subscribed to session ${sessionId}`);
      }
    },
  });

  return {
    isConnected: isEnabled && isConnected,
    status,
    error,
    reconnect,
  };
}
