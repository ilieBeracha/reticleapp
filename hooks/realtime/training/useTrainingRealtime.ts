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
        onTrainingUpdate?.(payload.new);
      }
    },
    [onTrainingUpdate]
  );

  const handleSessionData = useCallback(
    (payload: ChangePayload<SessionRecord>) => {
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
    onStatusChange: (newStatus) => {},
  });

  return {
    isConnected: isEnabled && isConnected,
    status,
    error,
    reconnect,
  };
}
