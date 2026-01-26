/**
 * useTrainingRealtime
 *
 * Subscribe to session and target changes within a training.
 *
 * Use Cases:
 * - Commander viewing team progress during training
 * - Live drill completion updates
 * - Real-time target/score additions
 *
 * @example
 * ```tsx
 * const { isConnected } = useTrainingRealtime({
 *   trainingId: training.id,
 *   onSessionUpdate: (session) => refetchTeamProgress(),
 *   onNewTarget: (target) => refetchDrillProgress(),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core';
import type { ChangePayload } from '../table';
import type { SessionRecord, SessionTargetRecord } from '../records';
import type { UseTrainingRealtimeOptions, UseTrainingRealtimeReturn } from './training.types';

export function useTrainingRealtime(options: UseTrainingRealtimeOptions): UseTrainingRealtimeReturn {
  const { trainingId, onSessionChange, onSessionCreate, onSessionUpdate, onNewTarget, enabled = true } = options;

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
      {
        table: 'sessions',
        event: '*' as const,
        filter: `training_id=eq.${trainingId}`,
        onData: handleSessionData as (payload: ChangePayload<SessionRecord>) => void,
      },
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
