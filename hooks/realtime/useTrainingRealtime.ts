/**
 * useTrainingRealtime
 * 
 * Domain-specific hook for real-time training updates.
 * Subscribes to session and target changes within a training.
 * 
 * Use Cases:
 * - Commander viewing team progress during training
 * - Live drill completion updates
 * - Real-time target/score additions
 * 
 * @example
 * ```tsx
 * // In TrainingDetail component
 * const { isConnected } = useTrainingRealtime({
 *   trainingId: training.id,
 *   onSessionUpdate: (session) => {
 *     // A session was updated (status change, completion, etc.)
 *     refetchTeamProgress();
 *   },
 *   onNewTarget: (target) => {
 *     // A new target was added to any session
 *     refetchDrillProgress();
 *   },
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { ChangePayload, SessionRecord, SessionTargetRecord } from './types';
import { useRealtimeChannel } from './useRealtimeChannel';

interface UseTrainingRealtimeOptions {
  /** Training ID to subscribe to */
  trainingId: string | undefined | null;
  
  /** Called when any session in this training changes */
  onSessionChange?: (payload: ChangePayload<SessionRecord>) => void;
  
  /** Called when a session is created */
  onSessionCreate?: (session: SessionRecord) => void;
  
  /** Called when a session is updated (status change, completion) */
  onSessionUpdate?: (session: SessionRecord) => void;
  
  /** Called when a new target is added to any session */
  onNewTarget?: (target: SessionTargetRecord) => void;
  
  /** Whether subscription is enabled */
  enabled?: boolean;
}

interface UseTrainingRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}

export function useTrainingRealtime(
  options: UseTrainingRealtimeOptions
): UseTrainingRealtimeReturn {
  const {
    trainingId,
    onSessionChange,
    onSessionCreate,
    onSessionUpdate,
    onNewTarget,
    enabled = true,
  } = options;

  // Effective enabled state
  const isEnabled = enabled && !!trainingId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSessionData = useCallback(
    (payload: ChangePayload<SessionRecord>) => {
      console.log(`[TrainingRealtime] Session ${payload.eventType}:`, payload.new?.id);
      
      onSessionChange?.(payload);

      if (payload.eventType === 'INSERT') {
        onSessionCreate?.(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        onSessionUpdate?.(payload.new);
      }
    },
    [onSessionChange, onSessionCreate, onSessionUpdate]
  );

  const handleTargetData = useCallback(
    (payload: ChangePayload<SessionTargetRecord>) => {
      if (payload.eventType === 'INSERT') {
        console.log(`[TrainingRealtime] New target added:`, payload.new?.id);
        onNewTarget?.(payload.new);
      }
    },
    [onNewTarget]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const subscriptions = useMemo(() => {
    if (!isEnabled) return [];

    return [
      // Session changes for this training
      {
        table: 'sessions',
        event: '*' as const,
        filter: `training_id=eq.${trainingId}`,
        onData: handleSessionData as (payload: ChangePayload<SessionRecord>) => void,
      },
      // New targets (we filter by session in the handler if needed)
      // Note: Can't filter by training_id directly on session_targets
      // Consider adding a trigger or filtering in handleTargetData
      {
        table: 'session_targets',
        event: 'INSERT' as const,
        onData: handleTargetData as (payload: ChangePayload<SessionTargetRecord>) => void,
      },
    ];
  }, [isEnabled, trainingId, handleSessionData, handleTargetData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNEL
  // ═══════════════════════════════════════════════════════════════════════════

  const channelName = `training:${trainingId || 'none'}`;

  const { status, isConnected, error, reconnect } = useRealtimeChannel({
    name: channelName,
    subscriptions,
    onStatusChange: (newStatus) => {
      if (newStatus === 'SUBSCRIBED') {
        console.log(`[TrainingRealtime] ✓ Subscribed to training ${trainingId}`);
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
