/**
 * useTrainingRealtime
 *
 * Subscribe to training, session, and target changes within a training.
 *
 * Use Cases:
 * - Commander viewing team progress during training
 * - Live drill completion updates
 * - Real-time target/score additions
 * - Training status changes (ended, cancelled) for all team members
 *
 * @example
 * ```tsx
 * const { isConnected } = useTrainingRealtime({
 *   trainingId: training.id,
 *   onTrainingUpdate: (training) => {
 *     if (training.status === 'finished') handleTrainingEnded();
 *   },
 *   onSessionUpdate: (session) => refetchTeamProgress(),
 *   onNewTarget: (target) => refetchDrillProgress(),
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '../core/channel';
import type { ChangePayload } from '@/types/realtime.table';
import type { SessionRecord, SessionTargetRecord } from '../records/session';
import type { TrainingRecord } from '../records/training';
import type { UseTrainingRealtimeOptions, UseTrainingRealtimeReturn } from '@/types/realtime.training';

export function useTrainingRealtime(options: UseTrainingRealtimeOptions): UseTrainingRealtimeReturn {
  const { trainingId, onTrainingUpdate, onSessionChange, onSessionCreate, onSessionUpdate, onNewTarget, enabled = true } = options;

  const isEnabled = enabled && !!trainingId;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleTrainingData = useCallback(
    (payload: ChangePayload<TrainingRecord>) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        console.log(`[TrainingRealtime] Training updated: status=${payload.new.status}`);
        onTrainingUpdate?.(payload.new);
      }
    },
    [onTrainingUpdate]
  );

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
      // Subscribe to training status changes (ended, cancelled, etc.)
      {
        table: 'trainings',
        event: 'UPDATE' as const,
        filter: `id=eq.${trainingId}`,
        onData: handleTrainingData as any,
      },
      // Subscribe to session changes within this training
      {
        table: 'sessions',
        event: '*' as const,
        filter: `training_id=eq.${trainingId}`,
        onData: handleSessionData as any,
      },
      // Subscribe to new targets
      {
        table: 'session_targets',
        event: 'INSERT' as const,
        onData: handleTargetData as any,
      },
    ];
  }, [isEnabled, trainingId, handleTrainingData, handleSessionData, handleTargetData]);

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
