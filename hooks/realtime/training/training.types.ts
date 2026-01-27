/**
 * Training Realtime Types
 *
 * Hook options and return types for training subscriptions.
 */

import type { ChangePayload } from '../table';
import type { SessionRecord, SessionTargetRecord, TrainingRecord } from '../records';

export interface UseTrainingRealtimeOptions {
  /** Training ID to subscribe to */
  trainingId: string | undefined | null;

  /** Called when the training itself is updated (status change, ended, etc.) */
  onTrainingUpdate?: (training: TrainingRecord) => void;

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

export interface UseTrainingRealtimeReturn {
  /** Whether connected and subscribed */
  isConnected: boolean;
  /** Current status */
  status: string | null;
  /** Any error */
  error: Error | null;
  /** Force reconnect */
  reconnect: () => void;
}
